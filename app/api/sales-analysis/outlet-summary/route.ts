/**
 * GET /api/sales-analysis/outlet-summary
 *
 * Endpoint agregasi untuk OutletContributionSection.
 *
 * Bedanya dengan /api/sales-analysis: endpoint ini TIDAK memakai
 * fetchSalesData() dan TIDAK pernah memegang baris mentah di memory Node.
 * Semua GROUP BY / top-10 dikerjakan Postgres, Node cuma menerima beberapa
 * ratus baris dan menyusunnya jadi OutletSummaryResponse.
 *
 * Catatan konsistensi dengan databasev2:
 *  - ISO week: resolveWeekYear() di JS ekuivalen dengan
 *    EXTRACT(ISOYEAR FROM date) + EXTRACT(WEEK FROM date) di Postgres.
 *  - `category` BUKAN kolom sales_records.category — di outletAggMap dia hasil
 *    getProductCategory(product). Jadi di sini di-GROUP BY product lalu di-map
 *    ke kategori di Node (jumlah produk kecil).
 *  - city/district punya fallback dari kolom `area` kalau nilainya 'Unknown'.
 *    Logika itu direplikasi di CITY_EXPR / DISTRICT_EXPR di bawah.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/session';
import { pool } from '@/lib/db';
import { getProductCategory } from '@/lib/productCategories';
import type { SessionUser } from '@/lib/auth/types';

export const dynamic = 'force-dynamic';

// ─── Kontrak response (harus identik dengan interface di komponen) ───────────
interface WeeklyPoint { week: number; value: number }
interface NamedValue { name: string; value: number }
interface StackedRow {
  key: string;
  customerId?: string;
  total: number;
  byOutletType: Record<string, number>;
}
interface YearSummary {
  year: number;
  totalUnit: number;
  recordCount: number;
  weekly: WeeklyPoint[];
  pieCategory: NamedValue[];
  pieOutlet: NamedValue[];
  topProduct: StackedRow[];
  topCity: StackedRow[];
  topDistrict: StackedRow[];
  topCustomer: StackedRow[];
}
interface FilterOptions {
  outletTypes: string[];
  categories: string[];
  products: string[];
  cities: string[];
  districts: string[];
  salesmen: string[];
  customers: { no: string; name: string }[];
}
interface OutletSummaryResponse {
  weekRange: { min: number; max: number };
  outletTypes: string[];
  filterOptions: FilterOptions;
  years: YearSummary[];
}

// ─── Ekspresi SQL yang dipakai berulang ──────────────────────────────────────
const ISO_YEAR = `EXTRACT(ISOYEAR FROM date)::int`;
const ISO_WEEK = `EXTRACT(WEEK FROM date)::int`;

const UNKNOWN_OUTLET = 'Tipe Customer tidak diketahui';
const UNKNOWN_PLACE  = 'Tidak diketahui';

const OUTLET_EXPR   = `COALESCE(NULLIF(TRIM(customer_type), ''), '${UNKNOWN_OUTLET}')`;
const PRODUCT_EXPR  = `COALESCE(NULLIF(TRIM(product), ''), 'Produk Tidak Diketahui')`;
const SALESMAN_EXPR = `COALESCE(NULLIF(TRIM(salesman), ''), 'Unknown')`;
const CUSTOMER_EXPR = `COALESCE(NULLIF(TRIM(customer), ''), 'Unknown')`;
const CUSTNO_EXPR   = `COALESCE(TRIM(customer_no), '')`;

// Fallback dari kolom `area` persis seperti di processSalesRecords():
//   area "KEC, KOTA" → district = KEC, city = KOTA
//   area tanpa koma  → city = area
const CITY_EXPR = `
  CASE
    WHEN COALESCE(NULLIF(TRIM(city), ''), '${UNKNOWN_PLACE}') <> 'Unknown'
      THEN COALESCE(NULLIF(TRIM(city), ''), '${UNKNOWN_PLACE}')
    WHEN POSITION(',' IN COALESCE(area, '')) > 0 AND TRIM(SPLIT_PART(area, ',', 2)) <> ''
      THEN TRIM(SPLIT_PART(area, ',', 2))
    WHEN TRIM(COALESCE(area, '')) <> ''
      THEN TRIM(area)
    ELSE 'Unknown'
  END`;

const DISTRICT_EXPR = `
  CASE
    WHEN COALESCE(NULLIF(TRIM(district), ''), '${UNKNOWN_PLACE}') <> 'Unknown'
      THEN COALESCE(NULLIF(TRIM(district), ''), '${UNKNOWN_PLACE}')
    WHEN POSITION(',' IN COALESCE(area, '')) > 0 AND TRIM(SPLIT_PART(area, ',', 1)) <> ''
      THEN TRIM(SPLIT_PART(area, ',', 1))
    ELSE 'Unknown'
  END`;

const UNIT_COLUMNS: Record<string, string> = {
  units_dos:  'COALESCE(units_dos, 0)',
  units_bal:  'COALESCE(units_bal, 0)',
  units_slop: 'COALESCE(units_slop, 0)',
  units_bks:  'COALESCE(units_bks, 0)',
  omzet:      'COALESCE(omzet, 0)',
};

const TOP_N = 10;
const CUSTOMER_OPTION_LIMIT = 200;
const CUSTOMER_SEARCH_LIMIT = 50;

// ─── RBAC: resolve area scope (mirror dari /api/sales-analysis) ──────────────
// Kalau nanti dipakai di lebih dari dua endpoint, pindahkan ke
// lib/auth/resolveAreaScope.ts supaya tidak drift.
type AreaScope =
  | { ok: true; area?: string; allowedAreas?: string[] }
  | { ok: false; error: string; status: number };

async function resolveAreaScope(user: SessionUser, area: string | null, regional: string | null): Promise<AreaScope> {
  let regionalAreaIds: string[] | null = null;

  if (regional) {
    const r = await pool.query('SELECT area_ids FROM regions WHERE id = $1', [regional]);
    if (r.rows.length === 0) return { ok: false, error: 'Regional tidak ditemukan', status: 404 };
    regionalAreaIds = r.rows[0].area_ids ?? [];
  }

  if (user.role === 'root') {
    if (regionalAreaIds) return { ok: true, allowedAreas: regionalAreaIds };
    return { ok: true, area: area ?? undefined };
  }

  if (user.allowed_areas && user.allowed_areas.length > 0) {
    if (regionalAreaIds) {
      const intersect = regionalAreaIds.filter(id => user.allowed_areas.includes(id));
      if (intersect.length === 0) {
        return { ok: false, error: 'Anda tidak memiliki akses ke regional ini', status: 403 };
      }
      return { ok: true, allowedAreas: intersect };
    }
    if (area) {
      if (!user.allowed_areas.includes(area)) {
        return { ok: false, error: 'Anda tidak memiliki akses ke area ini', status: 403 };
      }
      return { ok: true, area };
    }
    return { ok: true, allowedAreas: user.allowed_areas };
  }

  return { ok: true, allowedAreas: [] };
}

// ─── Query builder ───────────────────────────────────────────────────────────
interface YearSpec { year: number; weekStart: number; weekEnd: number }

interface WhereInput {
  years: YearSpec[];
  scope: { area?: string; allowedAreas?: string[] };
  baseProduct?: string;
  baseCity?: string;
  // filter milik section (prefix "o") — dilewati saat membangun filterOptions
  section?: {
    outletType?: string;
    products?: string[];   // hasil resolusi oCategory / oProduct
    city?: string;
    district?: string;
    salesman?: string;
    customerNo?: string;
    search?: string;
  };
}

/** Selalu kembalikan params array baru — tiap query harus punya param sendiri,
 *  karena Postgres menolak bind dengan jumlah parameter yang tidak cocok. */
function buildWhere(input: WhereInput) {
  const params: any[] = [];
  const P = (v: any) => `$${params.push(v)}`;
  const conds: string[] = [];

  // Area / RBAC
  if (input.scope.area && input.scope.area.trim()) {
    conds.push(`area = ${P(input.scope.area.trim())}`);
  } else if (input.scope.allowedAreas) {
    if (input.scope.allowedAreas.length === 0) conds.push('FALSE');
    else conds.push(`area = ANY(${P(input.scope.allowedAreas)})`);
  }

  // Tahun + rentang minggu (ISO)
  if (input.years.length === 0) {
    conds.push('FALSE');
  } else {
    const yearConds = input.years.map(y =>
      `(${ISO_YEAR} = ${P(y.year)} AND ${ISO_WEEK} BETWEEN ${P(y.weekStart)} AND ${P(y.weekEnd)})`,
    );
    conds.push(`(${yearConds.join(' OR ')})`);
  }

  // Base filters dari dashboard utama
  if (input.baseProduct?.trim()) conds.push(`product = ${P(input.baseProduct.trim())}`);
  if (input.baseCity?.trim())    conds.push(`city = ${P(input.baseCity.trim())}`);

  // Filter section
  const s = input.section;
  if (s) {
    if (s.outletType) conds.push(`${OUTLET_EXPR} = ${P(s.outletType)}`);
    if (s.products)   conds.push(s.products.length ? `${PRODUCT_EXPR} = ANY(${P(s.products)})` : 'FALSE');
    if (s.city)       conds.push(`${CITY_EXPR} = ${P(s.city)}`);
    if (s.district)   conds.push(`${DISTRICT_EXPR} = ${P(s.district)}`);
    if (s.salesman)   conds.push(`${SALESMAN_EXPR} = ${P(s.salesman)}`);
    if (s.customerNo) conds.push(`${CUSTNO_EXPR} = ${P(s.customerNo)}`);
    if (s.search) {
      const q = P(`%${s.search}%`);
      conds.push(`(
        ${CUSTOMER_EXPR} ILIKE ${q} OR ${CUSTNO_EXPR} ILIKE ${q} OR
        ${PRODUCT_EXPR}  ILIKE ${q} OR ${CITY_EXPR}   ILIKE ${q} OR
        ${DISTRICT_EXPR} ILIKE ${q} OR ${SALESMAN_EXPR} ILIKE ${q}
      )`);
    }
  }

  return { where: `WHERE ${conds.join(' AND ')}`, params, P };
}

/** Top-N per tahun untuk satu dimensi, lengkap dengan breakdown per outlet type.
 *  Ranking dihitung di Postgres (window function), jadi Node hanya menerima
 *  maksimal TOP_N × jumlahOutletType × jumlahTahun baris. */
async function queryTopDimension(
  whereInput: WhereInput,
  unitExpr: string,
  keyExpr: string,
  idExpr: string | null,
): Promise<Map<number, StackedRow[]>> {
  const { where, params, P } = buildWhere(whereInput);
  const id = idExpr ?? `NULL::text`;
  const limit = P(TOP_N);

  const sql = `
    WITH agg AS (
      SELECT ${ISO_YEAR} AS yr,
             ${keyExpr}  AS k,
             ${id}       AS kid,
             ${OUTLET_EXPR} AS ot,
             SUM(${unitExpr}) AS v
      FROM sales_records
      ${where}
      GROUP BY 1, 2, 3, 4
    ),
    tot AS (
      SELECT yr, k, kid, SUM(v) AS t FROM agg GROUP BY 1, 2, 3
    ),
    ranked AS (
      SELECT yr, k, kid, t, ROW_NUMBER() OVER (PARTITION BY yr ORDER BY t DESC, k ASC) AS rn
      FROM tot
    )
    SELECT a.yr, a.k, a.kid, a.ot, a.v, r.t
    FROM agg a
    JOIN ranked r
      ON r.yr = a.yr AND r.k = a.k AND r.kid IS NOT DISTINCT FROM a.kid
    WHERE r.rn <= ${limit}
    ORDER BY a.yr, r.t DESC
  `;

  const res = await pool.query(sql, params);

  const byYear = new Map<number, Map<string, StackedRow>>();
  for (const row of res.rows) {
    const yr = Number(row.yr);
    if (!byYear.has(yr)) byYear.set(yr, new Map());
    const bucket = byYear.get(yr)!;
    const mapKey = `${row.k}||${row.kid ?? ''}`;
    if (!bucket.has(mapKey)) {
      bucket.set(mapKey, {
        key: String(row.k),
        ...(row.kid != null ? { customerId: String(row.kid) } : {}),
        total: Number(row.t) || 0,
        byOutletType: {},
      });
    }
    bucket.get(mapKey)!.byOutletType[String(row.ot)] = Number(row.v) || 0;
  }

  const out = new Map<number, StackedRow[]>();
  byYear.forEach((bucket, yr) => {
    out.set(yr, Array.from(bucket.values()).sort((a, b) => b.total - a.total));
  });
  return out;
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  return withAuth(request, 'view_stats', async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const num = (k: string) => {
        const v = searchParams.get(k);
        if (v === null || v === '') return undefined;
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : undefined;
      };
      const clampWeek = (w: number) => Math.max(1, Math.min(53, w));

      const selectedUnit = searchParams.get('selectedUnit') ?? 'units_dos';
      const unitExpr = UNIT_COLUMNS[selectedUnit] ?? UNIT_COLUMNS.units_dos;

      // Tahun + rentang minggu
      const years: YearSpec[] = [];
      const y1 = num('year1');
      const y2 = num('year2');
      if (y1 !== undefined) {
        years.push({ year: y1, weekStart: clampWeek(num('weekStart1') ?? 1), weekEnd: clampWeek(num('weekEnd1') ?? 53) });
      }
      if (y2 !== undefined && y2 !== y1) {
        years.push({ year: y2, weekStart: clampWeek(num('weekStart2') ?? 1), weekEnd: clampWeek(num('weekEnd2') ?? 53) });
      }
      years.sort((a, b) => a.year - b.year);

      // RBAC
      const scopeResult = await resolveAreaScope(
        user,
        searchParams.get('area'),
        searchParams.get('regional'),
      );
      if (!scopeResult.ok) {
        return NextResponse.json({ success: false, error: scopeResult.error }, { status: scopeResult.status });
      }
      const scope = { area: scopeResult.area, allowedAreas: scopeResult.allowedAreas };

      const baseProduct = searchParams.get('product') ?? undefined;
      const baseCity    = searchParams.get('city') ?? undefined;

      const oOutletType = searchParams.get('oOutletType') ?? undefined;
      const oCategory   = searchParams.get('oCategory') ?? undefined;
      const oProduct    = searchParams.get('oProduct') ?? undefined;
      const oCity       = searchParams.get('oCity') ?? undefined;
      const oDistrict   = searchParams.get('oDistrict') ?? undefined;
      const oSalesman   = searchParams.get('oSalesman') ?? undefined;
      const oCustomerNo = searchParams.get('oCustomerNo') ?? undefined;
      const oSearch     = searchParams.get('oSearch') ?? undefined;
      const oCustomerSearch = searchParams.get('oCustomerSearch') ?? undefined;

      const baseInput = { years, scope, baseProduct, baseCity };

      // ── Daftar produk yang ada di scope ini (dipakai untuk memetakan kategori,
      //    karena kategori adalah fungsi JS dari nama produk, bukan kolom DB) ──
      const productListQ = buildWhere(baseInput);
      const productRes = await pool.query(
        `SELECT DISTINCT ${PRODUCT_EXPR} AS product FROM sales_records ${productListQ.where}`,
        productListQ.params,
      );
      const allProducts: string[] = productRes.rows.map(r => String(r.product)).sort();
      const productToCategory = new Map<string, string>();
      allProducts.forEach(p => productToCategory.set(p, getProductCategory(p)));

      // oCategory / oProduct → daftar produk konkret untuk WHERE
      let sectionProducts: string[] | undefined;
      if (oProduct) {
        sectionProducts = [oProduct];
      } else if (oCategory) {
        sectionProducts = allProducts.filter(p => productToCategory.get(p) === oCategory);
      }

      const section = {
        outletType: oOutletType,
        products:   sectionProducts,
        city:       oCity,
        district:   oDistrict,
        salesman:   oSalesman,
        customerNo: oCustomerNo,
        search:     oSearch,
      };
      const filteredInput: WhereInput = { ...baseInput, section };

      // ── Semua query dijalankan paralel ────────────────────────────────────
      const weeklyQ = buildWhere(filteredInput);
      const weeklyPromise = pool.query(
        `SELECT ${ISO_YEAR} AS yr, ${ISO_WEEK} AS wk,
                SUM(${unitExpr}) AS v, COUNT(*) AS c
         FROM sales_records ${weeklyQ.where}
         GROUP BY 1, 2 ORDER BY 1, 2`,
        weeklyQ.params,
      );

      const byProductQ = buildWhere(filteredInput);
      const byProductPromise = pool.query(
        `SELECT ${ISO_YEAR} AS yr, ${PRODUCT_EXPR} AS product, SUM(${unitExpr}) AS v
         FROM sales_records ${byProductQ.where}
         GROUP BY 1, 2`,
        byProductQ.params,
      );

      const byOutletQ = buildWhere(filteredInput);
      const byOutletPromise = pool.query(
        `SELECT ${ISO_YEAR} AS yr, ${OUTLET_EXPR} AS ot, SUM(${unitExpr}) AS v
         FROM sales_records ${byOutletQ.where}
         GROUP BY 1, 2 ORDER BY 3 DESC`,
        byOutletQ.params,
      );

      // Opsi dropdown dihitung dari BASE filter saja (tanpa filter section),
      // supaya user masih bisa berpindah pilihan setelah memfilter.
      const optionsQ = buildWhere(baseInput);
      const optionsPromise = pool.query(
        `SELECT
           array_agg(DISTINCT ${OUTLET_EXPR})   AS outlet_types,
           array_agg(DISTINCT ${CITY_EXPR})     AS cities,
           array_agg(DISTINCT ${DISTRICT_EXPR}) AS districts,
           array_agg(DISTINCT ${SALESMAN_EXPR}) AS salesmen
         FROM sales_records ${optionsQ.where}`,
        optionsQ.params,
      );

      const customerQ = buildWhere(baseInput);
      const custLimit = customerQ.P(oCustomerSearch ? CUSTOMER_SEARCH_LIMIT : CUSTOMER_OPTION_LIMIT);
      const custSearchCond = oCustomerSearch
        ? `HAVING ${CUSTOMER_EXPR} ILIKE ${customerQ.P(`%${oCustomerSearch}%`)}
                 OR ${CUSTNO_EXPR} ILIKE ${customerQ.P(`%${oCustomerSearch}%`)}`
        : '';
      const customersPromise = pool.query(
        `SELECT ${CUSTNO_EXPR} AS no, ${CUSTOMER_EXPR} AS name, SUM(${unitExpr}) AS v
         FROM sales_records ${customerQ.where}
         GROUP BY 1, 2
         ${custSearchCond}
         ORDER BY 3 DESC
         LIMIT ${custLimit}`,
        customerQ.params,
      );

      const [
        weeklyRes, byProductRes, byOutletRes, optionsRes, customersRes,
        topProductMap, topCityMap, topDistrictMap, topCustomerMap,
      ] = await Promise.all([
        weeklyPromise, byProductPromise, byOutletPromise, optionsPromise, customersPromise,
        queryTopDimension(filteredInput, unitExpr, PRODUCT_EXPR, null),
        queryTopDimension(filteredInput, unitExpr, CITY_EXPR, null),
        queryTopDimension(filteredInput, unitExpr, DISTRICT_EXPR, null),
        queryTopDimension(filteredInput, unitExpr, CUSTOMER_EXPR, CUSTNO_EXPR),
      ]);

      // ── Susun response ────────────────────────────────────────────────────
      const weekRange = years.length > 0
        ? {
            min: Math.min(...years.map(y => y.weekStart)),
            max: Math.max(...years.map(y => y.weekEnd)),
          }
        : { min: 1, max: 52 };

      const weeklyByYear = new Map<number, Map<number, number>>();
      const countByYear  = new Map<number, number>();
      for (const row of weeklyRes.rows) {
        const yr = Number(row.yr);
        if (!weeklyByYear.has(yr)) weeklyByYear.set(yr, new Map());
        weeklyByYear.get(yr)!.set(Number(row.wk), Number(row.v) || 0);
        countByYear.set(yr, (countByYear.get(yr) ?? 0) + Number(row.c));
      }

      const categoryByYear = new Map<number, Map<string, number>>();
      for (const row of byProductRes.rows) {
        const yr  = Number(row.yr);
        const cat = productToCategory.get(String(row.product)) ?? getProductCategory(String(row.product));
        if (!categoryByYear.has(yr)) categoryByYear.set(yr, new Map());
        const m = categoryByYear.get(yr)!;
        m.set(cat, (m.get(cat) ?? 0) + (Number(row.v) || 0));
      }

      const outletByYear = new Map<number, NamedValue[]>();
      const outletTypeSet = new Set<string>();
      for (const row of byOutletRes.rows) {
        const yr = Number(row.yr);
        outletTypeSet.add(String(row.ot));
        if (!outletByYear.has(yr)) outletByYear.set(yr, []);
        outletByYear.get(yr)!.push({ name: String(row.ot), value: Number(row.v) || 0 });
      }

      const yearSummaries: YearSummary[] = years.map(spec => {
        const yr = spec.year;
        const weekMap = weeklyByYear.get(yr) ?? new Map<number, number>();

        const weekly: WeeklyPoint[] = [];
        for (let w = spec.weekStart; w <= spec.weekEnd; w++) {
          weekly.push({ week: w, value: weekMap.get(w) ?? 0 });
        }

        const pieCategory = Array.from(categoryByYear.get(yr)?.entries() ?? [])
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

        return {
          year: yr,
          totalUnit: weekly.reduce((s, w) => s + w.value, 0),
          recordCount: countByYear.get(yr) ?? 0,
          weekly,
          pieCategory,
          pieOutlet: outletByYear.get(yr) ?? [],
          topProduct:  topProductMap.get(yr)  ?? [],
          topCity:     topCityMap.get(yr)     ?? [],
          topDistrict: topDistrictMap.get(yr) ?? [],
          topCustomer: topCustomerMap.get(yr) ?? [],
        };
      });

      const optRow = optionsRes.rows[0] ?? {};
      const clean = (arr: any): string[] =>
        Array.isArray(arr) ? arr.filter(Boolean).map(String).sort() : [];

      const categories = Array.from(new Set(allProducts.map(p => productToCategory.get(p)!))).sort();

      const response: OutletSummaryResponse = {
        weekRange,
        outletTypes: Array.from(outletTypeSet).sort(),
        filterOptions: {
          outletTypes: clean(optRow.outlet_types),
          categories,
          products: allProducts,
          cities: clean(optRow.cities),
          districts: clean(optRow.districts),
          salesmen: clean(optRow.salesmen),
          customers: customersRes.rows.map(r => ({ no: String(r.no ?? ''), name: String(r.name ?? '') })),
        },
        years: yearSummaries,
      };

      return NextResponse.json({ success: true, data: response });
    } catch (error) {
      console.error('[API/outlet-summary] Error:', error);
      return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
  });
}
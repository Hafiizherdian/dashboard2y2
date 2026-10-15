/**
 * Agregasi tab Outlet di server.
 *
 * Dipakai dua cara:
 *  1. createOutletCollector() → dipanggil di dalam loop stream processSalesRecords (index.ts),
 *     jadi outlet dihitung dalam SATU stream bersama tab lain.
 *  2. fetchOutletOnly()       → untuk tombol "Terapkan" di tab Outlet (outletOnly=1):
 *     stream sekali, hanya hitung outlet, lewati target/piutang/stok/kuartal/L4W.
 */

import { streamSalesRecords } from './streamSales';
import { resolveWeekYear } from './dateUtils';
import { getProductCategory } from '../productCategories';
import { FetchFilters, OutletFilterParams } from './types';
import type { OutletPanel, OutletOptions, OutletRow, OutletResponse } from '@/types/outlet';

type Period = 1 | 2;
const UNKNOWN_LABEL = 'Tidak diketahui';
const TOP_N = 10;

type DimMap = Map<string, Map<string, number>>;   // key -> (tipeOutlet -> nilai)

const bump = (m: DimMap, k: string, ot: string, v: number) => {
  let inner = m.get(k);
  if (!inner) { inner = new Map(); m.set(k, inner); }
  inner.set(ot, (inner.get(ot) ?? 0) + v);
};

const topRows = (m: DimMap, build: (key: string) => OutletRow): OutletRow[] =>
  Array.from(m.entries())
    .map(([key, inner]) => {
      const row = build(key);
      let total = 0;
      inner.forEach((v, ot) => { row[ot] = v; total += v; });
      row._total = total;
      return row;
    })
    .sort((a, b) => (b._total as number) - (a._total as number))
    .slice(0, TOP_N);

class PanelAcc {
  total = 0;
  records = 0;
  weekly = new Map<number, number>();
  outletTypes = new Set<string>();
  pieOutlet = new Map<string, number>();
  pieCategory = new Map<string, number>();
  product: DimMap = new Map();
  city: DimMap = new Map();
  district: DimMap = new Map();
  customer: DimMap = new Map();   // key: "<no>||<nama>"

  add(
    v: number, week: number, ot: string, cat: string, product: string,
    city: string, district: string, customerKey: string,
  ) {
    this.total += v;
    this.records++;
    this.weekly.set(week, (this.weekly.get(week) ?? 0) + v);
    this.outletTypes.add(ot);
    this.pieOutlet.set(ot, (this.pieOutlet.get(ot) ?? 0) + v);
    this.pieCategory.set(cat, (this.pieCategory.get(cat) ?? 0) + v);
    bump(this.product, product, ot, v);
    bump(this.city, city, ot, v);
    bump(this.district, district, ot, v);
    bump(this.customer, customerKey, ot, v);
  }

  toJSON(): OutletPanel {
    const pie = (m: Map<string, number>) =>
      Array.from(m.entries()).map(([name, value]) => ({ name, value }));
    return {
      total: this.total,
      records: this.records,
      weekly: Object.fromEntries(this.weekly),
      outletTypes: Array.from(this.outletTypes).sort(),
      pieOutlet: pie(this.pieOutlet),
      pieCategory: pie(this.pieCategory),
      barProduct:  topRows(this.product,  k => ({ product: k })),
      barCity:     topRows(this.city,     k => ({ city: k })),
      barDistrict: topRows(this.district, k => ({ district: k })),
      barCustomer: topRows(this.customer, k => {
        const i = k.indexOf('||');
        return { customer: k.slice(i + 2), _customerId: k.slice(0, i) };
      }),
    };
  }
}

class OptionsAcc {
  types = new Set<string>();
  cats = new Set<string>();
  prods = new Set<string>();
  cities = new Set<string>();
  dists = new Set<string>();
  salesmen = new Set<string>();
  custs = new Map<string, { no: string; name: string; city: string }>();

  add(
    ot: string, cat: string, product: string, city: string, district: string,
    salesman: string, no: string, name: string,
  ) {
    this.types.add(ot);
    this.cats.add(cat);
    this.prods.add(`${cat}||${product}`);
    if (city !== UNKNOWN_LABEL) this.cities.add(city);
    if (district !== UNKNOWN_LABEL) this.dists.add(`${city}||${district}`);
    if (salesman !== 'Unknown') this.salesmen.add(salesman);
    if (name && name !== 'Unknown') {
      const k = `${no}||${name}`;
      if (!this.custs.has(k)) this.custs.set(k, { no, name, city });
    }
  }

  toJSON(): OutletOptions {
    const split = (s: string) => {
      const i = s.indexOf('||');
      return [s.slice(0, i), s.slice(i + 2)] as const;
    };
    const sort = (s: Set<string>) => Array.from(s).sort();
    return {
      outletTypes: sort(this.types),
      categories:  sort(this.cats),
      products:    sort(this.prods).map(s => { const [category, product] = split(s); return { category, product }; }),
      cities:      sort(this.cities),
      districts:   sort(this.dists).map(s => { const [city, district] = split(s); return { city, district }; }),
      salesmen:    sort(this.salesmen),
      customers:   Array.from(this.custs.values()).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }
}

// Kota/kecamatan dari record, dengan fallback dari kolom area ("kecamatan, kota")
export function resolveLocation(rec: any): { city: string; district: string } {
  let city     = (rec.city     || '').trim() || UNKNOWN_LABEL;
  let district = (rec.district || '').trim() || UNKNOWN_LABEL;
  const area   = (rec.area     || '').trim();

  if ((city === UNKNOWN_LABEL || district === UNKNOWN_LABEL) && area.length > 0) {
    if (area.includes(',')) {
      const parts = area.split(',').map((x: string) => x.trim());
      if (district === UNKNOWN_LABEL && parts[0]) district = parts[0];
      if (city     === UNKNOWN_LABEL && parts[1]) city     = parts[1];
    } else if (city === UNKNOWN_LABEL) {
      city = area;
    }
  }
  return { city, district };
}

export type OutletCtx = {
  isoWeek: number;
  inP1: boolean;
  inP2: boolean;
  city: string;
  district: string;
};

/**
 * Collector: panggil add() untuk tiap record yang SUDAH lolos filter periode,
 * lalu result() di akhir.
 */
export function createOutletCollector(filters: FetchFilters | undefined, withOptions: boolean) {
  const unit: string = filters?.selectedUnit || 'units_dos';
  const flt: OutletFilterParams = filters?.outlet ?? {};
  const q = flt.q?.trim().toLowerCase();

  const panels: Record<Period, PanelAcc> = { 1: new PanelAcc(), 2: new PanelAcc() };
  const opts = withOptions ? new OptionsAcc() : null;
  let minW = Infinity;
  let maxW = -Infinity;

  const add = (rec: any, ctx: OutletCtx) => {
    const { isoWeek, inP1, inP2, city, district } = ctx;

    const product     = rec.product || 'Produk Tidak Diketahui';
    const outletType  = rec.customer_type || 'Tipe Customer tidak diketahui';
    const category    = getProductCategory(product);
    const customer    = rec.customer || 'Unknown';
    const customer_no = rec.customer_no || '';
    const salesman    = rec.salesman || 'Unknown';

    // Opsi dropdown dikumpulkan SEBELUM filter outlet, jadi tidak menyusut
    opts?.add(outletType, category, product, city, district, salesman, customer_no, customer);

    // Filter outlet
    if (flt.outletType && outletType !== flt.outletType) return;
    if (flt.category   && category   !== flt.category)   return;
    if (flt.product    && product    !== flt.product)    return;
    if (flt.city       && city       !== flt.city)       return;
    if (flt.district   && district   !== flt.district)   return;
    if (flt.salesman   && salesman   !== flt.salesman)   return;
    if (flt.customerNo) {
      if (customer_no !== flt.customerNo) return;
    } else if (flt.customerName && (customer !== flt.customerName || customer_no)) {
      return;
    }
    if (q) {
      const hay = `${customer} ${customer_no} ${product} ${city} ${district} ${salesman}`.toLowerCase();
      if (!hay.includes(q)) return;
    }

    const omzRaw = typeof rec.omzet === 'number' ? rec.omzet : parseFloat(rec.omzet ?? '0');
    const omz = Number.isFinite(omzRaw) ? omzRaw : 0;
    const v = unit === 'omzet'      ? omz
            : unit === 'units_bks'  ? Number(rec.units_bks)  || 0
            : unit === 'units_slop' ? Number(rec.units_slop) || 0
            : unit === 'units_bal'  ? Number(rec.units_bal)  || 0
            : Number(rec.units_dos) || 0;

    if (isoWeek < minW) minW = isoWeek;
    if (isoWeek > maxW) maxW = isoWeek;

    const customerKey = `${customer_no}||${customer}`;
    if (inP1) panels[1].add(v, isoWeek, outletType, category, product, city, district, customerKey);
    if (inP2) panels[2].add(v, isoWeek, outletType, category, product, city, district, customerKey);
  };

  const result = (): OutletResponse => ({
    unit,
    years: { p1: filters?.year1 ?? 0, p2: filters?.year2 ?? 0 },
    weekRange: isFinite(minW) ? { min: minW, max: maxW } : { min: 1, max: 52 },
    p1: panels[1].toJSON(),
    p2: panels[2].toJSON(),
    ...(opts ? { options: opts.toJSON() } : {}),
  });

  return { add, result };
}

/**
 * Mode outletOnly: stream sekali, hanya hitung outlet.
 * Logika periode sama persis dengan processSalesRecords (index.ts).
 */
export async function fetchOutletOnly(filters: FetchFilters): Promise<OutletResponse> {
  const { year1, year2 } = filters;

  const clamp = (w: number) => Math.max(1, Math.min(52, w));
  const mkRange = (s?: number, e?: number) =>
    (s !== undefined || e !== undefined) ? { start: clamp(s ?? 1), end: clamp(e ?? 52) } : null;
  const r1 = mkRange(filters.weekStart1, filters.weekEnd1);
  const r2 = mkRange(filters.weekStart2, filters.weekEnd2);

  const requested = new Set<number>();
  if (year1 !== undefined) requested.add(year1);
  if (year2 !== undefined) requested.add(year2);
  const noYearFilter = year1 === undefined && year2 === undefined;

  const inPeriod = (p: Period, isoYear: number, isoWeek: number) => {
    if (noYearFilter) return p === 2;
    const y = p === 1 ? year1 : year2;
    const r = p === 1 ? r1 : r2;
    if (y === undefined || isoYear !== y) return false;
    return r === null || (isoWeek >= r.start && isoWeek <= r.end);
  };

  const collector = createOutletCollector(filters, false);

  await streamSalesRecords(filters, (batch) => {
    for (const rec of batch) {
      const { year: isoYear, week: isoWeek } = resolveWeekYear(rec);
      if (requested.size > 0 && !requested.has(isoYear)) continue;

      const inP1 = inPeriod(1, isoYear, isoWeek);
      const inP2 = inPeriod(2, isoYear, isoWeek);
      if (!inP1 && !inP2) continue;

      const { city, district } = resolveLocation(rec);
      collector.add(rec, { isoWeek, inP1, inP2, city, district });
    }
  });

  return collector.result();
}
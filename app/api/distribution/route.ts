/**
 * app/api/distribution/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { withAuth } from '@/lib/auth/session';
import * as XLSX from 'xlsx';

function parseNum(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw !== 'string') return 0;
  const s = raw.trim().replace(/[^0-9.,\-]/g, '');
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function parseWeekNum(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const m = raw.match(/\d+/);
    return m ? parseInt(m[0]) : 1;
  }
  return 1;
}

function log(step: string, detail?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  if (detail) {
    console.log(`[dist-upload] [${ts}] ${step}`, JSON.stringify(detail, null, 2));
  } else {
    console.log(`[dist-upload] [${ts}] ${step}`);
  }
}

function logError(step: string, err: unknown, detail?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  console.error(`[dist-upload] [${ts}] ❌ ${step}`, detail ?? '', err);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET
// ═══════════════════════════════════════════════════════════════════════════════
//
// CATATAN PENTING ─ Definisi metrik (per outlet, tidak double count per produk):
//   - total_plan   : outlet dihitung 1x jika SUM(plan) pada outlet itu > 0
//   - total_actual : outlet dihitung 1x jika SUM(actual) pada outlet itu > 0
//   - total_av_in  : outlet dihitung 1x jika SUM(av_in) pada outlet itu > 0
//   - total_ec     : outlet dihitung 1x jika SUM(ec) pada outlet itu > 0
//   - total_av_out : outlet dihitung 1x jika (av_in > 0 ATAU ec > 0) pada outlet itu
//
// Semua query di bawah pakai pola CTE 2-tahap:
//   1) flatten ke level outlet dalam masing-masing grup (MAX/CASE WHEN SUM(...)>0)
//   2) SUM flag tsb per grup -> hasilnya jadi COUNT DISTINCT outlet yang valid,
//      bukan SUM mentah dari kolom Plan/Actual/Av-In/EC/Av-Out.
//
// PENTING ─ dimensi GROUP BY harus PERSIS SAMA dengan dimensi yang ditampilkan
// di frontend. Kalau CTE/SELECT di-GROUP BY dengan kolom tambahan (mis. product,
// outlet_type) yang TIDAK ditampilkan/diagregasi lagi di komponen React, hasilnya
// jadi banyak baris untuk 1 entity yang sama di tabel (kelihatan "duplikat"), atau
// — kalau frontend nge-key pakai Map — baris-baris itu saling overwrite dan data
// yang ditampilkan jadi salah/hilang diam-diam. Query di bawah ini SENGAJA di-
// GROUP BY hanya sampai dimensi yang benar-benar dipakai di UI:
//   - achievementSalesman  -> per salesman saja      (tab "Per Salesman")
//   - achievementProduct   -> per product+category   (tab "Per Produk", category
//                              ikut ditampilkan di kolom terpisah, jadi aman)
//   - achievementArea      -> per city+district       (tab "Per Area/Kota")
//   - trend                -> per week saja            (chart & tabel trend mingguan)
//   - coverage              -> per outlet_type saja    (pie chart & tabel per tipe)
//   - coverageSalesman     -> per salesman+week saja   (heatmap salesman × minggu)
//
export async function GET(request: NextRequest) {
  return withAuth(request, 'view_files', async (session) => {
    try {
      const { searchParams } = new URL(request.url);

      // ── Early return: hanya daftar file (untuk admin page load awal) ──────
      const mode = searchParams.get('mode');
      if (mode === 'files') {
        const filesQ = await pool.query(`
          SELECT id, original_name, record_count, area, created_at
          FROM distribution_files
          WHERE status = 'completed'
          ORDER BY created_at DESC
          
        `);
        return NextResponse.json({
          success: true,
          data: { files: filesQ.rows },
        });
      }

      // ── Query lengkap ─────────────────────────────────────────────────────
      const area       = searchParams.get('area') || '';
      const salesman   = searchParams.get('salesman') || '';
      const product    = searchParams.get('product') || '';
      const weekStart  = parseInt(searchParams.get('weekStart') || '1');
      const weekEnd    = parseInt(searchParams.get('weekEnd') || '52');
      const city       = searchParams.get('city') || '';
      const fileId     = searchParams.get('fileId') || '';
      const outletType = searchParams.get('outletType') || '';

      // ── WHERE dengan semua filter (dipakai mayoritas query) ────────────────
      const params: any[] = [];
      let idx = 1;
      const conditions: string[] = ['1=1'];

      // 1. Terapkan filter area dari frontend (jika user memilih area)
      if (area) {
        conditions.push(`area = $${idx++}`);
        params.push(area);
      }

      // 2. Terapkan aturan keamanan: batasi data HANYA pada area yang diizinkan untuk user ini
      if (session.role !== 'root' && session.allowed_areas?.length > 0) {
        conditions.push(`area = ANY($${idx++})`);
        params.push(session.allowed_areas);
      }

      if (salesman)   { conditions.push(`salesman ILIKE $${idx++}`);    params.push(`%${salesman}%`); }
      if (product)    { conditions.push(`product ILIKE $${idx++}`);     params.push(`%${product}%`);  }
      if (city)       { conditions.push(`city ILIKE $${idx++}`);        params.push(`%${city}%`);     }
      if (fileId)     { conditions.push(`dist_file_id = $${idx++}`);    params.push(parseInt(fileId)); }
      if (outletType) { conditions.push(`outlet_type ILIKE $${idx++}`); params.push(outletType); }

      conditions.push(`week_num BETWEEN $${idx++} AND $${idx++}`);
      params.push(weekStart, weekEnd);

      const where = conditions.join(' AND ');

      // ── WHERE tanpa filter salesman (untuk query area/coverage) ───────────
      const baseConditions: string[] = ['1=1'];
      const baseParams: any[] = [];
      let baseIdx = 1;

      if (session.role !== 'root' && session.allowed_areas?.length > 0) {
        baseConditions.push(`area = ANY($${baseIdx++})`);
        baseParams.push(session.allowed_areas);
      } else if (area) {
        baseConditions.push(`area = $${baseIdx++}`);
        baseParams.push(area);
      }

      if (product)    { baseConditions.push(`product ILIKE $${baseIdx++}`);     baseParams.push(`%${product}%`);  }
      if (city)       { baseConditions.push(`city ILIKE $${baseIdx++}`);        baseParams.push(`%${city}%`);     }
      if (fileId)     { baseConditions.push(`dist_file_id = $${baseIdx++}`);    baseParams.push(parseInt(fileId)); }
      if (outletType) { baseConditions.push(`outlet_type ILIKE $${baseIdx++}`); baseParams.push(outletType); }

      baseConditions.push(`week_num BETWEEN $${baseIdx++} AND $${baseIdx++}`);
      baseParams.push(weekStart, weekEnd);

      const whereBase = baseConditions.join(' AND ');

      // ── WHERE tanpa filter salesman DAN tanpa filter product ───────────────
      const noSalNoProdConditions: string[] = ['1=1'];
      const noSalNoProdParams: any[] = [];
      let noSalNoProdIdx = 1;

      if (session.role !== 'root' && session.allowed_areas?.length > 0) {
        noSalNoProdConditions.push(`area = ANY($${noSalNoProdIdx++})`);
        noSalNoProdParams.push(session.allowed_areas);
      } else if (area) {
        noSalNoProdConditions.push(`area = $${noSalNoProdIdx++}`);
        noSalNoProdParams.push(area);
      }

      if (city)       { noSalNoProdConditions.push(`city ILIKE $${noSalNoProdIdx++}`);        noSalNoProdParams.push(`%${city}%`);   }
      if (fileId)     { noSalNoProdConditions.push(`dist_file_id = $${noSalNoProdIdx++}`);     noSalNoProdParams.push(parseInt(fileId)); }
      if (outletType) { noSalNoProdConditions.push(`outlet_type ILIKE $${noSalNoProdIdx++}`);  noSalNoProdParams.push(outletType); }

      noSalNoProdConditions.push(`week_num BETWEEN $${noSalNoProdIdx++} AND $${noSalNoProdIdx++}`);
      noSalNoProdParams.push(weekStart, weekEnd);

      const whereNoSalNoProd = noSalNoProdConditions.join(' AND ');

      // ── WHERE dengan salesman tapi TANPA filter product ────────────────────
      // Dipakai untuk outletCountByType & totalOutlets agar ikut filter salesman + outletType
      const withSalConditions: string[] = ['1=1'];
      const withSalParams: any[] = [];
      let withSalIdx = 1;

      if (session.role !== 'root' && session.allowed_areas?.length > 0) {
        withSalConditions.push(`area = ANY($${withSalIdx++})`);
        withSalParams.push(session.allowed_areas);
      } else if (area) {
        withSalConditions.push(`area = $${withSalIdx++}`);
        withSalParams.push(area);
      }

      if (salesman)   { withSalConditions.push(`salesman ILIKE $${withSalIdx++}`);    withSalParams.push(`%${salesman}%`); }
      if (city)       { withSalConditions.push(`city ILIKE $${withSalIdx++}`);        withSalParams.push(`%${city}%`);     }
      if (fileId)     { withSalConditions.push(`dist_file_id = $${withSalIdx++}`);    withSalParams.push(parseInt(fileId)); }
      if (outletType) { withSalConditions.push(`outlet_type ILIKE $${withSalIdx++}`); withSalParams.push(outletType); }

      withSalConditions.push(`week_num BETWEEN $${withSalIdx++} AND $${withSalIdx++}`);
      withSalParams.push(weekStart, weekEnd);

      const whereWithSal = withSalConditions.join(' AND ');

      const [
        achSalesmanQ,
        achProductQ,
        achAreaQ,
        trendQ,
        coverageQ,
        coverageSalesmanQ,
        summaryQ,
        filesQ,
        outletCountByTypeQ,
        totalOutletsQ,
        outletCountByTypeSalesmanQ,
        achAreaSalesmanQ,
        achAreaProductQ,
        achAreaOutletTypeQ,
        achSalesmanProductQ,
      ] = await Promise.all([

        // Achievement per salesman (murni per salesman, TANPA breakdown produk).
        // FIX: sebelumnya GROUP BY salesman, product -> 1 salesman bisa muncul
        // berkali-kali (1 baris per produk) dan di tabel "Per Salesman" kolom
        // product tidak ditampilkan, jadi kelihatan seperti baris duplikat.
        // Sekarang outlet di-dedup per salesman saja (lintas semua produk).
        pool.query(`
          WITH outlet_agg AS (
            SELECT
              salesman,
              outlet,
              MAX(CASE WHEN plan  > 0 THEN 1 ELSE 0 END) AS f_plan,
              MAX(CASE WHEN actual > 0 THEN 1 ELSE 0 END) AS f_actual,
              MAX(CASE WHEN av_in > 0 OR ec > 0 THEN 1 ELSE 0 END) AS f_avout
            FROM distribution_records
            WHERE ${where}
            GROUP BY salesman, outlet
          )
          SELECT
            salesman,
            SUM(f_plan)   AS total_plan,
            SUM(f_actual) AS total_actual,
            SUM(f_avout)  AS total_av_out,
            COUNT(DISTINCT outlet) AS outlet_count,
            CASE
              WHEN SUM(f_plan) > 0
              THEN ROUND((SUM(f_avout)::numeric / SUM(f_plan)) * 100, 1)
              ELSE 0
            END AS achievement_pct
          FROM outlet_agg
          GROUP BY salesman
          ORDER BY achievement_pct DESC
        `, params),

        // Achievement per produk
        // outlet dihitung 1x per (product, category) — category ikut ditampilkan
        // di kolom terpisah di UI jadi baris ganda di sini (kalau ada) tetap valid.
        pool.query(`
          WITH outlet_agg AS (
            SELECT
              product,
              category,
              outlet,
              MAX(CASE WHEN plan  > 0 THEN 1 ELSE 0 END) AS f_plan,
              MAX(CASE WHEN actual > 0 THEN 1 ELSE 0 END) AS f_actual,
              MAX(CASE WHEN av_in > 0 OR ec > 0 THEN 1 ELSE 0 END) AS f_avout
            FROM distribution_records
            WHERE ${where}
            GROUP BY product, category, outlet
          )
          SELECT
            product,
            category,
            SUM(f_plan)   AS total_plan,
            SUM(f_actual) AS total_actual,
            SUM(f_avout)  AS total_av_out,
            CASE
              WHEN SUM(f_plan) > 0
              THEN ROUND((SUM(f_avout)::numeric / SUM(f_plan)) * 100, 1)
              ELSE 0
            END AS achievement_pct
          FROM outlet_agg
          GROUP BY product, category
          ORDER BY total_av_out DESC
        `, params),

        // Achievement per area (base — tanpa filter salesman)
        // outlet dihitung 1x per (city, district), tidak terikat produk
        pool.query(`
          WITH outlet_agg AS (
            SELECT
              city,
              district,
              outlet,
              MAX(CASE WHEN plan  > 0 THEN 1 ELSE 0 END) AS f_plan,
              MAX(CASE WHEN actual > 0 THEN 1 ELSE 0 END) AS f_actual,
              MAX(CASE WHEN av_in > 0 OR ec > 0 THEN 1 ELSE 0 END) AS f_avout
            FROM distribution_records
            WHERE ${whereBase}
            GROUP BY city, district, outlet
          )
          SELECT
            city,
            district,
            SUM(f_plan)   AS total_plan,
            SUM(f_actual) AS total_actual,
            SUM(f_avout)  AS total_av_out,
            COUNT(DISTINCT outlet) AS outlet_count,
            CASE
              WHEN SUM(f_plan) > 0
              THEN ROUND((SUM(f_avout)::numeric / SUM(f_plan)) * 100, 1)
              ELSE 0
            END AS achievement_pct
          FROM outlet_agg
          GROUP BY city, district
          ORDER BY total_av_out DESC
        `, baseParams),

        // Trend mingguan (murni per minggu, TANPA breakdown produk).
        // FIX: sebelumnya GROUP BY week, week_num, product -> 1 minggu bisa
        // muncul berkali-kali (1 baris per produk), padahal tabel & chart trend
        // di frontend cuma menampilkan kolom "Minggu" saja -> kelihatan seperti
        // baris/bar duplikat per minggu. Sekarang outlet di-dedup per minggu saja.
        pool.query(`
          WITH outlet_agg AS (
            SELECT
              week,
              week_num,
              outlet,
              MAX(CASE WHEN plan  > 0 THEN 1 ELSE 0 END) AS f_plan,
              MAX(CASE WHEN actual > 0 THEN 1 ELSE 0 END) AS f_actual,
              MAX(CASE WHEN av_in > 0 THEN 1 ELSE 0 END) AS f_avin,
              MAX(CASE WHEN ec > 0 THEN 1 ELSE 0 END) AS f_ec,
              MAX(CASE WHEN av_in > 0 OR ec > 0 THEN 1 ELSE 0 END) AS f_avout
            FROM distribution_records
            WHERE ${where}
            GROUP BY week, week_num, outlet
          )
          SELECT
            week,
            week_num,
            SUM(f_plan)   AS total_plan,
            SUM(f_actual) AS total_actual,
            SUM(f_avin)   AS total_av_in,
            SUM(f_ec)     AS total_ec,
            SUM(f_avout)  AS total_av_out,
            COUNT(DISTINCT outlet) AS outlet_count
          FROM outlet_agg
          GROUP BY week, week_num
          ORDER BY week_num ASC
        `, params),

        // Coverage per tipe outlet (murni per outlet_type, TANPA breakdown produk,
        // tanpa filter salesman).
        // FIX: sebelumnya GROUP BY outlet_type, product -> 1 tipe outlet bisa
        // muncul berkali-kali (1 baris per produk), padahal tabel, pie chart, dan
        // bar chart Av-In/EC/Av-Out di frontend cuma menampilkan outlet_type saja
        // -> kelihatan seperti baris/slice duplikat. Sekarang outlet di-dedup per
        // tipe outlet saja.
        pool.query(`
          WITH outlet_agg AS (
            SELECT
              outlet_type,
              outlet,
              MAX(CASE WHEN plan  > 0 THEN 1 ELSE 0 END) AS f_plan,
              MAX(CASE WHEN actual > 0 THEN 1 ELSE 0 END) AS f_actual,
              MAX(CASE WHEN av_in > 0 THEN 1 ELSE 0 END) AS f_avin,
              MAX(CASE WHEN ec > 0 THEN 1 ELSE 0 END) AS f_ec,
              MAX(CASE WHEN av_in > 0 OR ec > 0 THEN 1 ELSE 0 END) AS f_avout
            FROM distribution_records
            WHERE ${whereBase}
            GROUP BY outlet_type, outlet
          )
          SELECT
            outlet_type,
            SUM(f_plan)   AS total_plan,
            SUM(f_actual) AS total_actual,
            SUM(f_avin)   AS total_av_in,
            SUM(f_ec)     AS total_ec,
            SUM(f_avout)  AS total_av_out,
            CASE
              WHEN SUM(f_plan) > 0
              THEN ROUND((SUM(f_avout)::numeric / SUM(f_plan)) * 100, 1)
              ELSE 0
            END AS achievement_pct
          FROM outlet_agg
          GROUP BY outlet_type
          ORDER BY total_av_out DESC
        `, baseParams),

        // Coverage salesman per minggu (murni per salesman+minggu, TANPA
        // breakdown produk/outlet_type) — dipakai untuk heatmap.
        // FIX: sebelumnya GROUP BY salesman, week_num, week, product, outlet_type
        // -> kalau 1 salesman punya >1 kombinasi produk/tipe-outlet di minggu yang
        // sama, hasilnya jadi >1 baris dengan key salesman+week yang sama. Karena
        // heatMap di frontend nge-key pakai `${salesman}||${week}` (Map.set),
        // baris-baris itu SALING OVERWRITE — data salesman itu di minggu itu jadi
        // cuma nunjukin kombinasi produk/tipe-outlet TERAKHIR, bukan totalnya.
        // Sekarang outlet di-dedup per salesman+minggu saja (lintas semua produk
        // & tipe outlet).
        pool.query(`
          WITH outlet_agg AS (
            SELECT
              salesman,
              week_num,
              week,
              outlet,
              MAX(CASE WHEN plan  > 0 THEN 1 ELSE 0 END) AS f_plan,
              MAX(CASE WHEN actual > 0 THEN 1 ELSE 0 END) AS f_actual,
              MAX(CASE WHEN av_in > 0 THEN 1 ELSE 0 END) AS f_avin,
              MAX(CASE WHEN ec > 0 THEN 1 ELSE 0 END) AS f_ec,
              MAX(CASE WHEN av_in > 0 OR ec > 0 THEN 1 ELSE 0 END) AS f_avout
            FROM distribution_records
            WHERE ${where}
            GROUP BY salesman, week_num, week, outlet
          )
          SELECT
            salesman,
            week_num,
            week,
            SUM(f_plan)   AS plan,
            SUM(f_actual) AS actual,
            SUM(f_avin)   AS av_in,
            SUM(f_ec)     AS ec,
            SUM(f_avout)  AS av_out,
            COUNT(DISTINCT outlet) AS outlet_count,
            CASE
              WHEN SUM(f_plan) > 0
              THEN ROUND((SUM(f_avout)::numeric / SUM(f_plan)) * 100, 1)
              ELSE 0
            END AS achievement_pct
          FROM outlet_agg
          GROUP BY salesman, week_num, week
          ORDER BY salesman, week_num
        `, params),

        // Summary keseluruhan (KPI card)
        // total_plan/actual/av_in/ec/av_out = COUNT DISTINCT outlet yang memenuhi
        // kondisi, tidak tergantung berapa banyak produk per outlet
        pool.query(`
          WITH base AS (
            SELECT * FROM distribution_records WHERE ${where}
          ),
          outlet_agg AS (
            SELECT
              outlet,
              MAX(CASE WHEN plan  > 0 THEN 1 ELSE 0 END) AS f_plan,
              MAX(CASE WHEN actual > 0 THEN 1 ELSE 0 END) AS f_actual,
              MAX(CASE WHEN av_in > 0 THEN 1 ELSE 0 END) AS f_avin,
              MAX(CASE WHEN ec > 0 THEN 1 ELSE 0 END) AS f_ec,
              MAX(CASE WHEN av_in > 0 OR ec > 0 THEN 1 ELSE 0 END) AS f_avout
            FROM base
            GROUP BY outlet
          )
          SELECT
            (SELECT COALESCE(SUM(f_plan), 0)   FROM outlet_agg) AS total_plan,
            (SELECT COALESCE(SUM(f_actual), 0) FROM outlet_agg) AS total_actual,
            (SELECT COALESCE(SUM(f_avin), 0)   FROM outlet_agg) AS total_av_in,
            (SELECT COALESCE(SUM(f_ec), 0)     FROM outlet_agg) AS total_ec,
            (SELECT COALESCE(SUM(f_avout), 0)  FROM outlet_agg) AS total_av_out,
            (SELECT COUNT(DISTINCT outlet)     FROM base)       AS total_outlets,
            (SELECT COUNT(DISTINCT salesman)   FROM base)       AS total_salesmen,
            (SELECT COUNT(DISTINCT product)    FROM base)       AS total_products,
            (SELECT COUNT(DISTINCT customer_id) FROM base)      AS total_customers,
            CASE
              WHEN (SELECT COALESCE(SUM(f_plan), 0) FROM outlet_agg) > 0
              THEN ROUND(
                (SELECT COALESCE(SUM(f_avout), 0) FROM outlet_agg)::numeric
                / (SELECT SUM(f_plan) FROM outlet_agg) * 100, 1
              )
              ELSE 0
            END AS overall_achievement
        `, params),

        // Daftar file upload
        pool.query(`
          SELECT id, original_name, record_count, area, created_at
          FROM distribution_files
          WHERE status = 'completed'
          ORDER BY created_at DESC
          
        `),

        // Outlet count per tipe — ikut filter salesman + outletType (pakai whereWithSal)
        // (sudah COUNT DISTINCT outlet dari awal, tidak perlu diubah)
        pool.query(`
          SELECT
            outlet_type,
            COUNT(DISTINCT outlet) AS outlet_count
          FROM distribution_records
          WHERE ${whereWithSal}
          GROUP BY outlet_type
        `, withSalParams),

        // Total outlet — ikut filter salesman + outletType (pakai whereWithSal)
        // (sudah COUNT DISTINCT outlet dari awal, tidak perlu diubah)
        pool.query(`
          SELECT COUNT(DISTINCT outlet) AS total_outlets
          FROM distribution_records
          WHERE ${whereWithSal}
        `, withSalParams),

        // Outlet count per outlet_type per salesman
        // (sudah COUNT DISTINCT outlet dari awal, tidak perlu diubah)
        pool.query(`
          SELECT
            salesman,
            outlet_type,
            COUNT(DISTINCT outlet) AS outlet_count
          FROM distribution_records
          WHERE ${where}
          GROUP BY salesman, outlet_type
          ORDER BY salesman, outlet_type
        `, params),

        // Achievement area per SALESMAN × city × district
        pool.query(`
          WITH outlet_agg AS (
            SELECT
              salesman,
              city,
              district,
              outlet,
              MAX(CASE WHEN plan  > 0 THEN 1 ELSE 0 END) AS f_plan,
              MAX(CASE WHEN actual > 0 THEN 1 ELSE 0 END) AS f_actual,
              MAX(CASE WHEN av_in > 0 OR ec > 0 THEN 1 ELSE 0 END) AS f_avout
            FROM distribution_records
            WHERE ${where}
            GROUP BY salesman, city, district, outlet
          )
          SELECT
            salesman,
            city,
            district,
            SUM(f_plan)   AS total_plan,
            SUM(f_actual) AS total_actual,
            SUM(f_avout)  AS total_av_out,
            COUNT(DISTINCT outlet) AS outlet_count,
            CASE
              WHEN SUM(f_plan) > 0
              THEN ROUND((SUM(f_avout)::numeric / SUM(f_plan)) * 100, 1)
              ELSE 0
            END AS achievement_pct
          FROM outlet_agg
          GROUP BY salesman, city, district
          ORDER BY total_av_out DESC
        `, params),

        // Achievement area per PRODUCT × city × district
        pool.query(`
          WITH outlet_agg AS (
            SELECT
              product,
              city,
              district,
              outlet,
              MAX(CASE WHEN plan  > 0 THEN 1 ELSE 0 END) AS f_plan,
              MAX(CASE WHEN actual > 0 THEN 1 ELSE 0 END) AS f_actual,
              MAX(CASE WHEN av_in > 0 OR ec > 0 THEN 1 ELSE 0 END) AS f_avout
            FROM distribution_records
            WHERE ${whereNoSalNoProd}
            GROUP BY product, city, district, outlet
          )
          SELECT
            product,
            city,
            district,
            SUM(f_plan)   AS total_plan,
            SUM(f_actual) AS total_actual,
            SUM(f_avout)  AS total_av_out,
            COUNT(DISTINCT outlet) AS outlet_count,
            CASE
              WHEN SUM(f_plan) > 0
              THEN ROUND((SUM(f_avout)::numeric / SUM(f_plan)) * 100, 1)
              ELSE 0
            END AS achievement_pct
          FROM outlet_agg
          GROUP BY product, city, district
          ORDER BY total_av_out DESC
        `, noSalNoProdParams),

        // Achievement area per OUTLET_TYPE × city × district
        pool.query(`
          WITH outlet_agg AS (
            SELECT
              outlet_type,
              city,
              district,
              outlet,
              MAX(CASE WHEN plan  > 0 THEN 1 ELSE 0 END) AS f_plan,
              MAX(CASE WHEN actual > 0 THEN 1 ELSE 0 END) AS f_actual,
              MAX(CASE WHEN av_in > 0 OR ec > 0 THEN 1 ELSE 0 END) AS f_avout
            FROM distribution_records
            WHERE ${whereNoSalNoProd}
            GROUP BY outlet_type, city, district, outlet
          )
          SELECT
            outlet_type,
            city,
            district,
            SUM(f_plan)   AS total_plan,
            SUM(f_actual) AS total_actual,
            SUM(f_avout)  AS total_av_out,
            COUNT(DISTINCT outlet) AS outlet_count,
            CASE
              WHEN SUM(f_plan) > 0
              THEN ROUND((SUM(f_avout)::numeric / SUM(f_plan)) * 100, 1)
              ELSE 0
            END AS achievement_pct
          FROM outlet_agg
          GROUP BY outlet_type, city, district
          ORDER BY total_av_out DESC
        `, noSalNoProdParams),

        // Achievement per SALESMAN × PRODUK (dedup outlet per kombinasi salesman+product,
        // BUKAN per salesman+week seperti coverageSalesmanQ). Ini yang tadinya hilang —
        // coverageSalesmanQ tidak pernah SELECT product sama sekali, jadi tabel pivot
        // Salesman×Produk di frontend selalu kosong untuk kolom Produk.
        pool.query(`
          WITH outlet_agg AS (
            SELECT
              salesman,
              product,
              outlet,
              MAX(CASE WHEN plan  > 0 THEN 1 ELSE 0 END) AS f_plan,
              MAX(CASE WHEN actual > 0 THEN 1 ELSE 0 END) AS f_actual,
              MAX(CASE WHEN av_in > 0 THEN 1 ELSE 0 END) AS f_avin,
              MAX(CASE WHEN ec > 0 THEN 1 ELSE 0 END) AS f_ec,
              MAX(CASE WHEN av_in > 0 OR ec > 0 THEN 1 ELSE 0 END) AS f_avout
            FROM distribution_records
            WHERE ${where}
            GROUP BY salesman, product, outlet
          )
          SELECT
            salesman,
            product,
            SUM(f_plan)   AS total_plan,
            SUM(f_actual) AS total_actual,
            SUM(f_avin)   AS total_av_in,
            SUM(f_ec)     AS total_ec,
            SUM(f_avout)  AS total_av_out,
            COUNT(DISTINCT outlet) AS outlet_count,
            CASE
              WHEN SUM(f_plan) > 0
              THEN ROUND((SUM(f_avout)::numeric / SUM(f_plan)) * 100, 1)
              ELSE 0
            END AS achievement_pct
          FROM outlet_agg
          GROUP BY salesman, product
          ORDER BY salesman, total_av_out DESC
        `, params),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          summary:                    summaryQ.rows[0] ?? {},
          achievementSalesman:        achSalesmanQ.rows,
          achievementProduct:         achProductQ.rows,
          achievementArea:            achAreaQ.rows,
          trend:                      trendQ.rows,
          coverage:                   coverageQ.rows,
          coverageSalesman:           coverageSalesmanQ.rows,
          // files:                      filesQ.rows,
          outletCountByType:          outletCountByTypeQ.rows,
          totalOutlets:               parseInt(totalOutletsQ.rows[0]?.total_outlets ?? '0'),
          outletCountByTypeSalesman:  outletCountByTypeSalesmanQ.rows,
          achievementAreaSalesman:    achAreaSalesmanQ.rows,
          achievementAreaProduct:     achAreaProductQ.rows,
          achievementAreaOutletType:  achAreaOutletTypeQ.rows,
          achievementSalesmanProduct: achSalesmanProductQ.rows,
        },
      });

    } catch (err) {
      console.error('[api/distribution GET]', err);
      return NextResponse.json(
        { success: false, error: 'Gagal mengambil data distribusi' },
        { status: 500 }
      );
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST — Upload file Excel distribusi
// ═══════════════════════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  return withAuth(request, 'upload_file', async (session) => {

    const uploadStart = Date.now();
    log('=== UPLOAD DISTRIBUSI START ===', { user: session.username, role: session.role });

    try {
      log('Step 1: Membaca form data...');
      const formData   = await request.formData();
      const file       = formData.get('file') as File;
      let selectedArea = formData.get('area') as string || '';

      if (!file) {
        log('Step 1: ❌ File tidak ditemukan di form data');
        return NextResponse.json(
          { success: false, error: 'File tidak ditemukan' },
          { status: 400 }
        );
      }

      log('Step 1: ✓ File diterima', {
        name:     file.name,
        size:     `${(file.size / 1024).toFixed(1)} KB`,
        type:     file.type,
        area:     selectedArea || '(belum dipilih)',
        userRole: session.role,
      });

      log('Step 2: Menentukan area...');
      if (session.role !== 'root' && !selectedArea) {
        const userAreas = session.allowed_areas || [];
        if (userAreas.length === 1) {
          selectedArea = userAreas[0];
          log('Step 2: Auto-assign area dari session', { area: selectedArea });
        } else {
          log('Step 2: ⚠ Multiple area, tidak di-assign otomatis', { available: userAreas });
        }
      } else {
        log('Step 2: Area dari request', { area: selectedArea });
      }

      log('Step 3: Membaca file Excel...');
      const readStart = Date.now();
      const bytes     = await file.arrayBuffer();
      const buffer    = Buffer.from(bytes);

      let workbook: XLSX.WorkBook;
      try {
        workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      } catch (xlsxErr) {
        logError('Step 3: Gagal parse Excel', xlsxErr, { file: file.name });
        return NextResponse.json(
          { success: false, error: 'File tidak bisa dibaca. Pastikan format .xlsx, .xls, atau .csv' },
          { status: 400 }
        );
      }

      const sheetNames = workbook.SheetNames;
      log('Step 3: ✓ Excel terbaca', { sheets: sheetNames, readMs: Date.now() - readStart });

      const sheet   = workbook.Sheets[sheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      log('Step 3: Sheet di-parse', { totalRawRows: rawRows.length });

      if (!rawRows.length) {
        return NextResponse.json(
          { success: false, error: 'File kosong atau format tidak dikenali' },
          { status: 400 }
        );
      }

      const sampleRow       = rawRows[0] as Record<string, unknown>;
      const detectedColumns = Object.keys(sampleRow);
      log('Step 4: Kolom terdeteksi', { columns: detectedColumns });

      log('Step 5: Memproses baris data...');
      const parseStart = Date.now();
      const records: any[] = [];
      let skippedRows = 0;
      const skipReasons: Record<string, number> = {};

      for (const row of rawRows as any[]) {
        const weekRaw = row['Minggu']       || row['Week']     || '';
        const product = row['Produk']       || row['Product']  || '';
        const outlet  = row['Outlet']       || row['Customer'] || row['Nama Outlet'] || '';

        if (!product && !outlet) {
          skippedRows++;
          const reason = 'product+outlet kosong';
          skipReasons[reason] = (skipReasons[reason] ?? 0) + 1;
          continue;
        }

        const weekNum = parseWeekNum(weekRaw);

        records.push({
          week:        weekRaw.toString().trim() || `W${weekNum}`,
          week_num:    weekNum,
          product:     product.toString().trim(),
          category:    (row['Kategori Produk'] || row['Category'] || '').toString().trim(),
          customer_id: (row['Customer ID'] || row['No. Customer'] || '').toString().trim(),
          outlet:      outlet.toString().trim(),
          outlet_type: (row['Tipe Outlet'] || row['Outlet Type'] || '').toString().trim(),
          salesman:    (row['Salesman'] || '').toString().trim(),
          village:     (row['Desa']      || row['Village']  || '').toString().trim(),
          district:    (row['Kecamatan'] || row['District'] || '').toString().trim(),
          city:        (row['Kota']      || row['City']     || '').toString().trim(),
          area:        selectedArea || null,
          plan:    parseNum(row['Plan']),
          actual:  parseNum(row['Aktual']  ?? row['Actual']),
          av_in:   parseNum(row['Av-In']   ?? row['AvIn']   ?? row['AV IN']),
          ec:      parseNum(row['EC']),
          av_out:  parseNum(row['Av-Out']  ?? row['AvOut']  ?? row['AV OUT']),
        });
      }

      log('Step 5: ✓ Parse selesai', {
        totalRaw: rawRows.length, validRecords: records.length,
        skippedRows, skipReasons, parseMs: Date.now() - parseStart,
      });

      if (!records.length) {
        return NextResponse.json({
          success: false,
          error: 'Tidak ada data valid. Pastikan header kolom sesuai: Minggu, Produk, Outlet, Plan, Aktual, Av-In, EC, Av-Out',
        }, { status: 400 });
      }

      log('Step 6: Memulai transaksi database...');
      const dbStart = Date.now();
      const client  = await pool.connect();

      try {
        await client.query('BEGIN');

        const fileRes = await client.query(`
          INSERT INTO distribution_files
            (filename, original_name, file_size, record_count, status, uploaded_by, area)
          VALUES ($1, $2, $3, $4, 'processing', $5, $6)
          RETURNING id
        `, [
          `dist_${Date.now()}.xlsx`,
          file.name,
          file.size,
          records.length,
          session.username,
          selectedArea || null,
        ]);

        const fileId       = fileRes.rows[0].id;
        const BATCH        = 1000;
        const totalBatches = Math.ceil(records.length / BATCH);

        for (let i = 0; i < records.length; i += BATCH) {
          const batchNum = Math.floor(i / BATCH) + 1;
          const batch    = records.slice(i, i + BATCH);

          const valueStrings = batch.map((_, bi) => {
            const base = bi * 18;
            return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10},$${base+11},$${base+12},$${base+13},$${base+14},$${base+15},$${base+16},$${base+17},$${base+18})`;
          }).join(',');

          const vals = batch.flatMap(r => [
            fileId, r.week, r.week_num, r.product, r.category,
            r.customer_id, r.outlet, r.outlet_type, r.salesman,
            r.village, r.district, r.city, r.area,
            r.plan, r.actual, r.av_in, r.ec, r.av_out,
          ]);

          try {
            await client.query(`
              INSERT INTO distribution_records
                (dist_file_id, week, week_num, product, category, customer_id, outlet, outlet_type,
                 salesman, village, district, city, area, plan, actual, av_in, ec, av_out)
              VALUES ${valueStrings}
            `, vals);
          } catch (batchErr) {
            logError(`Step 6: Batch ${batchNum}/${totalBatches} gagal`, batchErr);
            throw batchErr;
          }
        }

        await client.query(
          `UPDATE distribution_files SET status = 'completed', record_count = $1 WHERE id = $2`,
          [records.length, fileId]
        );

        await client.query('COMMIT');

        log('=== UPLOAD DISTRIBUSI SELESAI ✓ ===', {
          fileId, fileName: file.name, area: selectedArea,
          recordCount: records.length,
          totalMs: `${Date.now() - uploadStart}ms`,
        });

        return NextResponse.json({
          success: true,
          data: {
            file_id:      fileId,
            filename:     file.name,
            record_count: records.length,
            area:         selectedArea,
            preview:      records.slice(0, 5),
          },
        });

      } catch (err) {
        await client.query('ROLLBACK');
        logError('Step 6: ROLLBACK', err);
        throw err;
      } finally {
        client.release();
      }

    } catch (err) {
      logError(`=== UPLOAD GAGAL (${Date.now() - uploadStart}ms) ===`, err);
      return NextResponse.json(
        { success: false, error: 'Gagal memproses file distribusi' },
        { status: 500 }
      );
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════════════════════
export async function DELETE(request: NextRequest) {
  return withAuth(request, 'delete_file', async () => {
    try {
      const { searchParams } = new URL(request.url);
      const fileId = searchParams.get('id');

      if (!fileId) {
        return NextResponse.json(
          { success: false, error: 'ID file diperlukan' },
          { status: 400 }
        );
      }

      log('DELETE distribusi file', { fileId });

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const delRecords = await client.query(
          'DELETE FROM distribution_records WHERE dist_file_id = $1',
          [fileId]
        );

        const res = await client.query(
          'DELETE FROM distribution_files WHERE id = $1 RETURNING original_name',
          [fileId]
        );

        await client.query('COMMIT');

        if (!res.rows.length) {
          return NextResponse.json(
            { success: false, error: 'File tidak ditemukan' },
            { status: 404 }
          );
        }

        log('DELETE selesai', {
          fileId,
          deletedFile:    res.rows[0].original_name,
          deletedRecords: delRecords.rowCount,
        });

        return NextResponse.json({
          success: true,
          deleted: res.rows[0].original_name,
        });

      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

    } catch (err) {
      logError('DELETE distribusi gagal', err);
      return NextResponse.json(
        { success: false, error: 'Gagal menghapus file' },
        { status: 500 }
      );
    }
  });
}
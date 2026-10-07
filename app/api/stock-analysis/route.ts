/**
 * GET /api/stock-analysis?area=<area_id>&date=YYYY-MM-DD
 *
 * - area kosong  -> semua area yang boleh diakses user
 * - date kosong  -> tanggal laporan terbaru
 * - Untuk tiap area diambil snapshot TERBARU dengan report_date <= date
 *   (area yang belum upload di tanggal itu tetap ikut dengan snapshot terakhirnya;
 *    tiap baris membawa report_date supaya UI bisa menandai data lama).
 */
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { withAuth } from '@/lib/auth/session';

// Samakan dengan permission yang dipakai /api/sales-analysis
const PERMISSION = 'view_files';

export async function GET(request: NextRequest) {
  return withAuth(request, PERMISSION, async (session) => {
    try {
      const sp = new URL(request.url).searchParams;
      const area = sp.get('area')?.trim() || '';
      const dateParam = sp.get('date')?.trim() || '';

      if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        return NextResponse.json({ success: false, error: 'Format date harus YYYY-MM-DD' }, { status: 400 });
      }

      // null = tidak dibatasi (root)
      const allowed: string[] | null = session.role === 'root' ? null : (session.allowed_areas || []);
      if (area && allowed && !allowed.includes(area)) {
        return NextResponse.json({ success: false, error: 'Anda tidak memiliki akses ke area ini' }, { status: 403 });
      }
      const scope: string[] | null = area ? [area] : allowed;

      // Tanggal laporan yang tersedia (::text supaya tidak kena konversi timezone)
      const datesRes = await pool.query(
        `SELECT DISTINCT report_date::text AS d
         FROM stock_files
         WHERE status = 'completed' AND ($1::text[] IS NULL OR area = ANY($1))
         ORDER BY d DESC
         LIMIT 120`,
        [scope]
      );
      const dates: string[] = datesRes.rows.map(r => r.d);

      if (dates.length === 0) {
        return NextResponse.json({ success: true, data: { dates: [], date: null, rows: [] } });
      }

      const date = dateParam || dates[0];

      const rowsRes = await pool.query(
        `WITH latest AS (
           SELECT DISTINCT ON (area) id, area, report_date
           FROM stock_files
           WHERE status = 'completed'
             AND report_date <= $1::date
             AND ($2::text[] IS NULL OR area = ANY($2))
           ORDER BY area, report_date DESC, created_at DESC
         )
         SELECT l.area,
                l.report_date::text        AS report_date,
                r.category, r.product_id, r.product,
                r.units_dos::float8        AS units_dos,
                r.units_bks::float8        AS units_bks,
                r.konv_dos::float8         AS konv_dos,
                r.dos_4weeks::float8       AS dos_4weeks,
                r.avg_week::float8         AS avg_week
         FROM latest l
         JOIN stock_records r ON r.file_id = l.id
         ORDER BY r.category, r.product, l.area`,
        [date, scope]
      );

      return NextResponse.json({ success: true, data: { dates, date, rows: rowsRes.rows } });
    } catch (error) {
      console.error('[api/stock-analysis]', error);
      return NextResponse.json({ success: false, error: 'Gagal mengambil data stok' }, { status: 500 });
    }
  });
}
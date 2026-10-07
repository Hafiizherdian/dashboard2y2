/**
 * GET /api/stock/files/[id]/preview -> isi stok dari satu file
 */
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { withAuth } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, 'view_files', async (session) => {
    try {
      const fileId = parseInt((await params).id, 10);
      if (isNaN(fileId)) {
        return NextResponse.json({ success: false, error: 'ID tidak valid' }, { status: 400 });
      }

      const fileRes = await pool.query(
        'SELECT id, original_name, record_count, status, area, report_date FROM stock_files WHERE id = $1',
        [fileId]
      );
      if (!fileRes.rows.length) {
        return NextResponse.json({ success: false, error: 'File tidak ditemukan di database' }, { status: 404 });
      }
      const file = fileRes.rows[0];
      if (session.role !== 'root' && !(session.allowed_areas || []).includes(file.area)) {
        return NextResponse.json({ success: false, error: 'Anda tidak memiliki akses ke file ini' }, { status: 403 });
      }

      const data = await pool.query(
        `SELECT category, product_id, product,
                units_dos, units_bks, konv_dos, dos_4weeks, avg_week, stock_level
         FROM stock_records WHERE file_id = $1 ORDER BY id ASC LIMIT 500`,
        [fileId]
      );

      return NextResponse.json({
        success: true,
        data: data.rows,
        meta: { file, shown: data.rows.length, total: file.record_count },
      });
    } catch (error) {
      console.error('[api/stock/files/preview]', error);
      return NextResponse.json({ success: false, error: 'Gagal memuat preview stok' }, { status: 500 });
    }
  });
}
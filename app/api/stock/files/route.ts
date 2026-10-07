/**
 * GET    /api/stock/files        -> daftar file stok (difilter area user)
 * DELETE /api/stock/files?id=ID  -> hapus file + record stoknya
 */
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { withAuth } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  return withAuth(request, 'view_files', async (session) => {
    try {
      const params: unknown[] = [];
      let where = '';
      if (session.role !== 'root') {
        params.push(session.allowed_areas || []);
        where = 'WHERE area = ANY($1)';
      }
      const result = await pool.query(
        `SELECT id, original_name, file_size, record_count, area, report_date,
                status, uploaded_by, created_at
         FROM stock_files ${where}
         ORDER BY report_date DESC, created_at DESC
         LIMIT 1000`,
        params
      );
      return NextResponse.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('[api/stock/files GET]', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch stock files' }, { status: 500 });
    }
  });
}

export async function DELETE(request: NextRequest) {
  return withAuth(request, 'delete_file', async (session) => {
    try {
      const id = parseInt(new URL(request.url).searchParams.get('id') || '', 10);
      if (isNaN(id)) {
        return NextResponse.json({ success: false, error: 'File ID is required' }, { status: 400 });
      }

      const found = await pool.query('SELECT area FROM stock_files WHERE id = $1', [id]);
      if (!found.rows.length) {
        return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
      }
      if (session.role !== 'root' && !(session.allowed_areas || []).includes(found.rows[0].area)) {
        return NextResponse.json({ success: false, error: 'Anda tidak memiliki akses ke file ini' }, { status: 403 });
      }

      // stock_records ikut terhapus (ON DELETE CASCADE)
      const del = await pool.query('DELETE FROM stock_files WHERE id = $1 RETURNING *', [id]);
      return NextResponse.json({ success: true, data: del.rows[0] });
    } catch (error) {
      console.error('[api/stock/files DELETE]', error);
      return NextResponse.json({ success: false, error: 'Failed to delete file' }, { status: 500 });
    }
  });
}
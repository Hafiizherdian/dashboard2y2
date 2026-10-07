/**
 * POST /api/stock/upload
 * Multipart: file (.xlsx/.xls) + area
 * Snapshot stok: upload ulang untuk area + tanggal laporan yang sama akan MENGGANTI data lama.
 */
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { pool } from '@/lib/db';
import { withAuth } from '@/lib/auth/session';
import { parseStockSheet } from '@/lib/stockParser';

export async function POST(request: NextRequest) {
  return withAuth(request, 'upload_file', async (session) => {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      let area = (formData.get('area') as string) || '';

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
      }
      if (!/\.(xlsx|xls)$/i.test(file.name)) {
        return NextResponse.json({ success: false, error: 'Hanya file .xlsx / .xls yang diterima' }, { status: 400 });
      }

      if (session.role !== 'root') {
        const userAreas = session.allowed_areas || [];
        if (!area && userAreas.length === 1) area = userAreas[0];
        if (!area || !userAreas.includes(area)) {
          return NextResponse.json(
            { success: false, error: `Anda tidak memiliki akses ke area: ${area || '-'}` },
            { status: 403 }
          );
        }
      }
      if (!area) {
        return NextResponse.json({ success: false, error: 'Area belum dipilih' }, { status: 400 });
      }

      // Parse
      const buffer = Buffer.from(await file.arrayBuffer());
      const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1, defval: null, raw: true, blankrows: false,
      });

      let parsed;
      try {
        parsed = parseStockSheet(grid);
      } catch (e) {
        return NextResponse.json(
          { success: false, error: e instanceof Error ? e.message : 'Format file tidak dikenali' },
          { status: 400 }
        );
      }
      if (parsed.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Tidak ada baris produk yang terbaca' }, { status: 400 });
      }

      // tanggal laporan dari footer "Dicetak: ..."; fallback hari ini
      const reportDate = parsed.reportDate ?? new Date().toISOString().slice(0, 10);

      // Simpan
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // ganti snapshot lama untuk area + tanggal yang sama (stock_records ikut terhapus via CASCADE)
        const replaced = await client.query(
          'DELETE FROM stock_files WHERE area = $1 AND report_date = $2',
          [area, reportDate]
        );

        const fileRes = await client.query(
          `INSERT INTO stock_files (filename, original_name, file_size, record_count, area, report_date, status, uploaded_by)
           VALUES ($1,$2,$3,$4,$5,$6,'processing',$7) RETURNING id`,
          [`stock_${Date.now()}.xlsx`, file.name, file.size, parsed.rows.length, area, reportDate, session.username ?? 'admin']
        );
        const fileId = fileRes.rows[0].id;

        for (const r of parsed.rows) {
          await client.query(
            `INSERT INTO stock_records
               (file_id, area, report_date, category, product_id, product,
                units_dos, units_bks, konv_dos, dos_4weeks, avg_week, stock_level)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [fileId, area, reportDate, r.category, r.product_id, r.product,
             r.units_dos, r.units_bks, r.konv_dos, r.dos_4weeks, r.avg_week, r.stock_level]
          );
        }

        await client.query(`UPDATE stock_files SET status='completed', updated_at=now() WHERE id=$1`, [fileId]);
        await client.query('COMMIT');

        return NextResponse.json({
          success: true,
          data: {
            file_id: fileId,
            record_count: parsed.rows.length,
            report_date: reportDate,
            area_in_file: parsed.areaName,   // untuk cek kalau salah pilih area
            replaced_files: replaced.rowCount ?? 0,
          },
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[api/stock/upload]', error);
      return NextResponse.json({ success: false, error: 'Failed to process stock upload' }, { status: 500 });
    }
  });
}
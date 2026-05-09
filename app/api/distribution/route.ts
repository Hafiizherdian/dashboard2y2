/**
 * app/api/distribution/route.ts
 *
 * API Route untuk modul Distribusi:
 *  - GET  : Mengambil data distribusi dari DB dengan berbagai filter
 *  - POST : Upload file Excel distribusi dan menyimpan ke DB
 *  - DELETE: Menghapus file distribusi beserta semua record-nya
 *
 * CATATAN PERUBAHAN (filter produk client-side):
 *  - achievementSalesman : ditambah GROUP BY product agar bisa di-reaggregate per produk di client
 *  - trend               : ditambah GROUP BY product
 *  - coverage            : ditambah GROUP BY product
 *  - coverageSalesman    : ditambah GROUP BY product
 *  - achievementProduct  : tidak berubah (sudah GROUP BY product)
 *  - achievementArea     : tidak berubah (tidak ada field product)
 *  - summary             : tidak berubah (tetap total keseluruhan)
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { withAuth } from '@/lib/auth/session';
import * as XLSX from 'xlsx';

// ─── Helper: Parse angka dari berbagai format input ───────────────────────────
function parseNum(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw !== 'string') return 0;
  const s = raw.trim().replace(/[^0-9.,\-]/g, '');
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

// ─── Helper: Parse nomor minggu dari string seperti "W1", "Minggu 1", atau angka langsung ──
function parseWeekNum(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const m = raw.match(/\d+/);
    return m ? parseInt(m[0]) : 1;
  }
  return 1;
}

// ─── Logger ──────────────────────────────────────────────────────────────────
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
// GET — Ambil data distribusi dengan filter
// ═══════════════════════════════════════════════════════════════════════════════
export async function GET(request: NextRequest) {
  return withAuth(request, 'view_files', async (session) => {
    try {
      const { searchParams } = new URL(request.url);
      const area      = searchParams.get('area') || '';
      const salesman  = searchParams.get('salesman') || '';
      const product   = searchParams.get('product') || '';
      const weekStart = parseInt(searchParams.get('weekStart') || '1');
      const weekEnd   = parseInt(searchParams.get('weekEnd') || '52');
      const city      = searchParams.get('city') || '';
      const fileId    = searchParams.get('fileId') || '';

      // ── Bangun WHERE clause ───────────────────────────────────────────────
      const params: any[] = [];
      let idx = 1;
      const conditions: string[] = ['1=1'];

      if (session.role !== 'root' && session.allowed_areas?.length > 0) {
        conditions.push(`area = ANY($${idx++})`);
        params.push(session.allowed_areas);
      } else if (area) {
        conditions.push(`area = $${idx++}`);
        params.push(area);
      }

      if (salesman) { conditions.push(`salesman ILIKE $${idx++}`); params.push(`%${salesman}%`); }
      // CATATAN: filter product di sini tetap ada untuk kebutuhan server-side filtering
      // tapi untuk client-side useMemo filter, query tidak memakai filter ini
      if (product)  { conditions.push(`product ILIKE $${idx++}`);  params.push(`%${product}%`);  }
      if (city)     { conditions.push(`city ILIKE $${idx++}`);     params.push(`%${city}%`);     }
      if (fileId)   { conditions.push(`dist_file_id = $${idx++}`); params.push(parseInt(fileId)); }

      conditions.push(`week_num BETWEEN $${idx++} AND $${idx++}`);
      params.push(weekStart, weekEnd);

      const where = conditions.join(' AND ');

      // ── Jalankan semua query secara paralel ───────────────────────────────
      const [
        achSalesmanQ,
        achProductQ,
        achAreaQ,
        trendQ,
        coverageQ,
        coverageSalesmanQ,
        summaryQ,
        filesQ,
      ] = await Promise.all([

        // Achievement per salesman × product
        // GROUP BY salesman, product → client bisa reaggregate per produk
        pool.query(`
          SELECT
            salesman,
            product,
            SUM(plan)   AS total_plan,
            SUM(actual) AS total_actual,
            SUM(av_out) AS total_av_out,
            COUNT(DISTINCT outlet) AS outlet_count,
            CASE
              WHEN SUM(plan) > 0
              THEN ROUND((SUM(av_out) / SUM(plan)) * 100, 1)
              ELSE 0
            END AS achievement_pct
          FROM distribution_records
          WHERE ${where}
          GROUP BY salesman, product
          ORDER BY achievement_pct DESC
        `, params),

        // Achievement per produk — tidak berubah
        pool.query(`
          SELECT
            product,
            category,
            SUM(plan)   AS total_plan,
            SUM(actual) AS total_actual,
            SUM(av_out) AS total_av_out,
            CASE
              WHEN SUM(plan) > 0
              THEN ROUND((SUM(av_out) / SUM(plan)) * 100, 1)
              ELSE 0
            END AS achievement_pct
          FROM distribution_records
          WHERE ${where}
          GROUP BY product, category
          ORDER BY total_av_out DESC
        `, params),

        // Achievement per area — tidak ada product field, tetap sama
        pool.query(`
          SELECT
            city,
            district,
            SUM(plan)   AS total_plan,
            SUM(actual) AS total_actual,
            SUM(av_out) AS total_av_out,
            COUNT(DISTINCT outlet) AS outlet_count,
            CASE
              WHEN SUM(plan) > 0
              THEN ROUND((SUM(av_out) / SUM(plan)) * 100, 1)
              ELSE 0
            END AS achievement_pct
          FROM distribution_records
          WHERE ${where}
          GROUP BY city, district
          ORDER BY total_av_out DESC
          LIMIT 30
        `, params),

        // Trend mingguan × product
        // GROUP BY week, week_num, product → client bisa reaggregate per produk
        pool.query(`
          SELECT
            week,
            week_num,
            product,
            SUM(plan)              AS total_plan,
            SUM(actual)            AS total_actual,
            SUM(av_in)             AS total_av_in,
            SUM(ec)                AS total_ec,
            SUM(av_out)            AS total_av_out,
            COUNT(DISTINCT outlet) AS outlet_count
          FROM distribution_records
          WHERE ${where}
          GROUP BY week, week_num, product
          ORDER BY week_num ASC, product ASC
        `, params),

        // Coverage per tipe outlet × product
        // GROUP BY outlet_type, product → client bisa reaggregate per produk
        pool.query(`
          SELECT
            outlet_type,
            product,
            SUM(plan)   AS total_plan,
            SUM(actual) AS total_actual,
            SUM(av_in)  AS total_av_in,
            SUM(ec)     AS total_ec,
            SUM(av_out) AS total_av_out,
            COUNT(DISTINCT outlet) AS outlet_count,
            CASE
              WHEN SUM(plan) > 0
              THEN ROUND((SUM(av_out) / SUM(plan)) * 100, 1)
              ELSE 0
            END AS achievement_pct
          FROM distribution_records
          WHERE ${where}
          GROUP BY outlet_type, product
          ORDER BY total_av_out DESC
        `, params),

        // Coverage salesman per minggu × product (heatmap)
        // GROUP BY salesman, week_num, week, product → client bisa reaggregate per produk
        pool.query(`
          SELECT
            salesman,
            week_num,
            week,
            product,
            SUM(plan)   AS plan,
            SUM(actual) AS actual,
            SUM(av_in)  AS av_in,
            SUM(ec)     AS ec,
            SUM(av_out) AS av_out,
            CASE
              WHEN SUM(plan) > 0
              THEN ROUND((SUM(av_out) / SUM(plan)) * 100, 1)
              ELSE 0
            END AS achievement_pct
          FROM distribution_records
          WHERE ${where}
          GROUP BY salesman, week_num, week, product
          ORDER BY salesman, week_num, product
        `, params),

        // Summary keseluruhan — tetap total, tidak per produk
        // KPI cards menampilkan total; useMemo override ini saat filter produk aktif
        pool.query(`
          SELECT
            SUM(plan)                  AS total_plan,
            SUM(actual)                AS total_actual,
            SUM(av_in)                 AS total_av_in,
            SUM(ec)                    AS total_ec,
            SUM(av_out)                AS total_av_out,
            COUNT(DISTINCT outlet)     AS total_outlets,
            COUNT(DISTINCT salesman)   AS total_salesmen,
            COUNT(DISTINCT product)    AS total_products,
            COUNT(DISTINCT customer_id) AS total_customers,
            CASE
              WHEN SUM(plan) > 0
              THEN ROUND((SUM(av_out) / SUM(plan)) * 100, 1)
              ELSE 0
            END AS overall_achievement
          FROM distribution_records
          WHERE ${where}
        `, params),

        // Daftar file upload
        pool.query(`
          SELECT id, original_name, record_count, area, created_at
          FROM distribution_files
          WHERE status = 'completed'
          ORDER BY created_at DESC
          LIMIT 50
        `),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          summary:             summaryQ.rows[0] ?? {},
          achievementSalesman: achSalesmanQ.rows,
          achievementProduct:  achProductQ.rows,
          achievementArea:     achAreaQ.rows,
          trend:               trendQ.rows,
          coverage:            coverageQ.rows,
          coverageSalesman:    coverageSalesmanQ.rows,
          files:               filesQ.rows,
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
// DELETE — Hapus file distribusi beserta semua record-nya
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
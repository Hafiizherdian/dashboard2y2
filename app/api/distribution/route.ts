/**
 * app/api/distribution/route.ts
 *
 * API Route untuk modul Distribusi:
 *  - GET  : Mengambil data distribusi dari DB dengan berbagai filter
 *  - POST : Upload file Excel distribusi dan menyimpan ke DB
 *  - DELETE: Menghapus file distribusi beserta semua record-nya
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { withAuth } from '@/lib/auth/session';
import * as XLSX from 'xlsx';

// ─── Helper: Parse angka dari berbagai format input ───────────────────────────
// Menangani: number, string dengan koma/titik sebagai desimal, string dengan karakter non-numerik
function parseNum(raw: unknown): number {
  // Jika sudah number dan finite, langsung return
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  // Jika bukan string, return 0
  if (typeof raw !== 'string') return 0;
  // Bersihkan karakter non-numerik kecuali titik, koma, dan minus
  const s = raw.trim().replace(/[^0-9.,\-]/g, '');
  // Ganti koma dengan titik untuk parseFloat (format Indonesia: 1.000,50 → 1000.50)
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

// ─── Helper: Parse nomor minggu dari string seperti "W1", "Minggu 1", atau angka langsung ──
function parseWeekNum(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    // Ambil digit pertama yang ditemukan di string
    const m = raw.match(/\d+/);
    return m ? parseInt(m[0]) : 1;
  }
  return 1;
}

// ─── Logger: Structured console log untuk monitoring upload ──────────────────
function log(step: string, detail?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  if (detail) {
    console.log(`[dist-upload] [${ts}] ${step}`, JSON.stringify(detail, null, 2));
  } else {
    console.log(`[dist-upload] [${ts}] ${step}`);
  }
}

// ─── Logger: Error log dengan context tambahan ───────────────────────────────
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
      // ── 1. Parse query parameters dari URL ───────────────────────────────
      const { searchParams } = new URL(request.url);
      const area      = searchParams.get('area') || '';
      const salesman  = searchParams.get('salesman') || '';
      const product   = searchParams.get('product') || '';
      const weekStart = parseInt(searchParams.get('weekStart') || '1');
      const weekEnd   = parseInt(searchParams.get('weekEnd') || '52');
      const city      = searchParams.get('city') || '';
      const fileId    = searchParams.get('fileId') || '';

      // ── 2. Bangun WHERE clause secara dinamis berdasarkan filter aktif ───
      const params: any[] = [];
      let idx = 1;
      const conditions: string[] = ['1=1']; // Base condition agar JOIN mudah

      // Role-based area restriction:
      // - Non-root hanya bisa lihat area yang diizinkan dari session
      // - Root bisa filter area bebas via query param
      if (session.role !== 'root' && session.allowed_areas?.length > 0) {
        conditions.push(`area = ANY($${idx++})`);
        params.push(session.allowed_areas);
      } else if (area) {
        conditions.push(`area = $${idx++}`);
        params.push(area);
      }

      // Filter opsional: salesman, product, city menggunakan ILIKE (case-insensitive)
      if (salesman) { conditions.push(`salesman ILIKE $${idx++}`); params.push(`%${salesman}%`); }
      if (product)  { conditions.push(`product ILIKE $${idx++}`);  params.push(`%${product}%`);  }
      if (city)     { conditions.push(`city ILIKE $${idx++}`);     params.push(`%${city}%`);     }

      // Filter by specific upload file ID (untuk isolasi data per upload)
      if (fileId)   { conditions.push(`dist_file_id = $${idx++}`); params.push(parseInt(fileId)); }

      // Filter rentang minggu — selalu aktif, default W1–W52
      conditions.push(`week_num BETWEEN $${idx++} AND $${idx++}`);
      params.push(weekStart, weekEnd);

      const where = conditions.join(' AND ');

      // ── 3. Jalankan semua query secara paralel untuk efisiensi ────────────

      // Achievement per salesman — diurutkan dari achievement tertinggi
      const achSalesmanQ = await pool.query(`
        SELECT
          salesman,
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
        GROUP BY salesman
        ORDER BY achievement_pct DESC
      `, params);

      // Achievement per produk — diurutkan dari av_out tertinggi
      const achProductQ = await pool.query(`
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
      `, params);

      // Achievement per area (kota + kecamatan) — dibatasi 30 baris teratas
      const achAreaQ = await pool.query(`
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
      `, params);

      // Trend mingguan — diurutkan berdasarkan nomor minggu ascending
      const trendQ = await pool.query(`
        SELECT
          week,
          week_num,
          SUM(plan)              AS total_plan,
          SUM(actual)            AS total_actual,
          SUM(av_in)             AS total_av_in,
          SUM(ec)                AS total_ec,
          SUM(av_out)            AS total_av_out,
          COUNT(DISTINCT outlet) AS outlet_count,
          COUNT(DISTINCT salesman) AS salesman_count
        FROM distribution_records
        WHERE ${where}
        GROUP BY week, week_num
        ORDER BY week_num ASC
      `, params);

      // Coverage per tipe outlet — diurutkan dari av_out tertinggi
      const coverageQ = await pool.query(`
        SELECT
          outlet_type,
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
        GROUP BY outlet_type
        ORDER BY total_av_out DESC
      `, params);

      // Coverage per salesman per minggu — untuk heatmap di frontend
      const coverageSalesmanQ = await pool.query(`
        SELECT
          salesman,
          week_num,
          week,
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
        GROUP BY salesman, week_num, week
        ORDER BY salesman, week_num
      `, params);

      // Summary keseluruhan — satu baris agregasi total
      const summaryQ = await pool.query(`
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
      `, params);

      // Daftar file yang sudah berhasil diupload — untuk UI manajemen file
      const filesQ = await pool.query(`
        SELECT id, original_name, record_count, area, created_at
        FROM distribution_files
        WHERE status = 'completed'
        ORDER BY created_at DESC
        LIMIT 50
      `);

      // ── 4. Return semua data sebagai JSON ────────────────────────────────
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

      // ══════════════════════════════════════════════════════════════════════
      // STEP 1: Parse form data — ambil file dan area dari request
      // ══════════════════════════════════════════════════════════════════════
      log('Step 1: Membaca form data...');
      const formData   = await request.formData();
      const file       = formData.get('file') as File;
      let selectedArea = formData.get('area') as string || '';

      // Validasi: file wajib ada
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

      // ══════════════════════════════════════════════════════════════════════
      // STEP 2: Resolve area
      // Jika user bukan root dan area tidak disertakan, coba auto-assign
      // dari allowed_areas session (hanya berlaku jika tepat 1 area)
      // ══════════════════════════════════════════════════════════════════════
      log('Step 2: Menentukan area...');
      if (session.role !== 'root' && !selectedArea) {
        const userAreas = session.allowed_areas || [];
        if (userAreas.length === 1) {
          selectedArea = userAreas[0];
          log('Step 2: Auto-assign area dari session', { area: selectedArea, available: userAreas });
        } else {
          log('Step 2: ⚠ User memiliki multiple area, area tidak di-assign otomatis', { available: userAreas });
        }
      } else {
        log('Step 2: Area dari request', { area: selectedArea });
      }

      // ══════════════════════════════════════════════════════════════════════
      // STEP 3: Baca dan parse file Excel menggunakan SheetJS (xlsx)
      // ══════════════════════════════════════════════════════════════════════
      log('Step 3: Membaca file Excel...');
      const readStart = Date.now();

      // Convert File object ke ArrayBuffer lalu ke Buffer Node.js
      const bytes  = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      let workbook: XLSX.WorkBook;
      try {
        // cellDates: true → konversi cell tanggal Excel ke JS Date otomatis
        workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      } catch (xlsxErr) {
        logError('Step 3: Gagal parse Excel', xlsxErr, { file: file.name });
        return NextResponse.json(
          { success: false, error: 'File tidak bisa dibaca. Pastikan format .xlsx, .xls, atau .csv' },
          { status: 400 }
        );
      }

      const sheetNames = workbook.SheetNames;
      log('Step 3: ✓ Excel terbaca', {
        sheets:      sheetNames,
        activeSheet: sheetNames[0],
        readMs:      Date.now() - readStart,
      });

      // Ambil sheet pertama sebagai data utama
      const sheet   = workbook.Sheets[sheetNames[0]];
      // defval: '' → cell kosong diisi string kosong (bukan undefined)
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      log('Step 3: Sheet di-parse', { totalRawRows: rawRows.length });

      // Validasi: sheet tidak boleh kosong
      if (!rawRows.length) {
        log('Step 3: ❌ Sheet kosong');
        return NextResponse.json(
          { success: false, error: 'File kosong atau format tidak dikenali' },
          { status: 400 }
        );
      }

      // ══════════════════════════════════════════════════════════════════════
      // STEP 4: Validasi kolom — cek header yang terdeteksi
      // ══════════════════════════════════════════════════════════════════════
      const sampleRow       = rawRows[0] as Record<string, unknown>;
      const detectedColumns = Object.keys(sampleRow);

      log('Step 4: Kolom yang terdeteksi', {
        columns:      detectedColumns,
        totalColumns: detectedColumns.length,
        // Preview 8 kolom pertama dengan value yang dipotong 30 karakter
        sampleRow: Object.fromEntries(
          Object.entries(sampleRow).slice(0, 8).map(([k, v]) => [k, String(v).slice(0, 30)])
        ),
      });

      // Cek kolom wajib — hanya 'Plan' yang truly required untuk kalkulasi achievement
      const REQUIRED = ['Plan'];
      const missing  = REQUIRED.filter(
        col => !detectedColumns.some(c => c.toLowerCase() === col.toLowerCase())
      );
      if (missing.length > 0) {
        log('Step 4: ⚠ Kolom wajib tidak ditemukan', { missing });
        // Tidak langsung reject — mungkin kolom ada dengan nama berbeda
      }

      // ══════════════════════════════════════════════════════════════════════
      // STEP 5: Parse dan validasi setiap baris data
      // Mendukung variasi nama kolom (Bahasa Indonesia & Inggris)
      // ══════════════════════════════════════════════════════════════════════
      log('Step 5: Memproses baris data...');
      const parseStart = Date.now();
      const records: any[] = [];
      let skippedRows = 0;
      const skipReasons: Record<string, number> = {};

      for (const row of rawRows as any[]) {
        // Mapping kolom — mendukung nama kolom bahasa Indonesia dan Inggris
        const weekRaw = row['Minggu']       || row['Week']     || '';
        const product = row['Produk']       || row['Product']  || '';
        const outlet  = row['Outlet']       || row['Customer'] || row['Nama Outlet'] || '';

        // Skip baris jika tidak ada identitas produk DAN outlet
        // (baris judul, total, atau baris kosong di Excel)
        if (!product && !outlet) {
          skippedRows++;
          const reason = 'product+outlet kosong';
          skipReasons[reason] = (skipReasons[reason] ?? 0) + 1;
          continue;
        }

        // Parse nomor minggu dari string (misal "W1" → 1, "Minggu 5" → 5)
        const weekNum = parseWeekNum(weekRaw);

        // Buat record yang siap diinsert ke DB
        records.push({
          // Identitas minggu
          week:        weekRaw.toString().trim() || `W${weekNum}`,
          week_num:    weekNum,

          // Identitas produk
          product:     product.toString().trim(),
          category:    (row['Kategori Produk'] || row['Category'] || '').toString().trim(),

          // Identitas outlet/customer
          customer_id: (row['Customer ID'] || row['No. Customer'] || '').toString().trim(),
          outlet:      outlet.toString().trim(),
          outlet_type: (row['Tipe Outlet'] || row['Outlet Type'] || '').toString().trim(),

          // Identitas salesman
          salesman:    (row['Salesman'] || '').toString().trim(),

          // Lokasi geografis
          village:     (row['Desa']      || row['Village']  || '').toString().trim(),
          district:    (row['Kecamatan'] || row['District'] || '').toString().trim(),
          city:        (row['Kota']      || row['City']     || '').toString().trim(),
          area:        selectedArea || null,

          // Metrik distribusi — semua diparse ke number
          // parseNum menangani: number, string dengan koma/titik, string dengan simbol
          plan:    parseNum(row['Plan']),
          actual:  parseNum(row['Aktual']  ?? row['Actual']),
          av_in:   parseNum(row['Av-In']   ?? row['AvIn']   ?? row['AV IN']),
          ec:      parseNum(row['EC']),
          // PENTING: av_out diambil langsung dari kolom Excel
          // Tidak dihitung ulang dari av_in/ec — nilai dari file adalah yang final
          av_out:  parseNum(row['Av-Out']  ?? row['AvOut']  ?? row['AV OUT']),
        });
      }

      log('Step 5: ✓ Parse selesai', {
        totalRaw:     rawRows.length,
        validRecords: records.length,
        skippedRows,
        skipReasons,
        parseMs:      Date.now() - parseStart,
      });

      // Log statistik ringkas dari data yang valid
      if (records.length > 0) {
        const weeks       = [...new Set(records.map(r => r.week))].sort();
        const salesmen    = [...new Set(records.map(r => r.salesman).filter(Boolean))];
        const products    = [...new Set(records.map(r => r.product).filter(Boolean))];
        const cities      = [...new Set(records.map(r => r.city).filter(Boolean))];
        const outletTypes = [...new Set(records.map(r => r.outlet_type).filter(Boolean))];

        const totalPlan   = records.reduce((s, r) => s + r.plan, 0);
        const totalActual = records.reduce((s, r) => s + r.actual, 0);
        const totalAvOut  = records.reduce((s, r) => s + r.av_out, 0);

        log('Step 5: Statistik data', {
          weeks:       `${weeks.length} minggu (${weeks[0]} - ${weeks[weeks.length - 1]})`,
          salesmen:    `${salesmen.length} salesman`,
          products:    `${products.length} produk`,
          cities:      `${cities.length} kota`,
          outletTypes: outletTypes,
          totalPlan:   totalPlan.toFixed(0),
          totalActual: totalActual.toFixed(0),
          totalAvOut:  totalAvOut.toFixed(0),
          achievement: totalPlan > 0
            ? `${((totalAvOut / totalPlan) * 100).toFixed(1)}%`
            : 'N/A',
        });
      }

      // Validasi: harus ada minimal 1 record valid setelah parsing
      if (!records.length) {
        log('Step 5: ❌ Tidak ada record valid');
        return NextResponse.json({
          success: false,
          error: [
            'Tidak ada data valid.',
            'Pastikan header kolom sesuai:',
            'Minggu, Produk, Outlet, Plan, Aktual, Av-In, EC, Av-Out',
          ].join(' '),
        }, { status: 400 });
      }

      // ══════════════════════════════════════════════════════════════════════
      // STEP 6: Simpan ke database dalam satu transaksi atomik
      //
      // Alur:
      // 1. BEGIN transaction
      // 2. Insert record ke distribution_files (status: 'processing')
      // 3. Batch INSERT semua record ke distribution_records
      //    → ec dan av_out langsung disimpan dari data Excel (tidak ada UPDATE)
      // 4. Update status distribution_files menjadi 'completed'
      // 5. COMMIT — semua berhasil
      //
      // Jika ada error di mana saja: ROLLBACK — tidak ada data yang tersimpan
      // ══════════════════════════════════════════════════════════════════════
      log('Step 6: Memulai transaksi database...');
      const dbStart = Date.now();
      const client  = await pool.connect();

      try {
        await client.query('BEGIN');
        log('Step 6: BEGIN transaction');

        // ── 6a. Insert metadata file ke distribution_files ─────────────────
        // Status awal 'processing' — diupdate ke 'completed' setelah semua record berhasil
        const fileRes = await client.query(`
          INSERT INTO distribution_files
            (filename, original_name, file_size, record_count, status, uploaded_by, area)
          VALUES ($1, $2, $3, $4, 'processing', $5, $6)
          RETURNING id
        `, [
          `dist_${Date.now()}.xlsx`, // Nama file internal unik berdasarkan timestamp
          file.name,                 // Nama asli dari user
          file.size,
          records.length,
          session.username,
          selectedArea || null,
        ]);

        const fileId = fileRes.rows[0].id;
        log('Step 6: ✓ File record dibuat', { fileId, status: 'processing' });

        // ── 6b. Batch INSERT semua record distribusi ───────────────────────
        // Dibagi per BATCH (1000) untuk menghindari query terlalu besar
        // dan menjaga performa memory di sisi Node.js
        const BATCH       = 1000;
        const totalBatches = Math.ceil(records.length / BATCH);
        log('Step 6: Mulai batch insert', {
          totalRecords: records.length,
          batchSize:    BATCH,
          totalBatches,
        });

        for (let i = 0; i < records.length; i += BATCH) {
          const batchNum = Math.floor(i / BATCH) + 1;
          const batch    = records.slice(i, i + BATCH);

          // Bangun placeholder VALUES ($1,$2,...,$18),($19,$20,...,$36),...
          // Setiap record memiliki 18 field → parameter di-offset per record
          const valueStrings = batch.map((_, bi) => {
            const base = bi * 18;
            return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10},$${base+11},$${base+12},$${base+13},$${base+14},$${base+15},$${base+16},$${base+17},$${base+18})`;
          }).join(',');

          // Flatten semua nilai record ke satu array parameter
          // PENTING: ec (idx 17) dan av_out (idx 18) langsung dari data Excel
          // Tidak ada UPDATE terpisah — nilai INSERT adalah nilai final
          const vals = batch.flatMap(r => [
            fileId,       // $1  dist_file_id
            r.week,       // $2  week label (e.g. "W1")
            r.week_num,   // $3  week number (integer)
            r.product,    // $4
            r.category,   // $5
            r.customer_id,// $6
            r.outlet,     // $7
            r.outlet_type,// $8
            r.salesman,   // $9
            r.village,    // $10
            r.district,   // $11
            r.city,       // $12
            r.area,       // $13
            r.plan,       // $14
            r.actual,     // $15
            r.av_in,      // $16
            r.ec,         // $17 — diambil langsung dari Excel, tidak diupdate lagi
            r.av_out,     // $18 — diambil langsung dari Excel, tidak diupdate lagi
          ]);

          try {
            await client.query(`
              INSERT INTO distribution_records
                (dist_file_id, week, week_num, product, category, customer_id, outlet, outlet_type,
                 salesman, village, district, city, area, plan, actual, av_in, ec, av_out)
              VALUES ${valueStrings}
            `, vals);
          } catch (batchErr) {
            // Log detail batch yang gagal untuk debugging
            logError(`Step 6: Batch ${batchNum}/${totalBatches} INSERT gagal`, batchErr, {
              batchStart:   i,
              batchEnd:     i + batch.length,
              sampleRecord: {
                product: batch[0]?.product,
                outlet:  batch[0]?.outlet,
                week:    batch[0]?.week,
              },
            });
            // Re-throw agar ditangkap oleh outer try-catch → trigger ROLLBACK
            throw batchErr;
          }

          // Log progress setiap 5 batch atau di batch terakhir
          if (batchNum % 5 === 0 || batchNum === totalBatches) {
            const pct = Math.round((batchNum / totalBatches) * 100);
            log(`Step 6: Progress batch ${batchNum}/${totalBatches} (${pct}%)`, {
              recordsInserted: Math.min(i + BATCH, records.length),
              totalRecords:    records.length,
            });
          }
        }

        // ── 6c. Update status file ke 'completed' setelah semua batch berhasil
        await client.query(
          `UPDATE distribution_files SET status = 'completed', record_count = $1 WHERE id = $2`,
          [records.length, fileId]
        );
        log('Step 6: ✓ Status file diupdate ke completed');

        // ── 6d. COMMIT — semua operasi berhasil, data tersimpan permanen
        await client.query('COMMIT');

        const dbMs    = Date.now() - dbStart;
        const totalMs = Date.now() - uploadStart;

        log('=== UPLOAD DISTRIBUSI SELESAI ✓ ===', {
          fileId,
          fileName:    file.name,
          area:        selectedArea,
          recordCount: records.length,
          dbMs:        `${dbMs}ms`,
          totalMs:     `${totalMs}ms`,
          uploadedBy:  session.username,
        });

        // Return response sukses dengan preview 5 record pertama
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
        // Jika ada error di mana saja dalam transaksi → ROLLBACK semua perubahan
        // Sehingga tidak ada data partial yang tersimpan di DB
        await client.query('ROLLBACK');
        logError('Step 6: ROLLBACK — transaksi dibatalkan', err);
        throw err; // Re-throw agar ditangkap outer catch → return 500
      } finally {
        // Selalu release connection kembali ke pool, baik sukses maupun error
        client.release();
        log('Step 6: Connection released');
      }

    } catch (err) {
      const totalMs = Date.now() - uploadStart;
      logError(`=== UPLOAD DISTRIBUSI GAGAL (${totalMs}ms) ===`, err);
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
      // ── 1. Ambil ID file dari query parameter ────────────────────────────
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

        // ── 2. Hapus semua record distribusi yang terkait dengan file ini ──
        // Dilakukan sebelum menghapus file metadata karena ada foreign key constraint
        const delRecords = await client.query(
          'DELETE FROM distribution_records WHERE dist_file_id = $1',
          [fileId]
        );

        // ── 3. Hapus metadata file dari distribution_files ─────────────────
        // RETURNING original_name untuk konfirmasi di response
        const res = await client.query(
          'DELETE FROM distribution_files WHERE id = $1 RETURNING original_name',
          [fileId]
        );

        await client.query('COMMIT');

        // Jika tidak ada file yang dihapus, berarti ID tidak ditemukan
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
        // ROLLBACK jika salah satu DELETE gagal (konsistensi data terjaga)
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
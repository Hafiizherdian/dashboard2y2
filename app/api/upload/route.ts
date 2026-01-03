/**
 * API route untuk upload file Excel/CSV
 * Endpoint: POST /api/upload
 * Multipart form data dengan file
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import csv from 'csv-parser';
import { createReadStream } from 'fs';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const selectedArea = formData.get('area') as string;
    
    console.log('Upload request received:', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      selectedArea: selectedArea
    });
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Memvalidasi tipe file
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    console.log('File type validation:', {
      fileType: file.type,
      allowedTypes,
      isValid: allowedTypes.includes(file.type)
    });

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid file type: ${file.type}. Only Excel and CSV files are allowed` },
        { status: 400 }
      );
    }

    // Create temp directory if it doesn't exist
    const tempDir = join(process.cwd(), 'temp');
    try {
      await mkdir(tempDir, { recursive: true });
    } catch (error) {
      // Directory already exists or created
    }

    // Save file temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempPath = join(tempDir, file.name);
    
    await writeFile(tempPath, buffer);

    try {
      let data: any[] = [];

      // Memproses file berdasarkan tipe
      if (file.type === 'text/csv') {
        console.log('Processing CSV file...');
        data = await processCSVFile(tempPath);
      } else {
        console.log('Processing Excel file...');
        data = await processExcelFile(buffer);
      }

      console.log('File processed successfully:', {
        totalRows: data.length,
        sampleRow: data[0]
      });

      // Data di proses dan di validasi
      const processedData = processSalesData(data, selectedArea);
      
      console.log('Data validation completed:', {
        totalRows: data.length,
        validRows: processedData.length,
        invalidRows: data.length - processedData.length
      });
      
      if (processedData.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Data tidak valid. Cek kembali kolom yang diperlukan: Grand Total, Minggu, Tanggal, Produk, Customer, Omzet (Nett)' },
          { status: 400 }
        );
      }

      // Menyimpan ke database
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        // Menyimpan record file
        const fileQuery = `
          INSERT INTO uploaded_files (
            filename, original_name, file_size, record_count, total_omzet, 
            status, uploaded_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `;

        const totalOmzet = processedData.reduce((sum, record) => sum + record.omzet, 0);
        
        const fileResult = await client.query(fileQuery, [
          `upload_${Date.now()}.xlsx`,
          file.name,
          file.size,
          processedData.length,
          totalOmzet,
          'processing',
          'admin' // TODO: Get from auth
        ]);

        const fileId = fileResult.rows[0].id;

        // Menyimpan record penjualan
        const salesQuery = `
          INSERT INTO sales_records (
            file_id, grand_total, week, date, product, category, customer_no, customer,
            customer_type, salesman, village, district, city, area, units_bks, units_slop,
            units_bal, units_dos, omzet
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        `;

        for (const record of processedData) {
          await client.query(salesQuery, [
            fileId,
            record.grand_total,
            record.week,
            record.date,
            record.product,
            record.category,
            record.customer_no,
            record.customer,
            record.customer_type,
            record.salesman,
            record.village,
            record.district,
            record.city,
            record.area,
            record.units_bks,
            record.units_slop,
            record.units_bal,
            record.units_dos,
            record.omzet
          ]);
        }

        // Update file status ke selesai
        await client.query(
          'UPDATE uploaded_files SET status = $1 WHERE id = $2',
          ['completed', fileId]
        );

        await client.query('COMMIT');

        return NextResponse.json({
          success: true,
          data: {
            file_id: fileId,
            filename: file.name,
            record_count: processedData.length,
            total_omzet: totalOmzet,
            preview: processedData.slice(0, 5) // Mengembalikan 5 records awal sebagai preview
          }
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } finally {
      // Clean up temp file
      try {
        await unlink(tempPath);
      } catch (error) {
        // File might not exist, ignore error
      }
    }

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process file upload' },
      { status: 500 }
    );
  }
}

async function processExcelFile(buffer: Buffer): Promise<any[]> {
  console.log('Memulai proses Excel dengan xlsx library dari buffer...');
  
  try {
    // membaca Excel file langsung dari buffer (no file path issues)
    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: true,
      cellNF: false,
      cellText: false
    });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Convert ke JSON with options (object-based like CSV)
    const data = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      blankrows: false
    });
    
    console.log(`Excel processing completed: ${data.length} rows`);
    return data;
    
  } catch (error) {
    console.error('Error processing Excel file:', error);
    throw new Error(`Gagal untuk process Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function processCSVFile(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    
    createReadStream(filePath)
      .pipe(csv()) // Let csv-parser handle quoted fields automatically
      .on('data', (data) => {
        // Skip empty rows
        if (!data || Object.keys(data).length === 0) {
          return;
        }

        // Skip Grand Total row
        if (data['Grand Total'] !== undefined && Object.keys(data).length === 1) {
          return;
        }

        results.push(data);
        
        // Log beberapa row awal untuk debugging
        if (results.length <= 2) {
          console.log(`Row ${results.length}:`, data);
        }
      })
      .on('end', () => {
        console.log(`CSV processed: ${results.length} data rows found`);
        resolve(results);
      })
      .on('error', (error) => reject(error));
  });
}

const INDONESIAN_MONTH_TRANSLATIONS: Record<string, string> = {
  januari: 'january', jan: 'jan',
  februari: 'february', feb: 'feb',
  maret: 'march', mar: 'mar',
  april: 'april', apr: 'apr',
  mei: 'may',
  juni: 'june', jun: 'jun',
  juli: 'july', jul: 'jul',
  agustus: 'august', agu: 'aug', ags: 'aug', aug: 'aug',
  september: 'september', sep: 'sep', sept: 'sep',
  oktober: 'october', okt: 'oct', oct: 'oct',
  november: 'november', nov: 'nov',
  desember: 'december', des: 'dec', dec: 'dec'
};

const INDONESIAN_DAY_PREFIX = /^(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu)\s*,\s*/i;
const MONTH_TRANSLATION_REGEX = new RegExp(`\\b(${Object.keys(INDONESIAN_MONTH_TRANSLATIONS).join('|')})\\b`, 'gi');

function parseSalesDate(rawValue: string | Date): Date | null {
  if (!rawValue) {
    return null;
  }

  // Handle Date objects dari Excel
  if (rawValue instanceof Date) {
    return rawValue;
  }

  // Handle string dates dari CSV
  if (typeof rawValue !== 'string') {
    return null;
  }

  let normalized = rawValue.replace(/^"|"$/g, '').trim();
  if (!normalized) {
    return null;
  }

  // Hapus format hari dalam bahasa Indonesia dengan prefix seperti "Kamis,"
  normalized = normalized.replace(INDONESIAN_DAY_PREFIX, '').trim();
  normalized = normalized.replace(/\s+/g, ' ');

  // Menterjemahkan bulan ke bahasa Inggris
  normalized = normalized.replace(MONTH_TRANSLATION_REGEX, (match) => {
    const translated = INDONESIAN_MONTH_TRANSLATIONS[match.toLowerCase()];
    return translated ?? match;
  });

  let parsed = new Date(normalized);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // Try DD/MM/YYYY or DD-MM-YYYY formats
  const dmyMatch = normalized.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (dmyMatch) {
    const [, dayStr, monthStr, yearStr] = dmyMatch;
    const year = parseInt(yearStr.length === 2 ? `20${yearStr}` : yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    parsed = new Date(year, month, day);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  // Try YYYY/MM/DD or YYYY-MM-DD formats
  const ymdMatch = normalized.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (ymdMatch) {
    const [, yearStr, monthStr, dayStr] = ymdMatch;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    parsed = new Date(year, month, day);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function parseNumericValue(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }

  if (typeof raw !== 'string') {
    return 0;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return 0;
  }

  // untuk unit values, kita perlu untuk memisahkan desimal dengan benar
  // Format: 1.234,56 atau 1,234.56
  // Contoh: 1.234,56 -> 1234.56, 1,234.56 -> 1234.56
  // Kita akan mendeteksi format berdasarkan penggunaan titik dan koma
  // Jika ada titik dan koma, kita asumsikan titik adalah pemisah ribuan dan koma adalah desimal
  // Jika hanya ada satu tanda baca, kita asumsikan itu adalah desimal
  // Jika tidak ada tanda baca sama sekali, kita asumsikan format English (desimal dengan titik)
  const simpleDecimal = trimmed.match(/^[\d.]+$/);
  if (simpleDecimal) {
    const parsed = parseFloat(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }


  const sanitized = trimmed.replace(/[^0-9.,\-]/g, '');
  const negative = sanitized.includes('-');
  const unsigned = sanitized.replace(/-/g, '');

  const hasComma = unsigned.includes(',');
  const hasDot = unsigned.includes('.');

  let normalized: string;

  if (hasComma && hasDot) {
    // Both separators present - determine which is decimal
    // Kita akan mendeteksi format berdasarkan posisi separator
    const lastComma = unsigned.lastIndexOf(',');
    const lastDot = unsigned.lastIndexOf('.');
    const commaAfterDot = lastComma > lastDot;
    
    if (commaAfterDot) {
      // Format: 1.234,56 (Indonesian)
      const parts = unsigned.split(',');
      const integerPart = parts[0].replace(/\./g, '') || '0';
      const fractionalPart = parts.slice(1).join('');
      normalized = fractionalPart ? `${integerPart}.${fractionalPart}` : integerPart;
    } else {
      // Format: 1,234.56 (English)
      const parts = unsigned.split('.');
      const integerPart = parts[0].replace(/,/g, '') || '0';
      const fractionalPart = parts.slice(1).join('');
      normalized = fractionalPart ? `${integerPart}.${fractionalPart}` : integerPart;
    }
  } else if (hasComma) {
    // Only comma - could be decimal (Indonesian) or thousand separator (English)
    const parts = unsigned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Likely decimal: 1234,56
      normalized = `${parts[0]}.${parts[1]}`;
    } else {
      // Likely thousand separator: 1,234,567
      normalized = parts.join('');
    }
  } else if (hasDot) {
    // Only dot - treat as decimal (most common for unit values)
    normalized = unsigned;
  } else {
    // No separators - pure integer
    normalized = unsigned;
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return negative ? -parsed : parsed;
}

function processSalesData(data: any[], selectedArea?: string): any[] {
  const processed = [];

  for (const row of data) {
    try {
      // Skip empty rows
      if (!row || Object.keys(row).length === 0) {
        continue;
      }

      // Mengambil nomor minggu dari "W1", "W2", etc.
      let week = 1;
      const weekStr = row['Minggu'] || '';
      if (weekStr.startsWith('W')) {
        week = parseInt(weekStr.substring(1)) || 1;
      } else {
        week = parseInt(weekStr) || 1;
      }

      const rawDate = row['Tanggal'] || row['Date'] || '';
      const parsedDate = parseSalesDate(rawDate);
      if (!parsedDate) {
        console.warn('Skipping row due to invalid date format:', {
          rawDate,
          product: row['Produk'] || row['Product'],
          customer: row['Customer']
        });
        continue;
      }

      // Memetakan data dari CSV ke database
      const city = row['Kota'] || row['City'] || '';
      const record = {
        grand_total: parseNumericValue(row['Grand Total']),
        week: parseNumericValue(row['Minggu']),
        date: parsedDate,
        product: row['Produk'] || row['Product'] || '',
        category: row['Kategori'] || row['Category'] || '',
        customer_no: row['No. Customer'] || row['Customer No'] || '',
        customer: row['Customer'] || '',
        customer_type: row['Tipe Customer'] || row['Customer Type'] || '',
        salesman: row['Salesman'] || '',
        village: row['Desa'] || row['Village'] || '',
        district: row['Kecamatan'] || row['District'] || '',
        city: city,
        area: selectedArea || null,
        units_bks: parseNumericValue(row['Jual (Bks Net)']),
        units_slop: parseNumericValue(row['Jual (Slop Net)']),
        units_bal: parseNumericValue(row['Jual (Bal Net)']),
        units_dos: parseNumericValue(row['Jual (Dos Net)']),
        omzet: parseNumericValue(row['Omzet (Nett)'])
      };

      // Memvalidasi field yang diperlukan
      if (record.product && record.customer && Number.isFinite(record.omzet) && !isNaN(record.week)) {
        processed.push(record);
      } else {
        // Log kegagalan memvalidasi file untuk debug
        if (record.product || record.customer || record.omzet !== 0) {
          console.log('Validation failed for row:', {
            product: record.product,
            customer: record.customer,
            omzet: record.omzet,
            week: record.week,
            area: record.area
          });
        }
      }
    } catch (error) {
      console.warn('Error processing row:', error);
      continue;
    }
  }

  console.log(`Processed ${processed.length} valid records from ${data.length} total rows`);
  if (selectedArea) {
    console.log(`All records assigned to area: ${selectedArea}`);
  }
  return processed;
}

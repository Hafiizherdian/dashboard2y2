/**
 * API route untuk upload file Excel/CSV
 * Endpoint: POST /api/upload
 * Multipart form data dengan file
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import * as ExcelJS from 'exceljs';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import csv from 'csv-parser';
import { createReadStream } from 'fs';

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dashboard_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'cakra123',
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    console.log('Upload request received:', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    });
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
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

      // Process file based on type
      if (file.type === 'text/csv') {
        console.log('Processing CSV file...');
        data = await processCSVFile(tempPath);
      } else {
        console.log('Processing Excel file...');
        data = await processExcelFile(tempPath);
      }

      console.log('File processed successfully:', {
        totalRows: data.length,
        sampleRow: data[0]
      });

      // Process and validate data
      const processedData = processSalesData(data);
      
      console.log('Data validation completed:', {
        totalRows: data.length,
        validRows: processedData.length,
        invalidRows: data.length - processedData.length
      });
      
      if (processedData.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No valid data found in file. Please check if your file has the required columns: Grand Total, Minggu, Tanggal, Produk, Customer, Omzet (Nett)' },
          { status: 400 }
        );
      }

      // Save to database
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        // Insert file record
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

        // Insert sales records
        const salesQuery = `
          INSERT INTO sales_records (
            file_id, grand_total, week, date, product, category, customer_no, customer,
            customer_type, salesman, village, district, city, units_bks, units_slop,
            units_bal, units_dos, omzet
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
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
            record.units_bks,
            record.units_slop,
            record.units_bal,
            record.units_dos,
            record.omzet
          ]);
        }

        // Update file status to completed
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

async function processExcelFile(filePath: string): Promise<any[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const worksheet = workbook.getWorksheet(1);
  const data: any[] = [];
  
  if (worksheet) {
    // Get header row
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString() || '';
    });
    
    // Process data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Skip header row
        const rowData: any = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (header) {
            rowData[header] = cell.value;
          }
        });
        data.push(rowData);
      }
    });
  }
  
  return data;
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

function parseSalesDate(rawValue: string): Date | null {
  if (!rawValue) {
    return null;
  }

  let normalized = rawValue.replace(/^"|"$/g, '').trim();
  if (!normalized) {
    return null;
  }

  // Remove Indonesian day prefix like "Kamis,"
  normalized = normalized.replace(INDONESIAN_DAY_PREFIX, '').trim();
  normalized = normalized.replace(/\s+/g, ' ');

  // Translate Indonesian month names to English equivalents
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

  const sanitized = trimmed.replace(/[^0-9.,\-]/g, '');
  const negative = sanitized.includes('-');
  const unsigned = sanitized.replace(/-/g, '');

  const hasComma = unsigned.includes(',');
  const hasDot = unsigned.includes('.');

  let decimalSeparator: string | null = null;

  if (hasComma && hasDot) {
    const lastComma = unsigned.lastIndexOf(',');
    const lastDot = unsigned.lastIndexOf('.');
    decimalSeparator = lastComma > lastDot ? ',' : '.';
  } else if (hasComma) {
    const lastSegmentLength = unsigned.split(',').pop()?.length ?? 0;
    decimalSeparator = lastSegmentLength > 0 && lastSegmentLength <= 2 ? ',' : null;
  } else if (hasDot) {
    const lastSegmentLength = unsigned.split('.').pop()?.length ?? 0;
    decimalSeparator = lastSegmentLength > 0 && lastSegmentLength <= 2 ? '.' : null;
  }

  let normalized: string;

  if (decimalSeparator) {
    const parts = unsigned.split(decimalSeparator);
    const integerPart = parts[0].replace(/[.,]/g, '') || '0';
    const fractionalPart = parts.slice(1).join('').replace(/[.,]/g, '');
    normalized = fractionalPart ? `${integerPart}.${fractionalPart}` : integerPart;
  } else {
    normalized = unsigned.replace(/[.,]/g, '') || '0';
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return negative ? -parsed : parsed;
}

function processSalesData(data: any[]): any[] {
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
      const record = {
        grand_total: row['Grand Total'] || '',
        week: week,
        date: parsedDate,
        product: row['Produk'] || row['Product'] || '',
        category: row['Kategori'] || row['Category'] || '',
        customer_no: row['No. Customer'] || row['Customer No'] || '',
        customer: row['Customer'] || '',
        customer_type: row['Tipe Customer'] || row['Customer Type'] || '',
        salesman: row['Salesman'] || '',
        village: row['Desa'] || row['Village'] || '',
        district: row['Kecamatan'] || row['District'] || '',
        city: row['Kota'] || row['City'] || '',
        units_bks: Math.round(parseNumericValue(row['Jual (Bks Net)'])),
        units_slop: Math.round(parseNumericValue(row['Jual (Slop Net)'])),
        units_bal: Math.round(parseNumericValue(row['Jual (Bal Net)'])),
        units_dos: Math.round(parseNumericValue(row['Jual (Dos Net)'])),
        omzet: parseNumericValue(row['Omzet (Nett)'])
      };

      // Validate required fields (more lenient validation)
      if (record.product && record.customer && Number.isFinite(record.omzet) && !isNaN(record.week)) {
        processed.push(record);
      } else {
        // Log validation failures for debugging
        if (record.product || record.customer || record.omzet !== 0) {
          console.log('Validation failed for row:', {
            product: record.product,
            customer: record.customer,
            omzet: record.omzet,
            week: record.week
          });
        }
      }
    } catch (error) {
      console.warn('Error processing row:', error);
      continue;
    }
  }

  console.log(`Processed ${processed.length} valid records from ${data.length} total rows`);
  return processed;
}

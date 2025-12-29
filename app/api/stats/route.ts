/**
 * API route untuk database statistics
 * GET /api/stats - Get database statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dashboard_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'cakra123',
});

export async function GET(request: NextRequest) {
  try {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM sales_records) as total_records,
        (SELECT COALESCE(SUM(omzet), 0) FROM sales_records) as total_omzet,
        (SELECT COUNT(*) FROM uploaded_files) as total_files,
        (SELECT MAX(created_at) FROM uploaded_files WHERE status = 'completed') as latest_upload
    `;

    const result = await pool.query(query);

    return NextResponse.json({
      success: true,
      data: {
        total_records: parseInt(result.rows[0].total_records) || 0,
        total_omzet: parseFloat(result.rows[0].total_omzet) || 0,
        total_files: parseInt(result.rows[0].total_files) || 0,
        latest_upload: result.rows[0].latest_upload
      }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

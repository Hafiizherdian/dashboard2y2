/**
 * API route untuk mengambil data penjualan dari Posted by
 * Endpoint: GET /api/sales
 * Query params:
 * - year: Filter by year (optional)
 * - week: Filter by week (optional)
 * - product: Filter by product (optional)
 * - limit: Limit results (default: 1000)
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
    const { searchParams } = new URL(request.url);
    const year1 = searchParams.get('year1');
    const year2 = searchParams.get('year2');
    const product = searchParams.get('product');
    const limit = parseInt(searchParams.get('limit') || '1000');

    let query = `
      SELECT * FROM sales_records 
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (year1 && year2) {
      query += ` AND EXTRACT(YEAR FROM date) IN ($${paramIndex}, $${paramIndex + 1})`
      params.push(year1, year2);
      paramIndex += 2;
    } else if (year1) {
      query += ` AND EXTRACT(YEAR FROM date) = $${paramIndex}`;
      params.push(year1);
      paramIndex++;
    }

    if (product) {
      query += ` AND product ILIKE $${paramIndex}`;
      params.push(`%${product}%`);
      paramIndex++;
    }

    query += ` ORDER BY date DESC, week DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching sales data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { records } = body;

    if (!records || !Array.isArray(records)) {
      return NextResponse.json(
        { success: false, error: 'Invalid records data' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO sales_records (
          grand_total, week, date, product, category, customer_no, customer,
          customer_type, salesman, village, district, city, units_bks, units_slop,
          units_bal, units_dos, omzet
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id
      `;

      const insertedRecords = [];
      
      for (const record of records) {
        const values = [
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
        ];

        const result = await client.query(insertQuery, values);
        insertedRecords.push(result.rows[0]);
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: {
          inserted_count: insertedRecords.length,
          records: insertedRecords
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error inserting sales data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to insert sales data' },
      { status: 500 }
    );
  }
}

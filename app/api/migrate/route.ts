import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // First, check if there are any values that might cause overflow
    const checkResult = await client.query(`
      SELECT 
        MAX(units_bks) as max_bks,
        MAX(units_slop) as max_slop,
        MAX(units_bal) as max_bal,
        MAX(units_dos) as max_dos
      FROM sales_records
    `);
    
    console.log('Current max values:', checkResult.rows[0]);
    
    // If values are too large for DECIMAL(10,3), use DECIMAL(15,3)
    const maxValues = checkResult.rows[0];
    const needsLargerPrecision = 
      (maxValues.max_bks && maxValues.max_bks > 9999999.999) ||
      (maxValues.max_slop && maxValues.max_slop > 9999999.999) ||
      (maxValues.max_bal && maxValues.max_bal > 9999999.999) ||
      (maxValues.max_dos && maxValues.max_dos > 9999999.999);
    
    const precision = needsLargerPrecision ? 'DECIMAL(15,3)' : 'DECIMAL(10,3)';
    console.log(`Using precision: ${precision}`);
    
    // Alter unit columns to support decimal values
    await client.query(`
      ALTER TABLE sales_records 
      ALTER COLUMN units_bks TYPE ${precision} USING units_bks::${precision},
      ALTER COLUMN units_slop TYPE ${precision} USING units_slop::${precision},
      ALTER COLUMN units_bal TYPE ${precision} USING units_bal::${precision},
      ALTER COLUMN units_dos TYPE ${precision} USING units_dos::${precision}
    `);
    
    await client.query('COMMIT');
    
    return NextResponse.json({ 
      success: true, 
      message: `Database migration completed successfully using ${precision}` 
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration error:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
    
  } finally {
    client.release();
  }
}

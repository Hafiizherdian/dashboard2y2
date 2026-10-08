/**
 * Query data stock level.
 * Snapshot diambil per (area, tahun, week): untuk setiap kombinasi tersebut dipakai
 * file terbaru (report_date DESC, lalu created_at DESC).
 * Pola sama dengan piutangQueries.ts.
 */

import { pool } from '../db';
import { StockRecord } from '@/types/sales';
import { FetchFilters } from './types';

export async function fetchStockData(filters?: FetchFilters): Promise<StockRecord[]> {
  const conditions: string[] = [];
  const values: any[] = [];

  if (filters?.area && filters.area.trim().length > 0) {
    values.push(filters.area.trim());
    conditions.push(`r.area = $${values.length}`);
  } else if (filters?.allowedAreas !== undefined) {
    // [] = user tanpa area -> tidak boleh lihat apa pun (undefined = root, tanpa batasan)
    if (filters.allowedAreas.length === 0) return [];
    values.push(filters.allowedAreas);
    conditions.push(`r.area = ANY($${values.length})`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      r.area,
      r.report_date::text          AS "reportDate",
      latest.report_year           AS "reportYear",
      latest.report_week           AS "reportWeek",
      COALESCE(r.category, '')     AS category,
      r.product_id                 AS "productId",
      r.product,
      r.units_dos::float8          AS "unitsDos",
      r.units_bks::float8          AS "unitsBks",
      r.konv_dos::float8           AS "konvDos",
      r.dos_4weeks::float8         AS "dos4Weeks",
      r.avg_week::float8           AS "avgWeek"
    FROM stock_records r
    JOIN (
      -- snapshot paling baru untuk setiap area + tahun + week
      SELECT DISTINCT ON (area, report_year, report_week)
             id, report_year, report_week
      FROM stock_files
      WHERE status = 'completed'
      ORDER BY area, report_year, report_week, report_date DESC, created_at DESC
    ) latest ON r.file_id = latest.id
    ${where}
    ORDER BY r.category, r.product, r.area
  `;

  const client = await pool.connect();
  try {
    const result = await client.query(sql, values);
    return result.rows.map((r: any): StockRecord => ({
      area:       r.area,
      reportDate: r.reportDate,
      reportYear: Number(r.reportYear) || 0,
      reportWeek: Number(r.reportWeek) || 0,
      category:   r.category ?? '',
      productId:  r.productId ?? null,
      product:    r.product,
      unitsDos:   Number(r.unitsDos)  || 0,
      unitsBks:   Number(r.unitsBks)  || 0,
      konvDos:    Number(r.konvDos)   || 0,
      dos4Weeks:  Number(r.dos4Weeks) || 0,
      avgWeek:    Number(r.avgWeek)   || 0,
    }));
  } finally {
    client.release();
  }
}
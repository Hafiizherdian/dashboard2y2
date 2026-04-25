/**
 * Database utilities untuk dashboard
 * Fungsi untuk fetch dan process data dari PostgreSQL
 */

import { pool } from './db';
import {
  SalesData, WeeklySales, QuarterlyData, WeekComparison,
  L4WC4WData, YearOnYearGrowth, ComparisonWeeks,
  WeekComparisonProductDetail, WeeklyTrendData, OutletSalesData,
  ProductL4WC1WData, WeeklyBreakdown, MonthlyBreakdown, QuarterlyProductDetail,
} from '@/types/sales';
import { getProductCategory } from './productCategories';

const OMZET_SCALE = 1;

function getOmzetValue(record: any): number {
  if (!record) return 0;
  if (typeof record.omzetValue === 'number') return record.omzetValue;
  const raw = record.omzet;
  const numeric = typeof raw === 'number' ? raw : parseFloat(raw ?? '0');
  const normalized = Number.isFinite(numeric) ? numeric * OMZET_SCALE : 0;
  record.omzetValue = normalized;
  return normalized;
}

function getUnitValue(record: any, unitType: string): number {
  switch (unitType) {
    case 'units_bks':  return Number(record.units_bks)  || 0;
    case 'units_slop': return Number(record.units_slop) || 0;
    case 'units_bal':  return Number(record.units_bal)  || 0;
    case 'units_dos':
    default:           return Number(record.units_dos)  || 0;
  }
}

interface FetchFilters {
  year1?: number;
  year2?: number;
  product?: string;
  city?: string;
  area?: string;
  allowedAreas?: string[];
  weekStart1?: number;
  weekEnd1?: number;
  weekStart2?: number;
  weekEnd2?: number;
  selectedUnit?: string;
}

// ─── ISO week cross-year resolution ──────────────────────────────────────────
function parseDateLocal(dateVal: any): { year: number; month: number; day: number } {
  let str: string | null = null;
  if (typeof dateVal === 'string') {
    str = dateVal;
  } else if (dateVal instanceof Date) {
    const utcHour = dateVal.getUTCHours();
    if (utcHour < 12) {
      const wibMs   = dateVal.getTime() + 7 * 60 * 60 * 1000;
      const wibDate = new Date(wibMs);
      return {
        year:  wibDate.getUTCFullYear(),
        month: wibDate.getUTCMonth(),
        day:   wibDate.getUTCDate(),
      };
    }
    return {
      year:  dateVal.getUTCFullYear(),
      month: dateVal.getUTCMonth(),
      day:   dateVal.getUTCDate(),
    };
  }

  if (str) {
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return {
        year:  parseInt(match[1]),
        month: parseInt(match[2]) - 1,
        day:   parseInt(match[3]),
      };
    }
  }

  const d = new Date(dateVal);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() };
}

function calcISOWeekYear(year: number, month: number, day: number): { week: number; isoYear: number } {
  const d      = new Date(Date.UTC(year, month, day));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const isoYear   = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week      = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week, isoYear };
}

function resolveWeekYear(record: any): { week: number; year: number } {
  const { year: rawYear, month, day } = parseDateLocal(record.date);
  const dbWeek = Number(record.week);

  if (month >= 1 && month <= 10) {
    return { week: dbWeek, year: rawYear };
  }

  if (month === 11 && day >= 28) {
    const { week, isoYear } = calcISOWeekYear(rawYear, month, day);
    if (isoYear !== rawYear) {
      return { week, year: isoYear };
    }
    return { week: dbWeek, year: rawYear };
  }

  if (month === 0 && day <= 3) {
    const { week, isoYear } = calcISOWeekYear(rawYear, month, day);
    if (isoYear !== rawYear) {
      return { week, year: isoYear };
    }
    return { week: dbWeek, year: rawYear };
  }

  return { week: dbWeek, year: rawYear };
}

function getCalendarYearsToFetch(isoYears: number[]): number[] {
  const calYears = new Set<number>();
  for (const isoYear of isoYears) {
    calYears.add(isoYear - 1);
    calYears.add(isoYear);
    calYears.add(isoYear + 1);
  }
  return Array.from(calYears).sort((a, b) => a - b);
}

// ─── Helper: build WHERE conditions ──────────────────────────────────────────
function buildWhereConditions(filters?: FetchFilters): { conditions: string[]; values: any[] } {
  const conditions: string[] = [];
  const values: any[] = [];

  if (filters?.year1 !== undefined || filters?.year2 !== undefined) {
    const isoYears: number[] = [];
    if (filters?.year1 !== undefined) isoYears.push(filters.year1);
    if (filters?.year2 !== undefined && filters.year2 !== filters.year1) isoYears.push(filters.year2);

    const calYears = getCalendarYearsToFetch(isoYears);
    const startIdx = values.length + 1;
    calYears.forEach(y => values.push(y));
    const placeholders = calYears.map((_, i) => `$${startIdx + i}`).join(', ');
    conditions.push(`EXTRACT(YEAR FROM date) IN (${placeholders})`);

    console.log(`📡 ISO years diminta: [${isoYears}] → fetch calendar years: [${calYears}]`);
  }

  if (filters?.area && filters.area.trim().length > 0) {
    values.push(filters.area.trim());
    conditions.push(`area = $${values.length}`);
  } else if (filters?.allowedAreas && filters.allowedAreas.length > 0) {
    values.push(filters.allowedAreas);
    conditions.push(`area = ANY($${values.length})`);
  }

  if (filters?.product && filters.product.trim().length > 0) {
    values.push(filters.product.trim());
    conditions.push(`product = $${values.length}`);
  }

  if (filters?.city && filters.city.trim().length > 0) {
    values.push(filters.city.trim());
    conditions.push(`city = $${values.length}`);
  }

  return { conditions, values };
}

// ─── Query 1: agregasi untuk chart (tanpa customer detail) ───────────────────
async function querySalesRecords(filters?: FetchFilters): Promise<any[]> {
  const { conditions, values } = buildWhereConditions(filters);
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      area,
      week,
      date,
      product,
      category,
      customer_type,
      city,
      SUM(units_dos)::float  AS units_dos,
      SUM(units_bks)::float  AS units_bks,
      SUM(units_slop)::float AS units_slop,
      SUM(units_bal)::float  AS units_bal,
      SUM(omzet)::float      AS omzet
    FROM sales_records
    ${whereClause}
    GROUP BY area, week, date, product, category, customer_type, city
    LIMIT 800000
  `;

  const client = await pool.connect();
  try {
    console.log(`🔍 querySalesRecords - agregasi query...`);
    const start = Date.now();
    const result = await client.query(query, values);
    console.log(`✅ chart records: ${result.rows.length} rows dalam ${Date.now() - start}ms`);
    return result.rows;
  } finally {
    client.release();
  }
}

// ─── Query 2: outlet records dengan customer detail ───────────────────────────
// date wajib ada di GROUP BY agar resolveWeekYear akurat per tanggal asli.
// Agregasi units_dos per customer dilakukan di sini (SUM per date+customer),
// lalu penggabungan lintas tanggal dalam satu week dilakukan di generateOutletData.
async function queryOutletRecords(filters?: FetchFilters): Promise<any[]> {
  const { conditions, values } = buildWhereConditions(filters);
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      area,
      week,
      date,
      product,
      category,
      customer_type,
      city,
      district,
      village,
      salesman,
      customer,
      customer_no,
      SUM(units_dos)::float AS units_dos
    FROM sales_records
    ${whereClause}
    GROUP BY
      area, week, date, product, category,
      customer_type, city, district, village,
      salesman, customer, customer_no
    LIMIT 800000
  `;

  const client = await pool.connect();
  try {
    console.log(`🔍 queryOutletRecords...`);
    const start = Date.now();
    const result = await client.query(query, values);
    console.log(`✅ outlet records: ${result.rows.length} rows dalam ${Date.now() - start}ms`);
    return result.rows;
  } finally {
    client.release();
  }
}

// ─── Query area targets ───────────────────────────────────────────────────────
async function queryAreaTargets(areaId: string): Promise<{ [key: string]: number }> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT quarterly_targets FROM areas WHERE id = $1 LIMIT 1`,
      [areaId]
    );
    if (result.rows.length > 0 && result.rows[0].quarterly_targets) {
      return result.rows[0].quarterly_targets as { [key: string]: number };
    }
    return {};
  } finally {
    client.release();
  }
}

interface ProductTargetRow {
  product:    string;
  units_dos:  number;
  units_bks:  number;
  units_slop: number;
  units_bal:  number;
}

async function queryProductTargets(
  areaId: string,
  year:   number,
): Promise<Map<string, ProductTargetRow>> {
  const client = await pool.connect();
  try {
    const result = await client.query<{
      product:    string;
      units_dos:  string;
      units_bks:  string;
      units_slop: string;
      units_bal:  string;
    }>(
      `SELECT
         product,
         SUM(COALESCE(units_dos,  0)) AS units_dos,
         SUM(COALESCE(units_bks,  0)) AS units_bks,
         SUM(COALESCE(units_slop, 0)) AS units_slop,
         SUM(COALESCE(units_bal,  0)) AS units_bal
       FROM target_data
       WHERE area        = $1
         AND year        = $2
         AND target_type = 'WEEKLY'
         AND product     != 'DEFAULT_PRODUCT'
       GROUP BY product`,
      [areaId, year],
    );

    const map = new Map<string, ProductTargetRow>();
    result.rows.forEach(r => {
      map.set(r.product, {
        product:    r.product,
        units_dos:  parseFloat(r.units_dos)  || 0,
        units_bks:  parseFloat(r.units_bks)  || 0,
        units_slop: parseFloat(r.units_slop) || 0,
        units_bal:  parseFloat(r.units_bal)  || 0,
      });
    });

    console.log(`✅ Product targets loaded: ${map.size} produk untuk area=${areaId} tahun=${year}`);
    return map;
  } finally {
    client.release();
  }
}

interface ProductQuarterTargetRow {
  product:    string;
  quarter:    number;
  units_dos:  number;
  units_bks:  number;
  units_slop: number;
  units_bal:  number;
}

async function queryProductQuarterTargets(
  areaId: string,
  year:   number,
): Promise<Map<string, Map<number, ProductQuarterTargetRow>>> {
  const client = await pool.connect();
  try {
    const result = await client.query<{
      product:    string;
      quarter:    string;
      units_dos:  string;
      units_bks:  string;
      units_slop: string;
      units_bal:  string;
    }>(
      `SELECT
         product,
         quarter,
         SUM(COALESCE(units_dos,  0)) AS units_dos,
         SUM(COALESCE(units_bks,  0)) AS units_bks,
         SUM(COALESCE(units_slop, 0)) AS units_slop,
         SUM(COALESCE(units_bal,  0)) AS units_bal
       FROM target_data
       WHERE area        = $1
         AND year        = $2
         AND target_type = 'WEEKLY'
         AND product     != 'DEFAULT_PRODUCT'
       GROUP BY product, quarter
       ORDER BY product, quarter`,
      [areaId, year],
    );

    const map = new Map<string, Map<number, ProductQuarterTargetRow>>();
    result.rows.forEach(r => {
      const qNum = Number(r.quarter);
      if (!map.has(r.product)) map.set(r.product, new Map());
      map.get(r.product)!.set(qNum, {
        product:    r.product,
        quarter:    qNum,
        units_dos:  parseFloat(r.units_dos)  || 0,
        units_bks:  parseFloat(r.units_bks)  || 0,
        units_slop: parseFloat(r.units_slop) || 0,
        units_bal:  parseFloat(r.units_bal)  || 0,
      });
    });

    return map;
  } finally {
    client.release();
  }
}

/**
 * Fetch sales data dari database dengan filter
 */
export async function fetchSalesData(filters?: FetchFilters): Promise<SalesData> {
  try {
    console.log('🔍 fetchSalesData - Filter diterima:', JSON.stringify(filters));

    // Query 1: chart data — agregasi ringan tanpa customer detail
    const records = await querySalesRecords(filters);
    console.log(`✅ Fetched ${records.length} chart records dari DB`);

    // Query 2: outlet data — agregasi per customer, KEDUA tahun
    const outletRecords = await queryOutletRecords(filters);
    console.log(`✅ Fetched ${outletRecords.length} outlet records dari DB`);

    return await processSalesRecords(records, filters, outletRecords);
  } catch (error) {
    console.error('Error fetching sales data:', error);
    return {
      weeklyData:       [],
      quarterlyData:    generateEmptyQuarterlyData(),
      weekComparisons:  [],
      l4wc4wData:       generateEmptyL4WC4WData(),
      yearOnYearGrowth: generateEmptyYearOnYearGrowth(),
      comparisonYears:  { previousYear: null, currentYear: null },
      comparisonWeeks:  generateEmptyComparisonWeeks(),
      outletData:       [],
    };
  }
}

/**
 * Process raw sales records menjadi dashboard data
 */
async function processSalesRecords(
  records: any[],
  filters?: FetchFilters,
  outletRecords?: any[],
): Promise<SalesData> {
  const areaId = filters?.area;

  if (records.length === 0) {
    return {
      weeklyData:       [],
      quarterlyData:    generateEmptyQuarterlyData(),
      weekComparisons:  [],
      l4wc4wData:       generateEmptyL4WC4WData(),
      yearOnYearGrowth: generateEmptyYearOnYearGrowth(),
      comparisonYears:  { previousYear: null, currentYear: null },
      comparisonWeeks:  generateEmptyComparisonWeeks(),
      outletData:       [],
    };
  }

  // ─── STEP 1: Resolve ISO week cross-year untuk SEMUA record ───────────────
  let crossYearCount = 0;
  records.forEach(record => {
    const dbYear = new Date(record.date).getFullYear();
    const dbWeek = Number(record.week);
    const resolved = resolveWeekYear(record);
    record.year = resolved.year;
    record.week = resolved.week;
    if (resolved.year !== dbYear || resolved.week !== dbWeek) {
      crossYearCount++;
    }
    getOmzetValue(record);
  });

  console.log(`\n🔄 [STEP-1] ISO resolution selesai: ${crossYearCount} record di-remap ke ISO year berbeda`);

  const crossYearSamples = records.filter(r => {
    const calYear = new Date(r.date).getFullYear();
    return r.year !== calYear;
  });
  if (crossYearSamples.length > 0) {
    console.log(`📋 Sample cross-year records (${crossYearSamples.length} total):`);
    crossYearSamples.slice(0, 5).forEach(r =>
      console.log(`   cal_date=${r.date}  cal_year=${new Date(r.date).getFullYear()}  iso_year=${r.year}  iso_week=${r.week}`)
    );
  }

  // ─── STEP 1b: Resolve ISO week untuk outlet records ───────────────────────
  if (outletRecords && outletRecords.length > 0) {
    let outletCrossYearCount = 0;
    outletRecords.forEach(record => {
      const dbYear = new Date(record.date).getFullYear();
      const dbWeek = Number(record.week);
      const resolved = resolveWeekYear(record);
      record.year = resolved.year;
      record.week = resolved.week;
      if (resolved.year !== dbYear || resolved.week !== dbWeek) {
        outletCrossYearCount++;
      }
    });
    console.log(`🔄 [STEP-1b] Outlet ISO resolution: ${outletCrossYearCount} record di-remap`);
  }

  // ─── STEP 2: Filter hanya ISO year yang diminta ───────────────────────────
  const requestedISOYears = new Set<number>();
  if (filters?.year1 !== undefined) requestedISOYears.add(filters.year1);
  if (filters?.year2 !== undefined) requestedISOYears.add(filters.year2);

  const isoFilteredRecords = requestedISOYears.size > 0
    ? records.filter(r => requestedISOYears.has(r.year as number))
    : records;

  // Filter outlet records dengan ISO year yang sama
  const isoFilteredOutletRecords = (outletRecords && requestedISOYears.size > 0)
    ? outletRecords.filter(r => requestedISOYears.has(r.year as number))
    : (outletRecords ?? []);

  console.log(`\n🔍 [STEP-2] ISO filter: requested=[${[...requestedISOYears]}], chart=${isoFilteredRecords.length} records, outlet=${isoFilteredOutletRecords.length} records`);

  const targetYear = filters?.year2 ?? filters?.year1;
  if (targetYear) {
    const w1Records = isoFilteredRecords.filter(r => r.year === targetYear && r.week === 1);
    const byMonth = new Map<string, number>();
    w1Records.forEach(r => {
      const d   = new Date(r.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth.set(key, (byMonth.get(key) || 0) + 1);
    });

    const w1FromPrevYear = w1Records.filter(r => new Date(r.date).getFullYear() < targetYear);

    console.log(`\n📊 [STEP-2] W1 ISO-${targetYear} breakdown (total=${w1Records.length}):`);
    Array.from(byMonth.entries()).sort().forEach(([ym, cnt]) => {
      const isLastYear = parseInt(ym.split('-')[0]) < targetYear;
      console.log(`   - ${ym}: ${cnt} records ${isLastYear ? '(dari tahun sebelumnya ✅)' : ''}`);
    });
    if (w1FromPrevYear.length === 0) {
      const allW1PrevYear = records.filter(r => {
        const d = new Date(r.date);
        return r.week === 1 && d.getFullYear() < targetYear && d.getMonth() === 11;
      });
      if (allW1PrevYear.length > 0) {
        const isoYears = [...new Set(allW1PrevYear.map(r => r.year))];
        console.log(`   ⚠️  Ada ${allW1PrevYear.length} records Des W1 di raw data tapi ISO year-nya: [${isoYears}] — tidak match targetYear=${targetYear}`);
      } else {
        console.log(`   ℹ️  Tidak ada data Des W1 di raw data untuk area ini (normal jika data mulai Jan)`);
      }
    }
  }

  const yearSet     = new Set<number>(isoFilteredRecords.map(r => r.year as number));
  const sortedYears = Array.from(yearSet).sort((a, b) => a - b);

  const currentYear  = filters?.year2  ?? sortedYears[sortedYears.length - 1];
  const previousYear = filters?.year1  ?? (sortedYears.length > 1 ? sortedYears[sortedYears.length - 2] : currentYear);
  const comparisonYears = {
    previousYear: previousYear ?? null,
    currentYear:  currentYear  ?? null,
  };

  // ─── STEP 3: Tentukan week range ─────────────────────────────────────────
  const weekSetByYear = new Map<number, Set<number>>();
  isoFilteredRecords.forEach(record => {
    const y = record.year as number;
    if (!weekSetByYear.has(y)) weekSetByYear.set(y, new Set());
    weekSetByYear.get(y)!.add(Number(record.week));
  });

  const getWeekRangeFromData = (year: number): { start: number; end: number } | null => {
    const weeks = weekSetByYear.get(year);
    if (!weeks || weeks.size === 0) return null;
    const sorted = Array.from(weeks).sort((a, b) => a - b);
    return { start: sorted[0], end: sorted[sorted.length - 1] };
  };

  const clampWeek = (w: number) => Math.max(1, Math.min(52, w));
  const normalizeWeekRange = (
    start?: number,
    end?: number,
    fallback?: { start: number; end: number } | null,
  ): { start: number; end: number } => {
    let s = start ?? fallback?.start ?? 1;
    let e = end   ?? fallback?.end   ?? 52;
    if (s > e) [s, e] = [e, s];
    return { start: clampWeek(s), end: clampWeek(e) };
  };

  const dataRangeYear1 = previousYear !== undefined ? getWeekRangeFromData(previousYear) : null;
  const dataRangeYear2 = currentYear  !== undefined ? getWeekRangeFromData(currentYear)  : null;

  const previousYearWeekRange = previousYear !== undefined
    ? normalizeWeekRange(filters?.weekStart1, filters?.weekEnd1, dataRangeYear1)
    : null;
  const currentYearWeekRange = currentYear !== undefined
    ? normalizeWeekRange(filters?.weekStart2, filters?.weekEnd2, dataRangeYear2)
    : null;

  console.log(`\n🔍 [STEP-3] Week ranges:`);
  console.log(`   Data range year1=${previousYear}: [${dataRangeYear1?.start ?? '-'} - ${dataRangeYear1?.end ?? '-'}]`);
  console.log(`   Data range year2=${currentYear}:  [${dataRangeYear2?.start ?? '-'} - ${dataRangeYear2?.end ?? '-'}]`);
  console.log(`   Filter weekStart1=${filters?.weekStart1}, weekEnd1=${filters?.weekEnd1}`);
  console.log(`   Filter weekStart2=${filters?.weekStart2}, weekEnd2=${filters?.weekEnd2}`);
  console.log(`   Final range year1: [${previousYearWeekRange?.start ?? '-'} - ${previousYearWeekRange?.end ?? '-'}]`);
  console.log(`   Final range year2: [${currentYearWeekRange?.start ?? '-'} - ${currentYearWeekRange?.end ?? '-'}]`);
  console.log(`   → W1 masuk range year2? ${currentYearWeekRange
    ? (1 >= currentYearWeekRange.start && 1 <= currentYearWeekRange.end ? 'YA ✅' : `TIDAK ❌ (range=${currentYearWeekRange.start}-${currentYearWeekRange.end})`)
    : 'null ❌'}`);

  const comparisonWeeks: ComparisonWeeks = {
    previousYear: previousYearWeekRange,
    currentYear:  currentYearWeekRange,
  };

  // ─── STEP 4: Filter berdasarkan week range ────────────────────────────────
  const isRecordInRange = (record: any): boolean => {
    const year = record.year as number;
    const week = Number(record.week);

    if (year === currentYear && currentYearWeekRange) {
      return week >= currentYearWeekRange.start && week <= currentYearWeekRange.end;
    }
    if (year === previousYear && previousYearWeekRange) {
      return week >= previousYearWeekRange.start && week <= previousYearWeekRange.end;
    }
    return false;
  };

  const rangeFilteredRecords       = isoFilteredRecords.filter(isRecordInRange);
  const rangeFilteredOutletRecords = isoFilteredOutletRecords.filter(isRecordInRange);

  console.log(`\n🔍 [STEP-4] Range filter:`);
  console.log(`   chart: ${isoFilteredRecords.length} → ${rangeFilteredRecords.length} records`);
  console.log(`   outlet: ${isoFilteredOutletRecords.length} → ${rangeFilteredOutletRecords.length} records`);

  // ── Sanity check: total units_dos chart vs outlet harus sama ─────────────
  const chartTotalDos  = rangeFilteredRecords.reduce((s, r) => s + (Number(r.units_dos) || 0), 0);
  const outletTotalDos = rangeFilteredOutletRecords.reduce((s, r) => s + (Number(r.units_dos) || 0), 0);
  const diff           = Math.abs(chartTotalDos - outletTotalDos);
  const diffPct        = chartTotalDos > 0 ? (diff / chartTotalDos * 100).toFixed(2) : 'N/A';
  console.log(`\n🔢 [SANITY] Total units_dos setelah range filter:`);
  console.log(`   chart  : ${chartTotalDos.toFixed(2)}`);
  console.log(`   outlet : ${outletTotalDos.toFixed(2)}`);
  console.log(`   selisih: ${diff.toFixed(2)} (${diffPct}%) ${diff < 1 ? '✅ konsisten' : '❌ TIDAK KONSISTEN — cek LIMIT atau GROUP BY'}`);
  if (diff >= 1) {
    // Breakdown per year untuk pinpoint masalah
    [currentYear, previousYear].filter(Boolean).forEach(y => {
      const cDos = rangeFilteredRecords.filter(r => r.year === y).reduce((s, r) => s + (Number(r.units_dos) || 0), 0);
      const oDos = rangeFilteredOutletRecords.filter(r => r.year === y).reduce((s, r) => s + (Number(r.units_dos) || 0), 0);
      console.log(`   [ISO ${y}] chart=${cDos.toFixed(2)} outlet=${oDos.toFixed(2)} selisih=${Math.abs(cDos-oDos).toFixed(2)}`);
    });
  }

  if (targetYear) {
    const prevCalYear = targetYear - 1;
    const w1DesFinal = rangeFilteredRecords.filter(r => {
      const d = new Date(r.date);
      return r.year === targetYear &&
             r.week === 1 &&
             d.getFullYear() === prevCalYear &&
             d.getMonth() === 11;
    });
    console.log(`   W1 Des ${prevCalYear} (ISO ${targetYear}) setelah range filter: ${w1DesFinal.length} ${w1DesFinal.length > 0 ? '✅' : '❌'}`);

    const w1DesBeforeRange = isoFilteredRecords.filter(r => {
      const d = new Date(r.date);
      return r.year === targetYear &&
             r.week === 1 &&
             d.getFullYear() === prevCalYear &&
             d.getMonth() === 11;
    });
    if (w1DesBeforeRange.length > 0 && w1DesFinal.length === 0) {
      console.log(`   ❌ PROBLEM: ${w1DesBeforeRange.length} records W1 Des dibuang oleh range filter!`);
      console.log(`   Range year2: start=${currentYearWeekRange?.start}, end=${currentYearWeekRange?.end}`);
      console.log(`   Record week=${w1DesBeforeRange[0].week} → tidak masuk range!`);
    }

    // Log outlet year breakdown setelah filter
    const outletYearBreakdown = new Map<number, number>();
    rangeFilteredOutletRecords.forEach(r => {
      const y = r.year as number;
      outletYearBreakdown.set(y, (outletYearBreakdown.get(y) || 0) + 1);
    });
    console.log(`\n📊 [STEP-4] Outlet records per ISO year setelah range filter:`);
    Array.from(outletYearBreakdown.entries()).sort().forEach(([y, cnt]) =>
      console.log(`   ISO ${y}: ${cnt} records`)
    );
  }

  // ─── STEP 5: Build weeklyMap ──────────────────────────────────────────────
  const weeklyMap = new Map<string, any[]>();
  rangeFilteredRecords.forEach(record => {
    const key = `${record.year}-${record.week}`;
    if (!weeklyMap.has(key)) weeklyMap.set(key, []);
    weeklyMap.get(key)!.push(record);
  });

  console.log(`\n🔍 [STEP-5] weeklyMap size: ${weeklyMap.size} keys`);
  if (currentYear) {
    const w1Key  = `${currentYear}-1`;
    const w1Data = weeklyMap.get(w1Key);
    console.log(`   Key "${w1Key}": ${w1Data ? w1Data.length + ' records ✅' : 'TIDAK ADA ❌'}`);
    if (w1Data && w1Data.length > 0) {
      const dateGroups = new Map<string, number>();
      w1Data.forEach(r => {
        const dateStr = new Date(r.date).toISOString().slice(0, 10);
        dateGroups.set(dateStr, (dateGroups.get(dateStr) || 0) + 1);
      });
      console.log(`   Tanggal dalam W1 ISO-${currentYear}:`);
      Array.from(dateGroups.entries()).sort().forEach(([d, cnt]) =>
        console.log(`     ${d}: ${cnt} records`)
      );
    }
  }

  const weeklyData: WeeklySales[]         = [];
  const weekComparisons: WeekComparison[] = [];

  const allProductsSet = new Set<string>();
  rangeFilteredRecords.forEach(record => { if (record.product) allProductsSet.add(record.product); });

  const prevRange = comparisonWeeks.previousYear;
  const currRange = comparisonWeeks.currentYear;

  for (let week = 1; week <= 52; week++) {
    const prevYearWeekData = previousYear !== undefined ? (weeklyMap.get(`${previousYear}-${week}`) ?? []) : [];
    const currYearWeekData = currentYear  !== undefined ? (weeklyMap.get(`${currentYear}-${week}`)  ?? []) : [];

    const prevYearInRange = prevRange ? week >= prevRange.start && week <= prevRange.end : true;
    const currYearInRange = currRange ? week >= currRange.start && week <= currRange.end : true;

    const productTotalsMap = new Map<string, {
      previous:   number;
      current:    number;
      units_bks:  { previous: number; current: number };
      units_slop: { previous: number; current: number };
      units_bal:  { previous: number; current: number };
      units_dos:  { previous: number; current: number };
    }>();

    allProductsSet.forEach(product => {
      productTotalsMap.set(product, {
        previous: 0, current: 0,
        units_bks:  { previous: 0, current: 0 },
        units_slop: { previous: 0, current: 0 },
        units_bal:  { previous: 0, current: 0 },
        units_dos:  { previous: 0, current: 0 },
      });
    });

    if (prevYearInRange) {
      for (const record of prevYearWeekData) {
        const totals = productTotalsMap.get(record.product ?? 'Produk Tidak Diketahui');
        if (!totals) continue;
        const unitValue = getUnitValue(record, filters?.selectedUnit || 'units_dos');
        totals.previous += unitValue;
        const bks  = Number(record.units_bks);
        const slop = Number(record.units_slop);
        const bal  = Number(record.units_bal);
        const dos  = Number(record.units_dos);
        if (!isNaN(bks))  totals.units_bks.previous  += bks;
        if (!isNaN(slop)) totals.units_slop.previous += slop;
        if (!isNaN(bal))  totals.units_bal.previous  += bal;
        if (!isNaN(dos))  totals.units_dos.previous  += dos;
      }
    }

    if (currYearInRange) {
      for (const record of currYearWeekData) {
        const totals = productTotalsMap.get(record.product ?? 'Produk Tidak Diketahui');
        if (!totals) continue;
        const unitValue = getUnitValue(record, filters?.selectedUnit || 'units_dos');
        totals.current += unitValue;
        const bks  = Number(record.units_bks);
        const slop = Number(record.units_slop);
        const bal  = Number(record.units_bal);
        const dos  = Number(record.units_dos);
        if (!isNaN(bks))  totals.units_bks.current  += bks;
        if (!isNaN(slop)) totals.units_slop.current += slop;
        if (!isNaN(bal))  totals.units_bal.current  += bal;
        if (!isNaN(dos))  totals.units_dos.current  += dos;
      }
    }

    const prevYearSales = prevYearInRange
      ? prevYearWeekData.reduce((sum, r) => sum + getUnitValue(r, filters?.selectedUnit || 'units_dos'), 0)
      : 0;
    const currYearSales = currYearInRange
      ? currYearWeekData.reduce((sum, r) => sum + getUnitValue(r, filters?.selectedUnit || 'units_dos'), 0)
      : 0;

    const details: WeekComparisonProductDetail[] = Array.from(productTotalsMap.entries())
      .map(([product, totals]): WeekComparisonProductDetail => {
        const variance           = totals.current - totals.previous;
        const variancePercentage = totals.previous > 0 ? (variance / totals.previous) * 100 : 0;
        return {
          product,
          previousYear: totals.previous,
          currentYear:  totals.current,
          variance,
          variancePercentage,
          units_bks:  { previous: totals.units_bks.previous   || 0, current: totals.units_bks.current   || 0 },
          units_slop: { previous: totals.units_slop.previous  || 0, current: totals.units_slop.current  || 0 },
          units_bal:  { previous: totals.units_bal.previous   || 0, current: totals.units_bal.current   || 0 },
          units_dos:  { previous: totals.units_dos.previous   || 0, current: totals.units_dos.current   || 0 },
        };
      })
      .sort((a, b) => b.currentYear - a.currentYear);

    if (prevYearSales > 0 || currYearSales > 0) {
      weekComparisons.push({
        week,
        previousYear:       prevYearSales,
        currentYear:        currYearSales,
        variance:           currYearSales - prevYearSales,
        variancePercentage: prevYearSales > 0 ? ((currYearSales - prevYearSales) / prevYearSales) * 100 : 0,
        details,
      });
    }

    if (currYearSales > 0 && currentYear !== undefined && currYearInRange) {
      weeklyData.push({ week, year: currentYear,  sales: currYearSales, target: currYearSales * 1.1 });
    }
    if (prevYearSales > 0 && previousYear !== undefined && prevYearInRange) {
      weeklyData.push({ week, year: previousYear, sales: prevYearSales, target: prevYearSales * 1.1 });
    }
  }

  const effectiveYear     = currentYear ?? sortedYears[sortedYears.length - 1];
  const effectivePrevYear = previousYear ?? (currentYear ?? sortedYears[0]);

  const quarterlyData    = await generateQuarterlyData(rangeFilteredRecords, effectiveYear, areaId, filters?.selectedUnit);
  const l4wc4wData       = generateL4WC4WData(rangeFilteredRecords, currentYear, filters);
  const yearOnYearGrowth = generateYearOnYearGrowth(rangeFilteredRecords, effectivePrevYear, effectiveYear, filters?.selectedUnit);
  const outletData       = generateOutletData(rangeFilteredOutletRecords);

  return { weeklyData, quarterlyData, weekComparisons, l4wc4wData, yearOnYearGrowth, comparisonYears, comparisonWeeks, outletData };
}

/**
 * Generate quarterly data dari records dengan target dari area
 */
async function generateQuarterlyData(
  records:      any[],
  year:         number,
  areaId?:      string,
  selectedUnit?: string,
): Promise<QuarterlyData[]> {
  const quarters     = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
  const quarterlyData: QuarterlyData[] = [];

  interface WeekTargetRow {
    week:      number;
    quarter:   number;
    units_dos:  number;
    units_bks:  number;
    units_slop: number;
    units_bal:  number;
    has_target: boolean;
  }

  const weekTargetMap        = new Map<number, WeekTargetRow>();
  const productWeekTargetMap = new Map<string, Map<number, {
    units_dos: number; units_bks: number; units_slop: number; units_bal: number;
  }>>();

  if (areaId) {
    const client2 = await pool.connect();
    try {
      const res2 = await client2.query<{
        product: string; week: string;
        units_dos: string; units_bks: string; units_slop: string; units_bal: string;
      }>(
        `SELECT
           product,
           week,
           SUM(COALESCE(units_dos,  0)) AS units_dos,
           SUM(COALESCE(units_bks,  0)) AS units_bks,
           SUM(COALESCE(units_slop, 0)) AS units_slop,
           SUM(COALESCE(units_bal,  0)) AS units_bal
         FROM target_data
         WHERE area        = $1
           AND year        = $2
           AND target_type = 'WEEKLY'
           AND product     != 'DEFAULT_PRODUCT'
         GROUP BY product, week
         ORDER BY product, week`,
        [areaId, year],
      );

      res2.rows.forEach(r => {
        const wNum = Number(r.week);
        if (!productWeekTargetMap.has(r.product))
          productWeekTargetMap.set(r.product, new Map());
        productWeekTargetMap.get(r.product)!.set(wNum, {
          units_dos:  parseFloat(r.units_dos)  || 0,
          units_bks:  parseFloat(r.units_bks)  || 0,
          units_slop: parseFloat(r.units_slop) || 0,
          units_bal:  parseFloat(r.units_bal)  || 0,
        });
      });

      console.log(`✅ Product week targets loaded: ${productWeekTargetMap.size} produk`);
    } finally {
      client2.release();
    }
  }

  let productQuarterTargets = new Map<string, Map<number, ProductQuarterTargetRow>>();

  if (areaId) {
    const client = await pool.connect();
    try {
      const result = await client.query<{
        week: string; quarter: string;
        units_dos: string; units_bks: string; units_slop: string; units_bal: string;
      }>(
        `SELECT
           week,
           quarter,
           SUM(COALESCE(units_dos,  0)) AS units_dos,
           SUM(COALESCE(units_bks,  0)) AS units_bks,
           SUM(COALESCE(units_slop, 0)) AS units_slop,
           SUM(COALESCE(units_bal,  0)) AS units_bal
         FROM target_data
         WHERE area        = $1
           AND year        = $2
           AND target_type = 'WEEKLY'
         GROUP BY week, quarter
         ORDER BY week`,
        [areaId, year],
      );

      result.rows.forEach(r => {
        const dos = parseFloat(r.units_dos) || 0;
        weekTargetMap.set(Number(r.week), {
          week:       Number(r.week),
          quarter:    Number(r.quarter),
          units_dos:  dos,
          units_bks:  parseFloat(r.units_bks)  || 0,
          units_slop: parseFloat(r.units_slop) || 0,
          units_bal:  parseFloat(r.units_bal)  || 0,
          has_target: dos > 0,
        });
      });

      console.log(`✅ Week targets loaded: ${weekTargetMap.size} minggu`);
    } finally {
      client.release();
    }

    productQuarterTargets = await queryProductQuarterTargets(areaId, year);
  }

  type QuarterAccum = { dos: number; bks: number; slop: number; bal: number; weekCount: number };
  const quarterTargetMap: Record<string, QuarterAccum> = {
    Q1: { dos:0, bks:0, slop:0, bal:0, weekCount:0 },
    Q2: { dos:0, bks:0, slop:0, bal:0, weekCount:0 },
    Q3: { dos:0, bks:0, slop:0, bal:0, weekCount:0 },
    Q4: { dos:0, bks:0, slop:0, bal:0, weekCount:0 },
  };

  weekTargetMap.forEach(r => {
    if (!r.has_target) return;
    const qKey = `Q${r.quarter}` as keyof typeof quarterTargetMap;
    if (quarterTargetMap[qKey]) {
      quarterTargetMap[qKey].dos  += r.units_dos;
      quarterTargetMap[qKey].bks  += r.units_bks;
      quarterTargetMap[qKey].slop += r.units_slop;
      quarterTargetMap[qKey].bal  += r.units_bal;
      quarterTargetMap[qKey].weekCount++;
    }
  });

  const getUnitValueLocal = (record: any, unitType: string): number => {
    switch (unitType) {
      case 'units_bks':  return Number(record.units_bks)  || 0;
      case 'units_slop': return Number(record.units_slop) || 0;
      case 'units_bal':  return Number(record.units_bal)  || 0;
      case 'units_dos':
      default:           return Number(record.units_dos)  || 0;
    }
  };

  const getMonthFromWeek = (week: number): string => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const jan4    = new Date(year, 0, 4);
    const jan4Day = jan4.getDay() || 7;
    const startOfWeek1 = new Date(jan4);
    startOfWeek1.setDate(jan4.getDate() - (jan4Day - 1));
    const targetDate = new Date(startOfWeek1);
    targetDate.setDate(startOfWeek1.getDate() + (week - 1) * 7);
    return months[targetDate.getMonth()];
  };

  const generateQuarterlyProductDetails = (
    quarterRecords:   any[],
    quarterIndex:     number,
    unitType:         string = 'units_dos',
    referenceRecords: any[]  = [],
  ): QuarterlyProductDetail[] => {
    const qNum = quarterIndex + 1;

    const productActualMap = new Map<string, {
      units_dos: number; units_bks: number; units_slop: number; units_bal: number;
    }>();

    const productWeeklyMap = new Map<string, Map<number, {
      units_dos: number; units_bks: number; units_slop: number; units_bal: number;
    }>>();

    quarterRecords.forEach(record => {
      const product = record.product || 'Produk tidak diketahui';
      const week    = Number(record.week);

      if (!productActualMap.has(product)) {
        productActualMap.set(product, { units_dos:0, units_bks:0, units_slop:0, units_bal:0 });
      }
      const d = productActualMap.get(product)!;
      d.units_dos  += getUnitValueLocal(record, 'units_dos');
      d.units_bks  += getUnitValueLocal(record, 'units_bks');
      d.units_slop += getUnitValueLocal(record, 'units_slop');
      d.units_bal  += getUnitValueLocal(record, 'units_bal');

      if (!productWeeklyMap.has(product)) productWeeklyMap.set(product, new Map());
      const wm = productWeeklyMap.get(product)!;
      if (!wm.has(week)) wm.set(week, { units_dos:0, units_bks:0, units_slop:0, units_bal:0 });
      const wd = wm.get(week)!;
      wd.units_dos  += getUnitValueLocal(record, 'units_dos');
      wd.units_bks  += getUnitValueLocal(record, 'units_bks');
      wd.units_slop += getUnitValueLocal(record, 'units_slop');
      wd.units_bal  += getUnitValueLocal(record, 'units_bal');
    });

    if (productActualMap.size === 0 && referenceRecords.length > 0) {
      referenceRecords.forEach(record => {
        const product = record.product || 'Produk tidak diketahui';
        if (!productActualMap.has(product)) {
          productActualMap.set(product, { units_dos:0, units_bks:0, units_slop:0, units_bal:0 });
        }
      });
    }

    return Array.from(productActualMap.entries()).map(([product, actual]): QuarterlyProductDetail => {
      const dbTarget = productQuarterTargets.get(product)?.get(qNum);

      const dosTarget  = dbTarget?.units_dos  ?? 0;
      const bksTarget  = dbTarget?.units_bks  ?? 0;
      const slopTarget = dbTarget?.units_slop ?? 0;
      const balTarget  = dbTarget?.units_bal  ?? 0;

      const selectedActual = unitType === 'units_bks'  ? actual.units_bks
                           : unitType === 'units_slop' ? actual.units_slop
                           : unitType === 'units_bal'  ? actual.units_bal
                           : actual.units_dos;
      const selectedTarget = unitType === 'units_bks'  ? bksTarget
                           : unitType === 'units_slop' ? slopTarget
                           : unitType === 'units_bal'  ? balTarget
                           : dosTarget;

      const variance           = selectedActual - selectedTarget;
      const variancePercentage = selectedTarget > 0 ? (variance / selectedTarget) * 100 : 0;

      const weeklyActuals: Record<number, {
        units_dos: number; units_bks: number; units_slop: number; units_bal: number;
      }> = {};
      productWeeklyMap.get(product)?.forEach((vals, week) => {
        weeklyActuals[week] = {
          units_dos:  parseFloat(vals.units_dos.toFixed(2)),
          units_bks:  parseFloat(vals.units_bks.toFixed(2)),
          units_slop: parseFloat(vals.units_slop.toFixed(2)),
          units_bal:  parseFloat(vals.units_bal.toFixed(2)),
        };
      });

      return {
        product,
        productCategory:    getProductCategory(product),
        target:             parseFloat(selectedTarget.toFixed(2)),
        actual:             parseFloat(selectedActual.toFixed(2)),
        variance:           parseFloat(variance.toFixed(2)),
        variancePercentage: parseFloat(variancePercentage.toFixed(1)),
        units_bks:  { target: parseFloat(bksTarget.toFixed(2)),  actual: parseFloat(actual.units_bks.toFixed(2))  },
        units_slop: { target: parseFloat(slopTarget.toFixed(2)), actual: parseFloat(actual.units_slop.toFixed(2)) },
        units_bal:  { target: parseFloat(balTarget.toFixed(2)),  actual: parseFloat(actual.units_bal.toFixed(2))  },
        units_dos:  { target: parseFloat(dosTarget.toFixed(2)),  actual: parseFloat(actual.units_dos.toFixed(2))  },
        weeklyActuals,
      } as any;
    });
  };

  const yearRecords = records.filter(r => r.year === year);

  console.log(`\n📊 [generateQuarterlyData] year=${year}, total yearRecords=${yearRecords.length}`);
  [1,2,3,4].forEach(q => {
    const s = (q-1)*13+1, e = Math.min(q*13, 52);
    const cnt = yearRecords.filter(r => r.week >= s && r.week <= e).length;
    console.log(`   Q${q} (W${s}-W${e}): ${cnt} records`);
  });

  for (let qIndex = 0; qIndex < quarters.length; qIndex++) {
    const quarter   = quarters[qIndex];
    const startWeek = qIndex * 13 + 1;
    const endWeek   = Math.min((qIndex + 1) * 13, 52);
    const qKey      = quarter;
    const unitType  = selectedUnit || 'units_dos';

    const quarterRecords = records.filter(
      r => r.year === year && r.week >= startWeek && r.week <= endWeek,
    );

    const actual   = quarterRecords.reduce((sum, r) => sum + getUnitValueLocal(r, 'units_dos'), 0);
    const qt       = quarterTargetMap[qKey];
    const target   = qt && qt.weekCount > 0 ? qt.dos : 0;
    const variance = actual - target;

    const quarterTargetForUnit = unitType === 'units_bks'  ? (qt?.bks  ?? 0)
                               : unitType === 'units_slop' ? (qt?.slop ?? 0)
                               : unitType === 'units_bal'  ? (qt?.bal  ?? 0)
                               : target;

    const details = generateQuarterlyProductDetails(
      quarterRecords,
      qIndex,
      unitType,
      yearRecords,
    );

    const weeklyBreakdown: WeeklyBreakdown[] = [];
    for (let week = startWeek; week <= endWeek; week++) {
      const weekRecords = records.filter(r => r.year === year && r.week === week);

      const weekActual_bks  = weekRecords.reduce((sum, r) => sum + getUnitValueLocal(r, 'units_bks'),  0);
      const weekActual_slop = weekRecords.reduce((sum, r) => sum + getUnitValueLocal(r, 'units_slop'), 0);
      const weekActual_bal  = weekRecords.reduce((sum, r) => sum + getUnitValueLocal(r, 'units_bal'),  0);
      const weekActual_dos  = weekRecords.reduce((sum, r) => sum + getUnitValueLocal(r, 'units_dos'),  0);

      const weekTargetRow = weekTargetMap.get(week);
      const hasTarget     = weekTargetRow?.has_target ?? false;

      const weekTarget_bks  = weekTargetRow?.units_bks  ?? 0;
      const weekTarget_slop = weekTargetRow?.units_slop ?? 0;
      const weekTarget_bal  = weekTargetRow?.units_bal  ?? 0;
      const weekTarget_dos  = weekTargetRow?.units_dos  ?? 0;

      const weekActual = unitType === 'units_bks'  ? weekActual_bks
                       : unitType === 'units_slop' ? weekActual_slop
                       : unitType === 'units_bal'  ? weekActual_bal
                       : weekActual_dos;
      const weekTarget = unitType === 'units_bks'  ? weekTarget_bks
                       : unitType === 'units_slop' ? weekTarget_slop
                       : unitType === 'units_bal'  ? weekTarget_bal
                       : weekTarget_dos;

      const weekVariance    = weekActual - weekTarget;
      const weekVariancePct = hasTarget && weekTarget > 0 ? (weekVariance / weekTarget) * 100 : 0;
      const weekAchievement = hasTarget && weekTarget > 0
        ? (weekActual / weekTarget) * 100
        : weekActual > 0 ? -1 : 0;

      weeklyBreakdown.push({
        week,
        target:             parseFloat(weekTarget.toFixed(2)),
        actual:             parseFloat(weekActual.toFixed(2)),
        variance:           parseFloat(weekVariance.toFixed(2)),
        variancePercentage: parseFloat(weekVariancePct.toFixed(1)),
        achievement:        parseFloat(weekAchievement.toFixed(1)),
        units_bks:  { target: parseFloat(weekTarget_bks.toFixed(2)),  actual: parseFloat(weekActual_bks.toFixed(2))  },
        units_slop: { target: parseFloat(weekTarget_slop.toFixed(2)), actual: parseFloat(weekActual_slop.toFixed(2)) },
        units_bal:  { target: parseFloat(weekTarget_bal.toFixed(2)),  actual: parseFloat(weekActual_bal.toFixed(2))  },
        units_dos:  { target: parseFloat(weekTarget_dos.toFixed(2)),  actual: parseFloat(weekActual_dos.toFixed(2))  },
        hasTarget,
      } as WeeklyBreakdown & { hasTarget: boolean });
    }

    const monthsInQuarter =
      qIndex === 0 ? ['Jan', 'Feb', 'Mar'] :
      qIndex === 1 ? ['Apr', 'May', 'Jun'] :
      qIndex === 2 ? ['Jul', 'Aug', 'Sep'] :
                     ['Oct', 'Nov', 'Dec'];

    const monthlyBreakdown: MonthlyBreakdown[] = monthsInQuarter.map(month => {
      const monthWeeks = weeklyBreakdown.filter(wb => getMonthFromWeek(wb.week) === month);

      const monthActual_bks  = monthWeeks.reduce((s, wb) => s + (wb.units_bks?.actual  ?? 0), 0);
      const monthActual_slop = monthWeeks.reduce((s, wb) => s + (wb.units_slop?.actual ?? 0), 0);
      const monthActual_bal  = monthWeeks.reduce((s, wb) => s + (wb.units_bal?.actual  ?? 0), 0);
      const monthActual_dos  = monthWeeks.reduce((s, wb) => s + (wb.units_dos?.actual  ?? 0), 0);

      const monthTarget_bks  = monthWeeks.reduce((s, wb) => s + (wb.units_bks?.target  ?? 0), 0);
      const monthTarget_slop = monthWeeks.reduce((s, wb) => s + (wb.units_slop?.target ?? 0), 0);
      const monthTarget_bal  = monthWeeks.reduce((s, wb) => s + (wb.units_bal?.target  ?? 0), 0);
      const monthTarget_dos  = monthWeeks.reduce((s, wb) => s + (wb.units_dos?.target  ?? 0), 0);

      const hasMonthTarget = monthWeeks.some(wb => (wb as any).hasTarget === true);

      const monthActual = unitType === 'units_bks'  ? monthActual_bks
                        : unitType === 'units_slop' ? monthActual_slop
                        : unitType === 'units_bal'  ? monthActual_bal
                        : monthActual_dos;
      const monthTarget = unitType === 'units_bks'  ? monthTarget_bks
                        : unitType === 'units_slop' ? monthTarget_slop
                        : unitType === 'units_bal'  ? monthTarget_bal
                        : monthTarget_dos;

      const monthVar    = monthActual - monthTarget;
      const monthVarPct = hasMonthTarget && monthTarget > 0 ? (monthVar    / monthTarget) * 100 : 0;
      const monthAch    = hasMonthTarget && monthTarget > 0 ? (monthActual / monthTarget) * 100 : 0;

      return {
        month,
        target:             parseFloat(monthTarget.toFixed(2)),
        actual:             parseFloat(monthActual.toFixed(2)),
        variance:           parseFloat(monthVar.toFixed(2)),
        variancePercentage: parseFloat(monthVarPct.toFixed(1)),
        achievement:        parseFloat(monthAch.toFixed(1)),
        units_bks:  { target: parseFloat(monthTarget_bks.toFixed(2)),  actual: parseFloat(monthActual_bks.toFixed(2))  },
        units_slop: { target: parseFloat(monthTarget_slop.toFixed(2)), actual: parseFloat(monthActual_slop.toFixed(2)) },
        units_bal:  { target: parseFloat(monthTarget_bal.toFixed(2)),  actual: parseFloat(monthActual_bal.toFixed(2))  },
        units_dos:  { target: parseFloat(monthTarget_dos.toFixed(2)),  actual: parseFloat(monthActual_dos.toFixed(2))  },
        hasTarget:  hasMonthTarget,
      } as MonthlyBreakdown & { hasTarget: boolean };
    });

    const quarterActual = unitType === 'units_bks'  ? quarterRecords.reduce((sum, r) => sum + getUnitValueLocal(r, 'units_bks'),  0)
                        : unitType === 'units_slop' ? quarterRecords.reduce((sum, r) => sum + getUnitValueLocal(r, 'units_slop'), 0)
                        : unitType === 'units_bal'  ? quarterRecords.reduce((sum, r) => sum + getUnitValueLocal(r, 'units_bal'),  0)
                        : quarterRecords.reduce((sum, r) => sum + getUnitValueLocal(r, 'units_dos'), 0);

    quarterlyData.push({
      quarter,
      target:             parseFloat(quarterTargetForUnit.toFixed(2)),
      actual:             parseFloat(quarterActual.toFixed(2)),
      variance:           parseFloat((quarterActual - quarterTargetForUnit).toFixed(2)),
      variancePercentage: quarterTargetForUnit > 0 ? parseFloat(((quarterActual - quarterTargetForUnit) / quarterTargetForUnit * 100).toFixed(1)) : 0,
      details,
      weeklyBreakdown,
      monthlyBreakdown,
    });
  }

  return quarterlyData;
}

/**
 * Generate L4W vs C1W data
 */
function generateL4WC4WData(records: any[], currentYear?: number, filters?: FetchFilters): L4WC4WData {
  const empty: L4WC4WData = { l4wAverage: 0, c4wAverage: 0, c1wValue: 0, variance: 0, variancePercentage: 0, weeklyTrendData: [] };

  if (records.length === 0) return empty;

  const effectiveYear = filters?.year2 ?? currentYear;
  const filteredRecords = effectiveYear !== undefined
    ? records.filter(r => (r.year ?? new Date(r.date).getFullYear()) === effectiveYear)
    : records;
  const effectiveRecords = filteredRecords.length > 0 ? filteredRecords : records;

  const weeklyTotalsMap = new Map<string, { year: number; week: number; total: number }>();
  const selectedUnit = filters?.selectedUnit || 'units_dos';

  for (const record of effectiveRecords) {
    const week = Number(record.week) || 0;
    if (week <= 0) continue;
    const year      = record.year ?? new Date(record.date).getFullYear();
    const key       = `${year}-${week.toString().padStart(2, '0')}`;
    const unitValue = getUnitValue(record, selectedUnit);

    if (!weeklyTotalsMap.has(key)) {
      weeklyTotalsMap.set(key, { year, week, total: unitValue });
    } else {
      weeklyTotalsMap.get(key)!.total += unitValue;
    }
  }

  const weeklyTotals = Array.from(weeklyTotalsMap.values())
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.week - b.week);

  if (weeklyTotals.length < 2) {
    const c1wValue = weeklyTotals[weeklyTotals.length - 1]?.total ?? 0;
    return { ...empty, c4wAverage: Math.round(c1wValue), c1wValue: Math.round(c1wValue) };
  }

  const c1wEntry    = weeklyTotals[weeklyTotals.length - 1];
  const c1wValue    = c1wEntry.total;
  const l4wWeeks    = weeklyTotals.slice(Math.max(0, weeklyTotals.length - 5), weeklyTotals.length - 1);

  if (l4wWeeks.length === 0) return { ...empty, c1wValue: Math.round(c1wValue) };

  const l4wAverageRaw = l4wWeeks.reduce((sum, e) => sum + e.total, 0) / l4wWeeks.length;
  const nums          = l4wWeeks.map(w => w.week).sort((a, b) => a - b);
  const l4wWeekRange  = nums[0] === nums[nums.length - 1] ? `Week ${nums[0]}` : `Week ${nums[0]}-${nums[nums.length - 1]}`;

  const weeklyTrendData: WeeklyTrendData[] = [
    ...l4wWeeks.map((entry): WeeklyTrendData => ({
      week:   `W${entry.week.toString().padStart(2, '0')}`,
      value:  Math.round(entry.total),
      period: 'L4W',
    })),
    {
      week:   `W${c1wEntry.week.toString().padStart(2, '0')}`,
      value:  Math.round(c1wValue),
      period: 'C1W',
    },
  ];

  return {
    l4wAverage:      Math.round(l4wAverageRaw),
    c4wAverage:      0,
    c1wValue:        Math.round(c1wValue),
    variance:        0,
    variancePercentage: 0,
    weeklyTrendData,
    l4wWeekRange,
    c1wWeekNumber:   c1wEntry.week,
    productDetails:  generateProductL4WC1WData(effectiveRecords, c1wEntry.week, l4wWeeks.map(w => w.week)),
  } as L4WC4WData;
}

/**
 * Generate product detail data untuk L4W vs C1W per produk
 */
function generateProductL4WC1WData(records: any[], c1wWeek: number, l4wWeeks: number[]): ProductL4WC1WData[] {
  type WeekEntry = { omzet: number; units_bks: number; units_slop: number; units_bal: number; units_dos: number };

  const productMap = new Map<string, Map<number, WeekEntry>>();

  for (const record of records) {
    const product    = record.product || 'Produk tidak diketahui';
    const week       = Number(record.week) || 0;
    const omzet      = getOmzetValue(record);
    const units_bks  = Number(record.units_bks)  || 0;
    const units_slop = Number(record.units_slop) || 0;
    const units_bal  = Number(record.units_bal)  || 0;
    const units_dos  = Number(record.units_dos)  || 0;

    if (!productMap.has(product)) productMap.set(product, new Map());
    const weekMap  = productMap.get(product)!;
    const existing = weekMap.get(week) ?? { omzet: 0, units_bks: 0, units_slop: 0, units_bal: 0, units_dos: 0 };
    weekMap.set(week, {
      omzet:      existing.omzet      + omzet,
      units_bks:  existing.units_bks  + units_bks,
      units_slop: existing.units_slop + units_slop,
      units_bal:  existing.units_bal  + units_bal,
      units_dos:  existing.units_dos  + units_dos,
    });
  }

  const fallbackEntry: WeekEntry = { omzet: 0, units_bks: 0, units_slop: 0, units_bal: 0, units_dos: 0 };
  const year = records.length > 0
    ? (records[0].year ?? new Date(records[0].date).getFullYear())
    : new Date().getFullYear();

  const productData: ProductL4WC1WData[] = [];

  for (const [product, weekMap] of productMap.entries()) {
    const c1wData    = weekMap.get(c1wWeek) ?? fallbackEntry;
    const l4wEntries = l4wWeeks
      .map(w => weekMap.get(w))
      .filter((d): d is WeekEntry => d !== undefined && d.omzet > 0);

    const avg = (arr: WeekEntry[], key: keyof WeekEntry): number =>
      l4wEntries.length > 0 ? arr.reduce((s, d) => s + (d[key] as number), 0) / arr.length : 0;
    const sum = (arr: WeekEntry[], key: keyof WeekEntry): number =>
      arr.reduce((s, d) => s + (d[key] as number), 0);

    const l4wAvg: WeekEntry = {
      omzet:      avg(l4wEntries, 'omzet'),
      units_bks:  avg(l4wEntries, 'units_bks'),
      units_slop: avg(l4wEntries, 'units_slop'),
      units_bal:  avg(l4wEntries, 'units_bal'),
      units_dos:  avg(l4wEntries, 'units_dos'),
    };
    const l4wTotal: WeekEntry = {
      omzet:      sum(l4wEntries, 'omzet'),
      units_bks:  sum(l4wEntries, 'units_bks'),
      units_slop: sum(l4wEntries, 'units_slop'),
      units_bal:  sum(l4wEntries, 'units_bal'),
      units_dos:  sum(l4wEntries, 'units_dos'),
    };

    const variance           = c1wData.omzet - l4wAvg.omzet;
    const variancePercentage = l4wAvg.omzet > 0 ? (variance / l4wAvg.omzet) * 100 : 0;

    productData.push({
      product,
      year,
      l4wValue:  Math.round(l4wAvg.omzet),
      c1wValue:  Math.round(c1wData.omzet),
      variance:  Math.round(variance),
      variancePercentage: Math.round(variancePercentage * 10) / 10,
      units_bks:  { l4w: Math.round(l4wAvg.units_bks   * 100) / 100, c1w: Math.round(c1wData.units_bks   * 100) / 100, l4wTotal: Math.round(l4wTotal.units_bks  * 100) / 100 },
      units_slop: { l4w: Math.round(l4wAvg.units_slop  * 100) / 100, c1w: Math.round(c1wData.units_slop  * 100) / 100, l4wTotal: Math.round(l4wTotal.units_slop * 100) / 100 },
      units_bal:  { l4w: Math.round(l4wAvg.units_bal   * 100) / 100, c1w: Math.round(c1wData.units_bal   * 100) / 100, l4wTotal: Math.round(l4wTotal.units_bal  * 100) / 100 },
      units_dos:  { l4w: Math.round(l4wAvg.units_dos   * 100) / 100, c1w: Math.round(c1wData.units_dos   * 100) / 100, l4wTotal: Math.round(l4wTotal.units_dos  * 100) / 100 },
    });
  }

  return productData.sort((a, b) => b.c1wValue - a.c1wValue);
}

/**
 * Generate outlet contribution data
 */
function generateOutletData(records: any[]): OutletSalesData[] {
  type CustomerEntry = {
    dozNet:      number;
    city:        string;
    district:    string;
    village:     string;
    salesman:    string;
    customer_no: string;
  };
  type CustomerMap = Map<string, CustomerEntry>;
  type ProductMap  = Map<string, CustomerMap>;
  type CategoryMap = Map<string, ProductMap>;
  type WeekMap     = Map<number, CategoryMap>;
  type YearMap     = Map<number, WeekMap>;
  const outletMap  = new Map<string, YearMap>();

  records.forEach(record => {
    const outletType  = record.customer_type || 'Tipe Customer tidak diketahui';
    const week        = Number(record.week)      || 0;
    const dozNet      = Number(record.units_dos) || 0;
    const product     = record.product           || 'Produk tidak diketahui';
    const year: number = (record.year as number) || new Date(record.date).getFullYear();
    const category    = getProductCategory(product);

    let city     = (record.city     || '').trim() || 'Tidak diketahui';
    let district = (record.district || '').trim() || 'Tidak diketahui';
    const area   = (record.area     || '').trim();

    if ((city === 'Unknown' || district === 'Unknown') && area.length > 0) {
      if (area.includes(',')) {
        const parts = area.split(',').map((p: string) => p.trim());
        if (district === 'Unknown' && parts[0]) district = parts[0];
        if (city     === 'Unknown' && parts[1]) city     = parts[1];
      } else if (city === 'Unknown') {
        city = area;
      }
    }

    const village     = record.village      || 'Unknown';
    const customer    = record.customer     || 'Unknown';
    const customer_no = record.customer_no  || '';
    const salesman    = record.salesman     || 'Unknown';

    const customerKey = customer_no ? `${customer_no}||${customer}` : `||${customer}`;

    if (!outletMap.has(outletType)) outletMap.set(outletType, new Map());
    const yearMap = outletMap.get(outletType)!;
    if (!yearMap.has(year)) yearMap.set(year, new Map());
    const weekMap = yearMap.get(year)!;
    if (!weekMap.has(week)) weekMap.set(week, new Map());
    const categoryMap = weekMap.get(week)!;
    if (!categoryMap.has(category)) categoryMap.set(category, new Map());
    const productMap = categoryMap.get(category)!;
    if (!productMap.has(product)) productMap.set(product, new Map());
    const customerMap = productMap.get(product)!;

    const current = customerMap.get(customerKey);
    if (current) {
      current.dozNet += dozNet;
    } else {
      customerMap.set(customerKey, { dozNet, city, district, village, salesman, customer_no });
    }
  });

  const outletData: OutletSalesData[] = [];

  outletMap.forEach((yearMap: YearMap, outletType: string) => {
    yearMap.forEach((weekMap: WeekMap, year: number) => {
      weekMap.forEach((categoryMap: CategoryMap, week: number) => {
        categoryMap.forEach((productMap: ProductMap, category: string) => {
          productMap.forEach((customerMap: CustomerMap, product: string) => {
            customerMap.forEach((data: CustomerEntry, customerKey: string) => {
              const separatorIdx = customerKey.indexOf('||');
              const customer     = customerKey.slice(separatorIdx + 2);

              outletData.push({
                week,
                year,
                outletType,
                category,
                product,
                dozNet:      data.dozNet,
                city:        data.city,
                district:    data.district,
                village:     data.village,
                customer,
                customer_no: data.customer_no,
                salesman:    data.salesman,
              });
            });
          });
        });
      });
    });
  });

  return outletData;
}

/**
 * Generate pertumbuhan year-on-year
 */
function generateYearOnYearGrowth(records: any[], previousYear: number, currentYear: number, selectedUnit?: string): YearOnYearGrowth {
  const unitType  = selectedUnit || 'units_dos';
  const prevTotal = records.filter(r => r.year === previousYear).reduce((sum, r) => sum + getUnitValue(r, unitType), 0);
  const currTotal = records.filter(r => r.year === currentYear).reduce((sum, r) => sum + getUnitValue(r, unitType), 0);
  const variance  = currTotal - prevTotal;
  return {
    previousYearTotal:  Math.round(prevTotal),
    currentYearTotal:   Math.round(currTotal),
    variance:           Math.round(variance),
    variancePercentage: prevTotal > 0 ? Math.round((variance / prevTotal) * 100 * 10) / 10 : 0,
  };
}

// ─── Fallback empty data generators ──────────────────────────────────────────
function generateEmptyQuarterlyData(): QuarterlyData[] {
  return ['Q1', 'Q2', 'Q3', 'Q4'].map(quarter => ({
    quarter, target: 0, actual: 0, variance: 0, variancePercentage: 0,
    weeklyBreakdown: [], monthlyBreakdown: [],
  }));
}

function generateEmptyL4WC4WData(): L4WC4WData {
  return { l4wAverage: 0, c4wAverage: 0, c1wValue: 0, variance: 0, variancePercentage: 0, weeklyTrendData: [], l4wWeekRange: '', c1wWeekNumber: 0 };
}

function generateEmptyYearOnYearGrowth(): YearOnYearGrowth {
  return { previousYearTotal: 0, currentYearTotal: 0, variance: 0, variancePercentage: 0 };
}

function generateEmptyComparisonWeeks(): ComparisonWeeks {
  return { previousYear: null, currentYear: null };
}
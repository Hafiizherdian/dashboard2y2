/**
 * Database utilities untuk dashboard
 * Fungsi untuk fetch dan process data dari PostgreSQL
 */

import { pool } from './db';
import { SalesData, WeeklySales, QuarterlyData, WeekComparison, L4WC4WData, YearOnYearGrowth, ComparisonWeeks, WeekComparisonProductDetail } from '@/types/sales';

const OMZET_SCALE = 1;

function getOmzetValue(record: any): number {
  if (!record) {
    return 0;
  }

  if (typeof record.omzetValue === 'number') {
    return record.omzetValue;
  }

  const raw = record.omzet;
  const numeric = typeof raw === 'number' ? raw : parseFloat(raw ?? '0');
  const normalized = Number.isFinite(numeric) ? numeric * OMZET_SCALE : 0;
  record.omzetValue = normalized;
  return normalized;
}

interface FetchFilters {
  year1?: number;
  year2?: number;
  product?: string;
  weekStart1?: number;
  weekEnd1?: number;
  weekStart2?: number;
  weekEnd2?: number;
}

/**
 * Fetch sales data dari database dengan filter
 */
export async function fetchSalesData(filters?: FetchFilters): Promise<SalesData> {
  try {

    // Fetch raw data
    const params = new URLSearchParams();

    if (filters?.year1 !== undefined) {
      params.append('year1', filters.year1.toString());
    }
    if (filters?.year2 !== undefined) {
      params.append('year2', filters.year2.toString());
    }
    if (filters?.weekStart1 !== undefined) {
      params.append('weekStart1', filters.weekStart1.toString());
    }
    if (filters?.weekEnd1 !== undefined) {
      params.append('weekEnd1', filters.weekEnd1.toString());
    }
    if (filters?.weekStart2 !== undefined) {
      params.append('weekStart2', filters.weekStart2.toString());
    }
    if (filters?.weekEnd2 !== undefined) {
      params.append('weekEnd2', filters.weekEnd2.toString());
    }
    if (filters?.product && filters.product.trim().length > 0) {
      params.append('product', filters.product.trim());
    }

    params.append('limit', '1000000');

    const response = await fetch('/api/sales?' + params.toString());

    if (!response.ok) {
      throw new Error('Failed to fetch sales data');
    }

    const result = await response.json();
    const records = result.data || [];

    // Process data untuk dashboard components
    const processedData = processSalesRecords(records, filters);

    return processedData;

  } catch (error) {
    console.error('Error fetching sales data:', error);
    
    // Return empty data structure if database fails
    return {
      weeklyData: [],
      quarterlyData: generateEmptyQuarterlyData(),
      weekComparisons: [],
      l4wc4wData: generateEmptyL4WC4WData(),
      yearOnYearGrowth: generateEmptyYearOnYearGrowth(),
      comparisonYears: {
        previousYear: null,
        currentYear: null
      },
      comparisonWeeks: generateEmptyComparisonWeeks()
    };
  }
}

/**
 * Process raw sales records menjadi dashboard data
 */
function processSalesRecords(records: any[], filters?: FetchFilters): SalesData {
  if (records.length === 0) {
    return {
      weeklyData: [],
      quarterlyData: generateEmptyQuarterlyData(),
      weekComparisons: [],
      l4wc4wData: generateEmptyL4WC4WData(),
      yearOnYearGrowth: generateEmptyYearOnYearGrowth(),
      comparisonYears: {
        previousYear: null,
        currentYear: null
      },
      comparisonWeeks: generateEmptyComparisonWeeks()
    };
  }

  // Group data by week and year
  const weeklyMap = new Map<string, any[]>();
  const yearSet = new Set<number>();
  const weekSetByYear = new Map<number, Set<number>>();
  
  records.forEach(record => {
    const year = new Date(record.date).getFullYear();
    record.year = year;
    yearSet.add(year);
    getOmzetValue(record);
    const key = `${year}-${record.week}`;
    if (!weeklyMap.has(key)) {
      weeklyMap.set(key, []);
    }
    weeklyMap.get(key)!.push(record);

    if (!weekSetByYear.has(year)) {
      weekSetByYear.set(year, new Set());
    }
    weekSetByYear.get(year)!.add(record.week);
  });

  const sortedYears = Array.from(yearSet).sort((a, b) => a - b);
  const currentYear = filters?.year2 ?? sortedYears[sortedYears.length - 1];
  const previousYear = filters?.year1 ?? (sortedYears.length > 1 ? sortedYears[sortedYears.length - 2] : currentYear);
  const comparisonYears = {
    previousYear: previousYear ?? null,
    currentYear: currentYear ?? null
  };

  const getWeekRangeFromData = (year?: number) => {
    if (year === undefined) return null;
    const weeks = weekSetByYear.get(year);
    if (!weeks || weeks.size === 0) {
      return null;
    }
    const sortedWeeks = Array.from(weeks).sort((a, b) => a - b);
    return {
      start: sortedWeeks[0],
      end: sortedWeeks[sortedWeeks.length - 1]
    };
  };

  const normalizeWeekRange = (start?: number, end?: number, fallback?: { start: number; end: number } | null) => {
    let rangeStart = start ?? fallback?.start ?? 1;
    let rangeEnd = end ?? fallback?.end ?? 52;

    if (rangeStart > rangeEnd) {
      [rangeStart, rangeEnd] = [rangeEnd, rangeStart];
    }

    rangeStart = Math.max(1, Math.min(rangeStart, 52));
    rangeEnd = Math.max(1, Math.min(rangeEnd, 52));

    return { start: rangeStart, end: rangeEnd };
  };

  const previousYearWeekRange = previousYear !== undefined
    ? normalizeWeekRange(filters?.weekStart1, filters?.weekEnd1, getWeekRangeFromData(previousYear))
    : null;

  const currentYearWeekRange = currentYear !== undefined
    ? normalizeWeekRange(filters?.weekStart2, filters?.weekEnd2, getWeekRangeFromData(currentYear))
    : null;

  const comparisonWeeks = {
    previousYear: previousYearWeekRange,
    currentYear: currentYearWeekRange
  };

  // Generate weekly data
  const weeklyData: WeeklySales[] = [];
  const weekComparisons: WeekComparison[] = [];

  // Get all unique products from both years
  const allProductsSet = new Set<string>();
  records.forEach(record => {
    if (record.product) {
      allProductsSet.add(record.product);
    }
  });

  // Process weekly comparisons
  const prevRange = comparisonWeeks.previousYear;
  const currRange = comparisonWeeks.currentYear;

  for (let week = 1; week <= 52; week++) {
    const prevYearWeekData = previousYear !== undefined ? (weeklyMap.get(`${previousYear}-${week}`) || []) : [];
    const currYearWeekData = currentYear !== undefined ? (weeklyMap.get(`${currentYear}-${week}`) || []) : [];

    const prevYearInRange = prevRange ? week >= prevRange.start && week <= prevRange.end : true;
    const currYearInRange = currRange ? week >= currRange.start && week <= currRange.end : true;

    const productTotalsMap = new Map<string, { 
        previous: number; 
        current: number; 
        units_bks: { previous: number; current: number };
        units_slop: { previous: number; current: number };
        units_bal: { previous: number; current: number };
        units_dos: { previous: number; current: number };
      }>();

    // Initialize all products with 0 values
    allProductsSet.forEach(product => {
      productTotalsMap.set(product, { 
        previous: 0, 
        current: 0,
        units_bks: { previous: 0, current: 0 },
        units_slop: { previous: 0, current: 0 },
        units_bal: { previous: 0, current: 0 },
        units_dos: { previous: 0, current: 0 }
      });
    });

    if (prevYearInRange) {
      for (const record of prevYearWeekData) {
        const productName = record.product ?? 'Produk Tidak Diketahui';
        const totals = productTotalsMap.get(productName);
        if (totals) {
          totals.previous += getOmzetValue(record);
          // Include all valid numeric values (positive and negative) - exclude only NaN
          const bksVal = Number(record.units_bks);
          const slopVal = Number(record.units_slop);
          const balVal = Number(record.units_bal);
          const dosVal = Number(record.units_dos);
          
          if (!isNaN(bksVal)) totals.units_bks.previous += bksVal;
          if (!isNaN(slopVal)) totals.units_slop.previous += slopVal;
          if (!isNaN(balVal)) totals.units_bal.previous += balVal;
          if (!isNaN(dosVal)) totals.units_dos.previous += dosVal;
        }
      }
    }

    if (currYearInRange) {
      for (const record of currYearWeekData) {
        const productName = record.product ?? 'Produk Tidak Diketahui';
        const totals = productTotalsMap.get(productName);
        if (totals) {
          totals.current += getOmzetValue(record);
          // Include all valid numeric values (positive and negative) - exclude only NaN
          const bksVal = Number(record.units_bks);
          const slopVal = Number(record.units_slop);
          const balVal = Number(record.units_bal);
          const dosVal = Number(record.units_dos);
          
          if (!isNaN(bksVal)) totals.units_bks.current += bksVal;
          if (!isNaN(slopVal)) totals.units_slop.current += slopVal;
          if (!isNaN(balVal)) totals.units_bal.current += balVal;
          if (!isNaN(dosVal)) totals.units_dos.current += dosVal;
        }
      }
    }

    const prevYearSales = prevYearInRange
      ? prevYearWeekData.reduce((sum, record) => sum + getOmzetValue(record), 0)
      : 0;
    const currYearSales = currYearInRange
      ? currYearWeekData.reduce((sum, record) => sum + getOmzetValue(record), 0)
      : 0;

    const details: WeekComparisonProductDetail[] = Array.from(productTotalsMap.entries())
      .map(([product, totals]) => {
        const variance = totals.current - totals.previous;
        const variancePercentage = totals.previous > 0 ? (variance / totals.previous) * 100 : 0;
        
        return {
          product,
          previousYear: totals.previous,
          currentYear: totals.current,
          variance,
          variancePercentage,
          units_bks: { 
            previous: Number(totals.units_bks.previous) || 0, 
            current: Number(totals.units_bks.current) || 0 
          },
          units_slop: { 
            previous: Number(totals.units_slop.previous) || 0, 
            current: Number(totals.units_slop.current) || 0 
          },
          units_bal: { 
            previous: Number(totals.units_bal.previous) || 0, 
            current: Number(totals.units_bal.current) || 0 
          },
          units_dos: { 
            previous: Number(totals.units_dos.previous) || 0, 
            current: Number(totals.units_dos.current) || 0 
          },
        } satisfies WeekComparisonProductDetail;
      })
      .sort((a, b) => {
        // Sort by current year values: highest to lowest
        return b.currentYear - a.currentYear;
      });

    if (prevYearSales > 0 || currYearSales > 0) {
      weekComparisons.push({
        week,
        previousYear: prevYearSales,
        currentYear: currYearSales,
        variance: currYearSales - prevYearSales,
        variancePercentage: prevYearSales > 0 ? ((currYearSales - prevYearSales) / prevYearSales) * 100 : 0,
        details,
      });
    }

    // Add weekly data
    if (currYearSales > 0 && currentYear !== undefined && currYearInRange) {
      weeklyData.push({
        week,
        year: currentYear,
        sales: currYearSales,
        target: currYearSales * 1.1, // Estimated target
      });
    }
    if (prevYearSales > 0 && previousYear !== undefined && prevYearInRange) {
      weeklyData.push({
        week,
        year: previousYear,
        sales: prevYearSales,
        target: prevYearSales * 1.1,
      });
    }
  }

  // Generate quarterly data
  const quarterlyData = generateQuarterlyData(records, currentYear ?? sortedYears[sortedYears.length - 1]);

  // Generate L4W vs C4W data
  const l4wc4wData = generateL4WC4WData(records, currentYear);

  // Generate year-on-year data
  const yearOnYearGrowth = generateYearOnYearGrowth(records, previousYear ?? currentYear ?? sortedYears[0], currentYear ?? sortedYears[sortedYears.length - 1]);

  return {
    weeklyData,
    quarterlyData,
    weekComparisons,
    l4wc4wData,
    yearOnYearGrowth,
    comparisonYears,
    comparisonWeeks
  };
}

/**
 * Generate quarterly data dari records
 */
function generateQuarterlyData(records: any[], year: number): QuarterlyData[] {
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const quarterlyData: QuarterlyData[] = [];

  quarters.forEach((quarter, index) => {
    const startWeek = index * 13 + 1;
    const endWeek = Math.min((index + 1) * 13, 52);
    
    const quarterRecords = records.filter(record => 
      record.year === year && record.week >= startWeek && record.week <= endWeek
    );

    const actual = quarterRecords.reduce((sum, record) => sum + getOmzetValue(record), 0);
    const target = actual > 0 ? actual * 1.1 : 100000; // Estimated target
    const variance = actual - target;

    quarterlyData.push({
      quarter,
      target: Math.round(target),
      actual: Math.round(actual),
      variance: Math.round(variance),
      variancePercentage: target > 0 ? Math.round((variance / target) * 100 * 10) / 10 : 0
    });
  });

  return quarterlyData;
}

/**
 * Generate L4W vs C4W data
 */
function generateL4WC4WData(records: any[], currentYear?: number): L4WC4WData {
  if (records.length === 0) {
    return {
      l4wAverage: 0,
      c4wAverage: 0,
      variance: 0,
      variancePercentage: 0
    };
  }

  const recordsForYear = currentYear
    ? records.filter(record => {
        const year = record.year ?? new Date(record.date).getFullYear();
        return year === currentYear;
      })
    : records;

  const effectiveRecords = recordsForYear.length > 0 ? recordsForYear : records;

  const weeklyTotalsMap = new Map<string, { year: number; week: number; total: number; timestamp: number }>();

  for (const record of effectiveRecords) {
    const date = new Date(record.date);
    const week = Number(record.week) || 0;
    if (isNaN(date.getTime()) || week <= 0) {
      continue;
    }

    const year = record.year ?? date.getFullYear();
    const key = `${year}-${week.toString().padStart(2, '0')}`;
    const omzet = getOmzetValue(record);

    if (!weeklyTotalsMap.has(key)) {
      weeklyTotalsMap.set(key, {
        year,
        week,
        total: omzet,
        timestamp: date.getTime()
      });
    } else {
      const entry = weeklyTotalsMap.get(key)!;
      entry.total += omzet;
      entry.timestamp = Math.max(entry.timestamp, date.getTime());
    }
  }

  const weeklyTotals = Array.from(weeklyTotalsMap.values()).sort((a, b) => a.timestamp - b.timestamp);

  if (weeklyTotals.length < 4) {
    return {
      l4wAverage: 0,
      c4wAverage: Math.round(
        weeklyTotals.reduce((sum, entry) => sum + entry.total, 0) /
          (weeklyTotals.length || 1)
      ),
      variance: 0,
      variancePercentage: 0
    };
  }

  const c4wWeeks = weeklyTotals.slice(-4);
  const l4wWeeks = weeklyTotals.slice(-8, -4);

  const l4wAverageRaw = l4wWeeks.length > 0
    ? l4wWeeks.reduce((sum, entry) => sum + entry.total, 0) / l4wWeeks.length
    : 0;

  const c4wAverageRaw = c4wWeeks.reduce((sum, entry) => sum + entry.total, 0) / c4wWeeks.length;

  const variance = c4wAverageRaw - l4wAverageRaw;

  return {
    l4wAverage: Math.round(l4wAverageRaw),
    c4wAverage: Math.round(c4wAverageRaw),
    variance: Math.round(variance),
    variancePercentage: l4wAverageRaw > 0 ? Math.round((variance / l4wAverageRaw) * 100 * 10) / 10 : 0
  };
}

/**
 * Generate year-on-year growth data
 */
function generateYearOnYearGrowth(records: any[], previousYear: number, currentYear: number): YearOnYearGrowth {
  const previousYearRecords = records.filter(record => record.year === previousYear);
  const currentYearRecords = records.filter(record => record.year === currentYear);

  const previousYearTotal = previousYearRecords.reduce((sum, record) => sum + getOmzetValue(record), 0);
  const currentYearTotal = currentYearRecords.reduce((sum, record) => sum + getOmzetValue(record), 0);
  const variance = currentYearTotal - previousYearTotal;

  return {
    previousYearTotal: Math.round(previousYearTotal),
    currentYearTotal: Math.round(currentYearTotal),
    variance: Math.round(variance),
    variancePercentage: previousYearTotal > 0 ? Math.round((variance / previousYearTotal) * 100 * 10) / 10 : 0
  };
}

// Fallback empty data generators
function generateEmptyQuarterlyData(): QuarterlyData[] {
  return ['Q1', 'Q2', 'Q3', 'Q4'].map(quarter => ({
    quarter,
    target: 0,
    actual: 0,
    variance: 0,
    variancePercentage: 0
  }));
}

function generateEmptyL4WC4WData(): L4WC4WData {
  return {
    l4wAverage: 0,
    c4wAverage: 0,
    variance: 0,
    variancePercentage: 0
  };
}

function generateEmptyYearOnYearGrowth(): YearOnYearGrowth {
  return {
    previousYearTotal: 0,
    currentYearTotal: 0,
    variance: 0,
    variancePercentage: 0
  };
}

function generateEmptyComparisonWeeks(): ComparisonWeeks {
  return {
    previousYear: null,
    currentYear: null
  };
}

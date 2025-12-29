/**
 * Database utilities untuk dashboard
 * Fungsi untuk fetch dan process data dari PostgreSQL
 */

import { SalesData, WeeklySales, QuarterlyData, WeekComparison, L4WC4WData, YearOnYearGrowth } from '@/types/sales';

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dashboard_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'cakra123',
};

/**
 * Fetch sales data dari database dengan filter
 */
export async function fetchSalesData(filters?: {
  year1?: number;
  year2?: number;
  product?: string;
}): Promise<SalesData> {
  try {

    // Fetch raw data
    const response = await fetch('/api/sales?' + new URLSearchParams({
      ...(filters?.year1 && { year1: filters.year1.toString() }),
      ...(filters?.year2 && { year2: filters.year2.toString() }),
      ...(filters?.product && { product: filters.product }),
      limit: '1000000' // Fetch sufficient rows for both years
    }));

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
      }
    };
  }
}

/**
 * Process raw sales records menjadi dashboard data
 */
function processSalesRecords(records: any[], filters?: { year1?: number; year2?: number }): SalesData {
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
      }
    };
  }

  // Group data by week and year
  const weeklyMap = new Map<string, any[]>();
  const yearSet = new Set<number>();
  
  records.forEach(record => {
    const year = new Date(record.date).getFullYear();
    record.year = year;
    yearSet.add(year);
    const key = `${year}-${record.week}`;
    if (!weeklyMap.has(key)) {
      weeklyMap.set(key, []);
    }
    weeklyMap.get(key)!.push(record);
  });

  const sortedYears = Array.from(yearSet).sort((a, b) => a - b);
  const currentYear = filters?.year2 ?? sortedYears[sortedYears.length - 1];
  const previousYear = filters?.year1 ?? (sortedYears.length > 1 ? sortedYears[sortedYears.length - 2] : currentYear);
  const comparisonYears = {
    previousYear: previousYear ?? null,
    currentYear: currentYear ?? null
  };

  // Generate weekly data
  const weeklyData: WeeklySales[] = [];
  const weekComparisons: WeekComparison[] = [];

  // Process weekly comparisons
  for (let week = 1; week <= 52; week++) {
    const prevYearWeekData = previousYear !== undefined ? (weeklyMap.get(`${previousYear}-${week}`) || []) : [];
    const currYearWeekData = currentYear !== undefined ? (weeklyMap.get(`${currentYear}-${week}`) || []) : [];

    const prevYearSales = prevYearWeekData.reduce((sum, record) => sum + parseFloat(record.omzet), 0);
    const currYearSales = currYearWeekData.reduce((sum, record) => sum + parseFloat(record.omzet), 0);

    if (prevYearSales > 0 || currYearSales > 0) {
      weekComparisons.push({
        week,
        previousYear: prevYearSales,
        currentYear: currYearSales,
        variance: currYearSales - prevYearSales,
        variancePercentage: prevYearSales > 0 ? ((currYearSales - prevYearSales) / prevYearSales) * 100 : 0,
      });
    }

    // Add weekly data
    if (currYearSales > 0 && currentYear !== undefined) {
      weeklyData.push({
        week,
        year: currentYear,
        sales: currYearSales,
        target: currYearSales * 1.1, // Estimated target
      });
    }
    if (prevYearSales > 0 && previousYear !== undefined) {
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
    comparisonYears
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

    const actual = quarterRecords.reduce((sum, record) => sum + (parseFloat(record.omzet) || 0), 0);
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
    const omzet = parseFloat(record.omzet) || 0;

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

  const previousYearTotal = previousYearRecords.reduce((sum, record) => sum + (parseFloat(record.omzet) || 0), 0);
  const currentYearTotal = currentYearRecords.reduce((sum, record) => sum + (parseFloat(record.omzet) || 0), 0);
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

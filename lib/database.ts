/**
 * Database utilities untuk dashboard
 * Fungsi untuk fetch dan process data dari PostgreSQL
 */

import { pool } from './db';
import { SalesData, WeeklySales, QuarterlyData, WeekComparison, L4WC4WData, YearOnYearGrowth, ComparisonWeeks, WeekComparisonProductDetail, WeeklyTrendData, OutletSalesData, ProductL4WC1WData } from '@/types/sales';

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

function getDosNetValue(record: any): number {
  if (!record) {
    return 0;
  }

  if (typeof record.dosNetValue === 'number') {
    return record.dosNetValue;
  }

  // Gunakan field units_dos yang ada di database
  const raw = record.units_dos || 0;
  const numeric = typeof raw === 'number' ? raw : parseFloat(raw ?? '0');
  const normalized = Number.isFinite(numeric) ? numeric : 0;
  record.dosNetValue = normalized;
  return normalized;
}

interface FetchFilters {
  year1?: number;
  year2?: number;
  product?: string;
  city?: string;
  area?: string;
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
    console.log('🔍 fetchSalesData - Filters received:', filters);

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
    if (filters?.city && filters.city.trim().length > 0) {
      params.append('city', filters.city.trim());
    }
    if (filters?.area && filters.area.trim().length > 0) {
      params.append('area', filters.area.trim());
    }

    params.append('limit', '1000000');

    console.log('📡 API Request URL:', '/api/sales?' + params.toString());

    const response = await fetch('/api/sales?' + params.toString());

    if (!response.ok) {
      throw new Error('Gagal untuk fetch sales data');
    }

    const result = await response.json();
    const records = result.data || [];

    // Process data untuk dashboard components
    const processedData = await processSalesRecords(records, filters);

    return processedData;

  } catch (error) {
    console.error('Error fetching sales data:', error);
    
    // Return empty data structure jika database gagal
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
      comparisonWeeks: generateEmptyComparisonWeeks(),
      outletData: []
    };
  }
}

/**
 * Process raw sales records menjadi dashboard data
 */
async function processSalesRecords(records: any[], filters?: FetchFilters): Promise<SalesData> {
  const areaId = filters?.area;
  
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
      comparisonWeeks: generateEmptyComparisonWeeks(),
      outletData: []
    };
  }

  // Group data berdasarkan week dan year
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

  // Generate data mingguan
  const weeklyData: WeeklySales[] = [];
  const weekComparisons: WeekComparison[] = [];

  // Get all unique products dari kedua tahun
  const allProductsSet = new Set<string>();
  records.forEach(record => {
    if (record.product) {
      allProductsSet.add(record.product);
    }
  });

  // Process perbandingan mingguan
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

    // Initialize all products dengan 0 values
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
        // Sort berdasarkan tahun yang di pilih : tinggi ke rendah
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

    // Add data mingguan
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

  // Generate quarterly data dengan target dari area
  const quarterlyData = await generateQuarterlyData(records, currentYear ?? sortedYears[sortedYears.length - 1], areaId);

  // Generate L4W vs C4W data
  const l4wc4wData = generateL4WC4WData(records, currentYear);

  // Generate year-on-year data
  const yearOnYearGrowth = generateYearOnYearGrowth(records, previousYear ?? currentYear ?? sortedYears[0], currentYear ?? sortedYears[sortedYears.length - 1]);

  // Generate outlet contribution data
  const outletData = generateOutletData(records);

  return {
    weeklyData,
    quarterlyData,
    weekComparisons,
    l4wc4wData,
    yearOnYearGrowth,
    comparisonYears,
    comparisonWeeks,
    outletData
  };
}

/**
 * Generate quarterly data dari records dengan target dari area
 */
async function generateQuarterlyData(records: any[], year: number, areaId?: string): Promise<QuarterlyData[]> {
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const quarterlyData: QuarterlyData[] = [];

  // Get area targets jika areaId disediakan
  let areaTargets: { [key: string]: number } = {};
  if (areaId) {
    try {
      const areasResponse = await fetch('/api/areas');
      if (areasResponse.ok) {
        const areasResult = await areasResponse.json();
        const area = areasResult.data?.areas?.find((a: any) => a.id === areaId);
        if (area?.quarterlyTargets) {
          areaTargets = area.quarterlyTargets;
        }
      }
    } catch (error) {
      console.error('Error fetching area targets:', error);
    }
  }

  quarters.forEach((quarter, index) => {
    const startWeek = index * 13 + 1;
    const endWeek = Math.min((index + 1) * 13, 52);
    
    const quarterRecords = records.filter(record => 
      record.year === year && record.week >= startWeek && record.week <= endWeek
    );

    const actual = quarterRecords.reduce((sum, record) => sum + getDosNetValue(record), 0);
    // Gunakan target dari area atau fallback ke estimasi
    const target = areaTargets[quarter] || (actual > 0 ? actual * 1.1 : 1000);
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
 * Generate L4W vs C1W data dengan data tren mingguan asli
 */
function generateL4WC4WData(records: any[], currentYear?: number): L4WC4WData {
  console.log('🔍 generateL4WC4WData - Input records:', records.length, 'currentYear:', currentYear);
  
  if (records.length === 0) {
    console.log('❌ No records found');
    return {
      l4wAverage: 0,
      c4wAverage: 0,
      c1wValue: 0,
      variance: 0,
      variancePercentage: 0,
      weeklyTrendData: []
    };
  }

  const recordsForYear = currentYear
    ? records.filter(record => {
        const year = record.year ?? new Date(record.date).getFullYear();
        return year === currentYear;
      })
    : records;

  const effectiveRecords = recordsForYear.length > 0 ? recordsForYear : records;
  console.log('📊 Effective records:', effectiveRecords.length);

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
  console.log('📈 Weekly totals:', weeklyTotals.length, 'weeks');
  console.log('📋 Weekly data:', weeklyTotals.map(w => ({ week: w.week, total: w.total })));

  // Cari minggu terakhir tahun sebelumnya (bukan minggu 1 tahun baru)
  const lastWeekEntry = weeklyTotals[weeklyTotals.length - 1];
  const lastWeekNumber = lastWeekEntry ? lastWeekEntry.week : 0;
  
  // Jika minggu terakhir adalah minggu 1, cari minggu terakhir tahun sebelumnya
  let c1wEntry = lastWeekEntry;
  if (lastWeekNumber === 1 && weeklyTotals.length > 1) {
    // Cari minggu dengan nomor tertinggi (biasanya minggu 52)
    c1wEntry = weeklyTotals.reduce((max, current) => 
      current.week > max.week ? current : max
    , weeklyTotals[0]);
  }
  
  console.log('🗓️ Last week entry:', { week: lastWeekNumber, total: lastWeekEntry?.total, timestamp: lastWeekEntry?.timestamp });
  console.log('🗓️ C1W entry (minggu terakhir tahun):', { week: c1wEntry?.week, total: c1wEntry?.total });

  if (weeklyTotals.length < 5) {
    const c1wValue = c1wEntry ? c1wEntry.total : 0;
    console.log('⚠️ Not enough weeks (< 5), using fallback');
    return {
      l4wAverage: 0,
      c4wAverage: Math.round(
        weeklyTotals.reduce((sum, entry) => sum + entry.total, 0) /
          (weeklyTotals.length || 1)
      ),
      c1wValue: Math.round(c1wValue),
      variance: 0,
      variancePercentage: 0,
      weeklyTrendData: []
    };
  }

  // C1W adalah minggu terakhir tahun (bukan minggu 1 tahun baru)
  const c1wValue = c1wEntry ? c1wEntry.total : 0;
  
  // L4W adalah 4 minggu sebelum C1W
  const c1wIndex = weeklyTotals.findIndex(entry => entry.week === c1wEntry?.week);
  const l4wWeeks = c1wIndex > 0 ? weeklyTotals.slice(Math.max(0, c1wIndex - 4), c1wIndex) : [];
  
  console.log('📊 C1W (minggu terakhir tahun):', c1wEntry?.week);
  console.log('📊 L4W weeks (4 minggu sebelum C1W):', l4wWeeks.map(w => w.week));
  console.log('💰 C1W value:', c1wValue);

  const l4wAverageRaw = l4wWeeks.length > 0
    ? l4wWeeks.reduce((sum, entry) => sum + entry.total, 0) / l4wWeeks.length
    : 0;
  
  // C4W tidak digunakan lagi, set ke 0
  const c4wAverageRaw = 0;
  const variance = 0; // Tidak ada variance karena tidak ada perbandingan

  // Generate weekly trend data dari data asli
  const weeklyTrendData: WeeklyTrendData[] = [];
  
  // Tambahkan data L4W (4 minggu sebelum C1W)
  l4wWeeks.forEach((entry, index) => {
    weeklyTrendData.push({
      week: `W-${l4wWeeks.length - index}`,
      value: Math.round(entry.total),
      period: 'L4W'
    });
  });

  // Tambahkan data C1W (minggu terakhir)
  if (c1wEntry) {
    weeklyTrendData.push({
      week: 'W+1',
      value: Math.round(c1wEntry.total),
      period: 'C1W'
    });
  }

  const result = {
    l4wAverage: Math.round(l4wAverageRaw),
    c4wAverage: Math.round(c4wAverageRaw), // 0
    c1wValue: Math.round(c1wValue),
    variance: Math.round(variance), // 0
    variancePercentage: 0, // 0
    weeklyTrendData,
    productDetails: generateProductL4WC1WData(effectiveRecords, c1wEntry?.week || 0, l4wWeeks.map(w => w.week))
  };

  console.log('✅ Final L4WC4W result:', result);
  return result;
}

/**
 * Generate product detail data untuk L4W vs C1W per produk
 */
function generateProductL4WC1WData(records: any[], c1wWeek: number, l4wWeeks: number[]): ProductL4WC1WData[] {
  // Group records by product with unit data
  const productMap = new Map<string, {
    weekData: Map<number, { omzet: number; units_bks: number; units_slop: number; units_bal: number; units_dos: number }>;
  }>();

  for (const record of records) {
    const product = record.product || 'Unknown';
    const week = Number(record.week) || 0;
    const omzet = getOmzetValue(record);
    const units_bks = Number(record.units_bks) || 0;
    const units_slop = Number(record.units_slop) || 0;
    const units_bal = Number(record.units_bal) || 0;
    const units_dos = Number(record.units_dos) || 0;

    if (!productMap.has(product)) {
      productMap.set(product, { weekData: new Map() });
    }

    const productData = productMap.get(product)!;
    const existing = productData.weekData.get(week) || { omzet: 0, units_bks: 0, units_slop: 0, units_bal: 0, units_dos: 0 };
    
    productData.weekData.set(week, {
      omzet: existing.omzet + omzet,
      units_bks: existing.units_bks + units_bks,
      units_slop: existing.units_slop + units_slop,
      units_bal: existing.units_bal + units_bal,
      units_dos: existing.units_dos + units_dos
    });
  }

  const productData: ProductL4WC1WData[] = [];

  for (const [product, productWeekData] of productMap.entries()) {
    const weekData = productWeekData.weekData;
    
    // C1W data (minggu terakhir tahun)
    const c1wData = weekData.get(c1wWeek) || { omzet: 0, units_bks: 0, units_slop: 0, units_bal: 0, units_dos: 0 };

    // L4W data (rata-rata 4 minggu sebelum C1W)
    const l4wDataList = l4wWeeks.map(week => weekData.get(week) || { omzet: 0, units_bks: 0, units_slop: 0, units_bal: 0, units_dos: 0 })
      .filter(data => data.omzet > 0);
    
    const l4wData = l4wDataList.length > 0 ? {
      omzet: l4wDataList.reduce((sum, data) => sum + data.omzet, 0) / l4wDataList.length,
      units_bks: l4wDataList.reduce((sum, data) => sum + data.units_bks, 0) / l4wDataList.length,
      units_slop: l4wDataList.reduce((sum, data) => sum + data.units_slop, 0) / l4wDataList.length,
      units_bal: l4wDataList.reduce((sum, data) => sum + data.units_bal, 0) / l4wDataList.length,
      units_dos: l4wDataList.reduce((sum, data) => sum + data.units_dos, 0) / l4wDataList.length
    } : { omzet: 0, units_bks: 0, units_slop: 0, units_bal: 0, units_dos: 0 };

    const variance = c1wData.omzet - l4wData.omzet;
    const variancePercentage = l4wData.omzet > 0 ? (variance / l4wData.omzet) * 100 : 0;

    // Get year from records (assume current year)
    const year = records.length > 0 ? 
      (records[0].year ?? new Date(records[0].date).getFullYear()) : 
      new Date().getFullYear();

    productData.push({
      product,
      year,
      l4wValue: Math.round(l4wData.omzet),
      c1wValue: Math.round(c1wData.omzet),
      variance: Math.round(variance),
      variancePercentage: Math.round(variancePercentage * 10) / 10,
      units_bks: {
        l4w: Math.round(l4wData.units_bks * 100) / 100,
        c1w: Math.round(c1wData.units_bks * 100) / 100
      },
      units_slop: {
        l4w: Math.round(l4wData.units_slop * 100) / 100,
        c1w: Math.round(c1wData.units_slop * 100) / 100
      },
      units_bal: {
        l4w: Math.round(l4wData.units_bal * 100) / 100,
        c1w: Math.round(c1wData.units_bal * 100) / 100
      },
      units_dos: {
        l4w: Math.round(l4wData.units_dos * 100) / 100,
        c1w: Math.round(c1wData.units_dos * 100) / 100
      }
    });
  }

  // Sort by current value (descending)
  return productData.sort((a, b) => b.c1wValue - a.c1wValue);
}

/**
 * Generate outlet contribution data dari records
 */
function generateOutletData(records: any[]): OutletSalesData[] {
  // console.log('generateOutletData: Input records count:', records.length);
  // console.log('generateOutletData: Sample record:', records[0]);
  
  const outletMap = new Map<string, Map<number, Map<string, Map<string, number>>>>(); // outletType -> (week -> (category -> (product -> dozNet)))
  
  records.forEach(record => {
    const outletType = record.customer_type || 'Unknown'; 
    const week = Number(record.week) || 0;
    const dozNet = Number(record.units_dos) || 0; // Menggunakan units_dos sebagai DOZ Net
    const category = record.category || 'Unknown';
    const product = record.product || 'Unknown';
    const year = record.year || new Date(record.date).getFullYear();
    
    // console.log(`Processing record: outletType=${outletType}, week=${week}, category=${category}, product=${product}, dozNet=${dozNet}`);
    
    if (!outletMap.has(outletType)) {
      outletMap.set(outletType, new Map());
    }
    
    const weekMap = outletMap.get(outletType)!;
    if (!weekMap.has(week)) {
      weekMap.set(week, new Map());
    }
    
    const categoryMap = weekMap.get(week)!;
    if (!categoryMap.has(category)) {
      categoryMap.set(category, new Map());
    }
    
    const productMap = categoryMap.get(category)!;
    const current = productMap.get(product) || 0;
    productMap.set(product, current + dozNet);
  });
  
  const outletData: OutletSalesData[] = [];
  
  outletMap.forEach((weekMap, outletType) => {
    weekMap.forEach((categoryMap, week) => {
      // Get year dari segala record dengan minggu yang dipilih
      const sampleRecord = records.find(r => Number(r.week) === week);
      const year = sampleRecord?.year || new Date().getFullYear();
      
      // Create entry untuk setiap kombinasi category dan product 
      categoryMap.forEach((productMap, category) => {
        productMap.forEach((dozNet, product) => {
          // console.log(`Creating outletData: ${outletType}, ${category}, ${product}, W${week}, dozNet=${dozNet}`);
          outletData.push({
            week,
            year,
            outletType,
            category,
            product,
            dozNet
          });
        });
      });
    });
  });
  
  // console.log('generateOutletData: Output outletData count:', outletData.length);
  // console.log('generateOutletData: Sample outletData:', outletData[0]);
  
  return outletData;
}

/**
 * Generate pertumbuhan data year-on-year
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
    c1wValue: 0,
    variance: 0,
    variancePercentage: 0,
    weeklyTrendData: []
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

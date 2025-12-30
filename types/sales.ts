/**
 * Type definitions untuk data penjualan
 * 
 * Mendefinisikan struktur data yang digunakan dalam dashboard analisis penjualan
 */

/**
 * Data penjualan mingguan untuk satu tahun
 */
export interface WeeklySales {
  week: number;        // Nomor minggu (1-52)
  year: number;         // Tahun penjualan
  sales: number;        // Total penjualan minggu tersebut
  target?: number;      // Target penjualan (opsional)
}

/**
 * Data kuartal dengan target dan actual
 */
export interface QuarterlyData {
  quarter: string;              // Kuartal (Q1, Q2, Q3, Q4)
  target: number;               // Target penjualan
  actual: number;               // Actual penjualan
  variance: number;             // Selisih actual - target
  variancePercentage: number;   // Persentase variance
}

/**
 * Data perbandingan mingguan antar tahun
 */
export interface WeekComparisonProductDetail {
  product: string;
  previousYear: number;
  currentYear: number;
  variance: number;
  variancePercentage: number;
  units_bks?: { previous: number; current: number };
  units_slop?: { previous: number; current: number };
  units_bal?: { previous: number; current: number };
  units_dos?: { previous: number; current: number };
}

export interface WeekComparison {
  week: number;                    // Nomor minggu
  previousYear: number;            // Penjualan tahun sebelumnya
  currentYear: number;             // Penjualan tahun sekarang
  variance: number;                // Selisih penjualan
  variancePercentage: number;      // Persentase variance
  details?: WeekComparisonProductDetail[];
}

/**
 * Data L4W vs C4W
 */
export interface L4WC4WData {
  l4wAverage: number;              // Rata-rata Last 4 Weeks
  c4wAverage: number;              // Rata-rata Current 4 Weeks
  variance: number;                 // Selisih C4W - L4W
  variancePercentage: number;      // Persentase variance
}

/**
 * Data pertumbuhan tahun ke tahun
 */
export interface YearOnYearGrowth {
  previousYearTotal: number;       // Total penjualan tahun sebelumnya
  currentYearTotal: number;        // Total penjualan tahun sekarang
  variance: number;                 // Selisih penjualan
  variancePercentage: number;      // Persentase pertumbuhan
}

export interface ComparisonYears {
  previousYear: number | null;
  currentYear: number | null;
}

export interface WeekRange {
  start: number;
  end: number;
}

export interface ComparisonWeeks {
  previousYear: WeekRange | null;
  currentYear: WeekRange | null;
}

/**
 * Data penjualan lengkap untuk dashboard
 */
export interface SalesData {
  weeklyData: WeeklySales[];
  quarterlyData: QuarterlyData[];
  weekComparisons: WeekComparison[];
  l4wc4wData: L4WC4WData;
  yearOnYearGrowth: YearOnYearGrowth;
  comparisonYears: ComparisonYears;
  comparisonWeeks: ComparisonWeeks;
}

/**
 * Data penjualan untuk CMS (dengan ID dan produk)
 */
export interface SalesDataCMS {
  id: string;
  week: number;
  year: number;
  sales: number;
  target: number;
  product: string;
  region: string;
}

/**
 * Partial data untuk form tambah data
 */
export interface PartialSalesData {
  week?: number;
  year?: number;
  sales?: number;
  target?: number;
  product?: string;
  region?: string;
}

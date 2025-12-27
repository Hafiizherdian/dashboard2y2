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
  quarter: string;              // Nama kuartal (Q1, Q2, Q3, Q4)
  target: number;               // Target penjualan kuartal
  actual: number;               // Actual penjualan kuartal
  variance: number;             // Selisih actual - target
  variancePercentage: number;  // Persentase variance ((actual - target) / target * 100)
}

/**
 * Data perbandingan penjualan mingguan antar tahun
 */
export interface WeekComparison {
  week: number;                 // Nomor minggu
  previousYear: number;         // Penjualan tahun sebelumnya
  currentYear: number;          // Penjualan tahun sekarang
  variance: number;             // Selisih currentYear - previousYear
  variancePercentage: number;   // Persentase variance
}

/**
 * Data perbandingan Last 4 Weeks vs Current 4 Weeks
 */
export interface L4WC4WData {
  l4wAverage: number;           // Rata-rata penjualan 4 minggu terakhir
  c4wAverage: number;           // Rata-rata penjualan 4 minggu sekarang
  variance: number;             // Selisih c4wAverage - l4wAverage
  variancePercentage: number;   // Persentase variance
}

/**
 * Data pertumbuhan tahun ke tahun
 */
export interface YearOnYearGrowth {
  previousYearTotal: number;    // Total penjualan tahun sebelumnya
  currentYearTotal: number;     // Total penjualan tahun sekarang
  variance: number;             // Selisih currentYearTotal - previousYearTotal
  variancePercentage: number;   // Persentase pertumbuhan YoY
}

/**
 * Struktur data lengkap untuk dashboard
 */
export interface SalesData {
  weeklyData: WeeklySales[];           // Data penjualan mingguan (2 tahun)
  quarterlyData: QuarterlyData[];      // Data kuartal
  weekComparisons: WeekComparison[];    // Perbandingan mingguan
  l4wc4wData: L4WC4WData;              // Data L4W vs C4W
  yearOnYearGrowth: YearOnYearGrowth;   // Data pertumbuhan YoY
}

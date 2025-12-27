/**
 * Mock data generator untuk dashboard penjualan
 * 
 * Menghasilkan data simulasi berdasarkan struktur data penjualan Malang 2024
 * Data ini digunakan untuk demonstrasi dan testing dashboard
 * 
 * Berdasarkan file Excel "Analisa Sales Malang 2024 - w 50.xlsm" yang berisi:
 * - Data penjualan per produk per minggu (Week 1-52)
 * - Data kuartal dengan target dan actual
 * - Data distribusi per kecamatan dan outlet
 * - Data stok dan produk
 */

import { SalesData, WeeklySales, QuarterlyData, WeekComparison, L4WC4WData, YearOnYearGrowth } from '@/types/sales';

/**
 * Generate data penjualan mingguan untuk satu tahun
 * Berdasarkan pola penjualan produk rokok di Malang 2024
 * @param year - Tahun yang akan digenerate
 * @returns {WeeklySales[]} Array data penjualan mingguan
 */
const generateWeeklyData = (year: number): WeeklySales[] => {
  const data: WeeklySales[] = [];
  const products = ['CAKRA KRESNA 16 F', 'ONLINE ES TELER 16 F', 'INA BOLD 20 F', 'ON JASMINE 12 K', 'MAHAYANA 12 K', 'FIM BOLD'];
  
  for (let week = 1; week <= 52; week++) {
    // Base sales dengan pola seasonal (lebih tinggi di Q2-Q3)
    let baseSales = 45000 + Math.random() * 80000;
    
    // Seasonal factor berdasarkan data real:
    // Q1 (Week 1-13): Normal
    // Q2 (Week 14-26): Higher (Lebaran)
    // Q3 (Week 27-39): High 
    // Q4 (Week 40-52): Medium
    let seasonalFactor = 1.0;
    if (week >= 14 && week <= 26) seasonalFactor = 1.3; // Q2 - Lebaran
    else if (week >= 27 && week <= 39) seasonalFactor = 1.2; // Q3
    else if (week >= 40 && week <= 52) seasonalFactor = 1.1; // Q4
    
    // Random variation untuk realisme
    const randomFactor = 0.85 + Math.random() * 0.3;
    
    data.push({
      week,
      year,
      sales: Math.round(baseSales * seasonalFactor * randomFactor),
      target: Math.round(baseSales * seasonalFactor * (0.9 + Math.random() * 0.2))
    });
  }
  return data;
};

/**
 * Generate data kuartal dengan target dan actual
 * Berdasarkan data target vs actual di Excel
 * @returns {QuarterlyData[]} Array data kuartal
 */
const generateQuarterlyData = (): QuarterlyData[] => {
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  
  return quarters.map((quarter, index) => {
    // Target berdasarkan pola real: Q2 > Q3 > Q4 > Q1
    let baseTarget = 450000;
    if (index === 1) baseTarget = 650000; // Q2 - Lebaran
    else if (index === 2) baseTarget = 580000; // Q3
    else if (index === 3) baseTarget = 520000; // Q4
    
    const target = baseTarget + Math.random() * 100000;
    // Actual dengan variasi realistis (85-115% dari target)
    const actual = target * (0.85 + Math.random() * 0.3);
    const variance = actual - target;
    
    return {
      quarter,
      target: Math.round(target),
      actual: Math.round(actual),
      variance: Math.round(variance),
      variancePercentage: Math.round((variance / target) * 100 * 10) / 10
    };
  });
};

/**
 * Generate data perbandingan mingguan antar tahun
 * Simulasi pertumbuhan YoY yang realistis (5-15%)
 * @returns {WeekComparison[]} Array perbandingan mingguan
 */
const generateWeekComparisons = (): WeekComparison[] => {
  const comparisons: WeekComparison[] = [];
  
  for (let week = 1; week <= 52; week++) {
    const previousYear = 45000 + Math.random() * 70000;
    // Growth factor 5-15% dengan variasi
    const growthFactor = 1.05 + Math.random() * 0.1;
    const currentYear = previousYear * growthFactor;
    const variance = currentYear - previousYear;
    
    comparisons.push({
      week,
      previousYear: Math.round(previousYear),
      currentYear: Math.round(currentYear),
      variance: Math.round(variance),
      variancePercentage: Math.round((variance / previousYear) * 100 * 10) / 10
    });
  }
  return comparisons;
};

/**
 * Generate data L4W vs C4W
 * Simulasi trend recent yang realistis
 * @returns {L4WC4WData} Data perbandingan L4W dan C4W
 */
const generateL4WC4WData = (): L4WC4WData => {
  // L4W base dengan variasi produk
  const l4wBase = 65000 + Math.random() * 20000;
  // C4W dengan trend slight growth (2-8%)
  const growthFactor = 1.02 + Math.random() * 0.06;
  const c4wBase = l4wBase * growthFactor;
  const variance = c4wBase - l4wBase;
  
  return {
    l4wAverage: Math.round(l4wBase),
    c4wAverage: Math.round(c4wBase),
    variance: Math.round(variance),
    variancePercentage: Math.round((variance / l4wBase) * 100 * 10) / 10
  };
};

/**
 * Generate data pertumbuhan tahun ke tahun
 * Berdasarkan trend pertumbuhan market rokok di Indonesia
 * @returns {YearOnYearGrowth} Data pertumbuhan YoY
 */
const generateYearOnYearGrowth = (): YearOnYearGrowth => {
  // Base total 2023 dengan realisme market size Malang
  const previousYear = 2800000 + Math.random() * 400000;
  // Growth 8-12% sesuai industry trend
  const growthFactor = 1.08 + Math.random() * 0.04;
  const currentYear = previousYear * growthFactor;
  const variance = currentYear - previousYear;
  
  return {
    previousYearTotal: Math.round(previousYear),
    currentYearTotal: Math.round(currentYear),
    variance: Math.round(variance),
    variancePercentage: Math.round((variance / previousYear) * 100 * 10) / 10
  };
};

/**
 * Mock data lengkap untuk dashboard
 * Berdasarkan data penjualan Malang 2024 yang realistis
 * 
 * Data mencakup:
 * - 2 tahun data penjualan mingguan (2023-2024)
 * - Target vs actual per kuartal
 * - Perbandingan YoY per minggu
 * - Analisis L4W vs C4W
 * - Summary pertumbuhan tahunan
 */
export const mockSalesData: SalesData = {
  weeklyData: [
    ...generateWeeklyData(2023),
    ...generateWeeklyData(2024)
  ],
  quarterlyData: generateQuarterlyData(),
  weekComparisons: generateWeekComparisons(),
  l4wc4wData: generateL4WC4WData(),
  yearOnYearGrowth: generateYearOnYearGrowth()
};

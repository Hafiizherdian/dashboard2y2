/**
 * Dashboard Analisis Penjualan
 * 
 * Komponen utama dashboard yang menampilkan analisis komprehensif performa penjualan
 * dengan navigasi tab untuk berbagai view analisis:
 * - Ringkasan: Overview metrik utama
 * - Perbandingan Mingguan: Analisis Week 1-52 (2023 vs 2024)
 * - Analisis Kuartal: Q1-Q4 dengan TARGET, ACTUAL, VARIANCE
 * - L4W vs C4W: Last 4 Weeks vs Current 4 Weeks
 * - Tahun ke Tahun: Pertumbuhan YoY
 */
'use client';

import { useState, useEffect } from 'react';
import WeekComparison from '@/components/WeekComparison';
import QuarterlyAnalysis from '@/components/QuarterlyAnalysis';
import L4WC4WAnalysis from '@/components/L4WC4WAnalysis';
import YearOnYearGrowth from '@/components/YearOnYearGrowth';
import AnalysisSection from '@/components/AnalysisSection';
import OutletContributionSection from '@/components/OutletContributionSection';
import { fetchSalesData } from '@/lib/database';
import { SalesData } from '@/types/sales';
import { AreaConfig } from '@/lib/areaConfig';
import { getVarianceColor } from '@/lib/utils';
import { TrendingUp, Calendar, BarChart3, PieChart, Activity, FileText, Store } from 'lucide-react';

export default function Dashboard() {
  // State untuk mengatur tab yang aktif saat ini
  const [activeTab, setActiveTab] = useState('overview');
  
  // State untuk filter tahun dan minggu
  const [selectedYear1, setSelectedYear1] = useState<number>(2024);
  const [selectedYear2, setSelectedYear2] = useState<number>(2025);
  const [selectedWeek1, setSelectedWeek1] = useState<number>(0);
  const [selectedWeek2, setSelectedWeek2] = useState<number>(0);
  const [productFilter, setProductFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [availableAreas, setAvailableAreas] = useState<AreaConfig[]>([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);
  
  // State untuk data yang sudah difilter
  const [filteredData, setFilteredData] = useState<SalesData>({
    weeklyData: [],
    quarterlyData: [],
    weekComparisons: [],
    l4wc4wData: {
      l4wAverage: 0,
      c4wAverage: 0,
      c1wValue: 0,
      variance: 0,
      variancePercentage: 0
    },
    yearOnYearGrowth: {
      previousYearTotal: 0,
      currentYearTotal: 0,
      variance: 0,
      variancePercentage: 0
    },
    comparisonYears: {
      previousYear: null,
      currentYear: null
    },
    comparisonWeeks: {
      previousYear: null,
      currentYear: null
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  const formatWeekRange = (range?: { start: number; end: number } | null) => {
    if (!range) {
      return 'Minggu 1-52';
    }

    if (range.start === range.end) {
      return `Minggu ${range.start}`;
    }

    return `Minggu ${range.start}-${range.end}`;
  };

  const formatSelectedWeekLabel = (week: number) => {
    if (!week || week <= 0) {
      return 'Semua Minggu';
    }
    if (week === 1) {
      return 'Minggu 1';
    }
    return `Minggu 1-${week}`;
  };

  // Fetch daftar area yang tersedia saat component mount (tapi tidak query data)
  useEffect(() => {
    loadAvailableAreas();
  }, []);

  // Fetch daftar area yang tersedia
  const loadAvailableAreas = async () => {
    setIsLoadingAreas(true);
    try {
      const response = await fetch('/api/areas');
      if (!response.ok) {
        throw new Error('Failed to fetch areas');
      }
      const result = await response.json();
      setAvailableAreas(result.data?.areas || []);
      
      // Reset area filter jika area yang dipilih tidak ada di list baru
      if (areaFilter && !result.data?.areas?.some((area: any) => area.id === areaFilter)) {
        setAreaFilter('');
      }
    } catch (error) {
      console.error('Error loading areas:', error);
      setAvailableAreas([]);
    } finally {
      setIsLoadingAreas(false);
    }
  };

  // Auto-apply filter saat area berubah (jika ada area yang dipilih)
  useEffect(() => {
    if (availableAreas.length > 0 && areaFilter) {
      applyFilter();
    }
  }, [areaFilter]);

  const syncSelectedFilters = (data: SalesData) => {
    if (data.comparisonYears.previousYear !== null) {
      setSelectedYear1(data.comparisonYears.previousYear);
    }
    if (data.comparisonYears.currentYear !== null) {
      setSelectedYear2(data.comparisonYears.currentYear);
    }

    const previousRange = data.comparisonWeeks.previousYear;
    if (previousRange) {
      if (previousRange.start === previousRange.end) {
        setSelectedWeek1(previousRange.start);
      } else if (previousRange.start === 1 && previousRange.end === 52) {
        setSelectedWeek1(0);
      } else {
        setSelectedWeek1(previousRange.end);
      }
    } else {
      setSelectedWeek1(0);
    }

    const currentRange = data.comparisonWeeks.currentYear;
    if (currentRange) {
      if (currentRange.start === currentRange.end) {
        setSelectedWeek2(currentRange.start);
      } else if (currentRange.start === 1 && currentRange.end === 52) {
        setSelectedWeek2(0);
      } else {
        setSelectedWeek2(currentRange.end);
      }
    } else {
      setSelectedWeek2(0);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSalesData();
      syncSelectedFilters(data);
      setFilteredData(data);
      setProductFilter('');
      setCityFilter('');
      setAreaFilter('');
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const buildFilters = () => {
    const filters: Parameters<typeof fetchSalesData>[0] = {};

    if (selectedYear1) {
      filters.year1 = selectedYear1;
    }
    if (selectedYear2) {
      filters.year2 = selectedYear2;
    }

    if (selectedWeek1 > 0) {
      filters.weekStart1 = 1;
      filters.weekEnd1 = selectedWeek1;
    }

    if (selectedWeek2 > 0) {
      filters.weekStart2 = 1;
      filters.weekEnd2 = selectedWeek2;
    }

    if (productFilter.trim()) {
      filters.product = productFilter.trim();
    }
    if (cityFilter.trim()) {
      filters.city = cityFilter.trim();
    }
    if (areaFilter.trim()) {
      filters.area = areaFilter.trim();
    }

    return filters;
  };

  // Fungsi untuk apply filter
  const applyFilter = async () => {
    setIsLoading(true);
    try {
      const filters = buildFilters();
      const data = await fetchSalesData(filters);
      // Jangan syncSelectedFilters saat apply filter agar tidak overwrite pilihan user
      // syncSelectedFilters(data);
      setFilteredData(data);
    } catch (error) {
      console.error('Error applying filter:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi untuk reset filter
  const resetFilter = async () => {
    setSelectedWeek1(0);
    setSelectedWeek2(0);
    setProductFilter('');
    setCityFilter('');
    setAreaFilter('');
    
    // Reset ke empty state tanpa query data
    setFilteredData({
      weeklyData: [],
      quarterlyData: [],
      weekComparisons: [],
      l4wc4wData: {
        l4wAverage: 0,
        c4wAverage: 0,
        c1wValue:0,
        variance: 0,
        variancePercentage: 0
      },
      yearOnYearGrowth: {
        previousYearTotal: 0,
        currentYearTotal: 0,
        variance: 0,
        variancePercentage: 0
      },
      comparisonYears: {
        previousYear: null,
        currentYear: null
      },
      comparisonWeeks: {
        previousYear: null,
        currentYear: null
      }
    });
  };

  // Konfigurasi tab navigasi dengan label dan icon
  const tabs = [
    { id: 'overview', label: 'Ringkasan', icon: TrendingUp },
    { id: 'weekly', label: 'Perbandingan Mingguan', icon: Calendar },
    { id: 'quarterly', label: 'Analisis Kuartal', icon: BarChart3 },
    { id: 'l4wc4w', label: 'L4W vs C4W', icon: Activity },
    { id: 'yoy', label: 'Tahun ke Tahun', icon: PieChart },
    { id: 'outlet', label: 'Kontribusi Outlet', icon: Store },
    { id: 'analysis', label: 'Analisis', icon: FileText },
  ];

  /**
   * Render konten berdasarkan tab yang aktif
   * @returns {JSX.Element} Komponen analisis yang sesuai
   */
  const renderContent = () => {
    switch (activeTab) {
      case 'weekly':
        return (
          <WeekComparison
            data={filteredData.weekComparisons}
            comparisonYears={filteredData.comparisonYears}
            comparisonWeeks={filteredData.comparisonWeeks}
          />
        );
      case 'quarterly':
        return <QuarterlyAnalysis data={filteredData.quarterlyData} />;
      case 'l4wc4w':
        return <L4WC4WAnalysis data={filteredData.l4wc4wData} />;
      case 'yoy':
        return (
          <YearOnYearGrowth
            data={filteredData.yearOnYearGrowth}
            comparisonYears={filteredData.comparisonYears}
          />
        );
      case 'outlet':
        return <OutletContributionSection data={filteredData} />;
      case 'analysis':
        return <AnalysisSection data={filteredData} />;
      default:
        // Tampilan Overview dengan metrik utama dan ringkasan performa
        return (
          <div className="space-y-6">
            {filteredData.weekComparisons.length === 0 ? (
              // Empty state saat belum ada data yang di-load
              <div className="text-center py-12">
                <div className="bg-gray-50 rounded-lg p-8">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Data</h3>
                  <p className="text-gray-600 mb-4">
                    Silakan pilih area dan terapkan filter untuk melihat data analisis penjualan
                  </p>
                  <div className="text-sm text-gray-500">
                    <p>• Pilih area dari dropdown di atas</p>
                    <p>• Atur filter periode tahun dan minggu</p>
                    <p>• Klik "Terapkan Filter" untuk memuat data</p>
                  </div>
                </div>
              </div>
            ) : (
              // Tampilan normal saat ada data
              (() => {
                const prevYearLabel = filteredData.comparisonYears.previousYear ?? selectedYear1;
                const currentYearLabel = filteredData.comparisonYears.currentYear ?? selectedYear2;
                const growthLabel = filteredData.comparisonYears.previousYear !== null && filteredData.comparisonYears.currentYear !== null
                  ? `${filteredData.comparisonYears.previousYear} vs ${filteredData.comparisonYears.currentYear}`
                  : 'YoY';

                return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Penjualan {prevYearLabel}</p>
                    <p className="text-2xl font-bold mt-1 text-gray-900">
                      {filteredData.yearOnYearGrowth.previousYearTotal.toLocaleString('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Penjualan {currentYearLabel}</p>
                    <p className="text-2xl font-bold mt-1 text-gray-900">
                      {filteredData.yearOnYearGrowth.currentYearTotal.toLocaleString('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Pertumbuhan YoY ({growthLabel})</p>
                    <p className={`text-2xl font-bold mt-1 ${getVarianceColor(filteredData.yearOnYearGrowth.variancePercentage)}`}>
                      {filteredData.yearOnYearGrowth.variancePercentage >= 0 ? '+' : ''}
                      {filteredData.yearOnYearGrowth.variancePercentage.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              {/* <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Rata-rata C4W</p>
                    <p className="text-2xl font-bold mt-1 text-gray-900">
                      {filteredData.l4wc4wData.c4wAverage.toLocaleString('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <Activity className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div> */}
            </div>
                );
              })()
            )}

            {filteredData.weekComparisons.length > 0 && (
              <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Statistik Cepat</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Minggu Dianalisis</span>
                    <span className="text-sm font-medium text-gray-800">
                      {filteredData.weekComparisons.length} Minggu
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Kuartal</span>
                    <span className="text-sm font-medium text-gray-800">
                      {filteredData.quarterlyData.length} Kuartal
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Tren Pertumbuhan</span>
                    <span className={`text-sm font-medium ${filteredData.yearOnYearGrowth.variancePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {filteredData.yearOnYearGrowth.variancePercentage >= 0 ? 'Positif' : 'Negatif'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Kuartal Terbaik</span>
                    <span className="text-sm font-medium text-gray-800">
                      {filteredData.quarterlyData.length > 0 
                        ? `Q${filteredData.quarterlyData.reduce((max: any, q: any) => q.actual > max.actual ? q : max).quarter}`
                        : 'N/A'
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Ringkasan Performa</h3>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Analisis Mingguan:</strong> {filteredData.weekComparisons.filter((w: any) => w.variancePercentage > 0).length} dari {filteredData.weekComparisons.length} minggu menunjukkan pertumbuhan positif
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded border border-green-200">
                    <p className="text-sm text-green-800">
                      <strong>Performa Kuartal:</strong> {filteredData.quarterlyData.filter((q: any) => q.actual >= q.target).length} dari {filteredData.quarterlyData.length} kuartal memenuhi atau melebihi target
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded border border-orange-200">
                    <p className="text-sm text-orange-800">
                      <strong>Pertumbuhan Tahunan:</strong> Performa tahun ke tahun {Math.abs(filteredData.yearOnYearGrowth.variancePercentage) >= 10 ? 'Luar biasa' : Math.abs(filteredData.yearOnYearGrowth.variancePercentage) >= 5 ? 'Kuat' : 'Sedang'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
              </>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Year On Year Sales Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Filter Area di Header */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Filter Area:</label>
                <select
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                  disabled={isLoadingAreas || availableAreas.length === 0}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm min-w-40"
                >
                  <option value="">Semua Area</option>
                  {availableAreas.map(area => (
                    <option key={area.id} value={area.id} title={area.description || ''}>
                      {area.name}
                    </option>
                  ))}
                </select>
                {availableAreas.length === 0 && !isLoadingAreas && (
                  <span className="text-xs text-gray-500 whitespace-nowrap">Tidak ada data</span>
                )}
              </div>
              {isLoading && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">Loading...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white border-b border-gray-200">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <div className="flex flex-col gap-6">
      {/* Header + Preview Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-900">Filter Perbandingan Periode</h2>
        
        {/* Preview Filter - Chip Style lebih compact */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-600">Menampilkan:</span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 font-medium text-sm">
            {selectedYear1} {formatSelectedWeekLabel(selectedWeek1)}
          </span>
          <span className="text-gray-500">vs</span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-800 font-medium text-sm">
            {selectedYear2} {formatSelectedWeekLabel(selectedWeek2)}
          </span>
          {productFilter.trim() && (
            <>
              <span className="text-gray-500 mx-1">•</span>
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-green-100 text-green-800 font-medium text-sm">
                Produk: {productFilter}
              </span>
            </>
          )}
          {areaFilter.trim() && (
            <>
              <span className="text-gray-500 mx-1">•</span>
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-orange-100 text-orange-800 font-medium text-sm">
                Area: {availableAreas.find(area => area.id === areaFilter)?.name || areaFilter}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Form Filter - Grid Layout Responsif */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Periode 1 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Tahun Pertama</label>
          <select
            value={selectedYear1}
            onChange={(e) => setSelectedYear1(parseInt(e.target.value))}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
          >
            <option value={2022}>2022</option>
            <option value={2023}>2023</option>
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Minggu Pertama</label>
          <select
            value={selectedWeek1}
            onChange={(e) => setSelectedWeek1(parseInt(e.target.value))}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
          >
            <option value={0}>Semua Minggu</option>
            {Array.from({ length: 52 }, (_, i) => i + 1).map(week => (
              <option key={week} value={week}>Minggu {week}</option>
            ))}
          </select>
        </div>

        {/* Periode 2 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Tahun Kedua</label>
          <select
            value={selectedYear2}
            onChange={(e) => setSelectedYear2(parseInt(e.target.value))}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
          >
            <option value={2022}>2022</option>
            <option value={2023}>2023</option>
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Minggu Kedua</label>
          <select
            value={selectedWeek2}
            onChange={(e) => setSelectedWeek2(parseInt(e.target.value))}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
          >
            <option value={0}>Semua Minggu</option>
            {Array.from({ length: 52 }, (_, i) => i + 1).map(week => (
              <option key={week} value={week}>Minggu {week}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Additional Filters */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        {/* Filter Produk di-comment out, jadi hanya kosong */}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 space-x-1 sm:justify-end">
        <button
          onClick={resetFilter}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 sm:px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          Reset Filter
        </button>
        <button
          onClick={applyFilter}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 sm:px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          Terapkan Filter
        </button>
      </div>
    </div>
  </div>
</div>

      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-8">
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-2 sm:space-x-4 lg:space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center py-4 px-2 sm:px-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon
                    className={`mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 ${
                      activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

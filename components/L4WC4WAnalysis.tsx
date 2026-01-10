/**
 * Komponen Analisis L4W vs C4W
 * 
 * Menampilkan analisis perbandingan Last 4 Weeks vs Current 4 Weeks
 * Fitur:
 * - Bar chart perbandingan rata-rata penjualan
 * - Line chart tren 8 minggu dengan data asli dari database
 * - Kartu metrik kunci (L4W, C4W, Variance, Growth Rate)
 * - Analisis detail dan insight
 * 
 * Data line chart menggunakan data mingguan asli dari database,
 * bukan data simulasi, untuk memberikan gambaran tren yang akurat
 * 
 * @component
 * @example
 * ```tsx
 * <L4WC4WAnalysisComponent data={l4wc4wData} />
 * ```
 */

'use client';

import { useState } from 'react';
import { L4WC4WData } from '@/types/sales';
import { formatCurrency, formatPercentage, getVarianceColor, getVarianceBgColor } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Dot, Cell } from 'recharts';
import { ChevronUpIcon, ChevronDownIcon } from 'lucide-react';

/**
 * Props untuk komponen L4WC4WAnalysis
 * @interface L4WC4WAnalysisProps
 * @property {L4WC4WData} data - Data perbandingan L4W vs C4W
 */
interface L4WC4WAnalysisProps {
  data: L4WC4WData;
}

export default function L4WC4WAnalysisComponent({ data }: L4WC4WAnalysisProps) {
  console.log('🎨 L4WC4WAnalysisComponent - Received data:', data);
  
  // State untuk sorting dan unit filter
  type SortKey = 'product' | 'year' | 'l4wValue' | 'c1wValue' | 'variance' | 'variancePercentage';
  type SortDirection = 'asc' | 'desc';
  
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({
    key: 'c1wValue',
    direction: 'desc'
  });

  const [selectedUnit, setSelectedUnit] = useState<string>('omzet'); // Default ke omzet

  const unitOptions = [
    { value: 'omzet', label: 'Omzet (Nett)' },
    { value: 'units_bks', label: 'Jual (Bks Net)' },
    { value: 'units_slop', label: 'Jual (Slop Net)' },
    { value: 'units_bal', label: 'Jual (Bal Net)' },
    { value: 'units_dos', label: 'Jual (Dos Net)' }
  ];

  // Fungsi sorting
  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Sorted data
  const getSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ChevronUpIcon className="w-4 h-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUpIcon className="w-4 h-4 text-blue-600" />
      : <ChevronDownIcon className="w-4 h-4 text-blue-600" />;
  };
  
  const getUnitLabel = (unit: string) => {
    const option = unitOptions.find(opt => opt.value === unit);
    return option ? option.label : 'Omzet (Nett)';
  };

  const formatUnitValue = (value: number, unit: string) => {
    if (unit === 'omzet') {
      return formatCurrency(value);
    }
    return value.toLocaleString('id-ID');
  };

  // Sorted data dengan unit filter
  const sortedProductDetails = data.productDetails ? [...data.productDetails].map((product) => {
    let l4wValue: number;
    let c1wValue: number;
    let variance: number;
    let variancePercentage: number;
    
    if (selectedUnit === 'omzet') {
      l4wValue = product.l4wValue;
      c1wValue = product.c1wValue;
      variance = product.variance;
      variancePercentage = product.variancePercentage;
    } else {
      const unitData = product[selectedUnit as keyof typeof product] as { l4w: number; c1w: number } | undefined;
      if (unitData && typeof unitData === 'object' && 'l4w' in unitData && 'c1w' in unitData) {
        l4wValue = unitData.l4w;
        c1wValue = unitData.c1w;
        variance = c1wValue - l4wValue;
        variancePercentage = l4wValue > 0 ? (variance / l4wValue) * 100 : 0;
      } else {
        l4wValue = 0;
        c1wValue = 0;
        variance = 0;
        variancePercentage = 0;
      }
    }
    
    return {
      ...product,
      displayL4wValue: Math.round(l4wValue * 100) / 100,
      displayC1wValue: Math.round(c1wValue * 100) / 100,
      displayVariance: Math.round(variance * 100) / 100,
      displayVariancePercentage: Math.round(variancePercentage * 10) / 10,
    };
  }).sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;
    
    // Get values based on sort key
    switch (sortConfig.key) {
      case 'product':
        aValue = a.product;
        bValue = b.product;
        break;
      case 'year':
        aValue = a.year;
        bValue = b.year;
        break;
      case 'l4wValue':
        aValue = a.displayL4wValue;
        bValue = b.displayL4wValue;
        break;
      case 'c1wValue':
        aValue = a.displayC1wValue;
        bValue = b.displayC1wValue;
        break;
      case 'variance':
        aValue = a.displayVariance;
        bValue = b.displayVariance;
        break;
      case 'variancePercentage':
        aValue = a.displayVariancePercentage;
        bValue = b.displayVariancePercentage;
        break;
      default:
        aValue = a[sortConfig.key] as number;
        bValue = b[sortConfig.key] as number;
        break;
    }
    
    // Compare values
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  }) : [];

  /**
   * Data untuk bar chart perbandingan L4W vs C1W
   * Menggunakan format yang sesuai untuk Recharts BarChart
   */
  const chartData = [
    {
      period: '4 Minggu Sebelumnya (L4W)',
      value: data.l4wAverage,
      type: 'average'
    },
    {
      period: 'Minggu Terakhir (C1W)',
      value: data.c1wValue,
      type: 'current'
    }
  ];

  console.log('📊 Chart data:', chartData);

  /**
   * Data untuk line chart tren 8 minggu menggunakan data asli dari database
   * Jika weeklyTrendData tersedia, gunakan data asli
   * Jika tidak, fallback ke array kosong
   */
  const trendData = data.weeklyTrendData && data.weeklyTrendData.length > 0
    ? data.weeklyTrendData.map(item => ({
        week: item.week,
        value: item.value
      }))
    : [];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Analisis L4W dan C1W </h2>
      
      {/* Summary Section - Menampilkan ringkasan metrik utama */}
      <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
        <p className="text-sm text-purple-800">
          <strong>AVG L4W:</strong> {formatCurrency(data.l4wAverage)} | 
          <strong>C1W:</strong> {formatCurrency(data.c1wValue)}
        </p>
      </div>
      
      {/* Charts Section - Grid untuk bar chart dan line chart dengan data asli */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Perbandingan Rata-rata */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Perbandingan L4W vs C1W</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
              <Tooltip 
                formatter={(value: number | undefined) => formatCurrency(value)}
              />
              <Bar 
                dataKey="value" 
                name="Penjualan"
              >
                {chartData.map((entry: any, index: number) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.type === 'current' ? '#ef4444' : '#8b5cf6'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center space-x-6 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
              <span className="text-gray-600">Rata-rata (L4W)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
              <span className="text-gray-600">Minggu Terakhir (C1W)</span>
            </div>
          </div>
        </div>

        {/* Line Chart - Tren 5 Minggu dengan Data Asli */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Tren 5 Minggu</h3>
          {trendData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                  <Tooltip 
                    formatter={(value: number | undefined) => formatCurrency(value)}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={<Dot 
                      fill="#8b5cf6"
                      r={4}
                    />}
                    shape={(props: any) => {
                      const { cx, cy, payload } = props;
                      return (
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={payload?.period === 'C1W' ? 6 : 4}
                          fill={payload?.period === 'C1W' ? '#ef4444' : '#8b5cf6'}
                        />
                      );
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex justify-center space-x-6 text-sm mt-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
                  <span className="text-gray-600">4 Minggu Sebelumnya (L4W)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                  <span className="text-gray-600">Minggu Terakhir (C1W)</span>
                </div>
              </div>
            </>
          ) : (
            <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-center">
                <p className="text-gray-500 text-sm">Data tren mingguan tidak tersedia</p>
                <p className="text-gray-400 text-xs mt-1">Dibutuhkan minimal 5 minggu data untuk menampilkan tren</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Cards - Menampilkan 2 metrik kunci dalam grid */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {/* L4W Card */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="text-sm font-medium text-blue-600 mb-2">4 Minggu Sebelumnya (L4W)</h4>
          <p className="text-2xl font-bold text-blue-800">{formatCurrency(data.l4wAverage)}</p>
          <p className="text-xs text-blue-600 mt-1">Rata-rata penjualan</p>
        </div>

        {/* C1W Card */}
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <h4 className="text-sm font-medium text-orange-600 mb-2">Minggu Terakhir (C1W)</h4>
          <p className="text-2xl font-bold text-orange-800">{formatCurrency(data.c1wValue)}</p>
          <p className="text-xs text-orange-600 mt-1">Penjualan minggu ini</p>
        </div>
      </div>

      {/* Detailed Analysis Section - Tabel Produk dengan Variance L4W vs C1W */}
      <div className="mt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Analisis Detail Produk</h3>
          <div className="flex items-center gap-4">
            <select
              id="unit-filter"
              className="rounded-md border border-gray-300 bg-green-50 rounded-lg border border-green-200 px-3 py-2 text-md text-gray-700 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              value={selectedUnit}
              onChange={(event) => {
                setSelectedUnit(event.target.value);
              }}
            >
              {unitOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${
                    sortConfig.key === 'product' ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleSort('product')}
                >
                  <div className="flex items-center gap-2">
                    Produk
                    {getSortIcon('product')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${
                    sortConfig.key === 'year' ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleSort('year')}
                >
                  <div className="flex items-center gap-2">
                    Tahun
                    {getSortIcon('year')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${
                    sortConfig.key === 'l4wValue' ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleSort('l4wValue')}
                >
                  <div className="flex items-center justify-end gap-2">
                    L4W
                    {getSortIcon('l4wValue')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${
                    sortConfig.key === 'c1wValue' ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleSort('c1wValue')}
                >
                  <div className="flex items-center justify-end gap-2">
                    C1W
                    {getSortIcon('c1wValue')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${
                    sortConfig.key === 'variance' ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleSort('variance')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Variance
                    {getSortIcon('variance')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${
                    sortConfig.key === 'variancePercentage' ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleSort('variancePercentage')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Variance %
                    {getSortIcon('variancePercentage')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedProductDetails && sortedProductDetails.length > 0 ? (
                sortedProductDetails.map((product, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.product}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                      {formatUnitValue(product.displayL4wValue, selectedUnit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                      {formatUnitValue(product.displayC1wValue, selectedUnit)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${getVarianceColor(product.displayVariance)}`}>
                      {formatUnitValue(product.displayVariance, selectedUnit)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium`}>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getVarianceBgColor(product.displayVariancePercentage)}`}>
                        {formatPercentage(product.displayVariancePercentage)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm">Data produk tidak tersedia</p>
                      <p className="text-xs text-gray-400 mt-1">Pilih area dan filter untuk melihat data produk</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

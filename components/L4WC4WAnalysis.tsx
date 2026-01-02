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

import { L4WC4WData } from '@/types/sales';
import { formatCurrency, formatPercentage, getVarianceColor, getVarianceBgColor } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

/**
 * Props untuk komponen L4WC4WAnalysis
 * @interface L4WC4WAnalysisProps
 * @property {L4WC4WData} data - Data perbandingan L4W vs C4W
 */
interface L4WC4WAnalysisProps {
  data: L4WC4WData;
}

export default function L4WC4WAnalysisComponent({ data }: L4WC4WAnalysisProps) {
  /**
   * Data untuk bar chart perbandingan L4W vs C4W
   * Menggunakan format yang sesuai untuk Recharts BarChart
   */
  const chartData = [
    {
      period: '4 Minggu Terakhir (L4W)',
      value: data.l4wAverage,
      type: 'average'
    },
    {
      period: '4 Minggu Sekarang (C4W)',
      value: data.c4wAverage,
      type: 'average'
    }
  ];

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
      <h2 className="text-2xl font-bold text-gray-800 mb-6">AVG L4W vs C4W dengan Growth Analysis</h2>
      
      {/* Summary Section - Menampilkan ringkasan metrik utama */}
      <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
        <p className="text-sm text-purple-800">
          <strong>AVG L4W:</strong> {formatCurrency(data.l4wAverage)} | 
          <strong>AVG C4W:</strong> {formatCurrency(data.c4wAverage)} | 
          <strong>Growth:</strong> {formatPercentage(data.variancePercentage)} | 
          <strong>Variance:</strong> {formatCurrency(data.variance)}
        </p>
      </div>
      
      {/* Charts Section - Grid untuk bar chart dan line chart dengan data asli */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Perbandingan Rata-rata */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Perbandingan Rata-rata</h3>
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
                fill="#8b5cf6"
                name="Rata-rata Penjualan"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line Chart - Tren 8 Minggu dengan Data Asli */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Tren 8 Minggu</h3>
          {trendData.length > 0 ? (
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
                  dot={{ fill: '#8b5cf6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-center">
                <p className="text-gray-500 text-sm">Data tren mingguan tidak tersedia</p>
                <p className="text-gray-400 text-xs mt-1">Dibutuhkan minimal 8 minggu data untuk menampilkan tren</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Cards - Menampilkan 4 metrik kunci dalam grid */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* L4W Card */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="text-sm font-medium text-blue-600 mb-2">4 Minggu Terakhir (L4W)</h4>
          <p className="text-2xl font-bold text-blue-800">{formatCurrency(data.l4wAverage)}</p>
          <p className="text-xs text-blue-600 mt-1">Rata-rata penjualan</p>
        </div>

        {/* C4W Card */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <h4 className="text-sm font-medium text-green-600 mb-2">4 Minggu Sekarang (C4W)</h4>
          <p className="text-2xl font-bold text-green-800">{formatCurrency(data.c4wAverage)}</p>
          <p className="text-xs text-green-600 mt-1">Rata-rata penjualan</p>
        </div>

        {/* Variance Card */}
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <h4 className="text-sm font-medium text-purple-600 mb-2">Varians</h4>
          <p className={`text-2xl font-bold ${getVarianceColor(data.variance)}`}>
            {formatCurrency(data.variance)}
          </p>
          <p className="text-xs text-purple-600 mt-1">Selisih absolut</p>
        </div>

        {/* Growth Rate Card - Dynamic styling based on performance */}
        <div className={`${data.variancePercentage >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} rounded-lg p-4 border`}>
          <h4 className={`text-sm font-medium ${data.variancePercentage >= 0 ? 'text-green-600' : 'text-red-600'} mb-2`}>
            Laju Pertumbuhan
          </h4>
          <p className={`text-2xl font-bold ${getVarianceColor(data.variancePercentage)}`}>
            {formatPercentage(data.variancePercentage)}
          </p>
          <p className={`text-xs ${data.variancePercentage >= 0 ? 'text-green-600' : 'text-red-600'} mt-1`}>
            Persentase perubahan
          </p>
        </div>
      </div>

      {/* Detailed Analysis Section - Analisis mendalam dengan ringkasan dan insight */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Analisis Detail</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Performance Summary */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Ringkasan Performa</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Rata-rata L4W:</span>
                  <span className="text-sm font-medium text-gray-800">{formatCurrency(data.l4wAverage)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Rata-rata C4W:</span>
                  <span className="text-sm font-medium text-gray-800">{formatCurrency(data.c4wAverage)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Variance:</span>
                  <span className={`text-sm font-medium ${getVarianceColor(data.variance)}`}>
                    {formatCurrency(data.variance)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Laju Pertumbuhan:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getVarianceBgColor(data.variancePercentage)}`}>
                    {formatPercentage(data.variancePercentage)}
                  </span>
                </div>
              </div>
            </div>

            {/* Insights Section - Analisis wawasan dengan indikator visual */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Wawasan</h4>
              <div className="space-y-2">
                {/* Growth Insight */}
                <div className="flex items-start space-x-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${data.variancePercentage >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <p className="text-sm text-gray-600">
                    {data.variancePercentage >= 0 
                      ? `Penjualan meningkat ${formatPercentage(data.variancePercentage)} dibandingkan L4W`
                      : `Penjualan menurun ${formatPercentage(Math.abs(data.variancePercentage))} dibandingkan L4W`
                    }
                  </p>
                </div>
                
                {/* Variance Insight */}
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 rounded-full mt-1.5 bg-blue-500"></div>
                  <p className="text-sm text-gray-600">
                    Rata-rata C4W {Math.abs(data.variance) > 0 ? formatCurrency(Math.abs(data.variance)) : 'sama dengan'} {data.variance > 0 ? 'lebih tinggi' : 'lebih rendah'} dari L4W
                  </p>
                </div>
                
                {/* Trend Classification Insight */}
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 rounded-full mt-1.5 bg-purple-500"></div>
                  <p className="text-sm text-gray-600">
                    {data.variancePercentage >= 5 ? 'Tren pertumbuhan positif kuat' : 
                     data.variancePercentage <= -5 ? 'Performa menurun' : 
                     'Performa relatif stabil'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

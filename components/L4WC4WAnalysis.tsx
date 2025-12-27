/**
 * Komponen Analisis L4W vs C4W
 * 
 * Menampilkan analisis perbandingan Last 4 Weeks vs Current 4 Weeks
 * Fitur:
 * - Bar chart perbandingan rata-rata penjualan
 * - Line chart tren 8 minggu
 * - Kartu metrik kunci (L4W, C4W, Variance, Growth Rate)
 * - Analisis detail dan insight
 * 
 * Berdasarkan data penjualan Malang 2024 dengan tren realistis
 */

'use client';

import { L4WC4WData } from '@/types/sales';
import { formatCurrency, formatPercentage, getVarianceColor, getVarianceBgColor } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface L4WC4WAnalysisProps {
  data: L4WC4WData;
}

export default function L4WC4WAnalysisComponent({ data }: L4WC4WAnalysisProps) {
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

  const trendData = [
    { week: 'W-4', value: data.l4wAverage * 0.95 },
    { week: 'W-3', value: data.l4wAverage * 0.98 },
    { week: 'W-2', value: data.l4wAverage * 1.02 },
    { week: 'W-1', value: data.l4wAverage * 1.05 },
    { week: 'W+1', value: data.c4wAverage * 0.97 },
    { week: 'W+2', value: data.c4wAverage * 1.01 },
    { week: 'W+3', value: data.c4wAverage * 1.03 },
    { week: 'W+4', value: data.c4wAverage * 1.06 },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Analisis L4W vs C4W</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Tren 8 Minggu</h3>
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
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="text-sm font-medium text-blue-600 mb-2">4 Minggu Terakhir (L4W)</h4>
          <p className="text-2xl font-bold text-blue-800">{formatCurrency(data.l4wAverage)}</p>
          <p className="text-xs text-blue-600 mt-1">Rata-rata penjualan</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <h4 className="text-sm font-medium text-green-600 mb-2">4 Minggu Sekarang (C4W)</h4>
          <p className="text-2xl font-bold text-green-800">{formatCurrency(data.c4wAverage)}</p>
          <p className="text-xs text-green-600 mt-1">Rata-rata penjualan</p>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <h4 className="text-sm font-medium text-purple-600 mb-2">Varians</h4>
          <p className={`text-2xl font-bold ${getVarianceColor(data.variance)}`}>
            {formatCurrency(data.variance)}
          </p>
          <p className="text-xs text-purple-600 mt-1">Selisih absolut</p>
        </div>

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

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Analisis Detail</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            <div>
              <h4 className="font-medium text-gray-700 mb-3">Wawasan</h4>
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${data.variancePercentage >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <p className="text-sm text-gray-600">
                    {data.variancePercentage >= 0 
                      ? `Penjualan meningkat ${formatPercentage(data.variancePercentage)} dibandingkan L4W`
                      : `Penjualan menurun ${formatPercentage(Math.abs(data.variancePercentage))} dibandingkan L4W`
                    }
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 rounded-full mt-1.5 bg-blue-500"></div>
                  <p className="text-sm text-gray-600">
                    Rata-rata C4W {Math.abs(data.variance) > 0 ? formatCurrency(Math.abs(data.variance)) : 'sama dengan'} {data.variance > 0 ? 'lebih tinggi' : 'lebih rendah'} dari L4W
                  </p>
                </div>
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

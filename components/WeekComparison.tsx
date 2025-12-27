/**
 * Komponen Perbandingan Mingguan
 * 
 * Menampilkan analisis perbandingan penjualan Week 1-52 antara tahun 2023 dan 2024
 * Fitur:
 * - Line chart untuk tren penjualan kedua tahun
 * - Bar chart untuk variance persentase per minggu
 * - Tabel detail perbandingan 10 minggu pertama
 * 
 * Berdasarkan data penjualan Malang 2024 dengan pola seasonal yang realistis
 */

'use client';

import { WeekComparison } from '@/types/sales';
import { formatCurrency, formatPercentage, getVarianceColor, getVarianceBgColor } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface WeekComparisonProps {
  data: WeekComparison[];
}

export default function WeekComparisonComponent({ data }: WeekComparisonProps) {
  // Transform data untuk chart Recharts
  const chartData = data.map(item => ({
    week: `W${item.week}`,
    previousYear: item.previousYear,
    currentYear: item.currentYear,
    variance: item.variance,
    variancePercentage: item.variancePercentage
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Perbandingan Minggu 1-52 (2023 vs 2024)</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Tren Penjualan</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
              <Tooltip 
                formatter={(value: number | undefined) => formatCurrency(value)}
                labelFormatter={(label) => `Week ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="previousYear" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="2023"
              />
              <Line 
                type="monotone" 
                dataKey="currentYear" 
                stroke="#10b981" 
                strokeWidth={2}
                name="2024"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Varians Mingguan</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis tickFormatter={(value) => `${value}%`} />
              <Tooltip 
                formatter={(value: number | undefined) => formatPercentage(value)}
                labelFormatter={(label) => `Week ${label}`}
              />
              <Bar 
                dataKey="variancePercentage" 
                fill="#10b981"
                name="Variance %"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Perbandingan Detail</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Minggu</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">2023</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">2024</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Variance %</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.slice(0, 13).map((item) => (
                <tr key={item.week} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">W{item.week}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{formatCurrency(item.previousYear)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{formatCurrency(item.currentYear)}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${getVarianceColor(item.variance)}`}>
                    {formatCurrency(item.variance)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${getVarianceColor(item.variancePercentage)}`}>
                    {formatPercentage(item.variancePercentage)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-500 mt-2">Menampilkan 13 minggu pertama dari total 52 minggu</p>
      </div>
    </div>
  );
}

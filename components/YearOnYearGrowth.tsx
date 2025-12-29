/**
 * Komponen Analisis Tahun ke Tahun
 * 
 * Menampilkan analisis pertumbuhan penjualan tahun ke tahun (2023 vs 2024)
 * Fitur:
 * - Bar chart perbandingan penjualan tahunan
 * - Pie chart distribusi penjualan
 * - Kartu metrik kunci (2023, 2024, Variance, Growth Rate)
 * - Analisis performa dan perbandingan detail
 * 
 * Berdasarkan data penjualan Malang 2024 dengan tren realistis
 */

'use client';

import { YearOnYearGrowth, ComparisonYears } from '@/types/sales';
import { formatCurrency, formatPercentage, getVarianceColor, getVarianceBgColor } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface YearOnYearGrowthProps {
  data: YearOnYearGrowth;
  comparisonYears?: ComparisonYears;
}

const COLORS = ['#3b82f6', '#10b981'];

export default function YearOnYearGrowthComponent({ data, comparisonYears }: YearOnYearGrowthProps) {
  const previousYearLabel = comparisonYears?.previousYear ?? 'Previous Year';
  const currentYearLabel = comparisonYears?.currentYear ?? 'Current Year';

  const chartData = [
    {
      year: previousYearLabel.toString(),
      sales: data.previousYearTotal,
      fill: '#3b82f6'
    },
    {
      year: currentYearLabel.toString(),
      sales: data.currentYearTotal,
      fill: '#10b981'
    }
  ];

  const pieData = [
    { name: previousYearLabel.toString(), value: data.previousYearTotal },
    { name: currentYearLabel.toString(), value: data.currentYearTotal }
  ];

  const growthRate = data.variancePercentage;
  const isPositiveGrowth = growthRate >= 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Growth Year-on-Year dengan Variance & Persentase</h2>
      
      <div className="mb-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
        <p className="text-sm text-emerald-800">
          <strong>{previousYearLabel}:</strong> {formatCurrency(data.previousYearTotal)} | 
          <strong>{currentYearLabel}:</strong> {formatCurrency(data.currentYearTotal)} | 
          <strong>Variance:</strong> {formatCurrency(data.variance)} | 
          <strong>Growth %:</strong> {formatPercentage(data.variancePercentage)}
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Perbandingan Penjualan Tahunan</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
              <Tooltip 
                formatter={(value: number | undefined) => formatCurrency(value)}
                labelFormatter={(label) => `Tahun ${label}`}
              />
              <Bar dataKey="sales" name="Total Penjualan" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Distribusi Penjualan</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number | undefined) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="text-sm font-medium text-blue-600 mb-2">Total {previousYearLabel}</h4>
          <p className="text-2xl font-bold text-blue-800">{formatCurrency(data.previousYearTotal)}</p>
          <p className="text-xs text-blue-600 mt-1">Penjualan tahun sebelumnya</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <h4 className="text-sm font-medium text-green-600 mb-2">Total {currentYearLabel}</h4>
          <p className="text-2xl font-bold text-green-800">{formatCurrency(data.currentYearTotal)}</p>
          <p className="text-xs text-green-600 mt-1">Penjualan tahun sekarang</p>
        </div>

        <div className={`${isPositiveGrowth ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} rounded-lg p-4 border`}>
          <h4 className={`text-sm font-medium ${isPositiveGrowth ? 'text-green-600' : 'text-red-600'} mb-2`}>
            Variance
          </h4>
          <p className={`text-2xl font-bold ${getVarianceColor(data.variance)}`}>
            {formatCurrency(data.variance)}
          </p>
          <p className={`text-xs ${isPositiveGrowth ? 'text-green-600' : 'text-red-600'} mt-1`}>
            Selisih absolut
          </p>
        </div>

        <div className={`${isPositiveGrowth ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'} rounded-lg p-4 border`}>
          <h4 className={`text-sm font-medium ${isPositiveGrowth ? 'text-emerald-600' : 'text-red-600'} mb-2`}>
            Laju Pertumbuhan
          </h4>
          <p className={`text-2xl font-bold ${getVarianceColor(data.variancePercentage)}`}>
            {formatPercentage(data.variancePercentage)}
          </p>
          <p className={`text-xs ${isPositiveGrowth ? 'text-emerald-600' : 'text-red-600'} mt-1`}>
            Pertumbuhan tahun ke tahun
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Ringkasan Performa</h3>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Metrik Kunci</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Tahun Sebelumnya ({previousYearLabel}):</span>
                    <span className="text-sm font-medium text-gray-800">{formatCurrency(data.previousYearTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Tahun Sekarang ({currentYearLabel}):</span>
                    <span className="text-sm font-medium text-gray-800">{formatCurrency(data.currentYearTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Varians Absolut:</span>
                    <span className={`text-sm font-medium ${getVarianceColor(data.variance)}`}>
                      {formatCurrency(data.variance)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Laju Pertumbuhan:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getVarianceBgColor(data.variancePercentage)}`}>
                      {formatPercentage(data.variancePercentage)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-3">Analisis Pertumbuhan</h4>
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${isPositiveGrowth ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <p className="text-sm text-gray-600">
                      {isPositiveGrowth 
                        ? `Pertumbuhan positif kuat ${formatPercentage(data.variancePercentage)} tahun ke tahun`
                        : `Penurunan ${formatPercentage(Math.abs(data.variancePercentage))} tahun ke tahun`
                      }
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 rounded-full mt-1.5 bg-blue-500"></div>
                    <p className="text-sm text-gray-600">
                      {isPositiveGrowth 
                        ? `2024 melebihi performa 2023 sebesar ${formatCurrency(data.variance)}`
                        : `2024 kurang dari 2023 sebesar ${formatCurrency(Math.abs(data.variance))}`
                      }
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 rounded-full mt-1.5 bg-purple-500"></div>
                    <p className="text-sm text-gray-600">
                      {Math.abs(growthRate) >= 10 ? 'Performa luar biasa' :
                       Math.abs(growthRate) >= 5 ? 'Performa kuat' :
                       Math.abs(growthRate) >= 2 ? 'Performa sedang' :
                       Math.abs(growthRate) >= 0 ? 'Performa stabil' : 'Perlu peningkatan'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Perbandingan Detail</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metrik</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">2023</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">2024</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pertumbuhan %</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Total Penjualan</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{formatCurrency(data.previousYearTotal)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{formatCurrency(data.currentYearTotal)}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${getVarianceColor(data.variance)}`}>
                    {formatCurrency(data.variance)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${getVarianceColor(data.variancePercentage)}`}>
                    {formatPercentage(data.variancePercentage)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

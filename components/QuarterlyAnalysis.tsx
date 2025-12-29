'use client';

import { QuarterlyData } from '@/types/sales';
import { formatCurrency, formatPercentage, getVarianceColor, getVarianceBgColor } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface QuarterlyAnalysisProps {
  data: QuarterlyData[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function QuarterlyAnalysisComponent({ data }: QuarterlyAnalysisProps) {
  const performanceData = data.map(item => ({
    quarter: item.quarter,
    target: item.target,
    actual: item.actual,
    variance: item.variance,
    achievement: (item.actual / item.target) * 100
  }));

  const pieData = data.map(item => ({
    name: item.quarter,
    value: item.actual
  }));

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Analisis Kuartal Q1-Q4 (Target, Actual, Variance)</h2>
      
      <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
        <p className="text-sm text-green-800">
          <strong>Periode:</strong> Q1-Q4 | 
          <strong>Target Achievement:</strong> {data.reduce((sum, q) => sum + (q.actual / q.target) * 100, 0) / data.length}% rata-rata |
          <strong>Best Quarter:</strong> {data.reduce((max, q) => q.actual > max.actual ? q : max).quarter}
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Target vs Actual</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="quarter" />
              <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
              <Tooltip 
                formatter={(value: number | undefined) => formatCurrency(value)}
                labelFormatter={(label) => `Quarter ${label}`}
              />
              <Bar dataKey="target" fill="#94a3b8" name="Target" />
              <Bar dataKey="actual" fill="#3b82f6" name="Actual" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Sales Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
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

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">Quarterly Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.map((quarter) => (
            <div key={quarter.quarter} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <h4 className="font-semibold text-lg text-gray-800 mb-3">{quarter.quarter}</h4>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Target:</span>
                  <span className="text-sm font-medium text-gray-800">{formatCurrency(quarter.target)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Actual:</span>
                  <span className="text-sm font-medium text-gray-800">{formatCurrency(quarter.actual)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Variance:</span>
                  <span className={`text-sm font-medium ${getVarianceColor(quarter.variance)}`}>
                    {formatCurrency(quarter.variance)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Variance %:</span>
                  <span className={`text-sm font-medium ${getVarianceColor(quarter.variancePercentage)}`}>
                    {formatPercentage(quarter.variancePercentage)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Achievement:</span>
                  <span className={`text-sm font-medium px-2 py-1 rounded ${getVarianceBgColor(quarter.variancePercentage)}`}>
                    {((quarter.actual / quarter.target) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Detailed Quarterly Data</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quarter</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actual</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Variance %</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Achievement</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((quarter) => (
                <tr key={quarter.quarter} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{quarter.quarter}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{formatCurrency(quarter.target)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{formatCurrency(quarter.actual)}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${getVarianceColor(quarter.variance)}`}>
                    {formatCurrency(quarter.variance)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${getVarianceColor(quarter.variancePercentage)}`}>
                    {formatPercentage(quarter.variancePercentage)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getVarianceBgColor(quarter.variancePercentage)}`}>
                      {((quarter.actual / quarter.target) * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

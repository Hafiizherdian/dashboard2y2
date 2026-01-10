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

import { useEffect, useMemo, useState } from 'react';
import { WeekComparison, ComparisonYears, ComparisonWeeks, WeekComparisonProductDetail } from '@/types/sales';
import { formatCurrency, formatPercentage, getVarianceColor, getVarianceBgColor } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from 'recharts';
import { ChevronUpIcon, ChevronDownIcon, Maximize2, X } from 'lucide-react';

interface WeekComparisonProps {
  data: WeekComparison[];
  comparisonYears?: ComparisonYears;
  comparisonWeeks?: ComparisonWeeks;
}

const formatWeekRange = (range?: { start: number; end: number } | null) => {
  if (!range) return 'Week 1-52';
  if (range.start === range.end) return `Week ${range.start}`;
  return `Week ${range.start}-${range.end}`;
};

export default function WeekComparisonComponent({ data, comparisonYears, comparisonWeeks }: WeekComparisonProps) {
  const previousYearLabel = comparisonYears?.previousYear ?? 'Tahun 1';
  const currentYearLabel = comparisonYears?.currentYear ?? 'Tahun 2';
  const previousWeekRangeLabel = formatWeekRange(comparisonWeeks?.previousYear ?? undefined);
  const currentWeekRangeLabel = formatWeekRange(comparisonWeeks?.currentYear ?? undefined);

  const weekOptions = Array.from(new Set(data.map(item => item.week))).sort((a, b) => a - b);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null); // Default ke null untuk "All Weeks"
  const [selectedUnit, setSelectedUnit] = useState<string>('omzet'); // Default ke omzet
  const [expandedChart, setExpandedChart] = useState<'line' | 'bar' | null>(null);

  // Debug state changes
  useEffect(() => {
    console.log('expandedChart changed:', expandedChart);
  }, [expandedChart]);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof WeekComparisonProductDetail | 'product';
    direction: 'asc' | 'desc';
  } | null>(null);

  const unitOptions = [
    { value: 'omzet', label: 'Omzet (Nett)' },
    { value: 'units_bks', label: 'Jual (Bks Net)' },
    { value: 'units_slop', label: 'Jual (Slop Net)' },
    { value: 'units_bal', label: 'Jual (Bal Net)' },
    { value: 'units_dos', label: 'Jual (Dos Net)' }
  ];

  useEffect(() => {
    setSelectedWeek(null); // Default ke "All Weeks"
  }, [data.length]);

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

  const handleSort = (key: keyof WeekComparisonProductDetail | 'product') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof WeekComparisonProductDetail | 'product') => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ChevronUpIcon className="w-4 h-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUpIcon className="w-4 h-4 text-blue-600" />
      : <ChevronDownIcon className="w-4 h-4 text-blue-600" />;
  };

  const selectedWeekData = selectedWeek !== null ? data.find(item => item.week === selectedWeek) : undefined;

  // Get all unique products dari all weeks data
  const allProductsInData: WeekComparisonProductDetail[] = useMemo(() => {
    const productMap = new Map<string, { 
      previous: number; 
      current: number; 
      units_bks: { previous: number; current: number };
      units_slop: { previous: number; current: number };
      units_bal: { previous: number; current: number };
      units_dos: { previous: number; current: number };
    }>();
    
    // Collect all products dari all weeks
    data.forEach(weekData => {
      if (weekData.details) {
        weekData.details.forEach(detail => {
          const existing = productMap.get(detail.product) || {
            previous: 0, 
            current: 0,
            units_bks: { previous: 0, current: 0 },
            units_slop: { previous: 0, current: 0 },
            units_bal: { previous: 0, current: 0 },
            units_dos: { previous: 0, current: 0 }
          };
          
          const detailUnits = detail.units_bks || { previous: 0, current: 0 };
          const detailUnitsSlop = detail.units_slop || { previous: 0, current: 0 };
          const detailUnitsBal = detail.units_bal || { previous: 0, current: 0 };
          const detailUnitsDos = detail.units_dos || { previous: 0, current: 0 };
          
          productMap.set(detail.product, {
            previous: existing.previous + detail.previousYear,
            current: existing.current + detail.currentYear,
            units_bks: {
              previous: existing.units_bks.previous + detailUnits.previous,
              current: existing.units_bks.current + detailUnits.current
            },
            units_slop: {
              previous: existing.units_slop.previous + detailUnitsSlop.previous,
              current: existing.units_slop.current + detailUnitsSlop.current
            },
            units_bal: {
              previous: existing.units_bal.previous + detailUnitsBal.previous,
              current: existing.units_bal.current + detailUnitsBal.current
            },
            units_dos: {
              previous: existing.units_dos.previous + detailUnitsDos.previous,
              current: existing.units_dos.current + detailUnitsDos.current
            }
          });
        });
      }
    });
    
    return Array.from(productMap.entries())
      .map(([product, totals]) => {
        let previous: number;
        let current: number;
        
        if (selectedUnit === 'omzet') {
          previous = totals.previous;
          current = totals.current;
        } else {
          const unitData = totals[selectedUnit as keyof typeof totals] as { previous: number; current: number };
          if (unitData && typeof unitData === 'object' && 'previous' in unitData && 'current' in unitData) {
            previous = unitData.previous;
            current = unitData.current;
          } else {
            previous = 0;
            current = 0;
          }
        }
        
        const variance = current - previous;
        const variancePercentage = previous > 0 ? (variance / previous) * 100 : 0;
        
        return {
          product,
          previousYear: Math.round(previous * 100) / 100,
          currentYear: Math.round(current * 100) / 100,
          variance: Math.round(variance * 100) / 100,
          variancePercentage: Math.round(variancePercentage * 10) / 10,
        };
      })
      .sort((a, b) => {
        // urutkan mulai dari value tahun sekarang : Tinggi ke Rendah
        return b.currentYear - a.currentYear;
      });
  }, [data, selectedUnit]);

  const productDetails: WeekComparisonProductDetail[] = useMemo(() => {
    if (selectedWeek === null) {
      // Menampilkan all weeks aggregated data
      return allProductsInData;
    }
    
    // Menampilkan data minggu secara spesifik
    if (!selectedWeekData?.details) {
      return [];
    }

    return selectedWeekData.details.map((detail) => {
        // Menghitung unit-specific values untuk minggunya
        let unitPrevious: number;
        let unitCurrent: number;
        
        if (selectedUnit === 'omzet') {
          unitPrevious = detail.previousYear;
          unitCurrent = detail.currentYear;
        } else {
          const unitData = detail[selectedUnit as keyof typeof detail] as { previous: number; current: number } | undefined;
          if (unitData && typeof unitData === 'object' && 'previous' in unitData && 'current' in unitData) {
            unitPrevious = unitData.previous;
            unitCurrent = unitData.current;
          } else {
            unitPrevious = 0;
            unitCurrent = 0;
          }
        }
        
        const variance = unitCurrent - unitPrevious;
        const variancePercentage = unitPrevious > 0 ? (variance / unitPrevious) * 100 : 0;
        
        return {
          product: detail.product,
          previousYear: Math.round(unitPrevious * 100) / 100,
          currentYear: Math.round(unitCurrent * 100) / 100,
          variance: Math.round(variance * 100) / 100,
          variancePercentage: Math.round(variancePercentage * 10) / 10,
        };
      });
  }, [selectedWeekData, selectedUnit, allProductsInData]);

  const sortedProductDetails = useMemo(() => {
    if (!sortConfig || !productDetails) return productDetails || [];

    return [...productDetails].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      if (sortConfig.key === 'product') {
        aValue = a.product.toLowerCase();
        bValue = b.product.toLowerCase();
      } else {
        aValue = a[sortConfig.key] as number;
        bValue = b[sortConfig.key] as number;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortConfig.direction === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [productDetails, sortConfig]);

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
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Analisis Produk - Perbandingan Minggu 1-52</h2>
      
      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Periode Analisis:</strong> {previousWeekRangeLabel} vs {currentWeekRangeLabel} | 
          <strong>Tahun Perbandingan:</strong> {`${previousYearLabel} vs ${currentYearLabel}`} |
          <strong>Total Minggu:</strong> {data.length} minggu
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-700">Tren Penjualan</h3>
            <button
              onClick={() => {
                console.log('Line chart expand clicked');
                setExpandedChart('line');
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
              Perbesar
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
              <Tooltip 
                formatter={(value: number | undefined) => formatUnitValue(value || 0, selectedUnit)}
                labelFormatter={(label) => `Week ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="previousYear" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name={previousYearLabel.toString()}
              />
              <Line 
                type="monotone" 
                dataKey="currentYear" 
                stroke="#10b981" 
                strokeWidth={2}
                name={currentYearLabel.toString()}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-700">Varians Mingguan</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-green-600">Positif (+)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-red-600">Negatif (-)</span>
                </div>
              </div>
              <button
                onClick={() => {
                  console.log('Bar chart expand clicked');
                  setExpandedChart('bar');
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
                Perbesar
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis tickFormatter={(value) => `${value}%`} />
              <Tooltip 
                formatter={(value: number | undefined) => formatPercentage(value)}
                labelFormatter={(label) => `Week ${label}`}
              />
              <Bar dataKey="variancePercentage" name="Variance %">
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.variancePercentage < 0 ? "#ef4444" : "#10b981"} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Perbandingan Detail</h3>
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
            <select
              id="week-filter"
              className="rounded-md border border-gray-300 bg-blue-50 rounded-lg border border-blue-200 px-3 py-2 text-md text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={selectedWeek ?? 'all'}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedWeek(value === 'all' ? null : Number(value));
              }}
            >
              <option value="all">All Weeks</option>
              {weekOptions.map((week) => (
                <option key={week} value={week}>
                  {`Week ${week}`}
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
                    sortConfig?.key === 'product' ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleSort('product')}
                >
                  <div className="flex items-center gap-2">
                    Produk
                    {getSortIcon('product')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${
                    sortConfig?.key === 'previousYear' ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleSort('previousYear')}
                >
                  <div className="flex items-center justify-end gap-2">
                    {previousYearLabel}
                    {getSortIcon('previousYear')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${
                    sortConfig?.key === 'currentYear' ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleSort('currentYear')}
                >
                  <div className="flex items-center justify-end gap-2">
                    {currentYearLabel}
                    {getSortIcon('currentYear')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${
                    sortConfig?.key === 'variance' ? 'bg-blue-50' : ''
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
                    sortConfig?.key === 'variancePercentage' ? 'bg-blue-50' : ''
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
              {sortedProductDetails.length > 0 ? (
                sortedProductDetails.map((detail) => (
                  <tr key={detail.product} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{detail.product}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{formatUnitValue(detail.previousYear, selectedUnit)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{formatUnitValue(detail.currentYear, selectedUnit)}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${getVarianceColor(detail.variance)}`}>
                      {formatUnitValue(detail.variance, selectedUnit)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${getVarianceColor(detail.variancePercentage)}`}>
                      {formatPercentage(detail.variancePercentage)}
                    </td>
                  </tr>
                ))
              ) : selectedWeekData ? (
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Semua Produk</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{formatUnitValue(selectedWeekData.previousYear, selectedUnit)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{formatUnitValue(selectedWeekData.currentYear, selectedUnit)}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${getVarianceColor(selectedWeekData.variance)}`}>
                    {formatUnitValue(selectedWeekData.variance, selectedUnit)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${getVarianceColor(selectedWeekData.variancePercentage)}`}>
                    {formatPercentage(selectedWeekData.variancePercentage)}
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    Tidak ada data untuk minggu yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-500 mt-2">
            {selectedWeek === null 
              ? (sortedProductDetails.length > 0
                  ? `Menampilkan ${sortedProductDetails.length} produk untuk ${getUnitLabel(selectedUnit)} dari ${previousYearLabel} vs ${currentYearLabel} (semua minggu).`
                  : `Tidak ada data produk untuk ditampilkan.`)
              : (sortedProductDetails.length > 0
                  ? `Menampilkan ${sortedProductDetails.length} produk untuk ${getUnitLabel(selectedUnit)} di Week ${selectedWeek}.`
                  : `Tidak ada data untuk ${getUnitLabel(selectedUnit)} di Week ${selectedWeek}.`)
            }
          </p>
      </div>

      {/* Modal untuk Grafik Diperbesar */}
      {expandedChart && (
        <div 
          className="fixed inset-0 bg-red-500 flex items-center justify-center z-[9999] p-4 border-8 border-yellow-400"
          onClick={() => setExpandedChart(null)}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                {expandedChart === 'line' ? 'Tren Penjualan' : 'Varians Mingguan'} - Tampilan Diperbesar
              </h3>
              <button
                onClick={() => setExpandedChart(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {expandedChart === 'line' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-1 bg-blue-500"></div>
                      <span className="text-gray-600">{previousYearLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-1 bg-green-500"></div>
                      <span className="text-gray-600">{currentYearLabel}</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={500}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                      <Tooltip 
                        formatter={(value: number | undefined) => formatUnitValue(value || 0, selectedUnit)}
                        labelFormatter={(label) => `Week ${label}`}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="previousYear" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        name={previousYearLabel.toString()}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="currentYear" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        name={currentYearLabel.toString()}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-green-600">Positif (+)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span className="text-red-600">Negatif (-)</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={500}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        formatter={(value: number | undefined) => formatPercentage(value)}
                        labelFormatter={(label) => `Week ${label}`}
                      />
                      <Legend />
                      <Bar dataKey="variancePercentage" name="Variance %">
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.variancePercentage < 0 ? "#ef4444" : "#10b981"} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
        
      )}
    </div>
  );
}


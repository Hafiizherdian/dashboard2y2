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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

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
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null); // Default to null for "All Weeks"
  const [selectedUnit, setSelectedUnit] = useState<string>('omzet'); // Default to omzet

  const unitOptions = [
    { value: 'omzet', label: 'Omzet (Nett)' },
    { value: 'units_bks', label: 'Jual (Bks Net)' },
    { value: 'units_slop', label: 'Jual (Slop Net)' },
    { value: 'units_bal', label: 'Jual (Bal Net)' },
    { value: 'units_dos', label: 'Jual (Dos Net)' }
  ];

  useEffect(() => {
    setSelectedWeek(null); // Default to "All Weeks"
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

  const selectedWeekData = selectedWeek !== null ? data.find(item => item.week === selectedWeek) : undefined;

  // Menjumlah total product data untuk semua minggu ketika "All Weeks" di pilih
  const allWeeksProductDetails: WeekComparisonProductDetail[] = useMemo(() => {
    const productMap = new Map<string, { previous: number; current: number }>();
    
    // Aggregate data all weeks
    data.forEach(weekData => {
      if (weekData.details) {
        weekData.details.forEach(detail => {
          const existing = productMap.get(detail.product) || { previous: 0, current: 0 };
          productMap.set(detail.product, {
            previous: existing.previous + detail.previousYear,
            current: existing.current + detail.currentYear
          });
        });
      }
    });
    
    return Array.from(productMap.entries())
      .map(([product, totals]) => ({
        product,
        previousYear: totals.previous,
        currentYear: totals.current,
        variance: totals.current - totals.previous,
        variancePercentage: totals.previous > 0 ? ((totals.current - totals.previous) / totals.previous) * 100 : 0
      }))
      .filter(detail => detail.previousYear > 0 || detail.currentYear > 0)
      .sort((a, b) => (b.currentYear + b.previousYear) - (a.currentYear + a.previousYear));
  }, [data]);

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
        // Menghitung unit-specific values untuk minggun ini
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
        
        const unitVariance = unitCurrent - unitPrevious;
        const unitVariancePercentage = unitPrevious > 0 ? (unitVariance / unitPrevious) * 100 : 0;
        
        return {
          ...detail,
          previousYear: Math.round(unitPrevious * 100) / 100,
          currentYear: Math.round(unitCurrent * 100) / 100,
          variance: Math.round(unitVariance * 100) / 100,
          variancePercentage: Math.round(unitVariancePercentage * 10) / 10
        };
      }).sort((a, b) => {
        // Mengurutkann mulai dari value tahun sekarang: Tinggi to Rendah
        return b.currentYear - a.currentYear;
      });
  }, [selectedWeek, selectedWeekData?.details, allProductsInData]);

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
          <h3 className="text-lg font-semibold text-gray-700">Tren Penjualan</h3>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produk</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{previousYearLabel}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{currentYearLabel}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Variance %</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productDetails.length > 0 ? (
                productDetails.map((detail) => (
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
              ? (productDetails.length > 0
                  ? `Menampilkan ${productDetails.length} produk untuk ${getUnitLabel(selectedUnit)} dari ${previousYearLabel} vs ${currentYearLabel} (semua minggu).`
                  : `Tidak ada data produk untuk ditampilkan.`)
              : (productDetails.length > 0
                  ? `Menampilkan ${productDetails.length} produk untuk ${getUnitLabel(selectedUnit)} di Week ${selectedWeek}.`
                  : `Tidak ada data untuk ${getUnitLabel(selectedUnit)} di Week ${selectedWeek}.`)
            }
          </p>
      </div>
    </div>
  );
}

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

import { useState } from 'react';
import { mockSalesData } from '@/data/mockData';
import WeekComparison from '@/components/WeekComparison';
import QuarterlyAnalysis from '@/components/QuarterlyAnalysis';
import L4WC4WAnalysis from '@/components/L4WC4WAnalysis';
import YearOnYearGrowth from '@/components/YearOnYearGrowth';
import { TrendingUp, Calendar, BarChart3, PieChart, Activity } from 'lucide-react';

export default function Dashboard() {
  // State untuk mengatur tab yang aktif saat ini
  const [activeTab, setActiveTab] = useState('overview');

  // Konfigurasi tab navigasi dengan label dan icon
  const tabs = [
    { id: 'overview', label: 'Ringkasan', icon: TrendingUp },
    { id: 'weekly', label: 'Perbandingan Mingguan', icon: Calendar },
    { id: 'quarterly', label: 'Analisis Kuartal', icon: BarChart3 },
    { id: 'l4wc4w', label: 'L4W vs C4W', icon: Activity },
    { id: 'yoy', label: 'Tahun ke Tahun', icon: PieChart },
  ];

  /**
   * Render konten berdasarkan tab yang aktif
   * @returns {JSX.Element} Komponen analisis yang sesuai
   */
  const renderContent = () => {
    switch (activeTab) {
      case 'weekly':
        return <WeekComparison data={mockSalesData.weekComparisons} />;
      case 'quarterly':
        return <QuarterlyAnalysis data={mockSalesData.quarterlyData} />;
      case 'l4wc4w':
        return <L4WC4WAnalysis data={mockSalesData.l4wc4wData} />;
      case 'yoy':
        return <YearOnYearGrowth data={mockSalesData.yearOnYearGrowth} />;
      default:
        // Tampilan Overview dengan metrik utama dan ringkasan performa
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Penjualan 2024</p>
                    <p className="text-2xl font-bold mt-1 text-gray-900">
                      {mockSalesData.yearOnYearGrowth.currentYearTotal.toLocaleString('id-ID', {
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

              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Pertumbuhan YoY</p>
                    <p className="text-2xl font-bold mt-1 text-gray-900">
                      {mockSalesData.yearOnYearGrowth.variancePercentage >= 0 ? '+' : ''}
                      {mockSalesData.yearOnYearGrowth.variancePercentage.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Rata-rata C4W</p>
                    <p className="text-2xl font-bold mt-1 text-gray-900">
                      {mockSalesData.l4wc4wData.c4wAverage.toLocaleString('id-ID', {
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
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Performa Q4</p>
                    <p className="text-2xl font-bold mt-1 text-gray-900">
                      {((mockSalesData.quarterlyData[3].actual / mockSalesData.quarterlyData[3].target) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <PieChart className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Statistik Cepat</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Minggu Dianalisis</span>
                    <span className="text-sm font-medium text-gray-800">52 weeks</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Kuartal</span>
                    <span className="text-sm font-medium text-gray-800">4 quarters</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Tren Pertumbuhan</span>
                    <span className={`text-sm font-medium ${mockSalesData.yearOnYearGrowth.variancePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {mockSalesData.yearOnYearGrowth.variancePercentage >= 0 ? 'Positif' : 'Negatif'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Kuartal Terbaik</span>
                    <span className="text-sm font-medium text-gray-800">
                      {mockSalesData.quarterlyData.reduce((max: any, q: any) => q.actual > max.actual ? q : max).quarter}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Ringkasan Performa</h3>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Analisis Mingguan:</strong> {mockSalesData.weekComparisons.filter((w: any) => w.variancePercentage > 0).length} dari 52 minggu menunjukkan pertumbuhan positif
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded border border-green-200">
                    <p className="text-sm text-green-800">
                      <strong>Performa Kuartal:</strong> {mockSalesData.quarterlyData.filter((q: any) => q.actual >= q.target).length} kuartal memenuhi atau melebihi target
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded border border-purple-200">
                    <p className="text-sm text-purple-800">
                      <strong>Tren Terkini:</strong> Rata-rata C4W {mockSalesData.l4wc4wData.variancePercentage >= 0 ? 'lebih tinggi' : 'lebih rendah'} dari L4W sebesar {Math.abs(mockSalesData.l4wc4wData.variancePercentage).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded border border-orange-200">
                    <p className="text-sm text-orange-800">
                      <strong>Pertumbuhan Tahunan:</strong> Performa tahun ke tahun {Math.abs(mockSalesData.yearOnYearGrowth.variancePercentage) >= 10 ? 'Luar biasa' : Math.abs(mockSalesData.yearOnYearGrowth.variancePercentage) >= 5 ? 'Kuat' : 'Sedang'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Analisis Sales {mockSalesData.weeklyData[0].year} - {mockSalesData.weeklyData[mockSalesData.weeklyData.length - 1].year}</h1>
              <p className="text-gray-600 mt-1">Analisis komprehensif performa sales tahun ke tahun</p>
            </div>
            <div className="text-sm text-gray-500">
              Terakhir diperbarui: {new Date().toLocaleDateString('id-ID')}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon
                    className={`mr-2 h-5 w-5 ${
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

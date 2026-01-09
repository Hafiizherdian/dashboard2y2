'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatPercentage } from '@/lib/utils';
import { Store, TrendingUp, Filter } from 'lucide-react';
import { OutletSalesData } from '@/types/sales';

/**
 * Props untuk OutletContributionSection
 */
interface OutletContributionSectionProps {
  data?: {
    outletData?: OutletSalesData[];
  }; // Data penjualan yang akan dianalisis
}

/**
 * Komponen Analisis Kontribusi Outlet
 * 
 * Menampilkan analisis kontribusi outlet berdasarkan:
 * - Tipe outlet (dapat difilter)
 * - Kontribusi per minggu (W1 - W52)
 * - DOZ Net dan persentase kontribusi
 * 
 * Fitur:
 * - Filter berdasarkan tipe outlet
 * - Bar chart untuk kontribusi per minggu
 * - Pie chart untuk distribusi kontribusi
 * - Summary cards dengan metrik utama
 */
export default function OutletContributionSection({ data }: OutletContributionSectionProps) {
  const [selectedOutletType, setSelectedOutletType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');

  // // Debug: Log data yang diterima
  // console.log('OutletContributionSection: Data yang diterima:', data);
  // console.log('OutletContributionSection: Panjang outletData:', data?.outletData?.length || 0);
  // if (data && data.outletData && data.outletData.length > 0) {
  //   console.log('OutletContributionSection: Sample outletData:', data.outletData[0]);
  //   console.log('OutletContributionSection: Sample outletData dengan product:', data.outletData.find(item => item.product));
  // }

  // Reset product filter ketika kategori berubah
  useEffect(() => {
    // console.log('OutletContributionSection: Category changed to:', selectedCategory);
    // if (selectedCategory !== 'all') {
    //   console.log('OutletContributionSection: Resetting product filter to "all"');
    //   setSelectedProduct('all');
    // }
  }, [selectedCategory]);

  /**
   * Menghasilkan data unik tipe outlet untuk filter
   */
  const outletTypes = useMemo(() => {
    if (!data || !data.outletData) {
      return [];
    }
    
    const types = new Set<string>();
    data.outletData.forEach((item: OutletSalesData) => {
      if (item.outletType) {
        types.add(item.outletType);
      }
    });
    
    return Array.from(types).sort();
  }, [data]);

  /**
   * Menghasilkan data unik kategori produk untuk filter
   */
  const categories = useMemo(() => {
    if (!data || !data.outletData) {
      // console.log('OutletContributionSection: Tidak ada data tersedia untuk kategori produk');
      return [];
    }
    
    // console.log('OutletContributionSection: Memproses category dari ', data.outletData.length, 'outletData items');
    
    const categorySet = new Set<string>();
    data.outletData.forEach((item: OutletSalesData) => {
      if (item.category) {
        categorySet.add(item.category);
        // console.log('Found category:', item.category);
      }
    });
    
    const result = Array.from(categorySet).sort();
    // console.log('OutletContributionSection: Final categories:', result);
    return result;
  }, [data]);

  /**
   * Menghasilkan data unik produk untuk filter
   */
  const products = useMemo(() => {
    // console.log('OutletContributionSection: Products useMemo dipanggil');
    if (!data || !data.outletData) {
      // console.log('OutletContributionSection: Tidak ada data tersedia untuk product');
      return [];
    }
    
    // console.log('OutletContributionSection: Memproses product dari', data.outletData.length, 'outletData items');
    
    const productSet = new Set<string>();
    
    // Filter data berdasarkan kategori yang dipilih
    const filteredDataForProducts = data.outletData.filter((item: OutletSalesData) => {
      return selectedCategory === 'all' || item.category === selectedCategory;
    });
    
    // console.log('OutletContributionSection: Filtered data for products:', filteredDataForProducts.length, 'items');
    
    filteredDataForProducts.forEach((item: OutletSalesData) => {
      if (item.product) {
        productSet.add(item.product);
        // console.log('Found product:', item.product);
      }
    });
    
    const result = Array.from(productSet).sort();
    // console.log('OutletContributionSection: Final products:', result);
    return result;
  }, [data, selectedCategory]);

  /**
   * Memfilter data berdasarkan tipe outlet, kategori, dan produk yang dipilih
   */
  const filteredData = useMemo(() => {
    // console.log('OutletContributionSection: FilteredData useMemo dipanggil', {
    //   selectedOutletType,
    //   selectedCategory,
    //   selectedProduct,
    //   dataLength: data?.outletData?.length
    // });
    
    if (!data || !data.outletData) {
      // console.log('OutletContributionSection: Tidak ada data untuk filtering');
      return [];
    }
    
    const filtered = data.outletData.filter((item: OutletSalesData) => {
      const outletMatch = selectedOutletType === 'all' || item.outletType === selectedOutletType;
      const categoryMatch = selectedCategory === 'all' || item.category === selectedCategory;
      const productMatch = selectedProduct === 'all' || item.product === selectedProduct;
      const result = outletMatch && categoryMatch && productMatch;
      
      if (!result && (selectedOutletType !== 'all' || selectedCategory !== 'all' || selectedProduct !== 'all')) {
        // console.log('Filtered out item:', {
        //   item: { outletType: item.outletType, category: item.category, product: item.product },
        //   matches: { outletMatch, categoryMatch, productMatch }
        // });
      }
      
      return result;
    });
    
    // console.log('OutletContributionSection: Jumlah data yang terfilter:', filtered.length);
    return filtered;
  }, [data, selectedOutletType, selectedCategory, selectedProduct]);

  /**
   * Menghitung total DOZ Net dan kontribusi per minggu
   */
  const weeklyContributions = useMemo(() => {
    const weekMap = new Map<string, { dozNet: number; week: string }>();
    
    filteredData.forEach((item: OutletSalesData) => {
      const weekKey = `W${item.week}`;
      const current = weekMap.get(weekKey) || { dozNet: 0, week: weekKey };
      current.dozNet += item.dozNet || 0;
      weekMap.set(weekKey, current);
    });
    
    return Array.from(weekMap.values())
      .sort((a, b) => {
        const weekNumA = parseInt(a.week.replace('W', ''));
        const weekNumB = parseInt(b.week.replace('W', ''));
        return weekNumA - weekNumB;
      });
  }, [filteredData]);

  /**
   * Menghitung total keseluruhan untuk persentase
   */
  const totalDozNet = useMemo(() => {
    return weeklyContributions.reduce((sum, week) => sum + week.dozNet, 0);
  }, [weeklyContributions]);

  /**
   * Data untuk bar chart dengan persentase kontribusi
   */
  const chartData = useMemo(() => {
    return weeklyContributions.map(week => ({
      week: week.week,
      dozNet: week.dozNet,
      percentage: totalDozNet > 0 ? (week.dozNet / totalDozNet) * 100 : 0
    }));
  }, [weeklyContributions, totalDozNet]);

  /**
   * Data untuk pie chart distribusi kontribusi
   */
  const pieData = useMemo(() => {
    const typeMap = new Map<string, number>();
    
    filteredData.forEach((item: OutletSalesData) => {
      const type = item.outletType || 'Unknown';
      const current = typeMap.get(type) || 0;
      typeMap.set(type, current + (item.dozNet || 0));
    });
    
    return Array.from(typeMap.entries()).map(([name, value]) => ({
      name,
      value,
      percentage: totalDozNet > 0 ? (value / totalDozNet) * 100 : 0
    }));
  }, [filteredData, totalDozNet]);

  /**
   * Metrik-metrik summary
   */
  const metrics = useMemo(() => {
    const avgWeekly = weeklyContributions.length > 0 
      ? totalDozNet / weeklyContributions.length 
      : 0;
    
    const bestWeek = weeklyContributions.reduce((best, current) => 
      current.dozNet > best.dozNet ? current : best, 
      { dozNet: 0, week: 'W1' }
    );
    
    const worstWeek = weeklyContributions.reduce((worst, current) => 
      current.dozNet < worst.dozNet ? current : worst, 
      { dozNet: Infinity, week: 'W1' }
    );
    
    return {
      totalDozNet,
      avgWeekly,
      bestWeek,
      worstWeek,
      totalWeeks: weeklyContributions.length
    };
  }, [weeklyContributions, totalDozNet]);

  /**
   * Warna untuk pie chart
   */
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Analisis Kontribusi Outlet</h2>
        <div className="flex items-center space-x-2">
          <Store className="h-5 w-5 text-gray-600" />
          <span className="text-sm text-gray-600">DOZ Net Analysis</span>
        </div>
      </div>

      {/* Filter Section */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
          {/* Filter Tipe Outlet */}
          <div className="flex items-center space-x-3">
            <Filter className="h-4 w-4 text-gray-600" />
            <label className="text-sm font-medium text-gray-700">Tipe Outlet:</label>
            <select
              value={selectedOutletType}
              onChange={(e) => setSelectedOutletType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">Semua Tipe</option>
              {outletTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Filter Kategori Produk */}
          <div className="flex items-center space-x-3">
            <Filter className="h-4 w-4 text-gray-600" />
            <label className="text-sm font-medium text-gray-700">Kategori Produk:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">Semua Kategori</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Filter Produk */}
          <div className="flex items-center space-x-3">
            <Filter className="h-4 w-4 text-gray-600" />
            <label className="text-sm font-medium text-gray-700">Produk:</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-w-48"
            >
              <option value="all">Semua Produk</option>
              {products.map(product => (
                <option key={product} value={product}>{product}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Info */}
        {(selectedOutletType !== 'all' || selectedCategory !== 'all' || selectedProduct !== 'all') && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedOutletType !== 'all' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm">
                Tipe: {selectedOutletType}
              </span>
            )}
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm">
                Kategori: {selectedCategory}
              </span>
            )}
            {selectedProduct !== 'all' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-sm">
                Produk: {selectedProduct}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {/* Total DOZ Net Card */}
        <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
          <div className="flex items-center space-x-3">
            <Store className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            <div>
              <h4 className="text-xs sm:text-sm font-medium text-blue-600">Total DOZ Net</h4>
              <p className="text-base sm:text-lg font-bold text-blue-800">
                {metrics.totalDozNet.toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-blue-600 mt-1">W1 - W52</p>
            </div>
          </div>
        </div>

        {/* Average Weekly Card */}
        <div className="bg-green-50 rounded-lg p-3 sm:p-4 border border-green-200">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
            <div>
              <h4 className="text-xs sm:text-sm font-medium text-green-600">Rata-rata/Minggu</h4>
              <p className="text-base sm:text-lg font-bold text-green-800">
                {metrics.avgWeekly.toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {metrics.totalWeeks} minggu
              </p>
            </div>
          </div>
        </div>

        {/* Best Week Card */}
        <div className="bg-purple-50 rounded-lg p-3 sm:p-4 border border-purple-200">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-purple-600 flex items-center justify-center">
              <span className="text-white text-xs sm:text-sm font-bold">↑</span>
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-medium text-purple-600">Minggu Terbaik</h4>
              <p className="text-base sm:text-lg font-bold text-purple-800">
                {metrics.bestWeek.week}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                {metrics.bestWeek.dozNet.toLocaleString('id-ID')} DOZ
              </p>
            </div>
          </div>
        </div>

        {/* Worst Week Card */}
        <div className="bg-red-50 rounded-lg p-3 sm:p-4 border border-red-200">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-red-600 flex items-center justify-center">
              <span className="text-white text-xs sm:text-sm font-bold">↓</span>
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-medium text-red-600">Minggu Terendah</h4>
              <p className="text-base sm:text-lg font-bold text-red-800">
                {metrics.worstWeek.week}
              </p>
              <p className="text-xs text-red-600 mt-1">
                {metrics.worstWeek.dozNet === Infinity ? 'N/A' : metrics.worstWeek.dozNet.toLocaleString('id-ID')} DOZ
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Bar Chart - Weekly Contributions */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Kontribusi Per Minggu</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="week" 
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip 
                formatter={(value: number | undefined, name?: string) => {
                  if (name === 'dozNet') {
                    return [`${value?.toLocaleString('id-ID')} DOZ`, 'DOZ Net'];
                  }
                  if (name === 'percentage') {
                    return [`${value?.toFixed(1)}%`, 'Kontribusi'];
                  }
                  return [value, name || ''];
                }}
              />
              <Bar 
                dataKey="dozNet" 
                fill="#3b82f6"
                name="DOZ Net"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Outlet Type Distribution */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Distribusi per Tipe Outlet</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.name}: ${entry.percentage?.toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number | undefined) => [
                  `${value?.toLocaleString('id-ID')} DOZ`, 
                  'Total'
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Detail Kontribusi Mingguan</h3>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="px-4 sm:px-0">
            <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Minggu
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DOZ Net
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kontribusi %
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {chartData.map((week, index) => (
                  <tr key={week.week} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {week.week}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {week.dozNet.toLocaleString('id-ID')}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {week.percentage.toFixed(2)}%
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        week.percentage >= 5 
                          ? 'bg-green-100 text-green-800'
                          : week.percentage >= 2
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {week.percentage >= 5 ? 'Tinggi' : week.percentage >= 2 ? 'Sedang' : 'Rendah'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

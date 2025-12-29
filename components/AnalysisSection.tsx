'use client';

import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Target, DollarSign } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/utils';

interface AnalysisSectionProps {
  data?: any;
}

export default function AnalysisSection({ data }: AnalysisSectionProps) {
  const [internalAnalysis, setInternalAnalysis] = useState('');
  const [externalAnalysis, setExternalAnalysis] = useState('');

  const analysis = useMemo(() => {
    if (!data || !data.quarterlyData || !data.yearOnYearGrowth) {
      return {
        targetAchievement: 0,
        growthRate: 0,
        avgSales: 0,
        bestQuarter: null,
        worstQuarter: null,
      };
    }

    const totalActual = data.quarterlyData.reduce((sum: number, q: any) => sum + q.actual, 0);
    const totalTarget = data.quarterlyData.reduce((sum: number, q: any) => sum + q.target, 0);
    const targetAchievement = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;

    const bestQuarter = data.quarterlyData.reduce((max: any, q: any) => 
      (q.actual / q.target) > (max.actual / max.target) ? q : max
    );

    const worstQuarter = data.quarterlyData.reduce((min: any, q: any) => 
      (q.actual / q.target) < (min.actual / min.target) ? q : min
    );

    return {
      targetAchievement,
      growthRate: data.yearOnYearGrowth.variancePercentage,
      avgSales: totalActual / (data.quarterlyData.length || 1),
      bestQuarter,
      worstQuarter,
    };
  }, [data]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Analisis Performa</h2>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center space-x-3">
            <Target className="h-8 w-8 text-blue-600" />
            <div>
              <h4 className="text-sm font-medium text-blue-600">Target Achievement</h4>
              <p className="text-lg font-bold text-blue-800">{formatPercentage(analysis.targetAchievement)}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div>
              <h4 className="text-sm font-medium text-green-600">Growth Rate</h4>
              <p className="text-lg font-bold text-green-800">{formatPercentage(analysis.growthRate)}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-8 w-8 text-purple-600" />
            <div>
              <h4 className="text-sm font-medium text-purple-600">Avg. Quarterly Sales</h4>
              <p className="text-lg font-bold text-purple-800">{formatCurrency(analysis.avgSales)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-3 flex items-center">
              <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
              Strengths
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              {analysis.bestQuarter && (
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  Kinerja {analysis.bestQuarter.quarter} melampaui target sebesar {formatPercentage(analysis.bestQuarter.variancePercentage)}
                </li>
              )}
              {analysis.growthRate > 0 && (
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  Pertumbuhan YoY yang positif sebesar {formatPercentage(analysis.growthRate)}
                </li>
              )}
            </ul>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-3 flex items-center">
              <TrendingDown className="h-5 w-5 text-red-600 mr-2" />
              Areas for Improvement
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              {analysis.worstQuarter && analysis.worstQuarter.variance < 0 && (
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  Kinerja {analysis.worstQuarter.quarter} di bawah target sebesar {formatPercentage(analysis.worstQuarter.variancePercentage)}
                </li>
              )}
               {analysis.growthRate < 0 && (
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  Penurunan YoY sebesar {formatPercentage(analysis.growthRate)}
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Analysis Text Areas */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Analisis Internal</h3>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Analisis faktor internal yang mempengaruhi performa penjualan:
            </p>
            <textarea
              value={internalAnalysis}
              onChange={(e) => setInternalAnalysis(e.target.value)}
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Contoh:&#10;• Kinerja tim sales meningkat setelah training&#10;• Produk baru mendapat respon positif&#10;• Promosi internal berjalan efektif&#10;• Perbaikan proses closing deal"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {internalAnalysis.length} karakter
              </span>
              <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Simpan Analisis Internal
              </button>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Analisis External</h3>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Analisis faktor eksternal yang mempengaruhi performa penjualan:
            </p>
            <textarea
              value={externalAnalysis}
              onChange={(e) => setExternalAnalysis(e.target.value)}
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Contoh:&#10;• Musim liburan meningkatkan permintaan&#10;• Kompetitor mengeluarkan promo agresif&#10;• Kondisi ekonomi mempengaruhi daya beli&#10;• Trend pasar berubah ke produk digital"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {externalAnalysis.length} karakter
              </span>
              <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Simpan Analisis External
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Rekomendasi Tindakan</h3>
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2"></div>
              <div>
                <h4 className="font-medium text-gray-700">Short-term (1-3 bulan)</h4>
                <p className="text-sm text-gray-600">Fokus pada improvement Q2 dengan target-specific campaigns dan sales coaching.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
              <div>
                <h4 className="font-medium text-gray-700">Medium-term (3-6 bulan)</h4>
                <p className="text-sm text-gray-600">Scale up successful Q4 strategies dan expand product portfolio.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <h4 className="font-medium text-gray-700">Long-term (6-12 bulan)</h4>
                <p className="text-sm text-gray-600">Market expansion dan digital transformation untuk sustain growth.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

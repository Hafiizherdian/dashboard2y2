/**
 * Komponen Analisis Performa Penjualan
 * 
 * Menampilkan analisis komprehensif performa penjualan meliputi:
 * - Summary cards dengan metrik utama (Target Achievement, Growth Rate, Avg Quarterly Sales)
 * - Key insights dengan identifikasi strengths dan areas for improvement
 * - Text areas untuk analisis internal dan eksternal
 * - Rekomendasi tindakan berdasarkan short, medium, dan long term
 * 
 * Komponen ini menerima data penjualan yang sudah diproses dan menghitung
 * berbagai metrik performa untuk ditampilkan dalam dashboard analisis.
 * 
 * @component
 * @example
 * ```tsx
 * <AnalysisSection data={salesData} />
 * ```
 */

'use client';

import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Target, DollarSign } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/utils';

/**
 * Props untuk komponen AnalysisSection
 * @interface AnalysisSectionProps
 * @property {any} data - Data penjualan yang berisi quarterlyData dan yearOnYearGrowth
 */
interface AnalysisSectionProps {
  data?: any;
}

export default function AnalysisSection({ data }: AnalysisSectionProps) {
  // State untuk menyimpan teks analisis internal dan eksternal
  const [internalAnalysis, setInternalAnalysis] = useState('');
  const [externalAnalysis, setExternalAnalysis] = useState('');
  
  // State untuk loading dan status simpan
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  /**
   * Handler untuk menyimpan analisis ke backend
   * @param type - 'internal' atau 'external'
   * @param content - Konten analisis yang akan disimpan
   */
  const handleSaveAnalysis = async (type: 'internal' | 'external', content: string) => {
    if (!content.trim()) {
      alert('Analisis tidak boleh kosong');
      return;
    }

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // TODO: Implement API call untuk menyimpan ke database
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          content,
          timestamp: new Date().toISOString(),
          metadata: {
            targetAchievement: analysis.targetAchievement,
            growthRate: analysis.growthRate,
            bestQuarter: analysis.bestQuarter?.quarter,
            worstQuarter: analysis.worstQuarter?.quarter,
          }
        }),
      });

      if (response.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        throw new Error('Gagal untuk save analysis');
      }
    } catch (error) {
      console.error('Error menyimpan analysis:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Menghitung metrik-metrik analisis performa dari data penjualan
   * 
   * Fungsi ini menggunakan useMemo untuk optimasi performa dan hanya
   * dihitung ulang ketika data berubah.
   * 
   * @returns {Object} Objek analisis dengan metrik performa:
   * - targetAchievement: Persentase pencapaian target keseluruhan
   * - growthRate: Persentase pertumbuhan tahun ke tahun
   * - avgSales: Rata-rata penjualan per kuartal
   * - bestQuarter: Kuartal dengan performa terbaik
   * - worstQuarter: Kuartal dengan performa terendah
   */
  const analysis = useMemo(() => {
    // Validasi data yang diperlukan untuk analisis
    if (!data || !data.quarterlyData || !data.yearOnYearGrowth) {
      return {
        targetAchievement: 0,
        growthRate: 0,
        avgSales: 0,
        bestQuarter: null,
        worstQuarter: null,
      };
    }

    // Menghitung total actual dan target dari semua kuartal
    const totalActual = data.quarterlyData.reduce((sum: number, q: any) => sum + q.actual, 0);
    const totalTarget = data.quarterlyData.reduce((sum: number, q: any) => sum + q.target, 0);
    
    // Persentase pencapaian target (actual/target * 100)
    const targetAchievement = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;

    // Mencari kuartal dengan performa terbaik (actual/target tertinggi)
    const bestQuarter = data.quarterlyData.reduce((max: any, q: any) => 
      (q.actual / q.target) > (max.actual / max.target) ? q : max
    );

    // Mencari kuartal dengan performa terendah (actual/target terendah)
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

  /**
   * Menghasilkan rekomendasi dinamis berdasarkan data performa
   * @returns {Object} Rekomendasi untuk short, medium, dan long term
   */
  const recommendations = useMemo(() => {
    const recs: {
      shortTerm: string[];
      mediumTerm: string[];
      longTerm: string[];
    } = {
      shortTerm: [],
      mediumTerm: [],
      longTerm: []
    };

    // Short-term recommendations (1-3 bulan)
    if (analysis.worstQuarter && analysis.worstQuarter.variance < 0) {
      recs.shortTerm.push(
        `Fokus improvement ${analysis.worstQuarter.quarter} dengan target-specific campaigns`
      );
    }
    if (analysis.growthRate < 0) {
      recs.shortTerm.push(
        'Implement emergency sales recovery plan dan promotional activities'
      );
    }
    if (analysis.targetAchievement < 80) {
      recs.shortTerm.push(
        'Intensifikasi sales coaching dan performance monitoring'
      );
    }

    // Medium-term recommendations (3-6 bulan)
    if (analysis.bestQuarter && analysis.bestQuarter.variance > 0) {
      recs.mediumTerm.push(
        `Scale up successful strategies dari ${analysis.bestQuarter.quarter}`
      );
    }
    if (analysis.growthRate > 5) {
      recs.mediumTerm.push(
        'Expand product portfolio dan market penetration'
      );
    }

    // Long-term recommendations (6-12 bulan)
    if (analysis.growthRate > 10) {
      recs.longTerm.push(
        'Market expansion ke new territories atau segments'
      );
    }
    if (analysis.targetAchievement > 100) {
      recs.longTerm.push(
        'Digital transformation dan technology investment'
      );
    }
    recs.longTerm.push(
      'Strategic planning untuk next year berdasarkan current trends'
    );

    // Fallback jika tidak ada rekomendasi spesifik
    if (recs.shortTerm.length === 0) {
      recs.shortTerm.push('Maintain current performance dan continuous improvement');
    }
    if (recs.mediumTerm.length === 0) {
      recs.mediumTerm.push('Monitor market trends dan adjust strategies accordingly');
    }
    if (recs.longTerm.length === 0) {
      recs.longTerm.push('Long-term strategic planning dan capacity building');
    }

    return recs;
  }, [analysis]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Analisis Performa</h2>
      
      {/* Summary Cards - Menampilkan metrik utama performa */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Target Achievement Card */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center space-x-3">
            <Target className="h-8 w-8 text-blue-600" />
            <div>
              <h4 className="text-sm font-medium text-blue-600">Target Achievement</h4>
              <p className="text-lg font-bold text-blue-800">{formatPercentage(analysis.targetAchievement)}</p>
            </div>
          </div>
        </div>

        {/* Growth Rate Card */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div>
              <h4 className="text-sm font-medium text-green-600">Growth Rate</h4>
              <p className="text-lg font-bold text-green-800">{formatPercentage(analysis.growthRate)}</p>
            </div>
          </div>
        </div>

        {/* Average Quarterly Sales Card */}
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

      {/* Key Insights - Menampilkan analisis kekuatan dan area perbaikan */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strengths Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-3 flex items-center">
              <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
              Strengths
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              {/* Menampilkan kuartal terbaik jika ada */}
              {analysis.bestQuarter && (
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  Kinerja {analysis.bestQuarter.quarter} melampaui target sebesar {formatPercentage(analysis.bestQuarter.variancePercentage)}
                </li>
              )}
              {/* Menampilkan pertumbuhan positif jika ada */}
              {analysis.growthRate > 0 && (
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  Pertumbuhan YoY yang positif sebesar {formatPercentage(analysis.growthRate)}
                </li>
              )}
            </ul>
          </div>

          {/* Areas for Improvement Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-3 flex items-center">
              <TrendingDown className="h-5 w-5 text-red-600 mr-2" />
              Areas for Improvement
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              {/* Menampilkan kuartal terburuk jika ada dan variance negatif */}
              {analysis.worstQuarter && analysis.worstQuarter.variance < 0 && (
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  Kinerja {analysis.worstQuarter.quarter} di bawah target sebesar {formatPercentage(analysis.worstQuarter.variancePercentage)}
                </li>
              )}
               {/* Menampilkan pertumbuhan negatif jika ada */}
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

      {/* Analysis Text Areas - Form untuk input analisis internal dan eksternal */}
      <div className="space-y-6">
        {/* Internal Analysis Section */}
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
              <button 
                onClick={() => handleSaveAnalysis('internal', internalAnalysis)}
                disabled={isSaving || !internalAnalysis.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Analisis Internal'
                )}
              </button>
            </div>
            {saveStatus === 'success' && (
              <div className="text-xs text-green-600 mt-1">✓ Analisis berhasil disimpan</div>
            )}
            {saveStatus === 'error' && (
              <div className="text-xs text-red-600 mt-1">✗ Gagal menyimpan analisis</div>
            )}
          </div>
        </div>

        {/* External Analysis Section */}
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
              <button 
                onClick={() => handleSaveAnalysis('external', externalAnalysis)}
                disabled={isSaving || !externalAnalysis.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Analisis External'
                )}
              </button>
            </div>
            {saveStatus === 'success' && (
              <div className="text-xs text-green-600 mt-1">✓ Analisis berhasil disimpan</div>
            )}
            {saveStatus === 'error' && (
              <div className="text-xs text-red-600 mt-1">✗ Gagal menyimpan analisis</div>
            )}
          </div>
        </div>
      </div>

      {/* Recommendations - Menampilkan rekomendasi tindakan dinamis berdasarkan data */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Rekomendasi Tindakan</h3>
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="space-y-3">
            {/* Short-term Recommendations */}
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2"></div>
              <div>
                <h4 className="font-medium text-gray-700">Short-term (1-3 bulan)</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {recommendations.shortTerm.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-yellow-600 mr-2">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Medium-term Recommendations */}
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
              <div>
                <h4 className="font-medium text-gray-700">Medium-term (3-6 bulan)</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {recommendations.mediumTerm.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Long-term Recommendations */}
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <h4 className="font-medium text-gray-700">Long-term (6-12 bulan)</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {recommendations.longTerm.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-600 mr-2">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Komponen Upload Data untuk CMS
 * 
 * Interface untuk upload file Excel/CSV
 */

'use client';

import { Upload } from 'lucide-react';

export default function UploadSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Upload Data</h2>
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Upload File Excel/CSV</h3>
          <p className="text-sm text-gray-600 mb-4">
            Drag and drop file Anda di sini, atau klik untuk memilih file
          </p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-block"
          >
            Pilih File
          </label>
        </div>
        <div className="mt-6">
          <h4 className="font-medium text-gray-700 mb-2">Format File yang Didukung:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Excel (.xlsx, .xls)</li>
            <li>• CSV (.csv)</li>
            <li>• Kolom yang dibutuhkan: Minggu, Tahun, Produk, Region, Penjualan, Target</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

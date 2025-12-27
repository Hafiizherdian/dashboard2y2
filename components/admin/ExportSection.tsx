/**
 * Komponen Export Data untuk CMS
 * 
 * Interface untuk export data dalam berbagai format
 */

'use client';

import { Download } from 'lucide-react';

export default function ExportSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Export Data</h2>
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Export Format</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input type="radio" name="format" value="excel" className="mr-2" defaultChecked />
                <span>Excel (.xlsx)</span>
              </label>
              <label className="flex items-center">
                <input type="radio" name="format" value="csv" className="mr-2" />
                <span>CSV (.csv)</span>
              </label>
              <label className="flex items-center">
                <input type="radio" name="format" value="json" className="mr-2" />
                <span>JSON (.json)</span>
              </label>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filter Data</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option>Semua Tahun</option>
                  <option>2024</option>
                  <option>2023</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option>Semua Region</option>
                  <option>Malang</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
}

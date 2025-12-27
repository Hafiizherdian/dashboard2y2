/**
 * Komponen Form Tambah Data Penjualan
 * 
 * Form untuk menambah data penjualan baru
 */

'use client';

import { Save, X } from 'lucide-react';
import { PartialSalesData } from '@/types/sales';

interface AddDataFormProps {
  isVisible: boolean;
  newItem: PartialSalesData;
  onNewItemChange: (item: PartialSalesData) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function AddDataForm({ 
  isVisible, 
  newItem, 
  onNewItemChange, 
  onSave, 
  onCancel 
}: AddDataFormProps) {
  if (!isVisible) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-700">Tambah Data Baru</h3>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Minggu</label>
          <input
            type="number"
            value={newItem.week || ''}
            onChange={(e) => onNewItemChange({...newItem, week: parseInt(e.target.value)})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
            max="52"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
          <input
            type="number"
            value={newItem.year || ''}
            onChange={(e) => onNewItemChange({...newItem, year: parseInt(e.target.value)})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="2020"
            max="2030"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Produk</label>
          <input
            type="text"
            value={newItem.product || ''}
            onChange={(e) => onNewItemChange({...newItem, product: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nama produk"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
          <input
            type="text"
            value={newItem.region || ''}
            onChange={(e) => onNewItemChange({...newItem, region: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Region"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Penjualan</label>
          <input
            type="number"
            value={newItem.sales || ''}
            onChange={(e) => onNewItemChange({...newItem, sales: parseInt(e.target.value)})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
          <input
            type="number"
            value={newItem.target || ''}
            onChange={(e) => onNewItemChange({...newItem, target: parseInt(e.target.value)})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Batal
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Simpan
        </button>
      </div>
    </div>
  );
}

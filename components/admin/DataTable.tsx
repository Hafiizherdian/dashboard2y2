/**
 * Komponen Tabel Data Penjualan untuk CMS
 * 
 * Menampilkan data penjualan dengan fitur CRUD inline editing
 */

'use client';

import { useState } from 'react';
import { Edit, Trash2, Save, X } from 'lucide-react';
import { SalesDataCMS } from '@/types/sales';

interface DataTableProps {
  data: SalesDataCMS[];
  editingItem: SalesDataCMS | null;
  onEdit: (item: SalesDataCMS) => void;
  onSave: () => void;
  onDelete: (id: string) => void;
  onCancelEdit: () => void;
  onEditChange: (item: SalesDataCMS) => void;
}

export default function DataTable({ 
  data, 
  editingItem, 
  onEdit, 
  onSave, 
  onDelete, 
  onCancelEdit, 
  onEditChange 
}: DataTableProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Minggu</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tahun</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produk</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Penjualan</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {editingItem?.id === item.id ? (
                    <input
                      type="number"
                      value={editingItem.week}
                      onChange={(e) => onEditChange({...editingItem, week: parseInt(e.target.value)})}
                      className="w-16 px-2 py-1 border border-gray-300 rounded"
                      min="1"
                      max="52"
                    />
                  ) : (
                    `W${item.week}`
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {editingItem?.id === item.id ? (
                    <input
                      type="number"
                      value={editingItem.year}
                      onChange={(e) => onEditChange({...editingItem, year: parseInt(e.target.value)})}
                      className="w-20 px-2 py-1 border border-gray-300 rounded"
                    />
                  ) : (
                    item.year
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {editingItem?.id === item.id ? (
                    <input
                      type="text"
                      value={editingItem.product}
                      onChange={(e) => onEditChange({...editingItem, product: e.target.value})}
                      className="w-32 px-2 py-1 border border-gray-300 rounded"
                    />
                  ) : (
                    item.product
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {editingItem?.id === item.id ? (
                    <input
                      type="text"
                      value={editingItem.region}
                      onChange={(e) => onEditChange({...editingItem, region: e.target.value})}
                      className="w-24 px-2 py-1 border border-gray-300 rounded"
                    />
                  ) : (
                    item.region
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {editingItem?.id === item.id ? (
                    <input
                      type="number"
                      value={editingItem.sales}
                      onChange={(e) => onEditChange({...editingItem, sales: parseInt(e.target.value)})}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                    />
                  ) : (
                    `Rp ${item.sales.toLocaleString('id-ID')}`
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {editingItem?.id === item.id ? (
                    <input
                      type="number"
                      value={editingItem.target}
                      onChange={(e) => onEditChange({...editingItem, target: parseInt(e.target.value)})}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                    />
                  ) : (
                    `Rp ${item.target.toLocaleString('id-ID')}`
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <span className={`font-medium ${item.sales >= item.target ? 'text-green-600' : 'text-red-600'}`}>
                    {editingItem?.id === item.id ? (
                      `Rp ${(editingItem.sales - editingItem.target).toLocaleString('id-ID')}`
                    ) : (
                      `Rp ${(item.sales - item.target).toLocaleString('id-ID')}`
                    )}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  {editingItem?.id === item.id ? (
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={onSave}
                        className="text-green-600 hover:text-green-900"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                      <button
                        onClick={onCancelEdit}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => onEdit(item)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

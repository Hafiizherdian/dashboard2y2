/**
 * CMS Dashboard Admin
 * 
 * Halaman admin untuk mengelola data penjualan
 * Menggunakan komponen modular untuk maintenance yang mudah
 */

'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { SalesDataCMS, PartialSalesData } from '@/types/sales';
import TabNavigation from '@/components/admin/TabNavigation';
import DataTable from '@/components/admin/DataTable';
import AddDataForm from '@/components/admin/AddDataForm';
import UploadSection from '@/components/admin/UploadSection';
import ExportSection from '@/components/admin/ExportSection';

export default function CMSDashboard() {
  const [activeTab, setActiveTab] = useState('data');
  const [salesData, setSalesData] = useState<SalesDataCMS[]>([
    { id: '1', week: 1, year: 2024, sales: 150000, target: 160000, product: 'CAKRA KRESNA 16 F', region: 'Malang' },
    { id: '2', week: 1, year: 2024, sales: 85000, target: 90000, product: 'ONLINE ES TELER 16 F', region: 'Malang' },
    { id: '3', week: 1, year: 2024, sales: 120000, target: 110000, product: 'INA BOLD 20 F', region: 'Malang' },
  ]);
  const [editingItem, setEditingItem] = useState<SalesDataCMS | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItem, setNewItem] = useState<PartialSalesData>({
    week: 1,
    year: 2024,
    sales: 0,
    target: 0,
    product: '',
    region: ''
  });

  const handleEdit = (item: SalesDataCMS) => {
    setEditingItem(item);
  };

  const handleSave = () => {
    if (editingItem) {
      setSalesData(prev => 
        prev.map(item => item.id === editingItem.id ? editingItem : item)
      );
      setEditingItem(null);
    }
  };

  const handleDelete = (id: string) => {
    setSalesData(prev => prev.filter(item => item.id !== id));
  };

  const handleAddNew = () => {
    if (newItem.product && newItem.region) {
      const newSalesData: SalesDataCMS = {
        id: Date.now().toString(),
        week: newItem.week || 1,
        year: newItem.year || 2024,
        sales: newItem.sales || 0,
        target: newItem.target || 0,
        product: newItem.product,
        region: newItem.region
      };
      setSalesData(prev => [...prev, newSalesData]);
      setNewItem({ week: 1, year: 2024, sales: 0, target: 0, product: '', region: '' });
      setIsAddingNew(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'data':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Data Penjualan</h2>
              <button
                onClick={() => setIsAddingNew(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Tambah Data
              </button>
            </div>

            {/* Form Tambah Data Baru */}
            <AddDataForm
              isVisible={isAddingNew}
              newItem={newItem}
              onNewItemChange={setNewItem}
              onSave={handleAddNew}
              onCancel={() => setIsAddingNew(false)}
            />

            {/* Tabel Data */}
            <DataTable
              data={salesData}
              editingItem={editingItem}
              onEdit={handleEdit}
              onSave={handleSave}
              onDelete={handleDelete}
              onCancelEdit={() => setEditingItem(null)}
              onEditChange={setEditingItem}
            />
          </div>
        );

      case 'upload':
        return <UploadSection />;

      case 'export':
        return <ExportSection />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">CMS Dashboard</h1>
              <p className="text-gray-600 mt-1">Manajemen Data Penjualan</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {renderContent()}
      </div>
    </div>
  );
}

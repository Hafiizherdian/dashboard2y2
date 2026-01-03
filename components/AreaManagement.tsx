'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { AreaConfig } from '@/lib/areaConfig';

interface AreaManagementProps {
  onAreasChange?: (areas: AreaConfig[]) => void;
}

export default function AreaManagement({ onAreasChange }: AreaManagementProps) {
  const [areas, setAreas] = useState<AreaConfig[]>([]);
  const [editingArea, setEditingArea] = useState<AreaConfig | null>(null);
  const [newArea, setNewArea] = useState<Partial<AreaConfig>>({
    id: '',
    name: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAreas();
  }, []);

  const loadAreas = async () => {
    try {
      console.log('AreaManagement: Loading areas...');
      const response = await fetch('/api/areas');
      console.log('AreaManagement: Areas response status:', response.status);
      if (!response.ok) {
        throw new Error('Failed to fetch areas');
      }
      const result = await response.json();
      console.log('AreaManagement: Areas result:', result);
      setAreas(result.data?.areas || []);
      onAreasChange?.(result.data?.areas || []);
      console.log('AreaManagement: Areas loaded:', result.data?.areas || []);
    } catch (error) {
      console.error('AreaManagement: Error loading areas:', error);
      setAreas([]);
    }
  };

  const handleSaveArea = async (area: AreaConfig) => {
    try {
      console.log('Saving area:', area);
      const response = await fetch('/api/areas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          area: area
        })
      });

      const result = await response.json();
      if (result.success) {
        setAreas(result.data?.areas || []);
        setEditingArea(null);
        onAreasChange?.(result.data?.areas || []);
        console.log('Area saved successfully');
      } else {
        alert(`Gagal menyimpan area: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving area:', error);
      alert('Gagal menyimpan area');
    }
  };

  const handleAddNewArea = async () => {
    console.log('handleAddNewArea called with:', newArea);
    if (!newArea.id || !newArea.name) {
      alert('Mohon lengkapi ID dan nama area');
      return;
    }

    const areaToAdd: AreaConfig = {
      id: newArea.id!,
      name: newArea.name!,
      description: newArea.description || ''
    };

    try {
      console.log('Adding area:', areaToAdd);
      const response = await fetch('/api/areas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add',
          area: areaToAdd
        })
      });

      const result = await response.json();
      if (result.success) {
        setAreas(result.data?.areas || []);
        onAreasChange?.(result.data?.areas || []);
        
        // Reset form
        setNewArea({
          id: '',
          name: '',
          description: ''
        });
        console.log('Area added successfully');
      } else {
        alert(`Gagal menambah area: ${result.error}`);
      }
    } catch (error) {
      console.error('Error adding area:', error);
      alert('Gagal menambah area');
    }
  };

  const handleDeleteArea = async (areaId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus area ini?')) {
      try {
        console.log('Deleting area:', areaId);
        const response = await fetch('/api/areas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'delete',
            area: { id: areaId }
          })
        });

        const result = await response.json();
        if (result.success) {
          setAreas(result.data?.areas || []);
          onAreasChange?.(result.data?.areas || []);
          console.log('Area deleted successfully');
        } else {
          alert(`Gagal menghapus area: ${result.error}`);
        }
      } catch (error) {
        console.error('Error deleting area:', error);
        alert('Gagal menghapus area');
      }
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Management Area</h2>
        <div className="text-sm text-gray-600">
          Konfigurasi area untuk upload data
        </div>
      </div>

      {/* Existing Areas */}
      <div className="space-y-4 mb-8">
        {areas.map(area => (
          <div key={area.id} className="border border-gray-200 rounded-lg p-4">
            {editingArea?.id === area.id ? (
              // Edit Mode
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Area ID</label>
                    <input
                      type="text"
                      value={editingArea.id}
                      onChange={(e) => setEditingArea({...editingArea, id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Area</label>
                    <input
                      type="text"
                      value={editingArea.name}
                      onChange={(e) => setEditingArea({...editingArea, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <input
                    type="text"
                    value={editingArea.description || ''}
                    onChange={(e) => setEditingArea({...editingArea, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveArea(editingArea)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Save className="h-4 w-4" />
                    Simpan
                  </button>
                  <button
                    onClick={() => setEditingArea(null)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    <X className="h-4 w-4" />
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{area.name}</h3>
                    <p className="text-sm text-gray-600">{area.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingArea(area)}
                      className="p-2 text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteArea(area.id)}
                      className="p-2 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add New Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Tambah Area Baru</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Area ID *</label>
              <input
                type="text"
                value={newArea.id}
                onChange={(e) => setNewArea({...newArea, id: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                placeholder="contoh: area_jakarta"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Area *</label>
              <input
                type="text"
                value={newArea.name}
                onChange={(e) => setNewArea({...newArea, name: e.target.value})}
                placeholder="contoh: Area Jakarta"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
            <input
              type="text"
              value={newArea.description || ''}
              onChange={(e) => setNewArea({...newArea, description: e.target.value})}
              placeholder="Deskripsi area (opsional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleAddNewArea}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Tambah Area
          </button>
        </div>
      </div>
    </div>
  );
}

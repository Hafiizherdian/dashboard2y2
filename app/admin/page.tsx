/**
 * Admin Dashboard - Upload Excel/CSV to PostgreSQL
 * 
 * Halaman admin untuk upload data penjualan dari Excel/CSV ke database
 * Hanya admin yang bisa mengakses
 */

'use client';

import { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Trash2, Eye, Database, Users, Settings, MapPin } from 'lucide-react';
import { UploadedFile, DatabaseStats } from '@/types/database';
import AreaManagement from '@/components/AreaManagement';
import { AreaConfig } from '@/lib/areaConfig';

export default function AdminDashboard() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedArea, setSelectedArea] = useState('');
  const [availableAreas, setAvailableAreas] = useState<AreaConfig[]>([]);

  // Fetch data dari database
  useEffect(() => {
    fetchData();
    loadAreas();
  }, []);

  const loadAreas = async () => {
    try {
      console.log('Loading areas...');
      const response = await fetch('/api/areas');
      console.log('Areas response status:', response.status);
      if (!response.ok) {
        throw new Error('Gagal untuk fetch areas');
      }
      const result = await response.json();
      console.log('Areas result:', result);
      setAvailableAreas(result.data?.areas || []);
      console.log('Available areas set:', result.data?.areas || []);
    } catch (error) {
      console.error('Error loading areas:', error);
      setAvailableAreas([]);
    }
  };

  // Refresh areas ketika berpindah ke tab area
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'areas') {
      loadAreas(); // Refresh areas ketika berpindah ke tab area
    }
  };

  const fetchData = async () => {
    try {
      const [filesResponse, statsResponse] = await Promise.all([
        fetch('/api/files'),
        fetch('/api/stats')
      ]);

      if (filesResponse.ok) {
        const filesData = await filesResponse.json();
        setUploadedFiles(filesData.data || []);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setDbStats(statsData.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const excelFile = files.find(file => 
      file.name.endsWith('.xlsx') || 
      file.name.endsWith('.xls') || 
      file.name.endsWith('.csv')
    );
    
    if (excelFile) {
      setSelectedFile(excelFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (selectedArea) {
        formData.append('area', selectedArea);
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        // Refresh data
        await fetchData();
        setSelectedFile(null);
        
        // Menampilkan success message
        alert(`File berhasil di upload! ${result.data.record_count} records processed.`);
      } else {
        alert(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload gagal. Silahkan coba kembali.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus file ini?')) return;

    try {
      const response = await fetch(`/api/files?id=${encodeURIComponent(fileId)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        const message = errorPayload?.error || 'Failed to delete file';
        alert(message);
        return;
      }

      await fetchData();
      alert('File deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed. Please try again.');
    }
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed':
        return 'Selesai';
      case 'processing':
        return 'Memproses';
      case 'error':
        return 'Error';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">Admin</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('upload')}
              className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Upload
                className={`mr-2 h-5 w-5 ${
                  activeTab === 'upload' ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                }`}
              />
              Upload Data
            </button>
            <button
              onClick={() => handleTabChange('areas')}
              className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'areas'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MapPin
                className={`mr-2 h-5 w-5 ${
                  activeTab === 'areas' ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                }`}
              />
              Management Area
            </button>
            <button
              onClick={() => handleTabChange('settings')}
              className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings
                className={`mr-2 h-5 w-5 ${
                  activeTab === 'settings' ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                }`}
              />
              Pengaturan
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'upload' && (
          <>
            {dbStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Records</p>
                      <p className="text-2xl font-bold text-gray-900">{dbStats.total_records.toLocaleString('id-ID')}</p>
                    </div>
                    <Database className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Omzet</p>
                      <p className="text-2xl font-bold text-gray-900">Rp {dbStats.total_omzet.toLocaleString('id-ID')}</p>
                    </div>
                    <FileSpreadsheet className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total File di Upload</p>
                      <p className="text-2xl font-bold text-gray-900">{dbStats.total_files}</p>
                    </div>
                    <Upload className="h-8 w-8 text-purple-500" />
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Upload terbaru</p>
                      <p className="text-lg font-bold text-gray-900">
                        {dbStats.latest_upload ? new Date(dbStats.latest_upload).toLocaleDateString('id-ID') : 'No data'}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-emerald-500" />
                  </div>
                </div>
              </div>
            )}

            {/* Upload Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">Upload File Baru</h2>
                <p className="text-sm text-gray-600 mt-1">Pilih file Excel atau CSV yang berisi data penjualan</p>
              </div>

              <div className="p-6">
                {/* Drop Zone */}
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                    isDragging 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors duration-300 ${
                    isDragging ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {isDragging ? 'Lepaskan file di sini' : 'Drag & Drop File Excel/CSV'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    atau klik untuk memilih file dari komputer
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-block transition-colors duration-200"
                  >
                    Pilih File
                  </label>
                </div>

                {/* Selected File */}
                {selectedFile && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="space-y-4">
                      {/* Area Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Area untuk Upload</label>
                        <select
                          value={selectedArea}
                          onChange={(e) => setSelectedArea(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">-- Pilih Area --</option>
                          {availableAreas.map(area => (
                            <option key={area.id} value={area.id}>{area.name}</option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Semua data dalam file akan dimasukkan ke area yang dipilih
                        </p>
                      </div>

                      {/* File Info */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-gray-900">{selectedFile.name}</p>
                            <p className="text-sm text-gray-600">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedFile(null);
                              setSelectedArea('');
                            }}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleUpload}
                            disabled={isUploading || !selectedArea}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                          >
                            {isUploading ? 'Mengupload...' : 'Upload'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Format Requirements */}
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-3">Format File yang Diperlukan:</h4>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p><strong>Kolom yang harus ada:</strong></p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <span className="bg-white px-2 py-1 rounded border border-gray-200">Minggu</span>
                      <span className="bg-white px-2 py-1 rounded border border-gray-200">Tanggal</span>
                      <span className="bg-white px-2 py-1 rounded border border-gray-200">Produk</span>
                      <span className="bg-white px-2 py-1 rounded border border-gray-200">Kategori</span>
                      <span className="bg-white px-2 py-1 rounded border border-gray-200">No.Customer</span>
                      <span className="bg-white px-2 py-1 rounded border border-gray-200">Customer</span>
                      <span className="bg-white px-2 py-1 rounded border border-gray-200">Tipe Customer</span>
                      <span className="bg-white px-2 py-1 rounded border border-gray-200">Kota</span>
                      <span className="bg-white px-2 py-1 rounded border border-gray-200">Omzet (Nett)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Uploaded Files List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">File yang Diupload</h2>
                <p className="text-sm text-gray-600 mt-1">Riwayat upload data penjualan</p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        File Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Upload Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Records
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Omzet
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {uploadedFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center space-x-2">
                            <FileSpreadsheet className="h-4 w-4 text-green-500" />
                            <span>{file.original_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(file.created_at).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {file.record_count.toLocaleString('id-ID')} records
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          Rp {file.total_omzet.toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(file.status)}
                            <span className="text-sm text-gray-600">{getStatusText(file.status)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => setShowPreview(showPreview === file.id ? null : file.id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(file.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Area Management Tab */}
        {activeTab === 'areas' && (
          <AreaManagement />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Pengaturan</h2>
            <div className="space-y-6">
              {/* Database Migration */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Database Migration</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Jalankan migration untuk menambahkan kolom area dan update struktur database
                </p>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/migrate', { method: 'POST' });
                      const result = await response.json();
                      if (result.success) {
                        alert('Migration completed successfully!');
                      } else {
                        alert(`Migration failed: ${result.error}`);
                      }
                    } catch (error) {
                      alert('Migration failed. Please try again.');
                    }
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Run Migration
                </button>
              </div>

              {/* Other Settings */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Pengaturan Lainnya</h3>
                <p className="text-sm text-gray-600">
                  Pengaturan lainnya akan segera hadir...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

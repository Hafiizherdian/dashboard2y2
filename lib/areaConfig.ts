/**
 * Konfigurasi area grouping
 * Admin bisa mengkonfigurasi area yang tersedia untuk upload data
 */

export interface AreaConfig {
  id: string;
  name: string;
  description?: string;
}

// Default area configuration - bisa diubah oleh admin
export const defaultAreas: AreaConfig[] = [
  {
    id: 'banyuwangi',
    name: 'Area Banyuwangi',
    description: 'Wilayah Banyuwangi dan sekitarnya'
  },
  {
    id: 'jember',
    name: 'Area Jember',
    description: 'Wilayah Jember dan sekitarnya'
  },
  {
    id: 'surabaya',
    name: 'Area Surabaya',
    description: 'Wilayah Surabaya Raya'
  },
  {
    id: 'malang',
    name: 'Area Malang',
    description: 'Wilayah Malang Raya'
  },
  {
    id: 'pasuruan',
    name: 'Area Pasuruan',
    description: 'Wilayah Pasuruan Raya'
  }
];

// Fungsi untuk mendapatkan semua area yang tersedia
export function getAllAreas(areas: AreaConfig[] = defaultAreas): AreaConfig[] {
  return areas;
}

// Fungsi untuk mendapatkan area berdasarkan ID
export function getAreaById(areaId: string, areas: AreaConfig[] = defaultAreas): AreaConfig | null {
  return areas.find(area => area.id === areaId) || null;
}

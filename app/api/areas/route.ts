/**
 * API route untuk mengambil daftar area yang tersedia
 * Endpoint: GET /api/areas, POST /api/areas
 * Returns: Array of area configurations
 */

import { NextRequest, NextResponse } from 'next/server';
import { defaultAreas } from '@/lib/areaConfig';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

// File untuk menyimpan custom areas
const AREAS_FILE = join(process.cwd(), 'data', 'areas.json');

// Helper untuk membaca areas dari file
async function getStoredAreas(): Promise<any[]> {
  try {
    const data = await readFile(AREAS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Jika file tidak ada, return default areas
    return defaultAreas;
  }
}

// Helper untuk menyimpan areas ke file
async function saveAreasToFile(areas: any[]): Promise<void> {
  try {
    await writeFile(AREAS_FILE, JSON.stringify(areas, null, 2));
  } catch (error) {
    console.error('Error saving areas:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Ambil areas dari file atau default
    const areas = await getStoredAreas();
    
    return NextResponse.json({
      success: true,
      data: {
        areas: areas
      },
      count: areas.length
    });

  } catch (error) {
    console.error('Error fetching areas:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch areas' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { area, action } = body;

    let areas = await getStoredAreas();

    if (action === 'add') {
      // Tambah area baru
      const exists = areas.some((a: any) => a.id === area.id);
      if (exists) {
        return NextResponse.json(
          { success: false, error: 'Area dengan ID ini sudah ada' },
          { status: 400 }
        );
      }
      areas = [...areas, area];
    } else if (action === 'update') {
      // Update area existing
      areas = areas.map((a: any) => a.id === area.id ? area : a);
    } else if (action === 'delete') {
      // Hapus area
      areas = areas.filter((a: any) => a.id !== area.id);
    }

    // Simpan ke file
    await saveAreasToFile(areas);

    return NextResponse.json({
      success: true,
      data: {
        areas: areas
      },
      count: areas.length
    });

  } catch (error) {
    console.error('Error managing areas:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to manage areas' },
      { status: 500 }
    );
  }
}

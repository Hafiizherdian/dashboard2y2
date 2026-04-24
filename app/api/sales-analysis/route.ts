import { NextRequest, NextResponse } from 'next/server';
import { fetchSalesData } from '@/lib/database';
import { withAuth } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  return withAuth(request, 'view_stats', async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      
      // Parse filter parameters
      const filters: any = {};
      
      const year1 = searchParams.get('year1');
      const year2 = searchParams.get('year2');
      const weekStart1 = searchParams.get('weekStart1');
      const weekEnd1 = searchParams.get('weekEnd1');
      const weekStart2 = searchParams.get('weekStart2');
      const weekEnd2 = searchParams.get('weekEnd2');
      const product = searchParams.get('product');
      const city = searchParams.get('city');
      const area = searchParams.get('area');
      const limit = searchParams.get('limit');
      const selectedUnit = searchParams.get('selectedUnit');

      if (year1) filters.year1 = parseInt(year1);
      if (year2) filters.year2 = parseInt(year2);
      if (weekStart1) filters.weekStart1 = parseInt(weekStart1);
      if (weekEnd1) filters.weekEnd1 = parseInt(weekEnd1);
      if (weekStart2) filters.weekStart2 = parseInt(weekStart2);
      if (weekEnd2) filters.weekEnd2 = parseInt(weekEnd2);
      if (product) filters.product = product;
      if (city) filters.city = city;
      if (area) filters.area = area;
      if (limit) filters.limit = parseInt(limit);
      if (selectedUnit) filters.selectedUnit = selectedUnit;

      // Apply area-based filtering for non-root users
      if (user.role !== 'root' && user.allowed_areas && user.allowed_areas.length > 0) {
  if (filters.area) {
    // Ada area spesifik — validasi akses
    if (!user.allowed_areas.includes(filters.area)) {
      return NextResponse.json(
        { success: false, error: 'Anda tidak memiliki akses ke area ini' },
        { status: 403 }
      );
    }
    // filters.area valid, biarkan
  } else {
    // Tidak pilih area → pakai semua allowed areas
    filters.allowedAreas = user.allowed_areas;
  }
}
// root tanpa area filter → tidak perlu set apa-apa, fetch semua

      const data = await fetchSalesData(filters);
      
      return NextResponse.json({ 
        success: true, 
        data 
      });
    } catch (error) {
      console.error('[API/sales-analysis] Error:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

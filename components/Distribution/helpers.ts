import type { DistData, FilterOptions } from './types';

// Constants
export const WEEKS_ARR  = Array.from({ length: 52 }, (_, i) => i + 1);
export const TAB_BAR_H  = 42;
export const SUB_TAB_H  = 38;

// Helpers
export const fmtN     = (v: number) => (v ?? 0).toLocaleString('id-ID', { maximumFractionDigits: 1 });
export const achColor = (p: number) => p >= 100 ? '#10b981' : p >= 80 ? '#f59e0b' : '#ef4444';

export const EMPTY_FILTER_OPTIONS: FilterOptions = {
  outlets: [], villages: [], districts: [], cities: [],
};

export const EMPTY_DATA: DistData = {
  summary: {
    total_plan: 0, total_actual: 0, total_av_in: 0, total_ec: 0,
    total_av_out: 0, total_outlets: 0, total_salesmen: 0,
    total_products: 0, total_customers: 0, overall_achievement: 0,
  },
  achievementSalesman:        [],
  achievementProduct:         [],
  achievementArea:            [],
  trend:                      [],
  coverage:                   [],
  coverageSalesman:           [],
  outletCountByType:          [],
  outletCountByTypeSalesman:  [],
  totalOutlets:               0,
  achievementSalesmanProduct: [],
  consecutiveStreak:          [],
  filterOptions:              EMPTY_FILTER_OPTIONS,
};

export function normRows(rows: any[]): any[] {
  return rows.map(r => ({
    ...r,
    total_plan:      parseFloat(r.total_plan      ?? 0),
    total_actual:    parseFloat(r.total_actual    ?? 0),
    total_av_in:     parseFloat(r.total_av_in     ?? 0),
    total_ec:        parseFloat(r.total_ec        ?? 0),
    total_av_out:    parseFloat(r.total_av_out    ?? 0),
    achievement_pct: parseFloat(r.achievement_pct ?? 0),
    outlet_count:    parseInt(r.outlet_count      ?? 0, 10),
  }));
}

// NOTE:
// fetch ke /api/distribution HANYA terjadi ketika tombol "Terapkan" ditekan (loadData) atau saat areaFilter berganti (reset). 
// Filter Produk, Tipe Outlet, Kota, Kecamatan, Kelurahan, dan Outlet TIDAK auto-fetch 
// begitu dipilih nilainya cuma disimpan di state lokal dan baru dikirim ke server saat "Terapkan" ditekan.
//
// FILTER SALESMAN:
// Salesman TIDAK LAGI dikirim ke server / memicu refetch. Semua tabel yang sudah di-fetch dan relevan untuk filter salesman 
// (achievementSalesman, achievementSalesmanProduct, coverageSalesman) SUDAH granular per-salesman (bukan hasil SUM lintas salesman), 
// jadi memfilternya di client dengan `.filter(r => r.salesman === salesmanFilter)` aman dan tidak butuh agregasi ulang apa pun beda dari kasus reaggregate() lama di atas.

// Konsekuensinya: summary (KPI cards), trend chart, achievementProduct (view=Produk), dan consecutiveStreak TIDAK ikut ter-filter oleh salesman,
// karena tidak ada versi granular per-salesman dari agregat tersebut di client. 
// Kalau nanti dibutuhkan, itu berarti query granular baru di server.

export function normalizeResponse(raw: any): DistData {
  raw.summary = {
    ...raw.summary,
    total_plan:          parseFloat(raw.summary.total_plan          ?? 0),
    total_actual:        parseFloat(raw.summary.total_actual        ?? 0),
    total_av_in:         parseFloat(raw.summary.total_av_in         ?? 0),
    total_ec:            parseFloat(raw.summary.total_ec            ?? 0),
    total_av_out:        parseFloat(raw.summary.total_av_out        ?? 0),
    total_outlets:       parseFloat(raw.summary.total_outlets       ?? 0),
    total_salesmen:      parseFloat(raw.summary.total_salesmen      ?? 0),
    total_products:      parseFloat(raw.summary.total_products      ?? 0),
    total_customers:     parseFloat(raw.summary.total_customers     ?? 0),
    overall_achievement: parseFloat(raw.summary.overall_achievement ?? 0),
  };
  raw.achievementSalesman = normRows(raw.achievementSalesman);
  raw.achievementProduct  = normRows(raw.achievementProduct);
  raw.achievementArea     = normRows(raw.achievementArea);
  raw.coverage            = normRows(raw.coverage);
  raw.coverageSalesman    = raw.coverageSalesman.map((r: any) => ({
    ...r,
    plan:            parseFloat(r.plan            ?? 0),
    actual:          parseFloat(r.actual          ?? 0),
    av_in:           parseFloat(r.av_in           ?? 0),
    ec:              parseFloat(r.ec              ?? 0),
    av_out:          parseFloat(r.av_out          ?? 0),
    achievement_pct: parseFloat(r.achievement_pct ?? 0),
  }));
  raw.trend = raw.trend.map((r: any) => ({
    ...r,
    total_plan:    parseFloat(r.total_plan    ?? 0),
    total_actual:  parseFloat(r.total_actual  ?? 0),
    total_av_in:   parseFloat(r.total_av_in   ?? 0),
    total_ec:      parseFloat(r.total_ec      ?? 0),
    total_av_out:  parseFloat(r.total_av_out  ?? 0),
    outlet_count:  parseFloat(r.outlet_count  ?? 0),
  }));
  raw.outletCountByType = (raw.outletCountByType ?? []).map((r: any) => ({
    outlet_type:  r.outlet_type,
    outlet_count: parseInt(r.outlet_count ?? 0),
  }));
  raw.totalOutlets = parseInt(raw.totalOutlets ?? 0);
  raw.outletCountByTypeSalesman = (raw.outletCountByTypeSalesman ?? []).map((r: any) => ({
    salesman:     r.salesman,
    outlet_type:  r.outlet_type,
    outlet_count: parseInt(r.outlet_count ?? 0),
  }));
  raw.achievementSalesmanProduct = (raw.achievementSalesmanProduct ?? []).map((r: any) => ({
    ...r,
    total_plan:      parseFloat(r.total_plan      ?? 0),
    total_actual:    parseFloat(r.total_actual    ?? 0),
    total_av_in:     parseFloat(r.total_av_in     ?? 0),
    total_ec:        parseFloat(r.total_ec        ?? 0),
    total_av_out:    parseFloat(r.total_av_out    ?? 0),
    achievement_pct: parseFloat(r.achievement_pct ?? 0),
    outlet_count:    parseInt(r.outlet_count      ?? 0),
  }));
  raw.consecutiveStreak = (raw.consecutiveStreak ?? []).map((r: any) => ({
    ...r,
    jumlah_minggu_berturut: Number(r.jumlah_minggu_berturut ?? 0),
    minggu_awal:            Number(r.minggu_awal            ?? 0),
    minggu_akhir:           Number(r.minggu_akhir           ?? 0),
    daftar_minggu:          String(r.daftar_minggu          ?? ''),
  }));
  raw.filterOptions = {
    outlets:   raw.filterOptions?.outlets   ?? [],
    villages:  raw.filterOptions?.villages  ?? [],
    districts: raw.filterOptions?.districts ?? [],
    cities:    raw.filterOptions?.cities    ?? [],
  };
  return raw as DistData;
}
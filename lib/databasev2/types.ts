/**
 * Tipe-tipe internal yang dipakai lintas file di module databasev2.
 * Ini bukan tipe publik API (itu ada di @/types/sales) — ini murni
 * struktur data internal untuk agregasi & query target.
 */

// Filter khusus tab Outlet (hanya memengaruhi hasil `outlet`, bukan tab lain)
export interface OutletFilterParams {
  outletType?:   string;
  category?:     string;
  product?:      string;
  city?:         string;
  district?:     string;
  salesman?:     string;
  customerNo?:   string;
  customerName?: string;
  q?:            string;
}

export interface FetchFilters {
  year1?: number;
  year2?: number;
  product?: string;
  city?: string;
  area?: string;
  weekStart1?: number;
  weekEnd1?: number;
  weekStart2?: number;
  weekEnd2?: number;
  selectedUnit?: string;
  allowedAreas?: string[];

  // true → hanya hitung `outlet` (lewati target, piutang, stok, kuartal, L4W, dst.)
  outletOnly?: boolean;
  // Filter tab Outlet (draft yang sudah di-"Terapkan")
  outlet?: OutletFilterParams;
}

// Tipe internal untuk agregasi streaming
export interface UnitAgg {
  bks:  number;
  slop: number;
  bal:  number;
  dos:  number;
}

// Tipe untuk hasil query target (dipakai antara targetQueries.ts & quarterlyData.ts / index.ts)
export interface ProductTargetRow {
  product:    string;
  units_dos:  number;
  units_bks:  number;
  units_slop: number;
  units_bal:  number;
}

export interface ProductQuarterTargetRow {
  product:    string;
  quarter:    number;
  units_dos:  number;
  units_bks:  number;
  units_slop: number;
  units_bal:  number;
}

export interface WeekQuarterTargetRow {
  week: string; quarter: string;
  units_dos: string; units_bks: string; units_slop: string; units_bal: string;
}
export interface ProductQuarterRawRow {
  product: string; quarter: string;
  units_dos: string; units_bks: string; units_slop: string; units_bal: string;
}
export interface ProductWeekRawRow {
  product: string; week: string;
  units_dos: string; units_bks: string; units_slop: string; units_bal: string;
}

export type TargetQueriesResult = [WeekQuarterTargetRow[], ProductQuarterRawRow[], ProductWeekRawRow[]];
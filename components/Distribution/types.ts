import type { AreaConfig } from '@/lib/areaConfig';

export type Theme = 'dark' | 'light';

export interface AchRow {
  salesman?:       string;
  product?:        string;
  city?:           string;
  district?:       string;
  category?:       string;
  total_plan:      number;
  total_actual:    number;
  total_av_out:    number;
  achievement_pct: number;
  outlet_count?:   number;
}
export interface TrendRow {
  week:          string;
  week_num:      number;
  product?:      string;
  total_plan:    number;
  total_actual:  number;
  total_av_in:   number;
  total_ec:      number;
  total_av_out:  number;
  outlet_count:  number;
}
export interface CovRow {
  outlet_type:     string;
  product?:        string;
  total_plan:      number;
  total_actual:    number;
  total_av_in:     number;
  total_ec:        number;
  total_av_out:    number;
  outlet_count:    number;
  achievement_pct: number;
}
export interface CovSalRow {
  salesman:        string;
  week_num:        number;
  week:            string;
  product?:        string;
  outlet_type?:    string;
  plan:            number;
  actual:          number;
  av_in:           number;
  ec:              number;
  av_out:          number;
  achievement_pct: number;
}
export interface AchSalesmanProductRow {
  salesman:        string;
  product:         string;
  total_plan:      number;
  total_actual:    number;
  total_av_in:     number;
  total_ec:        number;
  total_av_out:    number;
  achievement_pct: number;
  outlet_count:    number;
}
export interface OutletCountByType {
  outlet_type:  string;
  outlet_count: number;
}
export interface OutletCountByTypeSalesman {
  salesman:     string;
  outlet_type:  string;
  outlet_count: number;
}
export interface StreakRow {
  area:                   string | null;
  salesman:               string | null;
  customer_id:            string;
  outlet:                 string;
  outlet_type:            string;
  product:                string;
  jumlah_minggu_berturut: number;
  minggu_awal:            number;
  minggu_akhir:           number;
  daftar_minggu:          string;
}
export interface Summary {
  total_plan:          number;
  total_actual:        number;
  total_av_in:         number;
  total_ec:            number;
  total_av_out:        number;
  total_outlets:       number;
  total_salesmen:      number;
  total_products:      number;
  total_customers:     number;
  overall_achievement: number;
}

// Opsi dropdown untuk filter Kota / Kecamatan / Kelurahan / Outlet.
// Dikirim server dari query terpisah (hanya difilter area), supaya opsi tidak menyusut saat filter lain aktif.
export interface FilterOptions {
  outlets:   string[];
  villages:  string[];
  districts: string[];
  cities:    string[];
}

export interface DistData {
  summary:                      Summary;
  achievementSalesman:          AchRow[];
  achievementProduct:           AchRow[];
  achievementArea:              AchRow[];
  trend:                        TrendRow[];
  coverage:                     CovRow[];
  coverageSalesman:             CovSalRow[];
  outletCountByType:            OutletCountByType[];
  outletCountByTypeSalesman:    OutletCountByTypeSalesman[];
  totalOutlets:                 number;
  achievementSalesmanProduct:   AchSalesmanProductRow[];
  consecutiveStreak:            StreakRow[];
  filterOptions?:               FilterOptions;
}

// State UI yang disimpan di page.tsx supaya selamat saat user pindah menu (komponen ini di-unmount).
// Pola sama dengan tab Outlet: yang disimpan hanya filter yang SUDAH DITERAPKAN + opsi dropdown.
// Pilihan yang belum diterapkan tidak dipulihkan (tabel yang tampil memang belum mengikutinya).
export interface DistUIState {
  area: string;
  applied: {
    weekStart: number; weekEnd: number;
    product: string; outletType: string;
    city: string; district: string; village: string; outlet: string;
  };
  salesman: string; // filter salesman instan di client
  options: {
    products:    string[];
    outletTypes: string[];
    salesmen:    string[];
    geo:         FilterOptions;
  };
}

// Props dari page.tsx
export interface DistributionSectionProps {
  theme?:             Theme;
  areas?:             AreaConfig[];
  areaFilter?:        string;
  weekStart?:         number;
  weekEnd?:           number;
  onWeekStartChange?: (v: number) => void;
  onWeekEndChange?:   (v: number) => void;
  cachedData?:        DistData | null;
  onDataLoaded?:      (data: DistData) => void;
  loaded?:            boolean;
  loading?:           boolean;
  onLoadingChange?:   (v: boolean) => void;
  uiState?:           DistUIState | null;
  onUiStateChange?:   (patch: Partial<DistUIState>) => void;
}
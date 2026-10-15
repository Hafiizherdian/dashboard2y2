/**
 * Tipe untuk tab Outlet. Semua agregasi dihitung di server (/api/outlet-analysis),
 * browser hanya menerima hasil ringkas (puluhan KB), bukan puluhan ribu baris mentah.
 */

export type OutletRow = Record<string, string | number>;

export type OutletPanel = {
  total: number;
  records: number;
  weekly: Record<number, number>;
  outletTypes: string[];
  pieOutlet:    { name: string; value: number }[];
  pieCategory:  { name: string; value: number }[];
  barProduct:   OutletRow[];
  barCity:      OutletRow[];
  barDistrict:  OutletRow[];
  barCustomer:  OutletRow[];   // { customer, _customerId, <tipe outlet>: n, _total }
};

export type OutletOptions = {
  outletTypes: string[];
  categories:  string[];
  products:    { category: string; product: string }[];
  cities:      string[];
  districts:   { city: string; district: string }[];
  salesmen:    string[];
  customers:   { no: string; name: string; city: string }[];
};

export type OutletResponse = {
  unit: string;
  years: { p1: number; p2: number };
  weekRange: { min: number; max: number };
  p1: OutletPanel;
  p2: OutletPanel;
  options?: OutletOptions;   // hanya ada kalau withOptions=1
};

export type OutletFilterValues = {
  outletType: string; category: string; product: string; city: string;
  district: string; salesman: string; customerNo: string; customerName: string;
  q: string;
};

export const EMPTY_OUTLET_FILTERS: OutletFilterValues = {
  outletType: '', category: '', product: '', city: '',
  district: '', salesman: '', customerNo: '', customerName: '', q: '',
};

export const EMPTY_OUTLET_OPTIONS: OutletOptions = {
  outletTypes: [], categories: [], products: [], cities: [],
  districts: [], salesmen: [], customers: [],
};
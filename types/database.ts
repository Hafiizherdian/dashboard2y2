/**
 * Type definitions untuk database schema PostgreSQL
 */

export interface SalesRecord {
  id: string;
  grand_total: string;
  week: number;
  date: Date;
  product: string;
  category: string;
  customer_no: string;
  customer: string;
  customer_type: string;
  salesman: string;
  village: string;
  district: string;
  city: string;
  units_bks: number;
  units_slop: number;
  units_bal: number;
  units_dos: number;
  omzet: number;
  created_at: Date;
  updated_at: Date;
}

export interface UploadedFile {
  id: string;
  filename: string;
  original_name: string;
  file_size: number;
  record_count: number;
  total_omzet: number;
  status: 'processing' | 'completed' | 'error';
  error_message?: string;
  uploaded_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface DatabaseStats {
  total_records: number;
  total_omzet: number;
  total_files: number;
  latest_upload: Date | null;
}

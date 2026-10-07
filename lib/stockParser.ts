/**
 * lib/stockParser.ts
 * Parser laporan Stock Level (format cetak per area, mis. "Banyuwangi_05_oktober_2026.xlsx").
 *
 * Layout file:
 *   baris 1   : header (Product ID | Produk | DOS | BKS | Konv. DOS | DOS 4 Weeks | AVG/Week | Stok Level)
 *   "Kategori: Sigaret Kretek Mesin (SKM)"  -> baris kategori (berlaku untuk produk di bawahnya)
 *   baris produk
 *   "Dicetak: 5 October 2026 09:50 ... BANYUWANGI ..." -> footer (tanggal laporan + nama area)
 *
 * Input: array-of-arrays dari
 *   XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true, blankrows: false })
 */

export interface StockRow {
  product_id: string | null;
  product: string;
  category: string;
  units_dos: number;
  units_bks: number;
  konv_dos: number;
  dos_4weeks: number;
  avg_week: number;
  stock_level: number | null; // null = tidak ada data (mis. avg/week 0)
}

export interface ParsedStock {
  rows: StockRow[];
  reportDate: string | null; // 'YYYY-MM-DD'
  areaName: string | null;   // dari footer, mis. 'BANYUWANGI'
}

export const STOCK_REQUIRED_COLUMNS = [
  'Product ID', 'Produk', 'DOS', 'BKS', 'Konv. DOS', 'DOS 4 Weeks', 'AVG/Week', 'Stok Level',
];

const norm = (v: unknown) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5, jul: 6,
  agu: 7, ags: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11,
};

function num(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const n = parseFloat(v.trim().replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'string' && !v.trim()) return null;
  return num(v);
}

function parseDicetak(text: string): string | null {
  const m = text.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase().slice(0, 3)];
  if (month === undefined) return null;
  const d = new Date(Date.UTC(parseInt(m[3], 10), month, parseInt(m[1], 10)));
  return d.toISOString().slice(0, 10);
}

export function parseStockSheet(grid: unknown[][]): ParsedStock {
  // 1. cari baris header
  let headerRow = -1;
  for (let i = 0; i < Math.min(grid.length, 15); i++) {
    const keys = (grid[i] || []).map(norm);
    if (keys.includes('produk') && keys.includes('stoklevel')) { headerRow = i; break; }
  }
  if (headerRow === -1) {
    throw new Error(`Header tidak ditemukan. Kolom yang diperlukan: ${STOCK_REQUIRED_COLUMNS.join(', ')}`);
  }

  const idx: Record<string, number> = {};
  (grid[headerRow] || []).forEach((cell, i) => {
    const k = norm(cell);
    if (k && idx[k] === undefined) idx[k] = i;
  });

  const missing = ['produk', 'dos', 'bks', 'konvdos', 'dos4weeks', 'avgweek', 'stoklevel'].filter(k => idx[k] === undefined);
  if (missing.length) {
    throw new Error(`Kolom tidak lengkap. Kolom yang diperlukan: ${STOCK_REQUIRED_COLUMNS.join(', ')}`);
  }

  // 2. baca baris data
  const rows: StockRow[] = [];
  let category = '';
  let reportDate: string | null = null;
  let areaName: string | null = null;

  for (let i = headerRow + 1; i < grid.length; i++) {
    const row = grid[i] || [];
    const firstIdx = row.findIndex(c => c !== null && c !== undefined && String(c).trim() !== '');
    if (firstIdx === -1) continue;
    const first = String(row[firstIdx]).trim();

    // baris kategori
    const cat = first.match(/^kategori\s*:\s*(.*)$/i);
    if (cat) { category = cat[1].trim(); continue; }

    // footer
    if (/^dicetak\s*:/i.test(first)) {
      reportDate = parseDicetak(first);
      for (let j = firstIdx + 1; j < row.length; j++) {
        const c = row[j];
        if (typeof c !== 'string') continue;
        const t = c.trim();
        if (!t || /^(halaman|dari)$/i.test(t) || !isNaN(Number(t))) continue;
        areaName = t;
        break;
      }
      continue;
    }

    // baris produk
    const product = String(row[idx['produk']] ?? '').trim();
    if (!product) continue;

    const pidIdx = idx['productid'];
    const pidRaw = pidIdx === undefined ? null : (row[pidIdx] ?? row[pidIdx + 1] ?? null);

    rows.push({
      product_id: pidRaw ? String(pidRaw).trim() : null,
      product,
      category,
      units_dos: num(row[idx['dos']]),
      units_bks: num(row[idx['bks']]),
      konv_dos: num(row[idx['konvdos']]),
      dos_4weeks: num(row[idx['dos4weeks']]),
      avg_week: num(row[idx['avgweek']]),
      stock_level: numOrNull(row[idx['stoklevel']]),
    });
  }

  return { rows, reportDate, areaName };
}
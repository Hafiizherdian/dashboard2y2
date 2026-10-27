'use client';

import { useState, useMemo, useCallback } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { tk } from './theme';
import type { DistData, StreakRow, Theme } from './types';

// Repeat Order outlet x produk dengan EC & Plan terpenuhi berturut-turut.
// Baris dengan customer_id sama digabung jadi 1 baris, dan kolom
// "Daftar Minggu" diganti kolom W (sel terisi = minggu itu masuk streak).
// Kolom W yang tampil mengikuti rentang minggu filter utama (weekStart–weekEnd).
//
// SORT HEADER:
// Klik header untuk mengurutkan. Siklus: arah pertama → arah kebalikan → reset
// ke urutan default (Salesman → Customer ID → Produk, A–Z).
// - Kolom teks (Salesman, Customer ID, Outlet, Tipe Outlet, Produk): mulai A–Z.
// - Kolom "Total" dan kolom W1..W52: mulai dari terbesar / ✓ dulu.
// Sort murni di client atas baris yang sudah digabung, tidak memicu fetch.
const ALL_WEEKS = Array.from({ length: 52 }, (_, i) => i + 1);

type StreakGroupedRow = {
  salesman:    string;
  customer_id: string;
  outlet:      string;
  outlet_type: string;
  product:     string;
  weeks:       Set<number>;
};

type StreakSort = { key: string; dir: 'asc' | 'desc' } | null;

const STREAK_SORT_LABEL: Record<string, string> = {
  salesman:    'Salesman',
  customer_id: 'Customer ID',
  outlet:      'Outlet',
  outlet_type: 'Tipe Outlet',
  product:     'Produk',
  total:       'Total',
};

function parseWeeks(r: StreakRow): number[] {
  // Ambil angka dari daftar_minggu (format "W1, W2" / "1,2,3" sama-sama aman)
  const fromList = (r.daftar_minggu ?? '').match(/\d+/g)?.map(Number) ?? [];
  if (fromList.length > 0) return fromList;
  // Fallback: streak itu berurutan, jadi pakai rentang awal–akhir
  const out: number[] = [];
  for (let w = r.minggu_awal; w <= r.minggu_akhir; w++) out.push(w);
  return out;
}

export default function StreakContent({
  data, theme, weekStart, weekEnd, salesmanFilter,
}: {
  data: DistData;
  theme: Theme;
  weekStart: number;
  weekEnd: number;
  salesmanFilter: string;
}) {
  const t = tk[theme];
  // search & minStreak belum punya UI (input-nya sedang dikomentari), tapi tetap ikut memfilter.
  const [search]                  = useState('');
  const [minStreak]               = useState(4);
  const [sort,      setSort]      = useState<StreakSort>(null);

  // Kolom minggu mengikuti filter utama
  const weekCols = useMemo(
    () => ALL_WEEKS.filter(w => w >= weekStart && w <= weekEnd),
    [weekStart, weekEnd]
  );

  const all = useMemo(
    () => salesmanFilter
      ? (data.consecutiveStreak ?? []).filter(r => r.salesman === salesmanFilter)
      : (data.consecutiveStreak ?? []),
    [data.consecutiveStreak, salesmanFilter]
  );

  // 1) filter di level streak (min. minggu + search)
  // 2) gabungkan per customer_id + produk → 1 baris.
  //    Produk beda = baris beda. Streak berbeda dari customer & produk yang sama tetap digabung (minggunya di-union).
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = all.filter(r =>
      r.jumlah_minggu_berturut >= minStreak &&
      (!q ||
        (r.outlet      ?? '').toLowerCase().includes(q) ||
        (r.product     ?? '').toLowerCase().includes(q) ||
        (r.customer_id ?? '').toLowerCase().includes(q))
    );

    const map = new Map<string, StreakGroupedRow>();

    filtered.forEach(r => {
      const key = `${r.customer_id || r.outlet}||${r.product || ''}`;
      if (!map.has(key)) {
        map.set(key, {
          salesman:    r.salesman ?? '',
          customer_id: r.customer_id,
          outlet:      r.outlet,
          outlet_type: r.outlet_type,
          product:     r.product,
          weeks:       new Set(),
        });
      }
      parseWeeks(r).forEach(w => map.get(key)!.weeks.add(w));
    });

    // Urutan default: baris customer yang sama berdekatan
    return Array.from(map.values()).sort((a, b) =>
      (a.salesman ?? '').localeCompare(b.salesman ?? '') ||
      (a.customer_id ?? '').localeCompare(b.customer_id ?? '') ||
      (a.product ?? '').localeCompare(b.product ?? '')
    );
  }, [all, search, minStreak]);

  // Jumlah minggu streak yang tampil di kolom (hanya dalam rentang filter minggu)
  const countInRange = useCallback(
    (weeks: Set<number>) => weekCols.reduce((n, w) => n + (weeks.has(w) ? 1 : 0), 0),
    [weekCols]
  );

  // Klik header: arah pertama → arah kebalikan → reset ke default.
  const handleSort = (key: string, firstDir: 'asc' | 'desc' = 'asc') => {
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: firstDir };
      if (prev.dir === firstDir)     return { key, dir: firstDir === 'asc' ? 'desc' : 'asc' };
      return null;
    });
  };

  // Sort di client atas baris yang sudah digabung. Array.sort stabil, jadi baris yang nilainya sama tetap mengikuti urutan default (Salesman → Customer ID → Produk).
  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const mul = sort.dir === 'asc' ? 1 : -1;
    const cmpStr = (x?: string, y?: string) =>
      (x ?? '').localeCompare(y ?? '', 'id', { numeric: true, sensitivity: 'base' });

    return [...rows].sort((a, b) => {
      let c = 0;
      if (sort.key.startsWith('w:')) {
        const w = Number(sort.key.slice(2));
        c = (a.weeks.has(w) ? 1 : 0) - (b.weeks.has(w) ? 1 : 0);
      } else if (sort.key === 'total') {
        c = countInRange(a.weeks) - countInRange(b.weeks);
      } else {
        c = cmpStr((a as any)[sort.key], (b as any)[sort.key]);
      }
      return c * mul;
    });
  }, [rows, sort, countInRange]);

  // Lebar kolom sticky (kiri)
  const W_NO = 36, W_SAL = 130, W_CUST = 120, W_OUT = 150, W_TYPE = 130, W_PROD = 150, W_TOTAL = 52;
  const stickyBase = { position: 'sticky' as const, background: t.cardBg };
  const thBase = {
    padding: '8px 12px', fontSize: 9, fontWeight: 700,
    textTransform: 'uppercase' as const, letterSpacing: '0.07em',
    color: t.tableHeadText, borderBottom: `1px solid ${t.border}`,
    whiteSpace: 'nowrap' as const, position: 'sticky' as const,
    top: 0, background: t.tableHeadBg,
  };

  // Ikon indikator sort. `compact` = header sempit (kolom minggu): ikon hanya muncul saat aktif.
  const sortIcon = (key: string, compact = false) => {
    const active = sort?.key === key;
    if (!active) {
      return compact ? null : <ArrowUpDown size={9} style={{ opacity: 0.4, flexShrink: 0 }} />;
    }
    return sort!.dir === 'asc'
      ? <ArrowUp   size={10} style={{ flexShrink: 0 }} />
      : <ArrowDown size={10} style={{ flexShrink: 0 }} />;
  };

  // Header yang bisa diklik untuk sort.
  const sortableTh = (
    key: string,
    label: ReactNode,
    extra: CSSProperties,
    opts: { firstDir?: 'asc' | 'desc'; compact?: boolean; reactKey?: string | number } = {},
  ) => {
    const { firstDir = 'asc', compact = false, reactKey } = opts;
    const active = sort?.key === key;
    const centered = extra.textAlign === 'center';
    return (
      <th
        key={reactKey}
        onClick={() => handleSort(key, firstDir)}
        title="Klik untuk mengurutkan"
        aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
        style={{ ...thBase, cursor: 'pointer', userSelect: 'none', ...extra }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? 2 : 4, justifyContent: centered ? 'center' : 'flex-start' }}>
          {label}{sortIcon(key, compact)}
        </span>
      </th>
    );
  };

  const sortLabel = sort
    ? (sort.key.startsWith('w:') ? `W${sort.key.slice(2)}` : (STREAK_SORT_LABEL[sort.key] ?? sort.key))
    : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ border: `1px solid ${t.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 520 }}>
          <table style={{ borderCollapse: 'collapse', fontFamily: 'IBM Plex Mono,monospace' }}>
            <thead>
              <tr>
                <th style={{ ...thBase, textAlign: 'left', left: 0, zIndex: 30, minWidth: W_NO, width: W_NO }}>#</th>
                {sortableTh('salesman',    'Salesman',    { textAlign: 'left', left: W_NO,                                   zIndex: 30, minWidth: W_SAL,  width: W_SAL })}
                {sortableTh('customer_id', 'Customer ID', { textAlign: 'left', left: W_NO + W_SAL,                           zIndex: 30, minWidth: W_CUST, width: W_CUST })}
                {sortableTh('outlet',      'Outlet',      { textAlign: 'left', left: W_NO + W_SAL + W_CUST,                  zIndex: 30, minWidth: W_OUT,  width: W_OUT })}
                {sortableTh('outlet_type', 'Tipe Outlet', { textAlign: 'left', left: W_NO + W_SAL + W_CUST + W_OUT,          zIndex: 30, minWidth: W_TYPE, width: W_TYPE })}
                {sortableTh('product',     'Produk',      { textAlign: 'left', left: W_NO + W_SAL + W_CUST + W_OUT + W_TYPE, zIndex: 30, minWidth: W_PROD, width: W_PROD })}
                {sortableTh('total', 'Total',             { textAlign: 'center', left: W_NO + W_SAL + W_CUST + W_OUT + W_TYPE + W_PROD, zIndex: 30, minWidth: W_TOTAL, width: W_TOTAL, padding: '8px 6px', borderRight: `2px solid ${t.border}`, }, { firstDir: 'desc' })}
                {weekCols.map(w =>
                  sortableTh(`w:${w}`, `W${w}`, { textAlign: 'center', zIndex: 20, padding: '8px 0', minWidth: 30, width: 30 }, { firstDir: 'desc', compact: true, reactKey: w })
                )}
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr><td colSpan={7 + weekCols.length} style={{ padding: '24px', textAlign: 'center', color: t.textMuted, fontSize: 11 }}>Belum ada data</td></tr>
              ) : sortedRows.map((r, i) => (
                <tr key={`${r.salesman}-${r.customer_id}-${r.outlet}-${r.product}`}>
                  <td style={{ ...stickyBase, left: 0, zIndex: 10, padding: '7px 12px', fontSize: 10, color: t.textMuted }}>{i + 1}</td>
                  <td style={{ ...stickyBase, left: W_NO, zIndex: 10, padding: '7px 12px', fontSize: 11, fontWeight: 600, color: t.text, whiteSpace: 'nowrap', minWidth: W_SAL, width: W_SAL }}>{r.salesman || '—'}</td>
                  <td style={{ ...stickyBase, left: W_NO + W_SAL, zIndex: 10, padding: '7px 12px', fontSize: 10, color: t.textSub, whiteSpace: 'nowrap' }}>{r.customer_id || '—'}</td>
                  <td style={{ ...stickyBase, left: W_NO + W_SAL + W_CUST, zIndex: 10, padding: '7px 12px', fontSize: 11, fontWeight: 600, color: t.text, whiteSpace: 'nowrap' }}>{r.outlet}</td>
                  <td style={{ ...stickyBase, left: W_NO + W_SAL + W_CUST + W_OUT, zIndex: 10, padding: '7px 12px', fontSize: 11, fontWeight: 600, color: t.text, whiteSpace: 'nowrap', minWidth: W_TYPE, width: W_TYPE }}>{r.outlet_type}</td>
                  <td style={{ ...stickyBase, left: W_NO + W_SAL + W_CUST + W_OUT + W_TYPE, zIndex: 10, padding: '7px 12px', fontSize: 10, color: t.text, whiteSpace: 'nowrap', minWidth: W_PROD, width: W_PROD }}>{r.product || '—'}</td>
                  <td style={{ ...stickyBase, left: W_NO + W_SAL + W_CUST + W_OUT + W_TYPE + W_PROD, zIndex: 10, padding: '7px 6px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: t.text, minWidth: W_TOTAL, width: W_TOTAL, borderRight: `2px solid ${t.border}`,
                  }}>
                    {countInRange(r.weeks)}
                  </td>
                  {weekCols.map(w => {
                    const on = r.weeks.has(w);
                    return (
                      <td key={w}
                        title={on ? `${r.outlet} (W${w})` : undefined}
                        style={{
                          padding: 0, textAlign: 'center', width: 30, minWidth: 40, height: 28,
                          background: on ? 'rgba(16,185,129,0.22)' : (i % 2 === 1 ? t.rowAlt : 'transparent'),
                          borderLeft: `1px solid ${t.border}`,
                          color: on ? t.posText : t.textFaint,
                          fontSize: 10, fontWeight: 700,
                        }}>
                        {on ? '✓' : 'X'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '8px 12px', borderTop: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 10, color: t.textMuted, fontFamily: 'IBM Plex Mono,monospace', minHeight: 20 }}>
          {sort ? (
            <>
              <span>
                Diurutkan: <b style={{ color: t.text }}>{sortLabel}</b> {sort.dir === 'asc' ? '↑' : '↓'}
              </span>
              <button
                onClick={() => setSort(null)}
                style={{ background: 'none', border: `1px solid ${t.inputBorder}`, borderRadius: 4, color: t.textSub, fontSize: 10, fontFamily: 'IBM Plex Mono,monospace', cursor: 'pointer', padding: '1px 8px' }}
              >
                Reset urutan
              </button>
            </>
          ) : (
            <span>Klik header kolom untuk mengurutkan</span>
          )}
        </div>
      </div>
    </div>
  );
}
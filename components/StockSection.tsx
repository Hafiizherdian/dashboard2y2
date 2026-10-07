'use client';

import React, { useMemo, useState } from 'react';
import { useBreakpoint } from '@/lib/dashboard-theme';
import type { Theme } from '@/lib/dashboard-theme';
import { AreaConfig } from '@/lib/areaConfig';
import { StockRecord } from '@/types/sales';
import {
  Search, ArrowUpDown, Package, CalendarSync, CalendarCheck2,
  PackageCheck, AlertTriangle, PackagePlus, PackageX,
  PackageMinus, X,
} from 'lucide-react';

// Theme
const tk = {
  dark: {
    pagebg:      '#07090e',
    cardbg:      '#0e1118',
    card1bg:'#0d1a28', card1border:'#1a3a5c', card1text:'#7eb8f7', card1accent:'#3b82f6',
    card2bg:'#0a1d14', card2border:'#1a4530', card2text:'#5edba8', card2accent:'#10b981',
    card3bg:'#1a1108', card3border:'#3d2b08', card3text:'#f5d060', card3accent:'#f59e0b',
    card4bg:'#290f0f', card4border:'#5c1a1a', card4text:'#fca5a5', card4accent:'#ef4444',
    card5bg:'#170f24', card5border:'#3b225c', card5text:'#c084fc', card5accent:'#a855f7',
    card6bg:'#091c21', card6border:'#164652', card6text:'#67e8f9', card6accent:'#06b6d4',
    border:      'rgba(255,255,255,0.055)',
    borderCard:  'rgba(255,255,255,0.075)',
    borderInput: 'rgba(255,255,255,0.09)',
    tableHead:   '#fef08a',
    tableHeadText: 'rgb(0, 0, 0)',
    tableAlt:    'rgba(255,255,255,0.015)',
    rowHover:    'rgba(255,255,255,0.04)',
    text:        'rgba(255,255,255,0.9)',
    textSub:     'rgba(255,255,255,0.52)',
    textMuted:   'rgba(255,255,255,0.28)',
    textFaint:   'rgba(255,255,255,0.13)',
    inputBg:     'rgba(255,255,255,0.035)',
    shadow:      'none',
    green:  { bg:'rgba(16,185,129,0.09)',  text:'#34d399', border:'rgba(16,185,129,0.2)'  },
    yellow: { bg:'rgba(245,158,11,0.07)',  text:'#fbbf24', border:'rgba(245,158,11,0.18)' },
    red:    { bg:'rgba(239,68,68,0.08)',   text:'#fca5a5', border:'rgba(239,68,68,0.18)'  },
    blue:   { bg:'rgba(59,130,246,0.1)',   text:'#93c5fd', border:'rgba(59,130,246,0.22)' },
    purple: { bg:'rgba(168,85,247,0.08)',  text:'#c084fc', border:'rgba(168,85,247,0.2)'  },
    cyan:   { bg:'rgba(6,182,212,0.08)',   text:'#67e8f9', border:'rgba(6,182,212,0.2)'   },
  },
  light: {
    pagebg:      '#eef1f7',
    cardbg:      '#ffffff',
    card1bg:'#eff6ff', card1border:'#bfdbfe', card1text:'#1d4ed8', card1accent:'#3b82f6',
    card2bg:'#f0fdf4', card2border:'#bbf7d0', card2text:'#15803d', card2accent:'#10b981',
    card3bg:'#fefce8', card3border:'#fde68a', card3text:'#92400e', card3accent:'#f59e0b',
    card4bg:'#fef2f2', card4border:'#fecaca', card4text:'#b91c1c', card4accent:'#ef4444',
    card5bg:'#faf5ff', card5border:'#e9d5ff', card5text:'#6b21a8', card5accent:'#a855f7',
    card6bg:'#ecfeff', card6border:'#c5f6fa', card6text:'#0e7490', card6accent:'#06b6d4',
    border:      'rgba(0,0,0,0.065)',
    borderCard:  'rgba(0,0,0,0.08)',
    borderInput: 'rgba(0,0,0,0.1)',
    tableHead:   '#fef08a',
    tableHeadText: 'rgb(0, 0, 0)',
    tableAlt:    'rgba(0,0,0,0.018)',
    rowHover:    'rgba(0,0,0,0.035)',
    text:        '#0f172a',
    textSub:     '#475569',
    textMuted:   '#94a3b8',
    textFaint:   '#cbd5e1',
    inputBg:     'rgba(0,0,0,0.03)',
    shadow:      '0 1px 3px rgba(0,0,0,0.06)',
    green:  { bg:'rgba(28, 239, 91, 0.17)',  text:'#15803d', border:'#bbf7d0' },
    yellow: { bg:'rgba(244, 203, 38, 0.15)', text:'#92400e', border:'#fde68a' },
    red:    { bg:'rgba(241, 42, 42, 0.11)',  text:'#b91c1c', border:'#fecaca' },
    blue:   { bg:'rgba(37,99,235,0.07)',     text:'#1d4ed8', border:'rgba(37,99,235,0.2)'  },
    purple: { bg:'rgba(168,85,247,0.06)',    text:'#6b21a8', border:'rgba(168,85,247,0.15)' },
    cyan:   { bg:'rgba(6, 181, 212, 0.1)',   text:'#0e7490', border:'rgba(6,182,212,0.18)' },
  },
} as const;

type TK = typeof tk[keyof typeof tk];

// Tipe & logika status
interface Agg {
  key: string;
  product: string;
  category: string;
  dos: number;
  bks: number;
  konv: number;
  w4: number;
  avg: number;
  level: number | null; // minggu stok = konv_dos / avg_week; null jika tidak ada penjualan
  areas: number;
}

type Status = 'kritis' | 'aman' | 'overstock' | 'nosales' | 'kosong';
type SortKey = 'product' | 'dos' | 'bks' | 'konv' | 'w4' | 'avg' | 'level';

// Otomatis (stok level = Konv. DOS / Avg/Week):
//  - Kritis    : Konv. DOS < Avg/Week      (stok level < 1)
//  - Overstock : Konv. DOS > 2 x Avg/Week  (stok level > 2)
const LOW = 1;
const HIGH = 2;

const STATUS_LABEL: Record<Status, string> = {
  kritis: 'Kritis', aman: 'Aman', overstock: 'Overstock', nosales: 'Tanpa penjualan', kosong: 'Kosong',
};

const num = (v: number | null | undefined, d = 2) =>
  v === null || v === undefined ? '—' : v.toLocaleString('id-ID', { maximumFractionDigits: d });

const fmtDate = (s: string) =>
  new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

// Stok level dihitung dari total konv_dos / total avg_week (bukan rata-rata level antar baris)
const levelOf = (konv: number, avg: number): number | null => (avg > 0 ? konv / avg : null);

function statusOf(konv: number, level: number | null): Status {
  if (level === null) return konv > 0 ? 'nosales' : 'kosong';
  if (level < LOW) return 'kritis';
  if (level > HIGH) return 'overstock';
  return 'aman';
}

function aggregate(rows: StockRecord[], keyFn: (r: StockRecord) => string, nameFn: (r: StockRecord) => string): Agg[] {
  const map = new Map<string, Agg & { _areas: Set<string> }>();
  for (const r of rows) {
    const key = keyFn(r);
    let a = map.get(key);
    if (!a) {
      a = { key, product: nameFn(r), category: r.category || 'Tanpa kategori', dos: 0, bks: 0, konv: 0, w4: 0, avg: 0, level: null, areas: 0, _areas: new Set() };
      map.set(key, a);
    }
    a.dos += r.unitsDos; a.bks += r.unitsBks; a.konv += r.konvDos;
    a.w4 += r.dos4Weeks; a.avg += r.avgWeek;
    a._areas.add(r.area);
  }
  return [...map.values()].map(({ _areas, ...a }) => ({ ...a, areas: _areas.size, level: levelOf(a.konv, a.avg) }));
}

// Komponen UI
function KpiCard({
  label, labelColor, value, sub, icon, iconBg, iconColor, t, cardbg,
}: {
  label: string; labelColor: string; value: string; sub?: string;
  icon: React.ReactNode; iconBg: string; iconColor: string; t: TK; cardbg: string;
}) {
  return (
    <div style={{
      background: cardbg, border: `1px solid ${t.borderCard}`, borderRadius: 13,
      padding: '14px 16px 12px', display: 'flex', flexDirection: 'column', gap: 6,
      boxShadow: t.shadow, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: labelColor, fontWeight: 700 }}>
          {label}
        </span>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: t.text, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: t.textMuted, fontFamily: 'IBM Plex Mono, monospace' }}>{sub}</div>}
    </div>
  );
}

function FilterSelect({
  label, accentColor = '#3b82f6', value, onChange, children, t,
}: {
  label: string; accentColor?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode; t: TK;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      border: `1px solid ${t.borderInput}`, borderRadius: 8, overflow: 'hidden',
    }}>
      <span style={{
        padding: '6px 10px', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace',
        textTransform: 'uppercase' as const, letterSpacing: '.07em', fontWeight: 600,
        color: accentColor, background: `${accentColor}18`,
        borderRight: `1px solid ${t.borderInput}`,
        display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        {label}
      </span>
      <select
        value={value}
        onChange={onChange}
        style={{
          background: t.pagebg, border: 'none', outline: 'none',
          padding: '6px 10px', fontSize: 12,
          fontFamily: 'IBM Plex Mono, monospace', color: t.text,
          cursor: 'pointer', flex: 1, minWidth: 0,
          appearance: 'none', width: '100%',
        }}
      >
        {children}
      </select>
    </div>
  );
}

function SearchBar({ value, onChange, t }: {
  value: string; onChange: (v: string) => void; t: TK;
}) {
  const ACCENT = '#6366f1';
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      border: `1px solid ${value ? ACCENT + '66' : t.borderInput}`,
      borderRadius: 8, overflow: 'hidden', transition: 'border-color 0.15s',
    }}>
      <span style={{
        padding: '6px 10px', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace',
        textTransform: 'uppercase' as const, letterSpacing: '.07em', fontWeight: 600,
        color: ACCENT, background: `${ACCENT}18`,
        borderRight: `1px solid ${value ? ACCENT + '44' : t.borderInput}`,
        display: 'flex', alignItems: 'center', flexShrink: 0, gap: 5,
        transition: 'border-color 0.15s',
      }}>
        <Search size={10} />
        Cari
      </span>
      <input
        type="text"
        placeholder="Nama produk..."
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          flex: 1, background: t.inputBg, border: 'none', outline: 'none',
          padding: '6px 10px', fontSize: 12,
          fontFamily: 'IBM Plex Mono, monospace', color: t.text,
          minWidth: 0,
        }}
      />
    </div>
  );
}

// Main
export default function StockSection({ theme = 'light', areas, data }: {
  theme: Theme; areas: AreaConfig[]; data: StockRecord[];
}) {
  const t = tk[theme];
  const { isMobile } = useBreakpoint();

  const [search,      setSearch]      = useState('');
  const [selArea,     setSelArea]     = useState('all');
  const [selCategory, setSelCategory] = useState('all');
  const [selStatus,   setSelStatus]   = useState<'all' | Status>('all');
  const [sortKey,     setSortKey]     = useState<SortKey | null>(null); // null = kelompok per kategori
  const [sortOrder,   setSortOrder]   = useState<'asc' | 'desc'>('desc');
  const [selectedRow, setSelectedRow] = useState<Agg | null>(null); // detail produk (mobile)

  const areaName = (id: string) => areas.find(a => a.id === id)?.name ?? id;

  // opsi filter
  const areaOptions = useMemo(() => [...new Set(data.map(r => r.area))].sort((a, b) => areaName(a).localeCompare(areaName(b))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, areas]);
  const categoryOptions = useMemo(() => [...new Set(data.map(r => r.category).filter(Boolean))].sort(), [data]);

  // tanggal snapshot terbaru di antara semua area; area yang lebih lama ditandai ⚠
  const latestDate = useMemo(() => data.reduce((m, r) => (r.reportDate > m ? r.reportDate : m), ''), [data]);

  // baris setelah filter area / kategori / pencarian
  const scopedRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter(r =>
      (selArea === 'all' || r.area === selArea) &&
      (selCategory === 'all' || r.category === selCategory) &&
      (!term || r.product.toLowerCase().includes(term))
    );
  }, [data, search, selArea, selCategory]);

  const products = useMemo(() => aggregate(scopedRows, r => r.productId || r.product, r => r.product), [scopedRows]);

  // rincian per area untuk produk yang dibuka di modal detail (mobile)
  const areaBreakdown = useMemo(() => {
    if (!selectedRow) return [];
    return scopedRows
      .filter(r => (r.productId || r.product) === selectedRow.key)
      .map(r => ({ area: r.area, konv: r.konvDos, avg: r.avgWeek, level: levelOf(r.konvDos, r.avgWeek), reportDate: r.reportDate }))
      .sort((a, b) => (a.level ?? Infinity) - (b.level ?? Infinity));
  }, [selectedRow, scopedRows]);

  const areaSummary = useMemo(() => {
    const ids = [...new Set(scopedRows.map(r => r.area))];
    return ids.map(id => {
      const rows = scopedRows.filter(r => r.area === id);
      const [a] = aggregate(rows, () => id, () => areaName(id));
      const kritis = aggregate(rows, r => r.productId || r.product, r => r.product)
        .filter(p => statusOf(p.konv, p.level) === 'kritis').length;
      return { ...a, reportDate: rows[0]?.reportDate ?? '', kritis };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedRows, areas]);

  // KPI mengikuti filter area/kategori/pencarian (filter status hanya untuk tabel)
  const kpi = useMemo(() => {
    const konv = products.reduce((s, p) => s + p.konv, 0);
    const avg  = products.reduce((s, p) => s + p.avg, 0);
    const st   = products.map(p => statusOf(p.konv, p.level));
    return {
      konv, avg, level: levelOf(konv, avg),
      kritis:    st.filter(s => s === 'kritis').length,
      aman:      st.filter(s => s === 'aman').length,
      overstock: st.filter(s => s === 'overstock').length,
      nosales:   st.filter(s => s === 'nosales').length,
    };
  }, [products]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortOrder(key === 'product' ? 'asc' : 'desc'); }
  };

  const visible = useMemo(() => {
    const list = selStatus === 'all' ? [...products] : products.filter(p => statusOf(p.konv, p.level) === selStatus);
    if (!sortKey) return list;
    const dir = sortOrder === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      if (sortKey === 'product') return dir * a.product.localeCompare(b.product);
      if (sortKey === 'level') {
        const va = a.level ?? (sortOrder === 'asc' ? Infinity : -Infinity);
        const vb = b.level ?? (sortOrder === 'asc' ? Infinity : -Infinity);
        return va === vb ? 0 : dir * (va - vb);
      }
      return dir * ((a[sortKey] as number) - (b[sortKey] as number));
    });
  }, [products, selStatus, sortKey, sortOrder]);

  const hasFilters = !!search || selArea !== 'all' || selCategory !== 'all' || selStatus !== 'all' || sortKey !== null;
  const clearFilters = () => {
    setSearch(''); setSelArea('all'); setSelCategory('all'); setSelStatus('all');
    setSortKey(null); setSortOrder('desc');
  };

  const statusColors = (s: Status) =>
    s === 'kritis' ? t.red
    : s === 'aman' ? t.green
    : s === 'overstock' ? t.blue
    : { bg: t.inputBg, text: t.textSub, border: t.borderInput };

  const mono = 'IBM Plex Mono, monospace';

  // Angka stok level ditampilkan dalam pill berwarna sesuai status
  // (merah = kritis, hijau = aman, biru = overstock, abu = tanpa penjualan / kosong)
  const LevelBadge = ({ level, konv }: { level: number | null; konv: number }) => {
    const st = statusOf(konv, level);
    const c = statusColors(st);
    return (
      <span title={STATUS_LABEL[st]} style={{ padding: '2px 8px', borderRadius: 7, fontSize: 12, fontWeight: 700, fontFamily: mono, color: c.text, whiteSpace: 'nowrap' }}>
        {num(level)}
      </span>
    );
  };

  const LevelCell = ({ level, konv }: { level: number | null; konv: number }) => {
    const c = statusColors(statusOf(konv, level));
    const pct = level === null ? 0 : Math.min(level / (HIGH * 1.5), 1) * 100;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
        <div style={{ width: 54, height: 4, borderRadius: 2, background: t.border, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: c.text }} />
        </div>
        <span style={{ fontWeight: 700, minWidth: 34 }}>{num(level)}</span>
      </div>
    );
  };

  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) return <ArrowUpDown size={10} style={{ opacity: 0.3 }} />;
    return <ArrowUpDown size={11} color={sortOrder === 'asc' ? t.blue.text : t.green.text} />;
  };

  const panel: React.CSSProperties = {
    background: t.cardbg, border: `1px solid ${t.borderCard}`, borderRadius: 13, boxShadow: t.shadow,
  };
  const thBase: React.CSSProperties = {
    padding: '10px 14px', fontSize: 9, fontFamily: mono, textTransform: 'uppercase', letterSpacing: '0.07em',
    color: t.tableHeadText, fontWeight: 700, whiteSpace: 'nowrap', userSelect: 'none',
  };
  const tdBase: React.CSSProperties = {
    padding: '10px 14px', fontFamily: mono, color: t.text, whiteSpace: 'nowrap', textAlign: 'right',
  };

  // mobile: daftar kartu (tap untuk detail)
  const infoCol = (label: string, value: string) => (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: 10, color: t.text, fontFamily: mono, textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: t.textSub, fontFamily: mono }}>{value}</span>
    </div>
  );

  const renderMobileList = () => {
    if (visible.length === 0) {
      return <div style={{ padding: 48, textAlign: 'center', fontSize: 12, color: t.text, fontFamily: mono }}>Tidak ada produk yang cocok.</div>;
    }
    let prevCat = '';
    return (
      <div>
        {visible.map((p, i) => {
          const c = statusColors(statusOf(p.konv, p.level));
          const header = !sortKey && p.category !== prevCat;
          if (!sortKey) prevCat = p.category;
          return (
            <React.Fragment key={p.key}>
              {header && (
                <div style={{ padding: '7px 14px', fontSize: 12, fontWeight: 700, fontFamily: mono, color: t.green.text, background: t.pagebg, borderBottom: `1px solid ${t.border}` }}>
                  {p.category}
                </div>
              )}
              <div
                onClick={() => setSelectedRow(p)}
                style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}`, background: i % 2 === 1 ? t.tableAlt : 'transparent', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: t.text, fontFamily: mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.product}
                  </span>
                  {p.areas > 1 && (
                    <span style={{ fontSize: 10, background: t.inputBg, border: `1px solid ${t.border}`, padding: '2px 6px', borderRadius: 4, color: t.text, fontFamily: mono, flexShrink: 0 }}>
                      {p.areas} area
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  {infoCol('Konv. DOS', num(p.konv))}
                  {infoCol('Avg/Week', num(p.avg))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 1, padding: '4px 6px', borderRadius: 6, background: t.inputBg }}>
                    <span style={{ fontSize: 10, color: t.text, fontFamily: mono }}>STOK LEVEL (WEEK)</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: c.text, fontFamily: mono }}>{num(p.level)}</span>
                  </div>
                  <div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 1, padding: '4px 6px', borderRadius: 6, background: t.inputBg }}>
                    <span style={{ fontSize: 10, color: t.text, fontFamily: mono }}>DOS 4 WEEKS</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: t.text, fontFamily: mono }}>{num(p.w4)}</span>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const renderMobileAreas = () => (
    <div style={{ maxHeight: 340, overflowY: 'auto' }}>
      {[...areaSummary].sort((a, b) => (a.level ?? Infinity) - (b.level ?? Infinity)).map((a, i) => {
        const stale = a.reportDate !== latestDate;
        const c = statusColors(statusOf(a.konv, a.level));
        return (
          <div key={a.key} style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}`, background: i % 2 === 1 ? t.tableAlt : 'transparent' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.text, fontFamily: mono }}>{a.product}</span>
              <span style={{ fontSize: 10, color: stale ? t.yellow.text : t.textSub, fontFamily: mono }}>
                {a.reportDate ? fmtDate(a.reportDate) : '—'}{stale ? ' ⚠' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {infoCol('Konv. DOS', num(a.konv))}
              {infoCol('Avg/Week', num(a.avg))}
              {infoCol('Kritis', String(a.kritis))}
              <div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 1 }}>
                <span style={{ fontSize: 10, color: t.text, fontFamily: mono, textTransform: 'uppercase' }}>Stok Level</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: c.text, fontFamily: mono }}>{num(a.level)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const detailRow = (label: string, value: React.ReactNode, color?: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px dashed ${t.border}` }}>
      <span style={{ fontSize: 10, color: t.text, fontFamily: mono }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: color ?? t.text, fontFamily: mono, textAlign: 'right' }}>{value}</span>
    </div>
  );

  const DetailModal = (() => {
    if (!isMobile || !selectedRow) return null;
    const st = statusOf(selectedRow.konv, selectedRow.level);
    const c = statusColors(st);
    return (
      <div
        onClick={() => setSelectedRow(null)}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 10002, // di atas bottom nav & sheet filter dashboard
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: t.cardbg, border: `1px solid ${t.borderCard}`, borderRadius: '16px 16px 0 0',
            width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto',
            padding: '14px 20px calc(env(safe-area-inset-bottom, 0px) + 56px)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: t.text, fontFamily: mono }}>{selectedRow.product}</div>
              <div style={{ fontSize: 11, color: t.textSub, fontFamily: mono, marginTop: 2 }}>{selectedRow.category}</div>
            </div>
            <button
              onClick={() => setSelectedRow(null)}
              style={{ background: t.inputBg, border: `1px solid ${t.borderInput}`, borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.textMuted, flexShrink: 0 }}
            >
              <X size={13} />
            </button>
          </div>

          {/* Highlight */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: t.inputBg, textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: t.text, fontFamily: mono, marginBottom: 2 }}>STOK LEVEL (WEEK)</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: c.text, fontFamily: mono }}>{num(selectedRow.level)}</div>
            </div>
            <div style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: c.bg, border: `1px solid ${c.border}`, textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: t.text, fontFamily: mono, marginBottom: 2 }}>STATUS</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: c.text, fontFamily: mono }}>{STATUS_LABEL[st]}</div>
            </div>
          </div>

          {/* Detail */}
          {detailRow('Konv. DOS', num(selectedRow.konv))}
          {detailRow('DOS', num(selectedRow.dos, 0))}
          {detailRow('BKS', num(selectedRow.bks, 0))}
          {detailRow('DOS 4 Weeks', num(selectedRow.w4))}
          {detailRow('Avg/Week', num(selectedRow.avg))}

          {/* Per area (hanya jika produk ada di lebih dari satu area) */}
          {areaBreakdown.length > 1 && (
            <div style={{ paddingTop: 12 }}>
              <div style={{ fontSize: 10, color: t.textMuted, fontFamily: mono, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Per Area</div>
              {areaBreakdown.map(r => {
                const rc = statusColors(statusOf(r.konv, r.level));
                return (
                  <div key={r.area} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px dashed ${t.border}` }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: t.text, fontFamily: mono }}>{areaName(r.area)}</div>
                      <div style={{ fontSize: 10, color: t.textSub, fontFamily: mono }}>{num(r.konv)} / {num(r.avg)} per week</div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: rc.text, fontFamily: mono }}>{num(r.level)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  })();

  // kosong
  if (data.length === 0) {
    return (
      <div style={{ ...panel, padding: 36, textAlign: 'center', color: t.textMuted, fontSize: 12, fontFamily: mono, lineHeight: 1.7 }}>
        {/* Belum ada data stok.<br /> */}
        Klik “Terapkan” untuk memuat data.
      </div>
    );
  }

  const columns: { label: string; key: SortKey; numeric?: boolean; center?: boolean }[] = [
    { label: 'Produk',            key: 'product' },
    { label: 'DOS',               key: 'dos',   numeric: true },
    { label: 'BKS',               key: 'bks',   numeric: true },
    { label: 'Konv. DOS',         key: 'konv',  numeric: true },
    { label: 'DOS 4 Weeks',       key: 'w4',    numeric: true },
    { label: 'Avg/Week',          key: 'avg',   numeric: true },
    { label: 'Stok Level (week)', key: 'level', center: true },
  ];

  const showAreaTable = areaSummary.length > 1;
  let lastCat = '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: 'IBM Plex Sans, sans-serif' }}>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        <KpiCard
          label="Total Stok (Konv. DOS)" labelColor={t.cyan.text}
          value={num(kpi.konv)} sub={`${products.length} produk · ${areaSummary.length} area`}
          icon={<Package size={14} />} iconBg={t.cyan.bg} iconColor={t.cyan.text} t={t} cardbg={t.card6bg}
        />
        <KpiCard
          label="Avg / Week" labelColor={t.purple.text}
          value={num(kpi.avg)} sub="rata-rata per minggu"
          icon={<CalendarSync size={14} />} iconBg={t.purple.bg} iconColor={t.purple.text} t={t} cardbg={t.card5bg}
        />
        <KpiCard
          label="Stok Level" labelColor={t.yellow.text}
          value={kpi.level === null ? '—' : `${num(kpi.level)} week`} sub="total stok / total avg week"
          icon={<CalendarCheck2 size={14} />} iconBg={t.yellow.bg} iconColor={t.yellow.text} t={t} cardbg={t.card3bg}
        />
        <KpiCard
          label="Produk Aman" labelColor={t.green.text}
          value={String(kpi.aman)} sub="Konv. DOS >= Avg/Week"
          icon={<PackageCheck size={14} />} iconBg={t.green.bg} iconColor={t.green.text} t={t} cardbg={t.card2bg}
        />
        <KpiCard
          label="Produk Kritis" labelColor={t.red.text}
          value={String(kpi.kritis)} sub="Konv. DOS < Avg/Week"
          icon={<PackageMinus size={14} />} iconBg={t.red.bg} iconColor={t.red.text} t={t} cardbg={t.card4bg}
        />
        <KpiCard
          label="Overstock" labelColor={t.blue.text}
          value={String(kpi.overstock)} sub="Konv. DOS > 2× Avg/Week"
          icon={<PackagePlus size={14} />} iconBg={t.blue.bg} iconColor={t.blue.text} t={t} cardbg={t.card1bg}
        />
        {/* <KpiCard
          label="Tanpa Penjualan" labelColor={t.text}
          value={String(kpi.nosales)} sub="ada stok, avg/week = 0"
          icon={<PackageX size={14} />} iconBg={t.inputBg} iconColor={t.textSub} t={t} cardbg={t.cardbg}
        /> */}
      </div>

      {/* Filter */}
      <div style={{ ...panel, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, fontFamily: mono, textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Filter Data
          </span>
          {hasFilters && (
            <button onClick={clearFilters} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 6,
              background: t.blue.bg, border: `1px solid ${t.blue.border}`,
              color: t.blue.text, cursor: 'pointer',
              fontSize: 11, fontWeight: 500, fontFamily: mono,
            }}>
              Reset Filter
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
          <SearchBar value={search} onChange={setSearch} t={t} />

          {areaOptions.length > 1 && (
            <FilterSelect label="Area" accentColor="#0d9488" value={selArea} onChange={e => setSelArea(e.target.value)} t={t}>
              <option value="all">Semua Area</option>
              {areaOptions.map(a => <option key={a} value={a}>{areaName(a)}</option>)}
            </FilterSelect>
          )}

          <FilterSelect label="Kategori" accentColor="#8b5cf6" value={selCategory} onChange={e => setSelCategory(e.target.value)} t={t}>
            <option value="all">Semua Kategori</option>
            {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </FilterSelect>

          {isMobile && (
            <FilterSelect
              label="Urut" accentColor="#ec4899"
              value={sortKey ? `${sortKey}:${sortOrder}` : 'kategori'}
              onChange={e => {
                const v = e.target.value;
                if (v === 'kategori') { setSortKey(null); setSortOrder('desc'); }
                else { const [k, o] = v.split(':'); setSortKey(k as SortKey); setSortOrder(o as 'asc' | 'desc'); }
              }}
              t={t}
            >
              <option value="kategori">Per Kategori</option>
              <option value="level:asc">Stok Level Terendah</option>
              <option value="level:desc">Stok Level Tertinggi</option>
              <option value="konv:desc">Konv. DOS Terbanyak</option>
              <option value="product:asc">Nama Produk A–Z</option>
            </FilterSelect>
          )}

          <FilterSelect label="Status" accentColor="#f59e0b" value={selStatus} onChange={e => setSelStatus(e.target.value as 'all' | Status)} t={t}>
            <option value="all">Semua Status</option>
            <option value="kritis">Kritis (stok &lt; avg/week)</option>
            <option value="aman">Aman (stok &gt;= avg/week)</option>
            <option value="overstock">Overstock (stok &gt; 2× avg/week)</option>
            <option value="nosales">Tanpa Penjualan</option>
            <option value="kosong">Kosong</option>
          </FilterSelect>
        </div>
      </div>

      {/* Ringkasan per area */}
      {showAreaTable && (
        <div style={{ ...panel, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: `1px solid ${t.border}`, background: t.tableHead, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.tableHeadText, fontFamily: mono, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Stok per Area
            </span>
          </div>
          {isMobile ? renderMobileAreas() : (
          <div style={{ overflow: 'auto', maxHeight: 300 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: t.tableHead, borderBottom: `1px solid ${t.border}` }}>
                  <th style={{ ...thBase, textAlign: 'left' }}>Area</th>
                  <th style={{ ...thBase, textAlign: 'right' }}>Snapshot</th>
                  <th style={{ ...thBase, textAlign: 'right' }}>Konv. DOS</th>
                  <th style={{ ...thBase, textAlign: 'right' }}>Avg/Week</th>
                  <th style={{ ...thBase, textAlign: 'right' }}>Kritis</th>
                  <th style={{ ...thBase, textAlign: 'center' }}>Stok Level</th>
                </tr>
              </thead>
              <tbody>
                {[...areaSummary].sort((a, b) => (a.level ?? Infinity) - (b.level ?? Infinity)).map((a, idx) => {
                  const stale = a.reportDate !== latestDate;
                  const rowBg = idx % 2 === 1 ? t.tableAlt : 'transparent';
                  return (
                    <tr key={a.key}
                      style={{ background: rowBg, borderBottom: `1px solid ${t.border}`, transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = t.rowHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = rowBg)}>
                      <td style={{ ...tdBase, textAlign: 'left', fontWeight: 600 }}>{a.product}</td>
                      <td style={{ ...tdBase, fontSize: 11, color: stale ? t.yellow.text : t.text }}>{a.reportDate ? fmtDate(a.reportDate) : '—'}{stale ? ' ⚠' : ''}</td>
                      <td style={tdBase}>{num(a.konv)}</td>
                      <td style={tdBase}>{num(a.avg)}</td>
                      <td style={{ ...tdBase, color: a.kritis > 0 ? t.red.text : t.text, fontWeight: a.kritis > 0 ? 700 : 400 }}>{a.kritis}</td>
                      <td style={{ ...tdBase, textAlign: 'center' }}><LevelCell level={a.level} konv={a.konv} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* Tabel produk */}
      <div style={{ ...panel, overflow: 'hidden' }}>
        {/* <div style={{
          padding: '10px 16px', borderBottom: `1px solid ${t.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: t.tableHead,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: t.tableHeadText, fontFamily: mono, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Daftar Stok
          </span>
          <span style={{
            fontSize: 10, fontFamily: mono, background: t.inputBg, color: t.tableHeadText,
            padding: '2px 9px', borderRadius: 12, border: `1px solid ${t.border}`,
          }}>
            Data stok {fmtDate(latestDate)} · {visible.length} produk
          </span>
        </div> */}

        {isMobile ? renderMobileList() : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
            <thead>
              <tr style={{ background: t.tableHead, color: t.tableHeadText, borderBottom: `1px solid ${t.border}` }}>
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{ ...thBase, cursor: 'pointer', textAlign: col.numeric ? 'right' : col.center ? 'center' : 'left' }}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: col.numeric ? 'flex-end' : col.center ? 'center' : 'flex-start', width: '100%' }}>
                      {col.label}
                      <SortIcon field={col.key} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 10px', textAlign: 'center', fontSize: 12, color: t.text, fontFamily: mono }}>
                    Tidak ada produk yang cocok.
                  </td>
                </tr>
              ) : visible.map((p, idx) => {
                const header = !sortKey && p.category !== lastCat;
                if (!sortKey) lastCat = p.category;
                const rowBg = idx % 2 === 1 ? t.tableAlt : 'transparent';
                return (
                  <React.Fragment key={p.key}>
                    {header && (
                      <tr>
                        <td colSpan={7} style={{ padding: '7px 14px', fontSize: 12, fontWeight: 700, fontFamily: mono, color: t.green.text, background: t.pagebg, borderBottom: `1px solid ${t.border}` }}>
                          {p.category}
                        </td>
                      </tr>
                    )}
                    <tr
                      style={{ background: rowBg, borderBottom: `1px solid ${t.border}`, transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = t.rowHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                    >
                      <td style={{ ...tdBase, textAlign: 'left', fontWeight: 600 }}>{p.product}</td>
                      <td style={tdBase}>{num(p.dos, 0)}</td>
                      <td style={tdBase}>{num(p.bks, 0)}</td>
                      <td style={tdBase}>{num(p.konv)}</td>
                      <td style={tdBase}>{num(p.w4)}</td>
                      <td style={tdBase}>{num(p.avg)}</td>
                      <td style={{ ...tdBase, textAlign: 'center' }}><LevelBadge level={p.level} konv={p.konv} /></td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {DetailModal}

    </div>
  );
}
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, ReferenceLine,
} from 'recharts';
import {
  Store, TrendingUp, TrendingDown, Maximize2, X, ArrowUp, ArrowDown,
  Calendar, ChevronDown, ChevronUp, SlidersHorizontal,
  RefreshCw, ArrowUpRight, ArrowDownRight, Minus, Search,
} from 'lucide-react';
import {
  OutletPanel, OutletOptions, OutletResponse, OutletFilterValues,
  EMPTY_OUTLET_FILTERS, EMPTY_OUTLET_OPTIONS,
} from '@/types/outlet';

// Theme tokens
type Theme = 'dark' | 'light';

const TK = {
  dark: {
    cardBg: '#111318', contentBg: '#0d0f15', inputBg: 'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.06)', borderCard: 'rgba(255,255,255,0.07)',
    borderInput: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.9)',
    textSub: 'rgba(255,255,255,0.55)', textMuted: 'rgba(255,255,255,0.3)',
    textFaint: 'rgba(255,255,255,0.18)', selectBg: '#0c0e14',
    selectColor: 'rgba(255,255,255,0.7)',
    blue:   { bg: 'rgba(59,130,246,0.12)',  text: '#93c5fd', border: 'rgba(59,130,246,0.3)'  },
    green:  { bg: 'rgba(16,185,129,0.12)',  text: '#6ee7b7', border: 'rgba(16,185,129,0.3)'  },
    purple: { bg: 'rgba(139,92,246,0.12)',  text: '#c4b5fd', border: 'rgba(139,92,246,0.3)'  },
    orange: { bg: 'rgba(249,115,22,0.12)',  text: '#fb923c', border: 'rgba(249,115,22,0.3)'  },
    red:    { bg: 'rgba(239,68,68,0.12)',   text: '#fca5a5', border: 'rgba(239,68,68,0.25)'  },
    indigo: { bg: 'rgba(99,102,241,0.12)',  text: '#a5b4fc', border: 'rgba(99,102,241,0.3)'  },
    pink:   { bg: 'rgba(236,72,153,0.12)',  text: '#f9a8d4', border: 'rgba(236,72,153,0.3)'  },
    card1:  { bg: '#0f1724', border: '#1e3a5f', text: '#93c5fd', val: 'rgba(255,255,255,0.9)' },
    card2:  { bg: '#0f1f17', border: '#1a4731', text: '#6ee7b7', val: 'rgba(255,255,255,0.9)' },
    card3:  { bg: '#1a1208', border: '#3d2b0a', text: '#fcd34d', val: 'rgba(255,255,255,0.9)' },
    card4:  { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.18)', text: '#fca5a5', val: 'rgba(255,255,255,0.9)' },
    gridStroke: 'rgba(255,255,255,0.06)', tooltipBg: '#0c0e14',
    tooltipBorder: 'rgba(255,255,255,0.12)', tooltipText: 'rgba(255,255,255,0.85)',
    tableHeadBg: '#fef08a', tableHeadText: '#0f172a',
    tableAlt: 'rgba(255,255,255,0.02)', tableHover: 'rgba(255,255,255,0.04)',
    modalOverlay: 'rgba(0,0,0,0.8)', modalBg: '#111318', modalBorder: 'rgba(255,255,255,0.08)',
    yearA: { bg: '#0f1724', border: '#1e3a5f', label: '#93c5fd', accent: '#3b82f6' },
    yearB: { bg: '#0f1f17', border: '#1a4731', label: '#6ee7b7', accent: '#10b981' },
    scrollbar: 'rgba(255,255,255,0.1)', shadow: 'none',
    posGrowth: { bg: 'rgba(16,185,129,0.12)', text: '#6ee7b7', border: 'rgba(16,185,129,0.25)' },
    negGrowth: { bg: 'rgba(239,68,68,0.1)',   text: '#fca5a5', border: 'rgba(239,68,68,0.2)'  },
    neuGrowth: { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.1)' },
    divider: 'rgba(255,255,255,0.04)', chartAreaBg: 'rgba(255,255,255,0.03)',
    chartAreaBorder: 'rgba(255,255,255,0.06)',
    skBase: 'rgba(255,255,255,0.06)', skHi: 'rgba(255,255,255,0.13)',
  },
  light: {
    cardBg: '#ffffff', contentBg: '#f8fafc', inputBg: 'rgba(0,0,0,0.03)',
    border: 'rgba(0,0,0,0.07)', borderCard: 'rgba(0,0,0,0.08)',
    borderInput: 'rgba(0,0,0,0.1)', text: '#0f172a', textSub: '#475569',
    textMuted: '#94a3b8', textFaint: '#cbd5e1', selectBg: '#ffffff',
    selectColor: '#1e293b',
    blue:   { bg: 'rgba(37,99,235,0.08)',  text: '#1d4ed8', border: 'rgba(37,99,235,0.25)'  },
    green:  { bg: 'rgba(22,163,74,0.08)',  text: '#15803d', border: 'rgba(22,163,74,0.2)'   },
    purple: { bg: 'rgba(109,40,217,0.08)', text: '#6d28d9', border: 'rgba(109,40,217,0.2)'  },
    orange: { bg: 'rgba(234,88,12,0.08)',  text: '#c2410c', border: 'rgba(234,88,12,0.2)'   },
    red:    { bg: 'rgba(220,38,38,0.08)',  text: '#b91c1c', border: 'rgba(220,38,38,0.18)'  },
    indigo: { bg: 'rgba(79,70,229,0.08)',  text: '#4338ca', border: 'rgba(79,70,229,0.2)'   },
    pink:   { bg: 'rgba(219,39,119,0.08)', text: '#be185d', border: 'rgba(219,39,119,0.2)'  },
    card1:  { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', val: '#0f172a' },
    card2:  { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', val: '#0f172a' },
    card3:  { bg: '#fefce8', border: '#fef08a', text: '#a16207', val: '#0f172a' },
    card4:  { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', val: '#0f172a' },
    gridStroke: 'rgba(0,0,0,0.07)', tooltipBg: '#ffffff',
    tooltipBorder: 'rgba(0,0,0,0.1)', tooltipText: '#0f172a',
    tableHeadBg: '#fef08a', tableHeadText: '#0f172a',
    tableAlt: 'rgba(0,0,0,0.02)', tableHover: 'rgba(0,0,0,0.03)',
    modalOverlay: 'rgba(0,0,0,0.5)', modalBg: '#ffffff', modalBorder: 'rgba(0,0,0,0.08)',
    yearA: { bg: '#eff6ff', border: '#bfdbfe', label: '#1d4ed8', accent: '#2563eb' },
    yearB: { bg: '#f0fdf4', border: '#bbf7d0', label: '#15803d', accent: '#16a34a' },
    scrollbar: 'rgba(0,0,0,0.15)', shadow: '0 1px 8px rgba(0,0,0,0.07)',
    posGrowth: { bg: 'rgba(22,163,74,0.08)',  text: '#15803d', border: 'rgba(22,163,74,0.2)'  },
    negGrowth: { bg: 'rgba(220,38,38,0.08)',  text: '#b91c1c', border: 'rgba(220,38,38,0.15)' },
    neuGrowth: { bg: 'rgba(0,0,0,0.04)',      text: '#94a3b8', border: 'rgba(0,0,0,0.08)'     },
    divider: 'rgba(0,0,0,0.04)', chartAreaBg: 'rgba(0,0,0,0.02)',
    chartAreaBorder: 'rgba(0,0,0,0.06)',
    skBase: 'rgba(0,0,0,0.06)', skHi: 'rgba(0,0,0,0.12)',
  },
} as const;

const PALETTE_A   = ['#3b82f6','#8b5cf6','#06b6d4','#6366f1','#0ea5e9','#a78bfa','#2563eb'];
const PALETTE_B   = ['#10b981','#f59e0b','#14b8a6','#84cc16','#22d3ee','#a3e635','#059669'];
const PIE_PAL_A   = ['#3b82f6','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#10b981','#f97316'];
const PIE_PAL_B   = ['#10b981','#3b82f6','#f59e0b','#a855f7','#ef4444','#14b8a6','#ec4899'];

type AccentKey = 'blue'|'green'|'purple'|'orange'|'red'|'indigo'|'pink';
type CardKey   = 'card1'|'card2'|'card3'|'card4';
type SortDir   = 'asc'|'desc'|null;

// Format Helpers
const fmtK = (v: number) => {
  if (Math.abs(v) >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return Math.round(v).toLocaleString('id-ID');
};

const fmtExact = (v: number) => v.toLocaleString('id-ID', { maximumFractionDigits: 2 });

const fmtRp = (v: number) => {
  const av = Math.abs(v);
  if (av >= 1e9) return `Rp ${(v / 1e9).toFixed(1)}M`;
  if (av >= 1e6) return `Rp ${(v / 1e6).toFixed(1)}jt`;
  if (av >= 1e3) return `Rp ${(v / 1e3).toFixed(0)}rb`;
  return `Rp ${Math.round(v).toLocaleString('id-ID')}`;
};

const fmtRpExact = (v: number) => `Rp ${v.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;

const getUnitShortLabel = (u: string) => {
  if (u === 'units_dos') return 'DOZ';
  if (u === 'units_bal') return 'BAL';
  if (u === 'units_slop') return 'SLOP';
  if (u === 'units_bks') return 'BKS';
  if (u === 'omzet') return 'Rp';
  return 'DOZ';
};

const getUnitLongLabel = (u: string) => {
  if (u === 'units_dos') return 'Jual (Dos Net)';
  if (u === 'units_bal') return 'Jual (Bal Net)';
  if (u === 'units_slop') return 'Jual (Slop Net)';
  if (u === 'units_bks') return 'Jual (Bks Net)';
  if (u === 'omzet') return 'Omzet (Rp)';
  return 'Jual (Dos Net)';
};

// Responsive Hook
function useBreakpoint() {
  const [width, setWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return { isMobile: width < 640, isTablet: width >= 640 && width < 1024, isDesktop: width >= 1024 };
}

// Skeleton: blok shimmer generik untuk loading state
function Skeleton({ w = '100%', h = 14, r = 6, theme, style }: {
  w?: number | string; h?: number | string; r?: number; theme: Theme; style?: React.CSSProperties;
}) {
  const t = TK[theme];
  return (
    <div style={{
      width: w, height: h, borderRadius: r, flexShrink: 0,
      background: `linear-gradient(90deg, ${t.skBase} 25%, ${t.skHi} 50%, ${t.skBase} 75%)`,
      backgroundSize: '200% 100%', animation: 'skShimmer 1.3s ease-in-out infinite',
      ...style,
    }} />
  );
}

const SK_BAR_H = [45, 70, 55, 85, 60, 40, 75, 50, 65, 35, 80, 55];

// ChartSkeleton: kerangka chart (bar / pie) selama data dimuat
function ChartSkeleton({ kind, theme }: { kind: 'bar' | 'pie'; theme: Theme }) {
  const t = TK[theme];
  if (kind === 'pie') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div style={{
          width: 'min(120px, 60%)', aspectRatio: '1', borderRadius: '50%',
          background: `linear-gradient(90deg, ${t.skBase} 25%, ${t.skHi} 50%, ${t.skBase} 75%)`,
          backgroundSize: '200% 100%', animation: 'skShimmer 1.3s ease-in-out infinite',
          WebkitMask: 'radial-gradient(circle, transparent 38%, #000 39%)',
          mask: 'radial-gradient(circle, transparent 38%, #000 39%)',
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[56, 44, 50, 36].map((w, i) => <Skeleton key={i} w={w} h={8} theme={theme} />)}
        </div>
      </div>
    );
  }
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'flex-end', gap: 6, padding: '12px 14px 28px' }}>
      {SK_BAR_H.map((h, i) => (
        <Skeleton key={i} w="100%" h={`${h}%`} r={4} theme={theme} style={{ animationDelay: `${i * 0.08}s` }} />
      ))}
    </div>
  );
}

// FilterSelect
function FilterSelect({ label, value, onChange, options, accentKey, theme, isUnitFilter }: {
  label: string; value: string; onChange: (v: string) => void;
  options: (string | { value: string; label: string })[]; accentKey: AccentKey; theme: Theme;
  isUnitFilter?: boolean;
}) {
  const t = TK[theme];
  const accent = t[accentKey];
  const active = isUnitFilter ? true : value !== 'all';
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', border: `1px solid ${active ? accent.border : t.borderInput}`, borderRadius: 8, overflow: 'hidden', transition: 'border-color 0.2s', boxShadow: active ? `0 0 0 2px ${accent.border}40` : 'none' }}>
      <span style={{ padding: '6px 9px', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, color: accent.text, background: active ? accent.bg : t.inputBg, borderRight: `1px solid ${active ? accent.border : t.borderInput}`, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0, transition: 'background 0.2s' }}>
        {label}
      </span>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ background: t.inputBg, border: 'none', outline: 'none', padding: '6px 24px 6px 8px', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: t.text, cursor: 'pointer', flex: 1, minWidth: 0, appearance: 'none', width: '100%', fontWeight: active ? 600 : 400 }}>
        {!isUnitFilter && <option value="all" style={{ background: t.selectBg }}>Semua</option>}
        {options.map(o => {
          const val = typeof o === 'string' ? o : o.value;
          const lbl = typeof o === 'string' ? o : o.label;
          return <option key={val} value={val} style={{ background: t.selectBg }}>{lbl}</option>;
        })}
      </select>
    </div>
  );
}

// SearchableSelect (Versi Modal)
function SearchableSelect({ label, value, onChange, options, accentKey, theme, placeholder }: {
  label: string; value: string;
  onChange: (customerNo: string, customerName: string) => void;
  options: { no: string; name: string }[];
  accentKey: AccentKey; theme: Theme; placeholder?: string;
}) {
  const t       = TK[theme];
  const accent  = t[accentKey];
  const active  = value !== '';
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');

  // Handle body scroll lock & tutup via tombol Escape
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', fn);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', fn); document.body.style.overflow = ''; };
  }, [open]);

  const selectedOption = options.find(o => o.no === value);
  const displayValue   = selectedOption
    ? `${selectedOption.name}${selectedOption.no ? ` · ${selectedOption.no}` : ''}`
    : placeholder ?? 'Semua';

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return options.slice(0, 150);
    return options.filter(o =>
      o.name.toLowerCase().includes(q) || o.no.toLowerCase().includes(q)
    ).slice(0, 150);
  }, [options, query]);

  return (
    <div style={{ position: 'relative' }}>
      {/* Tombol Pemicu Modal */}
      <div
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'stretch',
          border: `1px solid ${active ? accent.border : t.borderInput}`,
          borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
          transition: 'border-color 0.2s',
          boxShadow: active ? `0 0 0 2px ${accent.border}40` : 'none',
        }}
      >
        <span style={{
          padding: '6px 9px', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace',
          textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700,
          color: accent.text, background: active ? accent.bg : t.inputBg,
          borderRight: `1px solid ${active ? accent.border : t.borderInput}`,
          display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {label}
        </span>
        <span style={{
          flex: 1, padding: '6px 10px', fontSize: 11,
          fontFamily: 'IBM Plex Mono, monospace',
          color: t.text,
          background: t.inputBg, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 4, fontWeight: active ? 600 : 400,
          minWidth: 0,
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayValue}
          </span>
          <ChevronDown size={10} style={{ flexShrink: 0, color: t.text }} />
        </span>
      </div>

      {/* Modal Pop-up */}
      {open && (
        <div
          onClick={() => { setOpen(false); setQuery(''); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            backgroundColor: t.modalOverlay, backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: t.modalBg, border: `1px solid ${t.modalBorder}`,
              borderRadius: 12, width: '100%', maxWidth: 480, maxHeight: '80vh',
              display: 'flex', flexDirection: 'column', boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
              overflow: 'hidden'
            }}
          >
            {/* Header Modal & Kotak Pencarian */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
              borderBottom: `1px solid ${t.border}`, background: t.tableHeadBg
            }}>
              <Search size={16} color={t.textMuted} style={{ flexShrink: 0 }} />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Ketik nama atau ID Customer..."
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', color: t.tableHeadText,
                  caretColor: accent.text,
                }}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: 0, display: 'flex' }}>
                  <X size={14} />
                </button>
              )}
              <div style={{ width: 1, height: 16, background: t.border, margin: '0 4px' }} />
              <button onClick={() => { setOpen(false); setQuery(''); }} style={{ background: t.inputBg, border: `1px solid ${t.borderInput}`, cursor: 'pointer', color: t.text, padding: 4, borderRadius: 6, display: 'flex' }}>
                <X size={16} />
              </button>
            </div>

            {/* Daftar Item */}
            <div style={{ overflowY: 'auto', flex: 1, background: t.cardBg, padding: '4px 0' }}>
              <div
                onClick={() => { onChange('', ''); setOpen(false); setQuery(''); }}
                style={{
                  padding: '10px 16px', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace',
                  color: !active ? t.text : t.textMuted,
                  background: !active ? t.divider : 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = t.tableHover}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = !active ? t.divider : 'transparent'}
              >
                <span style={{ fontWeight: !active ? 700 : 400 }}>Semua Customer</span>
              </div>

              {filtered.length === 0 ? (
                <div style={{ padding: '24px', fontSize: 12, color: t.textMuted, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'center' }}>
                  Data tidak ditemukan
                </div>
              ) : filtered.map(opt => {
                const isSelected = opt.no === value;
                return (
                  <div
                    key={`${opt.no}||${opt.name}`}
                    onClick={() => { onChange(opt.no, opt.name); setOpen(false); setQuery(''); }}
                    style={{
                      padding: '10px 16px', cursor: 'pointer',
                      background: isSelected ? accent.bg : 'transparent',
                      display: 'flex', flexDirection: 'column', gap: 2,
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = t.tableHover; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isSelected ? accent.bg : 'transparent'; }}
                  >
                    <span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: isSelected ? accent.text : t.text, fontWeight: isSelected ? 700 : 400 }}>
                      {opt.name}
                    </span>
                    {opt.no && (
                      <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: isSelected ? accent.text : t.textFaint, opacity: 0.8 }}>
                        #{opt.no}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// FilterChip
function FilterChip({ label, onRemove, accentKey, theme }: { label: string; onRemove: () => void; accentKey: AccentKey; theme: Theme }) {
  const accent = TK[theme][accentKey];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px 3px 7px', borderRadius: 20, fontSize: 10, fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace', background: accent.bg, color: accent.text, border: `1px solid ${accent.border}`, whiteSpace: 'nowrap' }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent.text, padding: '0 1px', opacity: 0.6, lineHeight: 1, borderRadius: 3, fontSize: 13, display: 'flex', alignItems: 'center' }}>
        <X size={10} />
      </button>
    </span>
  );
}

// SearchBox
function SearchBox({ value, onChange, theme, placeholder }: {
  value: string; onChange: (v: string) => void; theme: Theme; placeholder?: string;
}) {
  const t = TK[theme];
  const active = value.length > 0;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      border: `1px solid ${active ? t.blue.border : t.borderInput}`,
      borderRadius: 8, padding: '6px 10px', background: t.inputBg,
      transition: 'border-color 0.2s',
      boxShadow: active ? `0 0 0 2px ${t.blue.border}40` : 'none',
    }}>
      <Search size={11} color={active ? t.blue.text : t.text} style={{ flexShrink: 0 }} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? 'Cari...'}
        style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          fontSize: 11, fontFamily: 'IBM Plex Mono, monospace',
          color: t.text, caretColor: t.blue.text,
          minWidth: 0,
        }}
      />
      {active && (
        <button onClick={() => onChange('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.text, padding: 0, display: 'flex' }}>
          <X size={10} />
        </button>
      )}
    </div>
  );
}

// MetricCard
function MetricCard({ label, value, sub, cardKey, icon: Icon, theme, compact, trend, loading }: {
  label: string; value: string; sub: string; cardKey: CardKey;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  theme: Theme; compact?: boolean; trend?: { value: number; label: string };
  loading?: boolean;
}) {
  const c = TK[theme][cardKey];
  const t = TK[theme];
  const pos = trend && trend.value > 0;
  const neg = trend && trend.value < 0;
  const gs  = pos ? t.posGrowth : neg ? t.negGrowth : t.neuGrowth;
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: compact ? '10px 12px' : '14px 16px', display: 'flex', flexDirection: 'column', gap: compact ? 3 : 5, transition: 'background 0.3s', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 60, height: 60, background: `radial-gradient(circle at top right, ${c.text}15, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon size={11} color={c.text} />
          <span style={{ fontSize: compact ? 8 : 10, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: c.text }}>{label}</span>
        </div>
        {trend && (
          loading
            ? <Skeleton w={38} h={14} r={10} theme={theme} />
            : (
              <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', padding: '1px 6px', borderRadius: 10, background: gs.bg, color: gs.text, border: `1px solid ${gs.border}`, display: 'flex', alignItems: 'center', gap: 2 }}>
                {pos ? <ArrowUpRight size={8} /> : neg ? <ArrowDownRight size={8} /> : <Minus size={8} />}
                {Math.abs(trend.value).toFixed(1)}%
              </span>
            )
        )}
      </div>
      {loading ? (
        <Skeleton w="65%" h={compact ? 20 : 26} theme={theme} style={{ margin: '2px 0' }} />
      ) : (
        <div style={{ fontSize: compact ? 16 : 21, fontWeight: 800, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '-0.02em', color: c.val, wordBreak: 'break-all' }}>{value}</div>
      )}
      {loading ? (
        <Skeleton w="85%" h={compact ? 9 : 11} theme={theme} />
      ) : (
        <div style={{ fontSize: compact ? 9 : 11, color: t.textMuted, fontFamily: 'IBM Plex Mono, monospace' }}>{sub}</div>
      )}
    </div>
  );
}

// YoYSummaryBar (total sudah dihitung di server)
function YoYSummaryBar({ totalA, totalB, selectedUnit, yearA, yearB, theme, fmtValExact }: {
  totalA: number; totalB: number; selectedUnit: string;
  yearA: number; yearB: number; theme: Theme;
  fmtValExact: (v: number) => string;
}) {
  const t = TK[theme];
  const growth  = totalA > 0 ? ((totalB - totalA) / totalA) * 100 : 0;
  const isPos   = growth > 0;
  const isNeg   = growth < 0;
  const gs      = isPos ? t.posGrowth : isNeg ? t.negGrowth : t.neuGrowth;
  const GI      = isPos ? TrendingUp : isNeg ? TrendingDown : Minus;
  const maxVal  = Math.max(totalA, totalB);
  return (
    <div style={{ background: t.cardBg, border: `1px solid ${t.borderCard}`, borderRadius: 12, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: t.shadow }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.textMuted, fontFamily: 'IBM Plex Mono, monospace' }}>
          Perbandingan YoY · {getUnitLongLabel(selectedUnit)}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, background: gs.bg, border: `1px solid ${gs.border}` }}>
          <GI size={12} color={gs.text} />
          <span style={{ fontSize: 12, fontWeight: 800, fontFamily: 'IBM Plex Mono, monospace', color: gs.text }}>{isPos ? '+' : ''}{growth.toFixed(1)}% YoY</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { key: 'P1', yr: yearA, val: totalA, palette: TK[theme].yearA },
          { key: 'P2', yr: yearB, val: totalB, palette: TK[theme].yearB },
        ].map(({ key, yr, val, palette }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 44, fontSize: 11, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: palette.label, flexShrink: 0, textAlign: 'right' }}>{yr}</span>
            <div style={{ flex: 1, height: 20, background: t.inputBg, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${maxVal > 0 ? (val / maxVal) * 100 : 0}%`, background: palette.accent, borderRadius: 4, transition: 'width 0.6s ease' }} />
            </div>
            <span style={{ width: 110, fontSize: 11, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: t.textSub, flexShrink: 0 }}>
              {fmtValExact(val)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, theme, prefix = '', customerMap }: any) {
  if (!active || !payload?.length) return null;
  const t = TK[theme as Theme];
  const customerId: string = customerMap ? (customerMap.get(String(label)) ?? '') : '';

  return (
    <div style={{ background: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, borderRadius: 10, padding: '10px 14px', fontFamily: 'IBM Plex Mono, monospace', minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', maxWidth: 240 }}>
      <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 8, fontWeight: 600, wordBreak: 'break-all' }}>
        {prefix && <span style={{ color: t.textFaint, marginRight: 3 }}>{prefix}</span>}
        <span style={{ color: t.text }}>{label}</span>
        {customerId && (
          <span style={{ display: 'block', color: t.textFaint, fontSize: 9, marginTop: 2 }}>
            ID: {customerId}
          </span>
        )}
      </div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, fontSize: 11, marginBottom: i < payload.length - 1 ? 4 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
            <span style={{ color: t.textSub }}>{p.name}</span>
          </div>
          <span style={{ fontWeight: 700, color: t.tooltipText }}>{Number(p.value).toLocaleString('id-ID')}</span>
        </div>
      ))}
      {payload.length > 1 && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: t.textMuted }}>Total</span>
          <span style={{ fontWeight: 800, color: t.tooltipText }}>{payload.reduce((s: number, p: any) => s + Number(p.value), 0).toLocaleString('id-ID')}</span>
        </div>
      )}
    </div>
  );
}

// TableBtn: toggle Chart <-> Tabel
function TableBtn({ onClick, theme, active }: { onClick: () => void; theme: Theme; active?: boolean }) {
  const t = TK[theme];
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 6, fontSize: 10, fontWeight: 500, fontFamily: 'IBM Plex Mono, monospace', background: active ? `${t.blue.text}22` : t.inputBg, color: active ? t.blue.text : t.text, border: `1px solid ${active ? t.blue.text : t.borderInput}`, cursor: 'pointer', flexShrink: 0, transition: 'all .15s' }}>
      {active
        ? <svg width={10} height={10} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}><polyline points="1,12 5,7 8,9 11,4 15,2" /></svg>
        : <svg width={10} height={10} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="1" y="1" width="14" height="14" rx="2" /><line x1="1" y1="5.5" x2="15" y2="5.5" /><line x1="1" y1="10.5" x2="15" y2="10.5" /><line x1="5.5" y1="5.5" x2="5.5" y2="15" /></svg>
      }
      {active ? 'Chart' : 'Tabel'}
    </button>
  );
}

// DataTable: tabel generic sortable
type TableCol = { key: string; label: string; right?: boolean; format?: (v: any) => string; bold?: boolean };

function DataTable({ columns, rows, theme, defaultSortKey, defaultSortDir = 'asc' }: {
  columns: TableCol[]; rows: Record<string, any>[]; theme: Theme;
  defaultSortKey?: string; defaultSortDir?: 'asc' | 'desc';
}) {
  const t = TK[theme];
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({
    key: defaultSortKey ?? columns[0].key, dir: defaultSortDir,
  });

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = a[sort.key]; const bv = b[sort.key];
      let cmp: number;
      if (typeof av === 'string' || typeof bv === 'string') cmp = String(av ?? '').localeCompare(String(bv ?? ''));
      else cmp = (Number(av) || 0) - (Number(bv) || 0);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [rows, sort]);

  const handleSort = (key: string) =>
    setSort(p => (p.key === key ? { key, dir: p.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));

  return (
    <div style={{ height: '100%', overflow: 'auto', border: `1px solid ${t.border}`, borderRadius: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'IBM Plex Mono, monospace' }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
          <tr>
            {columns.map(c => {
              const active = sort.key === c.key;
              return (
                <th key={c.key} onClick={() => handleSort(c.key)}
                  style={{ padding: '8px 12px', textAlign: c.right ? 'right' : 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, color: t.tableHeadText, background: t.tableHeadBg, borderBottom: `1px solid ${t.border}`, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: c.right ? 'flex-end' : 'flex-start', gap: 3, width: '100%' }}>
                    {c.label}
                    <span style={{ opacity: active ? 1 : 0.3, fontSize: 8 }}>{active && sort.dir === 'asc' ? '▲' : active && sort.dir === 'desc' ? '▼' : '⇅'}</span>
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ padding: 20, textAlign: 'center', fontSize: 11, color: t.textMuted }}>Tidak ada data</td></tr>
          ) : sorted.map((r, i) => (
            <tr key={i} style={{ background: i % 2 !== 0 ? t.tableAlt : 'transparent' }}>
              {columns.map(c => (
                <td key={c.key} style={{ padding: '7px 12px', fontSize: 11, textAlign: c.right ? 'right' : 'left', color: t.text, fontWeight: c.bold ? 700 : 400, borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>
                  {c.format ? c.format(r[c.key]) : (r[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChartBox({ title, chartKey, height = 260, onExpand, year, theme, compact, children, badge, tableActive, onToggleTable, loading, skeleton = 'bar' }: {
  title: string; chartKey: string; height?: number;
  onExpand: (chartKey: string, year: number) => void;
  year: number; theme: Theme; compact?: boolean; children: React.ReactNode; badge?: string;
  tableActive?: boolean; onToggleTable?: () => void;
  loading?: boolean; skeleton?: 'bar' | 'pie';
}) {
  const t = TK[theme];
  const { isMobile } = useBreakpoint();
  return (
    <div style={{ background: t.cardBg, border: `1px solid ${t.borderCard}`, borderRadius: 10, padding: compact || isMobile ? '10px 10px' : '14px 16px', boxShadow: t.shadow, transition: 'background 0.3s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 6, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: compact || isMobile ? 11 : 12, fontWeight: 600, fontFamily: 'IBM Plex Sans, sans-serif', color: t.text }}>{title}</span>
          {badge && !loading && <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: t.inputBg, color: t.textMuted, border: `1px solid ${t.border}`, fontFamily: 'IBM Plex Mono, monospace' }}>{badge}</span>}
          {badge && loading && <Skeleton w={52} h={16} r={8} theme={theme} />}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, opacity: loading ? 0.4 : 1, pointerEvents: loading ? 'none' : 'auto', transition: 'opacity 0.15s' }}>
          {onToggleTable && <TableBtn onClick={onToggleTable} theme={theme} active={!!tableActive} />}
          <button onClick={() => onExpand(chartKey, year)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 500, fontFamily: 'IBM Plex Mono, monospace', background: t.inputBg, color: t.text, border: `1px solid ${t.borderInput}`, cursor: 'pointer', flexShrink: 0 }}>
            <Maximize2 size={9} /> Perbesar
          </button>
        </div>
      </div>
      <div style={{ height, background: t.chartAreaBg, border: `1px solid ${t.chartAreaBorder}`, borderRadius: 8, padding: '8px 4px 4px', overflow: tableActive && !loading ? 'auto' : 'visible' }}>
        {loading ? <ChartSkeleton kind={skeleton} theme={theme} /> : children}
      </div>
    </div>
  );
}

function ExpandModal({ title, onClose, children, theme }: { title: string; onClose: () => void; children: React.ReactNode; theme: Theme }) {
  const t = TK[theme];
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', fn); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: t.modalOverlay, backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: t.modalBg, border: `1px solid ${t.modalBorder}`, borderRadius: 16, width: '100%', maxWidth: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.45)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${t.border}`, background: t.tableHeadBg, color: t.tableHeadText, flexShrink: 0, borderRadius: '16px 16px 0 0' }}>
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'IBM Plex Sans, sans-serif', color: t.tableHeadText }}>{title}</span>
          <button onClick={onClose} style={{ background: t.inputBg, border: `1px solid ${t.borderInput}`, cursor: 'pointer', color: t.textMuted, padding: '5px 6px', borderRadius: 8, display: 'flex', alignItems: 'center' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px', background: t.cardBg, borderRadius: '0 0 16px 16px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function SortTh({ label, sortKey, sortState, onSort, theme, align = 'left' }: { label: string; sortKey: string; sortState: { key: string; dir: SortDir }; onSort: (key: string) => void; theme: Theme; align?: 'left'|'right' }) {
  const t = TK[theme];
  const active = sortState.key === sortKey;
  return (
    <th onClick={() => onSort(sortKey)} style={{ padding: '8px 14px', textAlign: align, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: t.tableHeadText, background: active ? t.divider : t.tableHeadBg, borderBottom: `1px solid ${t.border}`, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', transition: 'background 0.15s', fontFamily: 'IBM Plex Mono, monospace' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        <span style={{ opacity: active ? 1 : 0.3, fontSize: 8 }}>
          {active && sortState.dir === 'asc' ? '▲' : active && sortState.dir === 'desc' ? '▼' : '⇅'}
        </span>
      </span>
    </th>
  );
}

// YearPanel: menerima ringkasan (OutletPanel) dari server, tidak ada baris mentah
function YearPanel({ year, isA, panel, selectedUnit, theme, onExpand, compact, otherTotal, weekRange, fmtVal, fmtValExact, loading }: {
  year: number; isA: boolean; panel: OutletPanel; selectedUnit: string;
  theme: Theme; onExpand: (chartKey: string, year: number) => void;
  compact?: boolean; otherTotal?: number;
  weekRange: { min: number; max: number };
  fmtVal: (v: number) => string;
  fmtValExact: (v: number) => string;
  loading?: boolean;
}) {
  const t = TK[theme];
  const { isMobile } = useBreakpoint();
  const palette    = isA ? PALETTE_A : PALETTE_B;
  const piePalette = isA ? PIE_PAL_A : PIE_PAL_B;
  const yc         = isA ? TK[theme].yearA : TK[theme].yearB;

  const [sortState,     setSortState]     = useState<{ key: string; dir: SortDir }>({ key: 'week', dir: 'asc' });
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [tableModes, setTableModes] = useState<Record<string, boolean>>({});
  const toggleTableMode = (key: string) => setTableModes(p => ({ ...p, [key]: !p[key] }));

  const handleSort = (key: string) => {
    setSortState(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : prev.dir === 'desc' ? null : 'asc' }
        : { key, dir: 'desc' }
    );
  };

  // Data dari server
  const outletTypes = panel.outletTypes;
  const totalDoz    = panel.total;

  const weeklyData = useMemo(() => {
    const result: { week: string; wkNum: number; dozNet: number }[] = [];
    for (let wk = weekRange.min; wk <= weekRange.max; wk++) {
      result.push({ week: `W${wk}`, wkNum: wk, dozNet: panel.weekly[wk] ?? 0 });
    }
    return result;
  }, [panel, weekRange]);

  const weeklyChart = useMemo(
    () => weeklyData.map(w => ({ ...w, pct: totalDoz > 0 ? (w.dozNet / totalDoz) * 100 : 0 })),
    [weeklyData, totalDoz],
  );

  const pieOutlet = useMemo(
    () => panel.pieOutlet.map(d => ({ ...d, pct: totalDoz > 0 ? (d.value / totalDoz) * 100 : 0 })),
    [panel, totalDoz],
  );
  const pieCategory = useMemo(
    () => panel.pieCategory.map(d => ({ ...d, pct: totalDoz > 0 ? (d.value / totalDoz) * 100 : 0 })),
    [panel, totalDoz],
  );

  const barProduct  = panel.barProduct;
  const barCity     = panel.barCity;
  const barDistrict = panel.barDistrict;
  const barCustomer = panel.barCustomer;

  const customerIdMap = useMemo(() => {
    const m = new Map<string, string>();
    barCustomer.forEach(d => m.set(String(d.customer), String(d._customerId ?? '')));
    return m;
  }, [barCustomer]);

  // Kolom tabel per chart
  const weeklyColumns: TableCol[] = useMemo(() => [
    { key: 'week', label: 'Minggu' },
    { key: 'dozNet', label: `${getUnitShortLabel(selectedUnit)} Net`, right: true, bold: true, format: v => fmtValExact(v) },
    { key: 'pct', label: '%', right: true, format: v => `${(v as number).toFixed(2)}%` },
  ], [selectedUnit, fmtValExact]);

  const pieColumns: TableCol[] = useMemo(() => [
    { key: 'name', label: 'Nama' },
    { key: 'value', label: `${getUnitShortLabel(selectedUnit)} Net`, right: true, bold: true, format: v => fmtValExact(v) },
    { key: 'pct', label: 'Kontribusi', right: true, format: v => `${(v as number).toFixed(1)}%` },
  ], [selectedUnit, fmtValExact]);

  const distColumns = useCallback((xKey: string, xLabel: string): TableCol[] => [
    { key: xKey, label: xLabel },
    ...outletTypes.map(ot => ({ key: ot, label: ot, right: true, format: (v: number) => v ? fmtValExact(v) : '—' })),
    { key: '_total', label: 'Total', right: true, bold: true, format: (v: number) => fmtValExact(v) },
  ], [outletTypes, fmtValExact]);

  const customerColumns: TableCol[] = useMemo(() => [
    { key: 'customer', label: 'Customer' },
    { key: '_customerId', label: 'ID', format: v => v ? `#${v}` : '—' },
    ...outletTypes.map(ot => ({ key: ot, label: ot, right: true, format: (v: number) => v ? fmtValExact(v) : '—' })),
    { key: '_total', label: 'Total', right: true, bold: true, format: (v: number) => fmtValExact(v) },
  ], [outletTypes, fmtValExact]);

  const metrics = useMemo(() => {
    const totalWeeksInRange = weeklyData.length;
    const avg   = totalWeeksInRange > 0 ? totalDoz / totalWeeksInRange : 0;
    const best  = weeklyData.length > 0 ? weeklyData.reduce((m, c) => c.dozNet > m.dozNet ? c : m, weeklyData[0]) : { dozNet: 0, week: '—', wkNum: 0 };
    const withData = weeklyData.filter(w => w.dozNet > 0);
    const worst = withData.length > 0 ? withData.reduce((m, c) => c.dozNet < m.dozNet ? c : m, withData[0]) : { dozNet: 0, week: '—', wkNum: 0 };
    const yoyTrend = otherTotal != null && otherTotal > 0 ? ((totalDoz - otherTotal) / otherTotal) * 100 : undefined;
    return { weeks: totalWeeksInRange, avg, best, worst, yoyTrend };
  }, [weeklyData, totalDoz, otherTotal]);

  const sortedTable = useMemo(() => {
    const arr = [...weeklyChart];
    if (!sortState.dir) return arr;
    return arr.sort((a, b) => {
      let va: any, vb: any;
      if (sortState.key === 'week')        { va = a.wkNum;  vb = b.wkNum;  }
      else if (sortState.key === 'dozNet') { va = a.dozNet; vb = b.dozNet; }
      else if (sortState.key === 'pct')    { va = a.pct;    vb = b.pct;    }
      else return 0;
      return sortState.dir === 'asc' ? va - vb : vb - va;
    });
  }, [weeklyChart, sortState]);

  const chartH   = isMobile ? 180 : compact ? 200 : 240;
  const pieH     = isMobile ? 160 : compact ? 175 : 210;
  const barDistH = isMobile ? 220 : compact ? 250 : 290;
  const axisFs   = isMobile || compact ? 9 : 10;
  const avgLine  = metrics.avg;

  const PieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    const totalAll = (p.payload as any)._all ?? 0;
    const pctVal   = totalAll > 0 ? ((p.value / totalAll) * 100).toFixed(1) : '—';
    return (
      <div style={{ background: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, borderRadius: 10, padding: '10px 14px', fontFamily: 'IBM Plex Mono, monospace', minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.payload.fill ?? p.fill, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: t.tooltipText }}>{p.name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 11 }}>
          <span style={{ color: t.textMuted }}>{getUnitShortLabel(selectedUnit)} Net</span>
          <span style={{ fontWeight: 700, color: t.tooltipText }}>{fmtValExact(p.value)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 11, marginTop: 3 }}>
          <span style={{ color: t.textMuted }}>Kontribusi</span>
          <span style={{ fontWeight: 700, color: t.tooltipText }}>{pctVal}%</span>
        </div>
      </div>
    );
  };

  const withTotal = (data: { name: string; value: number; pct: number }[]) => {
    const total = data.reduce((s, d) => s + d.value, 0);
    return data.map((d, i) => ({ ...d, fill: piePalette[i % piePalette.length], _all: total }));
  };

  const renderPie = (rawData: { name: string; value: number; pct: number }[], expandedMode = false) => {
    const data = withTotal(rawData);
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy={expandedMode ? '45%' : '43%'} outerRadius={expandedMode ? '55%' : '52%'} innerRadius={expandedMode ? '30%' : '28%'} dataKey="value" labelLine={false}
            label={({ cx: lx, cy: ly, midAngle, innerRadius: ir, outerRadius: or, percent }: any) => {
              if (!percent || percent < 0.05) return null;
              const r = ir + (or - ir) * 1.65;
              const x = lx + r * Math.cos(-midAngle * Math.PI / 180);
              const y = ly + r * Math.sin(-midAngle * Math.PI / 180);
              return <text x={x} y={y} fill={t.textSub} textAnchor="middle" dominantBaseline="central" fontSize={isMobile || (compact && !expandedMode) ? 8 : 10} fontFamily="IBM Plex Mono, monospace" fontWeight={600}>{(percent * 100).toFixed(0)}%</text>;
            }}>
            {data.map((entry, i) => <Cell key={i} fill={entry.fill} stroke="transparent" />)}
          </Pie>
          <Tooltip content={<PieTooltip />} />
          <Legend iconSize={7} iconType="circle" wrapperStyle={{ fontSize: isMobile || (compact && !expandedMode) ? 9 : 10, fontFamily: 'IBM Plex Mono, monospace', color: t.textSub }} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderBar = (data: Record<string, string | number>[], xKey: string, prefix: string, modalMode = false) => {
    const axisF = modalMode ? 11 : axisFs;
    const mb    = isMobile || compact ? (modalMode ? 80 : 60) : (modalMode ? 90 : 70);
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: mb }}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} vertical={false} />
          <XAxis dataKey={xKey} angle={-35} textAnchor="end" height={mb} tick={{ fontSize: axisF, fill: t.textMuted, fontFamily: 'IBM Plex Mono, monospace' }} interval={0} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: axisF, fill: t.textMuted, fontFamily: 'IBM Plex Mono, monospace' }} width={isMobile || compact ? 32 : 40} axisLine={false} tickLine={false} tickFormatter={fmtVal} />
          <Tooltip content={<ChartTooltip theme={theme} prefix={prefix} />} cursor={{ fill: t.divider, radius: 4 }} />
          <Legend wrapperStyle={{ fontSize: axisF, fontFamily: 'IBM Plex Mono, monospace', color: t.textSub, paddingTop: 4 }} iconType="circle" iconSize={6} />
          {outletTypes.map((ot, i) => <Bar key={ot} dataKey={ot} name={ot} fill={palette[i % palette.length]} radius={[3, 3, 0, 0]} stackId="a" />)}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderBarCustomer = (data: Record<string, string | number>[], modalMode = false) => {
    const axisF    = modalMode ? 11 : axisFs;
    const maxChars = modalMode ? 22 : 14;
    const mb       = isMobile || compact ? (modalMode ? 110 : 84) : (modalMode ? 120 : 96);

    const CustomerTick = ({ x, y, payload }: any) => {
      const name       = String(payload.value);
      const customerId = customerIdMap.get(name) ?? '';
      const displayName = name.length > maxChars ? name.slice(0, maxChars) + '…' : name;
      return (
        <g transform={`translate(${x},${y})`}>
          <title>{`${name}${customerId ? ` (#${customerId})` : ''}`}</title>
          <text x={0} y={0} dy={4} textAnchor="end" transform="rotate(-35)"
            fontSize={axisF} fontFamily="IBM Plex Mono, monospace" fill={t.textMuted}>
            {displayName}
          </text>
          {customerId && (
            <text x={0} y={0} dy={axisF + 9} textAnchor="end" transform="rotate(-35)"
              fontSize={Math.max(axisF - 1, 8)} fontFamily="IBM Plex Mono, monospace" fill={t.textFaint}>
              #{customerId}
            </text>
          )}
        </g>
      );
    };

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: mb }}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} vertical={false} />
          <XAxis
            dataKey="customer"
            height={mb}
            tick={<CustomerTick />}
            interval={0}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: axisF, fill: t.textMuted, fontFamily: 'IBM Plex Mono, monospace' }} width={isMobile || compact ? 32 : 40} axisLine={false} tickLine={false} tickFormatter={fmtVal} />
          <Tooltip
            content={<ChartTooltip theme={theme} prefix="Customer: " customerMap={customerIdMap} />}
            cursor={{ fill: t.divider, radius: 4 }}
          />
          <Legend wrapperStyle={{ fontSize: axisF, fontFamily: 'IBM Plex Mono, monospace', color: t.textSub, paddingTop: 4 }} iconType="circle" iconSize={6} />
          {outletTypes.map((ot, i) => <Bar key={ot} dataKey={ot} name={ot} fill={palette[i % palette.length]} radius={[3, 3, 0, 0]} stackId="a" />)}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const MODAL_H = 'calc(80vh - 120px)';
  const wrapModal = (el: React.ReactNode) => (
    <div style={{ height: MODAL_H, background: t.chartAreaBg, border: `1px solid ${t.chartAreaBorder}`, borderRadius: 8, padding: '8px 4px 4px' }}>{el}</div>
  );
  const wrapModalTable = (el: React.ReactNode) => (
    <div style={{ height: MODAL_H }}>{el}</div>
  );

  const renderChartContent = (chartKey: string, modalMode = false) => {
    const axisF = modalMode ? 11 : axisFs;
    const inTable = !!tableModes[chartKey];

    const weeklyEl = (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={weeklyChart} margin={{ top: 8, right: 16, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} vertical={false} />
          <XAxis dataKey="week" angle={-35} textAnchor="end" height={60} tick={{ fontSize: axisF, fill: t.textMuted, fontFamily: 'IBM Plex Mono, monospace' }} interval={0} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: axisF, fill: t.textMuted, fontFamily: 'IBM Plex Mono, monospace' }} width={44} axisLine={false} tickLine={false} tickFormatter={fmtVal} />
          <Tooltip content={<ChartTooltip theme={theme} />} cursor={{ fill: t.divider, radius: 4 }} />
          <ReferenceLine y={avgLine} stroke={yc.accent} strokeDasharray="4 3" strokeOpacity={0.6} strokeWidth={1.5} />
          <Bar dataKey="dozNet" name={`${getUnitShortLabel(selectedUnit)} Net`} radius={[3, 3, 0, 0]}>
            {weeklyChart.map((entry, index) => <Cell key={index} fill={entry.dozNet >= avgLine ? yc.accent : `${yc.accent}80`} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );

    if (!modalMode) return null;

    if (chartKey === 'weekly') {
      if (inTable) return wrapModalTable(<DataTable columns={weeklyColumns} rows={weeklyChart} theme={theme} defaultSortKey="wkNum" />);
      return wrapModal(weeklyEl);
    }
    if (chartKey === 'category') {
      if (inTable) return wrapModalTable(<DataTable columns={pieColumns} rows={pieCategory} theme={theme} defaultSortKey="value" defaultSortDir="desc" />);
      return wrapModal(renderPie(pieCategory, true));
    }
    if (chartKey === 'outlet') {
      if (inTable) return wrapModalTable(<DataTable columns={pieColumns} rows={pieOutlet} theme={theme} defaultSortKey="value" defaultSortDir="desc" />);
      return wrapModal(renderPie(pieOutlet, true));
    }
    if (chartKey === 'product') {
      if (inTable) return wrapModalTable(<DataTable columns={distColumns('product', 'Produk')} rows={barProduct} theme={theme} defaultSortKey="_total" defaultSortDir="desc" />);
      return wrapModal(renderBar(barProduct, 'product', 'Produk: ', true));
    }
    if (chartKey === 'city') {
      if (inTable) return wrapModalTable(<DataTable columns={distColumns('city', 'Kota/Kab.')} rows={barCity} theme={theme} defaultSortKey="_total" defaultSortDir="desc" />);
      return wrapModal(renderBar(barCity, 'city', 'Kota: ', true));
    }
    if (chartKey === 'district') {
      if (inTable) return wrapModalTable(<DataTable columns={distColumns('district', 'Kecamatan')} rows={barDistrict} theme={theme} defaultSortKey="_total" defaultSortDir="desc" />);
      return wrapModal(renderBar(barDistrict, 'district', 'Kec: ', true));
    }
    if (chartKey === 'customer') {
      if (inTable) return wrapModalTable(<DataTable columns={customerColumns} rows={barCustomer} theme={theme} defaultSortKey="_total" defaultSortDir="desc" />);
      return wrapModal(renderBarCustomer(barCustomer, true));
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? 8 : 10 }}>
        <MetricCard label={`Total ${getUnitShortLabel(selectedUnit)} Net`} value={fmtValExact(totalDoz)} sub={`${metrics.weeks} minggu (W${weekRange.min}–W${weekRange.max})`}
          cardKey={isA ? 'card1' : 'card2'} icon={Store} theme={theme} compact={isMobile || compact} loading={loading}
          trend={metrics.yoyTrend !== undefined ? { value: metrics.yoyTrend, label: 'YoY' } : undefined} />
        <MetricCard label="Rata-rata/Minggu" value={fmtValExact(metrics.avg)} sub={`${getUnitShortLabel(selectedUnit)} ÷ ${metrics.weeks} minggu`}
          cardKey={isA ? 'card1' : 'card2'} icon={TrendingUp} theme={theme} compact={isMobile || compact} loading={loading} />
        <MetricCard label="Minggu Terbaik" value={metrics.best.week} sub={`${fmtValExact(metrics.best.dozNet)} ${getUnitShortLabel(selectedUnit)}`}
          cardKey="card3" icon={ArrowUp} theme={theme} compact={isMobile || compact} loading={loading} />
        <MetricCard label="Minggu Terendah" value={metrics.worst.week}
          sub={metrics.worst.dozNet === 0 && metrics.worst.week === '—' ? 'N/A' : `${fmtValExact(metrics.worst.dozNet)} ${getUnitShortLabel(selectedUnit)}`}
          cardKey="card4" icon={ArrowDown} theme={theme} compact={isMobile || compact} loading={loading} />
      </div>

      {/* Weekly bar */}
      <ChartBox
        title="Kontribusi Per Minggu" chartKey="weekly" height={chartH}
        onExpand={ch => setExpandedChart(ch)} year={year} theme={theme} compact={isMobile || compact}
        badge={`avg ${fmtVal(avgLine)}`} loading={loading}
        tableActive={!!tableModes.weekly} onToggleTable={() => toggleTableMode('weekly')}
      >
        {tableModes.weekly ? (
          <DataTable columns={weeklyColumns} rows={weeklyChart} theme={theme} defaultSortKey="wkNum" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyChart} margin={{ top: 8, right: 8, left: -8, bottom: isMobile || compact ? 44 : 55 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} vertical={false} />
              <XAxis dataKey="week" angle={-35} textAnchor="end" height={isMobile || compact ? 44 : 55} tick={{ fontSize: axisFs, fill: t.textMuted, fontFamily: 'IBM Plex Mono, monospace' }} interval={isMobile ? 'preserveStartEnd' : 0} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: axisFs, fill: t.textMuted, fontFamily: 'IBM Plex Mono, monospace' }} width={isMobile || compact ? 32 : 40} axisLine={false} tickLine={false} tickFormatter={fmtVal} />
              <Tooltip content={<ChartTooltip theme={theme} />} cursor={{ fill: t.divider, radius: 4 }} />
              <ReferenceLine y={avgLine} stroke={yc.accent} strokeDasharray="4 3" strokeOpacity={0.6} strokeWidth={1.5} />
              <Bar dataKey="dozNet" name={`${getUnitShortLabel(selectedUnit)} Net`} radius={[3, 3, 0, 0]}>
                {weeklyChart.map((entry, index) => <Cell key={index} fill={entry.dozNet >= avgLine ? yc.accent : `${yc.accent}80`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartBox>

      {/* Pies */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
        <ChartBox
          title="per Kategori Produk" chartKey="category" height={pieH}
          onExpand={ch => setExpandedChart(ch)} year={year} theme={theme} compact={isMobile || compact}
          loading={loading} skeleton="pie"
          tableActive={!!tableModes.category} onToggleTable={() => toggleTableMode('category')}
        >
          {tableModes.category
            ? <DataTable columns={pieColumns} rows={pieCategory} theme={theme} defaultSortKey="value" defaultSortDir="desc" />
            : renderPie(pieCategory)}
        </ChartBox>
        <ChartBox
          title="per Tipe Outlet" chartKey="outlet" height={pieH}
          onExpand={ch => setExpandedChart(ch)} year={year} theme={theme} compact={isMobile || compact}
          loading={loading} skeleton="pie"
          tableActive={!!tableModes.outlet} onToggleTable={() => toggleTableMode('outlet')}
        >
          {tableModes.outlet
            ? <DataTable columns={pieColumns} rows={pieOutlet} theme={theme} defaultSortKey="value" defaultSortDir="desc" />
            : renderPie(pieOutlet)}
        </ChartBox>
      </div>

      {/* Bar distributions */}
      <ChartBox
        title="per Produk (Top 10)" chartKey="product" height={barDistH}
        onExpand={ch => setExpandedChart(ch)} year={year} theme={theme} compact={isMobile || compact}
        loading={loading}
        tableActive={!!tableModes.product} onToggleTable={() => toggleTableMode('product')}
      >
        {tableModes.product
          ? <DataTable columns={distColumns('product', 'Produk')} rows={barProduct} theme={theme} defaultSortKey="_total" defaultSortDir="desc" />
          : renderBar(barProduct, 'product', 'Produk: ')}
      </ChartBox>
      <ChartBox
        title="per Kota/Kab. (Top 10)" chartKey="city" height={barDistH}
        onExpand={ch => setExpandedChart(ch)} year={year} theme={theme} compact={isMobile || compact}
        loading={loading}
        tableActive={!!tableModes.city} onToggleTable={() => toggleTableMode('city')}
      >
        {tableModes.city
          ? <DataTable columns={distColumns('city', 'Kota/Kab.')} rows={barCity} theme={theme} defaultSortKey="_total" defaultSortDir="desc" />
          : renderBar(barCity, 'city', 'Kota: ')}
      </ChartBox>
      <ChartBox
        title="per Kecamatan (Top 10)" chartKey="district" height={barDistH}
        onExpand={ch => setExpandedChart(ch)} year={year} theme={theme} compact={isMobile || compact}
        loading={loading}
        tableActive={!!tableModes.district} onToggleTable={() => toggleTableMode('district')}
      >
        {tableModes.district
          ? <DataTable columns={distColumns('district', 'Kecamatan')} rows={barDistrict} theme={theme} defaultSortKey="_total" defaultSortDir="desc" />
          : renderBar(barDistrict, 'district', 'Kec: ')}
      </ChartBox>

      {/* Customer */}
      <ChartBox
        title="per Customer (Top 10)" chartKey="customer" height={barDistH + 30}
        onExpand={ch => setExpandedChart(ch)} year={year} theme={theme} compact={isMobile || compact}
        loading={loading}
        tableActive={!!tableModes.customer} onToggleTable={() => toggleTableMode('customer')}
      >
        {tableModes.customer
          ? <DataTable columns={customerColumns} rows={barCustomer} theme={theme} defaultSortKey="_total" defaultSortDir="desc" />
          : renderBarCustomer(barCustomer)}
      </ChartBox>

      {/* Detail table */}
      <div style={{ background: t.cardBg, border: `1px solid ${t.borderCard}`, borderRadius: 10, overflow: 'hidden', boxShadow: t.shadow }}>
        <div style={{ padding: isMobile || compact ? '8px 12px' : '11px 16px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: isMobile || compact ? 11 : 12, fontWeight: 700, fontFamily: 'IBM Plex Sans, sans-serif', color: t.text }}>Detail Mingguan</span>
          {loading
            ? <Skeleton w={110} h={10} theme={theme} />
            : <span style={{ fontSize: 10, color: t.textMuted, fontFamily: 'IBM Plex Mono, monospace' }}>{weeklyChart.length} minggu · klik header untuk sort</span>}
        </div>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ minWidth: '100%', borderCollapse: 'collapse', fontSize: isMobile || compact ? 11 : 12, fontFamily: 'IBM Plex Mono, monospace' }}>
            <thead>
              <tr style={{ color: t.tableHeadText, background: t.tableHeadBg }}>
                <SortTh label="Minggu"  sortKey="week"   sortState={sortState} onSort={handleSort} theme={theme} />
                <SortTh label={`${getUnitShortLabel(selectedUnit)} Net`} sortKey="dozNet" sortState={sortState} onSort={handleSort} theme={theme} align="right" />
                <SortTh label="%"       sortKey="pct"    sortState={sortState} onSort={handleSort} theme={theme} align="right" />
                <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: t.tableHeadText, background: t.tableHeadBg, borderBottom: `1px solid ${t.border}`, fontFamily: 'IBM Plex Mono, monospace' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: Math.min(Math.max(weeklyChart.length, 5), 8) }).map((_, i) => (
                  <tr key={i} style={{ background: i % 2 === 1 ? t.tableAlt : t.cardBg }}>
                    <td style={{ padding: '10px 14px' }}><Skeleton w={30} h={11} theme={theme} /></td>
                    <td style={{ padding: '10px 14px' }}><Skeleton w={90} h={11} theme={theme} style={{ marginLeft: 'auto' }} /></td>
                    <td style={{ padding: '10px 14px' }}><Skeleton w={40} h={11} theme={theme} style={{ marginLeft: 'auto' }} /></td>
                    <td style={{ padding: '10px 14px' }}><Skeleton w={52} h={16} r={10} theme={theme} /></td>
                  </tr>
                ))
              ) : sortedTable.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: t.textMuted, background: t.cardBg }}>Tidak ada data</td></tr>
              ) : sortedTable.map((w, idx) => {
                const aboveAvg = w.dozNet >= avgLine;
                const st = w.dozNet === 0
                  ? { label: 'Kosong', ...TK[theme].neuGrowth }
                  : w.pct >= 5
                  ? { label: 'Tinggi',  ...TK[theme].green  }
                  : w.pct >= 2
                  ? { label: 'Sedang',  ...TK[theme].orange }
                  : { label: 'Rendah',  ...TK[theme].red    };
                const maxDoz = Math.max(...weeklyChart.map(x => x.dozNet), 1);
                return (
                  <tr key={w.week} style={{ background: idx % 2 === 1 ? t.tableAlt : t.cardBg, transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = t.tableHover}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = idx % 2 === 1 ? t.tableAlt : t.cardBg}>
                    <td style={{ padding: isMobile || compact ? '7px 10px' : '8px 14px', color: t.text, fontWeight: 600 }}>{w.week}</td>
                    <td style={{ padding: isMobile || compact ? '7px 10px' : '8px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        {/* <div style={{ width: 40, height: 4, background: t.border, borderRadius: 2, flexShrink: 0, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(w.dozNet / maxDoz) * 100}%`, background: aboveAvg ? yc.accent : `${yc.accent}60`, borderRadius: 2 }} />
                        </div> */}
                        <span style={{ color: w.dozNet === 0 ? t.textMuted : t.textSub }}>{fmtValExact(w.dozNet)}</span>
                      </div>
                    </td>
                    <td style={{ padding: isMobile || compact ? '7px 10px' : '8px 14px', color: t.text, textAlign: 'right' }}>{w.dozNet === 0 ? '—' : `${w.pct.toFixed(2)}%`}</td>
                    <td style={{ padding: isMobile || compact ? '7px 10px' : '8px 14px' }}>
                      <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 20, fontSize: 9, fontWeight: 700, background: st.bg, color: st.text, border: `1px solid ${st.border}` }}>{st.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {!loading && sortedTable.length > 0 && (
              <tfoot>
                <tr style={{ background: t.tableHeadBg, borderTop: `1px solid ${t.border}` }}>
                  <td style={{ padding: '8px 14px', fontSize: 10, fontWeight: 700, color: t.tableHeadText }}>Total</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 11, fontWeight: 800, color: t.tableHeadText }}>{fmtValExact(totalDoz)}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 10, color: t.tableHeadText }}>100%</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {expandedChart && (
        <ExpandModal
          title={`Tahun ${year}  ${
            expandedChart === 'weekly'   ? 'Kontribusi Per Minggu'  :
            expandedChart === 'category' ? 'per Kategori Produk'    :
            expandedChart === 'outlet'   ? 'per Tipe Outlet'        :
            expandedChart === 'product'  ? 'per Produk (Top 10)'    :
            expandedChart === 'city'     ? 'per Kota/Kab. (Top 10)' :
            expandedChart === 'district' ? 'per Kecamatan (Top 10)' :
            expandedChart === 'customer' ? 'per Customer (Top 10)'  : ''
          }${tableModes[expandedChart] ? '   Tabel Data' : ''}`}
          onClose={() => setExpandedChart(null)}
          theme={theme}
        >
          {renderChartContent(expandedChart, true)}
        </ExpandModal>
      )}
    </div>
  );
}

// Props
interface OutletContributionSectionProps {
  result: OutletResponse;                 // hasil agregasi dari /api/outlet-analysis
  options: OutletOptions | null;          // opsi dropdown (dikirim sekali)
  loading: boolean;
  initialFilters: OutletFilterValues;     // filter yang sedang diterapkan
  initialUnit: string;
  onApply: (f: OutletFilterValues, unit: string) => void;
  theme?: Theme;
}

const sameFilters = (a: OutletFilterValues, b: OutletFilterValues) => JSON.stringify(a) === JSON.stringify(b);

// Main Component
export default function OutletContributionSection({
  result, options, loading, initialFilters, initialUnit, onApply, theme: themeProp,
}: OutletContributionSectionProps) {
  const theme: Theme = themeProp ?? 'light';
  const t = TK[theme];
  const { isMobile, isTablet } = useBreakpoint();
  const opts = options ?? EMPTY_OUTLET_OPTIONS;

  // Draft filter (belum dikirim ke server)
  const [selOutlet,       setSelOutlet]       = useState(initialFilters.outletType || 'all');
  const [selCat,          setSelCat]          = useState(initialFilters.category   || 'all');
  const [selProduct,      setSelProduct]      = useState(initialFilters.product    || 'all');
  const [selCity,         setSelCity]         = useState(initialFilters.city       || 'all');
  const [selDistrict,     setSelDistrict]     = useState(initialFilters.district   || 'all');
  const [selSalesman,     setSelSalesman]     = useState(initialFilters.salesman   || 'all');
  const [selCustomerNo,   setSelCustomerNo]   = useState(initialFilters.customerNo);
  const [selCustomerName, setSelCustomerName] = useState(initialFilters.customerName);
  const [globalSearch,    setGlobalSearch]    = useState(initialFilters.q);
  const [unit,            setUnit]            = useState(initialUnit);
  const [ap,              setAp]              = useState<OutletFilterValues>(initialFilters); // yang sudah diterapkan
  const [filterOpen,      setFilterOpen]      = useState(true);
  const [activeTab,       setActiveTab]       = useState<'A' | 'B'>('A');

  const draft: OutletFilterValues = {
    outletType:   selOutlet   === 'all' ? '' : selOutlet,
    category:     selCat      === 'all' ? '' : selCat,
    product:      selProduct  === 'all' ? '' : selProduct,
    city:         selCity     === 'all' ? '' : selCity,
    district:     selDistrict === 'all' ? '' : selDistrict,
    salesman:     selSalesman === 'all' ? '' : selSalesman,
    customerNo:   selCustomerNo,
    customerName: selCustomerName,
    q:            globalSearch.trim(),
  };
  const unapplied = !sameFilters(draft, ap);

  const handleApply = () => { setAp(draft); onApply(draft, unit); };
  // Ganti unit langsung fetch ulang (top 10 bergantung unit), memakai filter yang sudah diterapkan
  const handleUnit  = (u: string) => { setUnit(u); onApply(ap, u); };

  const resetAll = () => {
    setSelOutlet('all'); setSelCat('all'); setSelProduct('all');
    setSelCity('all'); setSelDistrict('all'); setSelSalesman('all');
    setSelCustomerNo(''); setSelCustomerName(''); setGlobalSearch('');
    if (!sameFilters(ap, EMPTY_OUTLET_FILTERS)) {
      setAp(EMPTY_OUTLET_FILTERS);
      onApply(EMPTY_OUTLET_FILTERS, unit);
    }
  };

  const isOmzetUnit = unit === 'omzet';
  const fmtVal      = isOmzetUnit ? fmtRp      : fmtK;
  const fmtValExact = isOmzetUnit ? fmtRpExact : fmtExact;

  const optProduct = useMemo(
    () => Array.from(new Set(opts.products.filter(p => selCat === 'all' || p.category === selCat).map(p => p.product))).sort(),
    [opts, selCat],
  );
  const optDistrict = useMemo(
    () => Array.from(new Set(opts.districts.filter(d => selCity === 'all' || d.city === selCity).map(d => d.district))).sort(),
    [opts, selCity],
  );
  const optCustomer = useMemo(
    () => opts.customers.filter(c => selCity === 'all' || c.city === selCity).map(c => ({ no: c.no, name: c.name })),
    [opts, selCity],
  );

  const hasDropdownFilter = [selOutlet, selCat, selProduct, selCity, selDistrict, selSalesman].some(v => v !== 'all') || !!selCustomerNo;
  const hasFilter = hasDropdownFilter || !!globalSearch;
  const activeFilterCount = [selOutlet, selCat, selProduct, selCity, selDistrict, selSalesman].filter(v => v !== 'all').length
    + (selCustomerNo ? 1 : 0) + (globalSearch ? 1 : 0);

  const unitFilterOptions = useMemo(() => [
    { value: 'units_dos',  label: 'Jual (Dos Net)' },
    { value: 'units_bal',  label: 'Jual (Bal Net)' },
    { value: 'units_slop', label: 'Jual (Slop Net)' },
    { value: 'units_bks',  label: 'Jual (Bks Net)' },
    { value: 'omzet',      label: 'Omzet (Rp)' },
  ], []);

  const yearA = result.years.p1;
  const yearB = result.years.p2;
  const weekRange = result.weekRange;
  const panels = [
    { tab: 'A' as const, year: yearA, isA: true,  panel: result.p1, yc: TK[theme].yearA, other: result.p2.total, label: 'P1' },
    { tab: 'B' as const, year: yearB, isA: false, panel: result.p2, yc: TK[theme].yearB, other: result.p1.total, label: 'P2' },
  ];

  const renderPanel = (p: typeof panels[number], compact?: boolean) => (
    <YearPanel year={p.year} isA={p.isA} panel={p.panel} selectedUnit={unit} theme={theme}
      onExpand={() => {}} compact={compact} otherTotal={p.other} weekRange={weekRange}
      fmtVal={fmtVal} fmtValExact={fmtValExact} loading={loading} />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 18, fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <style>{`
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${t.scrollbar};border-radius:2px}
        ::-webkit-scrollbar-thumb:hover{background:${t.textMuted}}
        @keyframes skShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes skSpin{to{transform:rotate(360deg)}}
        @media (prefers-reduced-motion: reduce){*{animation-duration:0.01ms !important;animation-iteration-count:1 !important}}
      `}</style>

      {/* Header */}
      {/* <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <p style={{ margin: 0, fontSize: 10, color: t.textMuted, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {getUnitShortLabel(unit)} Net · {(result.p1.records + result.p2.records).toLocaleString()} records
          {!sameFilters(ap, EMPTY_OUTLET_FILTERS) && ' · filter diterapkan'}
          {` · W${weekRange.min}–W${weekRange.max}`}
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          {panels.map(p => (
            <div key={p.tab} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: p.yc.bg, border: `1px solid ${p.yc.border}` }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.yc.accent }} />
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: p.yc.label }}>{p.label} · {p.year}</span>
            </div>
          ))}
        </div>
      </div> */}

      {/* YoY Summary */}
      {/* <YoYSummaryBar totalA={result.p1.total} totalB={result.p2.total} selectedUnit={unit} yearA={yearA} yearB={yearB} theme={theme} fmtValExact={fmtValExact} /> */}

      {/* Filter */}
      <div style={{ background: t.cardBg, border: `1px solid ${unapplied ? t.orange.border : hasFilter ? t.blue.border : t.borderCard}`, borderRadius: isMobile ? 10 : 12, padding: isMobile ? '10px 12px' : '14px 16px', boxShadow: t.shadow, transition: 'border-color 0.2s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: filterOpen ? 12 : 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flex: 1 }} onClick={() => setFilterOpen(p => !p)}>
            <SlidersHorizontal size={12} color={hasFilter ? t.blue.text : t.textMuted} />
            <span style={{ fontSize: isMobile ? 10 : 11, fontWeight: 700, color: hasFilter ? t.blue.text : t.textMuted, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Filter</span>
            {hasFilter && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 10, background: t.blue.bg, color: t.blue.text, border: `1px solid ${t.blue.border}`, fontFamily: 'IBM Plex Mono, monospace' }}>{activeFilterCount} dipilih</span>
            )}
            <span style={{ color: t.textMuted, marginLeft: 'auto' }}>{filterOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
          </div>
        </div>

        <SearchBox value={globalSearch} onChange={setGlobalSearch} theme={theme} placeholder="Cari customer, produk, kota, salesman..." />

        {filterOpen && (
          <>
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(148px, 1fr))', gap: isMobile ? 8 : 10 }}>
              <FilterSelect label="Unit"        value={unit}        onChange={handleUnit}     options={unitFilterOptions} accentKey="indigo" theme={theme} isUnitFilter />
              <FilterSelect label="Tipe Outlet" value={selOutlet}   onChange={setSelOutlet}   options={opts.outletTypes} accentKey="blue"   theme={theme} />
              <FilterSelect label="Kategori"    value={selCat}      onChange={setSelCat}      options={opts.categories}  accentKey="green"  theme={theme} />
              <FilterSelect label="Produk"      value={selProduct}  onChange={setSelProduct}  options={optProduct}       accentKey="purple" theme={theme} />
              <FilterSelect label="Kota/Kab."   value={selCity}     onChange={setSelCity}     options={opts.cities}      accentKey="orange" theme={theme} />
              <FilterSelect label="Kecamatan"   value={selDistrict} onChange={setSelDistrict} options={optDistrict}      accentKey="pink"   theme={theme} />
              <FilterSelect label="Salesman"    value={selSalesman} onChange={setSelSalesman} options={opts.salesmen}    accentKey="orange" theme={theme} />
              <SearchableSelect
                label="Customer" value={selCustomerNo}
                onChange={(no, name) => { setSelCustomerNo(no); setSelCustomerName(name); }}
                options={optCustomer} accentKey="indigo" theme={theme} placeholder="Semua Customer"
              />
            </div>

            {hasDropdownFilter && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${t.border}`, display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: t.textMuted, fontFamily: 'IBM Plex Mono, monospace', marginRight: 3 }}>Dipilih:</span>
                {selOutlet   !== 'all' && <FilterChip label={selOutlet}   accentKey="blue"   onRemove={() => setSelOutlet('all')}   theme={theme} />}
                {selCat      !== 'all' && <FilterChip label={selCat}      accentKey="green"  onRemove={() => setSelCat('all')}      theme={theme} />}
                {selProduct  !== 'all' && <FilterChip label={selProduct}  accentKey="purple" onRemove={() => setSelProduct('all')}  theme={theme} />}
                {selCity     !== 'all' && <FilterChip label={selCity}     accentKey="orange" onRemove={() => setSelCity('all')}     theme={theme} />}
                {selDistrict !== 'all' && <FilterChip label={selDistrict} accentKey="pink"   onRemove={() => setSelDistrict('all')} theme={theme} />}
                {selSalesman !== 'all' && <FilterChip label={selSalesman} accentKey="orange" onRemove={() => setSelSalesman('all')} theme={theme} />}
                {selCustomerNo && (
                  <FilterChip label={selCustomerName ? `${selCustomerName} · #${selCustomerNo}` : `#${selCustomerNo}`} accentKey="indigo"
                    onRemove={() => { setSelCustomerNo(''); setSelCustomerName(''); }} theme={theme} />
                )}
              </div>
            )}

            {/* Tombol Terapkan */}
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
              {unapplied && !loading && (
                <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: t.orange.text, background: t.orange.bg, border: `1px solid ${t.orange.border}`, borderRadius: 6, padding: '3px 8px' }}>
                  Belum diterapkan
                </span>
              )}
              {(hasFilter || !sameFilters(ap, EMPTY_OUTLET_FILTERS)) && (
                <button onClick={resetAll} disabled={loading}
                  style={{ height: 30, padding: '0 12px', borderRadius: 7, background: 'transparent', border: `1px solid ${t.text}`, color: t.text, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <RefreshCw size={10} /> Reset
                </button>
              )}
              <button onClick={handleApply} disabled={loading || !unapplied}
                style={{ height: 30, padding: '0 16px', borderRadius: 7, border: 'none', background: '#1c9706', color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', cursor: loading || !unapplied ? 'not-allowed' : 'pointer', opacity: loading || !unapplied ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                {loading && <RefreshCw size={10} style={{ animation: 'skSpin 0.8s linear infinite' }} />}
                {loading ? 'Memuat…' : 'Terapkan'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Panel per periode */}
      <div aria-busy={loading} style={{ pointerEvents: loading ? 'none' : 'auto' }}>
        {isMobile ? (
          <div>
            <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: `1px solid ${t.borderCard}`, marginBottom: 14, background: t.inputBg }}>
              {panels.map(p => (
                <button key={p.tab} onClick={() => setActiveTab(p.tab)} style={{ flex: 1, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: activeTab === p.tab ? p.yc.bg : 'transparent', border: 'none', borderBottom: activeTab === p.tab ? `2px solid ${p.yc.accent}` : '2px solid transparent', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.yc.accent }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: activeTab === p.tab ? p.yc.label : t.textMuted }}>{p.label} · {p.year}</span>
                </button>
              ))}
            </div>
            {renderPanel(panels.find(p => p.tab === activeTab)!)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isTablet ? 14 : 20, alignItems: 'start' }}>
            {panels.map(p => (
              <div key={p.tab}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '10px 16px', borderRadius: 10, background: p.yc.bg, border: `1px solid ${p.yc.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
                  <Calendar size={13} color={p.yc.label} />
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: p.yc.label }}>{p.label} · Tahun {p.year}</span>
                  {/* <span style={{ fontSize: 10, color: p.yc.label, opacity: 0.55, fontFamily: 'IBM Plex Mono, monospace', marginLeft: 'auto' }}>{p.panel.records.toLocaleString()} records</span> */}
                </div>
                {renderPanel(p, isTablet)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
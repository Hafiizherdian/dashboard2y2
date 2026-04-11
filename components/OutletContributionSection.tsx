'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line, Area, AreaChart, ReferenceLine,
} from 'recharts';
import {
  Store, TrendingUp, TrendingDown, Filter, Maximize2, X, ArrowUp, ArrowDown,
  Calendar, ChevronDown, ChevronUp, SlidersHorizontal, BarChart2,
  RefreshCw, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import { OutletSalesData } from '@/types/sales';

// ─── Theme tokens ─────────────────────────────────────────────────────────────
type Theme = 'dark' | 'light';

const TK = {
  dark: {
    cardBg:      '#111318',
    contentBg:   '#0d0f15',
    inputBg:     'rgba(255,255,255,0.03)',
    border:      'rgba(255,255,255,0.06)',
    borderCard:  'rgba(255,255,255,0.07)',
    borderInput: 'rgba(255,255,255,0.08)',
    text:        'rgba(255,255,255,0.9)',
    textSub:     'rgba(255,255,255,0.55)',
    textMuted:   'rgba(255,255,255,0.3)',
    textFaint:   'rgba(255,255,255,0.18)',
    selectBg:    '#0c0e14',
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
    card4:  { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.18)', text: '#fca5a5', val: 'rgba(255,255,255,0.9)' },
    gridStroke:    'rgba(255,255,255,0.06)',
    tooltipBg:     '#0c0e14',
    tooltipBorder: 'rgba(255,255,255,0.12)',
    tooltipText:   'rgba(255,255,255,0.85)',
    tableHeadBg:   '#0c0e14',
    tableHeadText: 'rgba(255,255,255,0.3)',
    tableAlt:      'rgba(255,255,255,0.02)',
    tableHover:    'rgba(255,255,255,0.04)',
    modalOverlay:  'rgba(0,0,0,0.8)',
    modalBg:       '#111318',
    modalBorder:   'rgba(255,255,255,0.08)',
    yearA: { bg: '#0f1724', border: '#1e3a5f', label: '#93c5fd', accent: '#3b82f6' },
    yearB: { bg: '#0f1f17', border: '#1a4731', label: '#6ee7b7', accent: '#10b981' },
    scrollbar: 'rgba(255,255,255,0.1)',
    shadow:    'none',
    posGrowth: { bg: 'rgba(16,185,129,0.12)', text: '#6ee7b7', border: 'rgba(16,185,129,0.25)' },
    negGrowth: { bg: 'rgba(239,68,68,0.1)',   text: '#fca5a5', border: 'rgba(239,68,68,0.2)'  },
    neuGrowth: { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.1)' },
    divider:   'rgba(255,255,255,0.04)',
    // FIX: chart background tokens
    chartAreaBg: 'rgba(255,255,255,0.03)',
    chartAreaBorder: 'rgba(255,255,255,0.06)',
  },
  light: {
    cardBg:      '#ffffff',
    contentBg:   '#f8fafc',
    inputBg:     'rgba(0,0,0,0.03)',
    border:      'rgba(0,0,0,0.07)',
    borderCard:  'rgba(0,0,0,0.08)',
    borderInput: 'rgba(0,0,0,0.1)',
    text:        '#0f172a',
    textSub:     '#475569',
    textMuted:   '#94a3b8',
    textFaint:   '#cbd5e1',
    selectBg:    '#ffffff',
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
    gridStroke:    'rgba(0,0,0,0.07)',
    tooltipBg:     '#ffffff',
    tooltipBorder: 'rgba(0,0,0,0.1)',
    tooltipText:   '#0f172a',
    tableHeadBg:   '#f8fafc',
    tableHeadText: '#94a3b8',
    tableAlt:      'rgba(0,0,0,0.02)',
    tableHover:    'rgba(0,0,0,0.03)',
    modalOverlay:  'rgba(0,0,0,0.5)',
    modalBg:       '#ffffff',
    modalBorder:   'rgba(0,0,0,0.08)',
    yearA: { bg: '#eff6ff', border: '#bfdbfe', label: '#1d4ed8', accent: '#2563eb' },
    yearB: { bg: '#f0fdf4', border: '#bbf7d0', label: '#15803d', accent: '#16a34a' },
    scrollbar: 'rgba(0,0,0,0.15)',
    shadow:    '0 1px 8px rgba(0,0,0,0.07)',
    posGrowth: { bg: 'rgba(22,163,74,0.08)',  text: '#15803d', border: 'rgba(22,163,74,0.2)'  },
    negGrowth: { bg: 'rgba(220,38,38,0.08)',  text: '#b91c1c', border: 'rgba(220,38,38,0.15)' },
    neuGrowth: { bg: 'rgba(0,0,0,0.04)',       text: '#94a3b8', border: 'rgba(0,0,0,0.08)'     },
    divider:   'rgba(0,0,0,0.04)',
    // FIX: chart background tokens
    chartAreaBg: 'rgba(0,0,0,0.02)',
    chartAreaBorder: 'rgba(0,0,0,0.06)',
  },
} as const;

const PALETTE_A = ['#3b82f6', '#8b5cf6', '#06b6d4', '#6366f1', '#0ea5e9', '#a78bfa', '#2563eb'];
const PALETTE_B = ['#10b981', '#f59e0b', '#14b8a6', '#84cc16', '#22d3ee', '#a3e635', '#059669'];
const PIE_PALETTE_A = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#10b981', '#f97316'];
const PIE_PALETTE_B = ['#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#14b8a6', '#ec4899'];

type AccentKey = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo' | 'pink';
type CardKey   = 'card1' | 'card2' | 'card3' | 'card4';
type SortDir   = 'asc' | 'desc' | null;

function useBreakpoint() {
  const [width, setWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return { isMobile: width < 640, isTablet: width >= 640 && width < 1024, isDesktop: width >= 1024 };
}

// ─── FilterSelect ─────────────────────────────────────────────────────────────
function FilterSelect({ label, value, onChange, options, accentKey, theme }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; accentKey: AccentKey; theme: Theme;
}) {
  const t = TK[theme];
  const accent = t[accentKey];
  const active = value !== 'all';
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      border: `1px solid ${active ? accent.border : t.borderInput}`,
      borderRadius: 8, overflow: 'hidden',
      transition: 'border-color 0.2s',
      boxShadow: active ? `0 0 0 2px ${accent.border}40` : 'none',
    }}>
      <span style={{
        padding: '6px 9px',
        fontSize: 9, fontFamily: 'IBM Plex Mono, monospace',
        textTransform: 'uppercase', letterSpacing: '0.07em',
        fontWeight: 700, color: accent.text,
        background: active ? accent.bg : t.inputBg,
        borderRight: `1px solid ${active ? accent.border : t.borderInput}`,
        display: 'flex', alignItems: 'center',
        whiteSpace: 'nowrap', flexShrink: 0,
        transition: 'background 0.2s',
      }}>
        {label}
      </span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: t.inputBg, border: 'none', outline: 'none',
          padding: '6px 24px 6px 8px', fontSize: 11,
          fontFamily: 'IBM Plex Mono, monospace', color: active ? t.text : t.textMuted,
          cursor: 'pointer', flex: 1, minWidth: 0,
          appearance: 'none', width: '100%',
          fontWeight: active ? 600 : 400,
        }}
      >
        <option value="all" style={{ background: t.selectBg }}>Semua</option>
        {options.map(o => (
          <option key={o} value={o} style={{ background: t.selectBg }}>{o}</option>
        ))}
      </select>
    </div>
  );
}

// ─── FilterChip ───────────────────────────────────────────────────────────────
function FilterChip({ label, onRemove, accentKey, theme }: {
  label: string; onRemove: () => void; accentKey: AccentKey; theme: Theme;
}) {
  const accent = TK[theme][accentKey];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px 3px 7px', borderRadius: 20,
      fontSize: 10, fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace',
      background: accent.bg, color: accent.text, border: `1px solid ${accent.border}`,
      whiteSpace: 'nowrap',
    }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent.text, padding: '0 1px', opacity: 0.6, lineHeight: 1, borderRadius: 3, fontSize: 13, display: 'flex', alignItems: 'center' }}>
        <X size={10} />
      </button>
    </span>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, cardKey, icon: Icon, theme, compact, trend }: {
  label: string; value: string; sub: string;
  cardKey: CardKey; icon: React.ComponentType<{ size?: number; color?: string }>;
  theme: Theme; compact?: boolean;
  trend?: { value: number; label: string };
}) {
  const c = TK[theme][cardKey];
  const t = TK[theme];
  const pos = trend && trend.value > 0;
  const neg = trend && trend.value < 0;
  const growthStyle = pos ? t.posGrowth : neg ? t.negGrowth : t.neuGrowth;

  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 10, padding: compact ? '10px 12px' : '14px 16px',
      display: 'flex', flexDirection: 'column', gap: compact ? 3 : 5,
      transition: 'background 0.3s',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 60, height: 60, background: `radial-gradient(circle at top right, ${c.text}15, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon size={11} color={c.text} />
          <span style={{ fontSize: compact ? 8 : 10, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: c.text }}>{label}</span>
        </div>
        {trend && (
          <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', padding: '1px 6px', borderRadius: 10, background: growthStyle.bg, color: growthStyle.text, border: `1px solid ${growthStyle.border}`, display: 'flex', alignItems: 'center', gap: 2 }}>
            {pos ? <ArrowUpRight size={8} /> : neg ? <ArrowDownRight size={8} /> : <Minus size={8} />}
            {Math.abs(trend.value).toFixed(1)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: compact ? 16 : 21, fontWeight: 800, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '-0.02em', color: c.val, wordBreak: 'break-all' }}>{value}</div>
      <div style={{ fontSize: compact ? 9 : 11, color: t.textMuted, fontFamily: 'IBM Plex Mono, monospace' }}>{sub}</div>
    </div>
  );
}

// ─── YoY Summary Bar ─────────────────────────────────────────────────────────
function YoYSummaryBar({ dataA, dataB, yearA, yearB, theme }: {
  dataA: OutletSalesData[]; dataB: OutletSalesData[];
  yearA: number; yearB: number; theme: Theme;
}) {
  const t = TK[theme];
  const totalA = useMemo(() => dataA.reduce((s, r) => s + (r.dozNet || 0), 0), [dataA]);
  const totalB = useMemo(() => dataB.reduce((s, r) => s + (r.dozNet || 0), 0), [dataB]);
  const growth = totalA > 0 ? ((totalB - totalA) / totalA) * 100 : 0;
  const isPos = growth > 0;
  const isNeg = growth < 0;
  const growthStyle = isPos ? t.posGrowth : isNeg ? t.negGrowth : t.neuGrowth;
  const GrowthIcon = isPos ? TrendingUp : isNeg ? TrendingDown : Minus;
  const maxVal = Math.max(totalA, totalB);
  const pctA = maxVal > 0 ? (totalA / maxVal) * 100 : 0;
  const pctB = maxVal > 0 ? (totalB / maxVal) * 100 : 0;

  return (
    <div style={{ background: t.cardBg, border: `1px solid ${t.borderCard}`, borderRadius: 12, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: t.shadow }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.textMuted, fontFamily: 'IBM Plex Mono, monospace' }}>
          Perbandingan YoY · DOZ Net
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, background: growthStyle.bg, border: `1px solid ${growthStyle.border}` }}>
          <GrowthIcon size={12} color={growthStyle.text} />
          <span style={{ fontSize: 12, fontWeight: 800, fontFamily: 'IBM Plex Mono, monospace', color: growthStyle.text }}>
            {isPos ? '+' : ''}{growth.toFixed(1)}% YoY
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { yr: yearA, val: totalA, pct: pctA, palette: TK[theme].yearA },
          { yr: yearB, val: totalB, pct: pctB, palette: TK[theme].yearB },
        ].map(({ yr, val, pct, palette }) => (
          <div key={yr} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 44, fontSize: 11, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: palette.label, flexShrink: 0, textAlign: 'right' }}>{yr}</span>
            <div style={{ flex: 1, height: 20, background: t.inputBg, borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${palette.accent}cc, ${palette.accent})`, borderRadius: 4, transition: 'width 0.6s ease' }} />
            </div>
            <span style={{ width: 80, fontSize: 11, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: t.textSub, flexShrink: 0 }}>{val.toLocaleString('id-ID')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ChartTooltip ─────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, theme, prefix = '' }: any) {
  if (!active || !payload?.length) return null;
  const t = TK[theme as Theme];
  return (
    <div style={{ background: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, borderRadius: 10, padding: '10px 14px', fontFamily: 'IBM Plex Mono, monospace', minWidth: 150, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
      <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 8, fontWeight: 600 }}>{prefix}{label}</div>
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

// ─── FIX: ChartBox — pakai t.cardBg & t.contentBg konsisten ─────────────────
function ChartBox({ title, chartKey, height = 260, onExpand, year, theme, compact, children, badge }: {
  title: string; chartKey: string; height?: number;
  onExpand: (chartKey: string, year: number) => void;
  year: number; theme: Theme; compact?: boolean;
  children: React.ReactNode; badge?: string;
}) {
  const t = TK[theme];
  const { isMobile } = useBreakpoint();

  return (
    // FIX: background pakai t.cardBg bukan t.contentBg (contentBg terlalu gelap di dark mode)
    <div style={{
      background: t.cardBg,
      border: `1px solid ${t.borderCard}`,
      borderRadius: 10,
      padding: compact || isMobile ? '10px 10px' : '14px 16px',
      boxShadow: t.shadow,
      transition: 'background 0.3s, border-color 0.3s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: compact || isMobile ? 11 : 12, fontWeight: 600, fontFamily: 'IBM Plex Sans, sans-serif', color: t.text }}>
            {title}
          </span>
          {badge && (
            <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: t.inputBg, color: t.textMuted, border: `1px solid ${t.border}`, fontFamily: 'IBM Plex Mono, monospace' }}>{badge}</span>
          )}
        </div>
        <button
          onClick={() => onExpand(chartKey, year)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 6,
            fontSize: 10, fontWeight: 500, fontFamily: 'IBM Plex Mono, monospace',
            // FIX: tombol pakai token
            background: t.inputBg, color: t.textMuted,
            border: `1px solid ${t.borderInput}`, cursor: 'pointer', flexShrink: 0,
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          <Maximize2 size={9} /> Perbesar
        </button>
      </div>
      {/* FIX: chart area pakai chartAreaBg & chartAreaBorder token */}
      <div style={{
        height,
        background: t.chartAreaBg,
        border: `1px solid ${t.chartAreaBorder}`,
        borderRadius: 8,
        padding: '8px 4px 4px',
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── ExpandModal ──────────────────────────────────────────────────────────────
function ExpandModal({ title, onClose, children, theme }: {
  title: string; onClose: () => void; children: React.ReactNode; theme: Theme;
}) {
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${t.border}`, background: t.tableHeadBg, flexShrink: 0, borderRadius: '16px 16px 0 0' }}>
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'IBM Plex Sans, sans-serif', color: t.text }}>{title}</span>
          <button onClick={onClose} style={{ background: t.inputBg, border: `1px solid ${t.borderInput}`, cursor: 'pointer', color: t.textMuted, padding: '5px 6px', borderRadius: 8, display: 'flex', alignItems: 'center' }}>
            <X size={16} />
          </button>
        </div>
        {/* FIX: modal content bg pakai t.cardBg */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px', background: t.cardBg, borderRadius: '0 0 16px 16px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── SortTh ───────────────────────────────────────────────────────────────────
function SortTh({ label, sortKey, sortState, onSort, theme, align = 'left' }: {
  label: string; sortKey: string;
  sortState: { key: string; dir: SortDir };
  onSort: (key: string) => void;
  theme: Theme; align?: 'left' | 'right';
}) {
  const t = TK[theme];
  const active = sortState.key === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        padding: '8px 14px', textAlign: align,
        fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
        color: active ? t.textSub : t.tableHeadText,
        // FIX: background pakai t.tableHeadBg
        background: active ? t.divider : t.tableHeadBg,
        borderBottom: `1px solid ${t.border}`,
        cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
        transition: 'background 0.15s, color 0.15s',
        fontFamily: 'IBM Plex Mono, monospace',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        <span style={{ opacity: active ? 1 : 0.3, fontSize: 8 }}>
          {active && sortState.dir === 'asc' ? '▲' : active && sortState.dir === 'desc' ? '▼' : '⇅'}
        </span>
      </span>
    </th>
  );
}

// ─── YearPanel ────────────────────────────────────────────────────────────────
function YearPanel({ year, isA, data: rows, theme, onExpand, compact, otherTotal }: {
  year: number; isA: boolean; data: OutletSalesData[];
  theme: Theme; onExpand: (chartKey: string, year: number) => void;
  compact?: boolean; otherTotal?: number;
}) {
  const t = TK[theme];
  const { isMobile } = useBreakpoint();
  const palette    = isA ? PALETTE_A : PALETTE_B;
  const piePalette = isA ? PIE_PALETTE_A : PIE_PALETTE_B;
  // FIX: yc sekarang benar-benar pakai isA untuk memilih yearA atau yearB
  const yc = isA ? TK[theme].yearA : TK[theme].yearB;

  const [sortState,    setSortState]    = useState<{ key: string; dir: SortDir }>({ key: 'week', dir: 'asc' });
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  const handleExpand = (chartKey: string, _year: number) => setExpandedChart(chartKey);

  const handleSort = (key: string) => {
    setSortState(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : prev.dir === 'desc' ? null : 'asc' }
        : { key, dir: 'desc' }
    );
  };

  const outletTypes = useMemo(() => {
    const s = new Set<string>();
    rows.forEach(r => { if (r.outletType) s.add(r.outletType); });
    return Array.from(s).sort();
  }, [rows]);

  const weeklyData = useMemo(() => {
    const m = new Map<number, number>();
    rows.forEach(r => { m.set(r.week, (m.get(r.week) || 0) + (r.dozNet || 0)); });
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]).map(([wk, dozNet]) => ({ week: `W${wk}`, wkNum: wk, dozNet }));
  }, [rows]);

  const totalDoz = useMemo(() => weeklyData.reduce((s, w) => s + w.dozNet, 0), [weeklyData]);

  const weeklyChart = useMemo(
    () => weeklyData.map(w => ({ ...w, pct: totalDoz > 0 ? (w.dozNet / totalDoz) * 100 : 0 })),
    [weeklyData, totalDoz],
  );

  const pieOutlet = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach(r => { const k = r.outletType || 'Unknown'; m.set(k, (m.get(k) || 0) + (r.dozNet || 0)); });
    return Array.from(m.entries()).map(([name, value]) => ({ name, value, pct: totalDoz > 0 ? (value / totalDoz) * 100 : 0 }));
  }, [rows, totalDoz]);

  const pieCategory = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach(r => { const k = r.category || 'Unknown'; m.set(k, (m.get(k) || 0) + (r.dozNet || 0)); });
    return Array.from(m.entries()).map(([name, value]) => ({ name, value, pct: totalDoz > 0 ? (value / totalDoz) * 100 : 0 }));
  }, [rows, totalDoz]);

  const makeBarDist = useCallback((keyFn: (r: OutletSalesData) => string, xKey: string) => {
    const outer = new Map<string, Map<string, number>>();
    rows.forEach(r => {
      const k = keyFn(r) || 'Unknown';
      const ot = r.outletType || 'Unknown';
      if (!outer.has(k)) outer.set(k, new Map());
      const inner = outer.get(k)!;
      inner.set(ot, (inner.get(ot) || 0) + (r.dozNet || 0));
    });
    return Array.from(outer.entries())
      .map(([key, inner]) => {
        const row: Record<string, string | number> = { [xKey]: key };
        let total = 0;
        inner.forEach((v, ot) => { row[ot] = v; total += v; });
        row._total = total;
        return row;
      })
      .sort((a, b) => (b._total as number) - (a._total as number))
      .slice(0, 10);
  }, [rows]);

  const barProduct  = useMemo(() => makeBarDist(r => r.product  || 'Unknown', 'product'),  [makeBarDist]);
  const barCity     = useMemo(() => makeBarDist(r => r.city     || 'Unknown', 'city'),     [makeBarDist]);
  const barDistrict = useMemo(() => makeBarDist(r => r.district || 'Unknown', 'district'), [makeBarDist]);
  const barCustomer = useMemo(() => makeBarDist(r => r.customer || 'Unknown', 'customer'), [makeBarDist]);

  const metrics = useMemo(() => {
    const weeks = weeklyData.length;
    const avg   = weeks ? totalDoz / weeks : 0;
    const best  = weeklyData.reduce((m, c) => c.dozNet > m.dozNet ? c : m, { dozNet: 0, week: '—', wkNum: 0 });
    const worst = weeklyData.length > 0 ? weeklyData.reduce((m, c) => c.dozNet < m.dozNet ? c : m, weeklyData[0]) : { dozNet: 0, week: '—', wkNum: 0 };
    const yoyTrend = otherTotal != null && otherTotal > 0 ? ((totalDoz - otherTotal) / otherTotal) * 100 : undefined;
    return { weeks, avg, best, worst, yoyTrend };
  }, [weeklyData, totalDoz, otherTotal]);

  const sortedTable = useMemo(() => {
    const arr = [...weeklyChart];
    if (!sortState.dir) return arr;
    return arr.sort((a, b) => {
      let va: any, vb: any;
      if (sortState.key === 'week')   { va = a.wkNum;  vb = b.wkNum;  }
      else if (sortState.key === 'dozNet') { va = a.dozNet; vb = b.dozNet; }
      else if (sortState.key === 'pct')   { va = a.pct;    vb = b.pct;    }
      else return 0;
      return sortState.dir === 'asc' ? va - vb : vb - va;
    });
  }, [weeklyChart, sortState]);

  const chartH   = isMobile ? 180 : compact ? 200 : 240;
  const pieH     = isMobile ? 160 : compact ? 175 : 210;
  const barDistH = isMobile ? 220 : compact ? 250 : 290;
  const axisFs   = isMobile || compact ? 9 : 10;
  const avgLine  = metrics.avg;

  // ── Pie tooltip ───────────────────────────────────────────────────────────
  const PieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    const totalAll = (p.payload as any)._all ?? 0;
    const pctVal = totalAll > 0 ? ((p.value / totalAll) * 100).toFixed(1) : '—';
    return (
      <div style={{ background: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, borderRadius: 10, padding: '10px 14px', fontFamily: 'IBM Plex Mono, monospace', minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.payload.fill ?? p.fill, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: t.tooltipText }}>{p.name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 11 }}>
          <span style={{ color: t.textMuted }}>DOZ Net</span>
          <span style={{ fontWeight: 700, color: t.tooltipText }}>{Number(p.value).toLocaleString('id-ID')}</span>
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
    return data.map(d => ({ ...d, fill: piePalette[data.indexOf(d) % piePalette.length], _all: total }));
  };

  const renderPie = (rawData: { name: string; value: number; pct: number }[], expandedMode = false) => {
    const data = withTotal(rawData);
    const cy = expandedMode ? '45%' : '43%';
    const outerR = expandedMode ? '55%' : '52%';
    const innerR = expandedMode ? '30%' : '28%';
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data} cx="50%" cy={cy} outerRadius={outerR} innerRadius={innerR}
            dataKey="value" labelLine={false}
            label={({ cx: lx, cy: ly, midAngle, innerRadius: ir, outerRadius: or, percent }: any) => {
              if (!percent || percent < 0.05) return null;
              const r = ir + (or - ir) * 1.65;
              const x = lx + r * Math.cos(-midAngle * Math.PI / 180);
              const y = ly + r * Math.sin(-midAngle * Math.PI / 180);
              return (
                <text x={x} y={y} fill={t.textSub} textAnchor="middle" dominantBaseline="central"
                  fontSize={isMobile || (compact && !expandedMode) ? 8 : 10}
                  fontFamily="IBM Plex Mono, monospace" fontWeight={600}>
                  {(percent * 100).toFixed(0)}%
                </text>
              );
            }}
          >
            {data.map((entry, i) => <Cell key={i} fill={entry.fill} stroke="transparent" />)}
          </Pie>
          <Tooltip content={<PieTooltip />} />
          <Legend
            iconSize={7} iconType="circle"
            // FIX: legend wrapperStyle pakai t.textSub
            wrapperStyle={{ fontSize: isMobile || (compact && !expandedMode) ? 9 : 10, fontFamily: 'IBM Plex Mono, monospace', color: t.textSub }}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderBar = (data: Record<string, string | number>[], xKey: string, prefix: string) => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: isMobile || compact ? 50 : 65 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} vertical={false} />
        <XAxis
          dataKey={xKey} angle={-35} textAnchor="end"
          height={isMobile || compact ? 50 : 65}
          // FIX: tick fill pakai t.textMuted
          tick={{ fontSize: axisFs, fill: t.textMuted, fontFamily: 'IBM Plex Mono, monospace' }}
          interval={0} axisLine={false} tickLine={false}
        />
        <YAxis
          tick={{ fontSize: axisFs, fill: t.textMuted, fontFamily: 'IBM Plex Mono, monospace' }}
          width={isMobile || compact ? 32 : 40}
          axisLine={false} tickLine={false}
          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
        />
        <Tooltip content={<ChartTooltip theme={theme} prefix={prefix} />} cursor={{ fill: t.divider, radius: 4 }} />
        <Legend
          wrapperStyle={{ fontSize: axisFs, fontFamily: 'IBM Plex Mono, monospace', color: t.textSub, paddingTop: 4 }}
          iconType="circle" iconSize={6}
        />
        {outletTypes.map((ot, i) => (
          <Bar key={ot} dataKey={ot} name={ot} fill={palette[i % palette.length]} radius={[3, 3, 0, 0]} stackId="a" />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  const MODAL_H = 'calc(80vh - 120px)';

  const renderChartContent = (chartKey: string, modalMode = false) => {
    const axisF = modalMode ? 11 : axisFs;

    const weeklyEl = (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={weeklyChart} margin={{ top: 8, right: 16, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} vertical={false} />
          <XAxis dataKey="week" angle={-35} textAnchor="end" height={60}
            tick={{ fontSize: axisF, fill: t.textMuted, fontFamily: 'IBM Plex Mono, monospace' }}
            interval={0} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: axisF, fill: t.textMuted, fontFamily: 'IBM Plex Mono, monospace' }}
            width={44} axisLine={false} tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
          <Tooltip content={<ChartTooltip theme={theme} />} cursor={{ fill: t.divider, radius: 4 }} />
          <ReferenceLine y={avgLine} stroke={yc.accent} strokeDasharray="4 3" strokeOpacity={0.6} strokeWidth={1.5} />
          <Bar dataKey="dozNet" name="DOZ Net" radius={[3, 3, 0, 0]}>
            {weeklyChart.map((entry, index) => (
              <Cell key={index} fill={entry.dozNet >= avgLine ? yc.accent : `${yc.accent}80`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );

    const makeBarEl = (data: Record<string, string | number>[], xKey: string, prefix: string) => (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} vertical={false} />
          <XAxis dataKey={xKey} angle={-40} textAnchor="end" height={80}
            tick={{ fontSize: axisF, fill: t.textMuted, fontFamily: 'IBM Plex Mono, monospace' }}
            interval={0} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: axisF, fill: t.textMuted, fontFamily: 'IBM Plex Mono, monospace' }}
            width={44} axisLine={false} tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
          <Tooltip content={<ChartTooltip theme={theme} prefix={prefix} />} cursor={{ fill: t.divider, radius: 4 }} />
          <Legend wrapperStyle={{ fontSize: axisF, fontFamily: 'IBM Plex Mono, monospace', color: t.textSub, paddingTop: 4 }}
            iconType="circle" iconSize={7} />
          {outletTypes.map((ot, i) => (
            <Bar key={ot} dataKey={ot} name={ot} fill={palette[i % palette.length]} radius={[3, 3, 0, 0]} stackId="a" />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );

    // FIX: modal chart area pakai t.chartAreaBg & t.chartAreaBorder
    const wrapModal = (el: React.ReactNode) => (
      <div style={{ height: MODAL_H, background: t.chartAreaBg, border: `1px solid ${t.chartAreaBorder}`, borderRadius: 8, padding: '8px 4px 4px' }}>
        {el}
      </div>
    );

    if (!modalMode) return null;
    if (chartKey === 'weekly')   return wrapModal(weeklyEl);
    if (chartKey === 'category') return wrapModal(renderPie(pieCategory, true));
    if (chartKey === 'outlet')   return wrapModal(renderPie(pieOutlet, true));
    if (chartKey === 'product')  return wrapModal(makeBarEl(barProduct,  'product',  'Produk: '));
    if (chartKey === 'city')     return wrapModal(makeBarEl(barCity,     'city',     'Kota: '));
    if (chartKey === 'district') return wrapModal(makeBarEl(barDistrict, 'district', 'Kecamatan: '));
    if (chartKey === 'customer') return wrapModal(makeBarEl(barCustomer, 'customer', 'Customer: '));
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? 8 : 10 }}>
        <MetricCard label="Total DOZ Net" value={totalDoz.toLocaleString('id-ID')} sub={`${metrics.weeks} minggu`}
          cardKey={isA ? 'card1' : 'card2'} icon={Store} theme={theme} compact={isMobile || compact}
          trend={metrics.yoyTrend !== undefined ? { value: metrics.yoyTrend, label: 'YoY' } : undefined} />
        <MetricCard label="Rata-rata/Minggu" value={Math.round(metrics.avg).toLocaleString('id-ID')} sub="DOZ per minggu"
          cardKey={isA ? 'card1' : 'card2'} icon={TrendingUp} theme={theme} compact={isMobile || compact} />
        <MetricCard label="Minggu Terbaik" value={metrics.best.week} sub={`${metrics.best.dozNet.toLocaleString('id-ID')} DOZ`}
          cardKey="card3" icon={ArrowUp} theme={theme} compact={isMobile || compact} />
        <MetricCard label="Minggu Terendah" value={metrics.worst.week}
          sub={metrics.worst.dozNet === 0 && metrics.worst.week === '—' ? 'N/A' : `${metrics.worst.dozNet.toLocaleString('id-ID')} DOZ`}
          cardKey="card4" icon={ArrowDown} theme={theme} compact={isMobile || compact} />
      </div>

      {/* Weekly bar */}
      <ChartBox title="Kontribusi Per Minggu" chartKey="weekly" height={chartH}
        onExpand={handleExpand} year={year} theme={theme} compact={isMobile || compact}
        badge={`avg ${Math.round(avgLine).toLocaleString('id-ID')}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyChart} margin={{ top: 8, right: 8, left: -8, bottom: isMobile || compact ? 44 : 55 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} vertical={false} />
            <XAxis dataKey="week" angle={-35} textAnchor="end"
              height={isMobile || compact ? 44 : 55}
              tick={{ fontSize: axisFs, fill: t.textMuted, fontFamily: 'IBM Plex Mono, monospace' }}
              interval={isMobile ? 'preserveStartEnd' : 0} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: axisFs, fill: t.textMuted, fontFamily: 'IBM Plex Mono, monospace' }}
              width={isMobile || compact ? 32 : 40} axisLine={false} tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <Tooltip content={<ChartTooltip theme={theme} />} cursor={{ fill: t.divider, radius: 4 }} />
            <ReferenceLine y={avgLine} stroke={yc.accent} strokeDasharray="4 3" strokeOpacity={0.6} strokeWidth={1.5} />
            <Bar dataKey="dozNet" name="DOZ Net" radius={[3, 3, 0, 0]}>
              {weeklyChart.map((entry, index) => (
                <Cell key={index} fill={entry.dozNet >= avgLine ? yc.accent : `${yc.accent}80`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartBox>

      {/* Pies */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
        <ChartBox title="per Kategori Produk" chartKey="category" height={pieH} onExpand={handleExpand} year={year} theme={theme} compact={isMobile || compact}>
          {renderPie(pieCategory)}
        </ChartBox>
        <ChartBox title="per Tipe Outlet" chartKey="outlet" height={pieH} onExpand={handleExpand} year={year} theme={theme} compact={isMobile || compact}>
          {renderPie(pieOutlet)}
        </ChartBox>
      </div>

      {/* Bar distributions */}
      <ChartBox title="per Produk (Top 10)"     chartKey="product"  height={barDistH} onExpand={handleExpand} year={year} theme={theme} compact={isMobile || compact}>{renderBar(barProduct,  'product',  'Produk: ')}</ChartBox>
      <ChartBox title="per Kota/Kab. (Top 10)"  chartKey="city"     height={barDistH} onExpand={handleExpand} year={year} theme={theme} compact={isMobile || compact}>{renderBar(barCity,     'city',     'Kota: ')}</ChartBox>
      <ChartBox title="per Kecamatan (Top 10)"  chartKey="district" height={barDistH} onExpand={handleExpand} year={year} theme={theme} compact={isMobile || compact}>{renderBar(barDistrict, 'district', 'Kecamatan: ')}</ChartBox>
      <ChartBox title="per Customer (Top 10)"   chartKey="customer" height={barDistH} onExpand={handleExpand} year={year} theme={theme} compact={isMobile || compact}>{renderBar(barCustomer, 'customer', 'Customer: ')}</ChartBox>

      {/* Detail table */}
      {/* FIX: table container pakai t.cardBg */}
      <div style={{ background: t.cardBg, border: `1px solid ${t.borderCard}`, borderRadius: 10, overflow: 'hidden', boxShadow: t.shadow }}>
        <div style={{ padding: isMobile || compact ? '8px 12px' : '11px 16px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: isMobile || compact ? 11 : 12, fontWeight: 700, fontFamily: 'IBM Plex Sans, sans-serif', color: t.text }}>Detail Mingguan</span>
          <span style={{ fontSize: 10, color: t.textMuted, fontFamily: 'IBM Plex Mono, monospace' }}>{weeklyChart.length} minggu · klik header untuk sort</span>
        </div>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ minWidth: '100%', borderCollapse: 'collapse', fontSize: isMobile || compact ? 11 : 12, fontFamily: 'IBM Plex Mono, monospace' }}>
            <thead>
              {/* FIX: thead background eksplisit t.tableHeadBg */}
              <tr style={{ background: t.tableHeadBg }}>
                <SortTh label="Minggu"  sortKey="week"   sortState={sortState} onSort={handleSort} theme={theme} />
                <SortTh label="DOZ Net" sortKey="dozNet" sortState={sortState} onSort={handleSort} theme={theme} align="right" />
                <SortTh label="%"       sortKey="pct"    sortState={sortState} onSort={handleSort} theme={theme} align="right" />
                <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: t.tableHeadText, background: t.tableHeadBg, borderBottom: `1px solid ${t.border}`, fontFamily: 'IBM Plex Mono, monospace' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedTable.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: t.textMuted, background: t.cardBg }}>Tidak ada data</td>
                </tr>
              ) : sortedTable.map((w, idx) => {
                const aboveAvg = w.dozNet >= avgLine;
                const st = w.pct >= 5
                  ? { label: 'Tinggi', ...TK[theme].green  }
                  : w.pct >= 2
                  ? { label: 'Sedang', ...TK[theme].orange }
                  : { label: 'Rendah', ...TK[theme].red    };
                const barPct = totalDoz > 0 ? (w.dozNet / (Math.max(...weeklyChart.map(w => w.dozNet)) || 1)) * 100 : 0;
                return (
                  <tr key={w.week}
                    style={{ background: idx % 2 === 1 ? t.tableAlt : t.cardBg, transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = t.tableHover}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = idx % 2 === 1 ? t.tableAlt : t.cardBg}
                  >
                    <td style={{ padding: isMobile || compact ? '7px 10px' : '8px 14px', color: t.text, fontWeight: 600 }}>{w.week}</td>
                    <td style={{ padding: isMobile || compact ? '7px 10px' : '8px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        <div style={{ width: 40, height: 4, background: t.border, borderRadius: 2, flexShrink: 0, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${barPct}%`, background: aboveAvg ? yc.accent : `${yc.accent}60`, borderRadius: 2 }} />
                        </div>
                        <span style={{ color: t.textSub }}>{w.dozNet.toLocaleString('id-ID')}</span>
                      </div>
                    </td>
                    <td style={{ padding: isMobile || compact ? '7px 10px' : '8px 14px', color: t.textMuted, textAlign: 'right' }}>{w.pct.toFixed(2)}%</td>
                    <td style={{ padding: isMobile || compact ? '7px 10px' : '8px 14px' }}>
                      <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 20, fontSize: 9, fontWeight: 700, background: st.bg, color: st.text, border: `1px solid ${st.border}` }}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {sortedTable.length > 0 && (
              <tfoot>
                {/* FIX: tfoot pakai t.tableHeadBg */}
                <tr style={{ background: t.tableHeadBg, borderTop: `1px solid ${t.border}` }}>
                  <td style={{ padding: '8px 14px', fontSize: 10, fontWeight: 700, color: t.textSub }}>Total</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 11, fontWeight: 800, color: t.text }}>{totalDoz.toLocaleString('id-ID')}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 10, color: t.textMuted }}>100%</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Internal modal */}
      {expandedChart && (
        <ExpandModal
          title={`Tahun ${year} — ${
            expandedChart === 'weekly'   ? 'Kontribusi Per Minggu'  :
            expandedChart === 'category' ? 'per Kategori Produk'    :
            expandedChart === 'outlet'   ? 'per Tipe Outlet'        :
            expandedChart === 'product'  ? 'per Produk (Top 10)'    :
            expandedChart === 'city'     ? 'per Kota/Kab. (Top 10)' :
            expandedChart === 'district' ? 'per Kecamatan (Top 10)' :
            expandedChart === 'customer' ? 'per Customer (Top 10)'  : ''
          }`}
          onClose={() => setExpandedChart(null)}
          theme={theme}
        >
          {renderChartContent(expandedChart, true)}
        </ExpandModal>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface OutletContributionSectionProps {
  data?: { outletData?: OutletSalesData[] };
  theme?: Theme;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OutletContributionSection({ data, theme: themeProp }: OutletContributionSectionProps) {
  const theme: Theme = themeProp ?? 'light';
  const t = TK[theme];
  const { isMobile, isTablet } = useBreakpoint();

  const [selOutlet,   setSelOutlet]   = useState('all');
  const [selCat,      setSelCat]      = useState('all');
  const [selProduct,  setSelProduct]  = useState('all');
  const [selCity,     setSelCity]     = useState('all');
  const [selDistrict, setSelDistrict] = useState('all');
  const [selCustomer, setSelCustomer] = useState('all');
  const [filterOpen,  setFilterOpen]  = useState(false);
  const [activeTab,   setActiveTab]   = useState<'A' | 'B'>('A');

  const raw = data?.outletData ?? [];

  const availableYears = useMemo(() => {
    const s = new Set<number>();
    raw.forEach(r => { if (r.year) s.add(r.year); });
    return Array.from(s).sort();
  }, [raw]);

  const yearA = availableYears[0] ?? null;
  const yearB = availableYears[1] ?? null;

  const optOutlet   = useMemo(() => { const s = new Set<string>(); raw.forEach(r => { if (r.outletType) s.add(r.outletType); }); return Array.from(s).sort(); }, [raw]);
  const optCat      = useMemo(() => { const s = new Set<string>(); raw.forEach(r => { if (r.category) s.add(r.category); }); return Array.from(s).sort(); }, [raw]);
  const optProduct  = useMemo(() => { const s = new Set<string>(); raw.filter(r => selCat === 'all' || r.category === selCat).forEach(r => { if (r.product) s.add(r.product); }); return Array.from(s).sort(); }, [raw, selCat]);
  const optCity     = useMemo(() => { const s = new Set<string>(); raw.forEach(r => { if (r.city && r.city !== 'Unknown') s.add(r.city); }); return Array.from(s).sort(); }, [raw]);
  const optDistrict = useMemo(() => { const s = new Set<string>(); raw.filter(r => selCity === 'all' || r.city === selCity).forEach(r => { if (r.district && r.district !== 'Unknown') s.add(r.district); }); return Array.from(s).sort(); }, [raw, selCity]);
  const optCustomer = useMemo(() => { const s = new Set<string>(); raw.filter(r => selCity === 'all' || r.city === selCity).forEach(r => { if (r.customer && r.customer !== 'Unknown') s.add(r.customer); }); return Array.from(s).sort(); }, [raw, selCity]);

  const filterFn = useCallback(
    (r: OutletSalesData) =>
      (selOutlet   === 'all' || r.outletType === selOutlet)   &&
      (selCat      === 'all' || r.category   === selCat)      &&
      (selProduct  === 'all' || r.product    === selProduct)  &&
      (selCity     === 'all' || r.city       === selCity)     &&
      (selDistrict === 'all' || r.district   === selDistrict) &&
      (selCustomer === 'all' || r.customer   === selCustomer),
    [selOutlet, selCat, selProduct, selCity, selDistrict, selCustomer],
  );

  const dataA = useMemo(() => yearA != null ? raw.filter(r => r.year === yearA && filterFn(r)) : [], [raw, yearA, filterFn]);
  const dataB = useMemo(() => yearB != null ? raw.filter(r => r.year === yearB && filterFn(r)) : [], [raw, yearB, filterFn]);
  const totalA = useMemo(() => dataA.reduce((s, r) => s + (r.dozNet || 0), 0), [dataA]);
  const totalB = useMemo(() => dataB.reduce((s, r) => s + (r.dozNet || 0), 0), [dataB]);

  const hasFilter = [selOutlet, selCat, selProduct, selCity, selDistrict, selCustomer].some(v => v !== 'all');
  const activeFilterCount = [selOutlet, selCat, selProduct, selCity, selDistrict, selCustomer].filter(v => v !== 'all').length;

  const resetAll = () => {
    setSelOutlet('all'); setSelCat('all'); setSelProduct('all');
    setSelCity('all'); setSelDistrict('all'); setSelCustomer('all');
  };

  if (!raw.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center', gap: 14 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: t.inputBg, border: `1px solid ${t.borderCard}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Store size={24} color={t.textMuted} />
        </div>
        <div style={{ fontSize: 14, color: t.textMuted, fontFamily: 'IBM Plex Sans, sans-serif' }}>Tidak ada data outlet tersedia</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 18, fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <style>{`
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${t.scrollbar}; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: ${t.textMuted}; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <p style={{ margin: 0, fontSize: 10, color: t.textMuted, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          DOZ Net · {(dataA.length + dataB.length).toLocaleString()} records
          {hasFilter && ` · ${activeFilterCount} filter aktif`}
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          {yearA != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: TK[theme].yearA.bg, border: `1px solid ${TK[theme].yearA.border}` }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: TK[theme].yearA.accent }} />
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: TK[theme].yearA.label }}>{yearA}</span>
            </div>
          )}
          {yearB != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: TK[theme].yearB.bg, border: `1px solid ${TK[theme].yearB.border}` }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: TK[theme].yearB.accent }} />
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: TK[theme].yearB.label }}>{yearB}</span>
            </div>
          )}
        </div>
      </div>

      {/* YoY Summary */}
      {yearA != null && yearB != null && (
        <YoYSummaryBar dataA={dataA} dataB={dataB} yearA={yearA} yearB={yearB} theme={theme} />
      )}

      {/* Filter card */}
      <div style={{ background: t.cardBg, border: `1px solid ${hasFilter ? t.blue.border : t.borderCard}`, borderRadius: isMobile ? 10 : 12, padding: isMobile ? '10px 12px' : '14px 16px', boxShadow: t.shadow, transition: 'border-color 0.2s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: filterOpen ? 12 : 0, cursor: 'pointer' }}
          onClick={() => setFilterOpen(p => !p)}>
          <SlidersHorizontal size={12} color={hasFilter ? t.blue.text : t.textMuted} />
          <span style={{ fontSize: isMobile ? 10 : 11, fontWeight: 700, color: hasFilter ? t.blue.text : t.textMuted, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>
            Filter Data
            {!isMobile && !filterOpen && <span style={{ fontSize: 10, color: t.textMuted, fontWeight: 400, marginLeft: 6, textTransform: 'none' }}>(berlaku untuk kedua tahun)</span>}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {hasFilter && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 10, background: t.blue.bg, color: t.blue.text, border: `1px solid ${t.blue.border}`, fontFamily: 'IBM Plex Mono, monospace' }}>{activeFilterCount} aktif</span>}
            {hasFilter && !filterOpen && (
              <button onClick={e => { e.stopPropagation(); resetAll(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.red.text, fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, padding: '1px 6px', display: 'flex', alignItems: 'center', gap: 3 }}>
                <RefreshCw size={9} /> Reset
              </button>
            )}
            <span style={{ color: t.textMuted }}>{filterOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
          </div>
        </div>

        {filterOpen && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(148px, 1fr))', gap: isMobile ? 8 : 10 }}>
              <FilterSelect label="Tipe Outlet" value={selOutlet}   onChange={setSelOutlet}   options={optOutlet}   accentKey="blue"   theme={theme} />
              <FilterSelect label="Kategori"    value={selCat}      onChange={setSelCat}      options={optCat}      accentKey="green"  theme={theme} />
              <FilterSelect label="Produk"      value={selProduct}  onChange={setSelProduct}  options={optProduct}  accentKey="purple" theme={theme} />
              <FilterSelect label="Kota/Kab."   value={selCity}     onChange={setSelCity}     options={optCity}     accentKey="orange" theme={theme} />
              <FilterSelect label="Customer"    value={selCustomer} onChange={setSelCustomer} options={optCustomer} accentKey="indigo" theme={theme} />
              <FilterSelect label="Kecamatan"   value={selDistrict} onChange={setSelDistrict} options={optDistrict} accentKey="pink"   theme={theme} />
            </div>
            {hasFilter && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${t.border}`, display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: t.textMuted, fontFamily: 'IBM Plex Mono, monospace', marginRight: 3 }}>Aktif:</span>
                {selOutlet   !== 'all' && <FilterChip label={selOutlet}   accentKey="blue"   onRemove={() => setSelOutlet('all')}   theme={theme} />}
                {selCat      !== 'all' && <FilterChip label={selCat}      accentKey="green"  onRemove={() => setSelCat('all')}      theme={theme} />}
                {selProduct  !== 'all' && <FilterChip label={selProduct}  accentKey="purple" onRemove={() => setSelProduct('all')}  theme={theme} />}
                {selCity     !== 'all' && <FilterChip label={selCity}     accentKey="orange" onRemove={() => setSelCity('all')}     theme={theme} />}
                {selCustomer !== 'all' && <FilterChip label={selCustomer} accentKey="indigo" onRemove={() => setSelCustomer('all')} theme={theme} />}
                {selDistrict !== 'all' && <FilterChip label={selDistrict} accentKey="pink"   onRemove={() => setSelDistrict('all')} theme={theme} />}
                <button onClick={resetAll} style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', background: 'none', border: 'none', cursor: 'pointer', color: t.red.text, fontWeight: 600, padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <RefreshCw size={9} /> Reset Semua
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Year panels */}
      {availableYears.length < 2 ? (
        <YearPanel year={yearA!} isA={true} data={dataA} theme={theme} onExpand={() => {}} otherTotal={undefined} />
      ) : isMobile ? (
        <div>
          <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: `1px solid ${t.borderCard}`, marginBottom: 14, background: t.inputBg }}>
            {([
              { tab: 'A' as const, year: yearA!, yc: TK[theme].yearA },
              { tab: 'B' as const, year: yearB!, yc: TK[theme].yearB },
            ]).map(({ tab, year, yc }) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                flex: 1, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: activeTab === tab ? yc.bg : 'transparent', border: 'none',
                borderBottom: activeTab === tab ? `2px solid ${yc.accent}` : '2px solid transparent',
                cursor: 'pointer', transition: 'background 0.2s', fontFamily: 'IBM Plex Mono, monospace',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: yc.accent }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: activeTab === tab ? yc.label : t.textMuted }}>{year}</span>
                <span style={{ fontSize: 10, color: activeTab === tab ? yc.label : t.textMuted, opacity: 0.6 }}>
                  {(tab === 'A' ? dataA : dataB).length.toLocaleString()}r
                </span>
              </button>
            ))}
          </div>
          {activeTab === 'A' && yearA != null && <YearPanel year={yearA} isA={true}  data={dataA} theme={theme} onExpand={() => {}} otherTotal={totalB} />}
          {activeTab === 'B' && yearB != null && <YearPanel year={yearB} isA={false} data={dataB} theme={theme} onExpand={() => {}} otherTotal={totalA} />}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isTablet ? 14 : 20, alignItems: 'start' }}>
          {([
            { year: yearA!, isA: true,  rowData: dataA, yc: TK[theme].yearA, other: totalB },
            { year: yearB!, isA: false, rowData: dataB, yc: TK[theme].yearB, other: totalA },
          ] as const).map(({ year, isA, rowData, yc, other }) => (
            <div key={year}>
              {/* Sticky year banner */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '10px 16px', borderRadius: 10, background: yc.bg, border: `1px solid ${yc.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
                <Calendar size={13} color={yc.label} />
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: yc.label }}>Tahun {year}</span>
                <span style={{ fontSize: 10, color: yc.label, opacity: 0.55, fontFamily: 'IBM Plex Mono, monospace', marginLeft: 'auto' }}>{rowData.length.toLocaleString()} records</span>
              </div>
              <YearPanel year={year} isA={isA} data={rowData} theme={theme} onExpand={() => {}} compact={isTablet} otherTotal={other} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
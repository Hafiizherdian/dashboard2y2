'use client';

import React, { useEffect, useMemo, useState, useReducer, useRef, useCallback } from 'react';
import { WeekComparison, ComparisonYears, ComparisonWeeks, WeekComparisonProductDetail } from '@/types/sales';
import { getProductCategory } from '@/lib/productCategories';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend,
} from 'recharts';
import { ChevronUpIcon, ChevronDownIcon, Maximize2, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

type Theme = 'dark' | 'light';

const TK = {
  dark: {
    pageBg: '#080a0f', cardBg: '#111318', headerBg: '#0c0e14',
    filterBg: 'rgba(255,255,255,0.025)', modalBg: '#0f1117',
    infoBg: 'rgba(37,99,235,0.07)', border: 'rgba(255,255,255,0.06)',
    borderLight: 'rgba(255,255,255,0.05)', infoBorder: 'rgba(59,130,246,0.3)',
    text: 'rgba(255,255,255,0.9)', textSub: 'rgba(255,255,255,0.55)',
    textMuted: 'rgba(255,255,255,0.3)', textFaint: 'rgba(255,255,255,0.18)',
    infoText: 'rgba(147,197,253,0.85)', inputBg: 'rgba(255,255,255,0.03)',
    inputBorder: 'rgba(255,255,255,0.08)', selectBg: '#0c0e14',
    theadBg: '#0c0e14', theadText: 'rgba(255,255,255,0.35)',
    rowAlt: 'rgba(255,255,255,0.015)', rowHover: 'rgba(255,255,255,0.03)',
    gridStroke: 'rgba(255,255,255,0.06)', tooltipBg: '#1a1e2e',
    tooltipBorder: 'rgba(255,255,255,0.12)', btnBg: 'rgba(37,99,235,0.12)',
    btnBorder: 'rgba(59,130,246,0.3)', btnText: '#93c5fd', shadow: 'none',
    sortActive: '#3b82f6', sortInactive: 'rgba(148,163,184,0.4)',
    zoomBg: 'rgba(255,255,255,0.06)', zoomBorder: 'rgba(255,255,255,0.1)',
    zoomText: 'rgba(255,255,255,0.7)', zoomHover: 'rgba(255,255,255,0.12)',
  },
  light: {
    pageBg: '#f0f2f7', cardBg: '#ffffff', headerBg: '#ffffff',
    filterBg: '#f8fafc', modalBg: '#ffffff', infoBg: 'rgba(37,99,235,0.08)',
    border: 'rgba(0,0,0,0.07)', borderLight: 'rgba(0,0,0,0.05)',
    infoBorder: 'rgba(37,99,235,0.25)', text: '#0f172a', textSub: '#475569',
    textMuted: '#94a3b8', textFaint: '#cbd5e1', infoText: '#1d4ed8',
    inputBg: 'rgba(0,0,0,0.03)', inputBorder: 'rgba(0,0,0,0.1)',
    selectBg: '#ffffff', theadBg: '#f8fafc', theadText: '#94a3b8',
    rowAlt: 'rgba(0,0,0,0.018)', rowHover: 'rgba(0,0,0,0.03)',
    gridStroke: 'rgba(0,0,0,0.07)', tooltipBg: '#ffffff',
    tooltipBorder: 'rgba(0,0,0,0.1)', btnBg: 'rgba(37,99,235,0.08)',
    btnBorder: 'rgba(37,99,235,0.25)', btnText: '#1d4ed8',
    shadow: '0 1px 8px rgba(0,0,0,0.07)', sortActive: '#2563eb',
    sortInactive: '#cbd5e1', zoomBg: 'rgba(0,0,0,0.04)',
    zoomBorder: 'rgba(0,0,0,0.1)', zoomText: '#475569',
    zoomHover: 'rgba(0,0,0,0.08)',
  },
} as const;

type UnitKey = 'units_dos' | 'units_bal' | 'units_slop' | 'units_bks';

function resolveUnitValues(
  detail: WeekComparisonProductDetail,
  unit: string,
): { previous: number; current: number } {
  const key = unit as UnitKey;
  const field = detail[key] as { previous: number; current: number } | undefined;
  if (field && typeof field.previous === 'number') return { previous: field.previous, current: field.current };
  const dos = detail.units_dos as { previous: number; current: number } | undefined;
  if (dos && typeof dos.previous === 'number') return { previous: dos.previous, current: dos.current };
  return { previous: 0, current: 0 };
}

// ─── Responsive Hook ──────────────────────────────────────────────────────────
function useBreakpoint() {
  const [width, setWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return {
    isMobile:  width < 640,
    isTablet:  width >= 640 && width < 1024,
    isDesktop: width >= 1024,
    width,
  };
}

// ─── useWindowSize — untuk modal ─────────────────────────────────────────────
function useWindowSize() {
  const [size, setSize] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth  : 1200,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  });
  useEffect(() => {
    const h = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return size;
}

const formatWeekRange = (range?: { start: number; end: number } | null) => {
  if (!range) return 'Week 1-52';
  if (range.start === range.end) return `Week ${range.start}`;
  return `Week ${range.start}-${range.end}`;
};

// ─── Zoom/Pan ─────────────────────────────────────────────────────────────────
interface ZPState { count: number; start: number; total: number; }
function clamp(count: number, start: number, total: number): ZPState {
  const c = Math.max(2, Math.min(total, count));
  const s = Math.max(0, Math.min(total - c, start));
  return { count: c, start: s, total };
}
type ZPAction =
  | { type: 'RESET'; total: number }
  | { type: 'ZOOM'; direction: -1 | 1; pivot: number }
  | { type: 'PAN'; shift: number }
  | { type: 'ZOOM_BTN'; delta: number };

function zpReducer(state: ZPState, action: ZPAction): ZPState {
  switch (action.type) {
    case 'RESET': return { count: action.total, start: 0, total: action.total };
    case 'ZOOM': {
      const step = Math.max(1, Math.round(state.count * 0.12));
      const nextCount = state.count + action.direction * step;
      const pivotDataIndex = state.start + action.pivot * state.count;
      const newStart = pivotDataIndex - action.pivot * nextCount;
      return clamp(nextCount, Math.round(newStart), state.total);
    }
    case 'PAN': return clamp(state.count, state.start + action.shift, state.total);
    case 'ZOOM_BTN': {
      const step = Math.max(1, Math.round(state.count * 0.2));
      const nextCount = state.count + action.delta * step;
      const mid = state.start + state.count / 2;
      return clamp(nextCount, Math.round(mid - nextCount / 2), state.total);
    }
    default: return state;
  }
}

function useChartZoomPan(totalCount: number) {
  const [state, dispatch] = useReducer(zpReducer, { count: totalCount, start: 0, total: totalCount });
  useEffect(() => { dispatch({ type: 'RESET', total: totalCount }); }, [totalCount]);

  const containerRef  = useRef<HTMLDivElement>(null);
  const isDragging    = useRef(false);
  const lastX         = useRef(0);
  const lastPinch     = useRef<number | null>(null);
  const wheelPending  = useRef(false);
  const pendingDir    = useRef<-1 | 1>(1);
  const pendingPivot  = useRef(0.5);

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    pendingDir.current = e.deltaY < 0 ? -1 : 1;
    const el = containerRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      pendingPivot.current = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    }
    if (!wheelPending.current) {
      wheelPending.current = true;
      requestAnimationFrame(() => {
        dispatch({ type: 'ZOOM', direction: pendingDir.current, pivot: pendingPivot.current });
        wheelPending.current = false;
      });
    }
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    isDragging.current = true; lastX.current = e.clientX; e.preventDefault();
  }, []);
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastX.current; lastX.current = e.clientX;
    const el = containerRef.current;
    if (!el || dx === 0) return;
    const shift = -Math.round(dx / (el.getBoundingClientRect().width / state.count));
    if (shift !== 0) dispatch({ type: 'PAN', shift });
  }, [state.count]);
  const onMouseUp    = useCallback(() => { isDragging.current = false; }, []);
  const onMouseLeave = useCallback(() => { isDragging.current = false; }, []);

  const onTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) { isDragging.current = true; lastX.current = e.touches[0].clientX; }
    else if (e.touches.length === 2) {
      isDragging.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinch.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, []);
  const onTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging.current) {
      const dx = e.touches[0].clientX - lastX.current; lastX.current = e.touches[0].clientX;
      const el = containerRef.current;
      if (!el || dx === 0) return;
      const shift = -Math.round(dx / (el.getBoundingClientRect().width / state.count));
      if (shift !== 0) dispatch({ type: 'PAN', shift });
    } else if (e.touches.length === 2 && lastPinch.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dir: -1 | 1 = dist > lastPinch.current ? 1 : -1;
      lastPinch.current = dist;
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const el2 = containerRef.current;
      const pivot = el2 ? Math.max(0, Math.min(1, (midX - el2.getBoundingClientRect().left) / el2.getBoundingClientRect().width)) : 0.5;
      dispatch({ type: 'ZOOM', direction: dir, pivot });
    }
  }, [state.count]);
  const onTouchEnd = useCallback(() => { isDragging.current = false; lastPinch.current = null; }, []);

  return {
    visibleCount: state.count, startIndex: state.start, isZoomed: state.count < totalCount,
    reset:   useCallback(() => dispatch({ type: 'RESET', total: totalCount }), [totalCount]),
    zoomIn:  useCallback(() => dispatch({ type: 'ZOOM_BTN', delta: -1 }), []),
    zoomOut: useCallback(() => dispatch({ type: 'ZOOM_BTN', delta:  1 }), []),
    containerRef,
    handlers: { onWheel, onMouseDown, onMouseMove, onMouseUp, onMouseLeave, onTouchStart, onTouchMove, onTouchEnd },
  };
}

// ─── ChartZoomWrapper ─────────────────────────────────────────────────────────
type ChartEntry = Record<string, unknown>;
function ChartZoomWrapper<T extends ChartEntry>({
  theme, height, data, children,
}: {
  theme: Theme; height: number; data: T[];
  children: (sliced: T[]) => React.ReactNode;
}) {
  const t = TK[theme];
  const { visibleCount, startIndex, isZoomed, reset, zoomIn, zoomOut, containerRef, handlers } = useChartZoomPan(data.length);
  const [dragging, setDragging] = useState(false);
  const slicedData = useMemo(() => data.slice(startIndex, startIndex + visibleCount), [data, startIndex, visibleCount]);

  const ZBtn = ({ icon, action, title: ttl, disabled }: { icon: React.ReactNode; action: () => void; title: string; disabled: boolean }) => (
    <button onClick={action} title={ttl} disabled={disabled} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 28, height: 28, borderRadius: 6,
      border: `1px solid ${disabled ? 'transparent' : t.zoomBorder}`,
      background: disabled ? 'transparent' : t.zoomBg,
      color: disabled ? t.textFaint : t.zoomText,
      cursor: disabled ? 'not-allowed' : 'pointer', flexShrink: 0,
    }}>
      {icon}
    </button>
  );

  return (
    <div style={{ userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono,monospace', color: t.textMuted, marginRight: 4 }}>
          {isZoomed ? `${visibleCount}/${data.length} minggu` : `${data.length} minggu`}
        </span>
        <ZBtn icon={<ZoomOut width={13} height={13} />} action={zoomOut} title="Zoom out" disabled={visibleCount >= data.length} />
        <ZBtn icon={<ZoomIn  width={13} height={13} />} action={zoomIn}  title="Zoom in"  disabled={visibleCount <= 2} />
        <ZBtn icon={<RotateCcw width={13} height={13} />} action={reset} title="Reset"    disabled={!isZoomed} />
        <span style={{ fontSize: 9, fontFamily: 'IBM Plex Mono,monospace', color: t.textFaint }}>
          scroll=zoom · drag=geser
        </span>
      </div>
      {isZoomed && (
        <div style={{ height: 3, borderRadius: 2, background: t.inputBorder, marginBottom: 6, position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', height: '100%', borderRadius: 2, background: t.btnText,
            left: `${(startIndex / data.length) * 100}%`,
            width: `${(visibleCount / data.length) * 100}%`,
            transition: 'left 0.1s, width 0.1s',
          }} />
        </div>
      )}
      <div
        ref={containerRef}
        {...handlers}
        onMouseDown={e => { setDragging(true); handlers.onMouseDown(e); }}
        onMouseUp={() => { setDragging(false); handlers.onMouseUp(); }}
        onMouseLeave={() => { setDragging(false); handlers.onMouseLeave(); }}
        style={{
          width: '100%', height, borderRadius: 8,
          border: `1px solid ${t.border}`, background: t.inputBg,
          cursor: isZoomed ? (dragging ? 'grabbing' : 'grab') : 'default',
          touchAction: 'none', overflow: 'hidden',
        }}
      >
        {children(slicedData)}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SortIcon({ colKey, sortConfig, theme }: { colKey: string; sortConfig: { key: string; direction: 'asc' | 'desc' } | null; theme: Theme }) {
  const t = TK[theme];
  const isActive = sortConfig?.key === colKey;
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', marginLeft: 4 }}>
      <ChevronUpIcon   width={12} height={12} color={isActive && sortConfig?.direction === 'asc'  ? t.sortActive : t.sortInactive} />
      <ChevronDownIcon width={12} height={12} color={isActive && sortConfig?.direction === 'desc' ? t.sortActive : t.sortInactive} style={{ marginTop: -2 }} />
    </span>
  );
}

function GrowthPill({ value }: { value: number | undefined }) {
  const v = value ?? 0;
  const pos = v >= 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      padding: '2px 7px', borderRadius: 5, fontSize: 11, fontWeight: 700,
      fontFamily: 'IBM Plex Mono,monospace',
      background: pos ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.14)',
      color: pos ? '#10b981' : '#ef4444', whiteSpace: 'nowrap',
    }}>
      {pos ? <ChevronUpIcon width={10} height={10} /> : <ChevronDownIcon width={10} height={10} />}
      {pos ? '+' : ''}{v.toFixed(1)}%
    </span>
  );
}

function FilterSelect({ label, accentColor = '#3b82f6', value, onChange, children, theme, fullWidth }: {
  label: string; accentColor?: string; value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode; theme: Theme; fullWidth?: boolean;
}) {
  const t = TK[theme];
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', border: `1px solid ${t.inputBorder}`, borderRadius: 8, overflow: 'hidden', flex: fullWidth ? '1 1 auto' : undefined, minWidth: 0 }}>
      <span style={{ padding: '6px 10px', fontSize: 10, fontFamily: 'IBM Plex Mono,monospace', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, color: accentColor, background: `${accentColor}18`, borderRight: `1px solid ${t.inputBorder}`, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {label}
      </span>
      <select value={value} onChange={onChange} style={{ background: t.inputBg, border: 'none', outline: 'none', padding: '6px 10px', fontSize: 12, fontFamily: 'IBM Plex Mono,monospace', color: t.text, cursor: 'pointer', minWidth: 0, flex: 1, appearance: 'none', width: '100%' }}>
        {children}
      </select>
    </div>
  );
}

// ─── ExpandBtn — selalu tampil, label dinamis ─────────────────────────────────
function ExpandBtn({ onClick, theme, isTable }: { onClick: () => void; theme: Theme; isTable?: boolean }) {
  const t = TK[theme];
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: t.btnBg, border: `1px solid ${t.btnBorder}`, color: t.btnText, cursor: 'pointer', fontSize: 11, fontWeight: 500, fontFamily: 'IBM Plex Mono,monospace', flexShrink: 0 }}>
      <Maximize2 width={12} height={12} />
      {isTable ? 'Perbesar Tabel' : 'Perbesar'}
    </button>
  );
}

// ─── TableBtn — label dinamis ─────────────────────────────────────────────────
function TableBtn({ onClick, theme, active }: { onClick: () => void; theme: Theme; active?: boolean }) {
  const t = TK[theme];
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: active ? `${t.btnText}22` : t.btnBg, border: `1px solid ${active ? t.btnText : t.btnBorder}`, color: t.btnText, cursor: 'pointer', fontSize: 11, fontWeight: 500, fontFamily: 'IBM Plex Mono,monospace', flexShrink: 0, transition: 'all 0.15s' }}>
      {active ? (
        <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <polyline points="1,12 5,7 8,9 11,4 15,2" />
        </svg>
      ) : (
        <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <rect x="1" y="1" width="14" height="14" rx="2" />
          <line x1="1" y1="5.5" x2="15" y2="5.5" />
          <line x1="1" y1="10.5" x2="15" y2="10.5" />
          <line x1="5.5" y1="5.5" x2="5.5" y2="15" />
        </svg>
      )}
      {active ? 'Chart' : 'Tabel'}
    </button>
  );
}

// ─── ChartTableView ───────────────────────────────────────────────────────────
type ChartRowData = { week: string; previousYear: number; currentYear: number; variance: number; variancePercentage: number; };

function ChartTableView({ type, data, previousYearLabel, currentYearLabel, theme, maxHeight = 340 }: {
  type: 'line' | 'bar'; data: ChartRowData[];
  previousYearLabel: string | number; currentYearLabel: string | number;
  theme: Theme; maxHeight?: number;
}) {
  const t = TK[theme];
  const [sort, setSort] = useState<{ key: keyof ChartRowData; dir: 'asc' | 'desc' }>({ key: 'week', dir: 'asc' });

  const sorted = useMemo(() => [...data].sort((a, b) => {
    const av = a[sort.key], bv = b[sort.key];
    let cmp: number;
    if (sort.key === 'week') {
      cmp = parseInt((av as string).replace('W', ''), 10) - parseInt((bv as string).replace('W', ''), 10);
    } else {
      cmp = typeof av === 'string' ? (av as string).localeCompare(bv as string) : (av as number) - (bv as number);
    }
    return sort.dir === 'asc' ? cmp : -cmp;
  }), [data, sort]);

  const cols: { key: keyof ChartRowData; label: string; right: boolean }[] = type === 'line'
    ? [
        { key: 'week',               label: 'Minggu',                  right: false },
        { key: 'previousYear',       label: String(previousYearLabel), right: true  },
        { key: 'currentYear',        label: String(currentYearLabel),  right: true  },
        { key: 'variance',           label: 'Variance',                right: true  },
        { key: 'variancePercentage', label: 'Var %',                   right: true  },
      ]
    : [
        { key: 'week',               label: 'Minggu',  right: false },
        { key: 'variance',           label: 'Selisih', right: true  },
        { key: 'variancePercentage', label: 'Var %',   right: true  },
      ];

  const fmt = (v: number) => v.toLocaleString('id-ID', { maximumFractionDigits: 2 });
  const totals = useMemo(() => {
    if (type !== 'line') return null;
    const p = data.reduce((s, r) => s + r.previousYear, 0);
    const c = data.reduce((s, r) => s + r.currentYear, 0);
    const v = c - p;
    return { p, c, v, pct: p > 0 ? (v / p) * 100 : 0 };
  }, [data, type]);

  const SortBtn = ({ col }: { col: typeof cols[number] }) => (
    <span style={{ display: 'inline-flex', flexDirection: 'column', marginLeft: 3 }}>
      <ChevronUpIcon   width={10} height={10} color={sort.key === col.key && sort.dir === 'asc'  ? t.sortActive : t.sortInactive} />
      <ChevronDownIcon width={10} height={10} color={sort.key === col.key && sort.dir === 'desc' ? t.sortActive : t.sortInactive} style={{ marginTop: -2 }} />
    </span>
  );

  return (
    <div style={{ border: `1px solid ${t.border}`, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto', maxHeight, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 340 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              {cols.map(col => (
                <th key={col.key} onClick={() => setSort(p => ({ key: col.key, dir: p.key === col.key && p.dir === 'asc' ? 'desc' : 'asc' }))}
                  style={{ padding: '8px 14px', textAlign: col.right ? 'right' : 'left', fontSize: 9, fontFamily: 'IBM Plex Mono,monospace', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, color: t.theadText, background: t.theadBg, borderBottom: `1px solid ${t.border}`, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: col.right ? 'flex-end' : 'flex-start', gap: 2, width: '100%' }}>
                    {col.label}<SortBtn col={col} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const pos = row.variancePercentage >= 0;
              return (
                <tr key={row.week} style={{ background: i % 2 === 0 ? 'transparent' : t.rowAlt, transition: 'background 0.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = t.rowHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : t.rowAlt)}>
                  <td style={{ padding: '8px 14px', fontSize: 12, color: t.text, fontWeight: 600, fontFamily: 'IBM Plex Mono,monospace', borderBottom: `1px solid ${t.borderLight}` }}>{row.week}</td>
                  {type === 'line' && <>
                    <td style={{ padding: '8px 14px', fontSize: 12, color: t.textMuted, fontFamily: 'IBM Plex Mono,monospace', textAlign: 'right', borderBottom: `1px solid ${t.borderLight}` }}>{fmt(row.previousYear)}</td>
                    <td style={{ padding: '8px 14px', fontSize: 12, color: t.text, fontWeight: 600, fontFamily: 'IBM Plex Mono,monospace', textAlign: 'right', borderBottom: `1px solid ${t.borderLight}` }}>{fmt(row.currentYear)}</td>
                    <td style={{ padding: '8px 14px', fontSize: 12, fontFamily: 'IBM Plex Mono,monospace', fontWeight: 600, textAlign: 'right', borderBottom: `1px solid ${t.borderLight}`, color: pos ? '#10b981' : '#ef4444' }}>{pos ? '+' : ''}{fmt(row.variance)}</td>
                  </>}
                  {type === 'bar' && <td style={{ padding: '8px 14px', fontSize: 12, fontFamily: 'IBM Plex Mono,monospace', fontWeight: 600, textAlign: 'right', borderBottom: `1px solid ${t.borderLight}`, color: pos ? '#10b981' : '#ef4444' }}>{pos ? '+' : ''}{fmt(row.variance)}</td>}
                  <td style={{ padding: '8px 14px', textAlign: 'right', borderBottom: `1px solid ${t.borderLight}` }}><GrowthPill value={row.variancePercentage} /></td>
                </tr>
              );
            })}
          </tbody>
          {totals && (
            <tfoot>
              <tr style={{ background: t.theadBg, borderTop: `2px solid ${t.border}` }}>
                <td style={{ padding: '8px 14px', fontSize: 11, fontWeight: 700, color: t.text, fontFamily: 'IBM Plex Mono,monospace' }}>Total</td>
                <td style={{ padding: '8px 14px', fontSize: 11, fontWeight: 700, color: t.textMuted, fontFamily: 'IBM Plex Mono,monospace', textAlign: 'right' }}>{fmt(totals.p)}</td>
                <td style={{ padding: '8px 14px', fontSize: 11, fontWeight: 700, color: t.text, fontFamily: 'IBM Plex Mono,monospace', textAlign: 'right' }}>{fmt(totals.c)}</td>
                <td style={{ padding: '8px 14px', fontSize: 11, fontWeight: 700, fontFamily: 'IBM Plex Mono,monospace', textAlign: 'right', color: totals.v >= 0 ? '#10b981' : '#ef4444' }}>{totals.v >= 0 ? '+' : ''}{fmt(totals.v)}</td>
                <td style={{ padding: '8px 14px', textAlign: 'right' }}><GrowthPill value={totals.pct} /></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function ChartModal({ onClose, title, theme, children }: { onClose: () => void; title: string; theme: Theme; children: React.ReactNode }) {
  const t = TK[theme];
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', fn); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: t.modalBg, border: `1px solid ${t.border}`, borderRadius: 14, width: '100%', maxWidth: 1080, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${t.border}`, flexShrink: 0, background: t.headerBg }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: t.text, fontFamily: 'IBM Plex Sans,sans-serif' }}>{title}</span>
          <button onClick={onClose} style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, cursor: 'pointer', color: t.textMuted, padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
            <X width={18} height={18} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: t.cardBg }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Tipe expand — chart atau tabel ──────────────────────────────────────────
type ExpandTarget = { chart: 'line' | 'bar'; mode: 'chart' | 'table' } | null;

interface WeekComparisonProps {
  data: WeekComparison[];
  comparisonYears?: ComparisonYears;
  comparisonWeeks?: ComparisonWeeks;
  theme?: Theme;
}
interface ResolvedProductRow {
  product: string; previousYear: number; currentYear: number; variance: number; variancePercentage: number;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function WeekComparisonComponent({ data, comparisonYears, comparisonWeeks, theme: themeProp }: WeekComparisonProps) {
  const theme: Theme = themeProp ?? 'light';
  const t = TK[theme];
  const { isMobile, isTablet } = useBreakpoint();
  const winSize = useWindowSize(); // live window size untuk modal

  const previousYearLabel      = comparisonYears?.previousYear ?? 'Tahun 1';
  const currentYearLabel       = comparisonYears?.currentYear  ?? 'Tahun 2';
  const previousWeekRangeLabel = formatWeekRange(comparisonWeeks?.previousYear ?? undefined);
  const currentWeekRangeLabel  = formatWeekRange(comparisonWeeks?.currentYear  ?? undefined);
  const weekOptions = Array.from(new Set(data.map(d => d.week))).sort((a, b) => a - b);

  const [selectedWeek,     setSelectedWeek]     = useState<number | null>(null);
  const [selectedUnit,     setSelectedUnit]     = useState('units_dos');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandTarget,     setExpandTarget]     = useState<ExpandTarget>(null);
  const [tableView,        setTableView]        = useState<'line' | 'bar' | null>(null);
  const [sortConfig,       setSortConfig]       = useState<{ key: 'product' | 'previousYear' | 'currentYear' | 'variance' | 'variancePercentage'; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => { setSelectedWeek(null); }, [data.length]);

  const unitOptions = [
    { value: 'units_dos',  label: 'Jual (Dos Net)' },
    { value: 'units_bal',  label: 'Jual (Bal Net)' },
    { value: 'units_slop', label: 'Jual (Slop Net)' },
    { value: 'units_bks',  label: 'Jual (Bks Net)' },
  ];
  const getUnitLabel = (u: string) => unitOptions.find(o => o.value === u)?.label ?? u;
  const formatUnitValue = (v: number) => v.toLocaleString('id-ID', { maximumFractionDigits: 2 });

  const allProductsInData = useMemo((): ResolvedProductRow[] => {
    const m = new Map<string, Record<UnitKey, { previous: number; current: number }>>();
    data.forEach(wd => {
      wd.details?.forEach(d => {
        if (!m.has(d.product)) m.set(d.product, { units_dos: { previous: 0, current: 0 }, units_bal: { previous: 0, current: 0 }, units_slop: { previous: 0, current: 0 }, units_bks: { previous: 0, current: 0 } });
        const acc = m.get(d.product)!;
        (['units_dos', 'units_bal', 'units_slop', 'units_bks'] as UnitKey[]).forEach(k => {
          const v = resolveUnitValues(d, k);
          acc[k].previous += v.previous; acc[k].current += v.current;
        });
      });
    });
    return Array.from(m.entries()).map(([product, acc]) => {
      const u = acc[selectedUnit as UnitKey] ?? acc.units_dos;
      const prev = Math.round(u.previous * 100) / 100;
      const curr = Math.round(u.current  * 100) / 100;
      const vari = Math.round((curr - prev) * 100) / 100;
      return { product, previousYear: prev, currentYear: curr, variance: vari, variancePercentage: prev > 0 ? Math.round(((curr - prev) / prev) * 1000) / 10 : 0 };
    }).sort((a, b) => b.currentYear - a.currentYear);
  }, [data, selectedUnit]);

  const availableCategories = useMemo(() => {
    const s = new Set<string>();
    allProductsInData.forEach(p => s.add(getProductCategory(p.product)));
    return Array.from(s).sort();
  }, [allProductsInData]);

  const productDetails = useMemo((): ResolvedProductRow[] => {
    if (selectedWeek === null) return allProductsInData;
    const wd = data.find(d => d.week === selectedWeek);
    if (!wd?.details) return [];
    return wd.details.map(d => {
      const { previous: p, current: c } = resolveUnitValues(d, selectedUnit);
      const prev = Math.round(p * 100) / 100, curr = Math.round(c * 100) / 100;
      const vari = Math.round((curr - prev) * 100) / 100;
      return { product: d.product, previousYear: prev, currentYear: curr, variance: vari, variancePercentage: prev > 0 ? Math.round(((curr - prev) / prev) * 1000) / 10 : 0 };
    });
  }, [data, selectedWeek, selectedUnit, allProductsInData]);

  const sortedProductDetails = useMemo(() => {
    let rows = selectedCategory !== 'all' ? productDetails.filter(d => getProductCategory(d.product) === selectedCategory) : productDetails;
    if (!sortConfig) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortConfig.key], bv = b[sortConfig.key];
      const cmp = typeof av === 'string' ? (av as string).localeCompare(bv as string) : (av as number) - (bv as number);
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
  }, [productDetails, sortConfig, selectedCategory]);

  const chartData = useMemo(() => {
    const rows = selectedWeek !== null
      ? data.filter(d => d.week === selectedWeek)
      : [...data].sort((a, b) => a.week - b.week);
    return rows.map(item => {
      let prevVal = 0, currVal = 0;
      if (item.details?.length) {
        item.details.forEach(d => {
          if (selectedCategory !== 'all' && getProductCategory(d.product) !== selectedCategory) return;
          const { previous, current } = resolveUnitValues(d, selectedUnit);
          prevVal += previous; currVal += current;
        });
      } else {
        const { previous, current } = resolveUnitValues({ units_dos: { previous: item.previousYear, current: item.currentYear } } as any, selectedUnit);
        prevVal = previous; currVal = current;
      }
      const variance = currVal - prevVal;
      return { week: `W${item.week}`, previousYear: prevVal, currentYear: currVal, variance, variancePercentage: prevVal > 0 ? (variance / prevVal) * 100 : 0 };
    });
  }, [data, selectedUnit, selectedCategory, selectedWeek]);

  // Tinggi chart responsif
  const inlineChartH = isMobile ? 190 : isTablet ? 230 : 270;
  // Tinggi modal responsif — pakai live window size
  const modalChartH  = Math.max(280, winSize.h * 0.52);
  const modalTableH  = Math.max(320, winSize.h * 0.62);

  const axisTickStyle = { fill: t.textMuted, fontSize: isMobile ? 9 : 11, fontFamily: 'IBM Plex Mono,monospace' };
  const yTickFmt = (v: number) => `${(v / 1000).toFixed(0)}K`;
  const tooltipStyle = { background: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, borderRadius: 8, fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: t.text };

  type CD = typeof chartData;
  const renderLineChart = (h: number, d: CD = chartData) => (
    <ResponsiveContainer width="100%" height={h}>
      <LineChart data={d} margin={isMobile ? { left: -10, right: 4, top: 4, bottom: 0 } : { left: 0, right: 8, top: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} />
        <XAxis dataKey="week" tick={axisTickStyle} axisLine={false} tickLine={false} interval={isMobile ? 'preserveStartEnd' : 0} />
        <YAxis tickFormatter={yTickFmt} tick={axisTickStyle} axisLine={false} tickLine={false} width={isMobile ? 34 : 48} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number | undefined) => [formatUnitValue(v ?? 0), '']} labelFormatter={l => `${l}`} />
        <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'IBM Plex Mono,monospace', color: t.textSub }} />
        <Line type="monotone" dataKey="previousYear" stroke="#64748b" strokeWidth={isMobile ? 1.5 : 2} dot={false} name={String(previousYearLabel)} />
        <Line type="monotone" dataKey="currentYear"  stroke="#3b82f6" strokeWidth={isMobile ? 2 : 2.5} dot={false} name={String(currentYearLabel)} activeDot={{ r: 4, fill: '#3b82f6' }} />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderBarChart = (h: number, d: CD = chartData) => (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={d} margin={isMobile ? { left: -10, right: 4, top: 4, bottom: 0 } : { left: 0, right: 8, top: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} />
        <XAxis dataKey="week" tick={axisTickStyle} axisLine={false} tickLine={false} interval={isMobile ? 'preserveStartEnd' : 0} />
        <YAxis tickFormatter={v => `${v.toFixed(0)}%`} tick={axisTickStyle} axisLine={false} tickLine={false} width={isMobile ? 34 : 48} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number | undefined) => [`${(v ?? 0).toFixed(1)}%`, 'Variance %']} labelFormatter={l => `${l}`} />
        <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'IBM Plex Mono,monospace', color: t.textSub }} />
        <Bar dataKey="variancePercentage" name="Variance %" radius={[3, 3, 0, 0]}>
          {d.map((entry, i) => <Cell key={`cell-${i}`} fill={entry.variancePercentage < 0 ? '#ef4444' : '#10b981'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  type ColKey = 'product' | 'previousYear' | 'currentYear' | 'variance' | 'variancePercentage';
  const allCols: { key: ColKey; label: string; right?: boolean; mobileHide?: boolean }[] = [
    { key: 'product',            label: 'Produk',                  right: false },
    { key: 'previousYear',       label: String(previousYearLabel), right: true, mobileHide: true },
    { key: 'currentYear',        label: String(currentYearLabel),  right: true },
    { key: 'variance',           label: 'Variance',                right: true, mobileHide: true },
    { key: 'variancePercentage', label: 'Var %',                   right: true },
  ];
  const tableCols = isMobile ? allCols.filter(c => !c.mobileHide) : allCols;

  const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    background: t.cardBg, border: `1px solid ${t.border}`,
    borderRadius: isMobile ? 10 : 12, padding: isMobile ? 14 : 20,
    boxShadow: t.shadow, ...extra,
  });

  // Modal title helper
  const modalTitle = expandTarget
    ? `${expandTarget.chart === 'line' ? 'Tren Penjualan' : 'Varians Mingguan'} — ${expandTarget.mode === 'table' ? 'Tabel Data' : 'Diperbesar'}`
    : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 20, fontFamily: 'IBM Plex Sans,sans-serif' }}>

      {/* Info banner */}
      <div style={{ padding: isMobile ? '8px 10px' : '10px 14px', background: t.infoBg, border: `1px solid ${t.infoBorder}`, borderRadius: isMobile ? 8 : 10 }}>
        <p style={{ margin: 0, fontSize: isMobile ? 10 : 12, color: t.infoText, fontFamily: 'IBM Plex Mono,monospace', lineHeight: 1.6 }}>
          {isMobile
            ? <><strong>{String(previousYearLabel)}</strong> vs <strong>{String(currentYearLabel)}</strong><br />{previousWeekRangeLabel} — {data.length} minggu</>
            : <><strong>Periode:</strong> {previousWeekRangeLabel} vs {currentWeekRangeLabel}&nbsp;|&nbsp;<strong>Tahun:</strong> {String(previousYearLabel)} vs {String(currentYearLabel)}&nbsp;|&nbsp;<strong>Total Minggu:</strong> {data.length}</>
          }
        </p>
      </div>

      {/* Filter */}
      <div style={card()}>
        <span style={{ fontSize: isMobile ? 10 : 11, fontWeight: 700, color: t.textMuted, fontFamily: 'IBM Plex Mono,monospace', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: isMobile ? 8 : 10 }}>
          Filter Data
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, auto)', gap: 8, alignItems: 'center', justifyContent: isMobile ? 'stretch' : 'flex-start' }}>
          <FilterSelect label="Unit" accentColor="#10b981" value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)} theme={theme} fullWidth={isMobile}>
            {unitOptions.map(o => <option key={o.value} value={o.value} style={{ background: t.selectBg }}>{o.label}</option>)}
          </FilterSelect>
          <FilterSelect label="Kategori" accentColor="#8b5cf6" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} theme={theme} fullWidth={isMobile}>
            <option value="all" style={{ background: t.selectBg }}>Semua</option>
            {availableCategories.map(c => <option key={c} value={c} style={{ background: t.selectBg }}>{c}</option>)}
          </FilterSelect>
          <div style={{ gridColumn: isMobile ? '1 / -1' : undefined }}>
            <FilterSelect label="Minggu" accentColor="#3b82f6" value={selectedWeek ?? 'all'} onChange={e => setSelectedWeek(e.target.value === 'all' ? null : Number(e.target.value))} theme={theme} fullWidth={isMobile}>
              <option value="all" style={{ background: t.selectBg }}>Semua Minggu</option>
              {weekOptions.map(w => <option key={w} value={w} style={{ background: t.selectBg }}>Week {w}</option>)}
            </FilterSelect>
          </div>
        </div>
      </div>

      {/* Charts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 14 }}>

        {/* Tren Penjualan */}
        {(['line', 'bar'] as const).map(chartType => {
          const isLine  = chartType === 'line';
          const inTable = tableView === chartType;
          return (
            <div key={chartType} style={card({ padding: isMobile ? '14px 12px' : '18px 16px' })}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: t.text, fontFamily: 'IBM Plex Sans,sans-serif' }}>
                  {isLine ? 'Tren Penjualan' : 'Varian Mingguan'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {/* Legend inline (tampil saat mode chart) */}
                  {!inTable && !isMobile && isLine && (
                    <div style={{ display: 'flex', gap: 10, fontSize: 11, fontFamily: 'IBM Plex Mono,monospace' }}>
                      {[{ color: '#64748b', label: String(previousYearLabel) }, { color: '#3b82f6', label: String(currentYearLabel) }].map(item => (
                        <span key={item.label} style={{ color: item.color, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ width: 14, height: 2, borderRadius: 1, background: item.color, display: 'inline-block' }} />{item.label}
                        </span>
                      ))}
                    </div>
                  )}
                  {!inTable && !isMobile && !isLine && (
                    <div style={{ display: 'flex', gap: 10, fontSize: 11, fontFamily: 'IBM Plex Mono,monospace' }}>
                      {[{ color: '#10b981', label: 'Positif (+)' }, { color: '#ef4444', label: 'Negatif (-)' }].map(item => (
                        <span key={item.label} style={{ color: item.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, display: 'inline-block' }} />{item.label}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Toggle tabel/chart */}
                  <TableBtn onClick={() => setTableView(v => v === chartType ? null : chartType)} theme={theme} active={inTable} />
                  {/* Expand — SELALU tampil, label berubah sesuai mode */}
                  <ExpandBtn
                    onClick={() => setExpandTarget({ chart: chartType, mode: inTable ? 'table' : 'chart' })}
                    theme={theme}
                    isTable={inTable}
                  />
                </div>
              </div>

              {/* Konten: chart atau tabel */}
              {inTable ? (
                <ChartTableView
                  type={chartType}
                  data={chartData}
                  previousYearLabel={previousYearLabel}
                  currentYearLabel={currentYearLabel}
                  theme={theme}
                  maxHeight={isMobile ? 260 : 320}
                />
              ) : (
                <div style={{ background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: isMobile ? '6px 2px 2px' : '10px 6px 6px' }}>
                  {isLine ? renderLineChart(inlineChartH) : renderBarChart(inlineChartH)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detail product table */}
      <div style={card()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: t.text, fontFamily: 'IBM Plex Sans,sans-serif' }}>Perbandingan Detail</span>
          <span style={{ fontSize: 10, color: t.textMuted, fontFamily: 'IBM Plex Mono,monospace' }}>
            {sortedProductDetails.length > 0
              ? (selectedWeek === null ? `${sortedProductDetails.length} produk` : `${sortedProductDetails.length} · W${selectedWeek}`)
              : 'Kosong'}
          </span>
        </div>
        <div style={{ border: `1px solid ${t.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 260 : 560 }}>
              <thead>
                <tr>
                  {tableCols.map(col => (
                    <th key={col.key} onClick={() => setSortConfig(p => p?.key === col.key ? { key: col.key, direction: p.direction === 'asc' ? 'desc' : 'asc' } : { key: col.key, direction: 'asc' })}
                      style={{ padding: isMobile ? '8px 10px' : '10px 16px', textAlign: col.right ? 'right' : 'left', fontSize: isMobile ? 9 : 10, fontFamily: 'IBM Plex Mono,monospace', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, color: t.theadText, background: t.theadBg, borderBottom: `1px solid ${t.border}`, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: col.right ? 'flex-end' : 'flex-start', gap: 2, width: '100%' }}>
                        {col.label}<SortIcon colKey={col.key} sortConfig={sortConfig} theme={theme} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedProductDetails.length > 0 ? sortedProductDetails.map((detail, i) => {
                  const pos = detail.variance >= 0;
                  return (
                    <tr key={detail.product} style={{ background: i % 2 === 0 ? 'transparent' : t.rowAlt, transition: 'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = t.rowHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : t.rowAlt)}>
                      <td style={{ padding: isMobile ? '8px 10px' : '10px 16px', fontSize: isMobile ? 11 : 12, color: t.text, fontWeight: 500, fontFamily: 'IBM Plex Sans,sans-serif', borderBottom: `1px solid ${t.borderLight}`, maxWidth: isMobile ? 110 : 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail.product}</td>
                      {!isMobile && <td style={{ padding: '10px 16px', fontSize: 12, color: t.textMuted, fontFamily: 'IBM Plex Mono,monospace', textAlign: 'right', borderBottom: `1px solid ${t.borderLight}`, whiteSpace: 'nowrap' }}>{formatUnitValue(detail.previousYear)}</td>}
                      <td style={{ padding: isMobile ? '8px 10px' : '10px 16px', fontSize: isMobile ? 11 : 12, color: t.text, fontFamily: 'IBM Plex Mono,monospace', fontWeight: 600, textAlign: 'right', borderBottom: `1px solid ${t.borderLight}`, whiteSpace: 'nowrap' }}>{formatUnitValue(detail.currentYear)}</td>
                      {!isMobile && <td style={{ padding: '10px 16px', fontSize: 12, fontFamily: 'IBM Plex Mono,monospace', fontWeight: 600, textAlign: 'right', borderBottom: `1px solid ${t.borderLight}`, whiteSpace: 'nowrap', color: pos ? '#10b981' : '#ef4444' }}>{pos ? '+' : ''}{formatUnitValue(detail.variance)}</td>}
                      <td style={{ padding: isMobile ? '8px 10px' : '10px 16px', textAlign: 'right', borderBottom: `1px solid ${t.borderLight}`, whiteSpace: 'nowrap' }}><GrowthPill value={detail.variancePercentage} /></td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={tableCols.length} style={{ padding: '24px 16px', textAlign: 'center', fontSize: 12, color: t.textMuted, fontFamily: 'IBM Plex Mono,monospace' }}>
                      {selectedWeek !== null ? `Tidak ada data untuk ${getUnitLabel(selectedUnit)} di Week ${selectedWeek}.` : 'Tidak ada data produk.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {isMobile && sortedProductDetails.length > 0 && (
          <p style={{ margin: '8px 0 0', fontSize: 10, color: t.textFaint, fontFamily: 'IBM Plex Mono,monospace' }}>
            * Kolom {String(previousYearLabel)} &amp; Variance tersembunyi di mobile.
          </p>
        )}
        <p style={{ margin: '8px 0 0', fontSize: isMobile ? 10 : 11, color: t.textMuted, fontFamily: 'IBM Plex Mono,monospace' }}>
          {selectedWeek === null ? `${sortedProductDetails.length} produk · ${getUnitLabel(selectedUnit)} · semua minggu` : `${sortedProductDetails.length} produk · ${getUnitLabel(selectedUnit)} · Week ${selectedWeek}`}
        </p>
      </div>

      {/* Modal expand — chart atau tabel */}
      {expandTarget && (
        <ChartModal onClose={() => setExpandTarget(null)} title={modalTitle} theme={theme}>
          {expandTarget.mode === 'table' ? (
            /* Mode tabel — tampilkan tabel full height */
            <ChartTableView
              type={expandTarget.chart}
              data={chartData}
              previousYearLabel={previousYearLabel}
              currentYearLabel={currentYearLabel}
              theme={theme}
              maxHeight={modalTableH}
            />
          ) : (
            /* Mode chart — tampilkan chart dengan zoom/pan */
            <>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                {expandTarget.chart === 'line'
                  ? [{ color: '#64748b', label: String(previousYearLabel) }, { color: '#3b82f6', label: String(currentYearLabel) }].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: t.textSub, fontFamily: 'IBM Plex Mono,monospace' }}>
                      <span style={{ width: 24, height: 3, borderRadius: 2, background: item.color, display: 'inline-block' }} />{item.label}
                    </div>
                  ))
                  : [{ color: '#10b981', label: 'Positif (+)' }, { color: '#ef4444', label: 'Negatif (-)' }].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: t.textSub, fontFamily: 'IBM Plex Mono,monospace' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, display: 'inline-block' }} />{item.label}
                    </div>
                  ))
                }
              </div>
              <ChartZoomWrapper theme={theme} height={modalChartH} data={chartData}>
                {sliced => expandTarget.chart === 'line' ? renderLineChart(modalChartH, sliced) : renderBarChart(modalChartH, sliced)}
              </ChartZoomWrapper>
            </>
          )}
        </ChartModal>
      )}
    </div>
  );
}
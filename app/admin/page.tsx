'use client';

import React, {
  useState, useEffect, useCallback,
  createContext, useContext, useRef,
  useMemo,
} from 'react';
import {
  Upload, FileSpreadsheet, CheckCircle, AlertCircle,
  Trash2, Eye, Database, Users, Settings, MapPin,
  Sun, Moon, X, Search, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, AlertTriangle, LogOut,
  ShieldAlert, ShieldCheck, Shield, Menu,
  TrendingUp, Activity, Layers,
  ArrowUpRight, ArrowDownRight, Lock, KeyRound,
  BarChart3, Home,
} from 'lucide-react';
import { UploadedFile, DatabaseStats } from '@/types/database';
import AreaManagement from '@/components/AreaManagement';
import { AreaConfig } from '@/lib/areaConfig';
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext';
import UserManagement from '@/components/UserManagement';
import { ROLE_LABELS, UserRole } from '@/lib/auth/types';

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN GUARD
// ─────────────────────────────────────────────────────────────────────────────

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, can } = useAuth();
  if (!user) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080b12', color: '#fff', flexDirection: 'column', gap: 16 }}>
      <ShieldAlert size={48} color="#ef4444" />
      <span style={{ fontSize: 16, fontWeight: 600 }}>Anda belum login</span>
      <span style={{ fontSize: 14, opacity: 0.7 }}>Silakan login terlebih dahulu</span>
    </div>
  );
  if (!can('access_admin_panel')) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080b12', color: '#fff', flexDirection: 'column', gap: 16 }}>
      <ShieldAlert size={48} color="#ef4444" />
      <span style={{ fontSize: 16, fontWeight: 600 }}>Akses Ditolak</span>
      <span style={{ fontSize: 14, opacity: 0.7, textAlign: 'center', maxWidth: 400 }}>Anda tidak memiliki akses ke panel admin.</span>
    </div>
  );
  return <>{children}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const FONT_SANS = '"IBM Plex Sans", sans-serif';
const FONT_MONO = '"IBM Plex Mono", monospace';
const TOAST_DURATION_MS = 4000;
const PAGE_SIZE_OPTIONS = [10, 25, 50];
const SIDEBAR_W = 252;
const SIDEBAR_W_COLLAPSED = 64;
const BP_MD = 768;
const BP_LG = 1024;

const REQUIRED_COLUMNS = [
  'Minggu', 'Tanggal', 'Produk', 'Kategori', 'No.Customer', 'Customer',
  'Tipe Customer', 'Salesman', 'Desa', 'Kecamatan', 'Kota',
  'jual (Bks Net)', 'Jual (Slop Net)', 'Jual (Bal Net)', 'Jual (Dos Net)', 'Omzet (Nett)',
];

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Theme     = 'dark' | 'light';
type ToastType = 'success' | 'error' | 'warning' | 'info';
type SortKey   = 'original_name' | 'created_at' | 'record_count' | 'total_omzet' | 'status';
type SortDir   = 'asc' | 'desc';
interface Toast { id: string; type: ToastType; title: string; message?: string }

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSIVE HOOK
// ─────────────────────────────────────────────────────────────────────────────

function useWindowWidth() {
  const [width, setWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  return width;
}

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────

const tk = {
  dark: {
    pagebg: '#070a10', headerbg: '#0b0e1a', cardbg: '#0e1120',
    sidebarbg: '#090c16', sidebarBorder: 'rgba(255,255,255,0.05)',
    sidebarActive: 'rgba(99,102,241,0.15)', sidebarActiveBorder: '#6366f1',
    sidebarHover: 'rgba(255,255,255,0.04)', sidebarText: 'rgba(255,255,255,0.45)',
    sidebarTextActive: '#fff', sidebarSection: 'rgba(255,255,255,0.2)',
    inputbg: 'rgba(255,255,255,0.04)', dropzonebg: '#0c0e18',
    dropzoneActive: 'rgba(99,102,241,0.08)',
    border: 'rgba(255,255,255,0.06)', borderCard: 'rgba(255,255,255,0.08)',
    borderInput: 'rgba(255,255,255,0.1)', borderActive: 'rgba(99,102,241,0.6)',
    text: 'rgba(255,255,255,0.92)', textSub: 'rgba(255,255,255,0.58)',
    textMuted: 'rgba(255,255,255,0.32)', textFaint: 'rgba(255,255,255,0.15)',
    tableHead: 'rgba(255,255,255,0.02)', tableAlt: 'rgba(255,255,255,0.015)',
    blue:   { bg: 'rgba(99,102,241,0.12)',  text: '#a5b4fc', border: 'rgba(99,102,241,0.3)'  },
    green:  { bg: 'rgba(16,185,129,0.1)',   text: '#6ee7b7', border: 'rgba(16,185,129,0.25)' },
    red:    { bg: 'rgba(239,68,68,0.1)',    text: '#fca5a5', border: 'rgba(239,68,68,0.22)'  },
    yellow: { bg: 'rgba(245,158,11,0.1)',   text: '#fcd34d', border: 'rgba(245,158,11,0.28)' },
    gray:   { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.42)', border: 'rgba(255,255,255,0.08)' },
    btnDisabled: { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.2)' },
    shadow: '0 1px 3px rgba(0,0,0,0.5)', shadowCard: '0 4px 20px rgba(0,0,0,0.4)',
    shadowElevated: '0 8px 32px rgba(0,0,0,0.5)', modalOverlay: 'rgba(0,0,0,0.75)',
    stat1: { accent: '#6366f1', iconBg: 'rgba(99,102,241,0.15)',  glow: 'rgba(99,102,241,0.2)'  },
    stat2: { accent: '#10b981', iconBg: 'rgba(16,185,129,0.15)',  glow: 'rgba(16,185,129,0.2)'  },
    stat3: { accent: '#a855f7', iconBg: 'rgba(168,85,247,0.15)', glow: 'rgba(168,85,247,0.2)'  },
    stat4: { accent: '#f59e0b', iconBg: 'rgba(245,158,11,0.15)', glow: 'rgba(245,158,11,0.2)'  },
  },
  light: {
    pagebg: '#f0f3f9', headerbg: '#ffffff', cardbg: '#ffffff',
    sidebarbg: '#14172a', sidebarBorder: 'rgba(255,255,255,0.06)',
    sidebarActive: 'rgba(99,102,241,0.18)', sidebarActiveBorder: '#818cf8',
    sidebarHover: 'rgba(255,255,255,0.06)', sidebarText: 'rgba(255,255,255,0.5)',
    sidebarTextActive: '#fff', sidebarSection: 'rgba(255,255,255,0.22)',
    inputbg: '#f8fafc', dropzonebg: '#f8fafc',
    dropzoneActive: 'rgba(99,102,241,0.05)',
    border: 'rgba(0,0,0,0.07)', borderCard: 'rgba(0,0,0,0.09)',
    borderInput: 'rgba(0,0,0,0.12)', borderActive: '#6366f1',
    text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8', textFaint: '#cbd5e1',
    tableHead: '#f8fafc', tableAlt: 'rgba(0,0,0,0.012)',
    blue:   { bg: 'rgba(99,102,241,0.08)', text: '#4f46e5', border: 'rgba(99,102,241,0.2)' },
    green:  { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
    red:    { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    yellow: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
    gray:   { bg: '#f1f5f9', text: '#64748b', border: 'rgba(0,0,0,0.09)' },
    btnDisabled: { bg: '#e2e8f0', text: '#94a3b8' },
    shadow: '0 1px 4px rgba(0,0,0,0.06)', shadowCard: '0 2px 10px rgba(0,0,0,0.07)',
    shadowElevated: '0 8px 32px rgba(0,0,0,0.12)', modalOverlay: 'rgba(15,23,42,0.45)',
    stat1: { accent: '#6366f1', iconBg: '#e0e7ff', glow: 'rgba(99,102,241,0.12)' },
    stat2: { accent: '#10b981', iconBg: '#d1fae5', glow: 'rgba(16,185,129,0.12)' },
    stat3: { accent: '#a855f7', iconBg: '#ede9fe', glow: 'rgba(168,85,247,0.12)' },
    stat4: { accent: '#f59e0b', iconBg: '#fef3c7', glow: 'rgba(245,158,11,0.12)' },
  },
} as const;

type Tokens = typeof tk['light'];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const badge = (bg: string, text: string, border: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
  fontFamily: FONT_MONO, background: bg, color: text, border: `1px solid ${border}`,
});
const iconBtn = (bg: string, border: string, size = 32): React.CSSProperties => ({
  width: size, height: size, borderRadius: 8, background: bg,
  border: `1px solid ${border}`, cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0,
});
const card = (t: Tokens, extra?: React.CSSProperties): React.CSSProperties => ({
  background: t.cardbg, border: `1px solid ${t.borderCard}`,
  borderRadius: 14, overflow: 'hidden', boxShadow: t.shadowCard, ...extra,
});
const overlay = (t: Tokens): React.CSSProperties => ({
  position: 'fixed', inset: 0, zIndex: 1000, background: t.modalOverlay,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 20, animation: 'fadeIn 0.15s ease', backdropFilter: 'blur(4px)',
});

// ─────────────────────────────────────────────────────────────────────────────
// SPINNER
// ─────────────────────────────────────────────────────────────────────────────

function Spinner({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg style={{ animation: 'spin 0.8s linear infinite', width: size, height: size }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" opacity="0.2" />
      <path d="M4 12a8 8 0 018-8" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// THEME CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

const ThemeCtx = createContext<{ theme: Theme; setTheme: (t: Theme) => void; t: Tokens }>({ theme: 'light', setTheme: () => {}, t: tk.light });
const useTheme = () => useContext(ThemeCtx);

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, set] = useState<Theme>('light');
  useEffect(() => { try { const s = localStorage.getItem('admin-theme') as Theme | null; if (s) set(s); } catch {} }, []);
  const setTheme = useCallback((v: Theme) => { set(v); try { localStorage.setItem('admin-theme', v); } catch {} }, []);
  return <ThemeCtx.Provider value={{ theme, setTheme, t: tk[theme] as Tokens }}>{children}</ThemeCtx.Provider>;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOAST CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

const ToastCtx = createContext<{ addToast: (type: ToastType, title: string, msg?: string) => void }>({ addToast: () => {} });
const useToast = () => useContext(ToastCtx);

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { t } = useTheme();
  const rm = useCallback((id: string) => setToasts(p => p.filter(i => i.id !== id)), []);
  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, type, title, message }]);
    setTimeout(() => rm(id), TOAST_DURATION_MS);
  }, [rm]);

  const COLOR: Record<ToastType, keyof typeof t> = { success: 'green', error: 'red', warning: 'yellow', info: 'blue' };
  const ICON: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={13} />, error: <AlertCircle size={13} />,
    warning: <AlertTriangle size={13} />, info: <Database size={13} />,
  };
  return (
    <ToastCtx.Provider value={{ addToast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 20, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none', maxWidth: 'calc(100vw - 32px)' }}>
        {toasts.map(toast => {
          const c = t[COLOR[toast.type]] as { bg: string; text: string; border: string };
          return (
            <div key={toast.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 12, background: t.cardbg, border: `1px solid ${c.border}`, boxShadow: t.shadowElevated, minWidth: 260, maxWidth: 340, pointerEvents: 'all', animation: 'toastIn 0.25s ease' }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.text, flexShrink: 0 }}>{ICON[toast.type]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{toast.title}</div>
                {toast.message && <div style={{ fontSize: 12, color: t.textSub, marginTop: 2, lineHeight: 1.5 }}>{toast.message}</div>}
              </div>
              <button onClick={() => rm(toast.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: 2 }}><X size={11} /></button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM MODAL
// ─────────────────────────────────────────────────────────────────────────────

function ConfirmModal({ open, title, message, confirmLabel = 'Konfirmasi', danger = false, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  const { t } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); if (e.key === 'Enter') onConfirm(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [open, onCancel, onConfirm]);
  if (!open) return null;
  const ac = danger ? t.red : t.yellow;
  return (
    <div ref={ref} onClick={e => { if (e.target === ref.current) onCancel(); }} style={overlay(t)}>
      <div style={{ background: t.cardbg, border: `1px solid ${t.borderCard}`, borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, boxShadow: t.shadowElevated, animation: 'slideUp 0.2s ease' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: ac.bg, border: `1px solid ${ac.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={18} color={ac.text} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 5 }}>{title}</div>
            <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.65 }}>{message}</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={{ padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: t.gray.bg, color: t.gray.text, border: `1px solid ${t.gray.border}`, cursor: 'pointer' }}>Batal</button>
          <button onClick={onConfirm} style={{ padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: danger ? '#dc2626' : '#6366f1', color: '#fff', border: 'none', cursor: 'pointer' }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLE CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_CFG: Record<UserRole, { Icon: React.ComponentType<any>; color: string; bg: string; border: string }> = {
  root:  { Icon: ShieldAlert, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  border: 'rgba(167,139,250,0.25)' },
  admin: { Icon: ShieldCheck, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.25)'  },
  user:  { Icon: Shield,      color: '#34d399', bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.25)'  },
};

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, cardKey, icon: Icon, sub, trend }: {
  label: string; value: string; cardKey: 'stat1' | 'stat2' | 'stat3' | 'stat4';
  icon: React.ComponentType<{ size?: number; color?: string }>;
  sub?: string; trend?: 'up' | 'down' | 'neutral';
}) {
  const { t } = useTheme();
  const s = t[cardKey];
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: t.cardbg, border: `1px solid ${hovered ? s.accent + '40' : t.borderCard}`,
        borderRadius: 14, padding: '18px 16px 14px',
        display: 'flex', flexDirection: 'column', gap: 10,
        boxShadow: hovered ? `0 6px 24px ${s.glow}` : t.shadowCard,
        transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.accent, borderRadius: '14px 14px 0 0', opacity: hovered ? 1 : 0.6, transition: 'opacity 0.2s' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, fontFamily: FONT_MONO, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.textMuted, marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: FONT_MONO, color: t.text, lineHeight: 1, letterSpacing: '-0.03em', wordBreak: 'break-word' }}>{value}</div>
          {sub && <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4, fontFamily: FONT_MONO }}>{sub}</div>}
        </div>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={19} color={s.accent} />
        </div>
      </div>
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: 6, borderTop: `1px solid ${t.border}` }}>
          {trend === 'up'      && <><ArrowUpRight size={11} color={t.green.text} /><span style={{ fontSize: 10, color: t.green.text, fontFamily: FONT_MONO, fontWeight: 600 }}>Naik dari bulan lalu</span></>}
          {trend === 'down'    && <><ArrowDownRight size={11} color={t.red.text} /><span style={{ fontSize: 10, color: t.red.text, fontFamily: FONT_MONO, fontWeight: 600 }}>Turun dari bulan lalu</span></>}
          {trend === 'neutral' && <span style={{ fontSize: 10, color: t.textMuted, fontFamily: FONT_MONO }}>Tidak ada perubahan</span>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW PANEL
// ─────────────────────────────────────────────────────────────────────────────

const PreviewPanel = React.memo(function PreviewPanel({
  fileId,
  fileName,
  fileStatus,
}: {
  fileId: string;
  fileName?: string;
  fileStatus?: UploadedFile['status'];
}) {
  const { t } = useTheme();
  const w = useWindowWidth();
  const isMobile = w < BP_MD;

  const [data,       setData]       = useState<Record<string, unknown>[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [activeCols, setActiveCols] = useState<Set<string>>(new Set());
  const [allCols,    setAllCols]    = useState<string[]>([]);

  useEffect(() => {
    setLoading(true); setError(''); setData([]); setAllCols([]); setActiveCols(new Set());
    fetch(`/api/files/${fileId}/preview`)
      .then(r => r.json())
      .then(r => {
        if (r.success && r.data?.length) {
          const cols = Object.keys(r.data[0]);
          setAllCols(cols);
          setActiveCols(new Set(isMobile ? cols.slice(0, 5) : cols));
          setData(r.data);
        } else {
          setError(r.error || 'Tidak ada data');
        }
      })
      .catch(() => setError('Gagal memuat preview'))
      .finally(() => setLoading(false));
  }, [fileId]);

  const stats = useMemo(() => {
    if (!data.length || !allCols.length) return null;
    const numericCols = allCols.filter(c =>
      data.every(row => {
        const v = row[c];
        return v !== '' && v !== null && v !== undefined && !isNaN(Number(v));
      })
    );
    const omzetCol  = allCols.find(c => /omzet/i.test(c));
    const produkCol = allCols.find(c => /produk/i.test(c));
    const kotaCol   = allCols.find(c => /kota|area/i.test(c));
    const totalOmzet   = omzetCol  ? data.reduce((s, r) => s + Number(r[omzetCol]  ?? 0), 0) : null;
    const uniqueProduk = produkCol ? new Set(data.map(r => r[produkCol])).size : null;
    const uniqueKota   = kotaCol   ? new Set(data.map(r => r[kotaCol])).size   : null;
    return { totalOmzet, uniqueProduk, uniqueKota, numericCols };
  }, [data, allCols]);

  const visibleCols = allCols.filter(c => activeCols.has(c));

  const toggleCol = useCallback((col: string) => {
    setActiveCols(prev => {
      const next = new Set(prev);
      if (next.has(col)) { if (next.size > 2) next.delete(col); }
      else { next.add(col); }
      return next;
    });
  }, []);

  const isNumericCell = (col: string, val: unknown) =>
    stats?.numericCols.includes(col) && val !== '' && val !== null && !isNaN(Number(val));

  const fmtCell = (col: string, val: unknown): string => {
    if (val === null || val === undefined || val === '') return '—';
    if (isNumericCell(col, val)) {
      if (/omzet/i.test(col)) return `Rp ${Number(val).toLocaleString('id-ID')}`;
      return Number(val).toLocaleString('id-ID');
    }
    return String(val);
  };

  const statusColors: Record<UploadedFile['status'], { bg: string; text: string; border: string }> = {
    completed:  t.green,
    processing: t.blue,
    error:      t.red,
  };
  const sc = fileStatus ? statusColors[fileStatus] : t.gray;

  if (loading) return (
    <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, color: t.textMuted, fontSize: 12, fontFamily: FONT_MONO }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: t.textFaint, display: 'inline-block', animation: 'fadeIn 0.9s ease-in-out infinite', animationDelay: `${i * 0.18}s` }} />
        ))}
      </div>
      Memuat preview…
    </div>
  );

  if (error) return (
    <div style={{ margin: '6px 0', padding: '10px 13px', borderRadius: 8, background: t.red.bg, border: `1px solid ${t.red.border}`, color: t.red.text, fontSize: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
      <AlertCircle size={12} style={{ flexShrink: 0 }} />
      {error}
    </div>
  );

  if (!data.length) return (
    <div style={{ padding: '28px', textAlign: 'center', color: t.textMuted, fontSize: 12, fontFamily: FONT_MONO }}>
      Tidak ada data untuk ditampilkan.
    </div>
  );

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}`, background: t.cardbg }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: t.tableHead, borderBottom: `1px solid ${t.border}`, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: t.green.bg, border: `1px solid ${t.green.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileSpreadsheet size={12} color={t.green.text} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.text, fontFamily: FONT_MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 160 : 480 }}>
              {fileName || fileId}
            </div>
            <div style={{ fontSize: 10, color: t.textMuted, fontFamily: FONT_MONO, marginTop: 1 }}>
              {data.length} baris &middot; {allCols.length} kolom
            </div>
          </div>
          {fileStatus && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600, fontFamily: FONT_MONO, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, flexShrink: 0 }}>
              {fileStatus === 'completed'  && <CheckCircle size={9} />}
              {fileStatus === 'processing' && <span style={{ width: 7, height: 7, border: `1.5px solid ${sc.text}`, borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />}
              {fileStatus === 'error'      && <AlertCircle size={9} />}
              {fileStatus}
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, color: t.textFaint, fontFamily: FONT_MONO, flexShrink: 0 }}>
          preview 10 baris
        </span>
      </div>

      {/* Stats bar */}
      {stats && (() => {
        const statItems = [
          { label: 'Total Baris',   value: data.length.toLocaleString('id-ID'),                                              sub: 'records preview' },
          ...(stats.totalOmzet   !== null ? [{ label: 'Total Omzet',  value: `Rp ${(stats.totalOmzet / 1e6).toFixed(1)}jt`, sub: `Rp ${stats.totalOmzet.toLocaleString('id-ID')}` }] : []),
          ...(stats.uniqueProduk !== null ? [{ label: 'Produk Unik',  value: String(stats.uniqueProduk),                     sub: 'SKU berbeda' }] : []),
          ...(stats.uniqueKota   !== null ? [{ label: 'Kota / Area',  value: String(stats.uniqueKota),                       sub: 'wilayah' }] : []),
        ].slice(0, isMobile ? 2 : 4);
        return (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${statItems.length}, 1fr)`, borderBottom: `1px solid ${t.border}` }}>
            {statItems.map((s, i) => (
              <div key={s.label} style={{ padding: '10px 14px', borderRight: i < statItems.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                <div style={{ fontSize: 9, fontWeight: 700, fontFamily: FONT_MONO, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.textMuted, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 700, fontFamily: FONT_MONO, color: t.text, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2, fontFamily: FONT_MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Column chips */}
      {allCols.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', padding: '8px 12px', borderBottom: `1px solid ${t.border}`, background: t.tableHead }}>
          {allCols.map(col => {
            const on = activeCols.has(col);
            return (
              <button
                key={col}
                onClick={() => toggleCol(col)}
                title={on ? `Sembunyikan kolom ${col}` : `Tampilkan kolom ${col}`}
                style={{
                  fontSize: 10, fontFamily: FONT_MONO, padding: '2px 9px', borderRadius: 12,
                  border: `1px solid ${on ? t.borderActive : t.border}`,
                  background: on ? 'rgba(99,102,241,0.1)' : t.inputbg,
                  color: on ? '#818cf8' : t.textMuted,
                  cursor: 'pointer', transition: 'all 0.12s', outline: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {col}
              </button>
            );
          })}
        </div>
      )}

      {/* Data table */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxHeight: 360, overflowY: 'auto' }}>
        <table style={{ minWidth: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {visibleCols.map(col => (
                <th
                  key={col}
                  style={{
                    position: 'sticky', top: 0, zIndex: 2,
                    padding: '7px 12px', textAlign: 'left',
                    fontSize: 9, fontWeight: 700, fontFamily: FONT_MONO,
                    textTransform: 'uppercase', letterSpacing: '0.09em',
                    color: t.textMuted, borderBottom: `1px solid ${t.border}`,
                    background: t.tableHead, whiteSpace: 'nowrap',
                    ...(stats?.numericCols.includes(col) ? { textAlign: 'right' } : {}),
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? t.tableAlt : 'transparent' }}>
                {visibleCols.map(col => {
                  const numeric = isNumericCell(col, row[col]);
                  return (
                    <td
                      key={col}
                      style={{
                        padding: '6px 12px',
                        color: numeric ? t.text : t.textSub,
                        fontFamily: FONT_MONO,
                        borderBottom: i < data.length - 1 ? `1px solid ${t.border}` : 'none',
                        whiteSpace: 'nowrap',
                        fontWeight: numeric ? 600 : 400,
                        textAlign: numeric ? 'right' : 'left',
                        fontSize: 12,
                      }}
                    >
                      {fmtCell(col, row[col])}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ padding: '7px 14px', borderTop: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: t.tableHead, flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 10, color: t.textMuted, fontFamily: FONT_MONO }}>
          {visibleCols.length} / {allCols.length} kolom ditampilkan
        </span>
        <span style={{ fontSize: 10, color: t.textFaint, fontFamily: FONT_MONO }}>
          klik label kolom di atas untuk toggle
        </span>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW MODAL
// ─────────────────────────────────────────────────────────────────────────────

function PreviewModal({ file, onClose }: { file: UploadedFile; onClose: () => void }) {
  const { t } = useTheme();
  const w = useWindowWidth();
  const isMobile = w < BP_MD;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: t.modalOverlay,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: isMobile ? 10 : 24,
        animation: 'fadeIn 0.15s ease',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{
        background: t.cardbg,
        border: `1px solid ${t.borderCard}`,
        borderRadius: 16,
        width: '100%',
        maxWidth: 1000,
        maxHeight: isMobile ? '92vh' : '85vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: t.shadowElevated,
        animation: 'slideUp 0.2s ease',
      }}>

        {/* Modal Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: `1px solid ${t.border}`,
          background: t.tableHead,
          flexShrink: 0,
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: t.blue.bg, border: `1px solid ${t.blue.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Eye size={15} color={t.blue.text} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.text, lineHeight: 1 }}>
                Preview Data
              </div>
              <div style={{
                fontSize: 11, color: t.textMuted, fontFamily: FONT_MONO, marginTop: 3,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: isMobile ? 180 : 560,
              }}>
                {file.original_name}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* File meta badges */}
            {!isMobile && (
              <>
                <span style={badge(t.gray.bg, t.gray.text, t.gray.border)}>
                  <Database size={9} />
                  {file.record_count.toLocaleString('id-ID')} records
                </span>
                <span style={badge(
                  file.status === 'completed' ? t.green.bg : file.status === 'error' ? t.red.bg : t.blue.bg,
                  file.status === 'completed' ? t.green.text : file.status === 'error' ? t.red.text : t.blue.text,
                  file.status === 'completed' ? t.green.border : file.status === 'error' ? t.red.border : t.blue.border,
                )}>
                  {file.status === 'completed' && <CheckCircle size={9} />}
                  {file.status === 'error'     && <AlertCircle size={9} />}
                  {file.status}
                </span>
              </>
            )}
            <button
              onClick={onClose}
              title="Tutup (Esc)"
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: t.red.bg, border: `1px solid ${t.red.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
              }}
            >
              <X size={14} color={t.red.text} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px' : '16px 20px' }}>
          <PreviewPanel
            fileId={file.id}
            fileName={file.original_name}
            fileStatus={file.status}
          />
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '10px 18px',
          borderTop: `1px solid ${t.border}`,
          background: t.tableHead,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, flexWrap: 'wrap', gap: 8,
        }}>
          <span style={{ fontSize: 11, color: t.textFaint, fontFamily: FONT_MONO }}>
            Tekan <kbd style={{ padding: '1px 5px', borderRadius: 4, background: t.inputbg, border: `1px solid ${t.border}`, fontSize: 10, color: t.textMuted }}>Esc</kbd> atau klik di luar untuk menutup
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '7px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600,
              background: t.gray.bg, color: t.gray.text,
              border: `1px solid ${t.gray.border}`, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE / SORT ICON
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CFG = (t: Tokens) => ({
  completed:  { label: 'Selesai', icon: <CheckCircle size={10} />, ...t.green },
  processing: { label: 'Proses',  icon: <span style={{ width: 8, height: 8, border: `2px solid ${t.blue.text}`, borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />, ...t.blue },
  error:      { label: 'Error',   icon: <AlertCircle size={10} />, ...t.red   },
});
function StatusBadge({ status }: { status: UploadedFile['status'] }) {
  const { t } = useTheme();
  const s = STATUS_CFG(t)[status];
  return <span style={badge(s.bg, s.text, s.border)}>{s.icon} {s.label}</span>;
}
function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  const { t } = useTheme();
  if (col !== sortKey) return <ChevronUp size={11} color={t.textFaint} />;
  return sortDir === 'asc' ? <ChevronUp size={11} color="#6366f1" /> : <ChevronDown size={11} color="#6366f1" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILES TABLE
// ─────────────────────────────────────────────────────────────────────────────

const TABLE_COLS: { label: string; key: SortKey }[] = [
  { label: 'Nama File', key: 'original_name' },
  { label: 'Tanggal',   key: 'created_at'    },
  { label: 'Records',   key: 'record_count'  },
  { label: 'Omzet',     key: 'total_omzet'   },
  { label: 'Status',    key: 'status'        },
];

function FilesTable({ files, onDelete, isRoot }: { files: UploadedFile[]; onDelete: (id: string, name: string) => void; isRoot: boolean }) {
  const { t } = useTheme();
  const w = useWindowWidth();
  const isMobile = w < BP_MD;

  const [search,      setSearch]      = useState('');
  const [sortKey,     setSortKey]     = useState<SortKey>('created_at');
  const [sortDir,     setSortDir]     = useState<SortDir>('desc');
  const [page,        setPage]        = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q ? files.filter(f => f.original_name.toLowerCase().includes(q) || f.status.toLowerCase().includes(q)) : files;
  }, [files, search]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let av: string | number = a[sortKey] as string | number;
    let bv: string | number = b[sortKey] as string | number;
    if (sortKey === 'created_at') { av = new Date(av as string).getTime(); bv = new Date(bv as string).getTime(); }
    return av < bv ? (sortDir === 'asc' ? -1 : 1) : av > bv ? (sortDir === 'asc' ? 1 : -1) : 0;
  }), [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const paginated  = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const handleSort = (key: SortKey) => { if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('asc'); } setPage(1); };

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
    .reduce<(number | 'ellipsis')[]>((acc, n, idx, arr) => {
      if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
      acc.push(n); return acc;
    }, []);

  const visibleCols = isRoot ? TABLE_COLS : TABLE_COLS.filter(c => c.key !== 'record_count' && c.key !== 'total_omzet');

  const thS = (key: SortKey): React.CSSProperties => ({
    padding: '10px 13px', textAlign: 'left', fontSize: 10, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    color: key === sortKey ? '#6366f1' : t.textMuted,
    borderBottom: `1px solid ${t.border}`, fontFamily: FONT_MONO,
    whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
    background: t.tableHead,
  });

  return (
    <>
      {/* Preview Modal */}
      {previewFile && (
        <PreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      <div style={card(t)}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text, display: 'flex', alignItems: 'center', gap: 7 }}>
              <FileSpreadsheet size={14} color="#6366f1" />File Diupload
            </div>
            <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2, fontFamily: FONT_MONO }}>
              {filtered.length !== files.length ? `${filtered.length} / ${files.length}` : `${files.length} total`}
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={12} color={t.textMuted} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input type="text" placeholder="Cari file…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: 27, paddingRight: search ? 26 : 10, paddingTop: 7, paddingBottom: 7, fontSize: 12, borderRadius: 9, background: t.inputbg, border: `1px solid ${search ? t.borderActive : t.borderInput}`, color: t.text, outline: 'none', width: isMobile ? 148 : 190, transition: 'border-color 0.15s' }} />
            {search && <button onClick={() => { setSearch(''); setPage(1); }} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: 0, display: 'flex' }}><X size={11} /></button>}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ minWidth: 480, width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              {visibleCols.map(({ label, key }) => (
                <th key={key} style={thS(key)} onClick={() => handleSort(key)}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{label}<SortIcon col={key} sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
              ))}
              <th style={{ ...thS('status'), textAlign: 'center', cursor: 'default' }}>Aksi</th>
            </tr></thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={visibleCols.length + 1} style={{ padding: 40, textAlign: 'center', color: t.textMuted, fontSize: 12, fontFamily: FONT_MONO }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <FileSpreadsheet size={26} color={t.textFaint} />
                    {search ? `Tidak ada "${search}"` : 'Belum ada file'}
                  </div>
                </td></tr>
              ) : paginated.map((file, idx) => (
                <tr key={file.id} style={{ background: idx % 2 === 1 ? t.tableAlt : 'transparent' }}>
                  <td style={{ padding: '11px 13px', color: t.text, fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 6, background: t.green.bg, border: `1px solid ${t.green.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileSpreadsheet size={12} color={t.green.text} />
                      </div>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 100 : 200 }}>{file.original_name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 13px', color: t.textSub, whiteSpace: 'nowrap', fontFamily: FONT_MONO, fontSize: 12 }}>{new Date(file.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                  {isRoot && (
                    <>
                      <td style={{ padding: '11px 13px', color: t.textSub, fontFamily: FONT_MONO, fontSize: 12 }}>{file.record_count.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '11px 13px', fontFamily: FONT_MONO, fontSize: 12, whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 700, color: t.text }}>Rp </span>
                        <span style={{ color: t.textSub }}>{file.total_omzet.toLocaleString('id-ID')}</span>
                      </td>
                    </>
                  )}
                  <td style={{ padding: '11px 13px' }}><StatusBadge status={file.status} /></td>
                  <td style={{ padding: '11px 13px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 5 }}>
                      {/* Preview button — opens modal */}
                      <button
                        onClick={() => setPreviewFile(file)}
                        style={iconBtn(t.blue.bg, t.blue.border, 28)}
                        title="Preview data"
                      >
                        <Eye size={11} color={t.blue.text} />
                      </button>
                      {/* Delete button */}
                      <button
                        onClick={() => onDelete(file.id, file.original_name)}
                        style={iconBtn(t.red.bg, t.red.border, 28)}
                        title="Hapus"
                      >
                        <Trash2 size={11} color={t.red.text} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {sorted.length > 0 && (
          <div style={{ padding: '11px 16px', borderTop: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT_MONO }}>Baris:</span>
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} style={{ padding: '4px 7px', fontSize: 11, borderRadius: 7, background: t.inputbg, border: `1px solid ${t.borderInput}`, color: t.text, outline: 'none', fontFamily: FONT_MONO }}>
                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT_MONO }}>{(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} / {sorted.length}</span>
              <div style={{ display: 'flex', gap: 3 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={{ ...iconBtn(t.gray.bg, t.gray.border, 26), cursor: safePage === 1 ? 'not-allowed' : 'pointer', opacity: safePage === 1 ? 0.4 : 1 }}><ChevronLeft size={11} color={t.textSub} /></button>
                {!isMobile && pageNums.map((item, idx) => item === 'ellipsis'
                  ? <span key={`e${idx}`} style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: t.textMuted }}>…</span>
                  : <button key={item} onClick={() => setPage(item as number)} style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${safePage === item ? t.borderActive : t.gray.border}`, background: safePage === item ? 'rgba(99,102,241,0.12)' : t.gray.bg, color: safePage === item ? '#6366f1' : t.textSub, fontSize: 11, fontFamily: FONT_MONO, cursor: 'pointer', fontWeight: safePage === item ? 700 : 400 }}>{item}</button>
                )}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{ ...iconBtn(t.gray.bg, t.gray.border, 26), cursor: safePage === totalPages ? 'not-allowed' : 'pointer', opacity: safePage === totalPages ? 0.4 : 1 }}><ChevronRight size={11} color={t.textSub} /></button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD BOX
// ─────────────────────────────────────────────────────────────────────────────

function CardBox({ title, icon: Icon, iconColor = '#6366f1', children, noPad, accent }: {
  title: string; icon?: React.ComponentType<{ size?: number; color?: string }>;
  iconColor?: string; children: React.ReactNode; noPad?: boolean; accent?: string;
}) {
  const { t } = useTheme();
  return (
    <div style={{ background: t.cardbg, border: `1px solid ${t.borderCard}`, borderRadius: 12, overflow: 'hidden', boxShadow: t.shadowCard }}>
      <div style={{ padding: '12px 15px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 8, background: accent ? `linear-gradient(90deg, ${accent}0a 0%, transparent 60%)` : undefined }}>
        {Icon && <div style={{ width: 26, height: 26, borderRadius: 7, background: iconColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={13} color={iconColor} /></div>}
        <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{title}</span>
      </div>
      <div style={noPad ? {} : { padding: '15px' }}>{children}</div>
    </div>
  );
}

function FormGroup({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  const { t } = useTheme();
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textSub, marginBottom: 5 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4, fontFamily: FONT_MONO }}>{hint}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD TAB
// ─────────────────────────────────────────────────────────────────────────────

function UploadTab({ dbStats, uploadedFiles, onRefresh }: {
  dbStats: DatabaseStats | null; uploadedFiles: UploadedFile[]; onRefresh: () => Promise<void>;
}) {
  const { t } = useTheme();
  const { addToast } = useToast();
  const { user, getAccessibleAreas } = useAuth();
  const w = useWindowWidth();
  const isMobile = w < BP_MD;
  const isTablet = w < BP_LG;
  const isRoot = user?.role === 'root';

  const [isDragging,   setIsDragging]   = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading,  setIsUploading]  = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle'|'success'|'error'>('idle');
  const [uploadMsg,    setUploadMsg]    = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting,   setIsDeleting]   = useState(false);
  const [manualArea,   setManualArea]   = useState('');
  const [allAreas,     setAllAreas]     = useState<AreaConfig[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/areas')
      .then(r => r.json())
      .then(j => { if (j.success) setAllAreas(j.data.areas ?? []); })
      .catch(() => {});
  }, []);

  const userAreaIds     = getAccessibleAreas();
  const accessibleAreas = user?.role === 'root'
    ? allAreas
    : allAreas.filter(a => userAreaIds.includes(a.id));
  const autoArea        = accessibleAreas.length === 1 ? accessibleAreas[0].id : '';
  const selectedAreaId  = autoArea || manualArea;
  const selectedAreaName= allAreas.find(a => a.id === selectedAreaId)?.name ?? selectedAreaId;

  const handleFileSelect = (file: File) => {
    setUploadStatus('idle'); setUploadMsg('');
    if (/\.(xlsx|xls|csv)$/i.test(file.name)) { setSelectedFile(file); }
    else { addToast('error', 'Format tidak didukung', 'Gunakan .xlsx, .xls, atau .csv'); setUploadStatus('error'); setUploadMsg('Format file tidak didukung'); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  };

  const handleUpload = async () => {
    if (!selectedFile || isUploading) return;
    if (!selectedAreaId) { addToast('error', 'Area belum dipilih', 'Pilih area tujuan terlebih dahulu'); setUploadStatus('error'); setUploadMsg('Pilih area tujuan terlebih dahulu'); return; }
    setIsUploading(true); setUploadStatus('idle'); setUploadMsg('');
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('area', selectedAreaId);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      let r: any = {};
      try { r = await res.json(); } catch { r = {}; }
      if (res.ok && (r.success !== false)) {
        const count = r.data?.record_count ?? r.record_count ?? 0;
        const msg = count > 0 ? `${count.toLocaleString('id-ID')} records berhasil diimport` : 'File berhasil diupload';
        setUploadStatus('success'); setUploadMsg(msg);
        addToast('success', 'Upload berhasil!', msg);
        setSelectedFile(null); setManualArea('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        await onRefresh().catch(() => {});
      } else {
        const errMsg = r.error ?? r.message ?? `Server error ${res.status}`;
        setUploadStatus('error'); setUploadMsg(errMsg);
        addToast('error', 'Upload gagal', errMsg);
      }
    } catch (err: any) {
      const msg = err?.message || 'Koneksi gagal, coba kembali';
      setUploadStatus('error'); setUploadMsg(msg);
      addToast('error', 'Upload gagal', msg);
    } finally { setIsUploading(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/files?id=${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE' });
      let r: any = {};
      try { r = await res.json(); } catch { r = {}; }
      if (res.ok) { addToast('success', 'File dihapus', deleteTarget.name); await onRefresh().catch(() => {}); }
      else addToast('error', 'Gagal menghapus', r.error ?? `Error ${res.status}`);
    } catch (err: any) { addToast('error', 'Gagal menghapus', err?.message ?? 'Koneksi gagal'); }
    finally { setIsDeleting(false); setDeleteTarget(null); }
  };

  const canUpload = !!selectedFile && !!selectedAreaId && !isUploading;

  const StatusBar = () => {
    if (uploadStatus === 'idle') return null;
    const isOk = uploadStatus === 'success';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, marginBottom: 12, background: isOk ? t.green.bg : t.red.bg, border: `1px solid ${isOk ? t.green.border : t.red.border}`, animation: 'fadeIn 0.2s ease' }}>
        {isOk ? <CheckCircle size={13} color={t.green.text} style={{ flexShrink: 0 }} /> : <AlertCircle size={13} color={t.red.text} style={{ flexShrink: 0 }} />}
        <span style={{ fontSize: 12, fontWeight: 600, color: isOk ? t.green.text : t.red.text, flex: 1 }}>{isOk ? '✓ ' : '✗ '}{uploadMsg}</span>
        <button onClick={() => { setUploadStatus('idle'); setUploadMsg(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isOk ? t.green.text : t.red.text, padding: 0, display: 'flex', opacity: .6 }}><X size={11} /></button>
      </div>
    );
  };

  return (
    <>
      <ConfirmModal open={!!deleteTarget} title="Hapus File" message={`Yakin menghapus "${deleteTarget?.name}"? Data terkait akan hilang permanen.`} confirmLabel={isDeleting ? 'Menghapus…' : 'Hapus'} danger onConfirm={handleDeleteConfirm} onCancel={() => setDeleteTarget(null)} />

      {/* Stats grid — ROOT ONLY */}
      {isRoot && dbStats && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 1 : 2}, 1fr)`, gap: 12, marginBottom: 18 }}>
          <StatCard label="Total Records" value={dbStats.total_records.toLocaleString('id-ID')} cardKey="stat1" icon={Database} trend="up" />
          <StatCard label="Total Omzet"   value={`Rp ${(dbStats.total_omzet / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })}jt`} cardKey="stat2" icon={TrendingUp} sub={`Rp ${dbStats.total_omzet.toLocaleString('id-ID')}`} trend="up" />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 290px', gap: 16, marginBottom: 18, alignItems: 'start' }}>
        <CardBox title="Upload File Baru" icon={Upload} iconColor="#6366f1" accent="#6366f1">
          <StatusBar />
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
            onDrop={handleDrop}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
            style={{ border: `2px dashed ${isDragging ? '#6366f1' : selectedFile ? t.green.border : t.borderInput}`, borderRadius: 10, padding: selectedFile ? '14px' : isMobile ? '24px 14px' : '30px 14px', textAlign: 'center', background: isDragging ? t.dropzoneActive : selectedFile ? t.green.bg : t.inputbg, cursor: selectedFile ? 'default' : 'pointer', transition: 'all 0.2s', marginBottom: 14 }}
          >
            {!selectedFile ? (
              <>
                <div style={{ width: 44, height: 44, borderRadius: 11, background: isDragging ? 'rgba(99,102,241,0.15)' : t.inputbg, border: `1.5px dashed ${isDragging ? '#6366f1' : t.borderInput}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <Upload size={19} color={isDragging ? '#6366f1' : t.textMuted} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 4 }}>{isDragging ? 'Lepaskan di sini' : 'Drag & drop atau klik'}</div>
                <div style={{ fontSize: 11, color: t.textMuted }}>xlsx · xls · csv · maks 50 MB</div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: t.green.bg, border: `1px solid ${t.green.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileSpreadsheet size={18} color={t.green.text} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</div>
                  <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT_MONO, marginTop: 2 }}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <button onClick={e => { e.stopPropagation(); setSelectedFile(null); setUploadStatus('idle'); setUploadMsg(''); }} style={{ width: 26, height: 26, borderRadius: 7, background: t.red.bg, border: `1px solid ${t.red.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <X size={11} color={t.red.text} />
                </button>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); e.target.value = ''; }} style={{ display: 'none' }} />

          <FormGroup label="Area Tujuan" hint="Data akan dimasukkan ke area ini">
            {allAreas.length === 0 ? (
              <div style={{ fontSize: 12, color: t.textMuted, padding: '8px 12px', background: t.inputbg, border: `1px solid ${t.borderInput}`, borderRadius: 9, fontFamily: FONT_MONO, display: 'flex', alignItems: 'center', gap: 6 }}><Spinner size={11} color={t.textMuted} /> Memuat area…</div>
            ) : accessibleAreas.length === 0 ? (
              <div style={{ fontSize: 12, color: t.yellow.text, padding: '8px 12px', background: t.yellow.bg, border: `1px solid ${t.yellow.border}`, borderRadius: 9, fontFamily: FONT_MONO }}>⚠ Tidak ada area yang dapat diakses.</div>
            ) : autoArea ? (
              <div style={{ fontSize: 12, color: t.green.text, padding: '8px 12px', background: t.green.bg, border: `1px solid ${t.green.border}`, borderRadius: 9, fontFamily: FONT_MONO, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={11} color={t.green.text} />{selectedAreaName}</div>
            ) : (
              <select value={manualArea} onChange={e => setManualArea(e.target.value)} style={{ fontSize: 12, color: manualArea ? t.text : t.textMuted, background: t.inputbg, border: `1px solid ${manualArea ? t.borderActive : t.borderInput}`, borderRadius: 9, fontFamily: FONT_MONO, padding: '8px 12px', width: '100%', outline: 'none', cursor: 'pointer', transition: 'border-color 0.15s' }}>
                <option value="">— Pilih area tujuan —</option>
                {accessibleAreas.map(area => <option key={area.id} value={area.id}>{area.name || area.id}</option>)}
              </select>
            )}
          </FormGroup>

          {isUploading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: t.blue.bg, border: `1px solid ${t.blue.border}`, marginBottom: 10 }}>
              <Spinner size={12} color={t.blue.text} />
              <span style={{ fontSize: 12, color: t.blue.text, fontFamily: FONT_MONO }}>Mengupload {selectedFile?.name}…</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingTop: 6, borderTop: `1px solid ${t.border}`, marginTop: 4 }}>
            <button onClick={() => fileInputRef.current?.click()} style={{ padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: t.gray.bg, color: t.gray.text, border: `1px solid ${t.gray.border}`, cursor: 'pointer' }}>{selectedFile ? 'Ganti File' : 'Pilih File'}</button>
            <button onClick={handleUpload} disabled={!canUpload} style={{ padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, border: 'none', background: canUpload ? '#6366f1' : t.btnDisabled.bg, color: canUpload ? '#fff' : t.btnDisabled.text, cursor: canUpload ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, boxShadow: canUpload ? '0 2px 8px rgba(99,102,241,0.3)' : 'none', transition: 'all 0.15s' }}>
              {isUploading ? <><Spinner size={13} color="#fff" /> Mengupload…</> : <><Upload size={13} /> Upload</>}
            </button>
          </div>
        </CardBox>

        <CardBox title="Kolom yang Diperlukan" icon={AlertCircle} iconColor="#f59e0b" accent="#f59e0b">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {REQUIRED_COLUMNS.map((col, i) => (
              <div key={col} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px', borderBottom: i < REQUIRED_COLUMNS.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                <CheckCircle size={10} color="#10b981" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontFamily: FONT_MONO, color: t.textSub }}>{col}</span>
              </div>
            ))}
          </div>
        </CardBox>
      </div>

      <FilesTable files={uploadedFiles} onDelete={(id, name) => setDeleteTarget({ id, name })} isRoot={isRoot} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESET PASSWORD FORM
// ─────────────────────────────────────────────────────────────────────────────

function ResetPasswordForm() {
  const { t } = useTheme();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading,   setLoading]   = useState(false);
  const [showCur,   setShowCur]   = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [showCon,   setShowCon]   = useState(false);

  const strength = useMemo(() => {
    if (!newPw) return 0;
    let s = 0;
    if (newPw.length >= 8)             s++;
    if (/[A-Z]/.test(newPw))           s++;
    if (/[0-9]/.test(newPw))           s++;
    if (/[^A-Za-z0-9]/.test(newPw))   s++;
    return s;
  }, [newPw]);

  const strengthLabel = ['', 'Lemah', 'Cukup', 'Baik', 'Kuat'][strength];
  const strengthColor = ['', t.red.text, t.yellow.text, t.blue.text, t.green.text][strength];

  const inputStyle = (focused?: boolean): React.CSSProperties => ({
    width: '100%', padding: '9px 38px 9px 12px', fontSize: 13,
    borderRadius: 9, background: t.inputbg,
    border: `1px solid ${focused ? t.borderActive : t.borderInput}`,
    color: t.text, outline: 'none', fontFamily: FONT_MONO, transition: 'border-color 0.15s',
  });

  const EyeToggle = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button type="button" onClick={onToggle} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', padding: 2 }}>
      {show
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" /></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
    </button>
  );

  const handleSubmit = async () => {
    if (!currentPw || !newPw || !confirmPw) { addToast('warning', 'Semua field harus diisi'); return; }
    if (newPw !== confirmPw) { addToast('error', 'Password tidak cocok', 'Konfirmasi password tidak sesuai'); return; }
    if (newPw.length < 6) { addToast('error', 'Password terlalu pendek', 'Minimal 6 karakter'); return; }
    if (newPw === currentPw) { addToast('warning', 'Password sama', 'Password baru harus berbeda dari yang lama'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const r = await res.json();
      if (res.ok && r.success) {
        addToast('success', 'Password berhasil diubah', 'Silakan login kembali dengan password baru');
        setCurrentPw(''); setNewPw(''); setConfirmPw('');
      } else {
        addToast('error', 'Gagal mengubah password', r.error ?? 'Coba kembali');
      }
    } catch { addToast('error', 'Koneksi gagal', 'Coba kembali'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: user ? ROLE_CFG[user.role].bg + '80' : t.inputbg, border: `1px solid ${user ? ROLE_CFG[user.role].border : t.borderInput}`, marginBottom: 4 }}>
        {user && React.createElement(ROLE_CFG[user.role].Icon, { size: 16, color: ROLE_CFG[user.role].color })}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text, fontFamily: FONT_MONO }}>{user?.username}</div>
          <div style={{ fontSize: 11, color: user ? ROLE_CFG[user.role].color : t.textMuted, fontFamily: FONT_MONO, fontWeight: 600 }}>{user ? ROLE_LABELS[user.role] : ''}</div>
        </div>
      </div>

      <FormGroup label="Password Saat Ini">
        <div style={{ position: 'relative' }}>
          <input type={showCur ? 'text' : 'password'} value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Masukkan password saat ini" style={inputStyle()} />
          <EyeToggle show={showCur} onToggle={() => setShowCur(p => !p)} />
        </div>
      </FormGroup>

      <FormGroup label="Password Baru" hint="Minimal 6 karakter, kombinasikan huruf dan angka">
        <div style={{ position: 'relative' }}>
          <input type={showNew ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Masukkan password baru" style={inputStyle()} />
          <EyeToggle show={showNew} onToggle={() => setShowNew(p => !p)} />
        </div>
        {newPw.length > 0 && (
          <div style={{ marginTop: 7 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              {[1, 2, 3, 4].map(lvl => (
                <div key={lvl} style={{ flex: 1, height: 3, borderRadius: 3, background: lvl <= strength ? strengthColor : t.border, transition: 'background 0.2s' }} />
              ))}
            </div>
            <div style={{ fontSize: 10, fontFamily: FONT_MONO, color: strengthColor, fontWeight: 600 }}>{strengthLabel}</div>
          </div>
        )}
      </FormGroup>

      <FormGroup label="Konfirmasi Password Baru">
        <div style={{ position: 'relative' }}>
          <input type={showCon ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Ulangi password baru" style={inputStyle()} />
          <EyeToggle show={showCon} onToggle={() => setShowCon(p => !p)} />
        </div>
        {confirmPw && newPw && (
          <div style={{ marginTop: 5, fontSize: 11, fontFamily: FONT_MONO, display: 'flex', alignItems: 'center', gap: 4, color: confirmPw === newPw ? t.green.text : t.red.text }}>
            {confirmPw === newPw ? <CheckCircle size={10} /> : <X size={10} />}
            {confirmPw === newPw ? 'Password cocok' : 'Password tidak cocok'}
          </div>
        )}
      </FormGroup>

      <button
        onClick={handleSubmit}
        disabled={loading || !currentPw || !newPw || !confirmPw || newPw !== confirmPw}
        style={{
          padding: '10px 20px', borderRadius: 9, fontSize: 13, fontWeight: 700, border: 'none',
          background: (loading || !currentPw || !newPw || !confirmPw || newPw !== confirmPw) ? t.btnDisabled.bg : '#6366f1',
          color: (loading || !currentPw || !newPw || !confirmPw || newPw !== confirmPw) ? t.btnDisabled.text : '#fff',
          cursor: (loading || !currentPw || !newPw || !confirmPw || newPw !== confirmPw) ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: (loading || !currentPw || !newPw || !confirmPw) ? 'none' : '0 2px 10px rgba(99,102,241,0.3)',
          transition: 'all 0.15s', alignSelf: 'flex-start',
        }}>
        {loading ? <><Spinner size={13} color="currentColor" /> Menyimpan…</> : <><KeyRound size={14} /> Ubah Password</>}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS TAB
// ─────────────────────────────────────────────────────────────────────────────

function SettingsTab() {
  const { t } = useTheme();
  const { addToast } = useToast();
  const { user } = useAuth();
  const isRoot = user?.role === 'root';

  const handleMigrate = async () => {
    try {
      const res = await fetch('/api/migrate', { method: 'POST' });
      const r = await res.json();
      if (r.success) addToast('success', 'Migration selesai!');
      else addToast('error', 'Migration gagal', r.error);
    } catch { addToast('error', 'Gagal', 'Coba kembali.'); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'start' }}>
      <CardBox title="Ubah Password" icon={Lock} iconColor="#6366f1" accent="#6366f1">
        <ResetPasswordForm />
      </CardBox>

      {isRoot && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <CardBox title="Database Migration" icon={Database} iconColor="#10b981" accent="#10b981">
            <div style={{ fontSize: 13, color: t.textSub, marginBottom: 16, lineHeight: 1.7 }}>Jalankan migration untuk menambahkan kolom area dan update struktur database.</div>
            <button onClick={handleMigrate} style={{ padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Database size={14} /> Run Migration
            </button>
          </CardBox>

          <CardBox title="Pengaturan Sistem" icon={Settings} iconColor="#a855f7" accent="#a855f7">
            <div style={{ fontSize: 13, color: t.textMuted }}>Pengaturan lanjutan akan segera hadir…</div>
          </CardBox>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NAV ITEM
// ─────────────────────────────────────────────────────────────────────────────

function NavItem({ label, icon: Icon, active, collapsed, badge: bdg, onClick, accent = '#6366f1' }: {
  label: string; icon: React.ComponentType<{ size?: number; color?: string }>;
  active: boolean; collapsed: boolean; badge?: number; onClick: () => void; accent?: string;
}) {
  const { t } = useTheme();
  const [hovered, setHovered] = useState(false);
  const lit = active || hovered;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? label : undefined}
      style={{
        width: '100%', display: 'flex', alignItems: 'center',
        gap: collapsed ? 0 : 10,
        padding: collapsed ? '10px' : '9px 12px 9px 14px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: active
          ? `linear-gradient(90deg, ${accent}22 0%, ${accent}08 100%)`
          : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: 'none',
        borderLeft: active ? `2.5px solid ${accent}` : '2.5px solid transparent',
        borderRadius: collapsed ? 10 : '0 10px 10px 0',
        cursor: 'pointer', textAlign: 'left',
        transition: 'all 0.15s ease',
        marginBottom: 1,
        position: 'relative',
      }}
    >
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? accent + '22' : lit ? 'rgba(255,255,255,0.06)' : 'transparent',
        transition: 'background 0.15s',
      }}>
        <Icon size={15} color={active ? accent : lit ? 'rgba(255,255,255,0.75)' : t.sidebarText} />
      </div>

      {!collapsed && (
        <>
          <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? '#fff' : lit ? 'rgba(255,255,255,0.8)' : t.sidebarText, flex: 1, letterSpacing: active ? '-0.01em' : 0 }}>{label}</span>
          {bdg !== undefined && bdg > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: FONT_MONO, background: accent, color: '#fff', padding: '1px 7px', borderRadius: 12, boxShadow: `0 2px 6px ${accent}50` }}>{bdg}</span>
          )}
        </>
      )}

      {collapsed && hovered && (
        <div style={{ position: 'absolute', left: 'calc(100% + 12px)', top: '50%', transform: 'translateY(-50%)', background: '#1a1f35', color: '#fff', padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {label}
          <div style={{ position: 'absolute', right: '100%', top: '50%', transform: 'translateY(-50%)', border: '5px solid transparent', borderRightColor: '#1a1f35' }} />
        </div>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    section: 'DATA',
    items: [
      { id: 'upload',   label: 'Upload Data',      icon: Upload,   accent: '#6366f1' },
      { id: 'areas',    label: 'Management Area',  icon: MapPin,   accent: '#10b981' },
    ],
  },
  {
    section: 'ADMIN',
    items: [
      { id: 'users',    label: 'Manajemen User',   icon: Users,    accent: '#a855f7' },
      { id: 'settings', label: 'Pengaturan',       icon: Settings, accent: '#f59e0b' },
    ],
  },
];

const PERM_MAP: Record<string, string> = {
  upload: 'view_files', areas: 'view_areas', users: 'manage_users', settings: 'view_files',
};

function SidebarContent({ activeTab, setActiveTab, collapsed, setCollapsed, can, fileCount, isMobile, onClose }: {
  activeTab: string; setActiveTab: (id: string) => void;
  collapsed: boolean; setCollapsed: (v: boolean) => void;
  can: (p: string) => boolean; fileCount: number; isMobile: boolean; onClose: () => void;
}) {
  const { t } = useTheme();
  const { user, logout } = useAuth();

  return (
    <>
      <div style={{ padding: collapsed ? '14px 0' : '14px 16px', borderBottom: `1px solid ${t.sidebarBorder}`, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: 10, height: 64, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}>
            <BarChart3 size={18} color="#fff" />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', fontFamily: FONT_MONO, whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>Admin Panel</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: FONT_MONO, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sales Management</div>
            </div>
          )}
        </div>
        {isMobile && (
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 6, display: 'flex', flexShrink: 0 }}><X size={14} /></button>
        )}
      </div>

      {user && (
        <div style={{ padding: collapsed ? '12px 0' : '12px 14px', borderBottom: `1px solid ${t.sidebarBorder}`, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: ROLE_CFG[user.role].bg, border: `1.5px solid ${ROLE_CFG[user.role].border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 3px ${ROLE_CFG[user.role].color}15` }}>
            {React.createElement(ROLE_CFG[user.role].Icon, { size: 15, color: ROLE_CFG[user.role].color })}
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: FONT_MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{user.username}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: ROLE_CFG[user.role].color, fontFamily: FONT_MONO, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{ROLE_LABELS[user.role]}</div>
            </div>
          )}
        </div>
      )}

      <nav style={{ flex: 1, padding: collapsed ? '12px 6px' : '12px 0 12px', overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV_SECTIONS.map(({ section, items }) => {
          const visible = items.filter(item => can(PERM_MAP[item.id] ?? 'view_files'));
          if (!visible.length) return null;
          return (
            <div key={section} style={{ marginBottom: 18 }}>
              {!collapsed && (
                <div style={{ fontSize: 9, fontWeight: 700, fontFamily: FONT_MONO, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.18)', padding: '0 16px', marginBottom: 6, textTransform: 'uppercase' }}>{section}</div>
              )}
              {collapsed && <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 10px 8px' }} />}
              {visible.map(item => (
                <NavItem key={item.id} label={item.label} icon={item.icon} active={activeTab === item.id} collapsed={collapsed} badge={item.id === 'upload' ? fileCount : undefined} accent={item.accent} onClick={() => { setActiveTab(item.id); if (isMobile) onClose(); }} />
              ))}
            </div>
          );
        })}
      </nav>

      <div style={{ borderTop: `1px solid ${t.sidebarBorder}`, padding: collapsed ? '10px 6px' : '10px 10px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 8, padding: collapsed ? '8px' : '8px 10px', background: 'none', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9, cursor: 'pointer', color: t.sidebarText, transition: 'all 0.15s', fontSize: 12, fontWeight: 500 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {collapsed
              ? <ChevronRight size={14} color="rgba(255,255,255,0.4)" />
              : <><ChevronLeft size={14} color="rgba(255,255,255,0.4)" /><span style={{ color: 'rgba(255,255,255,0.4)' }}>Sembunyikan</span></>}
          </button>
        )}
      </div>
    </>
  );
}

function Sidebar({ activeTab, setActiveTab, collapsed, setCollapsed, can, fileCount, isMobile, mobileOpen, onMobileClose }: {
  activeTab: string; setActiveTab: (id: string) => void;
  collapsed: boolean; setCollapsed: (v: boolean) => void;
  can: (p: string) => boolean; fileCount: number;
  isMobile: boolean; mobileOpen: boolean; onMobileClose: () => void;
}) {
  const { t } = useTheme();

  if (isMobile) {
    return (
      <>
        {mobileOpen && <div onClick={onMobileClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 28, animation: 'fadeIn 0.15s ease', backdropFilter: 'blur(3px)' }} />}
        <aside style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 29, width: SIDEBAR_W, background: t.sidebarbg, borderRight: `1px solid ${t.sidebarBorder}`, display: 'flex', flexDirection: 'column', transform: mobileOpen ? 'translateX(0)' : `translateX(-${SIDEBAR_W}px)`, transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)', overflowY: 'auto', overflowX: 'hidden' }}>
          <SidebarContent activeTab={activeTab} setActiveTab={setActiveTab} collapsed={false} setCollapsed={setCollapsed} can={can} fileCount={fileCount} isMobile={true} onClose={onMobileClose} />
        </aside>
      </>
    );
  }

  const W = collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W;
  return (
    <aside style={{ width: W, minHeight: '100vh', background: t.sidebarbg, borderRight: `1px solid ${t.sidebarBorder}`, display: 'flex', flexDirection: 'column', transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)', flexShrink: 0, position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 30, overflowX: 'hidden', overflowY: 'auto' }}>
      <SidebarContent activeTab={activeTab} setActiveTab={setActiveTab} collapsed={collapsed} setCollapsed={setCollapsed} can={can} fileCount={fileCount} isMobile={false} onClose={() => {}} />
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOPBAR
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_META: Record<string, { title: string; subtitle: string; icon: React.ComponentType<any>; color: string }> = {
  upload:   { title: 'Upload Data',     subtitle: 'Kelola file penjualan', icon: Upload,   color: '#6366f1' },
  areas:    { title: 'Management Area', subtitle: 'Target DOS per area',   icon: MapPin,   color: '#10b981' },
  users:    { title: 'Manajemen User',  subtitle: 'Kelola akun pengguna',  icon: Users,    color: '#a855f7' },
  settings: { title: 'Pengaturan',      subtitle: 'Akun & konfigurasi',    icon: Settings, color: '#f59e0b' },
};

function Topbar({ activeTab, onMenuToggle }: { activeTab: string; onMenuToggle: () => void }) {
  const { theme, setTheme, t } = useTheme();
  const { user, logout } = useAuth();
  const w = useWindowWidth();
  const isMobile = w < BP_MD;
  const page = PAGE_META[activeTab] ?? { title: activeTab, subtitle: '', icon: Layers, color: '#6366f1' };
  const PageIcon = page.icon;

  return (
    <header style={{ height: 64, background: t.headerbg, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', padding: `0 ${isMobile ? 12 : 20}px`, gap: isMobile ? 8 : 12, position: 'sticky', top: 0, zIndex: 20, boxShadow: t.shadow }}>
      <button onClick={onMenuToggle} style={{ width: 34, height: 34, background: t.inputbg, border: `1px solid ${t.border}`, borderRadius: 9, cursor: 'pointer', color: t.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
        <Menu size={16} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: page.color + '15', border: `1px solid ${page.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <PageIcon size={15} color={page.color} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: t.text, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{page.title}</div>
          {!isMobile && <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT_MONO, marginTop: 2 }}>{page.subtitle}</div>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 5 : 8, flexShrink: 0 }}>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ width: 34, height: 34, borderRadius: 9, background: t.inputbg, border: `1px solid ${t.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
          {theme === 'dark' ? <Sun size={14} color={t.textSub} /> : <Moon size={14} color={t.textSub} />}
        </button>
        <div style={{ width: 1, height: 22, background: t.border }} />
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {!isMobile && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: t.text, fontFamily: FONT_MONO, lineHeight: 1 }}>{user.username}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: ROLE_CFG[user.role].color, fontFamily: FONT_MONO }}>{ROLE_LABELS[user.role]}</div>
              </div>
            )}
            <div style={{ width: 32, height: 32, borderRadius: 9, background: ROLE_CFG[user.role].bg, border: `1px solid ${ROLE_CFG[user.role].border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {React.createElement(ROLE_CFG[user.role].Icon, { size: 14, color: ROLE_CFG[user.role].color })}
            </div>
            <button onClick={logout} title="Logout" style={{ width: 34, height: 34, borderRadius: 9, background: t.red.bg, border: `1px solid ${t.red.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
              <LogOut size={14} color={t.red.text} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD CONTENT
// ─────────────────────────────────────────────────────────────────────────────

function DashboardContent() {
  const { t, theme } = useTheme();
  const { addToast } = useToast();
  const { can } = useAuth();
  const w = useWindowWidth();
  const isMobile = w < BP_MD;

  const [uploadedFiles,     setUploadedFiles]     = useState<UploadedFile[]>([]);
  const [dbStats,           setDbStats]           = useState<DatabaseStats | null>(null);
  const [isLoading,         setIsLoading]         = useState(true);
  const [activeTab,         setActiveTab]         = useState('upload');
  const [sidebarCollapsed,  setSidebarCollapsed]  = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => { if (!isMobile) setMobileSidebarOpen(false); }, [isMobile]);

  const fetchData = useCallback(async () => {
    try {
      const [fRes, sRes] = await Promise.all([fetch('/api/files'), fetch('/api/stats')]);
      if (fRes.ok) { const d = await fRes.json(); setUploadedFiles(d.data || []); }
      if (sRes.ok) { const d = await sRes.json(); setDbStats(d.data); }
    } catch {
      addToast('error', 'Gagal memuat data', 'Periksa koneksi.');
    } finally { setIsLoading(false); }
  }, [addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sidebarW = isMobile ? 0 : (sidebarCollapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W);

  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: t.pagebg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
          <BarChart3 size={24} color="#fff" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Memuat…</span>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: t.pagebg, fontFamily: FONT_SANS, display: 'flex', transition: 'background 0.3s' }}>
      <Sidebar
        activeTab={activeTab} setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed}
        can={can as (p: string) => boolean} fileCount={uploadedFiles.length}
        isMobile={isMobile} mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: sidebarW, transition: 'margin-left 0.22s cubic-bezier(0.4,0,0.2,1)', minWidth: 0, maxWidth: '100%' }}>
        <Topbar activeTab={activeTab} onMenuToggle={() => isMobile ? setMobileSidebarOpen(p => !p) : setSidebarCollapsed(p => !p)} />

        <main style={{ flex: 1, padding: isMobile ? '14px 12px' : '20px 24px', overflowY: 'auto', minWidth: 0 }}>
          {activeTab === 'upload'   && can('view_files')   && <UploadTab dbStats={dbStats} uploadedFiles={uploadedFiles} onRefresh={fetchData} />}
          {activeTab === 'areas'    && can('view_areas')   && <AreaManagement theme={theme} />}
          {activeTab === 'users'    && can('manage_users') && <UserManagement theme={theme} />}
          {activeTab === 'settings' && can('view_files')   && <SettingsTab />}
        </main>

        <footer style={{ padding: `10px ${isMobile ? 12 : 24}px`, borderTop: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: t.textFaint, fontFamily: FONT_MONO }}>Admin · Sales Dashboard</span>
          <span style={{ fontSize: 11, color: t.textFaint, fontFamily: FONT_MONO }}>v1.0</span>
        </footer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <AdminGuard>
            <style>{`
              @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
              *, *::before, *::after { box-sizing: border-box; }
              html, body { margin: 0; padding: 0; }
              @keyframes spin    { to { transform: rotate(360deg); } }
              @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
              @keyframes slideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
              @keyframes toastIn { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
              @keyframes pulse   { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
              ::-webkit-scrollbar       { width: 4px; height: 4px; }
              ::-webkit-scrollbar-track { background: transparent; }
              ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.25); border-radius: 3px; }
              ::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.4); }
            `}</style>
            <DashboardContent />
          </AdminGuard>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
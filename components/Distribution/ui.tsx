'use client';

import { tk } from './theme';
import { achColor, fmtN } from './helpers';
import type { Theme } from './types';

export function AchBadge({ pct, theme }: { pct: number; theme: Theme }) {
  const t = tk[theme];
  const n = parseFloat(String(pct ?? 0));
  const clr = achColor(n);
  const bg  = n >= 100 ? t.posBg  : n >= 80 ? t.warnBg  : t.negBg;
  const bdr = n >= 100 ? t.posBorder : n >= 80 ? t.warnBorder : t.negBorder;
  return (
    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, fontFamily: 'IBM Plex Mono,monospace', background: bg, color: clr, border: `1px solid ${bdr}`, whiteSpace: 'nowrap' }}>
      {n.toFixed(1)}%
    </span>
  );
}

export function KpiCard({ label, value, sub, icon: Icon, color, theme }: { label: string; value: string; sub?: string; icon: any; color: string; theme: Theme }) {
  const t = tk[theme];
  return (
    <div style={{ background: t.cardBg, border: `1px solid ${t.borderCard}`, borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 14, right: 14, height: 2, borderRadius: '0 0 2px 2px', background: `linear-gradient(90deg,${color}55,${color}22)` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: `${color}18`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={11} color={color} />
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'IBM Plex Mono,monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: t.textMuted }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'IBM Plex Mono,monospace', color: t.text, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: t.textMuted, fontFamily: 'IBM Plex Mono,monospace' }}>{sub}</div>}
    </div>
  );
}

export function PBar({ pct, theme }: { pct: number; theme: Theme }) {
  const t = tk[theme];
  const n = parseFloat(String(pct ?? 0));
  const clr = achColor(n);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: t.borderCard, overflow: 'hidden', minWidth: 60 }}>
        <div style={{ height: '100%', width: `${Math.min(100, n)}%`, background: clr, borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>
      <AchBadge pct={n} theme={theme} />
    </div>
  );
}

// Custom tooltip untuk recharts
export function CT({ active, payload, label, theme }: any) {
  const t = tk[theme as Theme];
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, borderRadius: 8, padding: '8px 12px', fontSize: 10, fontFamily: 'IBM Plex Mono,monospace', boxShadow: '0 6px 20px rgba(0,0,0,0.25)' }}>
      <div style={{ color: t.textMuted, marginBottom: 5, fontSize: 9 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color || p.fill, flexShrink: 0 }} />
          <span style={{ color: t.textSub, flex: 1 }}>{p.name}</span>
          <span style={{ fontWeight: 700, color: t.text }}>{fmtN(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function FilterBadge({ label, value, onClear, theme }: { label: string; value: string; onClear: () => void; theme: Theme }) {
  const t = tk[theme];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '1px 4px 1px 7px', borderRadius: 4,
      background: 'rgba(28,151,6,0.12)', border: '1px solid rgba(28,151,6,0.25)',
      fontSize: 10, fontFamily: 'IBM Plex Mono,monospace', color: t.tabActiveText,
    }}>
      <b>{label}:</b> {value}
      <button onClick={onClear} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '0 2px', display: 'flex', alignItems: 'center' }}>×</button>
    </span>
  );
}
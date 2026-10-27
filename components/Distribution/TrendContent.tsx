'use client';

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { tk } from './theme';
import { achColor, fmtN } from './helpers';
import { AchBadge, CT } from './ui';
import type { DistData, Theme } from './types';

export default function TrendContent({ data, theme }: { data: DistData; theme: Theme }) {
  const t     = tk[theme];
  const ts    = { fontSize: 8, fill: t.textMuted, fontFamily: 'IBM Plex Mono,monospace' };
  const trend = data.trend;

  const avgPlan  = trend.length ? trend.reduce((s, r) => s + r.total_plan,   0) / trend.length : 0;
  const avgAvOut = trend.length ? trend.reduce((s, r) => s + r.total_av_out, 0) / trend.length : 0;

  const chartData = trend.map(r => ({
    week:   r.week,
    plan:   r.total_plan,
    actual: r.total_actual,
    av_in:  r.total_av_in,
    ec:     r.total_ec,
    av_out: r.total_av_out,
    pct:    r.total_plan > 0 ? (r.total_av_out / r.total_plan) * 100 : 0,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: t.accordionBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.text, fontFamily: 'IBM Plex Mono,monospace' }}>Plan vs Av-Out per Minggu</div>
          <div style={{ fontSize: 9, color: t.textMuted, fontFamily: 'IBM Plex Mono,monospace', marginTop: 2 }}>
            Avg Plan: {fmtN(avgPlan)} · Avg Av-Out: {fmtN(avgAvOut)}
          </div>
        </div>
        {chartData.length === 0 ? (
          <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMuted, fontSize: 11, fontFamily: 'IBM Plex Mono,monospace' }}>Belum ada data</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} vertical={false} />
              <XAxis dataKey="week" tick={ts} axisLine={false} tickLine={false} />
              <YAxis tick={ts} axisLine={false} tickLine={false} width={36} tickFormatter={fmtN} />
              <Tooltip content={<CT theme={theme} />} />
              <ReferenceLine y={avgAvOut} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1} />
              <Bar dataKey="plan"   name="Plan"   fill="#3b82f6" opacity={0.3} radius={[2,2,0,0]} maxBarSize={18} />
              <Bar dataKey="av_out" name="Av-Out" radius={[2,2,0,0]} maxBarSize={18}>
                {chartData.map((d, i) => <Cell key={i} fill={achColor(d.pct)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ background: t.accordionBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.text, fontFamily: 'IBM Plex Mono,monospace', marginBottom: 10 }}>Av-In · EC · Av-Out per Minggu</div>
        {chartData.length === 0 ? (
          <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMuted, fontSize: 11, fontFamily: 'IBM Plex Mono,monospace' }}>Belum ada data</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} vertical={false} />
              <XAxis dataKey="week" tick={ts} axisLine={false} tickLine={false} />
              <YAxis tick={ts} axisLine={false} tickLine={false} width={36} tickFormatter={fmtN} />
              <Tooltip content={<CT theme={theme} />} />
              <Line type="monotone" dataKey="av_in"  name="Av-In"  stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ec"     name="EC"     stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="av_out" name="Av-Out" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ border: `1px solid ${t.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 420 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'IBM Plex Mono,monospace' }}>
            <thead>
              <tr>
                {['Minggu','Plan','Actual','Av-In','EC','Av-Out','Achievement','Outlet'].map((h, i) => (
                  <th key={i} style={{ padding: '8px 12px', textAlign: i === 0 ? 'left' : 'right', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: t.tableHeadText, borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 20, background: t.tableHeadBg }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trend.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: t.textMuted, fontSize: 11 }}>Belum ada data</td></tr>
              ) : trend.map((r, i) => {
                const pct = r.total_plan > 0 ? (r.total_av_out / r.total_plan) * 100 : 0;
                return (
                  <tr key={i}
                    style={{ background: i % 2 === 1 ? t.rowAlt : 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = t.rowHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 1 ? t.rowAlt : 'transparent')}>
                    <td style={{ padding: '7px 12px', fontSize: 11, fontWeight: 700, color: t.text }}>{r.week}</td>
                    <td style={{ padding: '7px 12px', fontSize: 11, color: t.text, textAlign: 'right' }}>{fmtN(r.total_plan)}</td>
                    <td style={{ padding: '7px 12px', fontSize: 11, color: t.text, textAlign: 'right' }}>{fmtN(r.total_actual)}</td>
                    <td style={{ padding: '7px 12px', fontSize: 11, color: '#3b82f6', textAlign: 'right' }}>{fmtN(r.total_av_in)}</td>
                    <td style={{ padding: '7px 12px', fontSize: 11, color: '#10b981', textAlign: 'right' }}>{fmtN(r.total_ec)}</td>
                    <td style={{ padding: '7px 12px', fontSize: 11, fontWeight: 700, color: t.text, textAlign: 'right' }}>{fmtN(r.total_av_out)}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'right' }}><AchBadge pct={pct} theme={theme} /></td>
                    <td style={{ padding: '7px 12px', fontSize: 10, color: t.text, textAlign: 'right' }}>{r.outlet_count || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
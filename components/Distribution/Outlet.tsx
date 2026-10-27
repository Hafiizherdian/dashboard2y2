'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { tk, CC } from './theme';
import { achColor, fmtN } from './helpers';
import { AchBadge, CT } from './ui';
import type { CovSalRow, DistData, Theme } from './types';

export default function CoverageContent({
  data,
  theme,
  salesmanFilter,
}: {
  data: DistData;
  theme: Theme;
  salesmanFilter: string;
}) {
  const t   = tk[theme];
  const ts  = { fontSize: 8, fill: t.textMuted, fontFamily: 'IBM Plex Mono,monospace' };
  const cov = data.coverage;

  // coverageSalesman sudah granular per (salesman, week) aman difilter di client tanpa refetch.
  // Pie/bar chart (data.coverage) TIDAK per-salesman dari server, jadi tetap menampilkan total semua salesman.
  const coverageSalesman = useMemo(
    () => salesmanFilter
      ? data.coverageSalesman.filter(r => r.salesman === salesmanFilter)
      : data.coverageSalesman,
    [data.coverageSalesman, salesmanFilter]
  );

  const salesmen = Array.from(new Set(coverageSalesman.map(r => r.salesman)));
  const weeks    = Array.from(new Set(coverageSalesman.map(r => r.week))).sort((a, b) =>
    parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, ''))
  );

  const heatMap = useMemo(() => {
    const m = new Map<string, CovSalRow>();
    coverageSalesman.forEach(r => m.set(`${r.salesman}||${r.week}`, r));
    return m;
  }, [coverageSalesman]);

  const pieData = cov.map((r, i) => ({
    name:  r.outlet_type || 'Unknown',
    value: r.total_av_out,
    fill:  CC[i % CC.length],
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: t.accordionBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.text, fontFamily: 'IBM Plex Mono,monospace', marginBottom: 10 }}>Distribusi Av-Out per Tipe</div>
          {pieData.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMuted, fontSize: 11 }}>Belum ada data</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius="35%" outerRadius="60%" dataKey="value" strokeWidth={0} paddingAngle={2}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip content={<CT theme={theme} />} />
                <Legend iconSize={7} iconType="circle" wrapperStyle={{ fontSize: 9, fontFamily: 'IBM Plex Mono,monospace', color: t.textSub }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background: t.accordionBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.text, fontFamily: 'IBM Plex Mono,monospace', marginBottom: 10 }}>Av-In · EC · Av-Out per Tipe</div>
          {cov.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMuted, fontSize: 11 }}>Belum ada data</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={cov.map(r => ({ name: r.outlet_type, av_in: r.total_av_in, ec: r.total_ec, av_out: r.total_av_out }))} margin={{ top: 4, right: 4, left: 0, bottom: 32 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} vertical={false} />
                <XAxis dataKey="name" tick={{ ...ts, fontSize: 8 }} axisLine={false} tickLine={false} angle={-25} textAnchor="end" height={40} />
                <YAxis tick={ts} axisLine={false} tickLine={false} width={30} />
                <Tooltip content={<CT theme={theme} />} />
                <Bar dataKey="av_in"  name="Av-In"  fill="#3b82f6" radius={[2,2,0,0]} maxBarSize={16} />
                <Bar dataKey="ec"     name="EC"     fill="#10b981" radius={[2,2,0,0]} maxBarSize={16} />
                <Bar dataKey="av_out" name="Av-Out" fill="#f59e0b" radius={[2,2,0,0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={{ border: `1px solid ${t.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}`, fontSize: 11, fontWeight: 700, color: t.text, fontFamily: 'IBM Plex Mono,monospace' }}>Detail per Tipe Outlet</div>
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 360 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'IBM Plex Mono,monospace' }}>
            <thead>
              <tr>
                {['Tipe Outlet','Plan','Actual','Av-In','EC','Av-Out','Achievement','Outlet'].map((h, i) => (
                  <th key={i} style={{ padding: '7px 12px', textAlign: i === 0 ? 'left' : 'right', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: t.tableHeadText, borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 20, background: t.tableHeadBg }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cov.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: t.textMuted, fontSize: 11 }}>Belum ada data</td></tr>
              ) : cov.map((r, i) => (
                <tr key={i}
                  style={{ background: i % 2 === 1 ? t.rowAlt : 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = t.rowHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 1 ? t.rowAlt : 'transparent')}>
                  <td style={{ padding: '7px 12px', fontSize: 11, fontWeight: 600, color: t.text }}>{r.outlet_type || '—'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 11, color: t.textSub, textAlign: 'right' }}>{fmtN(r.total_plan)}</td>
                  <td style={{ padding: '7px 12px', fontSize: 11, color: t.textSub, textAlign: 'right' }}>{fmtN(r.total_actual)}</td>
                  <td style={{ padding: '7px 12px', fontSize: 11, color: '#3b82f6', textAlign: 'right' }}>{fmtN(r.total_av_in)}</td>
                  <td style={{ padding: '7px 12px', fontSize: 11, color: '#10b981', textAlign: 'right' }}>{fmtN(r.total_ec)}</td>
                  <td style={{ padding: '7px 12px', fontSize: 11, fontWeight: 700, color: t.text, textAlign: 'right' }}>{fmtN(r.total_av_out)}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right' }}><AchBadge pct={r.achievement_pct} theme={theme} /></td>
                  <td style={{ padding: '7px 12px', fontSize: 10, color: t.textSub, textAlign: 'right' }}>
                    {r.outlet_count > 0 ? fmtN(r.outlet_count) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {salesmen.length > 0 && weeks.length > 0 && (
        <div style={{ border: `1px solid ${t.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}`, fontSize: 11, fontWeight: 700, color: t.text, fontFamily: 'IBM Plex Mono,monospace' }}>
            Heatmap Achievement — Salesman × Minggu
          </div>
          <div style={{ overflowX: 'auto', padding: '12px 14px' }}>
            <table style={{ borderCollapse: 'collapse', fontFamily: 'IBM Plex Mono,monospace', fontSize: 9 }}>
              <thead>
                <tr>
                  <th style={{ padding: '4px 10px', textAlign: 'left', color: t.tableHeadText, fontWeight: 700, minWidth: 120, whiteSpace: 'nowrap' }}>Salesman</th>
                  {weeks.map(w => (
                    <th key={w} style={{ padding: '4px 6px', textAlign: 'center', color: t.tableHeadText, fontWeight: 700, minWidth: 44 }}>{w}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {salesmen.map(sal => (
                  <tr key={sal}>
                    <td style={{ padding: '4px 10px', color: t.text, fontWeight: 600, whiteSpace: 'nowrap' }}>{sal}</td>
                    {weeks.map(w => {
                      const cell = heatMap.get(`${sal}||${w}`);
                      const pct  = cell ? parseFloat(String(cell.achievement_pct ?? 0)) : null;
                      const bg   = pct === null ? t.inputBg
                                 : pct >= 100 ? 'rgba(16,185,129,0.22)'
                                 : pct >= 80  ? 'rgba(245,158,11,0.18)'
                                 :              'rgba(239,68,68,0.15)';
                      const clr  = pct === null ? t.textFaint : achColor(pct);
                      return (
                        <td key={w}
                          title={pct !== null ? `${sal} ${w}: ${pct.toFixed(1)}%` : `${sal} ${w}: —`}
                          style={{ padding: '4px 6px', textAlign: 'center', background: bg, borderRadius: 4 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: clr }}>
                            {pct !== null ? `${Math.round(pct)}%` : '—'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '6px 14px 10px', display: 'flex', gap: 12, fontSize: 9, fontFamily: 'IBM Plex Mono,monospace', color: t.textMuted }}>
            {[
              { clr: 'rgba(16,185,129,0.22)', txt: '≥100%' },
              { clr: 'rgba(245,158,11,0.18)', txt: '80–99%' },
              { clr: 'rgba(239,68,68,0.15)',  txt: '<80%'   },
            ].map(({ clr, txt }) => (
              <div key={txt} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: clr }} />
                <span>{txt}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
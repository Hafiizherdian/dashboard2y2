'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { tk } from './theme';
import { fmtN } from './helpers';
import { PBar } from './ui';
import type { AchSalesmanProductRow, DistData, Theme } from './types';

// Achievement per Salesman × Produk
export default function AchievementSalesmanProductContent({
  data,
  theme,
  salesmanFilter,
}: {
  data: DistData;
  theme: Theme;
  salesmanFilter: string;
}) {
  const t = tk[theme];

  const achievementSalesmanProduct = useMemo(
    () => salesmanFilter
      ? data.achievementSalesmanProduct.filter(r => r.salesman === salesmanFilter)
      : data.achievementSalesmanProduct,
    [data.achievementSalesmanProduct, salesmanFilter]
  );

  return (
    <div style={{ background: t.accordionBg, border: `1px solid ${t.border}`, borderRadius: 10 }}>
      {achievementSalesmanProduct.length === 0 ? (
        <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMuted, fontSize: 11, fontFamily: 'IBM Plex Mono,monospace' }}>
          Belum ada data.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 580 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'IBM Plex Mono,monospace' }}>
            <thead>
              <tr>
                {['Salesman', 'Produk', 'Plan', 'Aktual', 'Av-In', 'EC', 'Av-Out', 'Achievement', 'Outlet'].map((h, i) => (
                  <th key={i} style={{ padding: '6px 10px', textAlign: i > 1 ? 'right' : 'left', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: t.tableHeadText, borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 20, background: t.tableHeadBg }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Data dari server sudah per (salesman, product)
                // tinggal dikelompokkan untuk tampilan bergaya pivot (nama salesman cuma muncul di baris pertama grup).
                const groups = new Map<string, AchSalesmanProductRow[]>();
                achievementSalesmanProduct.forEach(r => {
                  const key = r.salesman || '-';
                  if (!groups.has(key)) groups.set(key, []);
                  groups.get(key)!.push(r);
                });

                const rendered: ReactNode[] = [];
                const entries = Array.from(groups.entries());

                entries.forEach(([salesman, rows]) => {
                  rows.forEach((r, ri) => {
                    rendered.push(
                      <tr key={`${salesman}-${r.product}`}
                        style={{ background: ri % 2 === 1 ? t.rowAlt : 'transparent' }}
                        onMouseEnter={e => (e.currentTarget.style.background = t.rowHover)}
                        onMouseLeave={e => (e.currentTarget.style.background = ri % 2 === 1 ? t.rowAlt : 'transparent')}>
                        <td style={{ padding: '6px 10px', fontSize: 11, fontWeight: ri === 0 ? 700 : 400, color: ri === 0 ? t.text : t.textSub, whiteSpace: 'nowrap' }}>
                          {ri === 0 ? salesman : ''}
                        </td>
                        <td style={{ padding: '6px 10px', fontSize: 10, color: t.text, whiteSpace: 'nowrap' }}>{r.product || '—'}</td>
                        <td style={{ padding: '6px 10px', fontSize: 11, color: t.text, textAlign: 'right' }}>{fmtN(r.total_plan)}</td>
                        <td style={{ padding: '6px 10px', fontSize: 11, color: t.text, textAlign: 'right' }}>{fmtN(r.total_actual)}</td>
                        <td style={{ padding: '6px 10px', fontSize: 10, color: '#3b82f6', textAlign: 'right' }}>{fmtN(r.total_av_in)}</td>
                        <td style={{ padding: '6px 10px', fontSize: 10, color: '#10b981', textAlign: 'right' }}>{fmtN(r.total_ec)}</td>
                        <td style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, color: t.text, textAlign: 'right' }}>{fmtN(r.total_av_out)}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}><PBar pct={r.achievement_pct} theme={theme} /></td>
                        <td style={{ padding: '6px 10px', fontSize: 10, color: t.text, textAlign: 'right' }}>
                          {(r.outlet_count ?? 0) > 0 ? fmtN(r.outlet_count) : '—'}
                        </td>
                      </tr>
                    );
                  });
                });

                return rendered;
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
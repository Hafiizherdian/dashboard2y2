'use client';

import { useState, useMemo } from 'react';
import { Users, Package, Map as MapIcon } from 'lucide-react';
import { tk } from './theme';
import { fmtN, TAB_BAR_H } from './helpers';
import { PBar } from './ui';
import type { DistData, Theme } from './types';

export default function AchievementContent({
  data,
  theme,
  salesmanFilter,
}: {
  data: DistData;
  theme: Theme;
  salesmanFilter: string;
}) {
  const t  = tk[theme];
  const [view, setView] = useState<'salesman' | 'product' | 'area'>('salesman');

  // achievementSalesman & achievementSalesmanProduct sudah granular per salesman (bukan agregat lintas salesman), jadi aman difilter di client tanpa refetch dan tanpa risiko salah hitung outlet.
  const achievementSalesman = useMemo(
    () => salesmanFilter
      ? data.achievementSalesman.filter(r => r.salesman === salesmanFilter)
      : data.achievementSalesman,
    [data.achievementSalesman, salesmanFilter]
  );

  // achievementProduct (view=Produk) TIDAK punya breakdown per-salesman dari server, jadi TIDAK ikut ter filter oleh salesmanFilter di sini.
  const rows = view === 'salesman' ? achievementSalesman
             : view === 'product'  ? data.achievementProduct
             : data.achievementArea;

  const tabs = [
    { id: 'salesman', label: 'Per Salesman',  icon: Users },
    { id: 'product',  label: 'Per Produk',    icon: Package },
    { id: 'area',     label: 'Per Area/Kota', icon: MapIcon },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ position: 'sticky', top: TAB_BAR_H, zIndex: 35, background: t.cardBg, paddingTop: 4, paddingBottom: 4 }}>
        <div style={{ display: 'flex', gap: 4, background: t.tabBg, borderRadius: 8, padding: 3, width: 'fit-content' }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setView(id)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: 'IBM Plex Mono,monospace', border: 'none', cursor: 'pointer', background: view === id ? t.tabActive : 'transparent', color: view === id ? t.tabActiveText : t.text, transition: 'all 0.15s' }}>
              <Icon size={11} />{label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ border: `1px solid ${t.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 480 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'IBM Plex Mono,monospace' }}>
            <thead>
              <tr>
                {(() => {
                  const headers =
                    view === 'salesman' ? ['#', 'Salesman', 'Plan', 'Av-Out', 'Achievement', 'Outlet'] :
                    view === 'product'  ? ['#', 'Produk', 'Kategori', 'Plan', 'Av-Out', 'Achievement'] :
                                          ['#', 'Kota', 'Kecamatan', 'Plan', 'Av-Out', 'Achievement', 'Outlet'];

                  return headers.map((h, i) => {
                    // Jika view salesman, rata kanan mulai index 2. Jika product/area, mulai index 3.
                    const isRightAligned = view === 'salesman' ? i > 1 : i > 2;

                    return (
                      <th
                        key={i}
                        style={{
                          padding: '8px 12px',
                          textAlign: isRightAligned ? 'right' : 'left',
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.07em',
                          color: t.tableHeadText,
                          borderBottom: `1px solid ${t.border}`,
                          whiteSpace: 'nowrap',
                          position: 'sticky',
                          top: 0,
                          zIndex: 20,
                          background: t.tableHeadBg
                        }}
                      >
                        {h}
                      </th>
                    );
                  });
                })()}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: t.textMuted, fontSize: 11 }}>Belum ada data</td></tr>
              ) : rows.map((r, i) => (
                <tr key={i}
                  style={{ background: i % 2 === 1 ? t.rowAlt : 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = t.rowHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 1 ? t.rowAlt : 'transparent')}>
                  <td style={{ padding: '8px 12px', fontSize: 10, color: t.textMuted }}>{i + 1}</td>

                  {/* Kolom utama (Salesman / Produk / Kota) */}
                  <td style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: t.text, whiteSpace: 'nowrap' }}>
                    {view === 'salesman' ? r.salesman : view === 'product' ? r.product : r.city}
                  </td>

                  {/* Kolom tambahan jika view == product */}
                  {view === 'product' && (
                    <td style={{ padding: '8px 12px', fontSize: 10, color: t.text }}>{r.category || '—'}</td>
                  )}

                  {/* Kolom tambahan jika view == area (Kecamatan) */}
                  {view === 'area' && (
                    <td style={{ padding: '8px 12px', fontSize: 11, color: t.text, whiteSpace: 'nowrap' }}>{r.district || '—'}</td>
                  )}

                  <td style={{ padding: '8px 12px', fontSize: 11, color: t.text, textAlign: 'right' }}>{fmtN(r.total_plan)}</td>
                  <td style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: t.text, textAlign: 'right' }}>{fmtN(r.total_av_out)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}><PBar pct={r.achievement_pct} theme={theme} /></td>
                  {view !== 'product' && (
                    <td style={{ padding: '8px 12px', fontSize: 10, color: t.text, textAlign: 'right' }}>
                      {(r.outlet_count ?? 0) > 0 ? fmtN(r.outlet_count!) : '—'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '8px 12px', borderTop: `1px solid ${t.border}`, display: 'flex', gap: 16, fontSize: 10, color: t.textMuted, fontFamily: 'IBM Plex Mono,monospace' }}>
          <span><b style={{ color: t.text }}>{rows.filter(r => r.achievement_pct >= 100).length}</b> hit target</span>
          <span><b style={{ color: t.text }}>{rows.filter(r => r.achievement_pct >= 80 && r.achievement_pct < 100).length}</b> mendekat</span>
          <span><b style={{ color: t.text }}>{rows.filter(r => r.achievement_pct < 80).length}</b> perlu perhatian</span>
        </div>
      </div>
    </div>
  );
}
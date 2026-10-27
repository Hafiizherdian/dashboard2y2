'use client';

import { useState } from 'react';
import { Award, Store, ChartColumnIncreasing, BookUser } from 'lucide-react';
import { tk } from './theme';
import AchievementSalesmanProductContent from './AchievementSalesmanProductContent';
import AchievementContent from './AchievementContent';
import TrendContent from './TrendContent';
import CoverageContent from './Outlet';
import StreakContent from './RepeatOrder';
import type { DistData, Theme } from './types';

export default function DistributionTabs({
  data,
  theme,
  salesmanFilter,
  weekStart,
  weekEnd,
}: {
  data: DistData;
  theme: Theme;
  salesmanFilter: string;
  weekStart: number;
  weekEnd: number;
}) {
  const t = tk[theme];
  const [tabValue, setTabValue] = useState(0);

  const tabs = [
    { label: 'Achievement Salesman x Produk', icon: BookUser,              color: t.tableHeadText, content: <AchievementSalesmanProductContent data={data} theme={theme} salesmanFilter={salesmanFilter} /> },
    { label: 'Achievement',                   icon: Award,                 color: t.tableHeadText, content: <AchievementContent data={data} theme={theme} salesmanFilter={salesmanFilter} /> },
    { label: 'Trend Mingguan',                icon: ChartColumnIncreasing, color: t.tableHeadText, content: <TrendContent       data={data} theme={theme} /> },
    { label: 'Outlet',                        icon: Store,                 color: t.tableHeadText, content: <CoverageContent    data={data} theme={theme} salesmanFilter={salesmanFilter} /> },
    { label: 'Repeat Order',                  icon: Store,                 color: t.tableHeadText, content: <StreakContent      data={data} theme={theme} weekStart={weekStart} weekEnd={weekEnd} salesmanFilter={salesmanFilter} /> },
  ];

  return (
    <div style={{ width: '100%', background: t.cardBg, border: `1px solid ${t.borderCard}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: `1px solid ${t.border}`, background: t.tableHeadBg, overflowX: 'auto', position: 'sticky', top: 0, zIndex: 40 }}>
        {tabs.map((tab, i) => {
          const Icon     = tab.icon;
          const isActive = tabValue === i;
          return (
            <button key={i} onClick={() => setTabValue(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', background: 'transparent', border: 'none',
                borderBottom: isActive ? `4px solid #1c9706` : '2px solid transparent',
                cursor: 'pointer', fontSize: 11,
                fontWeight: isActive ? 700 : 700,
                fontFamily: 'IBM Plex Mono, monospace',
                color: isActive ? t.tabActiveText : t.tableHeadText,
                whiteSpace: 'nowrap', transition: 'all 0.15s', marginBottom: -1,
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 5,
                background: isActive ? `${tab.color}22` : 'transparent',
                border: isActive ? `1px solid ${tab.color}33` : '1px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>
                <Icon size={10} color={isActive ? tab.color : t.textMuted} />
              </div>
              {tab.label}
            </button>
          );
        })}
      </div>
      <div style={{ padding: 16 }}>
        {tabs[tabValue].content}
      </div>
    </div>
  );
}
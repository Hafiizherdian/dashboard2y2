'use client';

import React, { useState, useMemo } from 'react';
import { PiutangRecord } from '@/types/sales';
import { Search, Filter, ArrowUpDown, CreditCard, DollarSign, Calendar, Sliders, ChevronDown, RefreshCw } from 'lucide-react';

type Theme = 'light' | 'dark';

// Color theme system supporting both light and dark themes nicely
const TK = {
  dark: {
    cardBg:        '#111318',
    border:        'rgba(255,255,255,0.06)',
    borderCard:    'rgba(255,255,255,0.07)',
    tableHeadBg:   '#0c0e14',
    tableHeadText: 'rgba(255,255,255,0.3)',
    rowHover:      'rgba(255,255,255,0.04)',
    rowAlt:        'rgba(255,255,255,0.015)',
    text:          'rgba(255,255,255,0.9)',
    textSub:       'rgba(255,255,255,0.55)',
    textMuted:     'rgba(255,255,255,0.3)',
    textFaint:     'rgba(255,255,255,0.18)',
    inputBg:       'rgba(255,255,255,0.03)',
    inputBorder:   'rgba(255,255,255,0.08)',
    btnBg:         'rgba(59,130,246,0.12)',
    btnBorder:     'rgba(59,130,246,0.3)',
    btnText:       '#93c5fd',
    posBg:         'rgba(16,185,129,0.1)',
    posBorder:     'rgba(16,185,129,0.25)',
    posText:       '#6ee7b7',
    negBg:         'rgba(239,68,68,0.1)',
    negBorder:     'rgba(239,68,68,0.22)',
    negText:       '#fca5a5',
    warningBg:     'rgba(245,158,11,0.1)',
    warningBorder: 'rgba(245,158,11,0.25)',
    warningText:   '#fde047',
    shadow:        'none',
  },
  light: {
    cardBg:        '#ffffff',
    border:        'rgba(0,0,0,0.07)',
    borderCard:    'rgba(0,0,0,0.08)',
    tableHeadBg:   '#f8fafc',
    tableHeadText: '#94a3b8',
    rowHover:      'rgba(0,0,0,0.035)',
    rowAlt:        'rgba(0,0,0,0.018)',
    text:          '#0f172a',
    textSub:       '#475569',
    textMuted:     '#94a3b8',
    textFaint:     '#cbd5e1',
    inputBg:       'rgba(0,0,0,0.02)',
    inputBorder:   'rgba(0,0,0,0.08)',
    btnBg:         'rgba(37,99,235,0.08)',
    btnBorder:     'rgba(37,99,235,0.25)',
    btnText:       '#1d4ed8',
    posBg:         'rgba(16,185,129,0.08)',
    posBorder:     'rgba(22,163,74,0.25)',
    posText:       '#15803d',
    negBg:         'rgba(220,38,38,0.08)',
    negBorder:     'rgba(220,38,38,0.2)',
    negText:       '#dc2626',
    warningBg:     'rgba(245,158,11,0.08)',
    warningBorder: 'rgba(217,119,6,0.25)',
    warningText:   '#b45309',
    shadow:        '0 1px 8px rgba(0,0,0,0.05)',
  },
} as const;

// Currency Formatter to Rupiah (IDR)
const formatIDR = (num: number): string => {
  return num.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

interface PiutangComponentProps {
  data: PiutangRecord[];
  theme: Theme;
}

export default function PiutangComponent({ data, theme = 'light' }: PiutangComponentProps) {
  const t = TK[theme];

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedSalesman, setSelectedSalesman] = useState<string>('all');
  const [selectedAgeRange, setSelectedAgeRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<keyof PiutangRecord>('hari');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter lists derived from data
  const cities = useMemo(() => {
    const list = new Set<string>();
    data.forEach(item => {
      if (item.kota) list.add(item.kota.trim());
    });
    return Array.from(list);
  }, [data]);

  const salesmen = useMemo(() => {
    const list = new Set<string>();
    data.forEach(item => {
      if (item.salesman) {
        list.add(item.salesman.trim());
      } else {
        list.add('-');
      }
    });
    return Array.from(list);
  }, [data]);

  // Handle Sort
  const handleSort = (field: keyof PiutangRecord) => {
    if (sortBy === field) {
      setSortOrder(order => (order === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Filter & Sort Logic
  const filteredData = useMemo(() => {
    return data
      .filter(item => {
        // Search Term: faktur, kode, outlet, kecamatan, kelDesa
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          item.faktur.toLowerCase().includes(term) ||
          item.kode.toLowerCase().includes(term) ||
          item.outlet.toLowerCase().includes(term) ||
          item.kecamatan.toLowerCase().includes(term) ||
          item.kelDesa.toLowerCase().includes(term);

        // City filter
        const matchesCity = selectedCity === 'all' || item.kota.trim() === selectedCity;

        // Salesman filter
        const salesmanVal = item.salesman ? item.salesman.trim() : '-';
        const matchesSalesman = selectedSalesman === 'all' || salesmanVal === selectedSalesman;

        // Age (Hari) filter
        let matchesAge = true;
        if (selectedAgeRange !== 'all') {
          const daysNum = item.hari ?? 0;
          if (selectedAgeRange === 'long') {
            matchesAge = daysNum >= 45;
          } else if (selectedAgeRange === 'medium') {
            matchesAge = daysNum >= 30 && daysNum < 44;
          } else if (selectedAgeRange === 'short') {
            matchesAge = daysNum < 30;
          } else if (selectedAgeRange === 'giro') {
            matchesAge = item.hari === null; // Giro types usually have null/blank days
          }
        }

        return matchesSearch && matchesCity && matchesSalesman && matchesAge;
      })
      .sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        // Handle nulls
        if (valA === null) valA = sortOrder === 'asc' ? Infinity : -Infinity;
        if (valB === null) valB = sortOrder === 'asc' ? Infinity : -Infinity;

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }

        return 0;
      });
  }, [data, searchTerm, selectedCity, selectedSalesman, selectedAgeRange, sortBy, sortOrder]);

  // Aggregate Metrics for filtered data
  const metrics = useMemo(() => {
    let totalPiutang = 0;
    let totalGiro = 0;
    let totalHariOverdue = 0;
    let countWithHari = 0;

    filteredData.forEach(item => {
      totalPiutang += item.piutang;
      totalGiro += item.giro;
      if (item.hari !== null) {
        totalHariOverdue += item.hari;
        countWithHari += 1;
      }
    });

    const avgAging = countWithHari > 0 ? Math.round(totalHariOverdue / countWithHari) : 0;

    return {
      totalPiutang,
      totalGiro,
      totalOutstanding: totalPiutang + totalGiro,
      avgAging,
      count: filteredData.length,
    };
  }, [filteredData]);

  const getSortIcon = (field: keyof PiutangRecord) => {
    if (sortBy !== field) return <ArrowUpDown size={11} className="opacity-40" />;
    return (
      <span className={sortOrder === 'asc' ? 'text-blue-500' : 'text-[#10b981]'}>
        <ArrowUpDown size={12} />
      </span>
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCity('all');
    setSelectedSalesman('all');
    setSelectedAgeRange('all');
    setSortBy('hari');
    setSortOrder('desc');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: 'IBM Plex Sans, sans-serif' }} id="piutang-section">
      
      {/* ── KPI Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        
        {/* Total Outstanding */}
        <div style={{
          background: t.cardBg, border: `1px solid ${t.borderCard}`, borderRadius: 12, padding: 18,
          boxShadow: t.shadow, transition: 'all 0.3s'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.07em', color: t.textSub }}>
              TOTAL
            </span>
            <div style={{ padding: 6, borderRadius: 8, background: 'rgba(59,130,246,0.08)', color: '#3b82f6' }}>
              <DollarSign size={15} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: t.text, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '-0.02em', marginBottom: 4 }}>
            Rp {formatIDR(metrics.totalOutstanding)}
          </div>
          <div style={{ fontSize: 10, color: t.textMuted, display: 'flex', gap: 8 }}>
            <span>Piutang + Giro</span>
            <span style={{ color: t.textSub }}>· {metrics.count} Transaksi</span>
          </div>
        </div>

        {/* Total Piutang */}
        <div style={{
          background: t.cardBg, border: `1px solid ${t.borderCard}`, borderRadius: 12, padding: 18,
          boxShadow: t.shadow, transition: 'all 0.3s'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.07em', color: t.warningText }}>
              TOTAL PIUTANG 
            </span>
            <div style={{ padding: 6, borderRadius: 8, background: t.warningBg, color: '#f59e0b' }}>
              <CreditCard size={15} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: t.text, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '-0.02em', marginBottom: 4 }}>
            Rp {formatIDR(metrics.totalPiutang)}
          </div>
          {/* <div style={{ fontSize: 10, color: t.textMuted }}>Kewajiban aktif yang belum dibayar</div> */}
        </div>

        {/* Total Giro */}
        <div style={{
          background: t.cardBg, border: `1px solid ${t.borderCard}`, borderRadius: 12, padding: 18,
          boxShadow: t.shadow, transition: 'all 0.3s'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.07em', color: t.posText }}>
              TOTAL GIRO
            </span>
            <div style={{ padding: 6, borderRadius: 8, background: t.posBg, color: '#10b981' }}>
              <RefreshCw size={15} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: t.text, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '-0.02em', marginBottom: 4 }}>
            Rp {formatIDR(metrics.totalGiro)}
          </div>
          {/* <div style={{ fontSize: 10, color: t.textMuted }}>Warkat giro yang belum jatuh tempo</div> */}
        </div>

        {/* Rata-Rata Umur Piutang */}
        <div style={{
          background: t.cardBg, border: `1px solid ${t.borderCard}`, borderRadius: 12, padding: 18,
          boxShadow: t.shadow, transition: 'all 0.3s'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#ec4899' }}>
              RATA-RATA UMUR PIUTANG
            </span>
            <div style={{ padding: 6, borderRadius: 8, background: 'rgba(236,72,153,0.08)', color: '#ec4899' }}>
              <Calendar size={15} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: t.text, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '-0.02em', marginBottom: 4 }}>
            {metrics.avgAging} <span style={{ fontSize: 12, fontWeight: 500, color: t.textSub }}>Hari</span>
          </div>
          {/* <div style={{ fontSize: 10, color: t.textMuted }}>Dihitung dari tanggal faktur</div> */}
        </div>

      </div>

      {/* ── Interactive Filters Rail ── */}
      <div style={{
        background: t.cardBg, border: `1px solid ${t.borderCard}`, borderRadius: 12, padding: '14px 18px',
        boxShadow: t.shadow, display: 'flex', flexDirection: 'column', gap: 12
      }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={13} color={t.textMuted} />
            <span style={{ fontSize: 12, fontWeight: 700, color: t.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Papan Filter Piutang
            </span>
          </div>
          <button
            onClick={clearFilters}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: t.btnText,
              display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600
            }}
          >
            Reset Filter
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 10
        }}>
          
          {/* Search Term */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace' }}>SEARCH OUTLET/FAKTUR</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={12} color={t.textMuted} style={{ position: 'absolute', left: 10 }} />
              <input
                type="text"
                placeholder="Cari faktur, kode, nama..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  background: t.inputBg,
                  border: `1px solid ${t.inputBorder}`,
                  borderRadius: 8,
                  padding: '7px 10px 7px 28px',
                  fontSize: 12,
                  outline: 'none',
                  color: t.text,
                  transition: 'border-color 0.15s'
                }}
              />
            </div>
          </div>

          {/* Kota Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace' }}>KOTA</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <select
                value={selectedCity}
                onChange={e => setSelectedCity(e.target.value)}
                style={{
                  width: '100%',
                  background: t.inputBg,
                  border: `1px solid ${t.inputBorder}`,
                  borderRadius: 8,
                  padding: '7px 24px 7px 10px',
                  fontSize: 12,
                  outline: 'none',
                  appearance: 'none',
                  color: t.text,
                  cursor: 'pointer'
                }}
              >
                <option value="all">Semua Kota</option>
                {cities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown size={12} color={t.textMuted} style={{ position: 'absolute', right: 10, pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Salesman Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace' }}>SALESMAN</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <select
                value={selectedSalesman}
                onChange={e => setSelectedSalesman(e.target.value)}
                style={{
                  width: '100%',
                  background: t.inputBg,
                  border: `1px solid ${t.inputBorder}`,
                  borderRadius: 8,
                  padding: '7px 24px 7px 10px',
                  fontSize: 12,
                  outline: 'none',
                  appearance: 'none',
                  color: t.text,
                  cursor: 'pointer'
                }}
              >
                <option value="all">Semua Salesman</option>
                {salesmen.map(s => (
                  <option key={s} value={s}>{s === '-' ? 'Tanpa Salesman' : s}</option>
                ))}
              </select>
              <ChevronDown size={12} color={t.textMuted} style={{ position: 'absolute', right: 10, pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Umur Piutang Overdue Ranges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace' }}>UMUR PIUTANG (AGING)</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <select
                value={selectedAgeRange}
                onChange={e => setSelectedAgeRange(e.target.value)}
                style={{
                  width: '100%',
                  background: t.inputBg,
                  border: `1px solid ${t.inputBorder}`,
                  borderRadius: 8,
                  padding: '7px 24px 7px 10px',
                  fontSize: 12,
                  outline: 'none',
                  appearance: 'none',
                  color: t.text,
                  cursor: 'pointer'
                }}
              >
                <option value="all">Semua</option>
                <option value="long">Sangat Lama (≥ 45 Hari)</option>
                <option value="medium">Sedang (30 - 44 Hari)</option>
                <option value="short">Baru (&lt; 30 Hari)</option>
                <option value="giro">Giro (Null Overdue)</option>
              </select>
              <ChevronDown size={12} color={t.textMuted} style={{ position: 'absolute', right: 10, pointerEvents: 'none' }} />
            </div>
          </div>

        </div>

      </div>

      {/* ── Table Container ── */}
      <div style={{
        background: t.cardBg, border: `1px solid ${t.borderCard}`, borderRadius: 12,
        boxShadow: t.shadow, overflow: 'hidden'
      }}>
        
        {/* Table Title and Status */}
        <div style={{ padding: '14px 18px border-b', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: t.tableHeadBg, paddingLeft: 18, paddingRight: 18, paddingTop: 12, paddingBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            DAFTAR TRANSAKSI PIUTANG ({filteredData.length} records)
          </span>
          <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', background: t.inputBg, color: t.textSub, padding: '3px 8px', borderRadius: 14, border: `1px solid ${t.border}` }}>
            Outstanding: Rp {formatIDR(metrics.totalOutstanding)}
          </span>
        </div>

        {/* Responsive Table Wrapper */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: t.tableHeadBg, borderBottom: `1px solid ${t.border}` }}>
                {[
                  { label: 'Faktur', key: 'faktur' },
                  { label: 'Kode', key: 'kode' },
                  { label: 'Outlet', key: 'outlet' },
                  { label: 'Kota', key: 'kota' },
                  { label: 'Kecamatan', key: 'kecamatan' },
                  { label: 'Kel/Desa', key: 'kelDesa' },
                  { label: 'Salesman', key: 'salesman' },
                  { label: 'Tanggal', key: 'tanggal' },
                  { label: 'Jatuh Tempo', key: 'jatuhTempo' },
                  { label: 'Hari', key: 'hari', numeric: true },
                  { label: 'Piutang', key: 'piutang', numeric: true },
                  { label: 'Giro', key: 'giro', numeric: true },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key as keyof PiutangRecord)}
                    style={{
                      padding: '11px 14px',
                      fontSize: 10,
                      fontFamily: 'IBM Plex Mono, monospace',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: t.tableHeadText,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      textAlign: col.numeric ? 'right' : 'left',
                      userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: col.numeric ? 'flex-end' : 'flex-start', width: '100%' }}>
                      {col.label}
                      {getSortIcon(col.key as keyof PiutangRecord)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: '40px 10px', textAlign: 'center', fontSize: 12, color: t.textSub, fontFamily: 'IBM Plex Mono, monospace' }}>
                    Tidak ada transaksi piutang yang cocok dengan kriteria filter saat ini.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, idx) => {
                  const isBgAlt = idx % 2 === 1;
                  const rowBg = isBgAlt ? t.rowAlt : 'transparent';
                  return (
                    <tr
                      key={`${row.faktur}-${idx}`}
                      style={{ background: rowBg, transition: 'background 0.1s', borderBottom: `1px solid ${t.border}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = t.rowHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                    >
                      <td style={{ padding: '11px 14px', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: t.text, fontWeight: 600 }}>
                        {row.faktur}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: t.textSub }}>
                        {row.kode}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 12, fontWeight: 700, color: t.text }}>
                        {row.outlet}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 11, color: t.textSub }}>
                        {row.kota}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 11, color: t.textSub }}>
                        {row.kecamatan}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 11, color: t.textSub }}>
                        {row.kelDesa}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 11, color: t.textSub, whiteSpace: 'nowrap' }}>
                        {row.salesman || <span style={{ color: t.textFaint }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: t.textSub, whiteSpace: 'nowrap' }}>
                        {row.tanggal}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: t.textSub, whiteSpace: 'nowrap' }}>
                        {row.jatuhTempo}
                      </td>
                      <td style={{
                        padding: '11px 14px',
                        fontSize: 11,
                        fontFamily: 'IBM Plex Mono, monospace',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: row.hari !== null && row.hari > 4000 ? '#ef4444' : row.hari !== null && row.hari >= 3000 ? '#f59e0b' : t.textSub
                      }}>
                        {row.hari !== null ? formatIDR(row.hari) : <span style={{ color: t.textFaint }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', fontWeight: 700, color: row.piutang > 10000000 ? '#f59e0b' : t.text }}>
                        {row.piutang > 0 ? formatIDR(row.piutang) : <span style={{ color: t.textFaint }}>0</span>}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', fontWeight: 700, color: row.giro > 0 ? '#10b981' : t.textSub }}>
                        {row.giro > 0 ? formatIDR(row.giro) : <span style={{ color: t.textFaint }}>0</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}

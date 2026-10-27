'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Users, Package, Store, Target, CheckCircle, RefreshCw,
  ClipboardList, ClipboardCheck, CircleArrowDown, CircleCheck,
} from 'lucide-react';

import { tk } from './Distribution/theme';
import {
  achColor, fmtN, normalizeResponse,
  EMPTY_DATA, EMPTY_FILTER_OPTIONS, WEEKS_ARR,
} from './Distribution/helpers';
import { KpiCard } from './Distribution/ui';
import DistributionTabs from './Distribution/DistributionTabs';
import type {
  DistributionSectionProps, FilterOptions,
} from './Distribution/types';
export type { DistUIState } from './Distribution/types';

// Main Component
export default function DistributionSection({
  theme = 'dark',
  areas = [],
  areaFilter: areaFromPage = '',
  weekStart: weekStartProp = 1,
  weekEnd:   weekEndProp   = 52,
  onWeekStartChange,
  onWeekEndChange,
  cachedData,
  onDataLoaded,
  loaded    = false,
  loading   = false,
  onLoadingChange,
  uiState,
  onUiStateChange,
}: DistributionSectionProps) {
  const t = tk[theme];

  const weekStart    = weekStartProp;
  const weekEnd      = weekEndProp;
  const setWeekStart = onWeekStartChange ?? (() => {});
  const setWeekEnd   = onWeekEndChange   ?? (() => {});
  const setLoading   = onLoadingChange   ?? (() => {});
  const areaFilter   = areaFromPage;

  // Pulihkan state yang tersimpan di page.tsx, hanya kalau area-nya sama dan datanya lengkap (applied + options sudah pernah disimpan oleh fetch sukses).
  const restored =
    uiState && uiState.area === areaFromPage && uiState.applied && uiState.options
      ? uiState
      : null;

  const [productFilter,    setProductFilter]    = useState(restored?.applied.product    ?? '');
  const [outletTypeFilter, setOutletTypeFilter] = useState(restored?.applied.outletType ?? '');
  const [salesmanFilter,   setSalesmanFilter]   = useState(restored?.salesman           ?? '');

  // Filter lokasi / outlet sama seperti Produk & Tipe Outlet, baru dikirim ke server saat tombol "Terapkan" ditekan.
  const [cityFilter,     setCityFilter]     = useState(restored?.applied.city     ?? '');
  const [districtFilter, setDistrictFilter] = useState(restored?.applied.district ?? '');
  const [villageFilter,  setVillageFilter]  = useState(restored?.applied.village  ?? '');
  const [outletFilter,   setOutletFilter]   = useState(restored?.applied.outlet   ?? '');

  // Snapshot filter yang TERAKHIR SUKSES di fetch (minggu + dropdown Produk/Tipe Outlet/Kota/Kecamatan/Kelurahan/Outlet).
  // Salesman TIDAK masuk sini, difilter di client secara instan, jadi tidak pernah "belum diterapkan".
  const [appliedFilters, setAppliedFilters] = useState(restored?.applied ?? {
    weekStart: weekStartProp,
    weekEnd:   weekEndProp,
    product:   '',
    outletType:'',
    city:      '',
    district:  '',
    village:   '',
    outlet:    '',
  });

  const unapplied = loaded && (
    weekStart         !== appliedFilters.weekStart  ||
    weekEnd           !== appliedFilters.weekEnd    ||
    productFilter     !== appliedFilters.product    ||
    outletTypeFilter  !== appliedFilters.outletType ||
    cityFilter        !== appliedFilters.city       ||
    districtFilter    !== appliedFilters.district   ||
    villageFilter     !== appliedFilters.village    ||
    outletFilter      !== appliedFilters.outlet
  );

  // Dot animasi "mengambil data" saat loading (sinkron dengan filter bar utama)
  const [dotStep, setDotStep] = useState(0);
  useEffect(() => {
    if (loading) {
      const id = setInterval(() => setDotStep(s => (s + 1) % 3), 400);
      return () => clearInterval(id);
    }
  }, [loading]);

  // Dropdown filter (product/outletType/salesman/city/district/village/outlet) tidak dari cachedData saja 
  // kita simpan pilihan opsi dari load PERTAMA (tanpa filter) supaya opsi dropdown tidak menyusut begitu salah satu filter lain aktif.
  const [productOptions,    setProductOptions]    = useState<string[]>(restored?.options.products    ?? []);
  const [outletTypeOptions, setOutletTypeOptions] = useState<string[]>(restored?.options.outletTypes ?? []);
  const [salesmanOptions,   setSalesmanOptions]   = useState<string[]>(restored?.options.salesmen    ?? []);
  const [filterOptions,     setFilterOptions]     = useState<FilterOptions>(restored?.options.geo    ?? EMPTY_FILTER_OPTIONS);

  // Flag LOKAL yang menandai "apakah opsi dropdown sudah terisi", lepas dari state `loaded` milik parent.
  // Kalau state dipulihkan dari page.tsx, opsi sudah ada, jadi dianggap siap.
  const optionsReadyRef = useRef(!!restored);

  // Ref untuk mencegah race condition: kalau user ganti filter dengan cepat, hanya response fetch TERAKHIR yang boleh commit ke state.
  const requestSeq = useRef(0);

  // Reset hanya kalau area benar-benar berganti. Dilewati saat pertama dipasang (termasuk saat kembali dari menu lain) supaya state yang dipulihkan utuh.
  const prevAreaRef = useRef(areaFilter);
  useEffect(() => {
    if (prevAreaRef.current === areaFilter) return;
    prevAreaRef.current = areaFilter;

    setProductFilter('');
    setOutletTypeFilter('');
    setSalesmanFilter('');
    setCityFilter('');
    setDistrictFilter('');
    setVillageFilter('');
    setOutletFilter('');
    setProductOptions([]);
    setOutletTypeOptions([]);
    setSalesmanOptions([]);
    setFilterOptions(EMPTY_FILTER_OPTIONS);
    optionsReadyRef.current = false; // area ganti -> opsi dropdown harus di-fetch ulang
    // reset snapshot juga supaya indikator "Belum diterapkan" tidak salah nyala
    setAppliedFilters({
      weekStart, weekEnd,
      product: '', outletType: '',
      city: '', district: '', village: '', outlet: '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaFilter]);

  // Salesman instan (tidak fetch)
  // simpan ke parent supaya ikut saat pindah menu.
  const handleSalesmanChange = (v: string) => {
    setSalesmanFilter(v);
    onUiStateChange?.({ salesman: v });
  };

  // fetchData: satu-satunya jalur ambil data.
  // Selalu request langsung ke server dengan filter aktif sebagai query param
  // TIDAK ADA agregasi ulang di client.
  // `isInitialLoad` menandai fetch pertama (tanpa filter) supaya opsi dropdown diisi dari situ.
  //
  // Salesman TIDAK dikirim lagi ke server
  // dia difilter di client (lihat AchievementContent & CoverageContent) karena datanya sudah granular per-salesman di semua tabel yang relevan.
  const fetchData = useCallback(async (opts: {
    product?:    string;
    outletType?: string;
    city?:       string;
    district?:   string;
    village?:    string;
    outlet?:     string;
    isInitialLoad?: boolean;
  } = {}) => {
    if (!areaFilter) return;

    const mySeq = ++requestSeq.current;
    setLoading(true);
    try {
      const p = new URLSearchParams({ weekStart: String(weekStart), weekEnd: String(weekEnd) });
      p.append('area', areaFilter);
      if (opts.product)    p.append('product',    opts.product);
      if (opts.outletType) p.append('outletType', opts.outletType);
      if (opts.city)       p.append('city',       opts.city);
      if (opts.district)   p.append('district',   opts.district);
      if (opts.village)    p.append('village',    opts.village);
      if (opts.outlet)     p.append('outlet',     opts.outlet);

      const r = await fetch(`/api/distribution?${p}`);
      if (!r.ok) return;
      const j = await r.json();
      if (!j.success) return;

      // Kalau ada fetch lebih baru yang sudah jalan, buang hasil yang telat ini.
      if (mySeq !== requestSeq.current) return;

      const data = normalizeResponse(j.data);

      const applied = {
        weekStart, weekEnd,
        product:    opts.product    ?? '',
        outletType: opts.outletType ?? '',
        city:       opts.city       ?? '',
        district:   opts.district   ?? '',
        village:    opts.village    ?? '',
        outlet:     opts.outlet     ?? '',
      };

      if (opts.isInitialLoad) {
        const options = {
          products: Array.from(new Set(data.achievementProduct.map(r => r.product).filter(Boolean))).sort() as string[],
          outletTypes: Array.from(new Set(data.outletCountByType.map(r => r.outlet_type).filter(Boolean))).sort() as string[],
          salesmen: Array.from(new Set(data.achievementSalesman.map(r => r.salesman).filter(Boolean))).sort() as string[],
          geo: data.filterOptions ?? EMPTY_FILTER_OPTIONS,
        };
        setProductOptions(options.products);
        setOutletTypeOptions(options.outletTypes);
        setSalesmanOptions(options.salesmen);
        setFilterOptions(options.geo);
        optionsReadyRef.current = true;

        // Load pertama (atau setelah ganti area): simpan state lengkap ke parent.
        // Salesman pasti kosong di titik ini karena dropdown-nya baru muncul setelah opsi terisi.
        onUiStateChange?.({ area: areaFilter, applied, salesman: '', options });
      } else {
        // Opsi sudah tersimpan di parent, cukup perbarui filter yang diterapkan.
        onUiStateChange?.({ area: areaFilter, applied });
      }

      onDataLoaded?.(data);
      // Snapshot disimpan HANYA setelah fetch sukses → sumber kebenaran untuk indikator "Belum diterapkan".
      setAppliedFilters(applied);
    } finally {
      if (mySeq === requestSeq.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, weekEnd, areaFilter, onDataLoaded, onUiStateChange, setLoading]);

  // Tombol "Terapkan" -> SATU-SATUNYA pemicu fetch untuk minggu maupun filter dropdown Produk / Tipe Outlet / Kota / Kecamatan / Kelurahan / Outlet.
  // Salesman TIDAK dikirim di sini — dia sudah aktif secara instan begitu dipilih (lihat salesmanFilter yang diteruskan langsung ke DistributionTabs di bawah).
  //
  // `isInitialLoad` cuma true di load PERTAMA (saat opsi belum pernah terisi),
  // supaya opsi dropdown diisi dari situ dan tidak menyusut/reset tiap kali "Terapkan" ditekan ulang dengan filter aktif.
  const loadData = useCallback(() => {
    fetchData({
      product:       productFilter    || undefined,
      outletType:    outletTypeFilter || undefined,
      city:          cityFilter       || undefined,
      district:      districtFilter   || undefined,
      village:       villageFilter    || undefined,
      outlet:        outletFilter.trim() || undefined,
      isInitialLoad: !optionsReadyRef.current,
    });
  }, [fetchData, productFilter, outletTypeFilter, cityFilter, districtFilter, villageFilter, outletFilter]);

  const data = cachedData ?? EMPTY_DATA;

  // KPI summary. Kalau salesman dipilih, dihitung ulang dari tabel yang sudah granular per-salesman.
  const s = useMemo(() => {
    const base = data.summary;
    if (!salesmanFilter) return base;

    const sp  = data.achievementSalesmanProduct.filter(r => r.salesman === salesmanFilter);
    const sal = data.achievementSalesman.find(r => r.salesman === salesmanFilter);
    const sum = (k: 'total_plan' | 'total_actual' | 'total_av_in' | 'total_ec' | 'total_av_out') =>
      sp.reduce((acc, r) => acc + (r[k] ?? 0), 0);

    const plan  = sum('total_plan');
    const avOut = sum('total_av_out');

    return {
      ...base,
      total_plan:          plan,
      total_actual:        sum('total_actual'),
      total_av_in:         sum('total_av_in'),
      total_ec:            sum('total_ec'),
      total_av_out:        avOut,
      total_outlets:       sal?.outlet_count ?? 0,
      total_customers:     sal?.outlet_count ?? 0,
      total_salesmen:      sp.length ? 1 : 0,
      total_products:      new Set(sp.map(r => r.product)).size,
      overall_achievement: plan > 0 ? (avOut / plan) * 100 : 0,
    };
  }, [data, salesmanFilter]);

  const selectStyle = (active: boolean) => ({
    height: 26, padding: '0 6px',
    background: active ? t.tabActive : t.inputBg,
    border: `1px solid ${active ? '#1c9706' : t.inputBorder}`,
    borderRadius: 5, color: active ? t.tabActiveText : t.text,
    fontSize: 10, fontFamily: 'IBM Plex Mono,monospace',
    outline: 'none', maxWidth: 160, transition: 'all 0.15s',
  });

  const clearBtnStyle = {
    height: 26, width: 26, borderRadius: 5,
    background: t.negBg, border: `1px solid ${t.negBorder}`,
    color: t.negText, fontSize: 14, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'IBM Plex Mono,monospace', flexShrink: 0,
  } as const;

  const divider    = <div style={{ width: 1, height: 16, background: t.border, margin: '0 2px' }} />;
  const labelStyle = { fontSize: 9, color: t.textMuted, fontFamily: 'IBM Plex Mono,monospace' };

  // Dropdown generik untuk filter Kota / Kecamatan / Kelurahan.
  const renderGeoSelect = (
    label: string,
    value: string,
    setValue: (v: string) => void,
    options: string[],
    allLabel: string,
  ) => {
    if (options.length === 0) return null;
    return (
      <>
        {divider}
        <span style={labelStyle}>{label}</span>
        <select value={value} onChange={e => setValue(e.target.value)} style={selectStyle(!!value)}>
          <option value="" style={{ background: t.selectBg }}>{allLabel}</option>
          {options.map(o => <option key={o} value={o} style={{ background: t.selectBg }}>{o}</option>)}
        </select>
        {value && (
          <button onClick={() => setValue('')} title={`Reset filter ${label.toLowerCase()}`} style={clearBtnStyle}>×</button>
        )}
      </>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: 'IBM Plex Sans,sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fbPulseDot { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div />

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={labelStyle}>Minggu</span>
          <select value={weekStart} onChange={e => setWeekStart(+e.target.value)}
            style={{ height: 26, padding: '0 6px', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 5, color: t.text, fontSize: 10, fontFamily: 'IBM Plex Mono,monospace', outline: 'none' }}>
            {WEEKS_ARR.map(w => <option key={w} value={w} style={{ background: t.selectBg }}>W{w}</option>)}
          </select>
          <span style={labelStyle}>—</span>
          <select value={weekEnd} onChange={e => setWeekEnd(+e.target.value)}
            style={{ height: 26, padding: '0 6px', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 5, color: t.text, fontSize: 10, fontFamily: 'IBM Plex Mono,monospace', outline: 'none' }}>
            {WEEKS_ARR.map(w => <option key={w} value={w} style={{ background: t.selectBg }}>W{w}</option>)}
          </select>

          {loaded && productOptions.length > 0 && (
            <>
              {divider}
              <span style={labelStyle}>Produk</span>
              <select value={productFilter} onChange={e => setProductFilter(e.target.value)} style={selectStyle(!!productFilter)}>
                <option value="" style={{ background: t.selectBg }}>Semua Produk</option>
                {productOptions.map(p => <option key={p} value={p} style={{ background: t.selectBg }}>{p}</option>)}
              </select>
              {productFilter && (
                <button onClick={() => setProductFilter('')} title="Reset filter produk" style={clearBtnStyle}>×</button>
              )}
            </>
          )}

          {loaded && outletTypeOptions.length > 0 && (
            <>
              {divider}
              <span style={labelStyle}>Tipe Outlet</span>
              <select value={outletTypeFilter} onChange={e => setOutletTypeFilter(e.target.value)} style={selectStyle(!!outletTypeFilter)}>
                <option value="" style={{ background: t.selectBg }}>Semua Tipe</option>
                {outletTypeOptions.map(o => <option key={o} value={o} style={{ background: t.selectBg }}>{o}</option>)}
              </select>
              {outletTypeFilter && (
                <button onClick={() => setOutletTypeFilter('')} title="Reset filter tipe outlet" style={clearBtnStyle}>×</button>
              )}
            </>
          )}

          {/* Filter: Kota · Kecamatan · Kelurahan · Outlet */}
          {loaded && renderGeoSelect('Kota',      cityFilter,     setCityFilter,     filterOptions.cities,    'Semua Kota')}
          {loaded && renderGeoSelect('Kecamatan', districtFilter, setDistrictFilter, filterOptions.districts, 'Semua Kecamatan')}
          {loaded && renderGeoSelect('Kelurahan', villageFilter,  setVillageFilter,  filterOptions.villages,  'Semua Kelurahan')}

          {loaded && filterOptions.outlets.length > 0 && (
            <>
              {divider}
              <span style={labelStyle}>Outlet</span>
              <input
                list="distribution-outlet-options"
                value={outletFilter}
                onChange={e => setOutletFilter(e.target.value)}
                placeholder="Cari outlet"
                style={{ ...selectStyle(!!outletFilter), width: 150, maxWidth: 150 }}
              />
              <datalist id="distribution-outlet-options">
                {filterOptions.outlets.map(o => <option key={o} value={o} />)}
              </datalist>
              {outletFilter && (
                <button onClick={() => setOutletFilter('')} title="Reset filter outlet" style={clearBtnStyle}>×</button>
              )}
            </>
          )}

          {loaded && salesmanOptions.length > 0 && (
            <>
              {divider}
              <span style={labelStyle}>Salesman</span>
              <select value={salesmanFilter} onChange={e => handleSalesmanChange(e.target.value)} style={selectStyle(!!salesmanFilter)}>
                <option value="" style={{ background: t.selectBg }}>Semua Salesman</option>
                {salesmanOptions.map(sm => <option key={sm} value={sm} style={{ background: t.selectBg }}>{sm}</option>)}
              </select>
              {salesmanFilter && (
                <button onClick={() => handleSalesmanChange('')} title="Reset filter salesman" style={clearBtnStyle}>×</button>
              )}
              <span style={{ ...labelStyle, fontSize: 8, opacity: 0.7 }}>(instan)</span>
            </>
          )}

          {/* Indikator status: dot animasi saat loading, atau "Belum diterapkan" saat filter berubah */}
          {loading ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 4, height: 4, borderRadius: '50%', background: '#4ade80',
                    transition: 'opacity 0.2s', opacity: i === dotStep ? 1 : 0.25,
                  }} />
                ))}
              </div> 
              <div style={{
                fontSize: 9, fontFamily: 'IBM Plex Mono,monospace', color: '#4ade80', letterSpacing: '0.06em',
                background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
                borderRadius: 3, padding: '0 6px', height: 16, display: 'flex', alignItems: 'center',
              }}>
                mengambil data
              </div>
            </div>
          ) : unapplied ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: t.warnBg, border: `1px solid ${t.warnBorder}`,
              borderRadius: 3, padding: '0 7px', height: 18,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: t.warnText, animation: 'fbPulseDot 1.3s ease-in-out infinite' }} />
              <span style={{ fontSize: 9, fontFamily: 'monospace', color: t.warnText, fontWeight: 700, letterSpacing: '0.02em' }}>Belum diterapkan</span>
            </div>
          ) : null}

          <div style={{ position: 'relative' }}>
            <button onClick={loadData} disabled={loading}
              style={{ height: 26, padding: '0 12px', borderRadius: 5, background: '#1c9706', border: 'none', color: '#fff', fontSize: 10, fontWeight: 700, fontFamily: 'IBM Plex Mono,monospace', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 5 }}>
              {loading && <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} />}
              {loading ? 'Memuat...' : 'Terapkan'}
            </button>
            {unapplied && !loading && (
              <span style={{ position: 'absolute', top: -3, right: -3, width: 7, height: 7, borderRadius: '50%', background: t.warnText, border: `1.5px solid ${t.cardBg}` }} />
            )}
          </div>
        </div>
      </div>

      {!loaded && !loading && (
        <div style={{ padding: '32px', textAlign: 'center', background: t.cardBg, border: `1px solid ${t.borderCard}`, borderRadius: 12, color: t.textMuted, fontSize: 12, fontFamily: 'IBM Plex Mono,monospace', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <Target size={28} color={t.textFaint} />
          <div>
            <div style={{ fontWeight: 700, color: t.textSub, marginBottom: 4 }}>Data belum dimuat</div>
            <div style={{ fontSize: 11 }}>Atur filter minggu di atas lalu klik <b style={{ color: t.text }}>Terapkan</b> untuk memuat data distribusi.</div>
          </div>
        </div>
      )}

      {loaded && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            <KpiCard label="Total Plan"          value={fmtN(s.total_plan)}                     sub="Plan distribusi"   icon={ClipboardList}   color="#3b82f6" theme={theme} />
            <KpiCard label="Total Actual"        value={fmtN(s.total_actual)}                   sub="Aktual distribusi" icon={ClipboardCheck}  color="#10b981" theme={theme} />
            <KpiCard label="Total Av-In"         value={fmtN(s.total_av_in)}                    sub="Av-In"             icon={CircleArrowDown} color="#3b82f6" theme={theme} />
            <KpiCard label="EC"                  value={fmtN(s.total_ec)}                       sub="Effective Call"    icon={CircleCheck}     color="#0d9488" theme={theme} />
            <KpiCard label="Total Av-Out"        value={fmtN(s.total_av_out)}                   sub="Av-Out"            icon={CheckCircle}     color="#10b981" theme={theme} />
            <KpiCard label="Total Outlet"        value={fmtN(s.total_outlets)}                  sub="Outlet terjangkau" icon={Store}           color="#3b82f6" theme={theme} />
            <KpiCard label="Total Salesman"      value={fmtN(s.total_salesmen)}                 sub="Salesman aktif"    icon={Users}           color="#8b5cf6" theme={theme} />
            <KpiCard label="Total Produk"        value={fmtN(s.total_products)}                 sub="terdistribusi"     icon={Package}         color="#f59e0b" theme={theme} />
            <KpiCard label="Overall Achievement" value={`${s.overall_achievement.toFixed(1)}%`} sub="Av-Out / Plan"     icon={Target}          color={achColor(s.overall_achievement)} theme={theme} />
          </div>

          <DistributionTabs
            data={data}
            theme={theme}
            salesmanFilter={salesmanFilter}
            weekStart={appliedFilters.weekStart}
            weekEnd={appliedFilters.weekEnd}
          />
        </>
      )}
    </div>
  );
}
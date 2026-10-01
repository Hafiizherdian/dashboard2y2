/**
 * Database utilities untuk dashboard
 * Fungsi untuk fetch dan process data dari PostgreSQL
 *
 * File ini adalah entry point module `databasev2` (dipanggil sebagai
 * `@/lib/databasev2` dari API routes). Isinya cuma orchestrator:
 * jalankan streaming sales records + target queries secara paralel,
 * lalu delegasikan agregasi ke generator-generator di file terpisah:
 *   - dateUtils.ts        → parsing tanggal & resolusi ISO week
 *   - streamSales.ts      → streaming query sales_records (pg-cursor)
 *   - targetQueries.ts    → query target_data (per area/produk/kuartal)
 *   - piutangQueries.ts   → query piutang_records
 *   - quarterlyData.ts    → generateQuarterlyData (target vs actual)
 *   - quarterlyYoY.ts     → generateQuarterlyYoYData (actual vs actual)
 *   - l4wc4w.ts           → generateL4WC4WData + generateProductL4WC1WData
 *   - aggregationUtils.ts → buildByWeekMap, getOmzetValue, getUnitValue
 *   - emptyData.ts        → fallback data kosong
 *   - types.ts            → tipe internal (FetchFilters, UnitAgg, dst)
 *
 * CATATAN PERIODE:
 * Agregasi utama sekarang dipisah per PERIODE (P1 / P2), bukan per tahun,
 * supaya perbandingan tahun yang sama dengan week berbeda (mis. 2026 W5-7
 * vs 2026 W8-9) tidak saling menimpa. Map lama yang berbasis tahun
 * (weekProductMap, omzetByProductWeek) tetap ada untuk generator L4W
 * yang belum period-aware.
 * SUMPAH COK AKU YO MUMET NGERJAKNO IKI WKWKWKW
 */

import {
  SalesData, WeeklySales, WeekComparison,
  YearOnYearGrowth, ComparisonWeeks,
  WeekComparisonProductDetail, OutletSalesData,
} from '@/types/sales';

import { parseDateLocal, resolveWeekYear } from './dateUtils';
import { streamSalesRecords } from './streamSales';
import { resolveTargetAreas, fetchTargetQueriesParallel } from './targetQueries';
import { fetchPiutangData } from './piutangQueries';
import { generateQuarterlyData } from './quarterlyData';
import { generateQuarterlyYoYData } from './quarterlyYoY';
import { generateL4WC4WData } from './l4wc4w';
import { buildByWeekMap } from './aggregationUtils';
import {
  generateEmptyQuarterlyData,
  generateEmptyQuarterlyYoYData,
  generateEmptyL4WC4WData,
  generateEmptyYearOnYearGrowth,
  generateEmptyComparisonWeeks,
} from './emptyData';
import { getProductCategory } from '../productCategories';
import { FetchFilters, UnitAgg, OutletAgg, TargetQueriesResult } from './types';

export type { FetchFilters };

const OMZET_SCALE = 1;

type Period = 1 | 2;

// Key agregasi per periode: "<periode>|<week>|<produk>"
const pk = (p: Period, week: number, product: string) => `${p}|${week}|${product}`;

const addUnitAgg = (
  map: Map<string, UnitAgg>, key: string,
  bks: number, slop: number, bal: number, dos: number,
) => {
  const e = map.get(key);
  if (e) {
    e.bks += bks; e.slop += slop; e.bal += bal; e.dos += dos;
  } else {
    map.set(key, { bks, slop, bal, dos });
  }
};

export async function fetchSalesData(filters?: FetchFilters): Promise<SalesData> {
  try {
    console.log('fetchSalesData - Filter diterima:', JSON.stringify(filters));

    // Jalankan parallel: sales records + piutang
    const [salesResult, piutangList] = await Promise.all([
      processSalesRecords(filters),
      fetchPiutangData(filters),
    ]);

    console.log(`piutangList: ${piutangList.length} records`);

    return {
      ...salesResult,
      piutangList,
    };
  } catch (error) {
    console.error('Error fetching sales data:', error);
    return {
      weeklyData:       [],
      quarterlyData:    generateEmptyQuarterlyData(),
      QuarterlyYoYData: generateEmptyQuarterlyYoYData(),
      weekComparisons:  [],
      l4wc4wData:       generateEmptyL4WC4WData(),
      yearOnYearGrowth: generateEmptyYearOnYearGrowth(),
      comparisonYears:  { previousYear: null, currentYear: null },
      comparisonWeeks:  generateEmptyComparisonWeeks(),
      outletData:       [],
      piutangList:      [],
    };
  }
}

async function processSalesRecords(filters?: FetchFilters): Promise<SalesData> {
  const areaId       = filters?.area;
  const selectedUnit = filters?.selectedUnit || 'units_dos';

  const clampWeek = (w: number) => Math.max(1, Math.min(52, w));

  const year1 = filters?.year1;
  const year2 = filters?.year2;

  const preRangeYear1: { start: number; end: number } | null =
    (filters?.weekStart1 !== undefined || filters?.weekEnd1 !== undefined)
      ? { start: clampWeek(filters?.weekStart1 ?? 1), end: clampWeek(filters?.weekEnd1 ?? 52) }
      : null;

  const preRangeYear2: { start: number; end: number } | null =
    (filters?.weekStart2 !== undefined || filters?.weekEnd2 !== undefined)
      ? { start: clampWeek(filters?.weekStart2 ?? 1), end: clampWeek(filters?.weekEnd2 ?? 52) }
      : null;

  const fmtRange = (r: { start: number; end: number } | null) => r ? `W${r.start}-W${r.end}` : 'all';
  console.log(`\n [PRE-RANGE] P1 year1=${year1} range=${fmtRange(preRangeYear1)} | P2 year2=${year2} range=${fmtRange(preRangeYear2)}`);

  // Map lama (berbasis tahun) dipakai generator L4W
  const weekProductMap     = new Map<string, UnitAgg>();   // union P1 ∪ P2, tiap record sekali
  const omzetByProductWeek = new Map<string, number>();
  const weekYearSet        = new Map<number, Set<number>>();

  // Khusus P2 (format key sama dgn map lama) — untuk Kuartal Target
  const p2WeekProductMap     = new Map<string, UnitAgg>();
  const p2OmzetByProductWeek = new Map<string, number>();

  // Map baru (berbasis periode)
  const periodWeekProductMap = new Map<string, UnitAgg>();
  const periodOmzet          = new Map<string, number>();
  const periodWeeks: Record<Period, Set<number>> = { 1: new Set(), 2: new Set() };
  const periodUnitTotal: Record<Period, number>  = { 1: 0, 2: 0 };

  const allProductsSet = new Set<string>();
  const outletAggMap   = new Map<string, OutletAgg>();

  let crossYearCount    = 0;
  let totalRecordCount  = 0;
  let filteredOutByWeek = 0;
  let boundaryDosTotal  = 0;

  const requestedISOYears = new Set<number>();
  if (filters?.year1 !== undefined) requestedISOYears.add(filters.year1);
  if (filters?.year2 !== undefined) requestedISOYears.add(filters.year2);

  // Record boleh masuk P1 dan/atau P2 (kalau range-nya overlap, masuk keduanya).
  // Tanpa filter tahun sama sekali → semua record dianggap P2 (perilaku tunggal).
  const noYearFilter = year1 === undefined && year2 === undefined;
  const inPeriod = (p: Period, isoYear: number, isoWeek: number): boolean => {
    if (noYearFilter) return p === 2;
    const y = p === 1 ? year1 : year2;
    const r = p === 1 ? preRangeYear1 : preRangeYear2;
    if (y === undefined || isoYear !== y) return false;
    return r === null || (isoWeek >= r.start && isoWeek <= r.end);
  };

  const targetAreasPromise = resolveTargetAreas(filters?.area, filters?.allowedAreas);

  const effectiveYearForTargets = year2 ?? year1;

  const targetQueriesPromise: Promise<TargetQueriesResult | null> = effectiveYearForTargets !== undefined
    ? targetAreasPromise.then(targetAreas => {
        if (targetAreas.length === 0) {
          console.log(`[target] Tidak ada area untuk di-query target`);
          return null;
        }
        console.log(`[target] Fetching untuk ${targetAreas.length} area: [${targetAreas.join(', ')}]`);
        return fetchTargetQueriesParallel(targetAreas, effectiveYearForTargets);
      })
    : Promise.resolve(null);

  await Promise.all([
    streamSalesRecords(filters, (batch) => {
      for (const record of batch) {
        totalRecordCount++;

        const { month, day } = parseDateLocal(record.date);
        const rawDbWeek      = Number(record.week);
        const resolved       = resolveWeekYear(record);
        const isoYear        = resolved.year;
        const isoWeek        = resolved.week;
        const rawDateYear    = parseDateLocal(record.date).year;

        if (isoYear !== rawDateYear || isoWeek !== rawDbWeek) crossYearCount++;

        if (requestedISOYears.size > 0 && !requestedISOYears.has(isoYear)) {
          if ((month === 11 && day >= 28) || (month === 0 && day <= 3)) {
            console.log(`[BOUNDARY-SKIP] isoYear=${isoYear} tidak ada di requestedISOYears=${[...requestedISOYears]}`);
          }
          continue;
        }

        const inP1 = inPeriod(1, isoYear, isoWeek);
        const inP2 = inPeriod(2, isoYear, isoWeek);

        if (!inP1 && !inP2) {
          filteredOutByWeek++;
          continue;
        }

        if (!weekYearSet.has(isoYear)) weekYearSet.set(isoYear, new Set());
        weekYearSet.get(isoYear)!.add(isoWeek);

        const product = record.product || 'Produk Tidak Diketahui';
        allProductsSet.add(product);

        const bks  = Number(record.units_bks)  || 0;
        const slop = Number(record.units_slop) || 0;
        const bal  = Number(record.units_bal)  || 0;
        const dos  = Number(record.units_dos)  || 0;
        const omz  = (() => {
          const raw     = record.omzet;
          const numeric = typeof raw === 'number' ? raw : parseFloat(raw ?? '0');
          return Number.isFinite(numeric) ? numeric * OMZET_SCALE : 0;
        })();

        if ((month === 11 && day >= 28) || (month === 0 && day <= 3)) {
          boundaryDosTotal += dos;
        }

        // Map lama (berbasis tahun), tiap record dihitung SEKALI
        const wpKey = `${isoYear}-${isoWeek}-${product}`;
        addUnitAgg(weekProductMap, wpKey, bks, slop, bal, dos);
        omzetByProductWeek.set(wpKey, (omzetByProductWeek.get(wpKey) || 0) + omz);

        // Gabung P1 dan P2 jika tahunnya sama
        const isQuarterlyTarget = inP2 || (year1 === year2 && inP1);

        if (isQuarterlyTarget) {
          addUnitAgg(p2WeekProductMap, wpKey, bks, slop, bal, dos);
          p2OmzetByProductWeek.set(wpKey, (p2OmzetByProductWeek.get(wpKey) || 0) + omz);
        }

        const unitVal = selectedUnit === 'omzet'      ? omz
                      : selectedUnit === 'units_bks'  ? bks
                      : selectedUnit === 'units_slop' ? slop
                      : selectedUnit === 'units_bal'  ? bal
                      : dos;

        // Info outlet (dihitung sekali per record)
        const outletType  = record.customer_type || 'Tipe Customer tidak diketahui';
        const category    = getProductCategory(product);
        const customer    = record.customer    || 'Unknown';
        const customer_no = record.customer_no || '';
        let city     = (record.city     || '').trim() || 'Tidak diketahui';
        let district = (record.district || '').trim() || 'Tidak diketahui';
        const area   = (record.area     || '').trim();

        if ((city === 'Unknown' || district === 'Unknown') && area.length > 0) {
          if (area.includes(',')) {
            const parts = area.split(',').map((p: string) => p.trim());
            if (district === 'Unknown' && parts[0]) district = parts[0];
            if (city     === 'Unknown' && parts[1]) city     = parts[1];
          } else if (city === 'Unknown') {
            city = area;
          }
        }

        const village  = record.village  || 'Unknown';
        const salesman = record.salesman || 'Unknown';

        const customerKey = customer_no ? `${customer_no}||${customer}` : `||${customer}`;

        // Agregasi per periode
        const periods: Period[] = [];
        if (inP1) periods.push(1);
        if (inP2) periods.push(2);

        for (const p of periods) {
          const key = pk(p, isoWeek, product);
          addUnitAgg(periodWeekProductMap, key, bks, slop, bal, dos);
          periodOmzet.set(key, (periodOmzet.get(key) || 0) + omz);
          periodWeeks[p].add(isoWeek);
          periodUnitTotal[p] += unitVal;

          const outletKey      = `${p}|${isoYear}|${outletType}|${category}|${product}|${customerKey}`;
          const existingOutlet = outletAggMap.get(outletKey);
          if (existingOutlet) {
            existingOutlet.dozNet    += dos;
            existingOutlet.unitsBks  += bks;
            existingOutlet.unitsSlop += slop;
            existingOutlet.unitsBal  += bal;
            existingOutlet.omzet     += omz;
            existingOutlet.weeklyDozNet[isoWeek]    = (existingOutlet.weeklyDozNet[isoWeek]    ?? 0) + dos;
            existingOutlet.weeklyUnitsBks[isoWeek]  = (existingOutlet.weeklyUnitsBks[isoWeek]  ?? 0) + bks;
            existingOutlet.weeklyUnitsSlop[isoWeek] = (existingOutlet.weeklyUnitsSlop[isoWeek] ?? 0) + slop;
            existingOutlet.weeklyUnitsBal[isoWeek]  = (existingOutlet.weeklyUnitsBal[isoWeek]  ?? 0) + bal;
            existingOutlet.weeklyOmzet[isoWeek]     = (existingOutlet.weeklyOmzet[isoWeek]     ?? 0) + omz;
            if (isoWeek < existingOutlet.weekMin) existingOutlet.weekMin = isoWeek;
            if (isoWeek > existingOutlet.weekMax) existingOutlet.weekMax = isoWeek;
          } else {
            outletAggMap.set(outletKey, {
              dozNet: dos, unitsBks: bks, unitsSlop: slop, unitsBal: bal, omzet: omz,
              weeklyDozNet:    { [isoWeek]: dos },
              weeklyUnitsBks:  { [isoWeek]: bks },
              weeklyUnitsSlop: { [isoWeek]: slop },
              weeklyUnitsBal:  { [isoWeek]: bal },
              weeklyOmzet:     { [isoWeek]: omz },
              city, district, village, salesman, customer_no,
              year: isoYear, period: p, outletType, category, product, customer,
              weekMin: isoWeek, weekMax: isoWeek,
            });
          }
        }
      }
    }),
    targetQueriesPromise,
  ]);

  console.log(`\n [STEP-1] Streaming selesai: ${totalRecordCount} total records`);
  console.log(`   ISO cross-year remap: ${crossYearCount} records`);
  console.log(`   Filtered out by week range: ${filteredOutByWeek} records`);
  console.log(`   Records masuk agregasi: ${totalRecordCount - filteredOutByWeek} records`);
  console.log(`   outletAggMap size: ${outletAggMap.size}`);
  console.log(`   weekProductMap size: ${weekProductMap.size}`);
  console.log(`   periodWeekProductMap size: ${periodWeekProductMap.size}`);
  console.log(`   allProductsSet size: ${allProductsSet.size}`);
  console.log(`   Fetched ${totalRecordCount} records dari DB`);

  if (totalRecordCount === 0) {
    return {
      weeklyData:       [],
      quarterlyData:    generateEmptyQuarterlyData(),
      QuarterlyYoYData: generateEmptyQuarterlyYoYData(),
      weekComparisons:  [],
      l4wc4wData:       generateEmptyL4WC4WData(),
      yearOnYearGrowth: generateEmptyYearOnYearGrowth(),
      comparisonYears:  { previousYear: null, currentYear: null },
      comparisonWeeks:  generateEmptyComparisonWeeks(),
      outletData:       [],
    };
  }

  const sortedYears: number[] = [];
  weekYearSet.forEach((_, year) => sortedYears.push(year));
  sortedYears.sort((a, b) => a - b);

  const currentYear  = filters?.year2  ?? sortedYears[sortedYears.length - 1];
  const previousYear = filters?.year1  ?? (sortedYears.length > 1 ? sortedYears[sortedYears.length - 2] : currentYear);
  const comparisonYears = {
    previousYear: previousYear ?? null,
    currentYear:  currentYear  ?? null,
  };

  const getWeekRange = (weeks: Set<number>): { start: number; end: number } | null => {
    if (weeks.size === 0) return null;
    let minWeek = Infinity;
    let maxWeek = -Infinity;
    weeks.forEach(w => {
      if (w < minWeek) minWeek = w;
      if (w > maxWeek) maxWeek = w;
    });
    if (!isFinite(minWeek)) return null;
    return { start: minWeek, end: maxWeek };
  };

  const dataRangeP1 = getWeekRange(periodWeeks[1]);
  const dataRangeP2 = getWeekRange(periodWeeks[2]);

  const previousYearWeekRange: { start: number; end: number } | null =
    previousYear !== undefined
      ? (preRangeYear1 ?? dataRangeP1 ?? { start: 1, end: 52 })
      : null;

  const currentYearWeekRange: { start: number; end: number } | null =
    currentYear !== undefined
      ? (preRangeYear2 ?? dataRangeP2 ?? { start: 1, end: 52 })
      : null;

  console.log(`\n [STEP-2] Week ranges:`);
  console.log(`   Data range P1 (year=${previousYear}): [${dataRangeP1?.start ?? '-'} - ${dataRangeP1?.end ?? '-'}]`);
  console.log(`   Data range P2 (year=${currentYear}):  [${dataRangeP2?.start ?? '-'} - ${dataRangeP2?.end ?? '-'}]`);
  console.log(`   Final range P1: [${previousYearWeekRange?.start ?? '-'} - ${previousYearWeekRange?.end ?? '-'}] ${preRangeYear1 ? '(dari filter)' : '(dari data)'}`);
  console.log(`   Final range P2: [${currentYearWeekRange?.start ?? '-'} - ${currentYearWeekRange?.end ?? '-'}] ${preRangeYear2 ? '(dari filter)' : '(dari data)'}`);

  const comparisonWeeks: ComparisonWeeks = {
    previousYear: previousYearWeekRange,
    currentYear:  currentYearWeekRange,
  };

  // Pergeseran minggu: kalau kedua range eksplisit dan start-nya beda (mis. P1 W5-7 vs P2 W8-9 → shift 3), 
  // minggu dipasangkan berdasarkan urutan: W5↔W8, W6↔W9, W7↔W10. 
  // lah lek semisal start sama / gaonok filter dadi shift 0 (dipasangkan berdasarkan nomor minggu, sama seperti sebelumnya).
  const weekShift = (preRangeYear1 && preRangeYear2) ? preRangeYear2.start - preRangeYear1.start : 0;
  console.log(`   Week shift P1→P2: ${weekShift}`);

  const getAgg = (p: Period, week: number, product: string): UnitAgg =>
    periodWeekProductMap.get(pk(p, week, product)) ?? { bks: 0, slop: 0, bal: 0, dos: 0 };

  const getUnitFromAgg = (agg: UnitAgg, p: Period, week: number, product: string): number => {
    if (selectedUnit === 'omzet') return periodOmzet.get(pk(p, week, product)) ?? 0;
    if (selectedUnit === 'units_bks')  return agg.bks;
    if (selectedUnit === 'units_slop') return agg.slop;
    if (selectedUnit === 'units_bal')  return agg.bal;
    return agg.dos;
  };

  const weeklyData: WeeklySales[]         = [];
  const weekComparisons: WeekComparison[] = [];

  // Sumbu minggu memakai penomoran P2: minggu P1 digeser sebesar weekShift.
  const axisWeeks = new Set<number>();
  periodWeeks[2].forEach(w => axisWeeks.add(w));
  periodWeeks[1].forEach(w => axisWeeks.add(w + weekShift));

  const sortedWeeks: number[] = [];
  axisWeeks.forEach(w => sortedWeeks.push(w));
  sortedWeeks.sort((a, b) => a - b);

  type ProductTotals = {
    previous: number; current: number;
    units_bks:  { previous: number; current: number };
    units_slop: { previous: number; current: number };
    units_bal:  { previous: number; current: number };
    units_dos:  { previous: number; current: number };
    omzet:      { previous: number; current: number };
  };

  const productTotalsMap = new Map<string, ProductTotals>();
  allProductsSet.forEach(product => {
    productTotalsMap.set(product, {
      previous: 0, current: 0,
      units_bks:  { previous: 0, current: 0 },
      units_slop: { previous: 0, current: 0 },
      units_bal:  { previous: 0, current: 0 },
      units_dos:  { previous: 0, current: 0 },
      omzet:      { previous: 0, current: 0 },
    });
  });

  const weeklySeen = new Set<string>(); // hindari entry weeklyData ganda (tahun+minggu sama)

  for (const week of sortedWeeks) {
    const prevWeek = week - weekShift;

    productTotalsMap.forEach(t => {
      t.previous = 0; t.current = 0;
      t.units_bks.previous  = 0; t.units_bks.current  = 0;
      t.units_slop.previous = 0; t.units_slop.current = 0;
      t.units_bal.previous  = 0; t.units_bal.current  = 0;
      t.units_dos.previous  = 0; t.units_dos.current  = 0;
      t.omzet.previous      = 0; t.omzet.current      = 0;
    });

    let prevYearSales = 0;
    let currYearSales = 0;

    if (periodWeeks[1].has(prevWeek)) {
      for (const product of allProductsSet) {
        const agg    = getAgg(1, prevWeek, product);
        const totals = productTotalsMap.get(product)!;
        const uval   = getUnitFromAgg(agg, 1, prevWeek, product);
        totals.previous              += uval;
        totals.units_bks.previous    += agg.bks;
        totals.units_slop.previous   += agg.slop;
        totals.units_bal.previous    += agg.bal;
        totals.units_dos.previous    += agg.dos;
        totals.omzet.previous        += periodOmzet.get(pk(1, prevWeek, product)) ?? 0;
        prevYearSales                += uval;
      }
    }

    if (periodWeeks[2].has(week)) {
      for (const product of allProductsSet) {
        const agg    = getAgg(2, week, product);
        const totals = productTotalsMap.get(product)!;
        const uval   = getUnitFromAgg(agg, 2, week, product);
        totals.current             += uval;
        totals.units_bks.current   += agg.bks;
        totals.units_slop.current  += agg.slop;
        totals.units_bal.current   += agg.bal;
        totals.units_dos.current   += agg.dos;
        totals.omzet.current       += periodOmzet.get(pk(2, week, product)) ?? 0;
        currYearSales              += uval;
      }
    }

    const details: WeekComparisonProductDetail[] = [];
    productTotalsMap.forEach((totals, product) => {
      const variance           = totals.current - totals.previous;
      const variancePercentage = totals.previous > 0 ? (variance / totals.previous) * 100 : 0;
      details.push({
        product,
        previousYear: totals.previous,
        currentYear:  totals.current,
        variance,
        variancePercentage,
        units_bks:  { previous: totals.units_bks.previous,  current: totals.units_bks.current  },
        units_slop: { previous: totals.units_slop.previous, current: totals.units_slop.current },
        units_bal:  { previous: totals.units_bal.previous,  current: totals.units_bal.current  },
        units_dos:  { previous: totals.units_dos.previous,  current: totals.units_dos.current  },
        omzet:      { previous: totals.omzet.previous,      current: totals.omzet.current      },
      });
    });
    details.sort((a, b) => b.currentYear - a.currentYear);

    if (prevYearSales > 0 || currYearSales > 0) {
      weekComparisons.push({
        week,                       // nomor minggu P2 (dipakai sebagai label sumbu)
        previousWeek:       prevWeek, // nomor minggu P1 yang dipasangkan
        previousYear:       prevYearSales,
        currentYear:        currYearSales,
        variance:           currYearSales - prevYearSales,
        variancePercentage: prevYearSales > 0 ? ((currYearSales - prevYearSales) / prevYearSales) * 100 : 0,
        details,
      });
    }

    // Omzet murni minggu ini (independen dari selectedUnit), untuk card "Omzet 1 Bulan" di Piutang
    const weekOmzetCurrent = Array.from(allProductsSet).reduce(
      (s, p) => s + (periodOmzet.get(pk(2, week, p)) ?? 0), 0,
    );
    const weekOmzetPrevious = Array.from(allProductsSet).reduce(
      (s, p) => s + (periodOmzet.get(pk(1, prevWeek, p)) ?? 0), 0,
    );

    // weeklyData memakai nomor minggu ASELI tiap periode
    if (currYearSales > 0 && currentYear !== undefined) {
      const k = `${currentYear}-${week}`;
      if (!weeklySeen.has(k)) {
        weeklySeen.add(k);
        weeklyData.push({ week, year: currentYear, sales: currYearSales, target: currYearSales * 1.1, omzetTotal: weekOmzetCurrent });
      }
    }
    if (prevYearSales > 0 && previousYear !== undefined) {
      const k = `${previousYear}-${prevWeek}`;
      if (!weeklySeen.has(k)) {
        weeklySeen.add(k);
        weeklyData.push({ week: prevWeek, year: previousYear, sales: prevYearSales, target: prevYearSales * 1.1, omzetTotal: weekOmzetPrevious });
      }
    }
  }

  // Tahun sama dadi ne entry P1 dan P2 bercampur urutannya, urutkan per minggu
  if (previousYear === currentYear) weeklyData.sort((a, b) => a.week - b.week);

  console.log(`\n [STEP-4] outletAggMap size=${outletAggMap.size}`);

  const outletData: OutletSalesData[] = [];
  outletAggMap.forEach(agg => {
    outletData.push({
      week:         agg.weekMin,
      year:         agg.year,
      period:       agg.period,      // 1 = P1, 2 = P2 (penting saat tahun P1 = P2)
      outletType:   agg.outletType,
      category:     agg.category,
      product:      agg.product,
      dozNet:       agg.dozNet,
      unitsBks:     agg.unitsBks,
      unitsSlop:    agg.unitsSlop,
      unitsBal:     agg.unitsBal,
      omzet:        agg.omzet,
      weeklyDozNet: agg.weeklyDozNet,
      weeklyUnitsBks:  agg.weeklyUnitsBks,
      weeklyUnitsSlop: agg.weeklyUnitsSlop,
      weeklyUnitsBal:  agg.weeklyUnitsBal,
      weeklyOmzet:     agg.weeklyOmzet,
      city:         agg.city,
      district:     agg.district,
      village:      agg.village,
      customer:     agg.customer,
      customer_no:  agg.customer_no,
      salesman:     agg.salesman,
    });
  });
  outletData.sort((a, b) => b.dozNet - a.dozNet);

  console.log(`   outletData entries dikirim ke client: ${outletData.length}`);

  const effectiveYear     = currentYear  ?? sortedYears[sortedYears.length - 1];
  const effectivePrevYear = previousYear ?? (currentYear ?? sortedYears[0]);

  const toFixed2 = (n: number) => Math.round(n * 100) / 100;

  // Total per PERIODE (bukan per tahun) supaya tahun sama tidak tertukar
  const yearOnYearGrowth: YearOnYearGrowth = (() => {
    const prevTotal = periodUnitTotal[1];
    const currTotal = periodUnitTotal[2];
    const variance  = currTotal - prevTotal;
    return {
      previousYearTotal:  toFixed2(prevTotal),
      currentYearTotal:   toFixed2(currTotal),
      variance:           toFixed2(variance),
      variancePercentage: prevTotal > 0 ? Math.round((variance / prevTotal) * 100 * 10) / 10 : 0,
    };
  })();

  const targetResults = await targetQueriesPromise;
  const resolvedTargetAreas = await targetAreasPromise;

  const sameYear  = previousYear === currentYear;
  const byWeekMap = buildByWeekMap(weekProductMap); // tetap dipakai L4W

  // Kuartal Target: actual hanya dari P2 (baik tahun sama maupun beda)
  const quarterlyWeekMap  = buildByWeekMap(p2WeekProductMap);
  const quarterlyOmzetMap = p2OmzetByProductWeek;

  // Kuartal Aktual (P1 vs P2)
  // Bangun map khusus: data P1 dipindah dan nomor minggunya digeser (+weekShift) agar sejajar dengan penomoran P2.
  // Contoh: P1 W1-10 vs P2 W11-20 → P1 W1 disimpan sebagai W11.
  // Kalau tahun sama, P1 disimpan di (tahun - 1) supaya key tidak bentrok dengan P2 di generateQuarterlyYoYData.
  const yoyPrevYear = sameYear ? effectiveYear - 1 : effectivePrevYear;
  const yoyAggMap   = new Map<string, UnitAgg>();
  const yoyOmzetMap = new Map<string, number>();

  periodWeekProductMap.forEach((agg, key) => {
    const [pStr, wStr, ...rest] = key.split('|');
    const product = rest.join('|');
    const p = Number(pStr);
    const w = Number(wStr);

    const alignedWeek = w;
    if (alignedWeek < 1 || alignedWeek > 53) return;

    const yr = p === 1 ? yoyPrevYear : effectiveYear;
    const k  = `${yr}-${alignedWeek}-${product}`;

    addUnitAgg(yoyAggMap, k, agg.bks, agg.slop, agg.bal, agg.dos);
    yoyOmzetMap.set(k, (yoyOmzetMap.get(k) || 0) + (periodOmzet.get(key) ?? 0));
  });

  const quarterlyData = await generateQuarterlyData(
    quarterlyWeekMap,
    quarterlyOmzetMap,
    effectiveYear,
    areaId,
    filters?.selectedUnit,
    targetResults,
    resolvedTargetAreas,
  );

  const QuarterlyYoYData = await generateQuarterlyYoYData(
    buildByWeekMap(yoyAggMap),
    yoyOmzetMap,
    effectiveYear,
    yoyPrevYear,
    areaId,
  );

  const l4wc4wData = generateL4WC4WData(
    byWeekMap,
    omzetByProductWeek,
    currentYear,
    filters,
  );

  return {
    weeklyData,
    quarterlyData,
    QuarterlyYoYData,
    weekComparisons,
    l4wc4wData,
    yearOnYearGrowth,
    comparisonYears,
    comparisonWeeks,
    outletData,
  };
}
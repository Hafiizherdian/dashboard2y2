'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Trash2, Eye, X } from 'lucide-react';
import { AreaConfig } from '@/lib/areaConfig';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  tk, Theme, FONT_MONO,
  badge, iconBtn, Spinner, CardBox, FormGroup, ConfirmModal,
} from './shared';

const REQUIRED_COLUMNS = [
  'Product ID', 'Produk', 'DOS', 'BKS', 'Konv. DOS', 'DOS 4 Weeks', 'AVG/Week', 'Stok Level',
];

interface StockFile {
  id: number;
  original_name: string;
  record_count: number;
  area: string;
  report_date: string;
  report_week: number;
  report_year: number;
  status: 'completed' | 'processing' | 'error';
  created_at: string;
}

interface StockRow {
  category: string; product_id: string | null; product: string;
  units_dos: string; units_bks: string; konv_dos: string;
  dos_4weeks: string; avg_week: string; stock_level: string | null;
}

const fmt = (v: string | number | null | undefined, d = 2) =>
  v === null || v === undefined ? '—' : Number(v).toLocaleString('id-ID', { maximumFractionDigits: d });

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

// Nomor week ISO (1-53) + tahun ISO untuk tanggal tertentu — dipakai sebagai nilai default saja
function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return { week: Math.ceil(((+t - +y0) / 86400000 + 1) / 7), year: t.getUTCFullYear() };
}

// Preview modal
function StockPreviewModal({ file, onClose, theme }: { file: StockFile; onClose: () => void; theme: Theme }) {
  const t = tk[theme];
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/stock/files/${file.id}/preview`)
      .then(r => r.json())
      .then(r => (r.success ? setRows(r.data) : setError(r.error || 'Tidak ada data')))
      .catch(() => setError('Gagal memuat preview'))
      .finally(() => setLoading(false));
  }, [file.id]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const th: React.CSSProperties = {
    position: 'sticky', top: 0, padding: '7px 12px', fontSize: 9, fontWeight: 700, fontFamily: FONT_MONO,
    textTransform: 'uppercase', letterSpacing: '0.09em', color: t.textMuted, background: t.tableHead,
    borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap', textAlign: 'right',
  };
  const td: React.CSSProperties = {
    padding: '6px 12px', fontFamily: FONT_MONO, fontSize: 12, whiteSpace: 'nowrap',
    textAlign: 'right', color: t.text, borderBottom: `1px solid ${t.border}`,
  };

  let lastCat = '';
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 1100, background: t.modalOverlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: t.cardbg, border: `1px solid ${t.borderCard}`, borderRadius: 16, width: '100%', maxWidth: 1000, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: t.shadowElevated }}>
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${t.border}`, background: t.tableHead, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
              Preview Stok · {file.area.toUpperCase()} · W{file.report_week}/{file.report_year} · {fmtDate(file.report_date)}
            </div>
            <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT_MONO, marginTop: 2 }}>{file.original_name} · {rows.length} produk</div>
          </div>
          <button onClick={onClose} style={iconBtn(t.red.bg, t.red.border, 28)}><X size={12} color={t.red.text} /></button>
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 24, display: 'flex', gap: 8, color: t.textMuted, fontSize: 12, fontFamily: FONT_MONO }}><Spinner size={12} color={t.textMuted} /> Memuat…</div>
          ) : error ? (
            <div style={{ padding: 24, color: t.red.text, fontSize: 12 }}>{error}</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: 'left' }}>Produk</th>
                  {['DOS', 'BKS', 'Konv. DOS', 'DOS 4 Weeks', 'AVG/Week', 'Stok Level'].map(h => <th key={h} style={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const header = r.category !== lastCat;
                  lastCat = r.category;
                  return (
                    <React.Fragment key={i}>
                      {header && (
                        <tr><td colSpan={7} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#6366f1', background: t.tableAlt, borderBottom: `1px solid ${t.border}` }}>{r.category || 'Tanpa kategori'}</td></tr>
                      )}
                      <tr>
                        <td style={{ ...td, textAlign: 'left', color: t.textSub }}>{r.product}</td>
                        <td style={td}>{fmt(r.units_dos, 0)}</td>
                        <td style={td}>{fmt(r.units_bks, 0)}</td>
                        <td style={td}>{fmt(r.konv_dos)}</td>
                        <td style={td}>{fmt(r.dos_4weeks)}</td>
                        <td style={td}>{fmt(r.avg_week)}</td>
                        <td style={{ ...td, fontWeight: 700 }}>{fmt(r.stock_level)}</td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// Main
interface Props {
  theme: Theme;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, msg?: string) => void;
}

export default function UploadStockTab({ theme, addToast }: Props) {
  const t = tk[theme];
  const { user, getAccessibleAreas } = useAuth();

  const [files, setFiles]           = useState<StockFile[]>([]);
  const [allAreas, setAllAreas]     = useState<AreaConfig[]>([]);
  const [selectedFile, setSelected] = useState<File | null>(null);
  const [manualArea, setManualArea] = useState('');
  const [isDragging, setDragging]   = useState(false);
  const [isUploading, setUploading] = useState(false);
  const [deleteTarget, setDelete]   = useState<StockFile | null>(null);
  const [previewFile, setPreview]   = useState<StockFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // week & tahun laporan (default = week ISO saat ini, bisa diubah manual)
  const cur = isoWeek();
  const [week, setWeek] = useState<number>(cur.week);
  const [year, setYear] = useState<number>(cur.year);
  const yearOptions = [cur.year - 1, cur.year, cur.year + 1];

  const loadFiles = useCallback(async () => {
    try {
      const r = await fetch('/api/stock/files').then(r => r.json());
      if (r.success) setFiles(r.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);
  useEffect(() => {
    fetch('/api/areas').then(r => r.json()).then(j => { if (j.success) setAllAreas(j.data.areas ?? []); }).catch(() => {});
  }, []);

  const userAreaIds     = getAccessibleAreas();
  const accessibleAreas = user?.role === 'root' ? allAreas : allAreas.filter(a => userAreaIds.includes(a.id));
  const autoArea        = accessibleAreas.length === 1 ? accessibleAreas[0].id : '';
  const selectedAreaId  = autoArea || manualArea;
  const canUpload       = !!selectedFile && !!selectedAreaId && !!week && !!year && !isUploading;

  const pick = (f: File) => {
    if (/\.(xlsx|xls)$/i.test(f.name)) setSelected(f);
    else addToast('error', 'Format tidak didukung', 'Gunakan .xlsx atau .xls');
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedAreaId || isUploading) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('area', selectedAreaId);
      fd.append('week', String(week));
      fd.append('year', String(year));
      const res = await fetch('/api/stock/upload', { method: 'POST', body: fd });
      let r: any = {}; try { r = await res.json(); } catch { r = {}; }

      if (res.ok && r.success) {
        const d = r.data;
        addToast('success', 'Upload stok berhasil',
          `W${week}/${year} · ${d.record_count} produk · ${fmtDate(d.report_date)}${d.replaced_files ? ' · data week yang sama diganti' : ''}`);
        // peringatan jika nama area di file ≠ area yang dipilih
        const chosen = (allAreas.find(a => a.id === selectedAreaId)?.name ?? selectedAreaId).toLowerCase();
        if (d.area_in_file && !chosen.includes(String(d.area_in_file).toLowerCase())) {
          addToast('warning', 'Cek area', `File berisi area "${d.area_in_file}", tapi dimasukkan ke "${chosen}"`);
        }
        setSelected(null); setManualArea('');
        if (inputRef.current) inputRef.current.value = '';
        await loadFiles();
      } else {
        addToast('error', 'Upload gagal', r.error ?? `Server error ${res.status}`);
      }
    } catch (e: any) {
      addToast('error', 'Upload gagal', e?.message || 'Koneksi gagal');
    } finally { setUploading(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/stock/files?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) { addToast('success', 'File dihapus', deleteTarget.original_name); await loadFiles(); }
      else { const r = await res.json().catch(() => ({})); addToast('error', 'Gagal menghapus', r.error ?? `Error ${res.status}`); }
    } finally { setDelete(null); }
  };

  const th: React.CSSProperties = {
    padding: '10px 13px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: t.textMuted, borderBottom: `1px solid ${t.border}`, fontFamily: FONT_MONO, background: t.tableHead, whiteSpace: 'nowrap',
  };

  const selectStyle: React.CSSProperties = {
    fontSize: 12, color: t.text, background: t.inputbg, border: `1px solid ${t.borderInput}`,
    borderRadius: 9, fontFamily: FONT_MONO, padding: '8px 12px', outline: 'none',
  };

  return (
    <>
      <ConfirmModal open={!!deleteTarget} title="Hapus File Stok" message={`Yakin menghapus "${deleteTarget?.original_name}"? Data stok terkait akan hilang permanen.`} confirmLabel="Hapus" danger onConfirm={handleDelete} onCancel={() => setDelete(null)} theme={theme} />
      {previewFile && <StockPreviewModal file={previewFile} onClose={() => setPreview(null)} theme={theme} />}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: 16, marginBottom: 18, alignItems: 'start' }}>
        <CardBox title="Upload File Stok" icon={Upload} iconColor="#6366f1" accent="#6366f1" theme={theme}>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={e => { e.preventDefault(); setDragging(false); }}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) pick(f); }}
            onClick={() => !selectedFile && inputRef.current?.click()}
            style={{ border: `2px dashed ${isDragging ? '#6366f1' : selectedFile ? t.green.border : t.borderInput}`, borderRadius: 10, padding: '30px 14px', textAlign: 'center', background: isDragging ? t.dropzoneActive : selectedFile ? t.green.bg : t.inputbg, cursor: selectedFile ? 'default' : 'pointer', marginBottom: 14, height: 200 }}>
            {!selectedFile ? (
              <>
                <Upload size={22} color={isDragging ? '#6366f1' : t.textMuted} style={{ marginBottom: 10 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 4 }}>{isDragging ? 'Lepaskan di sini' : 'Drag & drop atau klik'}</div>
                <div style={{ fontSize: 11, color: t.textMuted }}>laporan stok · xlsx · xls</div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                <FileSpreadsheet size={22} color={t.green.text} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</div>
                  <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT_MONO, marginTop: 2 }}>{(selectedFile.size / 1024).toFixed(1)} KB</div>
                </div>
                <button onClick={e => { e.stopPropagation(); setSelected(null); }} style={iconBtn(t.red.bg, t.red.border, 26)}><X size={11} color={t.red.text} /></button>
              </div>
            )}
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) pick(e.target.files[0]); e.target.value = ''; }} />

          <FormGroup label="Area Tujuan" hint="Data stok akan dimasukkan ke area ini" theme={theme}>
            {autoArea ? (
              <div style={{ fontSize: 12, color: t.green.text, padding: '8px 12px', background: t.green.bg, border: `1px solid ${t.green.border}`, borderRadius: 9, fontFamily: FONT_MONO }}>
                {accessibleAreas[0].name || autoArea}
              </div>
            ) : (
              <select value={manualArea} onChange={e => setManualArea(e.target.value)}
                style={{ fontSize: 12, color: manualArea ? t.text : t.textMuted, background: t.inputbg, border: `1px solid ${manualArea ? t.borderActive : t.borderInput}`, borderRadius: 9, fontFamily: FONT_MONO, padding: '8px 12px', width: '100%', outline: 'none' }}>
                <option value="">— Pilih area tujuan —</option>
                {accessibleAreas.map(a => <option key={a.id} value={a.id}>{a.name || a.id}</option>)}
              </select>
            )}
          </FormGroup>

          <FormGroup label="Week" hint="Upload ulang area + week yang sama akan mengganti data lama" theme={theme}>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={week} onChange={e => setWeek(Number(e.target.value))} aria-label="Week laporan"
                style={{ ...selectStyle, flex: 1 }}>
                {Array.from({ length: 52 }, (_, i) => i + 1).map(w => <option key={w} value={w}>Week {w}</option>)}
              </select>
              <select value={year} onChange={e => setYear(Number(e.target.value))} aria-label="Tahun laporan"
                style={{ ...selectStyle, width: 90 }}>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </FormGroup>

          <div style={{ display: 'flex', gap: 8, paddingTop: 6, borderTop: `1px solid ${t.border}`, marginTop: 4 }}>
            <button onClick={() => inputRef.current?.click()} style={{ padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: t.gray.bg, color: t.gray.text, border: `1px solid ${t.gray.border}`, cursor: 'pointer' }}>{selectedFile ? 'Ganti File' : 'Pilih File'}</button>
            <button onClick={handleUpload} disabled={!canUpload}
              style={{ padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, border: 'none', background: canUpload ? '#6366f1' : t.btnDisabled.bg, color: canUpload ? '#fff' : t.btnDisabled.text, cursor: canUpload ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6 }}>
              {isUploading ? <><Spinner size={13} color="#fff" /> Mengupload…</> : <><Upload size={13} /> Upload</>}
            </button>
          </div>
        </CardBox>

        <CardBox title="Kolom yang Diperlukan" icon={AlertCircle} iconColor="#f59e0b" accent="#f59e0b" theme={theme}>
          {REQUIRED_COLUMNS.map((col, i) => (
            <div key={col} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px', borderBottom: i < REQUIRED_COLUMNS.length - 1 ? `1px solid ${t.border}` : 'none' }}>
              <CheckCircle size={10} color="#10b981" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontFamily: FONT_MONO, color: t.textSub }}>{col}</span>
            </div>
          ))}
          <div style={{ fontSize: 10, color: t.textMuted, marginTop: 10, lineHeight: 1.5 }}>
            Kategori dibaca dari baris “Kategori: …”. Tanggal & area dibaca dari footer “Dicetak: …”.
            Week dipilih manual saat upload. Upload ulang untuk area + week yang sama akan mengganti data lama.
          </div>
        </CardBox>
      </div>

      {/* Daftar file */}
      <div style={{ background: t.cardbg, border: `1px solid ${t.borderCard}`, borderRadius: 14, boxShadow: t.shadowCard, overflowX: 'auto' }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${t.border}`, fontSize: 14, fontWeight: 700, color: t.text, display: 'flex', alignItems: 'center', gap: 7 }}>
          <FileSpreadsheet size={14} color="#6366f1" /> File Stok Diupload
          <span style={{ fontSize: 11, fontWeight: 400, color: t.textMuted, fontFamily: FONT_MONO }}>{files.length} total</span>
        </div>
        <table style={{ width: '100%', minWidth: 620, borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Area', 'Week', 'Tanggal Laporan', 'Produk', 'File', 'Status'].map(h => <th key={h} style={th}>{h}</th>)}
              <th style={{ ...th, textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {files.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 36, textAlign: 'center', color: t.textMuted, fontSize: 12, fontFamily: FONT_MONO }}>Belum ada file stok</td></tr>
            ) : files.map((f, i) => (
              <tr key={f.id} style={{ background: i % 2 === 1 ? t.tableAlt : 'transparent' }}>
                <td style={{ padding: '11px 13px', color: t.text, fontWeight: 600, textTransform: 'capitalize' }}>{f.area}</td>
                <td style={{ padding: '11px 13px', color: t.text, fontFamily: FONT_MONO, fontSize: 12, whiteSpace: 'nowrap' }}>W{f.report_week} · {f.report_year}</td>
                <td style={{ padding: '11px 13px', color: t.textSub, fontFamily: FONT_MONO, fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(f.report_date)}</td>
                <td style={{ padding: '11px 13px', color: t.textSub, fontFamily: FONT_MONO, fontSize: 12 }}>{f.record_count}</td>
                <td style={{ padding: '11px 13px', color: t.textSub, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.original_name}</td>
                <td style={{ padding: '11px 13px' }}>
                  <span style={badge(...(f.status === 'completed' ? [t.green.bg, t.green.text, t.green.border] : f.status === 'error' ? [t.red.bg, t.red.text, t.red.border] : [t.blue.bg, t.blue.text, t.blue.border]) as [string, string, string])}>
                    {f.status === 'completed' ? 'Selesai' : f.status === 'error' ? 'Error' : 'Proses'}
                  </span>
                </td>
                <td style={{ padding: '11px 13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 5 }}>
                    <button onClick={() => setPreview(f)} style={iconBtn(t.blue.bg, t.blue.border, 28)} title="Preview"><Eye size={11} color={t.blue.text} /></button>
                    <button onClick={() => setDelete(f)} style={iconBtn(t.red.bg, t.red.border, 28)} title="Hapus"><Trash2 size={11} color={t.red.text} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
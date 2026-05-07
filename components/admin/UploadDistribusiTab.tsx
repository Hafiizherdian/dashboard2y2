'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload, FileSpreadsheet, CheckCircle, AlertCircle,
  Trash2, RefreshCw, X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { AreaConfig } from '@/lib/areaConfig';
import {
  tk, Theme, FONT_MONO, Spinner, CardBox, FormGroup, ConfirmModal,
} from './shared';

const BP_LG = 1024;

const REQUIRED_COLUMNS_DIST = [
  'Minggu', 'Produk', 'Outlet', 'Tipe Outlet',
  'Salesman', 'Kecamatan', 'Kota', 'Plan',
  'Aktual', 'Av-In', 'EC', 'Av-Out',
];

interface DistFile {
  id: number;
  original_name: string;
  record_count: number;
  area: string;
  created_at: string;
}

function useWindowWidth() {
  const [width, setWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return width;
}

interface Props {
  theme:         Theme;
  addToast:      (type: 'success' | 'error' | 'warning' | 'info', title: string, msg?: string) => void;
  initialFiles?: DistFile[];
  onRefresh?:    () => Promise<void>;
}

export default function UploadDistribusiTab({ theme, addToast, initialFiles, onRefresh }: Props) {
  const t = tk[theme];
  const { user, getAccessibleAreas } = useAuth();
  const w = useWindowWidth();
  const isTablet = w < BP_LG;

  const [isDragging,   setIsDragging]   = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading,  setIsUploading]  = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMsg,    setUploadMsg]    = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting,   setIsDeleting]   = useState(false);
  const [manualArea,   setManualArea]   = useState('');
  const [allAreas,     setAllAreas]     = useState<AreaConfig[]>([]);
  const [files,        setFiles]        = useState<DistFile[]>(initialFiles ?? []);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // sync jika initialFiles berubah dari parent
  useEffect(() => {
    if (initialFiles) setFiles(initialFiles);
  }, [initialFiles]);

  useEffect(() => {
    fetch('/api/areas').then(r => r.json()).then(j => { if (j.success) setAllAreas(j.data.areas ?? []); }).catch(() => {});
  }, []);

  const fetchFiles = useCallback(async () => {
    // jika ada onRefresh dari parent, gunakan itu agar sinkron
    if (onRefresh) {
      setLoadingFiles(true);
      try { await onRefresh(); } finally { setLoadingFiles(false); }
      return;
    }
    setLoadingFiles(true);
    try {
      const r = await fetch('/api/distribution?weekStart=1&weekEnd=52');
      if (r.ok) { const j = await r.json(); setFiles(j.data?.files ?? []); }
    } finally { setLoadingFiles(false); }
  }, [onRefresh]);

  const userAreaIds      = getAccessibleAreas();
  const accessibleAreas  = user?.role === 'root' ? allAreas : allAreas.filter(a => userAreaIds.includes(a.id));
  const autoArea         = accessibleAreas.length === 1 ? accessibleAreas[0].id : '';
  const selectedAreaId   = autoArea || manualArea;
  const selectedAreaName = allAreas.find(a => a.id === selectedAreaId)?.name ?? selectedAreaId;

  const handleFileSelect = (file: File) => {
    setUploadStatus('idle'); setUploadMsg('');
    if (/\.(xlsx|xls|csv)$/i.test(file.name)) { setSelectedFile(file); }
    else { addToast('error', 'Format tidak didukung', 'Gunakan .xlsx, .xls, atau .csv'); }
  };

  const handleUpload = async () => {
    if (!selectedFile || isUploading) return;
    if (!selectedAreaId) { addToast('error', 'Area belum dipilih', 'Pilih area tujuan terlebih dahulu'); return; }
    setIsUploading(true); setUploadStatus('idle'); setUploadMsg('');
    try {
      const fd = new FormData(); fd.append('file', selectedFile); fd.append('area', selectedAreaId);
      const res = await fetch('/api/distribution', { method: 'POST', body: fd });
      let r: any = {}; try { r = await res.json(); } catch { r = {}; }
      if (res.ok && r.success) {
        const msg = `${r.data.record_count.toLocaleString('id-ID')} records berhasil diimport`;
        setUploadStatus('success'); setUploadMsg(msg); addToast('success', 'Upload distribusi berhasil!', msg);
        setSelectedFile(null); setManualArea('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        await fetchFiles();
      } else {
        const errMsg = r.error ?? `Server error ${res.status}`;
        setUploadStatus('error'); setUploadMsg(errMsg); addToast('error', 'Upload gagal', errMsg);
      }
    } catch (err: any) {
      const msg = err?.message || 'Koneksi gagal';
      setUploadStatus('error'); setUploadMsg(msg); addToast('error', 'Upload gagal', msg);
    } finally { setIsUploading(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/distribution?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) { addToast('success', 'File dihapus', deleteTarget.name); await fetchFiles(); }
      else { const r = await res.json(); addToast('error', 'Gagal menghapus', r.error); }
    } catch (err: any) { addToast('error', 'Gagal menghapus', err?.message); }
    finally { setIsDeleting(false); setDeleteTarget(null); }
  };

  const canUpload = !!selectedFile && !!selectedAreaId && !isUploading;

  // warna tema hijau konsisten
  const GREEN        = '#1c9706';
  const GREEN_ACTIVE = 'rgba(28,151,6,0.6)';

  return (
    <>
      <ConfirmModal
        open={!!deleteTarget}
        title="Hapus File Distribusi"
        message={`Yakin menghapus "${deleteTarget?.name}"? Data distribusi terkait akan hilang permanen.`}
        confirmLabel={isDeleting ? 'Menghapus…' : 'Hapus'}
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        theme={theme}
      />

      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 290px', gap: 16, marginBottom: 18, alignItems: 'start' }}>
        {/* Upload card */}
        <CardBox title="Upload File Distribusi" icon={Upload} iconColor={GREEN} accent={GREEN} theme={theme}>

          {/* Status bar */}
          {uploadStatus !== 'idle' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, marginBottom: 12, background: uploadStatus === 'success' ? t.green.bg : t.red.bg, border: `1px solid ${uploadStatus === 'success' ? t.green.border : t.red.border}`, animation: 'fadeIn 0.2s ease' }}>
              {uploadStatus === 'success'
                ? <CheckCircle size={13} color={t.green.text} style={{ flexShrink: 0 }} />
                : <AlertCircle size={13} color={t.red.text} style={{ flexShrink: 0 }} />}
              <span style={{ fontSize: 12, fontWeight: 600, color: uploadStatus === 'success' ? t.green.text : t.red.text, flex: 1 }}>{uploadMsg}</span>
              <button onClick={() => { setUploadStatus('idle'); setUploadMsg(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: uploadStatus === 'success' ? t.green.text : t.red.text, padding: 0, display: 'flex', opacity: 0.6 }}><X size={11} /></button>
            </div>
          )}

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
            onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
            style={{ border: `2px dashed ${isDragging ? GREEN : selectedFile ? t.green.border : t.borderInput}`, borderRadius: 10, padding: selectedFile ? '14px' : '30px 14px', textAlign: 'center', background: isDragging ? 'rgba(28,151,6,0.06)' : selectedFile ? t.green.bg : t.inputbg, cursor: selectedFile ? 'default' : 'pointer', transition: 'all 0.2s', marginBottom: 14 }}>
            {!selectedFile ? (
              <>
                <div style={{ width: 44, height: 44, borderRadius: 11, background: isDragging ? 'rgba(28,151,6,0.12)' : t.inputbg, border: `1.5px dashed ${isDragging ? GREEN : t.borderInput}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <Upload size={19} color={isDragging ? GREEN : t.textMuted} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 4 }}>{isDragging ? 'Lepaskan di sini' : 'Drag & drop atau klik'}</div>
                <div style={{ fontSize: 11, color: t.textMuted }}>xlsx · xls · csv · maks 50 MB</div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: t.green.bg, border: `1px solid ${t.green.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileSpreadsheet size={18} color={t.green.text} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</div>
                  <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT_MONO, marginTop: 2 }}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <button onClick={e => { e.stopPropagation(); setSelectedFile(null); setUploadStatus('idle'); setUploadMsg(''); }} style={{ width: 26, height: 26, borderRadius: 7, background: t.red.bg, border: `1px solid ${t.red.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <X size={11} color={t.red.text} />
                </button>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); e.target.value = ''; }} style={{ display: 'none' }} />

          {/* Area */}
          <FormGroup label="Area Tujuan" hint="Data distribusi akan dimasukkan ke area ini" theme={theme}>
            {allAreas.length === 0 ? (
              <div style={{ fontSize: 12, color: t.textMuted, padding: '8px 12px', background: t.inputbg, border: `1px solid ${t.borderInput}`, borderRadius: 9, fontFamily: FONT_MONO, display: 'flex', alignItems: 'center', gap: 6 }}><Spinner size={11} color={t.textMuted} /> Memuat area…</div>
            ) : accessibleAreas.length === 0 ? (
              <div style={{ fontSize: 12, color: t.yellow.text, padding: '8px 12px', background: t.yellow.bg, border: `1px solid ${t.yellow.border}`, borderRadius: 9, fontFamily: FONT_MONO }}>⚠ Tidak ada area yang dapat diakses.</div>
            ) : autoArea ? (
              <div style={{ fontSize: 12, color: t.green.text, padding: '8px 12px', background: t.green.bg, border: `1px solid ${t.green.border}`, borderRadius: 9, fontFamily: FONT_MONO, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={11} color={t.green.text} />{selectedAreaName}</div>
            ) : (
              <select value={manualArea} onChange={e => setManualArea(e.target.value)} style={{ fontSize: 12, color: manualArea ? t.text : t.textMuted, background: t.inputbg, border: `1px solid ${manualArea ? GREEN_ACTIVE : t.borderInput}`, borderRadius: 9, fontFamily: FONT_MONO, padding: '8px 12px', width: '100%', outline: 'none', cursor: 'pointer' }}>
                <option value="">— Pilih area tujuan —</option>
                {accessibleAreas.map(area => <option key={area.id} value={area.id}>{area.name || area.id}</option>)}
              </select>
            )}
          </FormGroup>

          {isUploading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: t.green.bg, border: `1px solid ${t.green.border}`, marginBottom: 10 }}>
              <Spinner size={12} color={t.green.text} />
              <span style={{ fontSize: 12, color: t.green.text, fontFamily: FONT_MONO }}>Mengupload {selectedFile?.name}…</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingTop: 6, borderTop: `1px solid ${t.border}`, marginTop: 4 }}>
            <button onClick={() => fileInputRef.current?.click()} style={{ padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: t.gray.bg, color: t.gray.text, border: `1px solid ${t.gray.border}`, cursor: 'pointer' }}>{selectedFile ? 'Ganti File' : 'Pilih File'}</button>
            <button onClick={handleUpload} disabled={!canUpload}
              style={{ padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, border: 'none', background: canUpload ? GREEN : t.btnDisabled.bg, color: canUpload ? '#fff' : t.btnDisabled.text, cursor: canUpload ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, boxShadow: canUpload ? '0 2px 8px rgba(28,151,6,0.35)' : 'none', transition: 'all 0.15s' }}>
              {isUploading ? <><Spinner size={13} color="#fff" /> Mengupload…</> : <><Upload size={13} /> Upload</>}
            </button>
          </div>
        </CardBox>

        {/* Kolom yang diperlukan */}
        <CardBox title="Kolom yang Diperlukan" icon={AlertCircle} iconColor="#f59e0b" accent="#f59e0b" theme={theme}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {REQUIRED_COLUMNS_DIST.map((col, i) => (
              <div key={col} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px', borderBottom: i < REQUIRED_COLUMNS_DIST.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                <CheckCircle size={10} color={GREEN} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontFamily: FONT_MONO, color: t.textSub }}>{col}</span>
              </div>
            ))}
          </div>
        </CardBox>
      </div>

      {/* Daftar file distribusi */}
      <div style={{ background: t.cardbg, border: `1px solid ${t.borderCard}`, borderRadius: 14, overflow: 'hidden', boxShadow: t.shadowCard }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text, display: 'flex', alignItems: 'center', gap: 7 }}>
              <FileSpreadsheet size={14} color={GREEN} /> File Distribusi Diupload
            </div>
            <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2, fontFamily: FONT_MONO }}>{files.length} total</div>
          </div>
          <button onClick={fetchFiles} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', padding: 4 }}>
            <RefreshCw size={13} style={loadingFiles ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
        </div>

        {loadingFiles ? (
          <div style={{ padding: '40px', textAlign: 'center', color: t.textMuted, fontSize: 12, fontFamily: FONT_MONO, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Spinner size={20} color={t.textMuted} />
            Memuat data…
          </div>
        ) : files.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: t.textMuted, fontSize: 12, fontFamily: FONT_MONO, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <FileSpreadsheet size={26} color={t.textFaint} />
            Belum ada file distribusi diupload
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: t.tableHead }}>
                  {['Nama File', 'Area', 'Records', 'Upload', ''].map((h, i) => (
                    <th key={i} style={{ padding: '9px 13px', textAlign: i < 3 ? 'left' : 'right', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: t.textMuted, borderBottom: `1px solid ${t.border}`, fontFamily: FONT_MONO, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {files.map((file, idx) => (
                  <tr key={file.id} style={{ background: idx % 2 === 1 ? t.tableAlt : 'transparent' }}>
                    <td style={{ padding: '10px 13px', color: t.text, fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: 6, background: t.green.bg, border: `1px solid ${t.green.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileSpreadsheet size={12} color={t.green.text} />
                        </div>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{file.original_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 13px', color: t.textSub, fontSize: 12, fontFamily: FONT_MONO }}>{file.area || '—'}</td>
                    <td style={{ padding: '10px 13px', color: t.textSub, fontSize: 12, fontFamily: FONT_MONO }}>{file.record_count?.toLocaleString('id-ID')}</td>
                    <td style={{ padding: '10px 13px', color: t.textMuted, fontSize: 12, fontFamily: FONT_MONO, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {new Date(file.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                    <td style={{ padding: '10px 13px', textAlign: 'right' }}>
                      <button onClick={() => setDeleteTarget({ id: file.id, name: file.original_name })}
                        style={{ width: 28, height: 28, borderRadius: 7, background: t.red.bg, border: `1px solid ${t.red.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        title="Hapus">
                        <Trash2 size={11} color={t.red.text} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
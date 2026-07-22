import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, FileVideo, AlertTriangle, Loader } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';

function fmtUsage(min) {
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtResetDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

export default function YouTubeModal({ isOpen, onClose, onContinue }) {
  // mode: 'choose' | 'upload'
  const [mode, setMode]         = useState('choose');
  const [file, setFile]         = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [usage, setUsage]       = useState(null);
  const [error, setError]       = useState(null);
  const [blocked, setBlocked]   = useState(null);
  const [warnModal, setWarnModal] = useState(null);
  const pendingData             = useRef(null);
  const fileInputRef            = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setMode('choose'); setFile(null); setError(null);
    setBlocked(null); setWarnModal(null); setUploading(false);
    fetchUsage();
  }, [isOpen]);

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  async function fetchUsage() {
    try {
      const r = await apiFetch('/api/youtube/usage');
      if (r.ok) setUsage(await r.json());
    } catch {}
  }

  async function handleUpload() {
    if (!file) return;
    setError(null); setBlocked(null); setUploading(true);

    const formData = new FormData();
    formData.append('video', file);

    try {
      const r = await apiFetch('/api/youtube/upload', { method: 'POST', body: formData });
      const data = await r.json();

      if (!r.ok) {
        if (data.error === 'monthly_cap_exceeded') {
          setBlocked({ message: data.message });
          setUploading(false);
          return;
        }
        throw new Error(data.error || 'Upload failed');
      }

      fetchUsage();

      if (data.warnGrace) {
        pendingData.current = data;
        setWarnModal({
          message: data.warnMessage,
          onConfirm: () => {
            setWarnModal(null);
            const d = pendingData.current;
            pendingData.current = null;
            onContinue({ transcript: d.transcript, segments: d.segments });
          },
          onCancel: () => { setWarnModal(null); pendingData.current = null; setUploading(false); },
        });
        return;
      }

      onContinue({ transcript: data.transcript, segments: data.segments });
    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }

  if (!isOpen) return null;

  const usagePct = usage ? Math.min((usage.minutesUsed / usage.monthlyLimit) * 100, 100) : 0;
  const overCap  = usage ? usage.minutesUsed >= usage.monthlyLimit && usage.graceUsed : false;

  return (
    <>
      {/* Backdrop */}
      <div style={s.backdrop} onClick={onClose} />

      {/* Modal */}
      <div style={s.modal}>
        <div style={s.header}>
          <div style={s.headerLeft}>
            <span style={s.ytDot} />
            <span style={s.title}>YouTube content</span>
          </div>
          <button style={s.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {mode === 'choose' && (
          <>
            <p style={s.subtitle}>
              You have YouTube selected. How should we generate your YouTube title, description, and chapters?
            </p>
            <div style={s.choices}>
              <button style={s.choiceCard} onClick={() => onContinue(null)}>
                <span style={s.choiceIcon}>✏️</span>
                <strong style={s.choiceTitle}>Use my notes</strong>
                <span style={s.choiceDesc}>Generate from what you typed, no video needed</span>
              </button>
              <button style={s.choiceCard} onClick={() => setMode('upload')}>
                <span style={s.choiceIcon}><FileVideo size={22} /></span>
                <strong style={s.choiceTitle}>Upload a video</strong>
                <span style={s.choiceDesc}>Transcribe your video for accurate chapters and timestamps</span>
              </button>
            </div>
          </>
        )}

        {mode === 'upload' && (
          <>
            {/* Usage meter */}
            {usage && (
              <div style={s.usageBox}>
                <div style={s.usageRow}>
                  <span style={s.usageLabel}>Video processing this month</span>
                  <span style={{ ...s.usageValue, color: overCap ? '#e88a8a' : 'var(--text-main)' }}>
                    {fmtUsage(usage.minutesUsed)} / {fmtUsage(usage.monthlyLimit)}
                  </span>
                </div>
                <div style={s.usageTrack}>
                  <div style={{ ...s.usageFill, width: `${usagePct}%`, backgroundColor: overCap ? '#e88a8a' : 'var(--text-main)' }} />
                </div>
                {overCap && (
                  <p style={s.usageReset}>Resets on {fmtResetDate(usage.resetDate)}</p>
                )}
              </div>
            )}

            {blocked ? (
              <div style={s.blockedBox}>
                <AlertTriangle size={18} style={{ color: '#e8c97a', flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>{blocked.message}</p>
              </div>
            ) : uploading ? (
              <div style={s.progressBox}>
                <Loader size={20} style={{ color: 'var(--text-main)', animation: 'spin 1s linear infinite' }} />
                <span style={s.progressLabel}>Uploading & transcribing your video…</span>
              </div>
            ) : (
              <>
                <div
                  style={{ ...s.dropzone, ...(dragOver ? s.dropzoneOver : {}), ...(file ? s.dropzoneHasFile : {}) }}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".mp4,.mov,.avi,.mkv,.webm,.m4v,.wmv"
                    style={{ display: 'none' }}
                    onChange={e => setFile(e.target.files[0] || null)}
                  />
                  {file ? (
                    <div style={{ textAlign: 'center' }}>
                      <FileVideo size={24} style={{ color: '#FF0000', marginBottom: 6 }} />
                      <p style={s.fileName}>{file.name}</p>
                      <p style={s.fileHint}>{(file.size / (1024 * 1024)).toFixed(1)} MB — click to change</p>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <Upload size={24} style={{ color: 'var(--text-muted)', marginBottom: 6 }} />
                      <p style={s.dropzoneText}>Drop video here or click to browse</p>
                      <p style={s.fileHint}>.mp4 · .mov · .mkv · .webm · up to 90 min</p>
                    </div>
                  )}
                </div>

                {error && (
                  <div style={s.errorBox}>
                    <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                    {error}
                  </div>
                )}

                <div style={s.uploadActions}>
                  <button style={s.backBtn} onClick={() => { setMode('choose'); setFile(null); setError(null); }}>
                    ← Back
                  </button>
                  <button
                    style={{ ...s.uploadBtn, opacity: file ? 1 : 0.4, cursor: file ? 'pointer' : 'not-allowed' }}
                    onClick={handleUpload}
                    disabled={!file}
                  >
                    Transcribe & generate
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Grace warning overlay */}
      {warnModal && (
        <div style={s.warnOverlay}>
          <div style={s.warnBox}>
            <AlertTriangle size={22} style={{ color: '#e8c97a', marginBottom: 10 }} />
            <h3 style={s.warnTitle}>Monthly limit reached</h3>
            <p style={s.warnMsg}>{warnModal.message}</p>
            <div style={s.warnBtns}>
              <button style={s.warnCancel} onClick={warnModal.onCancel}>Cancel</button>
              <button style={s.warnConfirm} onClick={warnModal.onConfirm}>Yes, continue</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const s = {
  backdrop: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 200, backdropFilter: 'blur(3px)' },
  modal: {
    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
    width: '460px', maxWidth: '92vw', backgroundColor: 'var(--panel-bg)',
    border: '1px solid var(--border-color)', borderRadius: '18px',
    padding: '28px', zIndex: 201, display: 'flex', flexDirection: 'column', gap: '20px',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  ytDot: { display: 'inline-block', width: 12, height: 12, borderRadius: '50%', backgroundColor: '#FF0000' },
  title: { fontSize: '1.1rem', fontWeight: '700', fontFamily: 'var(--font-heading)', color: 'var(--text-main)', margin: 0 },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex' },
  subtitle: { margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.55, fontFamily: 'var(--font-body)' },

  choices: { display: 'flex', gap: '12px' },
  choiceCard: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
    padding: '20px 14px', border: '1px solid var(--border-color)', borderRadius: '14px',
    background: 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'center',
    transition: 'border-color 0.15s, background 0.15s',
    fontFamily: 'var(--font-body)',
  },
  choiceIcon: { fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' },
  choiceTitle: { fontSize: '0.95rem', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' },
  choiceDesc: { fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, fontFamily: 'var(--font-body)' },

  usageBox: { backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px' },
  usageRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 },
  usageLabel: { fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' },
  usageValue: { fontSize: '0.82rem', fontWeight: '600', fontFamily: 'var(--font-body)' },
  usageTrack: { height: '3px', backgroundColor: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' },
  usageFill: { height: '100%', borderRadius: '2px', transition: 'width 0.4s ease' },
  usageReset: { margin: '6px 0 0', fontSize: '0.73rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' },

  blockedBox: { display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '14px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '10px' },

  progressBox: { display: 'flex', alignItems: 'center', gap: '14px', padding: '20px', justifyContent: 'center' },
  progressLabel: { fontSize: '0.9rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' },

  dropzone: { border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '28px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.15s, background 0.15s' },
  dropzoneOver: { borderColor: 'var(--text-main)', backgroundColor: 'rgba(255,255,255,0.04)' },
  dropzoneHasFile: { borderColor: '#FF0000', borderStyle: 'solid', backgroundColor: 'rgba(255,0,0,0.04)' },
  dropzoneText: { margin: '0 0 4px', fontSize: '0.9rem', color: 'var(--text-main)', fontFamily: 'var(--font-body)' },
  fileName: { margin: '0 0 4px', fontSize: '0.88rem', color: 'var(--text-main)', fontFamily: 'var(--font-body)', wordBreak: 'break-all' },
  fileHint: { margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' },

  errorBox: { display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 12px', backgroundColor: 'rgba(232,138,138,0.1)', border: '1px solid rgba(232,138,138,0.3)', borderRadius: '8px', color: '#e88a8a', fontSize: '0.83rem', fontFamily: 'var(--font-body)' },

  uploadActions: { display: 'flex', gap: '10px', justifyContent: 'flex-end' },
  backBtn: { padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.88rem' },
  uploadBtn: { padding: '9px 20px', borderRadius: '8px', border: 'none', background: 'var(--text-main)', color: 'var(--bg-color)', fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: '600', transition: 'opacity 0.15s' },

  warnOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  warnBox: { backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '28px', maxWidth: '380px', width: '90%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' },
  warnTitle: { margin: '0 0 4px', fontSize: '1rem', fontWeight: '700', fontFamily: 'var(--font-heading)', color: 'var(--text-main)' },
  warnMsg: { margin: '0 0 16px', fontSize: '0.87rem', color: 'var(--text-muted)', lineHeight: 1.55, fontFamily: 'var(--font-body)' },
  warnBtns: { display: 'flex', gap: '10px', width: '100%' },
  warnCancel: { flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.88rem' },
  warnConfirm: { flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: 'var(--text-main)', color: 'var(--bg-color)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: '600' },
};

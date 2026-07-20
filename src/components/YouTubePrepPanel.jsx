import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, FileVideo, Copy, Check, Youtube, Loader, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseOutput(raw) {
  const get = (marker, next) => {
    const re = new RegExp(`###${marker}###\\s*([\\s\\S]*?)(?=###${next}###|$)`);
    return raw.match(re)?.[1]?.trim() || '';
  };
  return {
    title:       get('TITLE',       'DESCRIPTION'),
    description: get('DESCRIPTION', 'CHAPTERS'),
    chapters:    get('CHAPTERS',    'END'),
  };
}

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

// ── Step indicator ────────────────────────────────────────────────────────────
const UPLOAD_STEPS = [
  { key: 'uploading',    label: 'Uploading & transcribing video' },
  { key: 'generating',   label: 'Generating title, description & chapters' },
];

function StepIndicator({ currentStep }) {
  const idx = UPLOAD_STEPS.findIndex(s => s.key === currentStep);
  return (
    <div style={s.steps}>
      {UPLOAD_STEPS.map((step, i) => {
        const done    = i < idx;
        const active  = i === idx;
        return (
          <div key={step.key} style={s.step}>
            <div style={{ ...s.stepDot, ...(done ? s.stepDotDone : active ? s.stepDotActive : {}) }}>
              {done ? <Check size={10} /> : active ? <Loader size={10} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            </div>
            <span style={{ ...s.stepLabel, color: active ? 'var(--text-main)' : done ? 'var(--text-muted)' : 'var(--border-color)' }}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Output block ──────────────────────────────────────────────────────────────
function OutputBlock({ label, text, onCopy, copied, mono }) {
  if (!text) return null;
  return (
    <div style={s.outputBlock}>
      <div style={s.outputBlockHeader}>
        <span style={s.outputBlockLabel}>{label}</span>
        <button style={s.copyBtn} onClick={onCopy}>
          {copied ? <><Check size={12} style={{ marginRight: 4 }} />Copied</> : <><Copy size={12} style={{ marginRight: 4 }} />Copy</>}
        </button>
      </div>
      <pre style={{ ...s.outputBlockText, fontFamily: mono ? 'monospace' : 'var(--font-body)' }}>{text}</pre>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function YouTubePrepPanel({ isOpen, onClose }) {
  const [mode, setMode]         = useState('upload');  // 'upload' | 'notes'
  const [file, setFile]         = useState(null);
  const [notes, setNotes]       = useState('');
  const [progress, setProgress] = useState(null);      // null | 'uploading' | 'generating'
  const [usage, setUsage]       = useState(null);
  const [error, setError]       = useState(null);
  const [output, setOutput]     = useState(null);      // { title, description, chapters }
  const [rawStream, setRawStream] = useState('');
  const [copied, setCopied]     = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [warnModal, setWarnModal] = useState(null);    // { message, onConfirm }
  const [blocked, setBlocked]   = useState(null);      // { message }

  const fileInputRef = useRef(null);
  const pendingData  = useRef(null);                   // stash transcript data during warn modal

  // Reset & fetch usage when panel opens
  useEffect(() => {
    if (!isOpen) return;
    setOutput(null); setRawStream(''); setError(null);
    setProgress(null); setFile(null); setNotes('');
    setWarnModal(null); setBlocked(null);
    fetchUsage();
  }, [isOpen]);

  // Keyboard dismiss
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

  // ── SSE streaming helper ──────────────────────────────────────────────────
  // sourceLabel: shown as the "input" preview in history (filename or "Notes")
  async function streamGenerate(transcript, isVideoTranscript, segments, sourceLabel) {
    setProgress('generating');
    setRawStream('');
    setOutput(null);
    setError(null);

    try {
      const r = await apiFetch('/api/youtube/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, isVideoTranscript, segments: segments || [] }),
      });
      if (!r.ok) {
        // Body may be JSON or plain text depending on whether Express rejected it
        // before our handler ran (e.g. payload-too-large, auth errors).
        const ct = r.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const d = await r.json();
          throw new Error(d.error || 'Generation failed');
        } else {
          const txt = await r.text();
          throw new Error(txt || `Request failed (${r.status})`);
        }
      }

      let full = '';
      const reader  = r.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
            try {
              const token = JSON.parse(line.trim().slice(6))?.choices?.[0]?.delta?.content || '';
              if (token) { full += token; setRawStream(full); }
            } catch {}
          }
        }
      }

      const parsed = parseOutput(full);
      setOutput(parsed);

      // ── Save to history (generated text only — no transcript, no video) ──
      try {
        const historyOutput = [
          parsed.title      && `TITLE:\n${parsed.title}`,
          parsed.description && `DESCRIPTION:\n${parsed.description}`,
          parsed.chapters   && `CHAPTERS:\n${parsed.chapters}`,
        ].filter(Boolean).join('\n\n');

        await apiFetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: sourceLabel || 'YouTube Studio',
            selectedPlatforms: ['youtube'],
            outputs: { youtube: historyOutput },
          }),
        });
      } catch {
        // History save failing should never block the user from seeing output
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProgress(null);
      fetchUsage();
    }
  }

  // ── Upload flow ───────────────────────────────────────────────────────────
  async function handleVideoGenerate() {
    if (!file) return;
    setError(null); setBlocked(null); setOutput(null); setRawStream('');
    setProgress('uploading');

    const formData = new FormData();
    formData.append('video', file);

    try {
      const r = await apiFetch('/api/youtube/upload', { method: 'POST', body: formData });
      const data = await r.json();

      if (!r.ok) {
        if (data.error === 'monthly_cap_exceeded') {
          setBlocked({ message: data.message });
          setProgress(null);
          return;
        }
        throw new Error(data.error || 'Upload failed');
      }

      fetchUsage();

      if (data.warnGrace) {
        // Store transcript data, show warning modal — user confirms before generation runs
        pendingData.current = data;
        setWarnModal({
          message: data.warnMessage,
          onConfirm: () => {
            setWarnModal(null);
            const d = pendingData.current;
            pendingData.current = null;
            streamGenerate(d.transcript, true, d.segments, file?.name || 'YouTube Studio');
          },
          onCancel: () => {
            setWarnModal(null);
            pendingData.current = null;
          },
        });
        setProgress(null);
        return;
      }

      await streamGenerate(data.transcript, true, data.segments, file?.name || 'YouTube Studio');
    } catch (err) {
      setError(err.message);
      setProgress(null);
    }
  }

  // ── Notes flow ────────────────────────────────────────────────────────────
  async function handleNotesGenerate() {
    if (!notes.trim()) return;
    const label = notes.trim().slice(0, 80) + (notes.trim().length > 80 ? '…' : '');
    await streamGenerate(notes.trim(), false, [], label);
  }

  // ── Copy helpers ──────────────────────────────────────────────────────────
  function handleCopy(key, text) {
    navigator.clipboard.writeText(text);
    setCopied(p => ({ ...p, [key]: true }));
    setTimeout(() => setCopied(p => ({ ...p, [key]: false })), 2000);
  }

  function handleCopyAll() {
    if (!output) return;
    const all = [output.title, output.description, output.chapters].filter(Boolean).join('\n\n');
    handleCopy('all', all);
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────
  function onDrop(e) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }

  const isGenerating = !!progress;

  if (!isOpen) return null;

  // ── Usage meter ───────────────────────────────────────────────────────────
  const usagePct = usage ? Math.min((usage.minutesUsed / usage.monthlyLimit) * 100, 100) : 0;
  const overCap  = usage ? usage.minutesUsed >= usage.monthlyLimit && usage.graceUsed : false;

  return (
    <>
      <div style={s.overlay} onClick={onClose} />
      <div style={s.panel}>

        {/* Header */}
        <div style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Youtube size={20} style={{ color: '#FF0000' }} />
            <h2 style={s.title}>YouTube Studio</h2>
          </div>
          <button style={s.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>

        <div style={s.body}>

          {/* Mode toggle */}
          <div style={s.modeToggle}>
            <button
              style={{ ...s.modeBtn, ...(mode === 'upload' ? s.modeBtnActive : {}) }}
              onClick={() => { setMode('upload'); setOutput(null); setError(null); }}
              disabled={isGenerating}
            >
              <FileVideo size={14} style={{ marginRight: 6 }} />Upload video
            </button>
            <button
              style={{ ...s.modeBtn, ...(mode === 'notes' ? s.modeBtnActive : {}) }}
              onClick={() => { setMode('notes'); setOutput(null); setError(null); }}
              disabled={isGenerating}
            >
              ✏️ &nbsp;I have notes
            </button>
          </div>

          <div style={s.divider} />

          {/* ── UPLOAD MODE ── */}
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
                    <p style={s.usageReset}>
                      Resets on {fmtResetDate(usage.resetDate)} · Text generation is still unlimited
                    </p>
                  )}
                </div>
              )}

              {/* Blocked state */}
              {blocked ? (
                <div style={s.blockedBox}>
                  <AlertTriangle size={20} style={{ color: '#e8c97a', marginBottom: 10 }} />
                  <p style={s.blockedMsg}>{blocked.message}</p>
                </div>
              ) : (
                <>
                  {/* Dropzone */}
                  {!isGenerating && (
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
                          <FileVideo size={28} style={{ color: '#FF0000', marginBottom: 8 }} />
                          <p style={s.fileName}>{file.name}</p>
                          <p style={s.fileSize}>{(file.size / (1024 * 1024)).toFixed(1)} MB — click to change</p>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center' }}>
                          <Upload size={28} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                          <p style={s.dropzoneText}>Drop your video here or click to browse</p>
                          <p style={s.dropzoneHint}>.mp4 · .mov · .mkv · .webm · up to 90 min</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Progress */}
                  {isGenerating && <StepIndicator currentStep={progress} />}

                  {/* Generate button */}
                  {!isGenerating && (
                    <button
                      style={{ ...s.generateBtn, opacity: file ? 1 : 0.4, cursor: file ? 'pointer' : 'not-allowed' }}
                      onClick={handleVideoGenerate}
                      disabled={!file}
                    >
                      Generate YouTube package
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {/* ── NOTES MODE ── */}
          {mode === 'notes' && (
            <>
              <p style={s.notesHint}>
                Paste your talking points, bullet outline, or rough script. We'll generate a title, description, and draft chapter structure.
              </p>
              <textarea
                style={s.notesTextarea}
                placeholder="e.g. — Intro: why I quit my 9-5&#10;— How I built my first income stream&#10;— Mistakes to avoid&#10;— What I'd do differently"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={isGenerating}
                rows={8}
              />

              {/* Progress */}
              {isGenerating && (
                <div style={s.steps}>
                  <div style={s.step}>
                    <div style={s.stepDotActive}><Loader size={10} style={{ animation: 'spin 1s linear infinite' }} /></div>
                    <span style={{ ...s.stepLabel, color: 'var(--text-main)' }}>Generating title, description & draft structure…</span>
                  </div>
                </div>
              )}

              {!isGenerating && (
                <button
                  style={{ ...s.generateBtn, opacity: notes.trim() ? 1 : 0.4, cursor: notes.trim() ? 'pointer' : 'not-allowed' }}
                  onClick={handleNotesGenerate}
                  disabled={!notes.trim()}
                >
                  Generate YouTube package
                </button>
              )}
            </>
          )}

          {/* Error */}
          {error && (
            <div style={s.errorBox}>
              <AlertTriangle size={14} style={{ marginRight: 6, flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* Output */}
          {output && (
            <>
              <div style={s.divider} />
              <div style={s.outputSection}>
                <div style={s.outputHeader}>
                  <span style={s.outputTitle}>Your YouTube package</span>
                  <button style={{ ...s.copyBtn, ...s.copyAllBtn }} onClick={handleCopyAll}>
                    {copied.all ? <><Check size={12} style={{ marginRight: 4 }} />Copied!</> : <><Copy size={12} style={{ marginRight: 4 }} />Copy all</>}
                  </button>
                </div>

                <OutputBlock
                  label="Title"
                  text={output.title}
                  onCopy={() => handleCopy('title', output.title)}
                  copied={copied.title}
                />
                <OutputBlock
                  label="Description"
                  text={output.description}
                  onCopy={() => handleCopy('description', output.description)}
                  copied={copied.description}
                />
                <OutputBlock
                  label="Chapters"
                  text={output.chapters}
                  onCopy={() => handleCopy('chapters', output.chapters)}
                  copied={copied.chapters}
                  mono
                />
              </div>
            </>
          )}

        </div>{/* /body */}
      </div>

      {/* Grace warning modal */}
      {warnModal && (
        <div style={s.modalOverlay}>
          <div style={s.modal}>
            <AlertTriangle size={24} style={{ color: '#e8c97a', marginBottom: 12 }} />
            <h3 style={s.modalTitle}>Monthly limit reached</h3>
            <p style={s.modalMsg}>{warnModal.message}</p>
            <div style={s.modalBtns}>
              <button style={s.modalCancel} onClick={warnModal.onCancel}>Cancel</button>
              <button style={s.modalConfirm} onClick={warnModal.onConfirm}>Yes, continue</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  overlay:   { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, backdropFilter: 'blur(2px)' },
  panel:     { position: 'fixed', top: 0, right: 0, bottom: 0, width: '460px', backgroundColor: 'var(--panel-bg)', borderLeft: '1px solid var(--border-color)', zIndex: 101, display: 'flex', flexDirection: 'column', overflowY: 'auto' },
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 28px', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, backgroundColor: 'var(--panel-bg)', zIndex: 1 },
  title:     { margin: 0, fontSize: '1.25rem', fontWeight: '700', fontFamily: 'var(--font-heading)', color: 'var(--text-main)' },
  closeBtn:  { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex' },
  body:      { padding: '24px 28px 48px', display: 'flex', flexDirection: 'column', gap: '20px' },
  divider:   { height: '1px', backgroundColor: 'var(--border-color)', margin: '4px -28px' },

  /* Mode toggle */
  modeToggle: { display: 'flex', gap: '8px' },
  modeBtn:    { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.88rem', fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all 0.15s' },
  modeBtnActive: { borderColor: 'var(--text-main)', backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-main)', fontWeight: '600' },

  /* Usage */
  usageBox:   { backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px 16px' },
  usageRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  usageLabel: { fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' },
  usageValue: { fontSize: '0.85rem', fontWeight: '600', fontFamily: 'var(--font-body)' },
  usageTrack: { height: '4px', backgroundColor: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' },
  usageFill:  { height: '100%', borderRadius: '2px', transition: 'width 0.4s ease' },
  usageReset: { margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' },

  /* Blocked */
  blockedBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '28px 16px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px' },
  blockedMsg: { margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6 },

  /* Dropzone */
  dropzone:        { border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '36px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.15s, background 0.15s' },
  dropzoneOver:    { borderColor: 'var(--text-main)', backgroundColor: 'rgba(255,255,255,0.04)' },
  dropzoneHasFile: { borderColor: '#FF0000', borderStyle: 'solid', backgroundColor: 'rgba(255,0,0,0.04)' },
  dropzoneText:    { margin: '0 0 4px', fontSize: '0.92rem', color: 'var(--text-main)', fontFamily: 'var(--font-body)' },
  dropzoneHint:    { margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' },
  fileName:        { margin: '0 0 4px', fontSize: '0.9rem', color: 'var(--text-main)', fontFamily: 'var(--font-body)', wordBreak: 'break-all' },
  fileSize:        { margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' },

  /* Steps */
  steps:        { display: 'flex', flexDirection: 'column', gap: '14px', padding: '8px 0' },
  step:         { display: 'flex', alignItems: 'center', gap: '12px' },
  stepDot:      { width: '22px', height: '22px', borderRadius: '50%', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text-muted)' },
  stepDotDone:  { borderColor: 'var(--text-main)', backgroundColor: 'var(--text-main)', color: 'var(--bg-color)' },
  stepDotActive:{ borderColor: 'var(--text-main)', color: 'var(--text-main)' },
  stepLabel:    { fontSize: '0.88rem', fontFamily: 'var(--font-body)' },

  /* Notes */
  notesHint:     { margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, fontFamily: 'var(--font-body)' },
  notesTextarea: { width: '100%', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px 16px', fontSize: '0.92rem', lineHeight: '1.6', outline: 'none', fontFamily: 'var(--font-body)', resize: 'vertical', boxSizing: 'border-box' },

  /* Generate button */
  generateBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '13px', backgroundColor: 'var(--text-main)', color: 'var(--bg-color)', border: 'none', borderRadius: '10px', fontSize: '0.95rem', fontWeight: '600', fontFamily: 'var(--font-body)', transition: 'opacity 0.15s' },

  /* Error */
  errorBox: { display: 'flex', alignItems: 'flex-start', gap: '6px', padding: '12px 14px', backgroundColor: 'rgba(232,138,138,0.1)', border: '1px solid rgba(232,138,138,0.3)', borderRadius: '8px', color: '#e88a8a', fontSize: '0.85rem', fontFamily: 'var(--font-body)', lineHeight: 1.5 },

  /* Output */
  outputSection:   { display: 'flex', flexDirection: 'column', gap: '16px' },
  outputHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  outputTitle:     { fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' },
  outputBlock:     { backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' },
  outputBlockHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' },
  outputBlockLabel:  { fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-body)' },
  outputBlockText:   { margin: 0, padding: '14px', fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },

  /* Copy buttons */
  copyBtn:     { display: 'inline-flex', alignItems: 'center', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '6px', padding: '4px 10px', fontSize: '0.78rem', fontFamily: 'var(--font-body)', cursor: 'pointer' },
  copyAllBtn:  { padding: '6px 14px', fontSize: '0.82rem', borderColor: 'var(--text-main)', color: 'var(--text-main)' },

  /* Grace warning modal */
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal:        { backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '32px 28px', maxWidth: '400px', width: '90%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  modalTitle:   { margin: '0 0 12px', fontSize: '1.1rem', fontWeight: '700', fontFamily: 'var(--font-heading)', color: 'var(--text-main)' },
  modalMsg:     { margin: '0 0 24px', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, fontFamily: 'var(--font-body)' },
  modalBtns:    { display: 'flex', gap: '10px', width: '100%' },
  modalCancel:  { flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.9rem' },
  modalConfirm: { flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--text-main)', color: 'var(--bg-color)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: '600' },
};

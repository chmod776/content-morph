import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Send, Calendar, CheckCircle2, AlertCircle, Loader, Link2, Image as ImageIcon, Paperclip, Film } from 'lucide-react';
import { platforms } from '../platforms';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function PublishModal({ session, platformId, content, onClose, onOpenAccounts }) {
  const platform = platforms[platformId];
  const [text, setText] = useState(content);
  const [mode, setMode] = useState('now'); // 'now' | 'schedule'
  const minDate = new Date(Date.now() + 60_000).toISOString().slice(0, 16);
  const [scheduleAt, setScheduleAt] = useState(new Date(Date.now() + 60 * 60_000).toISOString().slice(0, 16));
  const [connected, setConnected] = useState(null); // null=checking, object | false
  const [accountName, setAccountName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [confirmStep, setConfirmStep] = useState(false);
  const [media, setMedia] = useState(null); // {url, file_id, media_type, content_type, name}
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const authHeaderJson = useCallback(() => ({
    'Authorization': `Bearer ${session?.access_token || ''}`,
    'Content-Type': 'application/json'
  }), [session]);
  const authHeaderRaw = useCallback(() => ({
    'Authorization': `Bearer ${session?.access_token || ''}`,
  }), [session]);

  useEffect(() => {
    fetch(`${API}/social/accounts`, { headers: authHeaderJson() })
      .then(r => r.json())
      .then(data => {
        const acc = (data.accounts || []).find(a => a.platform === platformId);
        if (acc) { setConnected(true); setAccountName(acc.account_name); }
        else setConnected(false);
      })
      .catch(() => setConnected(false));
  }, [platformId, authHeaderJson]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API}/uploads`, { method: 'POST', headers: authHeaderRaw(), body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      setMedia({ ...data, name: file.name });
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true); setResult(null);
    try {
      const endpoint = mode === 'now' ? 'post' : 'schedule';
      const body = {
        platform: platformId,
        content: text,
        ...(media ? { media_url: media.url, media_type: media.media_type } : {}),
        ...(mode === 'schedule' ? { scheduled_at: new Date(scheduleAt).toISOString() } : {})
      };
      const res = await fetch(`${API}/social/${endpoint}`, {
        method: 'POST', headers: authHeaderJson(), body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Failed');
      setResult({ success: true, message: mode === 'now' ? 'Posted successfully!' : 'Post scheduled!', data });
    } catch (e) {
      setResult({ success: false, message: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const charLimit = platformId === 'twitter' ? 280 : null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()} data-testid="publish-modal">
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Publish to <span style={{ color: platform.color }}>{platform.name}</span></h2>
            <p style={styles.subtitle}>Review your post, then publish now or schedule it.</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}><X size={24} /></button>
        </div>

        {connected === null && <div style={styles.statusBox}>Checking account…</div>}

        {connected === false && (
          <div style={{ ...styles.statusBox, borderColor: 'var(--accent-red)', color: 'var(--text-main)' }}>
            <AlertCircle size={18} color="var(--accent-red)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No {platform.name} account connected.</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Connect your account to publish from here.</div>
            </div>
            <button style={styles.connectNowBtn} onClick={onOpenAccounts} data-testid="open-accounts-from-publish">
              <Link2 size={14} style={{ marginRight: 6 }} /> Connect
            </button>
          </div>
        )}

        {connected && (
          <>
            <div style={styles.accountChip}>
              <CheckCircle2 size={14} color="var(--accent-green)" />
              <span>Posting as <strong>{accountName}</strong></span>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Post content</label>
              <textarea
                style={styles.textarea}
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={submitting || confirmStep}
                data-testid="publish-content"
              />
              <div style={styles.charRow}>
                <span style={{ color: charLimit && text.length > charLimit ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                  {text.length}{charLimit ? ` / ${charLimit}` : ''} characters
                </span>
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Media (optional)</label>
              {!media ? (
                <div style={styles.uploadRow}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    data-testid="publish-file-input"
                    disabled={submitting || confirmStep || uploading}
                  />
                  <button
                    type="button"
                    style={styles.uploadBtn}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting || confirmStep || uploading}
                    data-testid="publish-upload-btn"
                  >
                    {uploading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite', marginRight: 6 }} /> : <Paperclip size={14} style={{ marginRight: 6 }} />}
                    {uploading ? 'Uploading...' : 'Attach image or video'}
                  </button>
                  <span style={styles.uploadHint}>JPG/PNG/WebP/GIF up to 10 MB · MP4 up to 200 MB</span>
                </div>
              ) : (
                <div style={styles.mediaPreview} data-testid="publish-media-preview">
                  {media.media_type === 'image' ? (
                    <img src={media.url} alt={media.name} style={styles.previewImg} />
                  ) : (
                    <div style={styles.videoIcon}><Film size={28} /></div>
                  )}
                  <div style={styles.mediaInfo}>
                    <div style={styles.mediaName}>{media.name}</div>
                    <div style={styles.mediaMeta}>{media.media_type} · {(media.size / 1024).toFixed(0)} KB</div>
                  </div>
                  {!confirmStep && !submitting && (
                    <button style={styles.removeMediaBtn} onClick={() => setMedia(null)} data-testid="publish-remove-media">
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}
              {platformId === 'instagram' && !media && (
                <p style={styles.warnText}>Instagram requires an image or video.</p>
              )}
            </div>

            <div style={styles.modeRow}>
              <button
                style={{ ...styles.modeBtn, ...(mode === 'now' ? styles.modeBtnActive : {}) }}
                onClick={() => setMode('now')}
                data-testid="mode-now"
              >
                <Send size={14} style={{ marginRight: 6 }} /> Post now
              </button>
              <button
                style={{ ...styles.modeBtn, ...(mode === 'schedule' ? styles.modeBtnActive : {}) }}
                onClick={() => setMode('schedule')}
                data-testid="mode-schedule"
              >
                <Calendar size={14} style={{ marginRight: 6 }} /> Schedule
              </button>
            </div>

            {mode === 'schedule' && (
              <div style={styles.field}>
                <label style={styles.label}>Publish at</label>
                <input
                  type="datetime-local"
                  style={styles.dateInput}
                  value={scheduleAt}
                  min={minDate}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  data-testid="schedule-datetime"
                />
              </div>
            )}

            {result && (
              <div style={{
                ...styles.statusBox,
                borderColor: result.success ? 'var(--accent-green)' : 'var(--accent-red)',
                background: result.success ? 'rgba(74,222,128,0.06)' : 'rgba(204,68,68,0.06)'
              }} data-testid="publish-result">
                {result.success
                  ? <CheckCircle2 size={18} color="var(--accent-green)" />
                  : <AlertCircle size={18} color="var(--accent-red)" />}
                <span>{result.message}</span>
              </div>
            )}

            <div style={styles.footer}>
              <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>

              {!confirmStep && !result?.success && (
                <button
                  style={{ ...styles.primaryBtn, opacity: !text.trim() ? 0.5 : 1 }}
                  disabled={!text.trim() || submitting}
                  onClick={() => setConfirmStep(true)}
                  data-testid="review-btn"
                >
                  Review & {mode === 'now' ? 'Publish' : 'Schedule'}
                </button>
              )}

              {confirmStep && !result?.success && (
                <>
                  <button
                    style={styles.cancelBtn}
                    onClick={() => setConfirmStep(false)}
                    disabled={submitting}
                  >Edit</button>
                  <button
                    style={styles.primaryBtn}
                    onClick={handleSubmit}
                    disabled={submitting}
                    data-testid="confirm-btn"
                  >
                    {submitting ? <Loader size={14} style={{ animation: 'spin 1s linear infinite', marginRight: 6 }} /> : null}
                    Confirm {mode === 'now' ? 'Publish' : 'Schedule'}
                  </button>
                </>
              )}

              {result?.success && (
                <button style={styles.primaryBtn} onClick={onClose} data-testid="done-btn">Done</button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  title: { margin: '0 0 6px 0', fontFamily: 'var(--font-heading)', fontSize: '1.7rem' },
  subtitle: { margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' },
  statusBox: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '10px', marginBottom: '16px', color: 'var(--text-muted)', fontSize: '0.9rem' },
  accountChip: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '20px', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
  label: { fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  textarea: { width: '100%', minHeight: '160px', backgroundColor: '#1a1a1a', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', fontSize: '1rem', fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' },
  charRow: { display: 'flex', justifyContent: 'flex-end', fontSize: '0.8rem' },
  uploadRow: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  uploadBtn: { display: 'inline-flex', alignItems: 'center', background: 'transparent', border: '1px dashed var(--border-color)', color: 'var(--text-main)', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.9rem' },
  uploadHint: { fontSize: '0.75rem', color: 'var(--text-muted)' },
  mediaPreview: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '10px' },
  previewImg: { width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px' },
  videoIcon: { width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', color: 'var(--text-muted)' },
  mediaInfo: { flex: 1, minWidth: 0 },
  mediaName: { fontSize: '0.9rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  mediaMeta: { fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' },
  removeMediaBtn: { background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex' },
  warnText: { margin: '6px 0 0 0', fontSize: '0.78rem', color: 'var(--accent-red)' },
  modeRow: { display: 'flex', gap: '10px', marginBottom: '16px' },
  modeBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.92rem' },
  modeBtnActive: { borderColor: 'var(--text-main)', color: 'var(--text-main)', background: 'rgba(255,255,255,0.04)' },
  dateInput: { backgroundColor: '#1a1a1a', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px', fontSize: '1rem', fontFamily: 'var(--font-body)', outline: 'none' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' },
  cancelBtn: { background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)' },
  primaryBtn: { display: 'flex', alignItems: 'center', background: 'var(--text-main)', color: 'var(--bg-color)', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: '600' },
  connectNowBtn: { display: 'flex', alignItems: 'center', background: 'var(--text-main)', color: 'var(--bg-color)', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: '600' }
};

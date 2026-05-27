import React, { useState, useEffect, useCallback } from 'react';
import { X, Send, Calendar, CheckCircle2, AlertCircle, Loader, Link2, SkipForward } from 'lucide-react';
import { platforms } from '../platforms';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CHAR_LIMITS = { twitter: 280, linkedin: 3000, instagram: 2200, youtube: 5000 };

export default function BatchPublishModal({ session, outputs, selectedPlatforms, onClose, onOpenAccounts }) {
  // Only consider platforms that have non-empty output
  const initialPlatforms = selectedPlatforms.filter(p => outputs[p]?.trim());
  const [drafts, setDrafts] = useState(() =>
    Object.fromEntries(initialPlatforms.map(p => [p, outputs[p] || '']))
  );
  const [skipped, setSkipped] = useState(() => new Set());
  const [accounts, setAccounts] = useState(null); // null=loading, []=loaded
  const [mode, setMode] = useState('now');
  const minDate = new Date(Date.now() + 60_000).toISOString().slice(0, 16);
  const defaultSchedule = new Date(Date.now() + 60 * 60_000).toISOString().slice(0, 16);
  const [scheduleTimes, setScheduleTimes] = useState(() =>
    Object.fromEntries(initialPlatforms.map(p => [p, defaultSchedule]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [results, setResults] = useState({});  // platform -> {success, message}

  const authHeader = useCallback(() => ({
    'Authorization': `Bearer ${session?.access_token || ''}`,
    'Content-Type': 'application/json'
  }), [session]);

  useEffect(() => {
    fetch(`${API}/social/accounts`, { headers: authHeader() })
      .then(r => r.json())
      .then(data => setAccounts(data.accounts || []))
      .catch(() => setAccounts([]));
  }, [authHeader]);

  const isConnected = (p) => accounts?.some(a => a.platform === p);
  const accountName = (p) => accounts?.find(a => a.platform === p)?.account_name;

  const toggleSkip = (p) => {
    setSkipped(prev => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  };

  const platformsToPublish = initialPlatforms.filter(p => !skipped.has(p) && isConnected(p));
  const allDone = Object.keys(results).length > 0 &&
                  platformsToPublish.every(p => results[p] && (results[p].success || results[p].success === false));

  const applyTimeToAll = (iso) => {
    setScheduleTimes(prev => Object.fromEntries(initialPlatforms.map(p => [p, iso])));
  };

  const handlePublishAll = async () => {
    setSubmitting(true);
    setResults({});
    for (const p of platformsToPublish) {
      setResults(prev => ({ ...prev, [p]: { pending: true } }));
      try {
        const endpoint = mode === 'now' ? 'post' : 'schedule';
        const body = mode === 'now'
          ? { platform: p, content: drafts[p] }
          : { platform: p, content: drafts[p], scheduled_at: new Date(scheduleTimes[p]).toISOString() };
        const res = await fetch(`${API}/social/${endpoint}`, {
          method: 'POST', headers: authHeader(), body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || data.error || 'Failed');
        setResults(prev => ({
          ...prev,
          [p]: { success: true, message: mode === 'now' ? 'Posted' : `Scheduled for ${new Date(scheduleTimes[p]).toLocaleString()}` }
        }));
      } catch (e) {
        setResults(prev => ({ ...prev, [p]: { success: false, message: e.message } }));
      }
    }
    setSubmitting(false);
  };

  const eligibleCount = platformsToPublish.length;
  const successCount = Object.values(results).filter(r => r?.success).length;
  const failCount = Object.values(results).filter(r => r && r.success === false).length;

  return (
    <div style={styles.overlay} onClick={submitting ? undefined : onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()} data-testid="batch-publish-modal">
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Publish to all platforms</h2>
            <p style={styles.subtitle}>
              {confirmStep
                ? 'Final review — confirm to publish each variant.'
                : `Review each tailored variant, then publish or schedule in one shot.`}
            </p>
          </div>
          <button style={styles.closeBtn} onClick={onClose} disabled={submitting}><X size={24} /></button>
        </div>

        {accounts === null && <div style={styles.statusBox}>Loading accounts…</div>}

        {accounts !== null && (
          <>
            <div style={styles.cardList}>
              {initialPlatforms.map(p => {
                const meta = platforms[p];
                const connected = isConnected(p);
                const isSkipped = skipped.has(p);
                const result = results[p];
                const dimmed = isSkipped || !connected;

                return (
                  <div key={p} style={{
                    ...styles.platformCard,
                    borderLeftColor: meta.color,
                    opacity: dimmed ? 0.55 : 1
                  }} data-testid={`batch-card-${p}`}>
                    <div style={styles.cardHeader}>
                      <div style={styles.cardLeft}>
                        <span style={{ ...styles.platformLabel, color: meta.color }}>{meta.name}</span>
                        {connected ? (
                          <span style={styles.connectedChip}>
                            <CheckCircle2 size={11} color="var(--accent-green)" />
                            {accountName(p)}
                          </span>
                        ) : (
                          <span style={styles.disconnectedChip}>
                            <AlertCircle size={11} /> Not connected
                          </span>
                        )}
                      </div>
                      <div style={styles.cardActions}>
                        {result?.pending && <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                        {result?.success === true && (
                          <span style={styles.successTag}>
                            <CheckCircle2 size={12} color="var(--accent-green)" /> {result.message}
                          </span>
                        )}
                        {result?.success === false && (
                          <span style={styles.failTag} title={result.message}>
                            <AlertCircle size={12} color="var(--accent-red)" /> Failed
                          </span>
                        )}
                        {!submitting && !allDone && connected && (
                          <button
                            style={styles.skipBtn}
                            onClick={() => toggleSkip(p)}
                            title={isSkipped ? 'Include' : 'Skip'}
                            data-testid={`batch-skip-${p}`}
                          >
                            <SkipForward size={13} style={{ marginRight: 4 }} />
                            {isSkipped ? 'Include' : 'Skip'}
                          </button>
                        )}
                      </div>
                    </div>

                    {!confirmStep && !result ? (
                      <textarea
                        style={styles.textarea}
                        value={drafts[p] || ''}
                        onChange={(e) => setDrafts(prev => ({ ...prev, [p]: e.target.value }))}
                        disabled={isSkipped || !connected || submitting}
                        data-testid={`batch-text-${p}`}
                      />
                    ) : (
                      <div style={styles.previewBox}>{drafts[p]}</div>
                    )}

                    {mode === 'schedule' && connected && !isSkipped && (
                      <div style={styles.cardSchedule}>
                        <label style={styles.smallLabel}>
                          <Calendar size={12} style={{ marginRight: 4 }} />
                          Schedule for
                        </label>
                        {!confirmStep && !result ? (
                          <input
                            type="datetime-local"
                            style={styles.cardDateInput}
                            value={scheduleTimes[p] || defaultSchedule}
                            min={minDate}
                            onChange={(e) => setScheduleTimes(prev => ({ ...prev, [p]: e.target.value }))}
                            disabled={submitting}
                            data-testid={`batch-schedule-${p}`}
                          />
                        ) : (
                          <span style={styles.scheduleReadonly}>
                            {new Date(scheduleTimes[p]).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}

                    <div style={styles.cardFooter}>
                      {CHAR_LIMITS[p] && (
                        <span style={{ color: drafts[p]?.length > CHAR_LIMITS[p] ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                          {drafts[p]?.length || 0} / {CHAR_LIMITS[p]}
                        </span>
                      )}
                      {result?.success === false && (
                        <span style={styles.errMsg}>{result.message}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {accounts.length === 0 && (
              <div style={{ ...styles.statusBox, borderColor: 'var(--accent-red)' }}>
                <AlertCircle size={18} color="var(--accent-red)" />
                <span style={{ flex: 1 }}>No accounts connected yet. Connect at least one to publish.</span>
                <button style={styles.connectNowBtn} onClick={onOpenAccounts} data-testid="batch-open-accounts">
                  <Link2 size={14} style={{ marginRight: 6 }} /> Connect
                </button>
              </div>
            )}

            <div style={styles.modeRow}>
              <button
                style={{ ...styles.modeBtn, ...(mode === 'now' ? styles.modeBtnActive : {}) }}
                onClick={() => setMode('now')}
                disabled={submitting || confirmStep}
                data-testid="batch-mode-now"
              >
                <Send size={14} style={{ marginRight: 6 }} /> Post all now
              </button>
              <button
                style={{ ...styles.modeBtn, ...(mode === 'schedule' ? styles.modeBtnActive : {}) }}
                onClick={() => setMode('schedule')}
                disabled={submitting || confirmStep}
                data-testid="batch-mode-schedule"
              >
                <Calendar size={14} style={{ marginRight: 6 }} /> Schedule all
              </button>
            </div>

            {mode === 'schedule' && !confirmStep && initialPlatforms.length > 1 && (
              <div style={styles.field}>
                <label style={styles.label}>Quick set: apply one time to all platforms</label>
                <div style={styles.applyAllRow}>
                  <input
                    type="datetime-local"
                    style={styles.dateInput}
                    defaultValue={defaultSchedule}
                    min={minDate}
                    onChange={(e) => e.target.dataset.value = e.target.value}
                    disabled={submitting}
                    data-testid="batch-apply-all-datetime"
                    id="batch-apply-all-input"
                  />
                  <button
                    style={styles.applyAllBtn}
                    onClick={(e) => {
                      const input = document.getElementById('batch-apply-all-input');
                      if (input?.value) applyTimeToAll(input.value);
                    }}
                    disabled={submitting}
                    data-testid="batch-apply-all-btn"
                  >
                    Apply to all
                  </button>
                </div>
                <p style={styles.helpText}>You can still set a custom time per platform in each card above.</p>
              </div>
            )}

            <div style={styles.summaryRow}>
              {!allDone && (
                <span style={styles.summaryText}>
                  {eligibleCount} platform{eligibleCount !== 1 ? 's' : ''} will receive this post
                </span>
              )}
              {allDone && (
                <span style={styles.summaryText} data-testid="batch-final-summary">
                  Done — {successCount} succeeded, {failCount} failed
                </span>
              )}
            </div>

            <div style={styles.footer}>
              <button style={styles.cancelBtn} onClick={onClose} disabled={submitting}>
                {allDone ? 'Close' : 'Cancel'}
              </button>

              {!confirmStep && !allDone && (
                <button
                  style={{ ...styles.primaryBtn, opacity: eligibleCount === 0 ? 0.5 : 1 }}
                  disabled={eligibleCount === 0}
                  onClick={() => setConfirmStep(true)}
                  data-testid="batch-review-btn"
                >
                  Review & {mode === 'now' ? 'Publish' : 'Schedule'} ({eligibleCount})
                </button>
              )}

              {confirmStep && !allDone && (
                <>
                  <button
                    style={styles.cancelBtn}
                    onClick={() => setConfirmStep(false)}
                    disabled={submitting}
                  >Edit</button>
                  <button
                    style={styles.primaryBtn}
                    onClick={handlePublishAll}
                    disabled={submitting}
                    data-testid="batch-confirm-btn"
                  >
                    {submitting && <Loader size={14} style={{ animation: 'spin 1s linear infinite', marginRight: 6 }} />}
                    Confirm {mode === 'now' ? 'Publish All' : 'Schedule All'}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' },
  modal: { backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '720px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  title: { margin: '0 0 6px 0', fontFamily: 'var(--font-heading)', fontSize: '1.7rem' },
  subtitle: { margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' },
  statusBox: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '10px', marginBottom: '16px', color: 'var(--text-muted)', fontSize: '0.9rem' },
  cardList: { display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' },
  platformCard: { borderLeft: '3px solid', backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: '10px', padding: '14px 16px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' },
  cardLeft: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  platformLabel: { fontFamily: 'var(--font-aesthetic)', fontWeight: 600, fontSize: '1.05rem' },
  connectedChip: { display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-muted)', backgroundColor: 'rgba(74,222,128,0.08)', padding: '3px 9px', borderRadius: '12px' },
  disconnectedChip: { display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--accent-red)', backgroundColor: 'rgba(204,68,68,0.08)', padding: '3px 9px', borderRadius: '12px' },
  cardActions: { display: 'flex', alignItems: 'center', gap: '10px' },
  skipBtn: { display: 'flex', alignItems: 'center', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.78rem' },
  successTag: { display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--accent-green)' },
  failTag: { display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--accent-red)' },
  textarea: { width: '100%', minHeight: '90px', backgroundColor: '#1a1a1a', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.95rem', fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' },
  previewBox: { whiteSpace: 'pre-wrap', backgroundColor: '#1a1a1a', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.92rem', color: 'var(--text-main)', maxHeight: '160px', overflowY: 'auto' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', marginTop: '8px' },
  errMsg: { color: 'var(--accent-red)', fontSize: '0.78rem', textAlign: 'right' },
  modeRow: { display: 'flex', gap: '10px', marginBottom: '14px' },
  modeBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.9rem' },
  modeBtnActive: { borderColor: 'var(--text-main)', color: 'var(--text-main)', background: 'rgba(255,255,255,0.04)' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' },
  label: { fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  smallLabel: { display: 'inline-flex', alignItems: 'center', fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  dateInput: { backgroundColor: '#1a1a1a', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '11px 14px', fontSize: '0.95rem', fontFamily: 'var(--font-body)', outline: 'none', flex: 1 },
  cardSchedule: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', padding: '8px 10px', backgroundColor: 'rgba(255,255,255,0.025)', borderRadius: '8px' },
  cardDateInput: { backgroundColor: '#1a1a1a', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 10px', fontSize: '0.85rem', fontFamily: 'var(--font-body)', outline: 'none' },
  scheduleReadonly: { fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'var(--font-body)' },
  applyAllRow: { display: 'flex', gap: '8px' },
  applyAllBtn: { background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0 16px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.88rem', whiteSpace: 'nowrap' },
  helpText: { margin: '4px 0 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' },
  summaryRow: { display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' },
  summaryText: { fontSize: '0.85rem', color: 'var(--text-muted)' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' },
  cancelBtn: { background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)' },
  primaryBtn: { display: 'flex', alignItems: 'center', background: 'var(--text-main)', color: 'var(--bg-color)', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: '600' },
  connectNowBtn: { display: 'flex', alignItems: 'center', background: 'var(--text-main)', color: 'var(--bg-color)', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: '600' }
};

import React, { useState } from 'react';
import { X, RotateCcw, Trash2, Clock, ChevronRight } from 'lucide-react';
import { platforms } from '../platforms';
import { useTranslation } from '../hooks/useTranslation';

function timeAgo(createdAt, id) {
  const ts = createdAt ? new Date(createdAt).getTime() : id;
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs  < 24) return `${hrs}h ago`;
  if (days === 1) return 'Yesterday';
  if (days  < 7) return `${days} days ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: days > 364 ? 'numeric' : undefined });
}

export default function HistoryPanel({ isOpen, onClose, history, onRestore, onClear, onDelete }) {
  const [expandedId, setExpandedId] = useState(null);
  const t = useTranslation();

  if (!isOpen) return null;

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.panel}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <Clock size={16} style={{ marginRight: '8px', color: 'var(--text-muted)' }} />
            <h2 style={styles.title}>{t.historyTitle}</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {history.length > 0 && (
              <button style={styles.clearAllBtn} onClick={onClear} title={t.clearAll}>
                <Trash2 size={14} style={{ marginRight: '5px' }} />
                {t.clearAll}
              </button>
            )}
            <button style={styles.closeBtn} onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={styles.body}>
          {history.length === 0 ? (
            <div style={styles.empty}>
              <Clock size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
              <p style={styles.emptyTitle}>{t.noHistoryTitle}</p>
              <p style={styles.emptyDesc}>{t.noHistoryDesc}</p>
            </div>
          ) : (
            <div style={styles.list}>
              {history.map(entry => {
                const isExpanded = expandedId === entry.id;
                const platformNames = entry.selectedPlatforms.map(id => platforms[id]?.name).filter(Boolean);
                const preview = entry.input.length > 80 ? entry.input.slice(0, 80) + '...' : entry.input;

                return (
                  <div key={entry.id} style={styles.entry}>
                    <div style={styles.entryHeader} onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
                      <div style={styles.entryMeta}>
                        <span style={styles.entryTime}>{timeAgo(entry.createdAt, entry.id)}</span>
                        <div style={styles.entryPlatforms}>
                          {entry.selectedPlatforms.map(id => (
                            <span key={id} style={{ ...styles.platformDot, backgroundColor: platforms[id]?.color }} />
                          ))}
                          <span style={styles.platformNames}>{platformNames.join(', ')}</span>
                        </div>
                      </div>
                      <ChevronRight size={14} style={{ color: 'var(--text-muted)', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                    </div>

                    <p style={styles.entryPreview}>{preview}</p>

                    {isExpanded && (
                      <div style={styles.entryExpanded}>
                        <div style={styles.fullInput}>{entry.input}</div>
                        {entry.selectedPlatforms.map(id => entry.outputs[id] ? (
                          <div key={id} style={styles.outputPreview}>
                            <div style={{ ...styles.outputPlatformLabel, color: platforms[id]?.color }}>{platforms[id]?.name}</div>
                            <div style={styles.outputText}>
                              {entry.outputs[id].length > 200 ? entry.outputs[id].slice(0, 200) + '...' : entry.outputs[id]}
                            </div>
                          </div>
                        ) : null)}
                      </div>
                    )}

                    <div style={styles.entryActions}>
                      <button
                        style={styles.restoreBtn}
                        onClick={() => { onRestore(entry); onClose(); }}
                      >
                        <RotateCcw size={12} style={{ marginRight: '5px' }} />
                        {t.restore}
                      </button>
                      <button style={styles.deleteBtn} onClick={() => onDelete(entry.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 100,
    backdropFilter: 'blur(2px)',
  },
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '420px',
    backgroundColor: 'var(--panel-bg)',
    borderLeft: '1px solid var(--border-color)',
    zIndex: 101,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '28px 32px',
    borderBottom: '1px solid var(--border-color)',
    position: 'sticky',
    top: 0,
    backgroundColor: 'var(--panel-bg)',
    zIndex: 1,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '1.4rem',
    fontWeight: '700',
    fontFamily: 'var(--font-heading)',
    color: 'var(--text-main)',
  },
  clearAllBtn: {
    display: 'flex',
    alignItems: 'center',
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.82rem',
    fontFamily: 'var(--font-body)',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    display: 'flex',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '48px 32px',
    textAlign: 'center',
    color: 'var(--text-muted)',
  },
  emptyTitle: {
    margin: '0 0 8px',
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  emptyDesc: {
    margin: 0,
    fontSize: '0.88rem',
    lineHeight: '1.6',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  entry: {
    padding: '18px 32px',
    borderBottom: '1px solid var(--border-color)',
    transition: 'background-color 0.15s',
  },
  entryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    cursor: 'pointer',
    marginBottom: '6px',
    gap: '8px',
  },
  entryMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  entryTime: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-body)',
  },
  entryPlatforms: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    flexWrap: 'wrap',
  },
  platformDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  platformNames: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-body)',
  },
  entryPreview: {
    margin: '0 0 10px',
    fontSize: '0.9rem',
    color: 'var(--text-main)',
    lineHeight: '1.5',
    fontFamily: 'var(--font-body)',
  },
  entryExpanded: {
    marginBottom: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  fullInput: {
    padding: '12px',
    backgroundColor: 'var(--bg-color)',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontFamily: 'var(--font-body)',
    color: 'var(--text-main)',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    maxHeight: '150px',
    overflowY: 'auto',
  },
  outputPreview: {
    padding: '10px 12px',
    backgroundColor: 'var(--bg-color)',
    borderRadius: '8px',
  },
  outputPlatformLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    fontFamily: 'var(--font-aesthetic)',
    marginBottom: '6px',
  },
  outputText: {
    fontSize: '0.82rem',
    fontFamily: 'var(--font-body)',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
  },
  entryActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  restoreBtn: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'transparent',
    color: 'var(--text-main)',
    border: '1px solid var(--border-color)',
    padding: '6px 14px',
    borderRadius: '4px',
    fontSize: '0.82rem',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  deleteBtn: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid transparent',
    padding: '6px',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
};

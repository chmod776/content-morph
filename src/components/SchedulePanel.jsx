import React from 'react';
import { X, Clock, CalendarOff } from 'lucide-react';
import { platforms } from '../platforms';
import { useTranslation } from '../hooks/useTranslation';

function formatTime(timestamp, t) {
  const diff = timestamp - Date.now();
  const mins = Math.round(diff / 60000);
  const hours = Math.round(diff / 3600000);
  const days = Math.round(diff / 86400000);
  const full = new Date(timestamp).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  let relative;
  if (mins < 60) relative = t.inMinutes(mins);
  else if (hours < 24) relative = t.inHours(hours);
  else relative = t.inDays(days);
  return { full, relative };
}

export default function SchedulePanel({ isOpen, scheduledPosts, onCancel, onClose }) {
  const sorted = [...scheduledPosts].sort((a, b) => a.scheduledAt - b.scheduledAt);
  const t = useTranslation();

  return (
    <>
      {isOpen && <div style={styles.backdrop} onClick={onClose} />}
      <div style={{ ...styles.panel, transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <Clock size={15} style={{ marginRight: '8px', color: 'var(--text-muted)' }} />
            <h3 style={styles.title}>{t.scheduledTitle}</h3>
            {scheduledPosts.length > 0 && (
              <span style={styles.badge}>{scheduledPosts.length}</span>
            )}
          </div>
          <button style={styles.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>

        <div style={styles.body}>
          {sorted.length === 0 ? (
            <div style={styles.empty}>
              <CalendarOff size={36} style={{ marginBottom: '14px', opacity: 0.25 }} />
              <p style={styles.emptyTitle}>{t.noScheduledTitle}</p>
              <p style={styles.emptySub}>{t.noScheduledDesc}</p>
            </div>
          ) : (
            sorted.map(post => {
              const platform = platforms[post.platformId];
              const { full, relative } = formatTime(post.scheduledAt, t);
              return (
                <div key={post.id} style={styles.entry}>
                  <div style={styles.entryHeader}>
                    <span style={{ ...styles.platformName, color: platform.color }}>{platform.name}</span>
                    <span style={styles.relativeTime}>{relative}</span>
                  </div>
                  <div style={styles.fullTime}>{full}</div>
                  <p style={styles.preview}>
                    {post.content.slice(0, 130)}{post.content.length > 130 ? '…' : ''}
                  </p>
                  <button
                    style={styles.cancelBtn}
                    onClick={() => onCancel(post.id)}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(220,38,38,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {t.cancelPost}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 200,
  },
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '380px',
    maxWidth: '100vw',
    backgroundColor: 'var(--panel-bg)',
    borderLeft: '1px solid var(--border-color)',
    zIndex: 201,
    transition: 'transform 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid var(--border-color)',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    fontFamily: 'var(--font-aesthetic)',
  },
  badge: {
    marginLeft: '8px',
    backgroundColor: 'var(--text-main)',
    color: 'var(--bg-color)',
    borderRadius: '10px',
    padding: '1px 7px',
    fontSize: '0.72rem',
    fontWeight: '700',
    fontFamily: 'var(--font-body)',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    borderRadius: '4px',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '48px 20px',
  },
  emptyTitle: {
    margin: '0 0 8px',
    fontSize: '1rem',
    fontWeight: '500',
    color: 'var(--text-main)',
  },
  emptySub: {
    margin: 0,
    fontSize: '0.84rem',
    lineHeight: '1.55',
    maxWidth: '260px',
  },
  entry: {
    backgroundColor: 'var(--bg-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  entryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  platformName: {
    fontSize: '0.9rem',
    fontWeight: '700',
    fontFamily: 'var(--font-aesthetic)',
  },
  relativeTime: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-body)',
  },
  fullTime: {
    fontSize: '0.79rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-body)',
  },
  preview: {
    margin: '6px 0 8px',
    fontSize: '0.85rem',
    color: 'var(--text-main)',
    lineHeight: '1.5',
    fontFamily: 'var(--font-body)',
    opacity: 0.8,
    whiteSpace: 'pre-wrap',
  },
  cancelBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    color: '#dc2626',
    border: '1px solid #dc2626',
    borderRadius: '6px',
    padding: '5px 12px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    transition: 'background-color 0.15s',
  },
};

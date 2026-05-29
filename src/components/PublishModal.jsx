import React, { useState } from 'react';
import { X, Send, Clock, CheckCircle } from 'lucide-react';
import { platforms } from '../platforms';
import { useTranslation } from '../hooks/useTranslation';

function getMinDatetimeStr() {
  const d = new Date(Date.now() + 60000);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getDefaultDatetimeStr() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PublishModal({ posts, onClose, onPublishNow, onSchedule }) {
  const [activeTab, setActiveTab] = useState(posts[0]?.platformId || '');
  const [editedContents, setEditedContents] = useState(() => {
    const init = {};
    posts.forEach(p => { init[p.platformId] = p.content; });
    return init;
  });
  const [posted, setPosted] = useState(false);
  const [scheduleDatetime, setScheduleDatetime] = useState(getDefaultDatetimeStr);
  const t = useTranslation();

  const activePlatform = platforms[activeTab];

  const handlePostNow = () => {
    setPosted(true);
    const editedPosts = posts.map(p => ({ platformId: p.platformId, content: editedContents[p.platformId] }));
    setTimeout(() => {
      onPublishNow(editedPosts);
      onClose();
    }, 1300);
  };

  const handleSchedule = () => {
    if (!scheduleDatetime) return;
    const scheduledAt = new Date(scheduleDatetime).getTime();
    if (scheduledAt <= Date.now()) {
      alert(t.futureDate);
      return;
    }
    const editedPosts = posts.map(p => ({ platformId: p.platformId, content: editedContents[p.platformId] }));
    onSchedule(editedPosts, scheduledAt);
    onClose();
  };

  const currentContent = editedContents[activeTab] || '';

  return (
    <>
      <div style={styles.backdrop} onClick={onClose} />
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>
            {posts.length === 1
              ? t.publishToSingle(activePlatform?.name)
              : t.publishToMulti(posts.length)}
          </h3>
          <button style={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {posts.length > 1 && (
          <div style={styles.tabs}>
            {posts.map(p => {
              const plat = platforms[p.platformId];
              const isActive = activeTab === p.platformId;
              return (
                <button
                  key={p.platformId}
                  style={{
                    ...styles.tab,
                    backgroundColor: isActive ? plat.color : 'transparent',
                    color: isActive ? '#fff' : 'var(--text-muted)',
                    borderColor: isActive ? plat.color : 'var(--border-color)',
                  }}
                  onClick={() => setActiveTab(p.platformId)}
                >
                  {plat.name}
                </button>
              );
            })}
          </div>
        )}

        <div style={styles.body}>
          <div style={styles.textareaWrapper}>
            <textarea
              style={styles.textarea}
              value={currentContent}
              onChange={e => setEditedContents(prev => ({ ...prev, [activeTab]: e.target.value }))}
              rows={9}
            />
            <span style={styles.charCount}>{currentContent.length} {t.chars}</span>
          </div>

          <div style={styles.actions}>
            <button
              style={{ ...styles.postNowBtn, ...(posted ? styles.postedBtn : {}) }}
              onClick={handlePostNow}
              disabled={posted}
            >
              {posted
                ? <><CheckCircle size={15} style={{ marginRight: '7px' }} />{t.posted}</>
                : <><Send size={15} style={{ marginRight: '7px' }} />{t.postNow}</>
              }
            </button>

            <div style={styles.orDivider}>
              <div style={styles.orLine} />
              <span style={styles.orText}>{t.orSchedule}</span>
              <div style={styles.orLine} />
            </div>

            <div style={styles.scheduleRow}>
              <input
                type="datetime-local"
                style={styles.dateInput}
                value={scheduleDatetime}
                min={getMinDatetimeStr()}
                onChange={e => setScheduleDatetime(e.target.value)}
              />
              <button style={styles.scheduleBtn} onClick={handleSchedule}>
                <Clock size={14} style={{ marginRight: '7px' }} />
                {t.schedule}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'var(--panel-bg)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '560px',
    zIndex: 1001,
    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid var(--border-color)',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    fontFamily: 'var(--font-aesthetic)',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    borderRadius: '6px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    padding: '12px 24px',
    borderBottom: '1px solid var(--border-color)',
    flexWrap: 'wrap',
    flexShrink: 0,
  },
  tab: {
    padding: '5px 14px',
    borderRadius: '20px',
    border: '1px solid',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: '600',
    fontFamily: 'var(--font-aesthetic)',
    transition: 'all 0.15s ease',
  },
  body: {
    padding: '20px 24px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto',
  },
  textareaWrapper: {
    position: 'relative',
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-main)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '12px 14px 28px',
    fontSize: '0.92rem',
    fontFamily: 'var(--font-body)',
    lineHeight: '1.6',
    resize: 'vertical',
    outline: 'none',
  },
  charCount: {
    position: 'absolute',
    bottom: '10px',
    right: '12px',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  postNowBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--text-main)',
    color: 'var(--bg-color)',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '0.95rem',
    fontWeight: '600',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    width: '100%',
    transition: 'background-color 0.2s',
  },
  postedBtn: {
    backgroundColor: '#16a34a',
    color: '#ffffff',
    cursor: 'default',
  },
  orDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  orLine: {
    flex: 1,
    height: '1px',
    backgroundColor: 'var(--border-color)',
  },
  orText: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    fontFamily: 'var(--font-body)',
  },
  scheduleRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  dateInput: {
    flex: 1,
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-main)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '0.88rem',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    colorScheme: 'dark',
  },
  scheduleBtn: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'transparent',
    color: 'var(--text-main)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '0.88rem',
    fontWeight: '600',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'border-color 0.2s',
  },
};

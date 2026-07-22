import React, { useState, useRef, useEffect } from 'react';
import { Send, History, Settings, LogOut, ChevronDown, User } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../context/AuthContext';

export default function InputPanel({ input, setInput, isGenerating, onGenerate, onSettingsOpen, onHistoryOpen, historyCount, settingsRef, gearPulse }) {
  const t = useTranslation();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Account';
  const initials = displayName.slice(0, 1).toUpperCase();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Content Morph</h2>
        <div style={styles.headerIcons}>
          {/* Account menu */}
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              style={styles.userChip}
              onClick={() => setMenuOpen(o => !o)}
              title="Account"
            >
              {user?.profile_image_url ? (
                <img src={user.profile_image_url} alt="" style={styles.avatar} />
              ) : (
                <div style={styles.avatarInitials}>{initials}</div>
              )}
              <span style={styles.userName}>{displayName}</span>
              <ChevronDown size={12} style={{ marginLeft: '4px', opacity: 0.6 }} />
            </button>
            {menuOpen && (
              <div style={styles.dropdown}>
                <div style={styles.dropdownHeader}>
                  <div style={styles.dropdownName}>{displayName}</div>
                  {user?.email && <div style={styles.dropdownEmail}>{user.email}</div>}
                </div>
                <div style={styles.dropdownDivider} />
                <button
                  style={styles.dropdownItem}
                  onClick={() => { setMenuOpen(false); logout(); }}
                >
                  <LogOut size={14} style={{ marginRight: '8px' }} />
                  Sign out
                </button>
              </div>
            )}
          </div>

          <button style={{ ...styles.iconBtn, position: 'relative' }} title={t.history} onClick={onHistoryOpen}>
            <History size={16} />
            {historyCount > 0 && (
              <span style={styles.historyBadge}>{historyCount > 9 ? '9+' : historyCount}</span>
            )}
          </button>
          <button
            ref={settingsRef}
            style={styles.iconBtn}
            className={gearPulse ? 'gear-pulse' : ''}
            title={t.settings}
            onClick={onSettingsOpen}
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      <p style={styles.subtitle}>{t.subtitle}</p>

      <div style={styles.inputWrapper}>
        <textarea
          style={styles.textarea}
          placeholder={t.placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isGenerating}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--accent-twitter)';
            e.target.style.boxShadow = '0 0 0 1px var(--accent-twitter)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border-color)';
            e.target.style.boxShadow = 'none';
          }}
        />
        <div style={styles.footer}>
          <span style={styles.charCount}>{input.length} {t.characters}</span>

          <button
            style={{
              ...styles.transformBtn,
              opacity: (!input.trim() || isGenerating) ? 0.5 : 1,
              cursor: (!input.trim() || isGenerating) ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => {
              if (input.trim() && !isGenerating) {
                e.currentTarget.style.backgroundColor = 'var(--text-main)';
                e.currentTarget.style.color = 'var(--bg-color)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-color)';
              e.currentTarget.style.color = 'var(--text-main)';
            }}
            onClick={onGenerate}
            disabled={!input.trim() || isGenerating}
          >
            {isGenerating ? t.morphing : t.transform}
            <Send size={16} style={{ marginLeft: '8px' }} />
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '32px',
    backgroundColor: 'var(--panel-bg)',
    borderBottom: '1px solid var(--border-color)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '24px',
    borderBottom: '1px solid var(--border-color)',
    marginBottom: '32px'
  },
  title: {
    margin: 0,
    fontSize: '2.5rem',
    fontWeight: '700',
    fontFamily: 'var(--font-heading)',
    letterSpacing: '-0.02em',
  },
  headerIcons: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  userChip: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    border: '1px solid var(--border-color)',
    borderRadius: '20px',
    padding: '5px 10px 5px 6px',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    marginRight: '8px',
    cursor: 'pointer',
    gap: '6px',
  },
  avatar: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  avatarInitials: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    backgroundColor: 'var(--border-color)',
    color: 'var(--text-main)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.72rem',
    fontWeight: '700',
    fontFamily: 'var(--font-body)',
    flexShrink: 0,
  },
  userName: {
    fontFamily: 'var(--font-body)',
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    backgroundColor: 'var(--panel-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    minWidth: '200px',
    zIndex: 150,
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
  },
  dropdownHeader: {
    padding: '12px 14px',
  },
  dropdownName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    fontFamily: 'var(--font-body)',
    marginBottom: '2px',
  },
  dropdownEmail: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-body)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dropdownDivider: {
    height: '1px',
    backgroundColor: 'var(--border-color)',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '0.88rem',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    textAlign: 'left',
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s, color 0.2s'
  },
  historyBadge: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    backgroundColor: 'var(--text-main)',
    color: 'var(--bg-color)',
    borderRadius: '10px',
    fontSize: '0.6rem',
    fontWeight: '700',
    padding: '1px 4px',
    lineHeight: '1.4',
    fontFamily: 'var(--font-aesthetic)',
  },
  subtitle: {
    margin: '0 0 24px 0',
    color: 'var(--text-muted)',
    fontSize: '1.2rem'
  },
  inputWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  textarea: {
    width: '100%',
    minHeight: '160px',
    resize: 'vertical',
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-main)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '24px',
    fontSize: '1.25rem',
    lineHeight: '1.6',
    outline: 'none',
    fontFamily: 'var(--font-body)',
    transition: 'all 0.2s ease',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '12px',
    marginTop: '8px'
  },
  charCount: {
    color: 'var(--text-muted)',
    fontSize: '1rem',
    fontWeight: '500',
    marginRight: 'auto'
  },
  transformBtn: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-main)',
    border: '1px solid var(--text-main)',
    padding: '12px 28px',
    borderRadius: '4px',
    fontWeight: '500',
    fontSize: '1.15rem',
    fontFamily: 'var(--font-body)',
    transition: 'all 0.2s ease'
  },
};

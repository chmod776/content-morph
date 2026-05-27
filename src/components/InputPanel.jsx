import React from 'react';
import { Send, Save, Link, Calendar, History, Settings, User } from 'lucide-react';

export default function InputPanel({ input, setInput, isGenerating, onGenerate, onSave, onSettingsOpen, onHistoryOpen, historyCount }) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Content Morph</h2>
        <div style={styles.headerIcons}>
          <div style={styles.userChip}>
            <User size={13} style={{ marginRight: '5px' }} />
            <span style={styles.userName}>calebmamol</span>
          </div>
          <button style={styles.iconBtn} title="Share link">
            <Link size={16} />
          </button>
          <button style={styles.iconBtn} title="Calendar">
            <Calendar size={16} />
          </button>
          <button style={{ ...styles.iconBtn, position: 'relative' }} title="History" onClick={onHistoryOpen}>
            <History size={16} />
            {historyCount > 0 && (
              <span style={styles.historyBadge}>{historyCount > 9 ? '9+' : historyCount}</span>
            )}
          </button>
          <button style={styles.iconBtn} title="Settings" onClick={onSettingsOpen}>
            <Settings size={16} />
          </button>
        </div>
      </div>
      
      <p style={styles.subtitle}>Transform your raw notes into platform-ready posts.</p>
      
      <div style={styles.inputWrapper}>
        <textarea
          style={styles.textarea}
          placeholder="Paste your raw content, idea, or notes here..."
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
          <span style={styles.charCount}>{input.length} characters</span>
          
          <button
            style={{
              ...styles.saveBtn,
              opacity: !input.trim() ? 0.4 : 1,
              cursor: !input.trim() ? 'not-allowed' : 'pointer'
            }}
            onClick={onSave}
            disabled={!input.trim()}
            title="Save content"
          >
            <Save size={15} style={{ marginRight: '6px' }} />
            Save
          </button>

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
            {isGenerating ? 'Morphing...' : 'Transform'}
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
    padding: '5px 12px',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    marginRight: '8px'
  },
  userName: {
    fontFamily: 'var(--font-body)',
    fontSize: '0.82rem',
    color: 'var(--text-muted)'
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
  saveBtn: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid var(--border-color)',
    padding: '10px 20px',
    borderRadius: '4px',
    fontWeight: '500',
    fontSize: '1rem',
    fontFamily: 'var(--font-body)',
    transition: 'all 0.2s ease'
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
  }
};

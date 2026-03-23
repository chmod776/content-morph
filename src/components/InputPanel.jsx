import React from 'react';
import { Send } from 'lucide-react';

export default function InputPanel({ input, setInput, isGenerating, onGenerate }) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Content Morph</h2>
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
    marginBottom: '8px'
  },
  title: {
    margin: 0,
    fontSize: '2.5rem',
    fontWeight: '700',
    fontFamily: 'var(--font-heading)',
    letterSpacing: '-0.02em',
    paddingBottom: '24px',
    borderBottom: '1px solid var(--border-color)',
    width: '100%',
    marginBottom: '32px'
  },
  settingsBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '8px',
    display: 'flex',
    transition: 'background-color 0.2s, color 0.2s'
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
    backgroundColor: '#1a1a1a',
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
    gap: '16px',
    marginTop: '8px'
  },
  charCount: {
    color: 'var(--text-muted)',
    fontSize: '1rem',
    fontWeight: '500'
  },
  warning: {
    color: 'var(--accent-red)',
    fontSize: '0.85rem',
    fontWeight: '500'
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

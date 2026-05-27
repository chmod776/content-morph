import React from 'react';
import { Send, Settings, Save, History, User, LogIn, Link2, Calendar } from 'lucide-react';

export default function InputPanel({
  input, setInput, isGenerating, onGenerate,
  onOpenSettings, onOpenSessions, onSaveSession,
  onOpenSocialAccounts, onOpenScheduled,
  hasOutput, session, onOpenAuth
}) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Content Morph</h2>
          <p style={styles.subtitle}>Transform your raw notes into platform-ready posts.</p>
        </div>
        <div style={styles.headerActions}>
          {session ? (
            <>
              <div style={styles.userBadge} title={session.user.email} data-testid="user-badge">
                <User size={14} />
                <span style={styles.userEmail}>{session.user.email.split('@')[0]}</span>
              </div>
              <button style={styles.iconBtn} onClick={onOpenSocialAccounts} title="Connected accounts" data-testid="open-accounts-btn">
                <Link2 size={20} />
              </button>
              <button style={styles.iconBtn} onClick={onOpenScheduled} title="Scheduled posts" data-testid="open-scheduled-btn">
                <Calendar size={20} />
              </button>
              <button style={styles.iconBtn} onClick={onOpenSessions} title="Saved sessions" data-testid="open-sessions-btn">
                <History size={20} />
              </button>
            </>
          ) : (
            <button style={styles.loginBtn} onClick={onOpenAuth} title="Sign in" data-testid="signin-btn">
              <LogIn size={16} />
              <span>Sign In</span>
            </button>
          )}
          <button style={styles.iconBtn} onClick={onOpenSettings} title="Settings" data-testid="open-settings-btn">
            <Settings size={20} />
          </button>
        </div>
      </div>

      <div style={styles.inputWrapper}>
        <textarea
          style={styles.textarea}
          placeholder="Paste your raw content, idea, or notes here..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isGenerating}
          data-testid="input-textarea"
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
          <div style={styles.footerActions}>
            {hasOutput && session && (
              <button style={styles.saveBtn} onClick={onSaveSession} title="Save this session" data-testid="save-session-btn">
                <Save size={15} /> Save
              </button>
            )}
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
              data-testid="transform-btn"
            >
              {isGenerating ? 'Morphing...' : 'Transform'}
              <Send size={16} style={{ marginLeft: '8px' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '32px', backgroundColor: 'var(--panel-bg)', borderBottom: '1px solid var(--border-color)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '24px', marginBottom: '32px' },
  title: { margin: '0 0 4px 0', fontSize: '2.5rem', fontWeight: '700', fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' },
  subtitle: { margin: 0, color: 'var(--text-muted)', fontSize: '1.1rem' },
  headerActions: { display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 },
  iconBtn: { background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', transition: 'all 0.2s ease' },
  userBadge: { display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 12px', color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '140px' },
  userEmail: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  loginBtn: { display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px 14px', borderRadius: '8px', fontFamily: 'var(--font-body)', fontSize: '0.9rem' },
  inputWrapper: { display: 'flex', flexDirection: 'column', gap: '12px' },
  textarea: { width: '100%', minHeight: '160px', resize: 'vertical', backgroundColor: '#1a1a1a', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', fontSize: '1.25rem', lineHeight: '1.6', outline: 'none', fontFamily: 'var(--font-body)', transition: 'all 0.2s ease' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' },
  charCount: { color: 'var(--text-muted)', fontSize: '1rem', fontWeight: '500' },
  footerActions: { display: 'flex', alignItems: 'center', gap: '12px' },
  saveBtn: { display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '10px 18px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '1rem' },
  transformBtn: { display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--text-main)', padding: '12px 28px', borderRadius: '4px', fontWeight: '500', fontSize: '1.15rem', fontFamily: 'var(--font-body)', transition: 'all 0.2s ease' }
};

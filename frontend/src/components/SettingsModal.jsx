import React, { useState } from 'react';
import { X, LogOut } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function SettingsModal({ initialBrandVoice, session, onClose, onSave }) {
  const [voice, setVoice] = useState(initialBrandVoice || '');
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Settings</h2>
          <button style={styles.closeBtn} onClick={onClose}><X size={24} /></button>
        </div>
        <div style={styles.content}>
          <label style={styles.label}>Your Brand Voice</label>
          <p style={styles.helpText}>Describe the persona or tone you want the AI to adopt when generating content.</p>
          <textarea style={styles.textarea} placeholder="e.g., 'I am a sarcastic software engineer who loves puns'" value={voice} onChange={(e) => setVoice(e.target.value)} data-testid="brand-voice-textarea" />
        </div>
        {session && (
          <div style={styles.accountSection}>
            <label style={styles.label}>Account</label>
            <p style={styles.helpText}>Logged in as {session.user.email}</p>
            <button style={styles.logoutBtn} onClick={async () => { await supabase.auth.signOut(); onClose(); }} data-testid="logout-btn">
              <LogOut size={16} /> Log Out
            </button>
          </div>
        )}
        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={styles.saveBtn} onClick={() => onSave(voice)} data-testid="settings-save-btn">Save Changes</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { margin: 0, fontFamily: 'var(--font-heading)', fontSize: '2rem' },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' },
  content: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' },
  label: { fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-main)' },
  helpText: { margin: '0 0 8px 0', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' },
  textarea: { width: '100%', minHeight: '120px', backgroundColor: '#1a1a1a', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', fontSize: '1rem', fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '24px' },
  cancelBtn: { background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: '500' },
  saveBtn: { background: 'var(--text-main)', color: 'var(--bg-color)', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: '600' },
  accountSection: { display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)' }
};

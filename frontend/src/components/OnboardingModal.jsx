import React, { useState } from 'react';

export default function OnboardingModal({ onSave, onSkip }) {
  const [inputValue, setInputValue] = useState('');
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Set your Voice</h2>
        <p style={styles.subtitle}>Tell us how you write. This helps Content Morph match your tone across every platform so it sounds like <em>you</em>, not a template.</p>
        <textarea style={styles.textarea} placeholder="e.g., 'Casual and direct, a bit sarcastic, never corporate.'" value={inputValue} onChange={(e) => setInputValue(e.target.value)} autoFocus />
        <div style={styles.footer}>
          <button style={styles.skipBtn} onClick={onSkip} data-testid="onboarding-skip">Skip for now</button>
          <button style={{ ...styles.saveBtn, opacity: inputValue.trim() ? 1 : 0.5, cursor: inputValue.trim() ? 'pointer' : 'not-allowed' }} onClick={() => onSave(inputValue)} disabled={!inputValue.trim()} data-testid="onboarding-save">Save Voice</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' },
  title: { margin: '0 0 8px 0', fontFamily: 'var(--font-heading)', fontSize: '2rem' },
  subtitle: { margin: '0 0 24px 0', color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.6' },
  textarea: { width: '100%', minHeight: '120px', backgroundColor: '#1a1a1a', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', fontSize: '1rem', fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none', marginBottom: '24px', boxSizing: 'border-box' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: '16px' },
  skipBtn: { background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: '500' },
  saveBtn: { background: 'var(--text-main)', color: 'var(--bg-color)', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: '600' }
};

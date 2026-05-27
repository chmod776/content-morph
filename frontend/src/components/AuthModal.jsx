import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Eye, EyeOff } from 'lucide-react';

export default function AuthModal({ onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [signedUp, setSignedUp] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSignedUp(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (signedUp) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <h2 style={styles.title}>Check your email</h2>
          <p style={styles.subtitle}>We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.</p>
          <button style={styles.submitBtn} onClick={() => { setSignedUp(false); setIsLogin(true); }}>Back to Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        <p style={styles.subtitle}>{isLogin ? 'Sign in to transform content and post to your socials.' : 'Create a free account to save sessions and your brand voice.'}</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input type="email" style={styles.input} placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus data-testid="auth-email-input" />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.passwordWrapper}>
              <input type={showPassword ? 'text' : 'password'} style={styles.passwordInput} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required data-testid="auth-password-input" />
              <button type="button" style={styles.eyeBtn} onClick={() => setShowPassword(p => !p)} tabIndex={-1}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.submitBtn} disabled={loading} data-testid="auth-submit-btn">
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>
        <div style={styles.toggleText}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button style={styles.toggleBtn} onClick={() => { setIsLogin(!isLogin); setError(null); }} data-testid="auth-toggle-btn">
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' },
  title: { margin: '0 0 8px 0', fontFamily: 'var(--font-heading)', fontSize: '1.8rem' },
  subtitle: { margin: '0 0 24px 0', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-muted)' },
  input: { width: '100%', backgroundColor: '#1a1a1a', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 16px', fontSize: '1rem', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' },
  passwordWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  passwordInput: { width: '100%', backgroundColor: '#1a1a1a', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 44px 12px 16px', fontSize: '1rem', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' },
  eyeBtn: { position: 'absolute', right: '12px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 },
  submitBtn: { background: 'var(--text-main)', color: 'var(--bg-color)', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: '600', fontSize: '1rem', marginTop: '8px' },
  error: { color: '#cc4444', fontSize: '0.85rem', margin: 0 },
  toggleText: { marginTop: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' },
  toggleBtn: { background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontWeight: '600', padding: 0, fontFamily: 'var(--font-body)' }
};

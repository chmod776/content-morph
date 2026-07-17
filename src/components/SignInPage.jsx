import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function SignInPage() {
  const { login } = useAuth();

  return (
    <div style={styles.root}>
      <div style={styles.left}>
        <div style={styles.leftInner}>
          <h1 style={styles.logo}>Content Morph</h1>
          <p style={styles.tagline}>Transform your raw notes into platform-ready posts — Twitter/X, LinkedIn, Instagram, and YouTube — in seconds.</p>
        </div>
        <p style={styles.leftFooter}>© {new Date().getFullYear()} Content Morph</p>
      </div>

      <div style={styles.right}>
        <div style={styles.card}>
          <h2 style={styles.welcomeTitle}>Welcome back</h2>
          <p style={styles.welcomeDesc}>Sign in to access your voice profile and content history.</p>

          <button style={styles.googleBtn} onClick={login}>
            <GoogleIcon />
            Continue with Google
          </button>

          <p style={styles.hint}>No password needed — we use your Google account.</p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: '10px', flexShrink: 0 }}>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

const styles = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    backgroundColor: 'var(--bg-color)',
  },
  left: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '48px',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
    borderRight: '1px solid var(--border-color)',
  },
  leftInner: {
    maxWidth: '480px',
  },
  logo: {
    margin: '0 0 24px',
    fontSize: '3rem',
    fontWeight: '700',
    fontFamily: 'var(--font-heading)',
    letterSpacing: '-0.02em',
    color: 'var(--text-main)',
  },
  tagline: {
    margin: 0,
    fontSize: '1.25rem',
    lineHeight: '1.7',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-body)',
    maxWidth: '420px',
  },
  leftFooter: {
    margin: 0,
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-body)',
    opacity: 0.6,
  },
  right: {
    width: '480px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
  },
  card: {
    width: '100%',
    maxWidth: '360px',
  },
  welcomeTitle: {
    margin: '0 0 8px',
    fontSize: '1.8rem',
    fontWeight: '700',
    fontFamily: 'var(--font-heading)',
    color: 'var(--text-main)',
  },
  welcomeDesc: {
    margin: '0 0 36px',
    fontSize: '0.95rem',
    color: 'var(--text-muted)',
    lineHeight: '1.6',
    fontFamily: 'var(--font-body)',
  },
  googleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '14px 20px',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: 'var(--text-main)',
    fontSize: '1rem',
    fontFamily: 'var(--font-body)',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s, border-color 0.2s',
  },
  hint: {
    margin: '16px 0 0',
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
    fontFamily: 'var(--font-body)',
    opacity: 0.7,
  },
};

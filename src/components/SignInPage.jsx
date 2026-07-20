import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function SignInPage() {
  const { login } = useAuth();

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <h1 style={styles.logo}>Content Morph</h1>
        <p style={styles.tagline}>Transform your raw notes into platform-ready posts.</p>

        <button style={styles.googleBtn} onClick={login}>
          <GoogleIcon />
          Continue with Google
        </button>

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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-color)',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: '380px',
    textAlign: 'center',
  },
  logo: {
    margin: '0 0 10px',
    fontSize: '2.8rem',
    fontWeight: '700',
    fontFamily: 'var(--font-heading)',
    letterSpacing: '-0.02em',
    color: 'var(--text-main)',
  },
  tagline: {
    margin: '0 0 40px',
    fontSize: '1rem',
    lineHeight: '1.6',
    color: 'var(--text-muted)',
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
};

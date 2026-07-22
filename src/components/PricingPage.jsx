import React, { useState } from 'react';
import { apiFetch } from '../utils/apiFetch';

export default function PricingPage({ user, onLogout, checkoutCancelled, onPrivacy }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval: 'month' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create checkout session');
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.logo}>Content Morph</h1>
        <p style={styles.tagline}>Transform your raw notes into platform-ready posts.</p>

        <div style={styles.priceBox}>
          <span style={styles.priceAmount}>$20.91</span>
          <span style={styles.pricePer}>/month</span>
        </div>

        <ul style={styles.featureList}>
          {[
            'Unlimited content generations',
            'LinkedIn, X & Instagram posts — plus YouTube title, description & chapters',
            'Your voice learned once from your writing samples',
            'Generation history',
            'Cancel anytime',
          ].map(f => (
            <li key={f} style={styles.featureItem}>
              <span style={styles.check}>✓</span> {f}
            </li>
          ))}
        </ul>

        {checkoutCancelled && (
          <p style={styles.cancelNotice}>Your payment was not completed — try again</p>
        )}

        {error && <p style={styles.error}>{error}</p>}

        <label style={styles.agreeRow}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            style={styles.agreeCheckbox}
          />
          <span style={styles.agreeText}>
            I agree to the{' '}
            <button style={styles.agreeLink} onClick={e => { e.preventDefault(); onPrivacy?.(); }}>
              Privacy Policy
            </button>
          </span>
        </label>

        <button
          style={{ ...styles.subscribeBtn, ...(!agreed || loading ? styles.subscribeBtnDisabled : {}) }}
          onClick={agreed ? handleSubscribe : undefined}
          disabled={!agreed || loading}
          title={agreed ? undefined : 'Please agree to the Privacy Policy first'}
        >
          {loading ? 'Redirecting…' : 'Subscribe now'}
        </button>

        <p style={styles.secureNote}>Secured by Stripe · Cancel anytime</p>

        <div style={styles.footer}>
          <span style={styles.footerText}>Signed in as {user?.email}</span>
          <button style={styles.logoutBtn} onClick={onLogout}>Sign out</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    fontFamily: 'var(--font-body)',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: 'var(--panel-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '20px',
    padding: '48px 40px',
    textAlign: 'center',
  },
  logo: {
    fontFamily: 'var(--font-heading)',
    fontSize: '2rem',
    color: 'var(--text-main)',
    margin: '0 0 8px',
  },
  tagline: {
    fontSize: '0.92rem',
    color: 'var(--text-muted)',
    margin: '0 0 32px',
    lineHeight: '1.5',
  },
  priceBox: {
    marginBottom: '28px',
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: '4px',
  },
  priceAmount: {
    fontSize: '2.8rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    fontFamily: 'var(--font-heading)',
  },
  pricePer: {
    fontSize: '1rem',
    color: 'var(--text-muted)',
    fontWeight: '400',
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 32px',
    textAlign: 'left',
  },
  featureItem: {
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    padding: '6px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderBottom: '1px solid var(--border-color)',
  },
  check: {
    color: 'var(--text-main)',
    fontWeight: '700',
    flexShrink: 0,
  },
  cancelNotice: {
    color: '#e05c5c',
    fontSize: '0.85rem',
    marginBottom: '16px',
    padding: '10px 14px',
    backgroundColor: 'rgba(224, 92, 92, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(224, 92, 92, 0.25)',
  },
  error: {
    color: '#e05c5c',
    fontSize: '0.85rem',
    marginBottom: '16px',
  },
  subscribeBtn: {
    width: '100%',
    padding: '14px',
    backgroundColor: 'var(--text-main)',
    color: 'var(--bg-color)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '700',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    marginBottom: '12px',
    transition: 'opacity 0.2s ease',
  },
  secureNote: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    margin: '0 0 28px',
    opacity: 0.6,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '20px',
    borderTop: '1px solid var(--border-color)',
  },
  footerText: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '220px',
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: 0,
    flexShrink: 0,
  },
  agreeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '0 0 16px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  agreeCheckbox: {
    width: '16px',
    height: '16px',
    flexShrink: 0,
    cursor: 'pointer',
    accentColor: 'var(--text-main)',
  },
  agreeText: {
    fontSize: '0.84rem',
    color: 'var(--text-muted)',
    lineHeight: 1.4,
    fontFamily: 'var(--font-body)',
  },
  agreeLink: {
    background: 'none',
    border: 'none',
    padding: 0,
    color: 'var(--text-main)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.84rem',
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  subscribeBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
};

import React, { useState } from 'react';

export default function LandingPage({ onLogin }) {
  const [emailCopied, setEmailCopied] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('contentmorph71@gmail.com');
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  };

  return (
    <div style={s.root}>
      {/* NAV */}
      <nav style={s.nav}>
        <span style={s.navLogo}>Content Morph</span>
        <button style={s.navSignIn} onClick={onLogin}>Sign in</button>
      </nav>

      {/* HERO */}
      <section style={s.hero}>
        <div style={s.heroBadge}>Content creation, simplified</div>
        <h1 style={s.heroHeadline}>
          Turn rough notes into<br />
          <span style={s.heroAccent}>platform-ready posts</span>
        </h1>
        <p style={s.heroSub}>
          Paste your ideas and get polished LinkedIn posts, tweets, Instagram captions,
          and more, all tailored to your brand voice. In seconds.
        </p>
        <button style={s.heroCta} onClick={onLogin}>
          <GoogleIcon />
          Get started with Google
        </button>
        <p style={s.heroSubNote}>$20.91 / month · Cancel anytime</p>
      </section>

      {/* HOW IT WORKS */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>How it works</h2>
        <div style={s.steps}>
          {[
            { n: '1', title: 'Paste your notes', desc: 'Dump your raw ideas, bullet points, or a rough draft. No polish needed.' },
            { n: '2', title: 'Pick your platforms', desc: 'Select LinkedIn, Twitter/X, Instagram, Facebook, or all of them at once.' },
            { n: '3', title: 'Get ready-to-post content', desc: 'Your notes are rewritten into platform-native copy, streamed live to your screen.' },
          ].map(step => (
            <div key={step.n} style={s.step}>
              <div style={s.stepNum}>{step.n}</div>
              <h3 style={s.stepTitle}>{step.title}</h3>
              <p style={s.stepDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Everything you need</h2>
        <div style={s.features}>
          {[
            { icon: '✦', title: 'Unlimited generations', desc: 'Run as many generations as you want. No caps, no credits.' },
            { icon: '🎯', title: 'All major platforms', desc: 'LinkedIn, Twitter/X, Instagram, Facebook, YouTube, TikTok, and more.' },
            { icon: '🗣️', title: 'Brand voice', desc: 'Set your tone once. Every post sounds like you, not a robot.' },
            { icon: '✍️', title: 'Writing samples', desc: 'Upload examples of your writing and every post mirrors your style exactly.' },
            { icon: '📋', title: 'Generation history', desc: 'Every output is saved so you can revisit, tweak, or repost anything.' },
            { icon: '⚡', title: 'Live streaming output', desc: 'Watch your content appear word by word. No waiting for a wall of text.' },
          ].map(f => (
            <div key={f.title} style={s.featureCard}>
              <span style={s.featureIcon}>{f.icon}</span>
              <h3 style={s.featureTitle}>{f.title}</h3>
              <p style={s.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section style={{ ...s.section, ...s.pricingSection }}>
        <h2 style={s.sectionTitle}>Simple pricing</h2>
        <p style={s.pricingSubtitle}>One plan. Everything included. No surprises.</p>
        <div style={s.pricingCard}>
          <div style={s.pricingAmount}>
            <span style={s.pricingDollar}>$20.91</span>
            <span style={s.pricingPer}> / month</span>
          </div>
          <ul style={s.pricingList}>
            {[
              'Unlimited content generations',
              'All platforms: LinkedIn, Twitter, Instagram & more',
              'Brand voice & writing samples',
              'Full generation history',
              'Live streaming output',
              'Cancel anytime from your account',
            ].map(item => (
              <li key={item} style={s.pricingItem}>
                <span style={s.pricingCheck}>✓</span>
                {item}
              </li>
            ))}
          </ul>
          <button style={s.pricingCta} onClick={onLogin}>
            <GoogleIcon />
            Get started with Google
          </button>
          <p style={s.pricingSecure}>Secured by Stripe · No free trial needed to cancel</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={s.footer}>
        <p style={s.footerText}>
          Questions?{' '}
          <button style={s.footerLink} onClick={handleCopyEmail}>
            {emailCopied ? '✓ Copied!' : 'contentmorph71@gmail.com'}
          </button>
        </p>
        <p style={s.footerSub}>For billing issues, please use the Stripe customer portal after subscribing.</p>
      </footer>
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

const s = {
  root: {
    minHeight: '100vh',
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-main)',
    fontFamily: 'var(--font-body)',
    overflowX: 'hidden',
  },

  /* NAV */
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 40px',
    borderBottom: '1px solid var(--border-color)',
    position: 'sticky',
    top: 0,
    backgroundColor: 'var(--bg-color)',
    zIndex: 100,
  },
  navLogo: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.2rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    letterSpacing: '-0.02em',
  },
  navSignIn: {
    background: 'none',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.88rem',
    padding: '8px 18px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'border-color 0.2s, color 0.2s',
  },

  /* HERO */
  hero: {
    maxWidth: '720px',
    margin: '0 auto',
    padding: '100px 24px 80px',
    textAlign: 'center',
  },
  heroBadge: {
    display: 'inline-block',
    fontSize: '0.75rem',
    fontWeight: '600',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    border: '1px solid var(--border-color)',
    borderRadius: '20px',
    padding: '5px 14px',
    marginBottom: '28px',
  },
  heroHeadline: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'clamp(2.4rem, 6vw, 3.8rem)',
    fontWeight: '700',
    lineHeight: 1.1,
    letterSpacing: '-0.03em',
    margin: '0 0 24px',
    color: 'var(--text-main)',
  },
  heroAccent: {
    opacity: 0.55,
  },
  heroSub: {
    fontSize: '1.05rem',
    color: 'var(--text-muted)',
    lineHeight: 1.65,
    margin: '0 0 40px',
    maxWidth: '540px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  heroCta: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '15px 32px',
    backgroundColor: 'var(--text-main)',
    color: 'var(--bg-color)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontFamily: 'var(--font-body)',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '14px',
    transition: 'opacity 0.2s',
  },
  heroSubNote: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    margin: 0,
    opacity: 0.6,
  },

  /* SECTIONS */
  section: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '80px 24px',
    borderTop: '1px solid var(--border-color)',
  },
  sectionTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.8rem',
    fontWeight: '700',
    letterSpacing: '-0.02em',
    margin: '0 0 48px',
    textAlign: 'center',
    color: 'var(--text-main)',
  },

  /* HOW IT WORKS */
  steps: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '32px',
  },
  step: {
    textAlign: 'center',
    padding: '32px 24px',
    backgroundColor: 'var(--panel-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
  },
  stepNum: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 18px',
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
  },
  stepTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.05rem',
    fontWeight: '700',
    margin: '0 0 10px',
    color: 'var(--text-main)',
  },
  stepDesc: {
    fontSize: '0.88rem',
    color: 'var(--text-muted)',
    lineHeight: 1.6,
    margin: 0,
  },

  /* FEATURES */
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '24px',
  },
  featureCard: {
    padding: '28px 24px',
    backgroundColor: 'var(--panel-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
  },
  featureIcon: {
    display: 'block',
    fontSize: '1.4rem',
    marginBottom: '14px',
  },
  featureTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '0.98rem',
    fontWeight: '700',
    margin: '0 0 8px',
    color: 'var(--text-main)',
  },
  featureDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    lineHeight: 1.6,
    margin: 0,
  },

  /* PRICING */
  pricingSection: {
    textAlign: 'center',
  },
  pricingSubtitle: {
    fontSize: '0.95rem',
    color: 'var(--text-muted)',
    margin: '-36px 0 40px',
  },
  pricingCard: {
    maxWidth: '440px',
    margin: '0 auto',
    backgroundColor: 'var(--panel-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '20px',
    padding: '44px 40px',
    textAlign: 'left',
  },
  pricingAmount: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  pricingDollar: {
    fontFamily: 'var(--font-heading)',
    fontSize: '3rem',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  pricingPer: {
    fontSize: '1rem',
    color: 'var(--text-muted)',
  },
  pricingList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 32px',
  },
  pricingItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    padding: '8px 0',
    borderBottom: '1px solid var(--border-color)',
    lineHeight: 1.5,
  },
  pricingCheck: {
    color: 'var(--text-main)',
    fontWeight: '700',
    flexShrink: 0,
    marginTop: '1px',
  },
  pricingCta: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px',
    backgroundColor: 'var(--text-main)',
    color: 'var(--bg-color)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontFamily: 'var(--font-body)',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '12px',
    transition: 'opacity 0.2s',
  },
  pricingSecure: {
    textAlign: 'center',
    fontSize: '0.76rem',
    color: 'var(--text-muted)',
    margin: 0,
    opacity: 0.6,
  },

  /* FOOTER */
  footer: {
    borderTop: '1px solid var(--border-color)',
    padding: '40px 24px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    margin: '0 0 6px',
  },
  footerLink: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.85rem',
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: 0,
  },
  footerSub: {
    fontSize: '0.76rem',
    color: 'var(--text-muted)',
    margin: 0,
    opacity: 0.5,
  },
};

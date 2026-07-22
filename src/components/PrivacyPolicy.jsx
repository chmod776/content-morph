import React from 'react';

export default function PrivacyPolicy({ onBack }) {
  return (
    <div style={s.root}>
      <nav style={s.nav}>
        <button style={s.backBtn} onClick={onBack}>← Back</button>
        <span style={s.navLogo}>Content Morph</span>
        <span style={s.navSpacer} />
      </nav>

      <div style={s.body}>
        <h1 style={s.h1}>Privacy Policy</h1>
        <p style={s.meta}>Last updated: July 2026</p>

        <p style={s.lead}>
          This Privacy Policy explains how Content Morph ("we", "us", or "our") collects, uses, stores, and
          protects your personal data when you use our service at contentmorph.com. It applies globally,
          including to users in the European Economic Area (EEA), United Kingdom, and California.
        </p>

        <Section title="1. Who we are">
          <p>
            Content Morph is operated as an independent service. If you have any questions about this policy
            or your personal data, contact us at{' '}
            <a style={s.link} href="mailto:contentmorph71@gmail.com">contentmorph71@gmail.com</a>.
          </p>
          <p>
            For users in the EEA and UK, Content Morph is the data controller responsible for your personal
            data.
          </p>
        </Section>

        <Section title="2. What data we collect">
          <p>We collect the following categories of personal data:</p>
          <ul style={s.ul}>
            <li><strong>Account data</strong> — your email address and name, provided via Google sign-in through Supabase Auth.</li>
            <li><strong>Profile data</strong> — your brand voice description, writing samples, and preferred output settings that you voluntarily provide.</li>
            <li><strong>Content data</strong> — the notes and text you paste into the app, and the AI-generated outputs we create for you (your generation history).</li>
            <li><strong>Video data</strong> — if you upload a video for YouTube pre-publish generation, the file is used to extract audio and produce a transcript. The video and audio files are deleted immediately after each processing step and are never stored persistently. We record how many minutes of video you process each month for usage tracking.</li>
            <li><strong>Billing data</strong> — payment and subscription information handled by Stripe. We store a Stripe customer ID and subscription ID; we do not store your card details directly.</li>
            <li><strong>Usage data</strong> — basic technical information such as timestamps of actions and service interactions, used to operate the service.</li>
          </ul>
        </Section>

        <Section title="3. How we use your data">
          <p>We use your data to:</p>
          <ul style={s.ul}>
            <li>Provide, operate, and maintain the Content Morph service</li>
            <li>Generate platform-ready content using your notes and voice settings</li>
            <li>Process payments and manage your subscription via Stripe</li>
            <li>Track video processing usage against your monthly allowance</li>
            <li>Respond to support enquiries you send us</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p>
            <strong>We do not sell your personal data.</strong> We do not use your data for advertising
            or share it with third parties for their own marketing purposes.
          </p>
        </Section>

        <Section title="4. Legal basis for processing (EEA & UK users)">
          <p>Under GDPR and UK GDPR, we rely on the following legal bases:</p>
          <ul style={s.ul}>
            <li><strong>Contract</strong> — processing is necessary to perform the service you signed up for (generating content, managing your subscription).</li>
            <li><strong>Legitimate interests</strong> — for service security, fraud prevention, and improving reliability.</li>
            <li><strong>Legal obligation</strong> — where we are required to retain data by law (e.g. billing records).</li>
          </ul>
        </Section>

        <Section title="5. Third-party processors">
          <p>We share data with the following processors who act on our behalf:</p>
          <ul style={s.ul}>
            <li>
              <strong>Supabase</strong> — authentication and database hosting. Stores your account data,
              profile, and generation history. Data is hosted on servers in the United States.{' '}
              <a style={s.link} href="https://supabase.com/privacy" target="_blank" rel="noreferrer">Supabase Privacy Policy</a>
            </li>
            <li>
              <strong>Stripe</strong> — payment processing and subscription management. Handles all billing
              data.{' '}
              <a style={s.link} href="https://stripe.com/privacy" target="_blank" rel="noreferrer">Stripe Privacy Policy</a>
            </li>
            <li>
              <strong>OpenAI</strong> — AI content generation. Your notes and writing samples are sent to
              OpenAI's API to generate outputs. OpenAI processes this data in the United States.{' '}
              <a style={s.link} href="https://openai.com/privacy" target="_blank" rel="noreferrer">OpenAI Privacy Policy</a>
            </li>
          </ul>
          <p>
            All processors are bound by data processing agreements and may only use your data to provide
            the services described above.
          </p>
        </Section>

        <Section title="6. International data transfers">
          <p>
            Content Morph is operated from the United States. If you are located in the EEA, UK, or another
            jurisdiction with data transfer restrictions, your data is transferred to the US in reliance on
            appropriate safeguards, including Standard Contractual Clauses (SCCs) where applicable, as
            provided by our processors (Supabase, Stripe, and OpenAI).
          </p>
        </Section>

        <Section title="7. Data retention">
          <p>
            We retain your personal data for as long as your account is active. When you delete your account,
            all your data — including profile information, writing samples, brand voice, and generation history
            — is permanently deleted from our systems. Stripe may retain billing records for their own legal
            compliance purposes.
          </p>
          <p>
            You can delete your account at any time from Settings → Close account inside the app.
          </p>
        </Section>

        <Section title="8. Your rights">
          <p>Depending on where you are located, you have the following rights regarding your personal data:</p>

          <p style={s.subhead}>EEA and UK users (GDPR / UK GDPR)</p>
          <ul style={s.ul}>
            <li><strong>Access</strong> — request a copy of the personal data we hold about you.</li>
            <li><strong>Rectification</strong> — ask us to correct inaccurate or incomplete data.</li>
            <li><strong>Erasure ("right to be forgotten")</strong> — request deletion of your personal data. You can do this directly in the app via Settings → Close account.</li>
            <li><strong>Restriction</strong> — ask us to restrict processing of your data in certain circumstances.</li>
            <li><strong>Portability</strong> — receive your data in a structured, machine-readable format.</li>
            <li><strong>Objection</strong> — object to processing based on legitimate interests.</li>
            <li><strong>Withdraw consent</strong> — where processing is based on consent, you may withdraw it at any time.</li>
            <li><strong>Lodge a complaint</strong> — you have the right to lodge a complaint with your local data protection authority (e.g. the ICO in the UK, or your national DPA in the EEA).</li>
          </ul>

          <p style={s.subhead}>California users (CCPA / CPRA)</p>
          <ul style={s.ul}>
            <li><strong>Right to know</strong> — request disclosure of the categories and specific pieces of personal information we collect.</li>
            <li><strong>Right to delete</strong> — request deletion of personal information we have collected from you.</li>
            <li><strong>Right to opt out of sale</strong> — we do not sell your personal information.</li>
            <li><strong>Right to non-discrimination</strong> — we will not discriminate against you for exercising your privacy rights.</li>
          </ul>

          <p>
            To exercise any of these rights, contact us at{' '}
            <a style={s.link} href="mailto:contentmorph71@gmail.com">contentmorph71@gmail.com</a>.
            We will respond within 30 days (or within the timeframe required by applicable law).
          </p>
        </Section>

        <Section title="9. Cookies and local storage">
          <p>
            We use minimal browser storage to operate the service:
          </p>
          <ul style={s.ul}>
            <li><strong>Authentication tokens</strong> — Supabase stores a session token in your browser's local storage to keep you signed in.</li>
            <li><strong>Preferences</strong> — your settings (theme, language, default platforms) are stored in your browser's local storage.</li>
          </ul>
          <p>
            We do not use tracking cookies, advertising cookies, or any third-party analytics. No cookie
            consent banner is required for the cookies we use, as they are strictly necessary to provide
            the service.
          </p>
        </Section>

        <Section title="10. Security">
          <p>
            We implement industry-standard security measures including HTTPS encryption in transit, access
            controls on our database, and secure credential management. Video and audio files uploaded for
            processing are deleted immediately after each processing step and are never stored persistently.
          </p>
          <p>
            No system is completely secure. If you become aware of any security issue, please contact us at{' '}
            <a style={s.link} href="mailto:contentmorph71@gmail.com">contentmorph71@gmail.com</a>.
          </p>
        </Section>

        <Section title="11. Children's privacy">
          <p>
            Content Morph is not directed at children under the age of 16. We do not knowingly collect personal
            data from children. If you believe a child has provided us with personal data, please contact us
            and we will delete it promptly.
          </p>
        </Section>

        <Section title="12. Changes to this policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of significant changes
            by email or by posting a notice in the app. The date at the top of this page reflects when the
            policy was last updated. Continued use of the service after changes take effect constitutes
            acceptance of the revised policy.
          </p>
        </Section>

        <Section title="13. Contact">
          <p>
            For any questions, requests, or complaints about this Privacy Policy or our data practices,
            please contact us at:{' '}
            <a style={s.link} href="mailto:contentmorph71@gmail.com">contentmorph71@gmail.com</a>
          </p>
        </Section>

        <div style={s.backWrap}>
          <button style={s.backBtnBottom} onClick={onBack}>← Back</button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={s.section}>
      <h2 style={s.h2}>{title}</h2>
      {children}
    </section>
  );
}

const s = {
  root: { minHeight: '100vh', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontFamily: 'var(--font-body)' },
  nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, backgroundColor: 'var(--bg-color)', zIndex: 10 },
  navLogo: { fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: '700', color: 'var(--text-main)' },
  navSpacer: { width: 60 },
  backBtn: { background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer' },

  body: { maxWidth: '720px', margin: '0 auto', padding: '56px 24px 80px' },
  h1: { fontFamily: 'var(--font-heading)', fontSize: '2.2rem', fontWeight: '700', margin: '0 0 8px', letterSpacing: '-0.02em' },
  meta: { fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 36px' },
  lead: { fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.7, margin: '0 0 48px', borderLeft: '3px solid var(--border-color)', paddingLeft: 16 },

  section: { marginBottom: '40px' },
  h2: { fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: '700', margin: '0 0 14px', color: 'var(--text-main)' },
  subhead: { fontWeight: '600', color: 'var(--text-main)', fontSize: '0.92rem', margin: '16px 0 8px', fontFamily: 'var(--font-body)' },
  ul: { margin: '8px 0 12px', paddingLeft: 20, lineHeight: 1.75, color: 'var(--text-muted)', fontSize: '0.9rem' },
  link: { color: 'var(--text-main)', textUnderlineOffset: 3 },

  backWrap: { marginTop: 56, borderTop: '1px solid var(--border-color)', paddingTop: 32 },
  backBtnBottom: { background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer' },
};

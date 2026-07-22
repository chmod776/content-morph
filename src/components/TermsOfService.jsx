import React from 'react';

export default function TermsOfService({ onBack }) {
  return (
    <div style={s.root}>
      <nav style={s.nav}>
        <button style={s.backBtn} onClick={onBack}>← Back</button>
        <span style={s.navLogo}>Content Morph</span>
        <span style={s.navSpacer} />
      </nav>

      <div style={s.body}>
        <h1 style={s.h1}>Terms of Service</h1>
        <p style={s.meta}>Last updated: July 2026</p>

        <p style={s.lead}>
          Please read these Terms of Service ("Terms") carefully before using Content Morph. By creating
          an account, checking the agreement box, or using any part of the service, you agree to be
          bound by these Terms. If you do not agree, do not use the service.
        </p>

        <Section title="1. Who we are">
          <p>
            Content Morph ("we", "us", "our") is an independent software service operated at
            contentmorph.com. Questions can be directed to{' '}
            <a style={s.link} href="mailto:contentmorph71@gmail.com">contentmorph71@gmail.com</a>.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p>
            You must be at least 18 years old and capable of forming a binding contract to use Content
            Morph. By using the service you represent and warrant that you meet these requirements and
            that you are not barred from receiving services under the laws of any applicable jurisdiction.
          </p>
        </Section>

        <Section title="3. The service">
          <p>
            Content Morph is an AI-assisted content generation tool that takes notes and other text you
            provide and produces draft social media posts and other content ("Generated Content") for
            platforms including LinkedIn, X (Twitter), Instagram, and YouTube.
          </p>
          <p>
            <strong>Generated Content is provided as a draft only.</strong> You are solely responsible
            for reviewing, editing, and approving any Generated Content before publishing or distributing
            it. We make no guarantee that Generated Content is accurate, appropriate, non-infringing,
            or fit for any particular purpose.
          </p>
          <p>
            We reserve the right to modify, suspend, or discontinue the service (or any feature) at any
            time, with or without notice. We will not be liable to you or any third party for any such
            modification, suspension, or discontinuation.
          </p>
        </Section>

        <Section title="4. Accounts and security">
          <p>
            You are responsible for maintaining the security of your account credentials and for all
            activity that occurs under your account. Notify us immediately at{' '}
            <a style={s.link} href="mailto:contentmorph71@gmail.com">contentmorph71@gmail.com</a>{' '}
            if you become aware of any unauthorised use. We are not liable for any loss or damage
            arising from your failure to safeguard your account.
          </p>
        </Section>

        <Section title="5. Subscriptions and billing">
          <ul style={s.ul}>
            <li>Access to Content Morph requires a paid monthly subscription, currently priced at $20.91/month.</li>
            <li>Subscriptions are billed monthly on a recurring basis. Your subscription renews automatically on the same date each month until cancelled.</li>
            <li>Payment is processed by Stripe. By subscribing you authorise Stripe to charge your payment method on a recurring basis.</li>
            <li><strong>No refunds.</strong> All subscription fees are non-refundable. Cancelling your subscription stops future charges; it does not entitle you to a refund of any amount already billed.</li>
            <li>If a payment fails, we may suspend or terminate access to your account until payment is made.</li>
            <li>We reserve the right to change pricing at any time. We will give you at least 30 days' notice of any price increase, and the increase will not apply until your next renewal after the notice period.</li>
          </ul>
        </Section>

        <Section title="6. Acceptable use">
          <p>You agree not to use Content Morph to:</p>
          <ul style={s.ul}>
            <li>Generate, distribute, or promote content that is unlawful, defamatory, harassing, abusive, fraudulent, obscene, or otherwise objectionable</li>
            <li>Infringe the intellectual property rights of any third party</li>
            <li>Generate spam, bulk unsolicited messages, or misleading content intended to deceive</li>
            <li>Attempt to reverse engineer, decompile, or otherwise extract source code from the service</li>
            <li>Probe, scan, or test the vulnerability of the service or any related systems</li>
            <li>Use automated means (bots, scrapers, crawlers) to access the service other than through our official API</li>
            <li>Resell, sublicense, or otherwise commercially exploit access to the service</li>
            <li>Violate any applicable law or regulation</li>
          </ul>
          <p>
            We reserve the right to suspend or permanently terminate accounts that violate this section,
            without refund.
          </p>
        </Section>

        <Section title="7. Your content">
          <p>
            You retain ownership of any notes, writing samples, and other content you input into Content
            Morph ("Your Content"). By using the service, you grant us a limited, non-exclusive licence
            to process Your Content solely for the purpose of operating and providing the service to you.
            We do not use Your Content to train AI models without your explicit consent.
          </p>
          <p>
            You are solely responsible for Your Content and any Generated Content you publish. You
            represent and warrant that Your Content does not violate any third-party rights or applicable
            law.
          </p>
        </Section>

        <Section title="8. Intellectual property">
          <p>
            All rights in the Content Morph platform — including software, design, trademarks, and
            proprietary technology — are owned by us or our licensors. Nothing in these Terms transfers
            any ownership of our intellectual property to you. You receive only the limited right to use
            the service as described herein.
          </p>
        </Section>

        <Section title="9. Third-party services">
          <p>
            Content Morph uses third-party services including OpenAI (AI generation), Supabase
            (authentication and database), and Stripe (payments). Your use of the service is also subject
            to the terms and policies of these providers. We are not responsible for the acts or omissions
            of any third-party service.
          </p>
          <p>
            Generated Content is produced by OpenAI's models. We do not control and are not responsible
            for the content, accuracy, or safety of AI-generated outputs.
          </p>
        </Section>

        <Section title="10. Disclaimer of warranties">
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND. TO THE
            FULLEST EXTENT PERMITTED BY LAW, WE EXPRESSLY DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED,
            INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
            NON-INFRINGEMENT, AND UNINTERRUPTED OR ERROR-FREE OPERATION.
          </p>
          <p>
            We do not warrant that: (a) the service will meet your specific requirements; (b) Generated
            Content will be accurate, complete, reliable, or suitable for publication; (c) errors will be
            corrected; or (d) the service will be free from viruses or other harmful components.
          </p>
        </Section>

        <Section title="11. Limitation of liability">
          <p>
            TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW:
          </p>
          <ul style={s.ul}>
            <li>WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, LOSS OF DATA, LOSS OF GOODWILL, BUSINESS INTERRUPTION, OR ANY OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH THESE TERMS OR YOUR USE OF (OR INABILITY TO USE) THE SERVICE.</li>
            <li>OUR TOTAL CUMULATIVE LIABILITY TO YOU FOR ANY CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE TOTAL FEES YOU PAID TO US IN THE THREE MONTHS IMMEDIATELY PRECEDING THE CLAIM OR (B) $20.00 USD.</li>
          </ul>
          <p>
            Some jurisdictions do not allow the exclusion or limitation of certain damages. In such
            jurisdictions, our liability will be limited to the maximum extent permitted by law.
          </p>
        </Section>

        <Section title="12. Indemnification">
          <p>
            You agree to indemnify, defend, and hold harmless Content Morph and its operators, employees,
            and agents from and against any claims, liabilities, damages, losses, and expenses (including
            reasonable legal fees) arising out of or in any way connected with: (a) your access to or
            use of the service; (b) Your Content; (c) any Generated Content you publish; (d) your
            violation of these Terms; or (e) your violation of any third-party rights or applicable law.
          </p>
        </Section>

        <Section title="13. Dispute resolution and arbitration">
          <p>
            <strong>Informal resolution.</strong> Before filing any formal legal claim, you agree to
            contact us at{' '}
            <a style={s.link} href="mailto:contentmorph71@gmail.com">contentmorph71@gmail.com</a>{' '}
            and attempt to resolve the dispute informally. We will try to resolve the dispute within
            30 days of receiving written notice.
          </p>
          <p>
            <strong>Binding arbitration.</strong> If the dispute cannot be resolved informally, you
            and we agree that any dispute, claim, or controversy arising out of or relating to these
            Terms or the service will be resolved exclusively by binding individual arbitration, not in
            court. The arbitration will be conducted under the rules of a recognised arbitration body
            and will take place in English.
          </p>
          <p>
            <strong>Class action waiver.</strong> YOU AND WE AGREE THAT EACH MAY BRING CLAIMS AGAINST
            THE OTHER ONLY IN YOUR OR OUR INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER
            IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING. The arbitrator may not consolidate
            more than one person's claims.
          </p>
          <p>
            <strong>Exceptions.</strong> Either party may seek emergency injunctive relief from a court
            of competent jurisdiction to prevent irreparable harm pending arbitration. Claims relating
            to the infringement of intellectual property rights are also excluded from mandatory
            arbitration.
          </p>
        </Section>

        <Section title="14. Governing law">
          <p>
            These Terms are governed by and construed in accordance with the laws of the United States,
            without regard to its conflict-of-law principles. To the extent any claim is not subject to
            arbitration, you consent to the exclusive jurisdiction of the courts located in the United
            States for the resolution of any disputes.
          </p>
          <p>
            If you are a consumer resident in the EEA or UK, nothing in these Terms affects your
            statutory rights under applicable consumer protection law in your country of residence.
          </p>
        </Section>

        <Section title="15. Termination">
          <p>
            We may suspend or terminate your access to the service at any time, with or without cause,
            with or without notice, effective immediately. Grounds for termination include, but are not
            limited to, violation of these Terms or conduct we reasonably believe is harmful to other
            users or the service.
          </p>
          <p>
            You may close your account at any time from Settings → Close account. On termination or
            account closure, your right to access the service immediately ends. Sections 7–14 of these
            Terms survive termination.
          </p>
        </Section>

        <Section title="16. Changes to these Terms">
          <p>
            We may update these Terms at any time. We will notify you of material changes by email or
            by posting a notice in the app at least 14 days before the changes take effect. If you
            continue to use the service after that date, you are deemed to have accepted the revised
            Terms. If you do not agree to the revised Terms, you must close your account before the
            effective date.
          </p>
        </Section>

        <Section title="17. General">
          <ul style={s.ul}>
            <li><strong>Entire agreement.</strong> These Terms, together with the Privacy Policy, constitute the entire agreement between you and us regarding the service.</li>
            <li><strong>Severability.</strong> If any provision of these Terms is found unenforceable, the remaining provisions remain in full force and effect.</li>
            <li><strong>No waiver.</strong> Our failure to enforce any provision is not a waiver of our right to do so in the future.</li>
            <li><strong>Assignment.</strong> You may not assign or transfer these Terms without our prior written consent. We may assign these Terms without restriction.</li>
          </ul>
        </Section>

        <Section title="18. Contact">
          <p>
            For questions about these Terms, contact us at{' '}
            <a style={s.link} href="mailto:contentmorph71@gmail.com">contentmorph71@gmail.com</a>.
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
  ul: { margin: '8px 0 12px', paddingLeft: 20, lineHeight: 1.75, color: 'var(--text-muted)', fontSize: '0.9rem' },
  link: { color: 'var(--text-main)', textUnderlineOffset: 3 },

  backWrap: { marginTop: 56, borderTop: '1px solid var(--border-color)', paddingTop: 32 },
  backBtnBottom: { background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer' },
};

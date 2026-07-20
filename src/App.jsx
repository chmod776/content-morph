import React, { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import InputPanel from './components/InputPanel';
import PlatformSelector from './components/PlatformSelector';
import OutputGrid from './components/OutputGrid';
import SettingsPanel from './components/SettingsPanel';
import HistoryPanel from './components/HistoryPanel';
import OnboardingModal from './components/OnboardingModal';
import PricingPage from './components/PricingPage';
import { platforms } from './platforms';
import { useSettings } from './context/SettingsContext';
import { useProfile } from './context/ProfileContext';
import { useAuth } from './context/AuthContext';
import { apiFetch } from './utils/apiFetch';

const MAX_HISTORY = 50;

export default function App() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const { settings } = useSettings();
  const { profile, profileLoading } = useProfile();
  const { user, logout } = useAuth();
  const settingsRef = useRef(null);

  const [input, setInput]                       = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState(settings.defaultPlatforms);
  const [outputs, setOutputs]                   = useState({});
  const [loadingStates, setLoadingStates]       = useState({});
  const [errors, setErrors]                     = useState({});
  const [settingsOpen, setSettingsOpen]         = useState(false);
  const [historyOpen, setHistoryOpen]           = useState(false);
  const [history, setHistory]                   = useState([]);
  const [historyLoading, setHistoryLoading]     = useState(true);
  const [showOnboarding, setShowOnboarding]     = useState(false);
  const [gearPulse, setGearPulse]               = useState(false);
  const [showSkipAlert, setShowSkipAlert]       = useState(false);
  const [emailCopied, setEmailCopied]           = useState(false);
  const [subscription, setSubscription]         = useState(null);
  const [subLoading, setSubLoading]             = useState(true);
  const [showCheckoutBanner, setShowCheckoutBanner] = useState(false);
  const [showPastDueBanner, setShowPastDueBanner] = useState(false);
  const [showPaymentFailedBanner, setShowPaymentFailedBanner] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Detect ?checkout=success or ?checkout=cancel param on return from Stripe
  const checkoutParam = new URLSearchParams(window.location.search).get('checkout');
  const checkoutSuccessRef = useRef(checkoutParam === 'success');
  const checkoutCancelledRef = useRef(checkoutParam === 'cancel');

  // Clean the URL param without a page reload
  useEffect(() => {
    if (checkoutSuccessRef.current || checkoutCancelledRef.current) {
      const url = new URL(window.location.href);
      url.searchParams.delete('checkout');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Check subscription status on mount; retry on checkout success (webhook may lag)
  useEffect(() => {
    let cancelled = false;

    const fetchSub = async (attemptsLeft = 1) => {
      try {
        const r = await apiFetch('/api/stripe/subscription');
        const data = r.ok ? await r.json() : { active: false, status: null };
        if (cancelled) return;
        if (!data.active && checkoutSuccessRef.current && attemptsLeft > 0) {
          // Stripe webhook may not have fired yet — retry up to 5 times
          setTimeout(() => fetchSub(attemptsLeft - 1), 1500);
        } else {
          // Normalize: always ensure status is explicitly present (null = never subscribed)
          setSubscription({ status: null, ...data });
          setSubLoading(false);
        }
      } catch {
        if (!cancelled) {
          // Fail closed: treat API/network errors as "never subscribed" (show paywall)
          setSubscription({ active: false, status: null });
          setSubLoading(false);
        }
      }
    };

    fetchSub(checkoutSuccessRef.current ? 5 : 0);

    return () => { cancelled = true; };
  }, []);

  // Show checkout success banner once subscription is confirmed active
  useEffect(() => {
    if (checkoutSuccessRef.current && subscription && subscription.active) {
      setShowCheckoutBanner(true);
      const timer = setTimeout(() => setShowCheckoutBanner(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [subscription]);

  // past_due = grace period, user still has access — show a softer "fix soon" warning
  // All other lapsed statuses = access gone — show the harder "resubscribe" banner
  const PAST_DUE_STATUS  = 'past_due';
  const LAPSED_STATUSES  = new Set(['canceled', 'unpaid', 'incomplete_expired', 'paused']);
  useEffect(() => {
    if (!subscription || subscription.active) return;
    if (subscription.status === PAST_DUE_STATUS) {
      setShowPastDueBanner(true);
    } else if (LAPSED_STATUSES.has(subscription.status)) {
      setShowPaymentFailedBanner(true);
    }
  }, [subscription]);

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await apiFetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not open billing portal');
      window.location.href = data.url;
    } catch {
      setPortalLoading(false);
    }
  };

  const handleResubscribe = async () => {
    try {
      const res = await apiFetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval: 'month' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create checkout session');
      window.location.href = data.url;
    } catch {
      // silently fall through — user stays on the page
    }
  };

  const paymentFailedMessage = () => {
    const status = subscription?.status;
    if (status === 'canceled') return 'Your subscription has been canceled.';
    if (status === 'unpaid') return 'Your subscription is unpaid.';
    if (status === 'incomplete_expired') return 'Your subscription setup did not complete.';
    return 'Your subscription is no longer active.';
  };

  // Load history from the database on mount
  useEffect(() => {
    apiFetch('/api/history')
      .then(r => r.ok ? r.json() : [])
      .then(data => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, []);

  // Show onboarding only once auth + profile are ready and user is not yet onboarded
  useEffect(() => {
    if (!profileLoading && profile && !profile.onboarded) {
      setShowOnboarding(true);
    }
  }, [profileLoading, profile]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setTimeout(() => {
      setGearPulse(true);
      setTimeout(() => setGearPulse(false), 2500);
    }, 400);
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    setGearPulse(true);
    setShowSkipAlert(true);
  };

  const handleDismissSkipAlert = () => {
    setShowSkipAlert(false);
    setGearPulse(false);
  };

  const togglePlatform = (id) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const buildSystemPrompt = (platformPrompt) => {
    let prompt = platformPrompt;

    // Voice profile from account (overrides localStorage brandVoice)
    const brandVoice = profile?.brand_voice || settings.brandVoice || '';
    const writingSamples = profile?.writing_samples || [];

    if (brandVoice.trim()) {
      prompt = `BRAND VOICE OVERRIDE — Apply this brand voice to all output, overriding any default tone guidance: "${brandVoice.trim()}"\n\n${prompt}`;
    }

    if (writingSamples.length > 0) {
      const samplesText = writingSamples
        .map((s, i) => `Sample ${i + 1}:\n${s.trim()}`)
        .join('\n\n---\n\n');
      prompt += `\n\nWRITING SAMPLES — The user has provided examples of their own writing. Study their voice, rhythm, vocabulary, sentence structure, and tone. Mimic these qualities in your output — do NOT copy the content, only the style:\n\n${samplesText}`;
    }

    if (settings.outputLanguage && settings.outputLanguage !== 'English') {
      prompt += `\n\nIMPORTANT: Write ALL output in ${settings.outputLanguage}. Do not use English.`;
    }

    if (settings.contentLength === 'concise') {
      prompt += '\n\nLength instruction: Keep the output shorter and more concise than usual. Cut anything that isn\'t essential.';
    } else if (settings.contentLength === 'detailed') {
      prompt += '\n\nLength instruction: Write a longer, more detailed and expansive version than you normally would.';
    }

    prompt += '\n\nQUALITY RULE: Your output must have perfect spelling and grammar. Never invent or merge words. Every sentence must be grammatically complete — never start a sentence with a comma, conjunction fragment, or mid-thought. Proofread before outputting.';

    return prompt;
  };

  const generateForPlatform = async (platformId, content) => {
    const platform = platforms[platformId];
    setLoadingStates(prev => ({ ...prev, [platformId]: true }));
    setErrors(prev => ({ ...prev, [platformId]: false }));
    setOutputs(prev => ({ ...prev, [platformId]: '' }));

    const systemPrompt = buildSystemPrompt(platform.prompt);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content }
          ],
          stream: true
        })
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      let fullText = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            let parsed = null;
            try { parsed = JSON.parse(line.trim().slice(6)); } catch { continue; }
            const text = parsed?.choices?.[0]?.delta?.content || '';
            if (text) {
              fullText += text;
              flushSync(() => { setOutputs(prev => ({ ...prev, [platformId]: fullText })); });
              await new Promise(resolve => requestAnimationFrame(resolve));
            }
          }
        }
      }

      setOutputs(prev => ({ ...prev, [platformId]: fullText }));
      return fullText;
    } catch (err) {
      console.error(`Error generating for ${platformId}:`, err);
      setErrors(prev => ({ ...prev, [platformId]: true }));
      return null;
    } finally {
      setLoadingStates(prev => ({ ...prev, [platformId]: false }));
    }
  };

  const addToHistory = (inputText, platforms, completedOutputs) => {
    apiFetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: inputText, selectedPlatforms: platforms, outputs: completedOutputs }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(entry => {
        if (entry) setHistory(prev => [entry, ...prev].slice(0, MAX_HISTORY));
      })
      .catch(() => {});
  };

  const handleGenerate = () => {
    if (!apiKey) {
      alert('OpenAI API Key is missing! Please set VITE_OPENAI_API_KEY in your environment.');
      return;
    }
    const currentInput = input;
    const currentPlatforms = [...selectedPlatforms];
    const completedOutputs = {};
    let completedCount = 0;
    currentPlatforms.forEach(platformId => {
      generateForPlatform(platformId, currentInput).then((result) => {
        if (result) completedOutputs[platformId] = result;
        completedCount++;
        if (completedCount === currentPlatforms.length && Object.keys(completedOutputs).length > 0) {
          addToHistory(currentInput, currentPlatforms, completedOutputs);
        }
      });
    });
  };

  const handleHistoryRestore = (entry) => {
    setInput(entry.input);
    setSelectedPlatforms(entry.selectedPlatforms);
    setOutputs(entry.outputs);
    setErrors({});
    setLoadingStates({});
  };

  const handleHistoryDelete = (id) => {
    setHistory(prev => prev.filter(e => e.id !== id));
    apiFetch(`/api/history/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const handleHistoryClear = () => {
    setHistory([]);
    apiFetch('/api/history', { method: 'DELETE' }).catch(() => {});
  };

  const isGenerating = Object.values(loadingStates).some(state => state);

  // Show paywall only for users who have never subscribed (status === null)
  // Users with a lapsed/failed subscription (status is non-null but inactive) see the app + a banner
  if (!subLoading && subscription && !subscription.active && subscription.status === null) {
    return (
      <PricingPage
        user={user}
        onLogout={logout}
        checkoutCancelled={checkoutCancelledRef.current}
      />
    );
  }

  return (
    <div style={styles.layout}>
      {showCheckoutBanner && (
        <div style={styles.checkoutBanner}>
          <span style={styles.checkoutBannerText}>🎉 You're subscribed! Welcome to ContentMorph.</span>
          <button style={styles.checkoutBannerClose} onClick={() => setShowCheckoutBanner(false)} aria-label="Dismiss">✕</button>
        </div>
      )}
      {showPastDueBanner && (
        <div style={styles.pastDueBanner}>
          <span style={styles.pastDueBannerIcon}>⏰</span>
          <span style={styles.pastDueBannerText}>
            Your payment is overdue — please{' '}
            <button style={styles.pastDueBannerLink} onClick={handleOpenPortal} disabled={portalLoading}>
              {portalLoading ? 'Opening…' : 'update your card'}
            </button>
            {' '}before you lose access.
          </span>
          <button style={styles.pastDueBannerClose} onClick={() => setShowPastDueBanner(false)} aria-label="Dismiss">✕</button>
        </div>
      )}
      {showPaymentFailedBanner && (
        <div style={styles.paymentFailedBanner}>
          <span style={styles.paymentFailedIcon}>⚠️</span>
          <span style={styles.paymentFailedText}>
            {paymentFailedMessage()}{' '}
            <button style={styles.paymentFailedLink} onClick={handleOpenPortal} disabled={portalLoading}>
              {portalLoading ? 'Opening…' : 'Update your billing'}
            </button>
            {' '}or{' '}
            <button style={styles.paymentFailedLink} onClick={handleResubscribe}>
              resubscribe
            </button>.
          </span>
          <button style={styles.paymentFailedClose} onClick={() => setShowPaymentFailedBanner(false)} aria-label="Dismiss">✕</button>
        </div>
      )}
      <main style={styles.main}>
        <InputPanel
          input={input}
          setInput={setInput}
          isGenerating={isGenerating}
          onGenerate={handleGenerate}
          onSettingsOpen={() => setSettingsOpen(true)}
          onHistoryOpen={() => setHistoryOpen(true)}
          historyCount={history.length}
          settingsRef={settingsRef}
          gearPulse={gearPulse}
        />
        <PlatformSelector
          selectedPlatforms={selectedPlatforms}
          togglePlatform={togglePlatform}
          isGenerating={isGenerating}
        />
        <OutputGrid
          selectedPlatforms={selectedPlatforms}
          outputs={outputs}
          loadingStates={loadingStates}
          errors={errors}
          onRetry={(platformId) => generateForPlatform(platformId, input)}
        />
      </main>

      <footer style={styles.footer}>
        <span style={styles.footerText}>Questions or feedback? Reach out at </span>
        <button
          style={styles.footerLink}
          onClick={() => {
            navigator.clipboard.writeText('contentmorph71@gmail.com');
            setEmailCopied(true);
            setTimeout(() => setEmailCopied(false), 2000);
          }}
        >
          {emailCopied ? '✓ Copied!' : 'contentmorph71@gmail.com'}
        </button>
        <p style={styles.footerDisclaimer}>I read everything, but I can't respond to everyone. For billing issues, please use the Stripe customer portal.</p>
      </footer>

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        onRestore={handleHistoryRestore}
        onDelete={handleHistoryDelete}
        onClear={handleHistoryClear}
      />

      {showOnboarding && (
        <OnboardingModal
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}

      {showSkipAlert && (
        <div style={styles.skipAlert}>
          <div style={styles.skipAlertArrow} />
          <p style={styles.skipAlertText}>
            ⚙️ You can update your voice and writing samples anytime from <strong>Settings</strong> (gear icon) in the top-right corner.
          </p>
          <button style={styles.skipAlertBtn} onClick={handleDismissSkipAlert}>
            Got it
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  layout: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '60px 20px',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'transparent',
    borderRadius: '16px',
    overflow: 'hidden',
  },
  skipAlert: {
    position: 'fixed',
    top: '64px',
    right: '20px',
    zIndex: 300,
    backgroundColor: 'var(--panel-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '16px 18px',
    maxWidth: '300px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    animation: 'fadeSlideIn 0.25s ease-out',
  },
  skipAlertArrow: {
    position: 'absolute',
    top: '-7px',
    right: '18px',
    width: '12px',
    height: '12px',
    backgroundColor: 'var(--panel-bg)',
    border: '1px solid var(--border-color)',
    borderBottom: 'none',
    borderRight: 'none',
    transform: 'rotate(45deg)',
  },
  skipAlertText: {
    margin: '0 0 12px',
    fontSize: '0.88rem',
    color: 'var(--text-muted)',
    lineHeight: '1.55',
    fontFamily: 'var(--font-body)',
  },
  skipAlertBtn: {
    width: '100%',
    padding: '8px 0',
    backgroundColor: 'var(--text-main)',
    color: 'var(--bg-color)',
    border: 'none',
    borderRadius: '7px',
    fontSize: '0.88rem',
    fontFamily: 'var(--font-body)',
    fontWeight: '600',
    cursor: 'pointer',
  },
  checkoutBanner: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 400,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#1a3a1a',
    border: '1px solid #2d6a2d',
    borderRadius: '10px',
    padding: '12px 18px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    animation: 'fadeSlideIn 0.25s ease-out',
    whiteSpace: 'nowrap',
  },
  checkoutBannerText: {
    fontSize: '0.92rem',
    color: '#7eca7e',
    fontFamily: 'var(--font-body)',
    fontWeight: '500',
  },
  checkoutBannerClose: {
    background: 'none',
    border: 'none',
    color: '#7eca7e',
    cursor: 'pointer',
    fontSize: '0.85rem',
    padding: '0 2px',
    opacity: 0.7,
    lineHeight: 1,
  },
  paymentFailedBanner: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 400,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#3a1a1a',
    border: '1px solid #7a2d2d',
    borderRadius: '10px',
    padding: '12px 18px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    animation: 'fadeSlideIn 0.25s ease-out',
    maxWidth: '90vw',
  },
  paymentFailedIcon: {
    fontSize: '1rem',
    flexShrink: 0,
  },
  paymentFailedText: {
    fontSize: '0.9rem',
    color: '#e8a0a0',
    fontFamily: 'var(--font-body)',
    lineHeight: 1.45,
  },
  paymentFailedLink: {
    background: 'none',
    border: 'none',
    color: '#f0c0c0',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
  },
  paymentFailedAnchor: {
    color: '#f0c0c0',
    fontWeight: '600',
    textDecoration: 'underline',
  },
  paymentFailedClose: {
    background: 'none',
    border: 'none',
    color: '#e8a0a0',
    cursor: 'pointer',
    fontSize: '0.85rem',
    padding: '0 2px',
    opacity: 0.7,
    lineHeight: 1,
    flexShrink: 0,
  },
  pastDueBanner: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 400,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#2e2510',
    border: '1px solid #7a5e20',
    borderRadius: '10px',
    padding: '12px 18px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    animation: 'fadeSlideIn 0.25s ease-out',
    maxWidth: '90vw',
  },
  pastDueBannerIcon: {
    fontSize: '1rem',
    flexShrink: 0,
  },
  pastDueBannerText: {
    fontSize: '0.9rem',
    color: '#e8c97a',
    fontFamily: 'var(--font-body)',
    lineHeight: 1.45,
  },
  pastDueBannerLink: {
    background: 'none',
    border: 'none',
    color: '#f0dc9a',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
  },
  pastDueBannerClose: {
    background: 'none',
    border: 'none',
    color: '#e8c97a',
    cursor: 'pointer',
    fontSize: '0.85rem',
    padding: '0 2px',
    opacity: 0.7,
    lineHeight: 1,
    flexShrink: 0,
  },
  footer: {
    marginTop: '48px',
    paddingTop: '20px',
    borderTop: '1px solid var(--border-color)',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-body)',
  },
  footerDisclaimer: {
    margin: '8px 0 0',
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-body)',
    opacity: 0.6,
  },
  footerLink: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-body)',
    textDecoration: 'underline',
    textDecorationColor: 'var(--border-color)',
    transition: 'color 0.2s ease',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
  },
};

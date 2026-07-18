import React, { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import InputPanel from './components/InputPanel';
import PlatformSelector from './components/PlatformSelector';
import OutputGrid from './components/OutputGrid';
import SettingsPanel from './components/SettingsPanel';
import HistoryPanel from './components/HistoryPanel';
import OnboardingModal from './components/OnboardingModal';
import { platforms } from './platforms';
import { useSettings } from './context/SettingsContext';
import { useProfile } from './context/ProfileContext';
import { useAuth } from './context/AuthContext';

const MAX_HISTORY = 50;

export default function App() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const { settings } = useSettings();
  const { profile, profileLoading } = useProfile();
  const { user } = useAuth();
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

  // Load history from the database on mount
  useEffect(() => {
    fetch('/api/history', { credentials: 'include' })
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
    fetch('/api/history', {
      method: 'POST',
      credentials: 'include',
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
    fetch(`/api/history/${id}`, { method: 'DELETE', credentials: 'include' }).catch(() => {});
  };

  const handleHistoryClear = () => {
    setHistory([]);
    fetch('/api/history', { method: 'DELETE', credentials: 'include' }).catch(() => {});
  };

  const isGenerating = Object.values(loadingStates).some(state => state);

  return (
    <div style={styles.layout}>
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

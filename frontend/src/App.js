import React, { useState, useEffect, useCallback } from 'react';
import InputPanel from './components/InputPanel';
import PlatformSelector from './components/PlatformSelector';
import OutputGrid from './components/OutputGrid';
import OnboardingModal from './components/OnboardingModal';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import SavedSessions from './components/SavedSessions';
import SocialAccountsModal from './components/SocialAccountsModal';
import PublishModal from './components/PublishModal';
import ScheduledPostsModal from './components/ScheduledPostsModal';
import BatchPublishModal from './components/BatchPublishModal';
import { platforms } from './platforms';
import { supabase } from './supabaseClient';

export default function App() {
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
  const [input, setInput] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState(Object.keys(platforms));
  const [outputs, setOutputs] = useState({});
  const [loadingStates, setLoadingStates] = useState({});
  const [errors, setErrors] = useState({});

  const [brandVoice, setBrandVoice] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [showSocialAccounts, setShowSocialAccounts] = useState(false);
  const [showScheduled, setShowScheduled] = useState(false);
  const [publishPlatform, setPublishPlatform] = useState(null);
  const [showBatchPublish, setShowBatchPublish] = useState(false);
  const [session, setSession] = useState(null);
  const [pendingGenerate, setPendingGenerate] = useState(false);

  // Handle OAuth callback return (?social=connected or ?social=error)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const social = params.get('social');
    if (social) {
      window.history.replaceState({}, '', window.location.pathname);
      if (social === 'connected') {
        setShowSocialAccounts(true);
      }
    }
  }, []);

  const loadBrandVoice = useCallback(async (userSession) => {
    if (userSession) {
      const { data } = await supabase
        .from('user_profiles')
        .select('brand_voice')
        .eq('user_id', userSession.user.id)
        .single();
      if (data?.brand_voice) {
        setBrandVoice(data.brand_voice);
        return;
      }
    }
    const saved = localStorage.getItem('brandVoice');
    if (saved) setBrandVoice(saved);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      loadBrandVoice(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      loadBrandVoice(session);
      if (event === 'SIGNED_IN') {
        const createdAt = session?.user?.created_at;
        const isNewUser = createdAt && (Date.now() - new Date(createdAt).getTime()) < 10000;
        if (isNewUser) setShowOnboarding(true);
      }
    });

    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) setShowOnboarding(true);

    return () => subscription.unsubscribe();
  }, [loadBrandVoice]);

  useEffect(() => {
    if (session && pendingGenerate && input.trim()) {
      setPendingGenerate(false);
      runGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, pendingGenerate]);

  const saveBrandVoiceToSupabase = async (voice, userSession) => {
    if (!userSession) return;
    await supabase.from('user_profiles').upsert({
      user_id: userSession.user.id,
      brand_voice: voice,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  };

  const handleSaveBrandVoice = async (voice) => {
    setBrandVoice(voice);
    localStorage.setItem('brandVoice', voice);
    localStorage.setItem('hasSeenOnboarding', 'true');
    await saveBrandVoiceToSupabase(voice, session);
    setShowOnboarding(false);
    setShowSettings(false);
  };

  const handleSkipOnboarding = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  const togglePlatform = (id) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const generateForPlatform = async (platformId, content) => {
    const platform = platforms[platformId];
    setLoadingStates(prev => ({ ...prev, [platformId]: true }));
    setErrors(prev => ({ ...prev, [platformId]: false }));
    setOutputs(prev => ({ ...prev, [platformId]: '' }));

    try {
      let systemPrompt = platform.prompt;
      if (brandVoice.trim()) {
        systemPrompt += `\n\nUSER'S BRAND VOICE/PERSONA: "${brandVoice}". You MUST strictly adopt this persona and tone in your writing.`;
      }

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

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.trim().slice(6));
              const text = data.choices[0]?.delta?.content || '';
              if (text) {
                setOutputs(prev => ({
                  ...prev,
                  [platformId]: (prev[platformId] || '') + text
                }));
              }
            } catch (e) { /* ignore */ }
          }
        }
      }
    } catch (err) {
      console.error(`Error generating for ${platformId}:`, err);
      setErrors(prev => ({ ...prev, [platformId]: true }));
    } finally {
      setLoadingStates(prev => ({ ...prev, [platformId]: false }));
    }
  };

  const runGenerate = () => {
    if (!apiKey) {
      alert('OpenAI API Key is missing! Please set REACT_APP_OPENAI_API_KEY in your .env file.');
      return;
    }
    selectedPlatforms.forEach(platformId => generateForPlatform(platformId, input));
  };

  const handleGenerate = () => {
    if (!session) {
      setPendingGenerate(true);
      setShowAuth(true);
      return;
    }
    runGenerate();
  };

  const handleSaveSession = async () => {
    if (!session) { setShowAuth(true); return; }
    const hasOutput = Object.values(outputs).some(o => o?.trim());
    if (!hasOutput) return;
    const title = input.slice(0, 60) + (input.length > 60 ? '...' : '');
    const { error } = await supabase.from('saved_sessions').insert({
      user_id: session.user.id,
      title,
      input_text: input,
      outputs,
      selected_platforms: selectedPlatforms,
      brand_voice_used: brandVoice,
    });
    if (!error) alert('Session saved!');
  };

  const handleLoadSession = (savedSession) => {
    setInput(savedSession.input_text);
    setOutputs(savedSession.outputs);
    setSelectedPlatforms(savedSession.selected_platforms);
    setShowSessions(false);
  };

  const handlePublish = (platformId) => {
    setPublishPlatform(platformId);
  };

  const isGenerating = Object.values(loadingStates).some(Boolean);
  const hasOutput = Object.values(outputs).some(o => o?.trim());

  if (!session) {
    return (
      <div style={styles.layout} className="App">
        <AuthModal onClose={() => {}} />
      </div>
    );
  }

  return (
    <div style={styles.layout} className="App" data-testid="app-root">
      {showOnboarding && (
        <OnboardingModal onSave={handleSaveBrandVoice} onSkip={handleSkipOnboarding} />
      )}
      {showSettings && (
        <SettingsModal
          initialBrandVoice={brandVoice}
          session={session}
          onSave={handleSaveBrandVoice}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showAuth && (
        <AuthModal onClose={() => { setShowAuth(false); setPendingGenerate(false); }} />
      )}
      {showSessions && (
        <SavedSessions
          session={session}
          onLoad={handleLoadSession}
          onClose={() => setShowSessions(false)}
        />
      )}
      {showSocialAccounts && (
        <SocialAccountsModal
          session={session}
          onClose={() => setShowSocialAccounts(false)}
        />
      )}
      {showScheduled && (
        <ScheduledPostsModal
          session={session}
          onClose={() => setShowScheduled(false)}
        />
      )}
      {publishPlatform && (
        <PublishModal
          session={session}
          platformId={publishPlatform}
          content={outputs[publishPlatform] || ''}
          onClose={() => setPublishPlatform(null)}
          onOpenAccounts={() => { setPublishPlatform(null); setShowSocialAccounts(true); }}
        />
      )}

      <main style={styles.main}>
        <InputPanel
          input={input}
          setInput={setInput}
          isGenerating={isGenerating}
          onGenerate={handleGenerate}
          onOpenSettings={() => setShowSettings(true)}
          onOpenSessions={() => setShowSessions(true)}
          onOpenSocialAccounts={() => setShowSocialAccounts(true)}
          onOpenScheduled={() => setShowScheduled(true)}
          onSaveSession={handleSaveSession}
          hasOutput={hasOutput}
          session={session}
          onOpenAuth={() => setShowAuth(true)}
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
          onPublish={handlePublish}
          onPublishAll={() => setShowBatchPublish(true)}
        />
      </main>
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
  }
};

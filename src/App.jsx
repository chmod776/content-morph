import React, { useState } from 'react';
import InputPanel from './components/InputPanel';
import PlatformSelector from './components/PlatformSelector';
import OutputGrid from './components/OutputGrid';
import SettingsPanel from './components/SettingsPanel';
import { platforms } from './platforms';
import { useSettings } from './context/SettingsContext';

export default function App() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const { settings } = useSettings();

  const [input, setInput] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState(settings.defaultPlatforms);
  const [outputs, setOutputs] = useState({});
  const [loadingStates, setLoadingStates] = useState({});
  const [errors, setErrors] = useState({});
  const [settingsOpen, setSettingsOpen] = useState(false);

  const togglePlatform = (id) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const buildSystemPrompt = (platformPrompt) => {
    let prompt = platformPrompt;

    if (settings.brandVoice?.trim()) {
      prompt = `BRAND VOICE OVERRIDE — Apply this brand voice to all output, overriding any default tone guidance: "${settings.brandVoice.trim()}"\n\n${prompt}`;
    }

    if (settings.outputLanguage && settings.outputLanguage !== 'English') {
      prompt += `\n\nIMPORTANT: Write ALL output in ${settings.outputLanguage}. Do not use English.`;
    }

    if (settings.contentLength === 'concise') {
      prompt += '\n\nLength instruction: Keep the output shorter and more concise than usual. Cut anything that isn\'t essential.';
    } else if (settings.contentLength === 'detailed') {
      prompt += '\n\nLength instruction: Write a longer, more detailed and expansive version than you normally would.';
    }

    return prompt;
  };

  const generateForPlatform = async (platformId, content) => {
    const platform = platforms[platformId];
    setLoadingStates(prev => ({ ...prev, [platformId]: true }));
    setErrors(prev => ({ ...prev, [platformId]: false }));
    setOutputs(prev => ({ ...prev, [platformId]: '' }));

    const systemPrompt = buildSystemPrompt(platform.prompt);
    const useStreaming = settings.streamingEnabled !== false;

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
          stream: useStreaming
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      if (useStreaming) {
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
              } catch (e) {
                // Ignore parse errors from incomplete streamed lines
              }
            }
          }
        }
      } else {
        const data = await response.json();
        const text = data.choices[0]?.message?.content || '';
        setOutputs(prev => ({ ...prev, [platformId]: text }));
      }
    } catch (err) {
      console.error(`Error generating for ${platformId}:`, err);
      setErrors(prev => ({ ...prev, [platformId]: true }));
    } finally {
      setLoadingStates(prev => ({ ...prev, [platformId]: false }));
    }
  };

  const handleGenerate = () => {
    if (!apiKey) {
      alert("OpenAI API Key is missing! Please set VITE_OPENAI_API_KEY in your environment.");
      return;
    }
    selectedPlatforms.forEach(platformId => {
      generateForPlatform(platformId, input);
    });
  };

  const handleSave = () => {
    if (!input.trim()) return;
    const blob = new Blob([input], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'content-morph-draft.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePublishAll = () => {
    const readyOutputs = selectedPlatforms
      .filter(id => outputs[id] && !loadingStates[id])
      .map(id => `=== ${platforms[id].name} ===\n\n${outputs[id]}`)
      .join('\n\n\n');
    if (!readyOutputs) return;
    const blob = new Blob([readyOutputs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'content-morph-all-platforms.txt';
    a.click();
    URL.revokeObjectURL(url);
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
          onSave={handleSave}
          onSettingsOpen={() => setSettingsOpen(true)}
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
          onPublishAll={handlePublishAll}
        />
      </main>

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
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

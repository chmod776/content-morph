import React, { useState, useRef, useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';
import InputPanel from './components/InputPanel';
import PlatformSelector from './components/PlatformSelector';
import OutputGrid from './components/OutputGrid';
import SettingsPanel from './components/SettingsPanel';
import HistoryPanel from './components/HistoryPanel';
import { platforms } from './platforms';
import { useSettings } from './context/SettingsContext';

const MAX_HISTORY = 50;

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem('contentmorph-history') || '[]');
  } catch { return []; }
}

function saveHistory(h) {
  localStorage.setItem('contentmorph-history', JSON.stringify(h));
}

export default function App() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const { settings } = useSettings();

  const [input, setInput] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState(settings.defaultPlatforms);
  const [outputs, setOutputs] = useState({});
  const [loadingStates, setLoadingStates] = useState({});
  const [errors, setErrors] = useState({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState(loadHistory);


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

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

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
            try { parsed = JSON.parse(line.trim().slice(6)); } catch (e) { continue; }
            const text = parsed?.choices?.[0]?.delta?.content || '';
            if (text) {
              fullText += text;
              // Force React to paint this token, then yield to the browser
              flushSync(() => {
                setOutputs(prev => ({ ...prev, [platformId]: fullText }));
              });
              await new Promise(resolve => requestAnimationFrame(resolve));
            }
          }
        }
      }

      // Final commit to ensure the complete text is in state
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
    const entry = {
      id: Date.now(),
      input: inputText,
      selectedPlatforms: platforms,
      outputs: completedOutputs,
    };
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  };

  const handleGenerate = () => {
    if (!apiKey) {
      alert("OpenAI API Key is missing! Please set VITE_OPENAI_API_KEY in your environment.");
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
        if (completedCount === currentPlatforms.length) {
          if (Object.keys(completedOutputs).length > 0) {
            addToHistory(currentInput, currentPlatforms, completedOutputs);
          }
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
    setHistory(prev => {
      const next = prev.filter(e => e.id !== id);
      saveHistory(next);
      return next;
    });
  };

  const handleHistoryClear = () => {
    setHistory([]);
    saveHistory([]);
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
          onHistoryOpen={() => setHistoryOpen(true)}
          historyCount={history.length}
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
      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        onRestore={handleHistoryRestore}
        onDelete={handleHistoryDelete}
        onClear={handleHistoryClear}
      />
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

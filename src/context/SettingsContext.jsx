import React, { createContext, useContext, useState, useEffect } from 'react';

const defaultSettings = {
  darkMode: true,
  brandVoice: '',
  outputLanguage: 'English',
  defaultPlatforms: ['twitter', 'linkedin', 'instagram', 'youtube'],
  contentLength: 'standard',
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('contentmorph-settings');
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem('contentmorph-settings', JSON.stringify(settings));
    if (settings.darkMode) {
      document.documentElement.classList.remove('light-mode');
    } else {
      document.documentElement.classList.add('light-mode');
    }
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

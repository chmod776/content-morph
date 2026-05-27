import React, { useEffect, useRef } from 'react';
import { X, Moon, Sun, Mic2, Globe, Layers, Zap, AlignLeft } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { platforms } from '../platforms';

const languages = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Dutch', 'Japanese', 'Korean', 'Mandarin'];
const contentLengths = [
  { value: 'concise', label: 'Concise', desc: 'Shorter, punchier output' },
  { value: 'standard', label: 'Standard', desc: 'Balanced length (default)' },
  { value: 'detailed', label: 'Detailed', desc: 'More thorough, expansive output' },
];

export default function SettingsPanel({ isOpen, onClose }) {
  const { settings, updateSetting } = useSettings();
  const panelRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const togglePlatformDefault = (id) => {
    const curr = settings.defaultPlatforms;
    const next = curr.includes(id) ? curr.filter(p => p !== id) : [...curr, id];
    updateSetting('defaultPlatforms', next);
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div ref={panelRef} style={styles.panel}>
        <div style={styles.header}>
          <h2 style={styles.title}>Settings</h2>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={styles.body}>

          {/* Brand Voice */}
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <Mic2 size={16} style={{ marginRight: '8px', color: 'var(--text-muted)' }} />
              <h3 style={styles.sectionTitle}>Brand Voice</h3>
            </div>
            <p style={styles.sectionDesc}>
              Describe your tone, style, and personality. This gets applied to every generation.
            </p>
            <textarea
              style={styles.brandVoiceInput}
              placeholder={`e.g. "Speak like a confident founder — direct, warm, no fluff. Use simple words. Avoid corporate jargon. Sound like you're texting a smart friend."`}
              value={settings.brandVoice}
              onChange={(e) => updateSetting('brandVoice', e.target.value)}
              rows={5}
              onFocus={(e) => { e.target.style.borderColor = 'var(--text-muted)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; }}
            />
            {settings.brandVoice && (
              <button style={styles.clearBtn} onClick={() => updateSetting('brandVoice', '')}>
                Clear voice
              </button>
            )}
          </section>

          <div style={styles.divider} />

          {/* Appearance */}
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              {settings.darkMode ? <Moon size={16} style={{ marginRight: '8px', color: 'var(--text-muted)' }} /> : <Sun size={16} style={{ marginRight: '8px', color: 'var(--text-muted)' }} />}
              <h3 style={styles.sectionTitle}>Appearance</h3>
            </div>
            <div style={styles.toggleRow}>
              <div>
                <div style={styles.toggleLabel}>{settings.darkMode ? 'Dark Mode' : 'Light Mode'}</div>
                <div style={styles.toggleDesc}>Switch the app theme</div>
              </div>
              <button
                style={{ ...styles.toggle, backgroundColor: settings.darkMode ? 'var(--text-main)' : 'var(--border-color)' }}
                onClick={() => updateSetting('darkMode', !settings.darkMode)}
              >
                <div style={{
                  ...styles.toggleKnob,
                  transform: settings.darkMode ? 'translateX(22px)' : 'translateX(2px)',
                }} />
              </button>
            </div>
          </section>

          <div style={styles.divider} />

          {/* Output Language */}
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <Globe size={16} style={{ marginRight: '8px', color: 'var(--text-muted)' }} />
              <h3 style={styles.sectionTitle}>Output Language</h3>
            </div>
            <p style={styles.sectionDesc}>All generated content will be written in this language.</p>
            <div style={styles.optionGrid}>
              {languages.map(lang => (
                <button
                  key={lang}
                  style={{
                    ...styles.optionChip,
                    borderColor: settings.outputLanguage === lang ? 'var(--text-main)' : 'var(--border-color)',
                    color: settings.outputLanguage === lang ? 'var(--text-main)' : 'var(--text-muted)',
                    backgroundColor: settings.outputLanguage === lang ? 'rgba(255,255,255,0.06)' : 'transparent',
                  }}
                  onClick={() => updateSetting('outputLanguage', lang)}
                >
                  {lang}
                </button>
              ))}
            </div>
          </section>

          <div style={styles.divider} />

          {/* Content Length */}
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <AlignLeft size={16} style={{ marginRight: '8px', color: 'var(--text-muted)' }} />
              <h3 style={styles.sectionTitle}>Content Length</h3>
            </div>
            <p style={styles.sectionDesc}>Controls how long each platform's output will be.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {contentLengths.map(opt => (
                <button
                  key={opt.value}
                  style={{
                    ...styles.lengthOption,
                    borderColor: settings.contentLength === opt.value ? 'var(--text-main)' : 'var(--border-color)',
                    backgroundColor: settings.contentLength === opt.value ? 'rgba(255,255,255,0.05)' : 'transparent',
                  }}
                  onClick={() => updateSetting('contentLength', opt.value)}
                >
                  <span style={{ color: 'var(--text-main)', fontWeight: settings.contentLength === opt.value ? '600' : '400', flexShrink: 0 }}>{opt.label}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </section>

          <div style={styles.divider} />

          {/* Default Platforms */}
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <Layers size={16} style={{ marginRight: '8px', color: 'var(--text-muted)' }} />
              <h3 style={styles.sectionTitle}>Default Platforms</h3>
            </div>
            <p style={styles.sectionDesc}>Which platforms are pre-selected when you open the app.</p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {Object.values(platforms).map(p => {
                const active = settings.defaultPlatforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    style={{
                      ...styles.platformChip,
                      borderColor: active ? p.color : 'var(--border-color)',
                      backgroundColor: active ? p.color : 'transparent',
                      color: active ? (p.id === 'twitter' ? '#ffffff' : '#0d0d0d') : 'var(--text-muted)',
                    }}
                    onClick={() => togglePlatformDefault(p.id)}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </section>

          <div style={styles.divider} />

          {/* Streaming */}
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <Zap size={16} style={{ marginRight: '8px', color: 'var(--text-muted)' }} />
              <h3 style={styles.sectionTitle}>Live Streaming</h3>
            </div>
            <div style={styles.toggleRow}>
              <div>
                <div style={styles.toggleLabel}>Stream output as it generates</div>
                <div style={styles.toggleDesc}>See words appear in real time (recommended)</div>
              </div>
              <button
                style={{ ...styles.toggle, backgroundColor: settings.streamingEnabled ? 'var(--text-main)' : 'var(--border-color)' }}
                onClick={() => updateSetting('streamingEnabled', !settings.streamingEnabled)}
              >
                <div style={{
                  ...styles.toggleKnob,
                  transform: settings.streamingEnabled ? 'translateX(22px)' : 'translateX(2px)',
                }} />
              </button>
            </div>
          </section>

        </div>
      </div>
    </>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 100,
    backdropFilter: 'blur(2px)',
  },
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '420px',
    backgroundColor: 'var(--panel-bg)',
    borderLeft: '1px solid var(--border-color)',
    zIndex: 101,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '28px 32px',
    borderBottom: '1px solid var(--border-color)',
    position: 'sticky',
    top: 0,
    backgroundColor: 'var(--panel-bg)',
    zIndex: 1,
  },
  title: {
    margin: 0,
    fontSize: '1.4rem',
    fontWeight: '700',
    fontFamily: 'var(--font-heading)',
    color: 'var(--text-main)',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    display: 'flex',
  },
  body: {
    padding: '8px 0 40px',
    overflowY: 'auto',
    flex: 1,
  },
  section: {
    padding: '24px 32px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '6px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    fontFamily: 'var(--font-aesthetic)',
  },
  sectionDesc: {
    margin: '0 0 14px 0',
    color: 'var(--text-muted)',
    fontSize: '0.88rem',
    lineHeight: '1.5',
  },
  divider: {
    height: '1px',
    backgroundColor: 'var(--border-color)',
    margin: '0 32px',
  },
  brandVoiceInput: {
    width: '100%',
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-main)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '16px',
    fontSize: '0.92rem',
    lineHeight: '1.6',
    outline: 'none',
    fontFamily: 'var(--font-body)',
    resize: 'vertical',
    transition: 'border-color 0.2s',
  },
  clearBtn: {
    marginTop: '8px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '0.82rem',
    cursor: 'pointer',
    padding: '2px 0',
    textDecoration: 'underline',
  },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
  },
  toggleLabel: {
    color: 'var(--text-main)',
    fontSize: '0.95rem',
    fontWeight: '500',
    marginBottom: '2px',
  },
  toggleDesc: {
    color: 'var(--text-muted)',
    fontSize: '0.82rem',
  },
  toggle: {
    width: '46px',
    height: '26px',
    borderRadius: '13px',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    flexShrink: 0,
    transition: 'background-color 0.2s',
    padding: 0,
  },
  toggleKnob: {
    position: 'absolute',
    top: '3px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-color)',
    transition: 'transform 0.2s',
  },
  optionGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  optionChip: {
    padding: '6px 14px',
    borderRadius: '20px',
    border: '1px solid',
    cursor: 'pointer',
    fontSize: '0.88rem',
    fontFamily: 'var(--font-body)',
    transition: 'all 0.15s',
    backgroundColor: 'transparent',
  },
  lengthOption: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: '0.92rem',
    transition: 'all 0.15s',
    textAlign: 'left',
    gap: '16px',
    overflow: 'hidden',
  },
  platformChip: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid',
    cursor: 'pointer',
    fontSize: '0.88rem',
    fontFamily: 'var(--font-body)',
    fontWeight: '500',
    transition: 'all 0.15s',
  },
};

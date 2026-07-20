import React, { useEffect, useRef, useState } from 'react';
import { X, Moon, Sun, Mic2, Globe, Layers, AlignLeft, Check, Upload, Trash2, BookOpen, CreditCard, ExternalLink } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useProfile } from '../context/ProfileContext';
import { platforms } from '../platforms';
import { useTranslation } from '../hooks/useTranslation';

const languages = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Dutch', 'Japanese', 'Korean', 'Mandarin'];

const nativeLanguageNames = {
  English: 'English', Spanish: 'Español', French: 'Français', German: 'Deutsch',
  Portuguese: 'Português', Italian: 'Italiano', Dutch: 'Nederlands',
  Japanese: '日本語', Korean: '한국어', Mandarin: '中文',
};

export default function SettingsPanel({ isOpen, onClose, subscription }) {
  const { settings, updateSetting } = useSettings();
  const { profile, updateProfile } = useProfile();
  const t = useTranslation();
  const panelRef = useRef(null);

  const [portalLoading, setPortalLoading] = useState(false);

  const [draftVoice, setDraftVoice] = useState('');
  const [draftSamples, setDraftSamples] = useState(['', '', '']);
  const [voiceSaved, setVoiceSaved] = useState(false);
  const [samplesSaved, setSamplesSaved] = useState(false);
  const [savingVoice, setSavingVoice] = useState(false);
  const [savingSamples, setSavingSamples] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState(null);
  const fileRefs = [useRef(), useRef(), useRef()];

  // Sync from profile when panel opens
  useEffect(() => {
    if (isOpen && profile) {
      setDraftVoice(profile.brand_voice || '');
      const s = profile.writing_samples || [];
      setDraftSamples([s[0] || '', s[1] || '', s[2] || '']);
      setVoiceSaved(false);
      setSamplesSaved(false);
    }
  }, [isOpen, profile]);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const hasVoiceChanges = profile ? draftVoice !== (profile.brand_voice || '') : false;
  const hasSampleChanges = profile
    ? JSON.stringify(draftSamples) !== JSON.stringify([
        profile.writing_samples?.[0] || '',
        profile.writing_samples?.[1] || '',
        profile.writing_samples?.[2] || '',
      ])
    : false;

  const handleSaveVoice = async () => {
    setSavingVoice(true);
    try {
      await updateProfile({ brand_voice: draftVoice.trim() });
      setVoiceSaved(true);
      setTimeout(() => setVoiceSaved(false), 2000);
    } catch {}
    setSavingVoice(false);
  };

  const handleClearVoice = async () => {
    setDraftVoice('');
    try { await updateProfile({ brand_voice: '' }); } catch {}
    setVoiceSaved(false);
  };

  const handleSaveSamples = async () => {
    setSavingSamples(true);
    try {
      await updateProfile({ writing_samples: draftSamples.filter(s => s.trim().length > 0) });
      setSamplesSaved(true);
      setTimeout(() => setSamplesSaved(false), 2000);
    } catch {}
    setSavingSamples(false);
  };

  const handleFileUpload = async (idx, file) => {
    if (!file) return;
    const allowed = ['.txt', '.md', '.pdf', '.docx'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      alert('Unsupported file type. Please upload .txt, .md, .pdf, or .docx');
      return;
    }
    setUploadingIdx(idx);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { apiFetch } = await import('../utils/apiFetch');
      const r = await apiFetch('/api/profile/extract-text', {
        method: 'POST',
        body: formData,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Upload failed');
      const next = [...draftSamples];
      next[idx] = data.text;
      setDraftSamples(next);
    } catch (err) {
      alert(err.message || 'Failed to extract text');
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const { apiFetch } = await import('../utils/apiFetch');
      const r = await apiFetch('/api/stripe/portal', { method: 'POST' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Failed to open billing portal');
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      alert(err.message || 'Could not open billing portal. Please try again.');
    } finally {
      setPortalLoading(false);
    }
  };

  const togglePlatformDefault = (id) => {
    const curr = settings.defaultPlatforms;
    const next = curr.includes(id) ? curr.filter(p => p !== id) : [...curr, id];
    updateSetting('defaultPlatforms', next);
  };

  const contentLengths = [
    { value: 'concise', label: t.conciseLabel, desc: t.conciseDesc },
    { value: 'standard', label: t.standardLabel, desc: t.standardDesc },
    { value: 'detailed', label: t.detailedLabel, desc: t.detailedDesc },
  ];

  if (!isOpen) return null;

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div ref={panelRef} style={styles.panel}>
        <div style={styles.header}>
          <h2 style={styles.title}>{t.settingsTitle}</h2>
          <button style={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>

        <div style={styles.body}>

          {/* ── Your Voice ── */}
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <Mic2 size={16} style={{ marginRight: '8px', color: 'var(--text-muted)' }} />
              <h3 style={styles.sectionTitle}>Your Voice</h3>
            </div>
            <p style={styles.sectionDesc}>Describe your tone, style, and personality. Every generated post will be shaped by this.</p>
            <textarea
              style={styles.brandVoiceInput}
              placeholder="e.g. Conversational but authoritative. Short sentences, occasional dry humour, no buzzwords."
              value={draftVoice}
              onChange={(e) => { setDraftVoice(e.target.value); setVoiceSaved(false); }}
              rows={5}
              onFocus={(e) => e.target.style.borderColor = 'var(--text-muted)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
            />
            <div style={styles.voiceActions}>
              {draftVoice && (
                <button style={styles.clearBtn} onClick={handleClearVoice}>Clear</button>
              )}
              <button
                style={{
                  ...styles.saveVoiceBtn,
                  backgroundColor: voiceSaved ? 'transparent' : (hasVoiceChanges ? 'var(--text-main)' : 'transparent'),
                  color: voiceSaved ? 'var(--text-muted)' : (hasVoiceChanges ? 'var(--bg-color)' : 'var(--text-muted)'),
                  borderColor: voiceSaved ? 'var(--border-color)' : (hasVoiceChanges ? 'var(--text-main)' : 'var(--border-color)'),
                  cursor: hasVoiceChanges && !voiceSaved ? 'pointer' : 'default',
                }}
                onClick={handleSaveVoice}
                disabled={!hasVoiceChanges || voiceSaved || savingVoice}
              >
                {voiceSaved ? (<><Check size={13} style={{ marginRight: '5px' }} />Saved</>) : savingVoice ? 'Saving…' : hasVoiceChanges ? 'Save changes' : 'Saved'}
              </button>
            </div>
          </section>

          <div style={styles.divider} />

          {/* ── Writing Samples ── */}
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <BookOpen size={16} style={{ marginRight: '8px', color: 'var(--text-muted)' }} />
              <h3 style={styles.sectionTitle}>Writing Samples</h3>
            </div>
            <p style={styles.sectionDesc}>Up to 3 examples of your own writing. Content Morph will mimic your voice and rhythm, not your content.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '12px' }}>
              {draftSamples.map((s, idx) => (
                <div key={idx}>
                  <div style={styles.sampleHeader}>
                    <span style={styles.sampleLabel}>Sample {idx + 1}</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        style={styles.uploadBtn}
                        onClick={() => fileRefs[idx].current.click()}
                        disabled={uploadingIdx === idx}
                      >
                        <Upload size={11} style={{ marginRight: '3px' }} />
                        {uploadingIdx === idx ? 'Uploading…' : 'Upload file'}
                      </button>
                      <input
                        ref={fileRefs[idx]}
                        type="file"
                        accept=".txt,.md,.pdf,.docx"
                        style={{ display: 'none' }}
                        onChange={e => handleFileUpload(idx, e.target.files[0])}
                      />
                      {s && (
                        <button style={styles.clearSampleBtn} onClick={() => {
                          const next = [...draftSamples]; next[idx] = ''; setDraftSamples(next);
                        }}>
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea
                    style={styles.sampleTextarea}
                    placeholder="Paste your writing here…"
                    value={s}
                    onChange={e => {
                      const next = [...draftSamples]; next[idx] = e.target.value; setDraftSamples(next);
                      setSamplesSaved(false);
                    }}
                    rows={3}
                    onFocus={e => e.target.style.borderColor = 'var(--text-muted)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                style={{
                  ...styles.saveVoiceBtn,
                  backgroundColor: samplesSaved ? 'transparent' : (hasSampleChanges ? 'var(--text-main)' : 'transparent'),
                  color: samplesSaved ? 'var(--text-muted)' : (hasSampleChanges ? 'var(--bg-color)' : 'var(--text-muted)'),
                  borderColor: samplesSaved ? 'var(--border-color)' : (hasSampleChanges ? 'var(--text-main)' : 'var(--border-color)'),
                  cursor: hasSampleChanges && !samplesSaved ? 'pointer' : 'default',
                }}
                onClick={handleSaveSamples}
                disabled={!hasSampleChanges || samplesSaved || savingSamples}
              >
                {samplesSaved ? (<><Check size={13} style={{ marginRight: '5px' }} />Saved</>) : savingSamples ? 'Saving…' : hasSampleChanges ? 'Save samples' : 'Saved'}
              </button>
            </div>
          </section>

          <div style={styles.divider} />

          {/* ── Appearance ── */}
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              {settings.darkMode
                ? <Moon size={16} style={{ marginRight: '8px', color: 'var(--text-muted)' }} />
                : <Sun size={16} style={{ marginRight: '8px', color: 'var(--text-muted)' }} />}
              <h3 style={styles.sectionTitle}>{t.appearanceTitle}</h3>
            </div>
            <div style={styles.toggleRow}>
              <div>
                <div style={styles.toggleLabel}>{settings.darkMode ? t.darkModeLabel : t.lightModeLabel}</div>
                <div style={styles.toggleDesc}>{t.themeDesc}</div>
              </div>
              <button
                style={{ ...styles.toggle, backgroundColor: settings.darkMode ? 'var(--text-main)' : 'var(--border-color)' }}
                onClick={() => updateSetting('darkMode', !settings.darkMode)}
              >
                <div style={{ ...styles.toggleKnob, transform: settings.darkMode ? 'translateX(22px)' : 'translateX(2px)' }} />
              </button>
            </div>
          </section>

          <div style={styles.divider} />

          {/* ── Output Language ── */}
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <Globe size={16} style={{ marginRight: '8px', color: 'var(--text-muted)' }} />
              <h3 style={styles.sectionTitle}>{t.outputLanguageTitle}</h3>
            </div>
            <p style={styles.sectionDesc}>{t.outputLanguageDesc}</p>
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
                  {nativeLanguageNames[lang]}
                </button>
              ))}
            </div>
          </section>

          <div style={styles.divider} />

          {/* ── Content Length ── */}
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <AlignLeft size={16} style={{ marginRight: '8px', color: 'var(--text-muted)' }} />
              <h3 style={styles.sectionTitle}>{t.contentLengthTitle}</h3>
            </div>
            <p style={styles.sectionDesc}>{t.contentLengthDesc}</p>
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

          {/* ── Default Platforms ── */}
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <Layers size={16} style={{ marginRight: '8px', color: 'var(--text-muted)' }} />
              <h3 style={styles.sectionTitle}>{t.defaultPlatformsTitle}</h3>
            </div>
            <p style={styles.sectionDesc}>{t.defaultPlatformsDesc}</p>
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

          {/* ── Billing ── */}
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <CreditCard size={16} style={{ marginRight: '8px', color: 'var(--text-muted)' }} />
              <h3 style={styles.sectionTitle}>Billing</h3>
            </div>
            {subscription?.status !== null && subscription?.status !== undefined ? (
              <>
                <p style={styles.sectionDesc}>Manage your subscription, update payment details, or cancel from the Stripe billing portal.</p>
                <button
                  style={styles.billingBtn}
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                >
                  <ExternalLink size={14} style={{ marginRight: '7px' }} />
                  {portalLoading ? 'Opening…' : 'Manage subscription'}
                </button>
              </>
            ) : (
              <p style={styles.sectionDesc}>You don't have an active subscription yet. Subscribe from the main screen to unlock full access.</p>
            )}
          </section>

        </div>
      </div>
    </>
  );
}

const styles = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, backdropFilter: 'blur(2px)' },
  panel: { position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px', backgroundColor: 'var(--panel-bg)', borderLeft: '1px solid var(--border-color)', zIndex: 101, display: 'flex', flexDirection: 'column', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '28px 32px', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, backgroundColor: 'var(--panel-bg)', zIndex: 1 },
  title: { margin: 0, fontSize: '1.4rem', fontWeight: '700', fontFamily: 'var(--font-heading)', color: 'var(--text-main)' },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex' },
  body: { padding: '8px 0 40px', overflowY: 'auto', flex: 1 },
  section: { padding: '24px 32px' },
  sectionHeader: { display: 'flex', alignItems: 'center', marginBottom: '6px' },
  sectionTitle: { margin: 0, fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', fontFamily: 'var(--font-aesthetic)' },
  sectionDesc: { margin: '0 0 14px 0', color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.5' },
  divider: { height: '1px', backgroundColor: 'var(--border-color)', margin: '0 32px' },
  brandVoiceInput: { width: '100%', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', fontSize: '0.92rem', lineHeight: '1.6', outline: 'none', fontFamily: 'var(--font-body)', resize: 'vertical', transition: 'border-color 0.2s', boxSizing: 'border-box' },
  voiceActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' },
  clearBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer', padding: '2px 0', textDecoration: 'underline' },
  saveVoiceBtn: { display: 'flex', alignItems: 'center', border: '1px solid', borderRadius: '6px', padding: '7px 16px', fontSize: '0.85rem', fontFamily: 'var(--font-body)', fontWeight: '500', transition: 'all 0.2s ease', marginLeft: 'auto' },
  sampleHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' },
  sampleLabel: { fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' },
  uploadBtn: { display: 'flex', alignItems: 'center', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '4px', padding: '3px 7px', fontSize: '0.73rem', fontFamily: 'var(--font-body)', cursor: 'pointer' },
  clearSampleBtn: { display: 'flex', alignItems: 'center', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '4px', padding: '3px 5px', cursor: 'pointer' },
  sampleTextarea: { width: '100%', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.88rem', lineHeight: '1.5', outline: 'none', fontFamily: 'var(--font-body)', resize: 'vertical', transition: 'border-color 0.2s', boxSizing: 'border-box' },
  toggleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' },
  toggleLabel: { color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: '500', marginBottom: '2px' },
  toggleDesc: { color: 'var(--text-muted)', fontSize: '0.82rem' },
  toggle: { width: '46px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background-color 0.2s', padding: 0 },
  toggleKnob: { position: 'absolute', top: '3px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--bg-color)', transition: 'transform 0.2s' },
  optionGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  optionChip: { padding: '6px 14px', borderRadius: '20px', border: '1px solid', cursor: 'pointer', fontSize: '0.88rem', fontFamily: 'var(--font-body)', transition: 'all 0.15s', backgroundColor: 'transparent' },
  lengthOption: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '8px', border: '1px solid', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.92rem', transition: 'all 0.15s', textAlign: 'left', gap: '16px', overflow: 'hidden' },
  platformChip: { padding: '8px 16px', borderRadius: '20px', border: '1px solid', cursor: 'pointer', fontSize: '0.88rem', fontFamily: 'var(--font-body)', fontWeight: '500', transition: 'all 0.15s' },
  billingBtn: { display: 'inline-flex', alignItems: 'center', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', padding: '9px 18px', fontSize: '0.88rem', fontFamily: 'var(--font-body)', fontWeight: '500', cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s' },
};

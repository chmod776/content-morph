import React, { useState, useRef } from 'react';
import { ArrowRight, ArrowLeft, Check, Upload, Trash2 } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';

const STEPS = ['welcome', 'voice', 'samples', 'done'];
const MIN_VOICE_CHARS = 50;
const MIN_SAMPLE_CHARS = 50;

export default function OnboardingModal({ onComplete, onSkip }) {
  const { updateProfile } = useProfile();
  const [step, setStep]           = useState(0);
  const [voice, setVoice]         = useState('');
  const [samples, setSamples]     = useState(['', '', '']);
  const [saving, setSaving]       = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState(null);
  const fileRefs = [useRef(), useRef(), useRef()];

  const currentStep = STEPS[step];

  const voiceValid   = voice.trim().length >= MIN_VOICE_CHARS;
  const samplesValid = samples.some(s => s.trim().length >= MIN_SAMPLE_CHARS);

  const handleSkipForNow = async () => {
    setSaving(true);
    try { await updateProfile({ onboarded: true }); } catch {}
    setSaving(false);
    onSkip();
  };

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSkipStep = () => setStep(s => s + 1);

  const handleFinish = async () => {
    setSaving(true);
    try {
      await updateProfile({
        brand_voice: voice.trim(),
        writing_samples: samples.filter(s => s.trim().length > 0),
        onboarded: true,
      });
    } catch {}
    setSaving(false);
    onComplete();
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
      const r = await fetch('/api/profile/extract-text', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Upload failed');
      const next = [...samples];
      next[idx] = data.text;
      setSamples(next);
    } catch (err) {
      alert(err.message || 'Failed to extract text');
    } finally {
      setUploadingIdx(null);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Step indicator */}
        <div style={styles.stepBar}>
          {STEPS.map((s, i) => (
            <div key={s} style={{
              ...styles.stepDot,
              backgroundColor: i <= step ? 'var(--text-main)' : 'var(--border-color)',
            }} />
          ))}
        </div>

        {/* ── Welcome ── */}
        {currentStep === 'welcome' && (
          <div style={styles.body}>
            <h2 style={styles.title}>Welcome to Content Morph</h2>
            <p style={styles.desc}>In the next two steps you'll set your brand voice and add a few writing samples. Content Morph will use them to make every generated post sound exactly like you.</p>
            <div style={styles.actions}>
              <button style={styles.skipBtn} onClick={handleSkipForNow} disabled={saving}>
                {saving ? 'Saving…' : 'Skip for now'}
              </button>
              <button style={styles.primaryBtn} onClick={handleNext}>
                Get started <ArrowRight size={16} style={{ marginLeft: '6px' }} />
              </button>
            </div>
          </div>
        )}

        {/* ── Voice ── */}
        {currentStep === 'voice' && (
          <div style={styles.body}>
            <h2 style={styles.title}>Set your voice</h2>
            <p style={styles.desc}>Describe how you want to sound — your tone, style, and personality. This guides every piece of content we generate for you.</p>
            <textarea
              style={styles.textarea}
              placeholder="e.g. Conversational but authoritative. I use short sentences, occasional dry humour, and avoid buzzwords. I like to open with a surprising fact or question."
              value={voice}
              onChange={e => setVoice(e.target.value)}
              rows={6}
              onFocus={e => e.target.style.borderColor = 'var(--text-muted)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
            />
            <div style={styles.charHint}>
              <span style={{ color: voiceValid ? 'var(--text-muted)' : '#e57373' }}>
                {voice.trim().length} / {MIN_VOICE_CHARS} characters minimum
              </span>
            </div>
            <div style={styles.actions}>
              <button style={styles.backBtn} onClick={handleBack}>
                <ArrowLeft size={14} style={{ marginRight: '4px' }} /> Back
              </button>
              <button style={styles.skipBtn} onClick={handleSkipStep}>Skip this step</button>
              <button
                style={{ ...styles.primaryBtn, opacity: voiceValid ? 1 : 0.4, cursor: voiceValid ? 'pointer' : 'not-allowed' }}
                onClick={handleNext}
                disabled={!voiceValid}
              >
                Next <ArrowRight size={16} style={{ marginLeft: '6px' }} />
              </button>
            </div>
          </div>
        )}

        {/* ── Samples ── */}
        {currentStep === 'samples' && (
          <div style={styles.body}>
            <h2 style={styles.title}>Add writing samples</h2>
            <p style={styles.desc}>Paste up to 3 samples of your own writing — blog posts, tweets, emails, anything that sounds like you. Or upload a file (.txt, .md, .pdf, .docx).</p>
            <div style={styles.samplesGrid}>
              {samples.map((s, idx) => (
                <div key={idx} style={styles.sampleBlock}>
                  <div style={styles.sampleHeader}>
                    <span style={styles.sampleLabel}>Sample {idx + 1}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        style={styles.uploadBtn}
                        onClick={() => fileRefs[idx].current.click()}
                        disabled={uploadingIdx === idx}
                      >
                        <Upload size={12} style={{ marginRight: '4px' }} />
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
                          const next = [...samples]; next[idx] = ''; setSamples(next);
                        }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea
                    style={styles.sampleTextarea}
                    placeholder="Paste your writing here…"
                    value={s}
                    onChange={e => { const next = [...samples]; next[idx] = e.target.value; setSamples(next); }}
                    rows={4}
                    onFocus={e => e.target.style.borderColor = 'var(--text-muted)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                  />
                </div>
              ))}
            </div>
            <div style={styles.charHint}>
              <span style={{ color: samplesValid ? 'var(--text-muted)' : '#e57373' }}>
                {samplesValid
                  ? 'Looks good — at least one sample has enough content'
                  : `Add at least ${MIN_SAMPLE_CHARS} characters in one sample to continue`}
              </span>
            </div>
            <div style={styles.actions}>
              <button style={styles.backBtn} onClick={handleBack}>
                <ArrowLeft size={14} style={{ marginRight: '4px' }} /> Back
              </button>
              <button style={styles.skipBtn} onClick={handleSkipStep}>Skip this step</button>
              <button
                style={{ ...styles.primaryBtn, opacity: samplesValid ? 1 : 0.4, cursor: samplesValid ? 'pointer' : 'not-allowed' }}
                onClick={handleNext}
                disabled={!samplesValid}
              >
                Next <ArrowRight size={16} style={{ marginLeft: '6px' }} />
              </button>
            </div>
          </div>
        )}

        {/* ── Done ── */}
        {currentStep === 'done' && (
          <div style={{ ...styles.body, alignItems: 'center', textAlign: 'center' }}>
            <div style={styles.checkCircle}>
              <Check size={28} color="var(--bg-color)" />
            </div>
            <h2 style={styles.title}>You're all set!</h2>
            <p style={styles.desc}>Your voice profile is saved. Every post we generate will be tailored to sound like you. You can update your voice and samples anytime from the <strong style={{ color: 'var(--text-main)' }}>Settings</strong> (gear icon) in the top-right corner.</p>
            <button style={styles.primaryBtn} onClick={handleFinish} disabled={saving}>
              {saving ? 'Saving…' : 'Start morphing'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    backdropFilter: 'blur(4px)',
  },
  modal: {
    backgroundColor: 'var(--panel-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '580px',
    overflow: 'hidden',
  },
  stepBar: {
    display: 'flex',
    gap: '6px',
    padding: '20px 28px 0',
  },
  stepDot: {
    width: '28px',
    height: '4px',
    borderRadius: '2px',
    transition: 'background-color 0.3s',
  },
  body: {
    padding: '28px 32px 32px',
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    margin: '0 0 10px',
    fontSize: '1.55rem',
    fontWeight: '700',
    fontFamily: 'var(--font-heading)',
    color: 'var(--text-main)',
  },
  desc: {
    margin: '0 0 24px',
    fontSize: '0.95rem',
    color: 'var(--text-muted)',
    lineHeight: '1.6',
    fontFamily: 'var(--font-body)',
  },
  textarea: {
    width: '100%',
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-main)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '14px 16px',
    fontSize: '0.92rem',
    lineHeight: '1.6',
    outline: 'none',
    fontFamily: 'var(--font-body)',
    resize: 'vertical',
    transition: 'border-color 0.2s',
    marginBottom: '8px',
    boxSizing: 'border-box',
  },
  charHint: {
    fontSize: '0.78rem',
    fontFamily: 'var(--font-body)',
    marginBottom: '16px',
    minHeight: '18px',
  },
  samplesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginBottom: '8px',
  },
  sampleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  sampleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sampleLabel: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-body)',
  },
  uploadBtn: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    borderRadius: '5px',
    padding: '3px 8px',
    fontSize: '0.75rem',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
  },
  clearSampleBtn: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    borderRadius: '5px',
    padding: '3px 6px',
    cursor: 'pointer',
  },
  sampleTextarea: {
    width: '100%',
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-main)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '0.88rem',
    lineHeight: '1.55',
    outline: 'none',
    fontFamily: 'var(--font-body)',
    resize: 'vertical',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '12px',
    marginTop: '4px',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    fontSize: '0.88rem',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    padding: '6px 14px',
    borderRadius: '7px',
    marginRight: 'auto',
  },
  skipBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '0.88rem',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    padding: '4px 0',
    textDecoration: 'underline',
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--text-main)',
    color: 'var(--bg-color)',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 22px',
    fontSize: '0.95rem',
    fontFamily: 'var(--font-body)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  checkCircle: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: 'var(--text-main)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
};

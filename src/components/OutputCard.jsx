import React, { useState, useMemo } from 'react';
import { Copy, Check, RotateCcw, AlertCircle } from 'lucide-react';
import { platforms } from '../platforms';
import { useTranslation } from '../hooks/useTranslation';

export default function OutputCard({ platformId, output, loading, error, onRetry }) {
  const [copied, setCopied] = useState(false);
  const platform = platforms[platformId];
  const t = useTranslation();

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canShowFooter = !!output && !loading && !error;

  const charInfo = useMemo(() => {
    if (!output || !platform.charLimit) return null;
    if (platform.isThread) {
      const tweets = output.split(/\n\n+/).map(t => t.trim()).filter(t => t.length > 0);
      const maxLen = Math.max(...tweets.map(tw => tw.length));
      const overLimit = tweets.some(tw => tw.length > platform.charLimit);
      return { isThread: true, tweetCount: tweets.length, maxLen, overLimit, limit: platform.charLimit };
    }
    const len = output.length;
    const pct = len / platform.charLimit;
    return { isThread: false, len, limit: platform.charLimit, overLimit: pct > 1, warn: pct >= 0.8 };
  }, [output, platform]);

  const charColor = !charInfo ? 'var(--text-muted)'
    : charInfo.overLimit ? '#dc2626'
    : (!charInfo.isThread && charInfo.warn) ? '#d97706'
    : 'var(--text-muted)';

  return (
    <div style={{ ...styles.card, borderLeftColor: platform.color }}>
      <div style={styles.header}>
        <div style={styles.brand}>
          <h4 style={{ ...styles.title, color: platform.color }}>{platform.name}</h4>
        </div>
        <button
          style={styles.actionBtn}
          onClick={handleCopy}
          disabled={!output || loading}
          title={t.copyToClipboard}
          onMouseEnter={(e) => { if (output && !loading) e.currentTarget.style.opacity = '0.7'; }}
          onMouseLeave={(e) => { if (output && !loading) e.currentTarget.style.opacity = '1'; }}
        >
          {copied ? <Check size={18} color={platform.color} /> : <Copy size={18} color={platform.color} />}
        </button>
      </div>

      <div style={styles.content}>
        {loading && !output && (
          <div style={styles.skeletonContainer}>
            <div style={{...styles.skeletonLine, width: '90%'}}></div>
            <div style={{...styles.skeletonLine, width: '100%'}}></div>
            <div style={{...styles.skeletonLine, width: '80%'}}></div>
            <div style={{...styles.skeletonLine, width: '95%'}}></div>
          </div>
        )}

        {error && (
          <div style={styles.errorContainer}>
            <AlertCircle size={20} color="var(--accent-red)" style={{ marginBottom: '8px' }} />
            <p style={styles.errorText}>{t.generationFailed}</p>
            <button style={styles.retryBtn} onClick={onRetry}>
              <RotateCcw size={14} style={{ marginRight: '6px' }} />
              {t.retry}
            </button>
          </div>
        )}

        {!error && output && (
          <div style={styles.textContent}>
            {output}
            {loading && <span style={styles.cursor} />}
          </div>
        )}

        {!loading && !output && !error && (
          <div style={styles.emptyState}>{t.readyToGenerate}</div>
        )}
      </div>

      {canShowFooter && (
        <div style={styles.footer}>
          <button
            style={styles.regenBtn}
            onClick={onRetry}
            title={t.regeneratePlatform}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--border-color)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <RotateCcw size={13} style={{ marginRight: '6px' }} />
            {t.regenerate}
          </button>

          {charInfo && (
            <span style={{ ...styles.charCounter, color: charColor }}>
              {charInfo.isThread
                ? `${charInfo.tweetCount} tweets · max ${charInfo.maxLen}/${charInfo.limit}`
                : `${charInfo.len} / ${charInfo.limit}`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: 'var(--panel-bg)',
    border: '1px solid var(--border-color)',
    borderLeft: '3px solid',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minHeight: '260px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 32px 16px',
    borderBottom: '1px solid var(--border-color)',
    flexShrink: 0,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  title: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: '700',
    fontFamily: 'var(--font-aesthetic)',
  },
  actionBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    borderRadius: '4px',
    transition: 'opacity 0.15s',
  },
  content: {
    flex: 1,
    padding: '24px 32px',
    overflowY: 'auto',
  },
  skeletonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  skeletonLine: {
    height: '16px',
    backgroundColor: 'var(--border-color)',
    borderRadius: '4px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '4px',
    textAlign: 'center',
  },
  errorText: {
    margin: '0 0 8px',
    color: 'var(--accent-red)',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  retryBtn: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '0.85rem',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
  },
  textContent: {
    color: 'var(--text-main)',
    fontSize: '0.95rem',
    lineHeight: '1.7',
    fontFamily: 'var(--font-body)',
    whiteSpace: 'pre-wrap',
  },
  cursor: {
    display: 'inline-block',
    width: '2px',
    height: '1em',
    backgroundColor: 'var(--text-main)',
    marginLeft: '2px',
    animation: 'blink 0.8s step-end infinite',
    verticalAlign: 'text-bottom',
  },
  emptyState: {
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    fontSize: '1.15rem'
  },
  footer: {
    padding: '12px 32px',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  },
  regenBtn: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-color)',
    borderRadius: '6px',
    padding: '7px 14px',
    fontSize: '0.85rem',
    fontWeight: '600',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  charCounter: {
    fontSize: '0.75rem',
    fontFamily: 'var(--font-body)',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },
};

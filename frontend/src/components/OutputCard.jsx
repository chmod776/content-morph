import React, { useState } from 'react';
import { Copy, Check, RotateCcw, AlertCircle, Send } from 'lucide-react';
import { platforms } from '../platforms';

export default function OutputCard({ platformId, output, loading, error, onRetry, onPublish }) {
  const [copied, setCopied] = useState(false);
  const platform = platforms[platformId];

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ ...styles.card, borderLeftColor: platform.color }} data-testid={`output-card-${platformId}`}>
      <div style={styles.header}>
        <div style={styles.brand}>
          <h4 style={{ ...styles.title, color: platform.color }}>{platform.name}</h4>
        </div>
        <div style={styles.actionRow}>
          {output && !loading && !error && (
            <button
              style={{ ...styles.publishBtn, borderColor: platform.color, color: platform.color }}
              onClick={onPublish}
              title="Publish or schedule this post"
              data-testid={`publish-btn-${platformId}`}
            >
              <Send size={14} style={{ marginRight: '6px' }} />
              Publish
            </button>
          )}
          <button
            style={styles.actionBtn}
            onClick={handleCopy}
            disabled={!output || loading}
            title="Copy to clipboard"
            data-testid={`copy-btn-${platformId}`}
          >
            {copied ? <Check size={18} color={platform.color} /> : <Copy size={18} color={platform.color} />}
          </button>
        </div>
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
            <p style={styles.errorText}>Generation failed</p>
            <button style={styles.retryBtn} onClick={onRetry}>
              <RotateCcw size={14} style={{ marginRight: '6px' }} /> Retry
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
          <div style={styles.emptyState}>Ready to generate</div>
        )}
      </div>
    </div>
  );
}

const styles = {
  card: { backgroundColor: 'var(--panel-bg)', border: 'none', borderLeft: '2px solid', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.2)' },
  brand: { display: 'flex', alignItems: 'center' },
  title: { margin: 0, fontSize: '1.35rem', fontWeight: '600', fontFamily: 'var(--font-aesthetic)', letterSpacing: '-0.02em' },
  actionRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  publishBtn: { display: 'flex', alignItems: 'center', background: 'transparent', border: '1px solid', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.85rem', transition: 'all 0.2s' },
  actionBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex' },
  content: { padding: '32px', flex: 1, overflowY: 'auto', position: 'relative' },
  textContent: { whiteSpace: 'pre-wrap', lineHeight: '1.7', fontSize: '1.15rem', fontFamily: 'var(--font-body)', color: 'var(--text-main)' },
  cursor: { display: 'inline-block', width: '8px', height: '16px', backgroundColor: 'var(--text-main)', marginLeft: '4px', animation: 'blink 1s step-end infinite', verticalAlign: 'middle' },
  skeletonContainer: { display: 'flex', flexDirection: 'column', gap: '14px', padding: '8px 0' },
  skeletonLine: { height: '14px', backgroundColor: 'var(--border-color)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' },
  emptyState: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '1.15rem' },
  errorContainer: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--accent-red)' },
  errorText: { margin: 0, fontWeight: '500', fontSize: '1rem' },
  retryBtn: { marginTop: '16px', display: 'flex', alignItems: 'center', backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.95rem' }
};

import React from 'react';
import { Send } from 'lucide-react';
import OutputCard from './OutputCard';

export default function OutputGrid({ selectedPlatforms, outputs, loadingStates, errors, onRetry, onPublishAll }) {
  if (selectedPlatforms.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>Select at least one platform to see outputs.</p>
      </div>
    );
  }

  const readyCount = selectedPlatforms.filter(id => outputs[id] && !loadingStates[id]).length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Results</h3>
        {readyCount > 0 && (
          <button
            style={styles.publishBtn}
            onClick={onPublishAll}
            title={`Publish to all ${readyCount} ready platforms`}
          >
            <Send size={14} style={{ marginRight: '7px' }} />
            Publish to all ({readyCount})
          </button>
        )}
      </div>
      <div style={styles.grid}>
        {selectedPlatforms.map(platformId => (
          <OutputCard
            key={platformId}
            platformId={platformId}
            output={outputs[platformId] || ''}
            loading={loadingStates[platformId] || false}
            error={errors[platformId] || null}
            onRetry={() => onRetry(platformId)}
          />
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '32px',
    flex: 1,
    minHeight: '400px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'var(--text-main)'
  },
  publishBtn: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--text-main)',
    color: 'var(--bg-color)',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    fontWeight: '600',
    fontSize: '0.95rem',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '32px'
  },
  emptyState: {
    padding: '64px 32px',
    textAlign: 'center',
    color: 'var(--text-muted)'
  }
};

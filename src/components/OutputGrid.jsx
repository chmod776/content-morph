import React from 'react';
import OutputCard from './OutputCard';

export default function OutputGrid({ selectedPlatforms, outputs, loadingStates, errors, onRetry }) {
  if (selectedPlatforms.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>Select at least one platform to see outputs.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Results</h3>
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
  title: {
    margin: '0 0 24px 0',
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'var(--text-main)'
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

import React from 'react';
import OutputCard from './OutputCard';
import { useTranslation } from '../hooks/useTranslation';

export default function OutputGrid({ selectedPlatforms, outputs, loadingStates, errors, onRetry }) {
  const t = useTranslation();

  if (selectedPlatforms.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>{t.noPlatforms}</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>{t.results}</h3>
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

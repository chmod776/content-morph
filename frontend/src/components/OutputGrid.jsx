import React from 'react';
import { Send } from 'lucide-react';
import OutputCard from './OutputCard';

export default function OutputGrid({ selectedPlatforms, outputs, loadingStates, errors, onRetry, onPublish, onPublishAll }) {
  if (selectedPlatforms.length === 0) {
    return <div style={styles.emptyState}><p>Select at least one platform to see outputs.</p></div>;
  }
  const eligibleCount = selectedPlatforms.filter(p => outputs[p]?.trim()).length;
  const anyLoading = selectedPlatforms.some(p => loadingStates[p]);
  return (
    <div style={styles.container}>
      <div style={styles.titleRow}>
        <h3 style={styles.title}>Results</h3>
        {eligibleCount >= 2 && !anyLoading && (
          <button style={styles.publishAllBtn} onClick={onPublishAll} data-testid="publish-all-btn">
            <Send size={14} style={{ marginRight: 6 }} />
            Publish to all ({eligibleCount})
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
            onPublish={() => onPublish(platformId)}
          />
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '32px', flex: 1, minHeight: '400px' },
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { margin: 0, fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)' },
  publishAllBtn: { display: 'inline-flex', alignItems: 'center', background: 'var(--text-main)', color: 'var(--bg-color)', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: '600', fontSize: '0.92rem', transition: 'transform 0.15s ease' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '32px' },
  emptyState: { padding: '64px 32px', textAlign: 'center', color: 'var(--text-muted)' }
};

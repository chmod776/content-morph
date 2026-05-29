import React from 'react';
import { platforms } from '../platforms';
import { useTranslation } from '../hooks/useTranslation';

export default function PlatformSelector({ selectedPlatforms, togglePlatform, isGenerating }) {
  const t = useTranslation();

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>{t.targetPlatforms}</h3>
      <div style={styles.grid}>
        {Object.values(platforms).map(platform => {
          const isSelected = selectedPlatforms.includes(platform.id);
          return (
            <button
              key={platform.id}
              onClick={() => togglePlatform(platform.id)}
              disabled={isGenerating}
              style={{
                ...styles.button,
                borderColor: isSelected ? platform.color : 'var(--border-color)',
                backgroundColor: isSelected ? platform.color : 'transparent',
                color: isSelected ? (platform.id === 'twitter' ? '#ffffff' : '#0d0d0d') : 'var(--text-main)',
                opacity: isGenerating ? 0.6 : 1,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                transform: 'scale(1)'
              }}
              onMouseEnter={(e) => {
                if (!isGenerating) e.currentTarget.style.transform = 'scale(1.03)';
              }}
              onMouseLeave={(e) => {
                if (!isGenerating) e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <span style={{ fontWeight: isSelected ? '600' : '400' }}>
                {platform.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px 32px',
    borderBottom: '1px solid var(--border-color)'
  },
  title: {
    margin: '0 0 16px 0',
    fontSize: '1.3rem',
    fontWeight: '600',
    color: 'var(--text-main)'
  },
  grid: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap'
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 24px',
    borderRadius: '30px',
    border: '1px solid',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    outline: 'none',
    fontFamily: 'var(--font-body)',
    fontSize: '1.15rem'
  }
};

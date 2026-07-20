import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import LandingPage from './components/LandingPage.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ProfileProvider } from './context/ProfileContext.jsx';
import './index.css';

function Root() {
  const { isAuthenticated, loading, login } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-color)',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-body)',
        fontSize: '1rem',
      }}>
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage onLogin={login} />;
  }

  return (
    <ProfileProvider>
      <App />
    </ProfileProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SettingsProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SettingsProvider>
  </React.StrictMode>
);

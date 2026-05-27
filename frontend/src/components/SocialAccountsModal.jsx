import React, { useState, useEffect, useCallback } from 'react';
import { X, Twitter, Linkedin, Instagram, Youtube, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../supabaseClient';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PLATFORM_META = {
  twitter:   { name: 'Twitter / X', Icon: Twitter,   color: 'var(--accent-twitter)' },
  linkedin:  { name: 'LinkedIn',    Icon: Linkedin,  color: 'var(--accent-linkedin)' },
  instagram: { name: 'Instagram',   Icon: Instagram, color: 'var(--accent-instagram)' },
  youtube:   { name: 'YouTube',     Icon: Youtube,   color: 'var(--accent-youtube)' },
};

export default function SocialAccountsModal({ session, onClose }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);

  const authHeader = useCallback(() => ({
    'Authorization': `Bearer ${session?.access_token || ''}`,
    'Content-Type': 'application/json'
  }), [session]);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/social/accounts`, { headers: authHeader() });
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleConnect = async (platform) => {
    setConnecting(platform);
    try {
      const res = await fetch(`${API}/social/oauth/${platform}/start`, { headers: authHeader() });
      const data = await res.json();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      } else if (data.demo) {
        // Demo connect for platforms without configured OAuth
        await fetch(`${API}/social/accounts/demo-connect`, {
          method: 'POST',
          headers: authHeader(),
          body: JSON.stringify({ platform })
        });
        await fetchAccounts();
        setConnecting(null);
      } else {
        alert(data.error || 'Connection failed');
        setConnecting(null);
      }
    } catch (e) {
      console.error(e);
      setConnecting(null);
    }
  };

  const handleDisconnect = async (platform) => {
    if (!window.confirm(`Disconnect ${PLATFORM_META[platform]?.name}?`)) return;
    try {
      await fetch(`${API}/social/accounts/${platform}`, { method: 'DELETE', headers: authHeader() });
      fetchAccounts();
    } catch (e) {
      console.error(e);
    }
  };

  const isConnected = (p) => accounts.some(a => a.platform === p);
  const getAccount = (p) => accounts.find(a => a.platform === p);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()} data-testid="social-accounts-modal">
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Connected Accounts</h2>
            <p style={styles.subtitle}>Link your social profiles to publish content directly.</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}><X size={24} /></button>
        </div>

        {loading ? (
          <div style={styles.loading}>Loading accounts...</div>
        ) : (
          <div style={styles.list}>
            {Object.entries(PLATFORM_META).map(([key, meta]) => {
              const connected = isConnected(key);
              const acc = getAccount(key);
              const { Icon } = meta;
              return (
                <div key={key} style={styles.row} data-testid={`account-row-${key}`}>
                  <div style={styles.platformInfo}>
                    <div style={{ ...styles.iconWrapper, color: meta.color, borderColor: connected ? meta.color : 'var(--border-color)' }}>
                      <Icon size={22} />
                    </div>
                    <div>
                      <div style={styles.platformName}>{meta.name}</div>
                      <div style={styles.platformStatus}>
                        {connected ? (
                          <><CheckCircle2 size={12} color="var(--accent-green)" style={{ marginRight: 4 }} /> Connected as <strong style={{ color: 'var(--text-main)', marginLeft: 4 }}>{acc.account_name}</strong></>
                        ) : (
                          <><AlertCircle size={12} style={{ marginRight: 4 }} /> Not connected</>
                        )}
                      </div>
                    </div>
                  </div>
                  {connected ? (
                    <button style={styles.disconnectBtn} onClick={() => handleDisconnect(key)} data-testid={`disconnect-${key}`}>Disconnect</button>
                  ) : (
                    <button style={{ ...styles.connectBtn, borderColor: meta.color, color: meta.color }} onClick={() => handleConnect(key)} disabled={connecting === key} data-testid={`connect-${key}`}>
                      {connecting === key ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Connect'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={styles.footer}>
          <p style={styles.helpText}>
            Note: OAuth credentials must be configured by the app owner in the backend environment for production posting. Until then, connecting uses a demo mode so you can try the flow end to end.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '560px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { margin: '0 0 6px 0', fontFamily: 'var(--font-heading)', fontSize: '1.8rem' },
  subtitle: { margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' },
  loading: { padding: '40px', textAlign: 'center', color: 'var(--text-muted)' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px' },
  platformInfo: { display: 'flex', alignItems: 'center', gap: '14px' },
  iconWrapper: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '10px', border: '1px solid' },
  platformName: { fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-main)' },
  platformStatus: { display: 'flex', alignItems: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' },
  connectBtn: { background: 'transparent', border: '1px solid', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.9rem', minWidth: '90px', display: 'flex', justifyContent: 'center' },
  disconnectBtn: { background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.9rem' },
  footer: { marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' },
  helpText: { margin: 0, color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.5 }
};

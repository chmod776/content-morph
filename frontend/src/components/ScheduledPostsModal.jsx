import React, { useState, useEffect, useCallback } from 'react';
import { X, Trash2, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { platforms } from '../platforms';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ScheduledPostsModal({ session, onClose }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const authHeader = useCallback(() => ({
    'Authorization': `Bearer ${session?.access_token || ''}`,
    'Content-Type': 'application/json'
  }), [session]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/social/scheduled`, { headers: authHeader() });
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [authHeader]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleDelete = async (id) => {
    if (!window.confirm('Cancel this scheduled post?')) return;
    await fetch(`${API}/social/scheduled/${id}`, { method: 'DELETE', headers: authHeader() });
    fetchPosts();
  };

  const fmt = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const statusBadge = (status) => {
    const map = {
      pending:   { bg: 'rgba(139,139,139,0.12)', color: 'var(--text-muted)',   label: 'Pending',   Icon: Clock },
      posted:    { bg: 'rgba(74,222,128,0.12)',  color: 'var(--accent-green)', label: 'Posted',    Icon: CheckCircle2 },
      failed:    { bg: 'rgba(204,68,68,0.12)',   color: 'var(--accent-red)',   label: 'Failed',    Icon: AlertCircle },
      cancelled: { bg: 'rgba(139,139,139,0.12)', color: 'var(--text-muted)',   label: 'Cancelled', Icon: X }
    };
    const s = map[status] || map.pending;
    const { Icon } = s;
    return (
      <span style={{ ...styles.badge, backgroundColor: s.bg, color: s.color }}>
        <Icon size={11} style={{ marginRight: 4 }} /> {s.label}
      </span>
    );
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()} data-testid="scheduled-modal">
        <div style={styles.header}>
          <h2 style={styles.title}>Scheduled Posts</h2>
          <button style={styles.closeBtn} onClick={onClose}><X size={24} /></button>
        </div>

        {loading ? (
          <div style={styles.empty}>Loading...</div>
        ) : posts.length === 0 ? (
          <div style={styles.empty}>
            <Clock size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>No scheduled posts yet.</p>
          </div>
        ) : (
          <div style={styles.list}>
            {posts.map(p => {
              const platform = platforms[p.platform];
              return (
                <div key={p.id} style={styles.postRow} data-testid={`scheduled-${p.id}`}>
                  <div style={styles.rowTop}>
                    <span style={{ ...styles.platformTag, color: platform?.color || 'var(--text-main)' }}>
                      {platform?.name || p.platform}
                    </span>
                    {statusBadge(p.status)}
                    <span style={styles.timeText}>{fmt(p.scheduled_at)}</span>
                    {p.status === 'pending' && (
                      <button style={styles.deleteBtn} onClick={() => handleDelete(p.id)} title="Cancel" data-testid={`cancel-scheduled-${p.id}`}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <p style={styles.contentPreview}>{p.content}</p>
                  {p.error && <p style={styles.errText}>Error: {p.error}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '620px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { margin: 0, fontFamily: 'var(--font-heading)', fontSize: '2rem' },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' },
  list: { overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' },
  postRow: { padding: '14px', border: '1px solid var(--border-color)', borderRadius: '12px' },
  rowTop: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' },
  platformTag: { fontFamily: 'var(--font-aesthetic)', fontWeight: 600, fontSize: '0.95rem' },
  badge: { display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' },
  timeText: { fontSize: '0.82rem', color: 'var(--text-muted)', marginLeft: 'auto' },
  deleteBtn: { background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '5px', borderRadius: '6px', cursor: 'pointer', display: 'flex' },
  contentPreview: { margin: 0, color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: '80px', overflow: 'hidden' },
  errText: { margin: '6px 0 0 0', fontSize: '0.78rem', color: 'var(--accent-red)' }
};

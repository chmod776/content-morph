import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Trash2, Clock } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function SavedSessions({ session, onLoad, onClose }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    if (!session) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('saved_sessions').select('*').eq('user_id', session.user.id)
      .order('created_at', { ascending: false }).limit(20);
    if (!error) setSessions(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); /* eslint-disable-next-line */ }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    await supabase.from('saved_sessions').delete().eq('id', id);
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Saved Sessions</h2>
          <button style={styles.closeBtn} onClick={onClose}><X size={24} /></button>
        </div>
        {loading ? (
          <div style={styles.emptyState}><p style={{ color: 'var(--text-muted)' }}>Loading...</p></div>
        ) : sessions.length === 0 ? (
          <div style={styles.emptyState}>
            <Clock size={32} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No saved sessions yet.</p>
          </div>
        ) : (
          <div style={styles.list}>
            {sessions.map(s => (
              <div key={s.id} style={styles.sessionRow} onClick={() => onLoad(s)}
                   onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'}
                   onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <div style={styles.sessionInfo}>
                  <p style={styles.sessionTitle}>{s.title || 'Untitled session'}</p>
                  <div style={styles.sessionMeta}>
                    <span style={styles.metaTag}>{(s.selected_platforms || []).join(', ')}</span>
                    <span style={styles.metaDot}>·</span>
                    <span style={styles.metaDate}>{formatDate(s.created_at)}</span>
                  </div>
                </div>
                <div style={styles.rowActions}>
                  <button style={styles.iconAction} onClick={() => onLoad(s)} title="Load"><RotateCcw size={15} /></button>
                  <button style={styles.iconAction} onClick={(e) => handleDelete(s.id, e)} title="Delete"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '580px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { margin: 0, fontFamily: 'var(--font-heading)', fontSize: '2rem' },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' },
  emptyState: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', textAlign: 'center' },
  list: { overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
  sessionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 12px', borderRadius: '10px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' },
  sessionInfo: { flex: 1, minWidth: 0 },
  sessionTitle: { margin: '0 0 4px 0', fontSize: '1rem', color: 'var(--text-main)', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sessionMeta: { display: 'flex', alignItems: 'center', gap: '6px' },
  metaTag: { fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'capitalize' },
  metaDot: { color: 'var(--border-color)', fontSize: '0.78rem' },
  metaDate: { fontSize: '0.78rem', color: 'var(--text-muted)' },
  rowActions: { display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '12px' },
  iconAction: { background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }
};

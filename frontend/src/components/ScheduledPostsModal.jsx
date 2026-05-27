import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Trash2, Clock, CheckCircle2, AlertCircle, List, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { platforms } from '../platforms';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STATUS_META = {
  pending:   { bg: 'rgba(139,139,139,0.12)', color: 'var(--text-muted)',   label: 'Pending',   Icon: Clock },
  posted:    { bg: 'rgba(74,222,128,0.12)',  color: 'var(--accent-green)', label: 'Posted',    Icon: CheckCircle2 },
  failed:    { bg: 'rgba(204,68,68,0.12)',   color: 'var(--accent-red)',   label: 'Failed',    Icon: AlertCircle },
  cancelled: { bg: 'rgba(139,139,139,0.12)', color: 'var(--text-muted)',   label: 'Cancelled', Icon: X }
};

export default function ScheduledPostsModal({ session, onClose }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('calendar'); // 'list' | 'calendar'
  const [cursor, setCursor] = useState(new Date()); // viewed month
  const [selectedPost, setSelectedPost] = useState(null);

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

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Cancel this scheduled post?')) return;
    await fetch(`${API}/social/scheduled/${id}`, { method: 'DELETE', headers: authHeader() });
    setSelectedPost(null);
    fetchPosts();
  };

  // ---- Calendar grid ----
  const calendar = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startWeekday = firstOfMonth.getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    // Leading blanks from prev month (we still render them as dim)
    for (let i = 0; i < startWeekday; i++) {
      const d = new Date(year, month, -startWeekday + i + 1);
      cells.push({ date: d, inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), inMonth: true });
    }
    // Trailing blanks to fill last row
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date;
      cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
    }
    return cells;
  }, [cursor]);

  // Group posts by YYYY-MM-DD (local)
  const postsByDay = useMemo(() => {
    const map = {};
    for (const p of posts) {
      const d = new Date(p.scheduled_at);
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      (map[k] ||= []).push(p);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    }
    return map;
  }, [posts]);

  const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const todayKey = keyOf(new Date());
  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const fmtFull = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
                          ' · ' + new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const StatusBadge = ({ status }) => {
    const s = STATUS_META[status] || STATUS_META.pending;
    const { Icon } = s;
    return (
      <span style={{ ...styles.badge, backgroundColor: s.bg, color: s.color }}>
        <Icon size={11} style={{ marginRight: 4 }} /> {s.label}
      </span>
    );
  };

  const renderListView = () => (
    posts.length === 0 ? (
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
                <StatusBadge status={p.status} />
                <span style={styles.timeText}>{fmtFull(p.scheduled_at)}</span>
                {p.status === 'pending' && (
                  <button style={styles.deleteBtn} onClick={(e) => handleDelete(p.id, e)} title="Cancel" data-testid={`cancel-scheduled-${p.id}`}>
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
    )
  );

  const renderCalendarView = () => (
    <div style={styles.calendar} data-testid="calendar-view">
      <div style={styles.calendarHeader}>
        <button style={styles.navBtn} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} data-testid="cal-prev">
          <ChevronLeft size={16} />
        </button>
        <div style={styles.monthLabel}>{monthLabel}</div>
        <button style={styles.navBtn} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} data-testid="cal-next">
          <ChevronRight size={16} />
        </button>
        <button style={styles.todayBtn} onClick={() => setCursor(new Date())} data-testid="cal-today">Today</button>
      </div>

      <div style={styles.weekdayRow}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(w => (
          <div key={w} style={styles.weekdayCell}>{w}</div>
        ))}
      </div>

      <div style={styles.grid}>
        {calendar.map(({ date, inMonth }, idx) => {
          const k = keyOf(date);
          const dayPosts = postsByDay[k] || [];
          const isToday = k === todayKey;
          return (
            <div
              key={idx}
              style={{
                ...styles.dayCell,
                opacity: inMonth ? 1 : 0.35,
                borderColor: isToday ? 'var(--text-main)' : 'var(--border-color)',
              }}
              data-testid={`day-${k}`}
            >
              <div style={styles.dayNumber}>{date.getDate()}</div>
              <div style={styles.dayChips}>
                {dayPosts.slice(0, 4).map(post => {
                  const meta = platforms[post.platform];
                  const dim = post.status === 'cancelled' || post.status === 'failed';
                  return (
                    <button
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      style={{
                        ...styles.chip,
                        borderLeftColor: meta?.color || 'var(--text-muted)',
                        opacity: dim ? 0.5 : 1,
                        textDecoration: post.status === 'cancelled' ? 'line-through' : 'none',
                      }}
                      title={`${meta?.name || post.platform} · ${fmtTime(post.scheduled_at)}\n${post.content.slice(0, 100)}`}
                      data-testid={`chip-${post.id}`}
                    >
                      <span style={styles.chipTime}>{fmtTime(post.scheduled_at)}</span>
                      <span style={styles.chipText}>{post.content.slice(0, 28)}</span>
                    </button>
                  );
                })}
                {dayPosts.length > 4 && (
                  <button style={styles.moreChip} onClick={() => setSelectedPost(dayPosts[0])}>+{dayPosts.length - 4} more</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        {Object.entries(platforms).map(([key, p]) => (
          <span key={key} style={styles.legendItem}>
            <span style={{ ...styles.legendDot, backgroundColor: p.color }}></span>
            {p.name}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()} data-testid="scheduled-modal">
        <div style={styles.header}>
          <h2 style={styles.title}>Scheduled Posts</h2>
          <div style={styles.headerActions}>
            <div style={styles.viewToggle}>
              <button
                style={{ ...styles.toggleBtn, ...(view === 'calendar' ? styles.toggleBtnActive : {}) }}
                onClick={() => setView('calendar')}
                data-testid="view-calendar"
              >
                <CalendarDays size={14} style={{ marginRight: 5 }} /> Calendar
              </button>
              <button
                style={{ ...styles.toggleBtn, ...(view === 'list' ? styles.toggleBtnActive : {}) }}
                onClick={() => setView('list')}
                data-testid="view-list"
              >
                <List size={14} style={{ marginRight: 5 }} /> List
              </button>
            </div>
            <button style={styles.closeBtn} onClick={onClose}><X size={24} /></button>
          </div>
        </div>

        {loading ? (
          <div style={styles.empty}>Loading...</div>
        ) : view === 'list' ? renderListView() : renderCalendarView()}

        {selectedPost && (
          <div style={styles.detailOverlay} onClick={() => setSelectedPost(null)}>
            <div style={styles.detailCard} onClick={e => e.stopPropagation()} data-testid="post-detail">
              <div style={styles.detailHeader}>
                <span style={{ ...styles.platformTag, color: platforms[selectedPost.platform]?.color || 'var(--text-main)' }}>
                  {platforms[selectedPost.platform]?.name || selectedPost.platform}
                </span>
                <StatusBadge status={selectedPost.status} />
                <button style={styles.closeBtn} onClick={() => setSelectedPost(null)}><X size={18} /></button>
              </div>
              <div style={styles.detailTime}>{fmtFull(selectedPost.scheduled_at)}</div>
              <p style={styles.detailContent}>{selectedPost.content}</p>
              {selectedPost.media_url && (
                <div style={styles.detailMedia}>
                  {selectedPost.media_type === 'image' ? (
                    <img src={selectedPost.media_url} alt="" style={styles.detailMediaImg} />
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>📹 Video attachment</span>
                  )}
                </div>
              )}
              {selectedPost.error && <p style={styles.errText}>Error: {selectedPost.error}</p>}
              {selectedPost.status === 'pending' && (
                <div style={styles.detailActions}>
                  <button style={styles.cancelPostBtn} onClick={() => handleDelete(selectedPost.id)} data-testid="detail-cancel-btn">
                    <Trash2 size={14} style={{ marginRight: 6 }} /> Cancel post
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' },
  modal: { backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '900px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px' },
  title: { margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.8rem' },
  headerActions: { display: 'flex', alignItems: 'center', gap: '12px' },
  viewToggle: { display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border-color)' },
  toggleBtn: { display: 'inline-flex', alignItems: 'center', background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.82rem' },
  toggleBtnActive: { background: 'var(--text-main)', color: 'var(--bg-color)' },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', minHeight: '200px' },
  // List view
  list: { overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' },
  postRow: { padding: '14px', border: '1px solid var(--border-color)', borderRadius: '12px' },
  rowTop: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' },
  platformTag: { fontFamily: 'var(--font-aesthetic)', fontWeight: 600, fontSize: '0.95rem' },
  badge: { display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' },
  timeText: { fontSize: '0.82rem', color: 'var(--text-muted)', marginLeft: 'auto' },
  deleteBtn: { background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '5px', borderRadius: '6px', cursor: 'pointer', display: 'flex' },
  contentPreview: { margin: 0, color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: '80px', overflow: 'hidden' },
  errText: { margin: '6px 0 0 0', fontSize: '0.78rem', color: 'var(--accent-red)' },
  // Calendar view
  calendar: { display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' },
  calendarHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' },
  navBtn: { background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex' },
  monthLabel: { fontFamily: 'var(--font-heading)', fontSize: '1.3rem', color: 'var(--text-main)', minWidth: '180px' },
  todayBtn: { background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.82rem', marginLeft: 'auto' },
  weekdayRow: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '6px' },
  weekdayCell: { textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' },
  dayCell: { minHeight: '90px', border: '1px solid', borderRadius: '8px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: 'rgba(255,255,255,0.015)' },
  dayNumber: { fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 },
  dayChips: { display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden' },
  chip: { display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.04)', borderLeft: '2px solid', border: '1px solid var(--border-color)', borderLeftWidth: '2px', borderRadius: '4px', padding: '3px 6px', cursor: 'pointer', textAlign: 'left', overflow: 'hidden' },
  chipTime: { fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', flexShrink: 0 },
  chipText: { fontSize: '0.72rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)' },
  moreChip: { background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.7rem', padding: '2px 4px', cursor: 'pointer', textAlign: 'left' },
  legend: { display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', justifyContent: 'center' },
  legendItem: { display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' },
  legendDot: { width: '10px', height: '10px', borderRadius: '50%' },
  // Detail popover
  detailOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', borderRadius: '16px' },
  detailCard: { background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px', width: '90%', maxWidth: '440px', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' },
  detailHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' },
  detailTime: { fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '12px' },
  detailContent: { whiteSpace: 'pre-wrap', color: 'var(--text-main)', fontSize: '0.92rem', lineHeight: 1.5, margin: 0, maxHeight: '220px', overflowY: 'auto' },
  detailMedia: { marginTop: '12px' },
  detailMediaImg: { maxWidth: '100%', maxHeight: '160px', borderRadius: '8px', display: 'block' },
  detailActions: { display: 'flex', justifyContent: 'flex-end', marginTop: '16px' },
  cancelPostBtn: { display: 'inline-flex', alignItems: 'center', background: 'transparent', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.88rem' }
};

import { useMemo, useRef, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Plus,
  FolderKanban,
  FileText,
} from 'lucide-react';
import { Avatar } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/projects', label: 'Projects' },
  { to: '/tasks', label: 'My Tasks' },
  { to: '/daily-tasks', label: 'Daily Tasks' },
  { to: '/sprints', label: 'Sprints' },
  { to: '/leaves', label: 'Leaves' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/reports', label: 'Reports', managementOnly: true },
  { to: '/admin/users', label: 'Users', managementOnly: true },
  { to: '/profile', label: 'Profile' },
];

function normalizeNotificationLink(link = '') {
  if (!link) return '/dashboard';
  if (link.startsWith('/tasks/')) {
    const taskId = link.split('/')[2];
    return taskId ? `/tasks?taskId=${taskId}` : '/tasks';
  }
  if (link.startsWith('/leaves/')) return '/leaves';
  if (link.startsWith('/admin/leaves')) return '/leaves';
  return link;
}

export default function DashboardTopbar() {
  const navigate = useNavigate();
  const { user, isHROrAbove } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  const searchRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const onClickAway = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  const visibleLinks = useMemo(() => {
    return NAV_LINKS.filter((item) => !item.managementOnly || isHROrAbove);
  }, [isHROrAbove]);

  const searchHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return visibleLinks.filter((item) => item.label.toLowerCase().includes(q));
  }, [query, visibleLinks]);

  const handleNotificationClick = async (item) => {
    if (!item?.isRead) {
      try { await markRead(item._id); } catch { /* ignore */ }
    }
    setShowNotifs(false);
    navigate(normalizeNotificationLink(item?.link));
  };

  /* ── shared button style ── */
  const btnBase = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    height: 38,
    padding: '0 12px',
    borderRadius: 10,
    border: '1px solid #E2E8F0',
    background: '#FFFFFF',
    color: '#111827',           /* black text / icons */
    textDecoration: 'none',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  };

  const iconBtnBase = {
    width: 38,
    height: 38,
    borderRadius: 10,
    border: '1px solid #E2E8F0',
    background: '#FFFFFF',
    color: '#111827',           /* black icon */
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        padding: '12px 20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        {/* ── Search ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
          <div ref={searchRef} style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 620 }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                top: '50%',
                left: 12,
                transform: 'translateY(-50%)',
                color: '#94A3B8',
                pointerEvents: 'none',
              }}
            />
            <input
              value={query}
              onFocus={() => setShowResults(true)}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages, reports, tasks..."
              style={{
                width: '100%',
                height: 40,
                borderRadius: 12,
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                padding: '0 12px 0 36px',
                fontSize: 13,
                outline: 'none',
                color: '#0F172A',
              }}
            />
            {showResults && query.trim() && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  right: 0,
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  boxShadow: '0 12px 30px rgba(15,23,42,0.12)',
                  overflow: 'hidden',
                  zIndex: 50,
                }}
              >
                {searchHits.length === 0 ? (
                  <p style={{ margin: 0, padding: '10px 12px', fontSize: 12, color: '#94A3B8' }}>No matching pages</p>
                ) : (
                  searchHits.slice(0, 6).map((item) => (
                    <button
                      key={item.to}
                      onClick={() => { setQuery(''); setShowResults(false); navigate(item.to); }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        border: 'none',
                        background: '#FFFFFF',
                        cursor: 'pointer',
                        padding: '9px 12px',
                        color: '#334155',
                        fontSize: 12,
                      }}
                    >
                      {item.label}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/tasks"    style={btnBase}><Plus size={13} /> New Task</Link>
          <Link to="/projects" style={btnBase}><FolderKanban size={13} /> Projects</Link>
          {isHROrAbove && (
            <Link to="/reports" style={btnBase}><FileText size={13} /> Reports</Link>
          )}

          {/* ── Notifications ── */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button onClick={() => setShowNotifs((s) => !s)} style={iconBtnBase}>
              <Bell size={15} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 999,
                    background: '#111827',   /* black badge */
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 44,
                  width: 340,
                  maxWidth: 'min(340px, calc(100vw - 24px))',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: '0 20px 48px rgba(15,23,42,0.18)',
                  zIndex: 50,
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Bell size={14} style={{ color: '#2563EB' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <span style={{ background: '#2563EB', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999 }}>
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={markAllRead}
                    style={{ border: 'none', background: 'transparent', color: '#2563EB', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '3px 6px', borderRadius: 6 }}
                  >
                    Mark all read
                  </button>
                </div>
                {/* List */}
                <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '28px 0', color: '#94A3B8' }}>
                      <Bell size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                      <p style={{ margin: 0, fontSize: 12 }}>No notifications yet</p>
                    </div>
                  ) : (
                    [...notifications]
                      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                      .slice(0, 12)
                      .map((item) => {
                        const diff = Date.now() - new Date(item.createdAt).getTime();
                        const relTime = diff < 60000 ? 'Just now'
                          : diff < 3600000 ? `${Math.floor(diff / 60000)}m ago`
                          : diff < 86400000 ? `${Math.floor(diff / 3600000)}h ago`
                          : diff < 172800000 ? 'Yesterday'
                          : new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        return (
                          <button
                            key={item._id}
                            onClick={() => handleNotificationClick(item)}
                            style={{
                              width: '100%', textAlign: 'left', border: 'none',
                              background: item.isRead ? '#FFFFFF' : '#EFF6FF',
                              color: '#334155', padding: '10px 14px',
                              borderBottom: '1px solid #F8FAFC',
                              cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10,
                              transition: 'background 0.12s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = item.isRead ? '#F8FAFC' : '#DBEAFE'}
                            onMouseLeave={e => e.currentTarget.style.background = item.isRead ? '#FFFFFF' : '#EFF6FF'}
                          >
                            {/* Unread dot */}
                            <span style={{
                              width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                              background: item.isRead ? '#E2E8F0' : '#2563EB',
                            }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 12, fontWeight: item.isRead ? 400 : 600, color: '#0F172A', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {item.message}
                              </p>
                              <span style={{ fontSize: 10, color: '#94A3B8', marginTop: 3, display: 'block' }}>{relTime}</span>
                            </div>
                          </button>
                        );
                      })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Avatar / profile ── */}
          <Link
            to="/profile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 38,
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: '0 10px',
              textDecoration: 'none',
              color: '#0F172A',
            }}
          >
            <Avatar name={user?.name} size="sm" />
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          </Link>

        </div>
      </div>
    </header>
  );
}

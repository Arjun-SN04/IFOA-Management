import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Bell, Plus, FolderKanban, FileText,
  CheckSquare, Folder, X, Trash2, CheckCheck,
  AlertCircle, Clock, CheckCircle2, Info, Megaphone,
  ChevronRight, Filter, Menu,
} from 'lucide-react';
import { Avatar } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { taskAPI, projectAPI } from '../../api';

const NAV_LINKS = [
  { to: '/dashboard',    label: 'Dashboard',    icon: null },
  { to: '/projects',     label: 'Projects',     icon: null },
  { to: '/tasks',        label: 'My Tasks',     icon: null },
  { to: '/daily-tasks',  label: 'Daily Tasks',  icon: null },
  { to: '/sprints',      label: 'Sprints',      icon: null },
  { to: '/leaves',       label: 'Leaves',       icon: null },
  { to: '/announcements',label: 'Announcements',icon: null },
  { to: '/reports',      label: 'Reports',      icon: null, managementOnly: true },
  { to: '/admin/users',  label: 'Users',        icon: null, managementOnly: true },
  { to: '/profile',      label: 'Profile',      icon: null },
];

// Notification type → icon + color
const NOTIF_META = {
  task_assigned:   { icon: CheckSquare,  color: '#2563eb' },
  leave_applied:   { icon: Clock,        color: '#d97706' },
  leave_approved:  { icon: CheckCircle2, color: '#059669' },
  leave_rejected:  { icon: AlertCircle,  color: '#dc2626' },
  sprint_started:  { icon: Info,         color: '#7c3aed' },
  sprint_ended:    { icon: CheckCircle2, color: '#059669' },
  announcement:    { icon: Megaphone,    color: '#ea580c' },
};

function relTime(date) {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60000)     return 'Just now';
  if (diff < 3600000)   return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000)  return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 172800000) return 'Yesterday';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupByDay(items) {
  const today     = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1);
  const groups    = { Today: [], Yesterday: [], Earlier: [] };
  items.forEach(n => {
    const d = new Date(n.createdAt); d.setHours(0,0,0,0);
    if (d >= today)     groups.Today.push(n);
    else if (d >= yesterday) groups.Yesterday.push(n);
    else                groups.Earlier.push(n);
  });
  return groups;
}

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

export default function DashboardTopbar({ isMobile, onToggleSidebar }) {
  const navigate = useNavigate();
  const { user, isHROrAbove } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead, deleteNotif, clearAllNotifs } = useNotifications();

  // ── Search state ──────────────────────────────────────────────────────────────
  const [query, setQuery]           = useState('');
  const [searchResults, setSearchResults] = useState({ pages: [], tasks: [], projects: [] });
  const [searching, setSearching]   = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);
  const searchTimer = useRef(null);

  // ── Notification state ────────────────────────────────────────────────────────
  const [showNotifs, setShowNotifs]     = useState(false);
  const [notifFilter, setNotifFilter]   = useState('all'); // 'all' | 'unread'
  const notifRef = useRef(null);

  const visibleLinks = useMemo(
    () => NAV_LINKS.filter(item => !item.managementOnly || isHROrAbove),
    [isHROrAbove]
  );

  // ── Debounced search ──────────────────────────────────────────────────────────
  const runSearch = useCallback(async (q) => {
    const trimmed = q.trim();
    if (!trimmed) { setSearchResults({ pages: [], tasks: [], projects: [] }); return; }
    setSearching(true);
    try {
      const pageHits = visibleLinks.filter(l => l.label.toLowerCase().includes(trimmed.toLowerCase()));
      const [taskRes, projRes] = await Promise.allSettled([
        taskAPI.getAll({ search: trimmed, limit: 5 }),
        projectAPI.getAll({ search: trimmed }),
      ]);
      const tasks    = taskRes.status === 'fulfilled'
        ? (taskRes.value?.data?.tasks || taskRes.value?.data?.data || []).slice(0, 5)
        : [];
      const projects = projRes.status === 'fulfilled'
        ? (projRes.value?.data?.projects || projRes.value?.data?.data || []).slice(0, 4)
        : [];
      setSearchResults({ pages: pageHits.slice(0, 3), tasks, projects });
    } finally { setSearching(false); }
  }, [visibleLinks]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!query.trim()) { setSearchResults({ pages: [], tasks: [], projects: [] }); return; }
    searchTimer.current = setTimeout(() => runSearch(query), 260);
    return () => clearTimeout(searchTimer.current);
  }, [query, runSearch]);

  // ── Click-away ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onClickAway = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
      if (notifRef.current  && !notifRef.current.contains(e.target))  setShowNotifs(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  const hasResults = query.trim() && (
    searchResults.pages.length || searchResults.tasks.length || searchResults.projects.length
  );

  const handleNotifClick = async (item) => {
    if (!item?.isRead) { try { await markRead(item._id); } catch {} }
    setShowNotifs(false);
    navigate(normalizeNotificationLink(item?.link));
  };

  const filteredNotifs = notifFilter === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const grouped = groupByDay([...filteredNotifs].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));

  /* ── Styles ── */
  const btnBase = {
    display: 'flex', alignItems: 'center', gap: 6,
    height: 36, padding: '0 12px', borderRadius: 8,
    border: '1px solid #E2E8F0', background: '#fff',
    color: '#111827', textDecoration: 'none',
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
  const iconBtn = {
    width: 36, height: 36, borderRadius: 8,
    border: '1px solid #E2E8F0', background: '#fff',
    color: '#374151', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  };

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 30, background: '#fff', borderBottom: '1px solid #E5E7EB', height: 64, display: 'flex', alignItems: 'center', padding: isMobile ? '0 10px' : '0 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flex: 1 }}>

        {isMobile && (
          <button onClick={onToggleSidebar} style={{ ...iconBtn, border: 'none', background: 'transparent', width: 28, height: 28, marginRight: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Menu size={20} />
          </button>
        )}

        {/* ── Search ────────────────────────────────────────────────────────── */}
        <div ref={searchRef} style={{ position: 'relative', flex: 1, maxWidth: 560, minWidth: isMobile ? 120 : 220 }}>
          <Search size={14} style={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
          {query && (
            <button onClick={() => { setQuery(''); setShowSearch(false); }}
              style={{ position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: 2 }}>
              <X size={13} />
            </button>
          )}
          <input
            value={query}
            onFocus={() => setShowSearch(true)}
            onChange={e => { setQuery(e.target.value); setShowSearch(true); }}
            placeholder={isMobile ? "Search…" : "Search tasks, projects, pages…"}
            style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', padding: '0 32px 0 36px', fontSize: 13, outline: 'none', color: '#0F172A', boxSizing: 'border-box' }}
          />

          {/* Results dropdown */}
          {showSearch && query.trim() && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 12px 36px rgba(15,23,42,0.13)', zIndex: 50, overflow: 'hidden', maxHeight: 420, overflowY: 'auto' }}>
              {searching && !hasResults && (
                <div style={{ padding: '14px 16px', fontSize: 12, color: '#94A3B8' }}>Searching…</div>
              )}
              {!searching && !hasResults && (
                <div style={{ padding: '14px 16px', fontSize: 12, color: '#94A3B8' }}>No results for "{query}"</div>
              )}

              {searchResults.tasks.length > 0 && (
                <div>
                  <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em' }}>Tasks</div>
                  {searchResults.tasks.map(t => (
                    <button key={t._id} onClick={() => { navigate(`/tasks?taskId=${t._id}`); setQuery(''); setShowSearch(false); }}
                      style={{ width: '100%', textAlign: 'left', border: 'none', background: '#fff', cursor: 'pointer', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10 }}
                      onMouseEnter={e => e.currentTarget.style.background='#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                      <CheckSquare size={13} style={{ color: '#3b82f6', flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                        <p style={{ margin: 0, fontSize: 10, color: '#94A3B8' }}>{t.project?.name || ''} · {t.status?.replace('-',' ')}</p>
                      </div>
                      <ChevronRight size={12} style={{ color: '#CBD5E1', marginLeft: 'auto', flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              )}

              {searchResults.projects.length > 0 && (
                <div style={{ borderTop: searchResults.tasks.length ? '1px solid #F1F5F9' : 'none' }}>
                  <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em' }}>Projects</div>
                  {searchResults.projects.map(p => (
                    <button key={p._id} onClick={() => { navigate(`/projects/${p._id}`); setQuery(''); setShowSearch(false); }}
                      style={{ width: '100%', textAlign: 'left', border: 'none', background: '#fff', cursor: 'pointer', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10 }}
                      onMouseEnter={e => e.currentTarget.style.background='#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                      <Folder size={13} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      <ChevronRight size={12} style={{ color: '#CBD5E1', marginLeft: 'auto', flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              )}

              {searchResults.pages.length > 0 && (
                <div style={{ borderTop: (searchResults.tasks.length || searchResults.projects.length) ? '1px solid #F1F5F9' : 'none' }}>
                  <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em' }}>Pages</div>
                  {searchResults.pages.map(item => (
                    <button key={item.to} onClick={() => { navigate(item.to); setQuery(''); setShowSearch(false); }}
                      style={{ width: '100%', textAlign: 'left', border: 'none', background: '#fff', cursor: 'pointer', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10 }}
                      onMouseEnter={e => e.currentTarget.style.background='#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                      <ChevronRight size={13} style={{ color: '#94A3B8', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#334155' }}>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Action buttons ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8 }}>
          <Link to="/tasks?create=true" style={{ ...btnBase, padding: isMobile ? '0 8px' : '0 12px' }}><Plus size={13} /><span className="hidden sm:inline"> New Task</span></Link>
          <Link to="/projects"          style={{ ...btnBase, padding: isMobile ? '0 8px' : '0 12px' }}><FolderKanban size={13} /><span className="hidden sm:inline"> Projects</span></Link>
          {isHROrAbove && <Link to="/reports" style={{ ...btnBase, padding: isMobile ? '0 8px' : '0 12px' }}><FileText size={13} /><span className="hidden sm:inline"> Reports</span></Link>}

          {/* ── Notifications ────────────────────────────────────────────── */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button onClick={() => setShowNotifs(s => !s)} style={iconBtn}>
              <Bell size={15} />
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 15, height: 15, borderRadius: 999, background: '#2563EB', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div style={{ position: 'absolute', right: 0, top: 44, width: 360, maxWidth: 'min(360px,calc(100vw - 24px))', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, boxShadow: '0 20px 48px rgba(15,23,42,0.15)', zIndex: 50, display: 'flex', flexDirection: 'column', maxHeight: 520 }}>

                {/* Header */}
                <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Bell size={14} style={{ color: '#2563EB' }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Notifications</span>
                      {unreadCount > 0 && (
                        <span style={{ background: '#2563EB', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 999 }}>{unreadCount}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} title="Mark all read"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', color: '#2563EB', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '3px 6px', borderRadius: 6 }}>
                          <CheckCheck size={12} /> Mark all read
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button onClick={clearAllNotifs} title="Clear all"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', color: '#94A3B8', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '3px 6px', borderRadius: 6 }}
                          onMouseEnter={e => e.currentTarget.style.color='#dc2626'}
                          onMouseLeave={e => e.currentTarget.style.color='#94A3B8'}>
                          <Trash2 size={12} /> Clear all
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Filter tabs */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['all','unread'].map(f => (
                      <button key={f} onClick={() => setNotifFilter(f)}
                        style={{ padding: '3px 10px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: notifFilter===f ? '#EFF6FF' : 'transparent', color: notifFilter===f ? '#2563EB' : '#94A3B8' }}>
                        {f === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* List */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {filteredNotifs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8' }}>
                      <Bell size={22} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                      <p style={{ margin: 0, fontSize: 12 }}>{notifFilter==='unread' ? 'No unread notifications' : 'No notifications'}</p>
                    </div>
                  ) : (
                    Object.entries(grouped).map(([group, items]) => {
                      if (!items.length) return null;
                      return (
                        <div key={group}>
                          <div style={{ padding: '8px 14px 3px', fontSize: 10, fontWeight: 700, color: '#CBD5E1', textTransform: 'uppercase', letterSpacing: '.06em' }}>{group}</div>
                          {items.map(item => {
                            const meta = NOTIF_META[item.type] || { icon: Info, color: '#64748b' };
                            const Icon = meta.icon;
                            return (
                              <div key={item._id}
                                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 14px', background: item.isRead ? '#fff' : '#F0F7FF', borderBottom: '1px solid #F8FAFC', transition: 'background .12s' }}
                                onMouseEnter={e => e.currentTarget.style.background = item.isRead ? '#F8FAFC' : '#E8F2FF'}
                                onMouseLeave={e => e.currentTarget.style.background = item.isRead ? '#fff' : '#F0F7FF'}>
                                {/* Type icon */}
                                <div style={{ width: 28, height: 28, borderRadius: 8, background: meta.color+'12', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                                  <Icon size={13} style={{ color: meta.color }} />
                                </div>
                                {/* Content — clickable */}
                                <button onClick={() => handleNotifClick(item)}
                                  style={{ flex: 1, textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', padding: 0, minWidth: 0 }}>
                                  <p style={{ margin: 0, fontSize: 12, fontWeight: item.isRead ? 400 : 600, color: '#0F172A', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                    {item.message}
                                  </p>
                                  <span style={{ fontSize: 10, color: '#94A3B8', marginTop: 2, display: 'block' }}>{relTime(item.createdAt)}</span>
                                </button>
                                {/* Dismiss button */}
                                <button onClick={() => deleteNotif(item._id)} title="Dismiss"
                                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#CBD5E1', padding: 2, display: 'flex', flexShrink: 0 }}
                                  onMouseEnter={e => e.currentTarget.style.color='#94A3B8'}
                                  onMouseLeave={e => e.currentTarget.style.color='#CBD5E1'}>
                                  <X size={13} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Avatar ── */}
          <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8, height: 36, border: '1px solid #E2E8F0', borderRadius: 8, padding: isMobile ? '0 6px' : '0 10px', textDecoration: 'none', color: '#0F172A' }}>
            <Avatar name={user?.name} size="sm" />
            <div className="hidden md:block" style={{ lineHeight: 1.1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}

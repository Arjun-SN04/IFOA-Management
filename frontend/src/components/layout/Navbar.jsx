import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Avatar } from '../ui';
import toast from 'react-hot-toast';
import {
  Bell, User, CalendarDays, LogOut, LayoutDashboard, FolderKanban,
  CheckSquare, Zap, Megaphone, BarChart3, Users, Menu, X, ChevronDown, ClipboardList,
  MessageSquare, Briefcase, AlertTriangle
} from 'lucide-react';
import IFOAWhite from '../../assets/IFOA_white.png';

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

function NotificationTypeIcon({ type }) {
  const iconMap = {
    task_assigned: CheckSquare,
    task_updated: CheckSquare,
    task_commented: MessageSquare,
    task_due: AlertTriangle,
    leave_applied: CalendarDays,
    leave_approved: CalendarDays,
    leave_rejected: CalendarDays,
    project_added: Briefcase,
    project_updated: Briefcase,
    mention: MessageSquare,
    announcement: Megaphone,
    sprint_started: Zap,
    sprint_ended: Zap,
    deadline_reminder: AlertTriangle,
  };
  const Icon = iconMap[type] || Bell;
  return <Icon className="w-3.5 h-3.5" />;
}

function useOutsideClick(ref, handler) {
  useEffect(() => {
    const listener = (e) => { if (ref.current && !ref.current.contains(e.target)) handler(); };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

const NAV_ITEMS = [
  { to: '/dashboard',     label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/projects',      label: 'Projects',     icon: FolderKanban },
  { to: '/tasks',         label: 'Tasks',         icon: CheckSquare },
  { to: '/daily-tasks',   label: 'Daily Tasks',   icon: ClipboardList },
  { to: '/sprints',       label: 'Sprints',       icon: Zap },
  { to: '/leaves',        label: 'Leaves',        icon: CalendarDays },
  { to: '/announcements', label: 'Announcements', icon: Megaphone },
];

const ADMIN_ITEMS = [
  { to: '/reports',     label: 'Reports', icon: BarChart3 },
  { to: '/admin/users', label: 'Users',   icon: Users },
];

export default function Navbar() {
  const { user, logout, isManagerOrAdmin } = useAuth();
  const { unreadCount, notifications, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  const [showNotifs,  setShowNotifs]  = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  const notifRef   = useRef();
  const profileRef = useRef();
  useOutsideClick(notifRef,   () => setShowNotifs(false));
  useOutsideClick(profileRef, () => setShowProfile(false));

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const handleMarkAll = () => {
    markAllRead();
    toast.success('All notifications marked as read');
  };

  const handleNotificationClick = async (n) => {
    if (!n?.isRead) {
      try {
        await markRead(n._id);
      } catch {}
    }
    setShowNotifs(false);
    navigate(normalizeNotificationLink(n?.link));
  };

  const allNav = [...NAV_ITEMS, ...(isManagerOrAdmin ? ADMIN_ITEMS : [])];
  const latestUnread = notifications.find((n) => !n.isRead);

  const linkCls = (isActive) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
     ${isActive
      ? 'text-white shadow-sm'
      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`;

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white border-b shrink-0 shadow-sm" style={{ borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' }}>
      {/* Main bar */}
      <div className="px-4 lg:px-6">
        <div className="flex items-center h-16 gap-4">

          {/* Logo */}
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <Link to="/" className="flex items-center shrink-0">
              <img src={IFOAWhite} alt="IFOA" className="h-12 w-auto object-contain" />
            </Link>
          </motion.div>

          {/* Desktop nav — centered with pill shapes */}
          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="hidden lg:flex items-center gap-2 flex-1 justify-center">
            {allNav.map(({ to, label, icon: Icon }, idx) => (
              <motion.div
                key={to}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 + idx * 0.05 }}>
                <NavLink to={to}
                  className={({ isActive }) => `
                    flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium
                    transition-all duration-200 ease-out
                    ${isActive
                      ? 'text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'}
                  `}
                  style={({ isActive }) => isActive ? {
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)'
                  } : {}}>{({ isActive }) => (
                    <motion.div
                      animate={isActive ? { scale: 1.05 } : { scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                    </motion.div>
                  )}
                </NavLink>
              </motion.div>
            ))}
          </motion.nav>

          {/* Mobile spacer */}
          <div className="flex-1 lg:hidden" />

          {/* Right — notifications + profile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center gap-1">

            {/* Bell */}
            <div className="relative" ref={notifRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setShowNotifs(s => !s); setShowProfile(false); }}
                className="relative w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100"
                style={{ color: 'var(--text-muted)' }}>
                <Bell className="w-4.5 h-4.5" />
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </motion.button>

              {showNotifs && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border z-50 overflow-hidden"
                  style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Notifications</span>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={handleMarkAll}
                      className="text-xs font-semibold transition-colors hover:opacity-80"
                      style={{ color: 'var(--blue)' }}>
                      Mark all read
                    </motion.button>
                  </div>
                  <div className="max-h-80 overflow-y-auto scrollbar-thin divide-y" style={{ divideColor: 'var(--border)' }}>
                    {notifications.length === 0
                      ? <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>No notifications yet</p>
                      : notifications.slice(0, 10).map(n => (
                          <motion.div key={n._id} onClick={() => handleNotificationClick(n)}
                            whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                            className={`px-4 py-3 cursor-pointer transition-colors ${!n.isRead ? 'bg-blue-50/60' : ''}`}>
                            <div className="flex items-start gap-2">
                              <span className="mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                                style={{ background: !n.isRead ? 'rgba(37,99,235,0.12)' : 'rgba(100,116,139,0.12)', color: !n.isRead ? 'var(--blue)' : '#64748b' }}>
                                <NotificationTypeIcon type={n.type} />
                              </span>
                              <p className="text-sm leading-snug flex-1"
                                style={{ color: 'var(--text-mid)' }}>
                                {n.message}
                              </p>
                            </div>
                            <p className="text-xs mt-1 pl-8" style={{ color: 'var(--text-faint)' }}>
                              {new Date(n.createdAt).toLocaleDateString()}
                            </p>
                          </motion.div>
                        ))
                    }
                  </div>
                </motion.div>
              )}
            </div>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setShowProfile(s => !s); setShowNotifs(false); }}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full transition-colors hover:bg-gray-100">
                <Avatar name={user?.name} size="sm" />
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-main)' }}>{user?.name}</p>
                  <p className="text-[10px] capitalize leading-tight" style={{ color: 'var(--text-faint)' }}>{user?.role}</p>
                </div>
                <motion.div
                  animate={showProfile ? { rotate: 180 } : { rotate: 0 }}
                  transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-3 h-3 hidden sm:block" style={{ color: 'var(--text-faint)' }} />
                </motion.div>
              </motion.button>

              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-11 w-52 bg-white rounded-2xl shadow-2xl border z-50 overflow-hidden py-1"
                  style={{ borderColor: 'var(--border)' }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{user?.name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-faint)' }}>{user?.email}</p>
                  </div>
                  <motion.div whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                    <Link to="/profile" onClick={() => setShowProfile(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                      style={{ color: 'var(--text-mid)' }}>
                      <User className="w-4 h-4" style={{ color: 'var(--text-faint)' }} />
                      My Profile
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                    <Link to="/leaves" onClick={() => setShowProfile(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                      style={{ color: 'var(--text-mid)' }}>
                      <CalendarDays className="w-4 h-4" style={{ color: 'var(--text-faint)' }} />
                      Apply Leave
                    </Link>
                  </motion.div>
                  <div className="border-t mt-1 pt-1" style={{ borderColor: 'var(--border)' }}>
                    <motion.button
                      whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition-colors">
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Mobile hamburger */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMobileOpen(s => !s)}
              className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100"
              style={{ color: 'var(--text-mid)' }}>
              <motion.div
                animate={mobileOpen ? { rotate: 90 } : { rotate: 0 }}
                transition={{ duration: 0.2 }}>
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </motion.div>
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="lg:hidden border-t px-4 py-2 space-y-0.5 bg-white"
          style={{ borderColor: 'var(--border)' }}>
          {allNav.map(({ to, label, icon: Icon }, idx) => (
            <motion.div
              key={to}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}>
              <NavLink to={to} onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-2.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200
                  ${isActive ? 'text-white shadow-md' : 'text-gray-600 hover:bg-gray-100/80'}
                `}
                style={({ isActive }) => isActive ? {
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)'
                } : {}}>
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </NavLink>
            </motion.div>
          ))}
        </motion.nav>
      )}

      {/* Notification bar */}
      {unreadCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="border-t px-4 lg:px-6" style={{ background: '#EBF1FF', borderColor: '#D1DEFF' }}>
          <div className="flex items-center gap-3 h-9">
            <div className="flex items-center gap-2 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--blue)' }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--blue)' }} />
              </span>
              <span className="text-xs font-semibold" style={{ color: 'var(--blue)' }}>
                {unreadCount} new
              </span>
            </div>
            <div className="h-3 w-px bg-blue-200" />
            <button
              type="button"
              onClick={() => latestUnread && handleNotificationClick(latestUnread)}
              className="text-xs flex-1 truncate text-left hover:underline"
              style={{ color: '#1D4ED8' }}>
              {latestUnread?.message || 'You have unread notifications'}
            </button>
            <motion.button
              whileHover={{ opacity: 0.7 }}
              onClick={handleMarkAll}
              className="text-[10px] font-bold uppercase tracking-wider shrink-0 transition-opacity"
              style={{ color: 'var(--blue)' }}>
              Dismiss
            </motion.button>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Avatar } from '../ui';
import {
  Bell, User, CalendarDays, LogOut, LayoutDashboard, FolderKanban,
  CheckSquare, Zap, Megaphone, BarChart3, Users, Menu, X, ChevronDown
} from 'lucide-react';

function useOutsideClick(ref, handler) {
  useEffect(() => {
    const listener = (e) => { if (ref.current && !ref.current.contains(e.target)) handler(); };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

const NAV_ITEMS = [
  { to: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/projects',      label: 'Projects',      icon: FolderKanban },
  { to: '/tasks',         label: 'Tasks',          icon: CheckSquare },
  { to: '/sprints',       label: 'Sprints',        icon: Zap },
  { to: '/leaves',        label: 'Leaves',         icon: CalendarDays },
  { to: '/announcements', label: 'Announcements',  icon: Megaphone },
];

const ADMIN_ITEMS = [
  { to: '/reports',      label: 'Reports',  icon: BarChart3 },
  { to: '/admin/users',  label: 'Users',    icon: Users },
];

export default function Navbar() {
  const { user, logout, isManagerOrAdmin } = useAuth();
  const { unreadCount, notifications, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const notifRef = useRef();
  const profileRef = useRef();
  useOutsideClick(notifRef, () => setShowNotifs(false));
  useOutsideClick(profileRef, () => setShowProfile(false));

  const handleLogout = () => { logout(); navigate('/login'); };

  const allNav = [...NAV_ITEMS, ...(isManagerOrAdmin ? ADMIN_ITEMS : [])];

  const linkClass = (isActive) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
     ${isActive
      ? 'bg-blue-50 text-blue-700'
      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`;

  return (
    <header className="bg-white border-b border-slate-200 flex-shrink-0">
      <div className="px-4 lg:px-6">
        <div className="flex items-center h-14">
          {/* Logo → home */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-extrabold tracking-tight">IF</span>
            </div>
            <span className="text-slate-900 font-bold text-sm tracking-tight hidden sm:inline">IFOA</span>
          </Link>

          {/* Desktop nav — centered */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {allNav.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => linkClass(isActive)}>
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Spacer for mobile */}
          <div className="flex-1 lg:hidden" />

          {/* Right side */}
          <div className="flex items-center gap-1">
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button onClick={() => { setShowNotifs(s => !s); setShowProfile(false); }}
                className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <Bell className="w-[18px] h-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 top-11 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-fadeInDown">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-900">Notifications</span>
                    <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto scrollbar-thin divide-y divide-slate-50">
                    {notifications.length === 0
                      ? <p className="text-sm text-slate-400 text-center py-8">No notifications</p>
                      : notifications.slice(0, 10).map(n => (
                        <div key={n._id} onClick={() => markRead(n._id)}
                          className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-blue-50/50' : ''}`}>
                          <div className="flex items-start gap-2">
                            {!n.isRead && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />}
                            <p className={`text-sm text-slate-700 leading-snug flex-1 ${!n.isRead ? '' : 'pl-3.5'}`}>{n.message}</p>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 pl-3.5">{new Date(n.createdAt).toLocaleDateString()}</p>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button onClick={() => { setShowProfile(s => !s); setShowNotifs(false); }}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
                <Avatar name={user?.name} size="sm" />
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-medium text-slate-900 leading-tight">{user?.name}</p>
                  <p className="text-[10px] text-slate-400 capitalize leading-tight">{user?.role}</p>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
              </button>

              {showProfile && (
                <div className="absolute right-0 top-11 w-52 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden py-1 animate-fadeInDown">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  </div>
                  <Link to="/profile" onClick={() => setShowProfile(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <User className="w-4 h-4 text-slate-400" />
                    My Profile
                  </Link>
                  <Link to="/leaves" onClick={() => setShowProfile(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                    Apply Leave
                  </Link>
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button onClick={() => setMobileOpen(s => !s)}
              className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="lg:hidden border-t border-slate-100 px-4 py-2 space-y-1 animate-fadeInDown bg-white">
          {allNav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`
              }>
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      )}

      {/* Persistent notification bar — always visible */}
      <div className="bg-blue-50 border-t border-blue-100 px-4 lg:px-6">
        <div className="flex items-center gap-3 h-9">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="relative flex h-2 w-2">
              {unreadCount > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${unreadCount > 0 ? 'bg-blue-500' : 'bg-slate-300'}`} />
            </span>
            <span className="text-xs font-semibold text-blue-700">
              {unreadCount > 0 ? `${unreadCount} new` : 'Updates'}
            </span>
          </div>
          <div className="h-3 w-px bg-blue-200 flex-shrink-0" />
          <p className="text-xs text-blue-600 truncate flex-1">
            {unreadCount > 0
              ? (notifications.find(n => !n.isRead)?.message || 'You have unread notifications')
              : (notifications[0]?.message || 'All caught up — no new updates')}
          </p>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-[10px] font-semibold text-blue-500 hover:text-blue-700 flex-shrink-0 uppercase tracking-wider">
              Dismiss
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

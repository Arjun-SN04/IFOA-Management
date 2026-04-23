import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Zap,
  CalendarDays,
  Megaphone,
  BarChart3,
  Users,
  ClipboardList,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Archive,
} from 'lucide-react';
import IFOAIndia from '../../assets/IFOA_INDIA.png';
import IFOABlank from '../../assets/IFOA_blank.png';

// Nav items for ALL employees (including team leads — team lead is just a title/post)
const EMPLOYEE_NAV = [
  { to: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/projects',      label: 'Projects',      icon: FolderKanban },
  { to: '/tasks',         label: 'My Board',      icon: CheckSquare },
  { to: '/backlog',       label: 'Backlog',        icon: Archive },
  { to: '/daily-tasks',   label: 'Daily Tasks',   icon: ClipboardList },
  { to: '/sprints',       label: 'Sprints',       icon: Zap },
  { to: '/leaves',        label: 'Leaves',        icon: CalendarDays },
  { to: '/announcements', label: 'Announcements', icon: Megaphone },
];

// Nav items for HR and Manager — includes Daily Tasks for task management
const HR_MANAGER_WORKSPACE_NAV = [
  { to: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/projects',      label: 'Projects',      icon: FolderKanban },
  { to: '/daily-tasks',   label: 'Daily Tasks',   icon: ClipboardList },
  { to: '/sprints',       label: 'Sprints',       icon: Zap },
  { to: '/leaves',        label: 'Leaves',        icon: CalendarDays },
  { to: '/announcements', label: 'Announcements', icon: Megaphone },
];

// Management section nav (HR + Manager + Admin)
const MANAGEMENT_NAV = [
  { to: '/admin/teams',  label: 'Team Board',  icon: LayoutGrid },
  { to: '/reports',      label: 'Reports',     icon: BarChart3 },
  { to: '/admin/users',  label: 'Users',       icon: Users },
];

// Admin-only nav (empty — users moved to management nav)
const ADMIN_NAV = [];

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, isAdmin, isHR, isManagerOrAdmin, isHROrAbove, logout } = useAuth();
  const { pendingUsersCount } = useNotifications();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const isHROrManager = isHR || isManagerOrAdmin;
  const workspaceNav = isHROrManager ? HR_MANAGER_WORKSPACE_NAV : EMPLOYEE_NAV;

  const linkBase = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: collapsed ? 0 : 10,
    padding: collapsed ? '10px' : '9px 12px',
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'all 0.18s',
    cursor: 'pointer',
    justifyContent: collapsed ? 'center' : 'flex-start',
    background: isActive ? '#1D4ED8' : 'transparent',
    color: isActive ? '#FFFFFF' : '#475569',
    border: isActive ? '1px solid #1D4ED8' : '1px solid transparent',
    position: 'relative',
  });

  const sectionLabel = (label) => !collapsed && (
    <p style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0 }}>
      {label}
    </p>
  );

  const divider = () => collapsed
    ? <div style={{ height: 1, background: '#E5E7EB', margin: '4px' }} />
    : null;

  const navSection = (items) => items.map(({ to, label, icon: Icon }) => (
    <NavLink key={to} to={to} title={collapsed ? label : undefined}
      style={({ isActive }) => linkBase(isActive)}
      onMouseEnter={(e) => {
        if (e.currentTarget.getAttribute('aria-current') !== 'page') {
          Object.assign(e.currentTarget.style, { color: '#0F172A', background: '#F8FAFC', borderColor: '#E2E8F0' });
        }
      }}
      onMouseLeave={(e) => {
        if (e.currentTarget.getAttribute('aria-current') !== 'page') {
          Object.assign(e.currentTarget.style, { color: '#475569', background: 'transparent', borderColor: 'transparent' });
        }
      }}>
      <Icon size={16} style={{ flexShrink: 0 }} />
      {!collapsed && (
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{label}</span>
      )}
      {/* Pending users badge on the Users link */}
      {to === '/admin/users' && pendingUsersCount > 0 && (
        <span style={{
          minWidth: 18, height: 18, borderRadius: 999,
          background: '#D97706', color: '#fff',
          fontSize: 10, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 4px', flexShrink: 0,
          ...(collapsed ? { position: 'absolute', top: 2, right: 2 } : {}),
        }}>
          {pendingUsersCount > 9 ? '9+' : pendingUsersCount}
        </span>
      )}
    </NavLink>
  ));

  return (
    <aside style={{
      width: collapsed ? 68 : 240,
      flexShrink: 0,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#FFFFFF',
      borderRight: '1px solid #E5E7EB',
      transition: 'width 0.28s cubic-bezier(0.16,1,0.3,1)',
      position: 'relative',
      zIndex: 40,
    }}>
      {/* Logo */}
      <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: collapsed ? '0 14px' : '0 16px', borderBottom: '1px solid #E5E7EB', flexShrink: 0, justifyContent: collapsed ? 'center' : 'flex-start', overflow: 'hidden' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', textDecoration: 'none', flexShrink: 0, width: '100%' }}>
          {collapsed ? (
            <img src={IFOABlank} alt="IFOA" style={{ height: 36, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
          ) : (
            <img src={IFOAIndia} alt="IFOA India" style={{ height: 36, width: 'auto', objectFit: 'contain', flexShrink: 0, maxWidth: '100%' }} />
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 10px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ padding: collapsed ? '0 0 4px' : '0 4px 4px' }}>{sectionLabel('Workspace')}</div>
        {navSection(workspaceNav)}

        {/* Management Section (HR + Manager + Admin) */}
        {isHROrAbove && (
          <>
            <div style={{ padding: collapsed ? '14px 0 4px' : '16px 4px 4px' }}>
              {divider()}
              {sectionLabel('Management')}
            </div>
            {navSection(MANAGEMENT_NAV)}
          </>
        )}

        {/* Admin Section */}
        {isAdmin && (
          <>
            <div style={{ padding: collapsed ? '14px 0 4px' : '16px 4px 4px' }}>
              {divider()}
              {sectionLabel('Admin')}
            </div>
            {navSection(ADMIN_NAV)}
          </>
        )}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #E5E7EB', padding: '8px' }}>
        {!collapsed && (
          <Link to="/profile"
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', fontSize: 12, fontWeight: 600, color: '#334155', textDecoration: 'none', borderRadius: 10, transition: 'background 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
            <User size={14} />
            My Profile
          </Link>
        )}
        <button onClick={handleLogout}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 9, padding: collapsed ? '9px' : '9px 12px', fontSize: 12, fontWeight: 600, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 10, fontFamily: 'inherit', transition: 'background 0.15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#FEF2F2'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
          <LogOut size={14} />
          {!collapsed && 'Sign out'}
        </button>
        <button onClick={() => setCollapsed(!collapsed)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px', marginTop: 4, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', color: '#94A3B8', fontSize: 11, fontWeight: 500, transition: 'all 0.2s', fontFamily: 'inherit' }}
          onMouseEnter={(e) => { Object.assign(e.currentTarget.style, { color: '#2563EB', background: '#EFF6FF' }); }}
          onMouseLeave={(e) => { Object.assign(e.currentTarget.style, { color: '#94A3B8', background: 'transparent' }); }}>
          {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}

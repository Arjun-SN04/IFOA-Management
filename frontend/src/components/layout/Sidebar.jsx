import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  UsersRound,
  ClipboardList,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Briefcase,
  UserCheck,
  LayoutGrid,
} from 'lucide-react';
import GreenLogo from '../../assets/Green_logo.png';

// Nav items for EMPLOYEES and TEAM LEADS (they have a personal board)
const EMPLOYEE_NAV = [
  { to: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/projects',      label: 'Projects',      icon: FolderKanban },
  { to: '/tasks',         label: 'My Board',      icon: CheckSquare },
  { to: '/daily-tasks',   label: 'Daily Tasks',   icon: ClipboardList },
  { to: '/sprints',       label: 'Sprints',       icon: Zap },
  { to: '/leaves',        label: 'Leaves',        icon: CalendarDays },
  { to: '/announcements', label: 'Announcements', icon: Megaphone },
];

// Nav items for ADMIN and MANAGER — no "My Board" (they assign, not do tasks)
const MANAGEMENT_WORKSPACE_NAV = [
  { to: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/projects',      label: 'Projects',      icon: FolderKanban },
  { to: '/sprints',       label: 'Sprints',       icon: Zap },
  { to: '/leaves',        label: 'Leaves',        icon: CalendarDays },
  { to: '/announcements', label: 'Announcements', icon: Megaphone },
];

// Nav items shown to Management + Admin (managers and admins) — management section
const MANAGEMENT_NAV = [
  { to: '/reports',      label: 'Reports',         icon: BarChart3 },
  { to: '/admin/teams',  label: 'Teams & Boards',  icon: UsersRound },
];

// Nav items shown to Admin only
const ADMIN_NAV = [
  { to: '/admin/users',  label: 'Users',     icon: Users },
];

// Badge for role label next to section header
const ROLE_BADGE = {
  admin:      { label: 'Admin',      color: '#EF4444', bg: '#FEF2F2' },
  manager:    { label: 'Management', color: '#8B5CF6', bg: '#F5F3FF' },
  team_lead:  { label: 'Team Lead',  color: '#F59E0B', bg: '#FFFBEB' },
  employee:   { label: 'User',       color: '#3B82F6', bg: '#EFF6FF' },
};

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, isAdmin, isManagement, isTeamLead, isManagerOrAdmin, isTeamLeadOrAbove, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const badge = ROLE_BADGE[user?.role] || ROLE_BADGE.employee;

  // Choose workspace nav based on role:
  // Admin and Manager do NOT get "My Board" — they manage teams and assign work
  const workspaceNav = isManagerOrAdmin ? MANAGEMENT_WORKSPACE_NAV : EMPLOYEE_NAV;

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
    <p style={{
      fontSize: 9, fontWeight: 700, color: '#94A3B8',
      letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0,
    }}>
      {label}
    </p>
  );

  const divider = () => collapsed
    ? <div style={{ height: 1, background: '#E5E7EB', margin: '4px' }} />
    : null;

  const navSection = (items) => items.map(({ to, label, icon: Icon }) => (
    <NavLink
      key={to}
      to={to}
      title={collapsed ? label : undefined}
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
      }}
    >
      <Icon size={16} style={{ flexShrink: 0 }} />
      {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
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
      <div style={{
        height: 64, display: 'flex', alignItems: 'center',
        padding: collapsed ? '0 14px' : '0 16px',
        borderBottom: '1px solid #E5E7EB', gap: 10, flexShrink: 0,
        justifyContent: collapsed ? 'center' : 'flex-start',
        overflow: 'hidden',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0, minWidth: 0 }}>
          <img src={GreenLogo} alt="IFOA" style={{ height: 30, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>
                IFOA Management
              </p>
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '1px 7px', borderRadius: 20,
                fontSize: 9, fontWeight: 700,
                color: badge.color, background: badge.bg,
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                {badge.label}
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 10px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* ── Workspace (role-scoped) ── */}
        <div style={{ padding: collapsed ? '0 0 4px' : '0 4px 4px' }}>
          {sectionLabel('Workspace')}
        </div>
        {navSection(workspaceNav)}

        {/* ── Team Lead section (task board link for team leads) ── */}
        {isTeamLead && !isManagerOrAdmin && (
          <>
            <div style={{ padding: collapsed ? '14px 0 4px' : '16px 4px 4px' }}>
              {divider()}
              {sectionLabel('Team Lead')}
            </div>
            <NavLink
              to="/admin/teams"
              title={collapsed ? 'My Team' : undefined}
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
              }}
            >
              <UserCheck size={16} style={{ flexShrink: 0 }} />
              {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>My Team</span>}
            </NavLink>
          </>
        )}

        {/* ── Management Section (manager + admin) ── */}
        {isManagerOrAdmin && (
          <>
            <div style={{ padding: collapsed ? '14px 0 4px' : '16px 4px 4px' }}>
              {divider()}
              {sectionLabel('Management')}
            </div>
            {navSection(MANAGEMENT_NAV)}
          </>
        )}

        {/* ── Admin Section (admin only) ── */}
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
          <Link
            to="/profile"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9,
              padding: '9px 12px', fontSize: 12, fontWeight: 600,
              color: '#334155', textDecoration: 'none', borderRadius: 10, transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <User size={14} />
            My Profile
          </Link>
        )}

        <button
          onClick={handleLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 9, padding: collapsed ? '9px' : '9px 12px',
            fontSize: 12, fontWeight: 600, color: '#DC2626', background: 'none',
            border: 'none', cursor: 'pointer', borderRadius: 10, fontFamily: 'inherit', transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#FEF2F2'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut size={14} />
          {!collapsed && 'Sign out'}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, padding: '6px', marginTop: 4, borderRadius: 10, border: 'none',
            cursor: 'pointer', background: 'transparent', color: '#94A3B8',
            fontSize: 11, fontWeight: 500, transition: 'all 0.2s', fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => { Object.assign(e.currentTarget.style, { color: '#2563EB', background: '#EFF6FF' }); }}
          onMouseLeave={(e) => { Object.assign(e.currentTarget.style, { color: '#94A3B8', background: 'transparent' }); }}
        >
          {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}

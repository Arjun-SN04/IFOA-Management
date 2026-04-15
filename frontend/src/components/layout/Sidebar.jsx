import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, FolderKanban, CheckSquare, Zap, CalendarDays,
  Megaphone, BarChart3, Users, ChevronLeft, ChevronRight, Plane
} from 'lucide-react';
import GreenLogo from '../../assets/Green_logo.png';

const NAV = [
  { to: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/projects',      label: 'Projects',      icon: FolderKanban },
  { to: '/tasks',         label: 'My Tasks',      icon: CheckSquare },
  { to: '/sprints',       label: 'Sprints',       icon: Zap },
  { to: '/leaves',        label: 'Leaves',        icon: CalendarDays },
  { to: '/announcements', label: 'Announcements', icon: Megaphone },
];

const ADMIN_NAV = [
  { to: '/reports',     label: 'Reports', icon: BarChart3 },
  { to: '/admin/users', label: 'Users',   icon: Users },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const { isManagerOrAdmin } = useAuth();

  const linkBase = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: collapsed ? '10px' : '10px 12px',
    borderRadius: 12, fontSize: 13, fontWeight: 500,
    textDecoration: 'none', transition: 'all 0.18s',
    cursor: 'pointer', justifyContent: collapsed ? 'center' : 'flex-start',
  };

  const activeStyle = {
    ...linkBase,
    background: 'rgba(245,200,66,0.15)',
    color: '#F5C842',
    border: '1px solid rgba(245,200,66,0.2)',
  };

  const inactiveStyle = {
    ...linkBase,
    background: 'transparent',
    color: 'rgba(255,255,255,0.5)',
    border: '1px solid transparent',
  };

  return (
    <aside style={{
      width: collapsed ? 68 : 220,
      flexShrink: 0, height: '100%',
      display: 'flex', flexDirection: 'column',
      background: '#1E150A',
      borderRight: '1px solid rgba(245,200,66,0.08)',
      transition: 'width 0.3s cubic-bezier(0.16,1,0.3,1)',
      position: 'relative',
    }}>
      {/* Logo */}
      <div style={{
        height: 68, display: 'flex', alignItems: 'center',
        padding: collapsed ? '0 14px' : '0 16px',
        borderBottom: '1px solid rgba(245,200,66,0.08)',
        gap: 10, flexShrink: 0,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <img src={GreenLogo} alt="IFOA" style={{ height: 32, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
        {!collapsed && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#FFFDF5', fontFamily: "'Cormorant Garamond', serif", lineHeight: 1 }}>
              IFOA
            </div>
            <div style={{ fontSize: 9, color: 'rgba(245,200,66,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
              Management
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} style={({ isActive }) => isActive ? activeStyle : inactiveStyle}
            onMouseEnter={e => { if (!e.currentTarget.classList.contains('active-nav')) Object.assign(e.currentTarget.style, { color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }); }}
            onMouseLeave={e => { if (!e.currentTarget.classList.contains('active-nav')) Object.assign(e.currentTarget.style, { color: 'rgba(255,255,255,0.5)', background: 'transparent', border: '1px solid transparent' }); }}>
            <Icon size={17} style={{ flexShrink: 0 }} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}

        {isManagerOrAdmin && (
          <>
            <div style={{ padding: collapsed ? '16px 0 4px' : '16px 4px 4px' }}>
              {!collapsed && (
                <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(245,200,66,0.4)', letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0 }}>
                  Admin
                </p>
              )}
            </div>
            {ADMIN_NAV.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} style={({ isActive }) => isActive ? activeStyle : inactiveStyle}
                onMouseEnter={e => { Object.assign(e.currentTarget.style, { color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }); }}
                onMouseLeave={e => { Object.assign(e.currentTarget.style, { color: 'rgba(255,255,255,0.5)', background: 'transparent', border: '1px solid transparent' }); }}>
                <Icon size={17} style={{ flexShrink: 0 }} />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Collapse toggle */}
      <div style={{ padding: 8, borderTop: '1px solid rgba(245,200,66,0.08)' }}>
        <button onClick={() => setCollapsed(!collapsed)} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: 'transparent', color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 500,
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => Object.assign(e.currentTarget.style, { color: 'rgba(245,200,66,0.7)', background: 'rgba(245,200,66,0.06)' })}
          onMouseLeave={e => Object.assign(e.currentTarget.style, { color: 'rgba(255,255,255,0.3)', background: 'transparent' })}>
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}

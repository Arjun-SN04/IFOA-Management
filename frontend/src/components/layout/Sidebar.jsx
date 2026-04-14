import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, FolderKanban, CheckSquare, Zap, CalendarDays,
  Megaphone, BarChart3, Users, ChevronLeft, ChevronRight
} from 'lucide-react';

const NAV = [
  { to: '/dashboard',     label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/projects',      label: 'Projects',        icon: FolderKanban },
  { to: '/tasks',         label: 'My Tasks',        icon: CheckSquare },
  { to: '/sprints',       label: 'Sprints',         icon: Zap },
  { to: '/leaves',        label: 'Leaves',          icon: CalendarDays },
  { to: '/announcements', label: 'Announcements',   icon: Megaphone },
];

const ADMIN_NAV = [
  { to: '/reports',      label: 'Reports',          icon: BarChart3 },
  { to: '/admin/users',  label: 'Users',            icon: Users },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const { isManagerOrAdmin } = useAuth();

  const linkClass = (isActive) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
     ${isActive
      ? 'bg-slate-900 text-white'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`;

  return (
    <aside className={`flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-60'} flex-shrink-0 h-full`}>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-100 gap-2.5 flex-shrink-0">
        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold tracking-tight">IF</span>
        </div>
        {!collapsed && (
          <span className="text-sm font-bold text-slate-900 tracking-tight">IFOA</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => linkClass(isActive)}>
            <Icon className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}

        {isManagerOrAdmin && (
          <>
            <div className="pt-4 pb-2">
              {!collapsed && (
                <p className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Admin</p>
              )}
            </div>
            {ADMIN_NAV.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => linkClass(isActive)}>
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span className="text-xs font-medium">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

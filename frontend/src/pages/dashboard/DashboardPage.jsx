import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { reportAPI, taskAPI, leaveAPI, projectAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/ui';
import {
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  FolderKanban,
  Clock,
  AlertTriangle,
  CalendarDays,
  Activity,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDayLabel(date) {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const C = {
  indigo:       '#2563EB',
  indigoBg:     '#EFF6FF',
  indigoBorder: '#BFDBFE',

  emerald:       '#059669',
  emeraldBg:     '#ECFDF5',
  emeraldBorder: '#A7F3D0',

  amber:         '#D97706',
  amberBg:       '#FFFBEB',
  amberBorder:   '#FDE68A',

  sky:           '#0284C7',
  skyBg:         '#F0F9FF',
  skyBorder:     '#BAE6FD',

  black:         '#0F172A',
  blackMid:      '#1E293B',

  slate:         '#475569',
  slateMid:      '#64748B',
  slateLight:    '#94A3B8',

  border:        '#E2E8F0',
  borderLight:   '#F1F5F9',
  surface:       '#FFFFFF',
  surfaceAlt:    '#F8FAFC',
};

const METRIC_ACCENTS = [
  { bg: C.indigoBg,   border: C.indigoBorder,   icon: C.indigo  },
  { bg: C.emeraldBg,  border: C.emeraldBorder,  icon: C.emerald },
  { bg: C.skyBg,      border: C.skyBorder,      icon: C.sky     },
  { bg: C.amberBg,    border: C.amberBorder,    icon: C.amber   },
  { bg: C.indigoBg,   border: C.indigoBorder,   icon: C.indigo  },
  { bg: C.emeraldBg,  border: C.emeraldBorder,  icon: C.emerald },
];

function Carousel({ slides }) {
  const [index, setIndex] = useState(0);
  const total = slides.length;
  const prev = () => setIndex((i) => (i === 0 ? total - 1 : i - 1));
  const next = () => setIndex((i) => (i === total - 1 ? 0 : i + 1));

  return (
    <div style={{ marginTop: 2 }}>
      <div style={{ overflow: 'hidden', borderRadius: 18, border: `1px solid ${C.border}`, background: C.surface }}>
        <div
          style={{
            display: 'flex',
            width: `${total * 100}%`,
            transform: `translateX(-${(100 / total) * index}%)`,
            transition: 'transform 0.45s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          {slides.map((slide, idx) => (
            <section key={idx} style={{ width: `${100 / total}%`, padding: 16 }}>
              {slide}
            </section>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <button onClick={prev} style={{ width: 32, height: 32, borderRadius: 999, border: `1px solid ${C.border}`, background: C.surface, color: C.slate, cursor: 'pointer' }}>
          <ChevronLeft size={16} style={{ margin: 'auto' }} />
        </button>
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setIndex(idx)}
            aria-label={`Slide ${idx + 1}`}
            style={{
              width: idx === index ? 22 : 8,
              height: 8,
              borderRadius: 999,
              border: 'none',
              background: idx === index ? C.indigo : '#93C5FD',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          />
        ))}
        <button onClick={next} style={{ width: 32, height: 32, borderRadius: 999, border: `1px solid ${C.border}`, background: C.surface, color: C.slate, cursor: 'pointer' }}>
          <ChevronRight size={16} style={{ margin: 'auto' }} />
        </button>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, hint, accentIndex = 0 }) {
  const acc = METRIC_ACCENTS[accentIndex % METRIC_ACCENTS.length];
  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 10,
        background: C.surface,
        boxShadow: '0 4px 16px rgba(15,23,42,0.05)',
        borderTop: `3px solid ${acc.icon}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: acc.icon, fontSize: 11, fontWeight: 700 }}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: acc.bg,
            border: `1px solid ${acc.border}`,
          }}
        >
          <Icon size={13} />
        </span>
        {label}
      </div>
      <p style={{ margin: '6px 0 2px', fontSize: 22, fontWeight: 700, color: C.black, lineHeight: 1 }}>{value}</p>
      <p style={{ margin: 0, fontSize: 11, color: C.slateMid }}>{hint}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = (status || 'todo').replace('-', ' ');
  let color;
  if (status === 'done')             color = C.emerald;
  else if (status === 'in-progress') color = C.sky;
  else if (status === 'in-review')   color = C.indigo;
  else                               color = C.slate;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
      {s}
    </span>
  );
}

export default function DashboardPage() {
  const { user, isHROrAbove } = useAuth();
  const isManagementView = isHROrAbove;

  const [stats, setStats]             = useState(null);
  const [myTasks, setMyTasks]         = useState([]);
  const [allTasks, setAllTasks]       = useState([]);
  const [projects, setProjects]       = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [loading, setLoading]         = useState(true);

  const loadData = useCallback(async () => {
    try {
      const calls = [
        reportAPI.getDashboard().catch(() => null),
        taskAPI.getMy().catch(() => ({ data: { data: [] } })),
        leaveAPI.getBalance().catch(() => null),
      ];
      if (isManagementView) {
        calls.push(taskAPI.getAll().catch(() => ({ data: { data: [] } })));
        calls.push(projectAPI.getAll().catch(() => ({ data: { data: [] } })));
      }
      const result = await Promise.all(calls);
      setStats(result[0]?.data?.data || null);
      setMyTasks(result[1]?.data?.tasks || result[1]?.data?.data || []);
      setLeaveBalance(result[2]?.data?.summary || null);
      if (isManagementView) {
        setAllTasks(result[3]?.data?.tasks || result[3]?.data?.data || []);
        setProjects(result[4]?.data?.projects || result[4]?.data?.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, [isManagementView]);

  useEffect(() => { loadData(); }, [loadData]);

  const name            = user?.name?.split(' ')?.[0] || 'there';
  const greetingPrefix  = `${getGreeting()}, `;
  const fullGreeting    = `${greetingPrefix}${name}`;
  const today           = formatDayLabel(new Date());

  const [typedGreeting, setTypedGreeting] = useState('');
  const [showCaret, setShowCaret]         = useState(true);

  useEffect(() => {
    setTypedGreeting('');
    let idx = 0;
    const t = setInterval(() => {
      idx += 1;
      setTypedGreeting(fullGreeting.slice(0, idx));
      if (idx >= fullGreeting.length) clearInterval(t);
    }, 55);
    return () => clearInterval(t);
  }, [fullGreeting]);

  useEffect(() => {
    const t = setInterval(() => setShowCaret((p) => !p), 460);
    return () => clearInterval(t);
  }, []);

  // Task pool: manager/admin sees all tasks, employees see only their tasks
  // For employees, exclude backlog tasks from dashboard (backlog has its own page)
  const taskPool = isManagementView ? allTasks : myTasks;

  // For employees: active tasks only (non-backlog) for dashboard metrics
  const activeTasks = isManagementView
    ? taskPool
    : taskPool.filter(t => t.status !== 'backlog');

  const totalTasks     = activeTasks.length;
  const completedTasks = activeTasks.filter((t) => t.status === 'done').length;
  const inProgressTasks = activeTasks.filter((t) => t.status === 'in-progress').length;
  const overdueTasks   = activeTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
  ).length;
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const upcomingTasks = useMemo(
    () => [...activeTasks].filter((t) => t.dueDate).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 8),
    [activeTasks]
  );
  const recentUpdates = useMemo(
    () => [...activeTasks].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).slice(0, 8),
    [activeTasks]
  );
  const leaveSummaryItems = useMemo(() => {
    const items = [
      ['Approved', leaveBalance?.approved ?? 0],
      ['Pending', leaveBalance?.pending ?? 0],
      ['Rejected', leaveBalance?.rejected ?? 0],
    ];
    if (!isManagementView) {
      items.push(['Cancelled', leaveBalance?.cancelled ?? 0]);
    }
    return items;
  }, [leaveBalance, isManagementView]);

  const chartData = stats?.weeklyActivity || [];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  const leaveTileAccent = {
    Approved:  { bg: C.emeraldBg,  color: C.emerald },
    Pending:   { bg: C.amberBg,    color: C.amber   },
    Rejected:  { bg: '#FEF2F2',    color: '#DC2626' },
    Cancelled: { bg: C.surfaceAlt, color: C.slate   },
  };

  const actionAccent = [C.indigo, C.sky, C.amber, C.emerald];

  // ── Slides vary by role ────────────────────────────────────────────────────
  // Employee view: no backlog metrics, simpler action queue
  // Manager/Admin view: full operational overview

  /* ── Slide 1 : Overview ── */
  const slide1 = (
    <div key="overview" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.slateMid, fontWeight: 700 }}>
            {isManagementView ? 'Operations Snapshot' : 'My Work Overview'}
          </p>
          <h2 style={{ margin: '4px 0 0', fontSize: 22, color: C.black, fontWeight: 700 }}>
            {isManagementView ? (
              <>Large Scale Data{' '}<span style={{ color: '#2563EB' }}>Overview</span></>
            ) : (
              <>My Active <span style={{ color: '#2563EB' }}>Tasks</span></>
            )}
          </h2>
          <p style={{ margin: '4px 0 0', color: C.slateMid, fontSize: 12 }}>
            {isManagementView
              ? 'Unified metrics for workload, completion, and delivery status.'
              : 'Your active tasks and upcoming deadlines. Backlog tasks are in the Backlog section.'}
          </p>
        </div>
        <Link
          to="/tasks"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            textDecoration: 'none', fontSize: 12, fontWeight: 700,
            color: C.surface, border: 'none', borderRadius: 10,
            padding: '8px 12px', background: C.black,
          }}
        >
          Open Task Board
          <ArrowRight size={12} />
        </Link>
      </div>

      {/* Metrics grid — employee has no backlog/projects metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {isManagementView ? (
          <>
            <Metric icon={CheckSquare}   label="Total Tasks"   value={totalTasks}              hint="Across current scope"         accentIndex={0} />
            <Metric icon={Activity}      label="Completion"    value={`${completionRate}%`}    hint="Overall completion rate"      accentIndex={1} />
            <Metric icon={Clock}         label="In Progress"   value={inProgressTasks}         hint="Currently active"             accentIndex={2} />
            <Metric icon={AlertTriangle} label="Overdue"       value={overdueTasks}            hint="Need immediate action"        accentIndex={3} />
            <Metric icon={FolderKanban}  label="Projects"      value={projects.length}         hint="Tracked project spaces"       accentIndex={4} />
            <Metric icon={CalendarDays}  label="Leave Pending" value={leaveBalance?.pending ?? 0} hint="Requests waiting approval" accentIndex={5} />
          </>
        ) : (
          <>
            <Metric icon={CheckSquare}   label="Active Tasks"  value={totalTasks}              hint="Excluding backlog"            accentIndex={0} />
            <Metric icon={Activity}      label="Completion"    value={`${completionRate}%`}    hint="Your completion rate"         accentIndex={1} />
            <Metric icon={Clock}         label="In Progress"   value={inProgressTasks}         hint="Currently active"             accentIndex={2} />
            <Metric icon={AlertTriangle} label="Overdue"       value={overdueTasks}            hint="Need immediate action"        accentIndex={3} />
          </>
        )}
      </div>

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '9px 12px', borderBottom: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 12, fontWeight: 700, color: C.blackMid, display: 'flex', alignItems: 'center', gap: 8 }}>
          Upcoming deadlines and ownership
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
            <thead>
              <tr style={{ background: C.surface }}>
                {['Task', 'Project', 'Assignee', 'Due Date', 'Status'].map((head) => (
                  <th key={head} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: C.slateMid, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upcomingTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 14, textAlign: 'center', color: C.slateLight, fontSize: 12 }}>
                    No upcoming tasks found.
                  </td>
                </tr>
              ) : (
                upcomingTasks.map((task) => (
                  <tr key={task._id} style={{ transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceAlt}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '8px 12px', fontSize: 12, color: C.black, fontWeight: 600, borderBottom: `1px solid ${C.borderLight}`, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.title}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: C.slate, borderBottom: `1px solid ${C.borderLight}` }}>
                      {task.project?.name || 'No project'}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: C.slate, borderBottom: `1px solid ${C.borderLight}` }}>
                      {task.assignee?.name || user?.name || 'Unassigned'}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: C.slate, borderBottom: `1px solid ${C.borderLight}` }}>
                      {formatDayLabel(task.dueDate)}
                    </td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${C.borderLight}` }}>
                      <StatusBadge status={task.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  /* ── Slide 2 : Activity ── */
  const slide2 = (
    <div key="activity" className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-3">
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, padding: 12, background: C.surface }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, color: C.black, fontWeight: 700 }}>Weekly Throughput</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: C.slateMid }}>Tasks completed over the last 7 days</p>
          </div>
          <div style={{ fontSize: 11, color: C.slate, fontWeight: 600, border: `1px solid ${C.border}`, borderRadius: 8, padding: '4px 10px', background: C.surfaceAlt, flexShrink: 0, whiteSpace: 'nowrap' }}>
            {today}
          </div>
        </div>
        <div style={{ height: 220 }}>
          {chartData.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.slateLight, fontSize: 12 }}>
              No chart data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="throughputArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.sky} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={C.sky} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
                <XAxis dataKey="day" tick={{ fill: C.slateMid, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: C.slateMid, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, fontSize: 12 }} />
                <Area type="monotone" dataKey="tasks" stroke={C.sky} strokeWidth={2} fill="url(#throughputArea)" dot={{ fill: C.sky, r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, padding: 12, background: C.surface }}>
        <h3 style={{ margin: 0, fontSize: 16, color: C.black, fontWeight: 700 }}>Recent Updates</h3>
        <p style={{ margin: '4px 0 10px', fontSize: 12, color: C.slateMid }}>Latest changes in tasks and progress.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 250, overflowY: 'auto' }}>
          {recentUpdates.length === 0 ? (
            <div style={{ padding: 12, border: `1px dashed ${C.border}`, borderRadius: 12, color: C.slateLight, fontSize: 12 }}>
              No recent updates available.
            </div>
          ) : (
            recentUpdates.map((task) => (
              <div key={task._id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 12px', background: C.surface }}>
                <p style={{ margin: 0, fontSize: 12, color: C.black, fontWeight: 600 }}>{task.title}</p>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: C.slateMid }}>{task.project?.name || 'No project'}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <StatusBadge status={task.status} />
                  <span style={{ fontSize: 10, color: C.slateLight }}>{formatDayLabel(task.updatedAt || task.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  /* ── Slide 3 : Capacity / Action Queue ── */
  const slide3 = (
    <div key="capacity" className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, padding: 12, background: C.surface }}>
        <h3 style={{ margin: 0, fontSize: 16, color: C.black, fontWeight: 700 }}>Leave</h3>
        <p style={{ margin: '4px 0 14px', fontSize: 12, color: C.slateMid }}>Current leave ledger and request status.</p>
        {leaveBalance ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            {leaveSummaryItems.map(([label, value]) => {
              const acc = leaveTileAccent[label] || { bg: C.surfaceAlt, color: C.slate };
              return (
                <div key={label} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, background: C.surface, boxShadow: '0 1px 2px rgba(15,23,42,0.02)' }}>
                  <p style={{ margin: 0, fontSize: 11, color: acc.color, fontWeight: 700 }}>{label}</p>
                  <p style={{ margin: '8px 0 0', fontSize: 24, color: C.black, fontWeight: 700 }}>{value}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ border: `1px dashed ${C.border}`, borderRadius: 12, padding: 14, color: C.slateLight, fontSize: 12 }}>
            No leave summary available.
          </div>
        )}
      </div>

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, padding: 12, background: C.surface }}>
        <h3 style={{ margin: 0, fontSize: 16, color: C.black, fontWeight: 700 }}>Quick Links</h3>
        <p style={{ margin: '4px 0 14px', fontSize: 12, color: C.slateMid }}>Jump to key sections.</p>
        <div style={{ display: 'grid', gap: 10 }}>
          {(isManagementView ? [
            { to: '/tasks',         label: 'Review all tasks',        helper: `${totalTasks} active tasks in scope` },
            { to: '/projects',      label: 'Check project boards',    helper: `${projects.length} active projects` },
            { to: '/leaves',        label: 'Handle leave requests',   helper: `${leaveBalance?.pending ?? 0} pending approvals` },
            { to: '/announcements', label: 'Publish update',          helper: 'Share operations updates' },
          ] : [
            { to: '/tasks',         label: 'My task board',           helper: `${totalTasks} active tasks` },
            { to: '/leaves',        label: 'My leave requests',       helper: `${leaveBalance?.pending ?? 0} pending` },
            { to: '/announcements', label: 'Announcements',           helper: 'Latest updates from management' },
            { to: '/profile',       label: 'My profile',              helper: 'View and update your info' },
          ]).map((item, i) => (
            <Link
              key={item.to}
              to={item.to}
              style={{
                border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${actionAccent[i]}`,
                borderRadius: 12, padding: '10px 12px',
                textDecoration: 'none', color: C.black,
                background: C.surface, transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceAlt}
              onMouseLeave={(e) => e.currentTarget.style.background = C.surface}
            >
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>{item.label}</p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: C.slateMid }}>{item.helper}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );

  const slides = [slide1, slide2, slide3];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* ── Greeting header ── */}
      <section
        style={{
          padding: '4px 2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 420px', minWidth: 280 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.slateMid }}>
            Daily Greeting
          </p>
          <h1 style={{ margin: '2px 0 0', fontSize: 36, lineHeight: 1.1, color: C.black, fontWeight: 700 }}>
            <span>{typedGreeting.slice(0, greetingPrefix.length)}</span>
            <span style={{ color: '#2563EB' }}>{typedGreeting.slice(greetingPrefix.length)}</span>
            <span style={{ marginLeft: 2, color: '#2563EB', opacity: showCaret ? 1 : 0, transition: 'opacity 0.2s ease' }}>|</span>
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: C.slateMid }}>
            Welcome back. Today is {today}.{' '}
            {isManagementView ? 'Here is your expanded operational view.' : 'Here is your work summary.'}
          </p>
        </div>

        {/* ── Quick stats card ── */}
        <div
          style={{
            flex: '0 0 260px', width: '100%', maxWidth: 320,
            border: `1px solid ${C.border}`, borderRadius: 14,
            background: C.surface, padding: '8px 10px',
          }}
        >
          <p style={{ margin: 0, fontSize: 11, color: C.slateMid, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Quick Updates
          </p>
          <div style={{ marginTop: 6, display: 'grid', gap: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: C.slate }}>Overdue Tasks</span>
              <span style={{ color: C.amber, fontWeight: 700 }}>{overdueTasks}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: C.slate }}>Pending Leave</span>
              <span style={{ color: C.amber, fontWeight: 700 }}>{leaveBalance?.pending ?? 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: C.slate }}>In Progress</span>
              <span style={{ color: C.sky, fontWeight: 700 }}>{inProgressTasks}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: C.slate }}>Completed</span>
              <span style={{ color: C.emerald, fontWeight: 700 }}>{completedTasks}</span>
            </div>
          </div>
          <Link
            to="/tasks"
            style={{
              marginTop: 8, width: '100%',
              textDecoration: 'none', border: 'none',
              color: C.surface, background: C.black, borderRadius: 10,
              padding: '7px 10px', fontSize: 12, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <CheckSquare size={13} />
            Open Tasks
          </Link>
        </div>
      </section>

      <Carousel slides={slides} />
    </div>
  );
}

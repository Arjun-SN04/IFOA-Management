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

/* ─────────────────────────────────────────
   Colour palette — white primary, rich accents
   - Indigo   : primary actions, active states
   - Emerald  : success / completion
   - Amber    : warnings / overdue
   - Sky      : in-progress / activity
   - Black    : headings, strong labels
───────────────────────────────────────── */
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

/* Each metric card gets its own accent colour */
const METRIC_ACCENTS = [
  { bg: C.indigoBg,   border: C.indigoBorder,   icon: C.indigo  },   // Total Tasks
  { bg: C.emeraldBg,  border: C.emeraldBorder,  icon: C.emerald },   // Completion
  { bg: C.skyBg,      border: C.skyBorder,      icon: C.sky     },   // In Progress
  { bg: C.amberBg,    border: C.amberBorder,    icon: C.amber   },   // Overdue
  { bg: C.indigoBg,   border: C.indigoBorder,   icon: C.indigo  },   // Projects
  { bg: C.emeraldBg,  border: C.emeraldBorder,  icon: C.emerald },   // Leave Pending
];

function Carousel({ slides }) {
  const [index, setIndex] = useState(0);
  const total = slides.length;
  const prev = () => setIndex((i) => (i === 0 ? total - 1 : i - 1));
  const next = () => setIndex((i) => (i === total - 1 ? 0 : i + 1));

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ overflow: 'hidden', borderRadius: 24, border: `1px solid ${C.border}`, background: C.surface }}>
        <div
          style={{
            display: 'flex',
            width: `${total * 100}%`,
            transform: `translateX(-${(100 / total) * index}%)`,
            transition: 'transform 0.45s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          {slides.map((slide, idx) => (
            <section key={idx} style={{ width: `${100 / total}%`, padding: 28 }}>
              {slide}
            </section>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 12 }}>
        <button onClick={prev} style={{ width: 36, height: 36, borderRadius: 999, border: `1px solid ${C.border}`, background: C.surface, color: C.slate, cursor: 'pointer' }}>
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
        <button onClick={next} style={{ width: 36, height: 36, borderRadius: 999, border: `1px solid ${C.border}`, background: C.surface, color: C.slate, cursor: 'pointer' }}>
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
        borderRadius: 16,
        padding: 14,
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
      <p style={{ margin: '8px 0 2px', fontSize: 28, fontWeight: 700, color: C.black, lineHeight: 1 }}>{value}</p>
      <p style={{ margin: 0, fontSize: 11, color: C.slateMid }}>{hint}</p>
    </div>
  );
}

/* Coloured status badge */
function StatusBadge({ status }) {
  const s = (status || 'todo').replace('-', ' ');
  let bg, color;
  if (status === 'done')        { bg = C.emeraldBg;  color = C.emerald; }
  else if (status === 'in-progress') { bg = C.skyBg; color = C.sky;     }
  else if (status === 'review') { bg = C.indigoBg;   color = C.indigo;  }
  else                          { bg = C.surfaceAlt;  color = C.slate;  }
  return (
    <span style={{ background: bg, color, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
      {s}
    </span>
  );
}

export default function DashboardPage() {
  const { user, isManagerOrAdmin } = useAuth();

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
      if (isManagerOrAdmin) {
        calls.push(taskAPI.getAll().catch(() => ({ data: { data: [] } })));
        calls.push(projectAPI.getAll().catch(() => ({ data: { data: [] } })));
      }
      const result = await Promise.all(calls);
      setStats(result[0]?.data?.data || null);
      setMyTasks(result[1]?.data?.tasks || result[1]?.data?.data || []);
      setLeaveBalance(result[2]?.data?.summary || null);
      if (isManagerOrAdmin) {
        setAllTasks(result[3]?.data?.tasks || result[3]?.data?.data || []);
        setProjects(result[4]?.data?.projects || result[4]?.data?.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, [isManagerOrAdmin]);

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

  const taskPool       = isManagerOrAdmin ? allTasks : myTasks;
  const totalTasks     = taskPool.length;
  const completedTasks = taskPool.filter((t) => t.status === 'done').length;
  const inProgressTasks = taskPool.filter((t) => t.status === 'in-progress').length;
  const overdueTasks   = taskPool.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
  ).length;
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const upcomingTasks = useMemo(
    () => [...taskPool].filter((t) => t.dueDate).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 8),
    [taskPool]
  );
  const recentUpdates = useMemo(
    () => [...taskPool].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).slice(0, 8),
    [taskPool]
  );

  const chartData = stats?.weeklyActivity || [];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  /* ─── Leave tile colours ─── */
  const leaveTileAccent = {
    Approved:  { bg: C.emeraldBg,  color: C.emerald },
    Pending:   { bg: C.amberBg,    color: C.amber   },
    Rejected:  { bg: '#FEF2F2',    color: '#DC2626' },
    Cancelled: { bg: C.surfaceAlt, color: C.slate   },
  };

  /* ─── Action queue pill colours ─── */
  const actionAccent = [C.indigo, C.sky, C.amber, C.emerald];

  const slides = [
    /* ── Slide 1 : Overview ── */
    <div key="overview" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.slateMid, fontWeight: 700 }}>
            Operations Snapshot
          </p>
          <h2 style={{ margin: '6px 0 0', fontSize: 28, color: C.black, fontWeight: 700 }}>
            Large Scale Data{' '}
            <span style={{ color: '#2563EB' }}>Overview</span>
          </h2>
          <p style={{ margin: '6px 0 0', color: C.slateMid, fontSize: 13 }}>
            Unified metrics for workload, completion, and delivery status.
          </p>
        </div>
        <Link
          to="/tasks"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            textDecoration: 'none',
            fontSize: 12,
            fontWeight: 700,
            color: C.surface,
            border: 'none',
            borderRadius: 10,
            padding: '9px 14px',
            background: C.black,
          }}
        >
          Open Task Board
          <ArrowRight size={12} />
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <Metric icon={CheckSquare}  label="Total Tasks"   value={totalTasks}    hint="Across current scope"       accentIndex={0} />
        <Metric icon={Activity}     label="Completion"    value={`${completionRate}%`} hint="Overall completion rate" accentIndex={1} />
        <Metric icon={Clock}        label="In Progress"   value={inProgressTasks} hint="Currently active"         accentIndex={2} />
        <Metric icon={AlertTriangle} label="Overdue"      value={overdueTasks}  hint="Need immediate action"      accentIndex={3} />
        <Metric icon={FolderKanban} label="Projects"      value={isManagerOrAdmin ? projects.length : stats?.totalProjects ?? '-'} hint="Tracked project spaces" accentIndex={4} />
        <Metric icon={CalendarDays} label="Leave Pending" value={leaveBalance?.pending ?? 0} hint="Requests waiting approval" accentIndex={5} />
      </div>

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 12, fontWeight: 700, color: C.blackMid, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: C.indigo, display: 'inline-block' }} />
          Upcoming deadlines and ownership
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
            <thead>
              <tr style={{ background: C.surface }}>
                {['Task', 'Project', 'Assignee', 'Due Date', 'Status'].map((head) => (
                  <th key={head} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: C.slateMid, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upcomingTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 20, textAlign: 'center', color: C.slateLight, fontSize: 12 }}>
                    No upcoming tasks found.
                  </td>
                </tr>
              ) : (
                upcomingTasks.map((task) => (
                  <tr key={task._id} style={{ transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceAlt}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 14px', fontSize: 12, color: C.black, fontWeight: 600, borderBottom: `1px solid ${C.borderLight}`, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.title}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: C.slate, borderBottom: `1px solid ${C.borderLight}` }}>
                      {task.project?.name || 'No project'}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: C.slate, borderBottom: `1px solid ${C.borderLight}` }}>
                      {task.assignee?.name || user?.name || 'Unassigned'}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: C.slate, borderBottom: `1px solid ${C.borderLight}` }}>
                      {formatDayLabel(task.dueDate)}
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${C.borderLight}` }}>
                      <StatusBadge status={task.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>,

    /* ── Slide 2 : Activity ── */
    <div key="activity" style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16 }}>
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, background: C.surface }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, gap: 8, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, color: C.black, fontWeight: 700 }}>Weekly Throughput</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: C.slateMid }}>Tasks completed over the last 7 days</p>
          </div>
          <div style={{ fontSize: 11, color: C.slate, fontWeight: 600, border: `1px solid ${C.border}`, borderRadius: 8, padding: '4px 10px', background: C.surfaceAlt, flexShrink: 0, whiteSpace: 'nowrap' }}>
            {today}
          </div>
        </div>
        <div style={{ height: 290 }}>
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

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, background: C.surface }}>
        <h3 style={{ margin: 0, fontSize: 16, color: C.black, fontWeight: 700 }}>Recent Updates</h3>
        <p style={{ margin: '4px 0 12px', fontSize: 12, color: C.slateMid }}>Latest changes in tasks and progress.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 330, overflowY: 'auto' }}>
          {recentUpdates.length === 0 ? (
            <div style={{ padding: 12, border: `1px dashed ${C.border}`, borderRadius: 12, color: C.slateLight, fontSize: 12 }}>
              No recent updates available.
            </div>
          ) : (
            recentUpdates.map((task) => (
              <div
                key={task._id}
                style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 12px', background: C.surface }}
              >
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
    </div>,

    /* ── Slide 3 : Capacity ── */
    <div key="capacity" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, background: C.surface }}>
        <h3 style={{ margin: 0, fontSize: 16, color: C.black, fontWeight: 700 }}>Capacity and Leave</h3>
        <p style={{ margin: '4px 0 14px', fontSize: 12, color: C.slateMid }}>Current leave ledger and request pressure.</p>
        {leaveBalance ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {[
              ['Approved', leaveBalance.approved ?? 0],
              ['Pending',  leaveBalance.pending  ?? 0],
              ['Rejected', leaveBalance.rejected ?? 0],
              ['Cancelled',leaveBalance.cancelled?? 0],
            ].map(([label, value]) => {
              const acc = leaveTileAccent[label] || { bg: C.surfaceAlt, color: C.slate };
              return (
                <div key={label} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, background: acc.bg }}>
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

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, background: C.surface }}>
        <h3 style={{ margin: 0, fontSize: 16, color: C.black, fontWeight: 700 }}>Action Queue</h3>
        <p style={{ margin: '4px 0 14px', fontSize: 12, color: C.slateMid }}>Quick links for high-priority actions.</p>
        <div style={{ display: 'grid', gap: 10 }}>
          {[
            { to: '/tasks',         label: 'Review all tasks',        helper: `${totalTasks} total tasks in scope` },
            { to: '/projects',      label: 'Check project boards',    helper: `${isManagerOrAdmin ? projects.length : stats?.totalProjects ?? 0} active projects` },
            { to: '/leaves',        label: 'Handle leave requests',   helper: `${leaveBalance?.pending ?? 0} pending approvals` },
            { to: '/announcements', label: 'Publish update',          helper: 'Share operations updates' },
          ].map((item, i) => (
            <Link
              key={item.to}
              to={item.to}
              style={{
                border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${actionAccent[i]}`,
                borderRadius: 12,
                padding: '10px 12px',
                textDecoration: 'none',
                color: C.black,
                background: C.surface,
                transition: 'background 0.15s',
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
    </div>,
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Greeting header ── */}
      <section
        style={{
          padding: '8px 2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 18,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 420px', minWidth: 280 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.slateMid }}>
            Daily Greeting
          </p>
          <h1 style={{ margin: '4px 0 0', fontSize: 34, lineHeight: 1.1, color: C.black, fontWeight: 700 }}>
            <span>{typedGreeting.slice(0, greetingPrefix.length)}</span>
            <span style={{ color: '#2563EB' }}>{typedGreeting.slice(greetingPrefix.length)}</span>
            <span style={{ marginLeft: 2, color: '#2563EB', opacity: showCaret ? 1 : 0, transition: 'opacity 0.2s ease' }}>|</span>
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: 14, color: C.slateMid }}>
            Welcome back. Today is {today}. Here is your expanded operational view.
          </p>
        </div>

        {/* ── Quick stats card ── */}
        <div
          style={{
            flex: '0 0 260px',
            width: '100%',
            maxWidth: 320,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            background: C.surface,
            padding: '10px 12px',
          }}
        >
          <p style={{ margin: 0, fontSize: 11, color: C.slateMid, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Quick Updates
          </p>
          <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
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
              marginTop: 10,
              width: '100%',
              textDecoration: 'none',
              border: 'none',
              color: C.surface,
              background: C.black,
              borderRadius: 10,
              padding: '8px 10px',
              fontSize: 12,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
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

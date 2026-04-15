import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { reportAPI, taskAPI, leaveAPI, projectAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Avatar, Spinner, Badge } from '../../components/ui';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  FolderKanban, CheckSquare, CalendarDays, Users, ArrowRight, Clock,
  TrendingUp, AlertCircle, CheckCircle2, Zap, BarChart3, Activity,
  Plus, Award, Target, Briefcase, Plane, Wind
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function statusColor(s) {
  return {
    done:          '#10B981',
    'in-progress': '#1D4ED8',
    backlog:       '#6B7280',
    todo:          '#9CA3AF',
    'in-review':   '#3B82F6',
    blocked:       '#EF4444',
    cancelled:     '#D1D5DB',
    testing:       '#8B5CF6',
  }[s] || '#9CA3AF';
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Inject dashboard CSS once
const DASH_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap');

  .dash-root * { font-family: 'Outfit', sans-serif; box-sizing: border-box; }

  /* Stat cards */
  .dash-stat {
    border-radius: 20px; padding: 24px;
    position: relative; overflow: hidden;
    transition: transform 0.25s cubic-bezier(.22,1,.36,1), box-shadow 0.25s ease, opacity 0.25s ease;
    cursor: default;
    animation: slideUp 0.6s cubic-bezier(.22,1,.36,1) backwards;
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .dash-stat:hover { transform: translateY(-3px); box-shadow: 0 16px 48px rgba(37,99,235,0.12); }
  .dash-stat-ring {
    position: absolute; border-radius: 50%;
    background: rgba(255,255,255,0.1);
  }
  .dash-stat-val {
    font-family: 'Cormorant Garamond', serif;
    font-size: 42px; font-weight: 700; line-height: 1;
    margin-bottom: 4px;
  }
  .dash-stat-label { font-size: 13px; font-weight: 500; opacity: 0.75; }
  .dash-stat-sub   { font-size: 11px; opacity: 0.55; margin-top: 3px; }
  .dash-stat-icon  {
    width: 40px; height: 40px; border-radius: 12px;
    background: rgba(255,255,255,0.18);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 16px;
  }

  /* Cards */
  .dash-card {
    background: #FFFFFF;
    border: 1px solid #E5E7EB;
    border-radius: 20px; padding: 24px;
    transition: box-shadow 0.25s cubic-bezier(.22,1,.36,1), transform 0.25s ease, opacity 0.25s ease;
    animation: slideUp 0.6s cubic-bezier(.22,1,.36,1) backwards;
  }
  .dash-card:hover { box-shadow: 0 8px 32px rgba(37,99,235,0.08); transform: translateY(-2px); }
  .dash-card-title {
    font-size: 15px; font-weight: 600; color: #1F2937;
    margin-bottom: 4px;
  }
  .dash-card-sub { font-size: 12px; color: #6B7280; }

  /* Progress bar */
  .dash-progress-track {
    height: 8px; border-radius: 100px;
    background: #E5E7EB; overflow: hidden;
    margin-top: 8px;
  }
  .dash-progress-fill {
    height: 100%; border-radius: 100px;
    transition: width 0.8s cubic-bezier(0.16,1,0.3,1);
  }

  /* Activity item */
  .dash-activity-item {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 10px 0; border-bottom: 1px solid #F3F4F6;
    transition: background 0.15s; border-radius: 12px;
  }
  .dash-activity-item:last-child { border-bottom: none; }

  /* Task item */
  .dash-task-item {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 12px; border-radius: 12px;
    transition: background 0.15s; cursor: pointer;
  }
  .dash-task-item:hover { background: #F3F4F6; }

  /* Status pill */
  .dash-status-pill {
    font-size: 11px; font-weight: 600;
    padding: 3px 10px; border-radius: 100px;
    text-transform: capitalize; flex-shrink: 0;
  }

  /* Section header */
  .dash-section-row {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 20px;
  }
  .dash-link {
    font-size: 12px; font-weight: 600;
    color: #2563EB; text-decoration: none;
    display: flex; align-items: center; gap: 4px;
    transition: color 0.2s;
  }
  .dash-link:hover { color: #1D4ED8; }

  /* Quick actions */
  .dash-quick-grid {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
    margin-top: 16px;
  }
  .dash-quick-btn {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 14px; border-radius: 14px;
    background: #F8FAFF;
    border: 1px solid #DBEAFE;
    color: #2563EB; font-size: 12px; font-weight: 600;
    text-decoration: none; transition: all 0.2s;
  }
  .dash-quick-btn:hover {
    background: #EFF6FF;
    border-color: #60A5FA;
    color: #1D4ED8;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(37,99,235,0.1);
  }

  /* Avatar initial */
  .dash-avatar {
    width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; color: white;
    background: linear-gradient(135deg, #2563EB, #1D4ED8);
    position: relative;
  }

  /* Live indicator */
  .dash-live-dot {
    display: inline-flex; align-items: center; gap: 5px;
  }
  .dash-live-ping {
    position: relative; width: 8px; height: 8px;
  }
  .dash-live-ping::before {
    content: '';
    position: absolute; inset: 0; border-radius: 50%;
    background: #2563EB;
    animation: lp-ping 2s cubic-bezier(0,0,0.2,1) infinite;
  }
  .dash-live-ping::after {
    content: '';
    position: absolute; inset: 1px; border-radius: 50%;
    background: #2563EB;
  }
  @keyframes lp-ping {
    75%,100% { transform: scale(2.2); opacity: 0; }
  }

  /* Hero greeting banner */
  .dash-hero {
    border-radius: 24px; padding: 32px;
    position: relative; overflow: hidden;
    min-height: 160px; display: flex; align-items: center;
  }
  .dash-hero-bg {
    position: absolute; inset: 0;
    background-image: url('https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=1400&q=70');
    background-size: cover; background-position: center 40%;
  }
  .dash-hero-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(110deg, rgba(15,23,42,0.75) 0%, rgba(15,23,42,0.55) 60%, rgba(37,99,235,0.15) 100%);
  }
  .dash-hero-content { position: relative; z-index: 1; }

  /* Filter tabs */
  .dash-tabs {
    display: flex; background: #F3F4F6;
    border-radius: 10px; padding: 3px; gap: 2px;
  }
  .dash-tab {
    padding: 6px 14px; border-radius: 8px;
    font-size: 12px; font-weight: 600;
    border: none; cursor: pointer; transition: all 0.2s;
    background: transparent; color: #6B7280;
  }
  .dash-tab.active { background: #FFFFFF; color: #2563EB; box-shadow: 0 1px 4px rgba(37,99,235,0.1); }
`;

function DashCSS() {
  return <style dangerouslySetInnerHTML={{ __html: DASH_CSS }} />;
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, bg, color, textColor = '#FFF', sub, trend }) {
  return (
    <div className="dash-stat" style={{ background: bg, color: textColor }}>
      <div className="dash-stat-ring" style={{ width: 100, height: 100, top: -30, right: -30 }} />
      <div className="dash-stat-ring" style={{ width: 60, height: 60, bottom: -20, right: 16, background: 'rgba(255,255,255,0.06)' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div className="dash-stat-icon"><Icon size={18} color={textColor} /></div>
        {trend && (
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, background: 'rgba(255,255,255,0.18)', fontWeight: 600 }}>
            {trend}
          </span>
        )}
      </div>
      <div className="dash-stat-val" style={{ color: textColor }}>{value ?? '—'}</div>
      <div className="dash-stat-label">{label}</div>
      {sub && <div className="dash-stat-sub">{sub}</div>}
    </div>
  );
}

// ── Activity Item ─────────────────────────────────────────────────────────────
function ActivityItem({ task }) {
  const sc = statusColor(task.status);
  return (
    <div className="dash-activity-item">
      <div className="dash-avatar">
        {task.assignee?.name?.charAt(0) || '?'}
        <span style={{
          position: 'absolute', bottom: -1, right: -1,
          width: 10, height: 10, borderRadius: '50%',
          background: sc, border: '2px solid #FFFFFF'
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#2A1F0E', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.title}
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
          <span style={{ fontSize: 11, color: '#9B8272' }}>{task.project?.name || 'No project'}</span>
          <span style={{ color: '#D4C4B0' }}>·</span>
          <span style={{ fontSize: 11, color: '#9B8272' }}>{timeAgo(task.updatedAt || task.createdAt)}</span>
        </div>
      </div>
      <span className="dash-status-pill" style={{ background: sc + '18', color: sc }}>
        {task.status?.replace('-', ' ')}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { user, isManagerOrAdmin } = useAuth();
  const { taskEvents } = useNotifications();

  const [stats, setStats]             = useState(null);
  const [myTasks, setMyTasks]         = useState([]);
  const [allTasks, setAllTasks]       = useState([]);
  const [projects, setProjects]       = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [loading, setLoading]         = useState(true);

  const loadAll = useCallback(async () => {
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
      const results = await Promise.all(calls);
      setStats(results[0]?.data?.data || null);
      setMyTasks(results[1]?.data?.data || results[1]?.data?.tasks || []);
      setLeaveBalance(results[2]?.data?.data || null);
      if (isManagerOrAdmin) {
        setAllTasks(results[3]?.data?.data || results[3]?.data?.tasks || []);
        setProjects(results[4]?.data?.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, [isManagerOrAdmin]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (!taskEvents) return;
    const { type, payload } = taskEvents;
    if (type === 'created') {
      setAllTasks(prev => [payload, ...prev]);
    } else if (type === 'updated' || type === 'statusChanged') {
      const updated = payload.task || payload;
      setAllTasks(prev => prev.map(t => t._id === updated._id ? { ...t, ...updated } : t));
      setMyTasks(prev => prev.map(t => t._id === updated._id ? { ...t, ...updated } : t));
    } else if (type === 'deleted') {
      setAllTasks(prev => prev.filter(t => t._id !== payload.taskId));
      setMyTasks(prev => prev.filter(t => t._id !== payload.taskId));
    }
  }, [taskEvents]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <Spinner size="lg" />
    </div>
  );

  return (
    <>
      <DashCSS />
      <div className="dash-root">
        {isManagerOrAdmin
          ? <AdminDashboard stats={stats} allTasks={allTasks} projects={projects} user={user} />
          : <UserDashboard  stats={stats} myTasks={myTasks}  leaveBalance={leaveBalance} user={user} />}
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function AdminDashboard({ stats, allTasks, projects, user }) {
  const totalTasks = allTasks.length;
  const doneTasks  = allTasks.filter(t => t.status === 'done').length;
  const inProgress = allTasks.filter(t => t.status === 'in-progress').length;
  const blocked    = allTasks.filter(t => t.status === 'blocked').length;
  const overallPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const activityData  = stats?.weeklyActivity || [];
  const statusPieData = [
    { name: 'Done',        value: doneTasks,                                              fill: '#10B981' },
    { name: 'In Progress', value: inProgress,                                             fill: '#2563EB' },
    { name: 'In Review',   value: allTasks.filter(t => t.status === 'in-review').length,  fill: '#3B82F6' },
    { name: 'To Do',       value: allTasks.filter(t => t.status === 'todo').length,       fill: '#9CA3AF' },
    { name: 'Blocked',     value: blocked,                                                fill: '#EF4444' },
  ].filter(d => d.value > 0);

  const projectHealth = projects.map(p => {
    const pt   = allTasks.filter(t => (t.project?._id || t.project) === p._id);
    const done = pt.filter(t => t.status === 'done').length;
    const blk  = pt.filter(t => t.status === 'blocked').length;
    return { ...p, total: pt.length, done, blocked: blk, pct: pt.length ? Math.round((done / pt.length) * 100) : 0 };
  }).filter(p => p.total > 0).sort((a, b) => b.total - a.total).slice(0, 6);

  const recentActivity = [...allTasks]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 8);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Hero greeting ── */}
      <div className="dash-hero">
        <div className="dash-hero-bg" />
        <div className="dash-hero-overlay" />
        <div className="dash-hero-content" style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ fontSize: 13, color: 'rgba(96,165,250,0.85)', fontWeight: 500, margin: '0 0 6px', letterSpacing: '0.04em' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · Admin Overview
              </p>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: '#FFFFFF', margin: 0, fontFamily: "'Cormorant Garamond', serif" }}>
                {getGreeting()}, {user?.name?.split(' ')[0]} ✈️
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '6px 0 0' }}>
                IFOA Management Platform · Command Centre
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to="/tasks" style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', borderRadius: 100,
                background: '#2563EB', color: '#FFFFFF',
                fontSize: 13, fontWeight: 700, textDecoration: 'none',
                transition: 'all 0.2s', whiteSpace: 'nowrap',
              }}>
                <Plus size={15} /> New Task
              </Link>
              <Link to="/reports" style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', borderRadius: 100,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}>
                <BarChart3 size={15} /> Reports
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        <StatCard label="Total Projects" value={stats?.totalProjects ?? projects.length} icon={FolderKanban}
          bg="linear-gradient(135deg, #1F2937 0%, #374151 100%)" trend={`${overallPct}%`} sub="Active workspace" />
        <StatCard label="Total Tasks"    value={totalTasks}  icon={CheckSquare}
          bg="linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" sub={`${doneTasks} completed`} />
        <StatCard label="In Progress"    value={inProgress}  icon={Activity}
          bg="linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)" sub="Active right now" />
        <StatCard label="Team Members"   value={stats?.totalUsers ?? '—'} icon={Users}
          bg="linear-gradient(135deg, #10B981 0%, #059669 100%)" sub={`${blocked} blocked`} />
      </div>

      {/* ── Overall progress ── */}
      <div className="dash-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div className="dash-card-title">Overall Workspace Progress</div>
            <div className="dash-card-sub">{doneTasks} of {totalTasks} tasks complete</div>
          </div>
          <span style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 36, fontWeight: 700,
            color: overallPct >= 75 ? '#10B981' : overallPct >= 40 ? '#2563EB' : '#F97316'
          }}>{overallPct}%</span>
        </div>
        <div className="dash-progress-track">
          <div className="dash-progress-fill" style={{
            width: `${overallPct}%`,
            background: overallPct >= 75
              ? 'linear-gradient(90deg, #10B981, #059669)'
              : 'linear-gradient(90deg, #2563EB, #1D4ED8)',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
          {statusPieData.map(d => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.fill, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#6B7280' }}>{d.name}: <strong style={{ color: '#1F2937' }}>{d.value}</strong></span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Activity */}
        <div className="dash-card">
          <div className="dash-section-row">
            <div>
              <div className="dash-card-title">Weekly Activity</div>
              <div className="dash-card-sub">Task completions over the past 7 days</div>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(184,134,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={16} color="#B8860B" />
            </div>
          </div>
          {activityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#B8860B" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#B8860B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,134,11,0.08)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9B8272' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9B8272' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid rgba(184,134,11,0.15)', fontSize: 12, fontFamily: 'Outfit' }} />
                <Area type="monotone" dataKey="tasks" stroke="#B8860B" strokeWidth={2.5} fill="url(#adminGrad)"
                  dot={{ fill: '#B8860B', strokeWidth: 0, r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
              <Activity size={32} color="rgba(184,134,11,0.2)" />
              <p style={{ fontSize: 13, color: '#9B8272' }}>No activity data yet</p>
            </div>
          )}
        </div>

        {/* Status donut */}
        <div className="dash-card">
          <div className="dash-section-row">
            <div>
              <div className="dash-card-title">Task Status</div>
              <div className="dash-card-sub">Live breakdown</div>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(92,122,62,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={16} color="#5C7A3E" />
            </div>
          </div>
          {statusPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">
                  {statusPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(184,134,11,0.15)', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 11, color: '#7A6648' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: '#9B8272' }}>No task data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Project health */}
        <div className="dash-card">
          <div className="dash-section-row">
            <div>
              <div className="dash-card-title">Project Health</div>
              <div className="dash-card-sub">Completion rate per project</div>
            </div>
            <Link to="/projects" className="dash-link">View all <ArrowRight size={12} /></Link>
          </div>
          {projectHealth.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Briefcase size={32} color="rgba(184,134,11,0.2)" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, color: '#9B8272' }}>No projects with tasks yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {projectHealth.map(p => (
                <div key={p._id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#2A1F0E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </span>
                      {p.blocked > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, color: '#A0432A', fontWeight: 600, flexShrink: 0 }}>
                          <AlertCircle size={12} />{p.blocked}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: '#9B8272' }}>{p.done}/{p.total}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: p.pct >= 75 ? '#5C7A3E' : p.pct >= 40 ? '#B8860B' : '#9B8272' }}>
                        {p.pct}%
                      </span>
                    </div>
                  </div>
                  <div className="dash-progress-track" style={{ height: 6 }}>
                    <div className="dash-progress-fill" style={{
                      width: `${p.pct}%`,
                      background: p.pct >= 75 ? '#5C7A3E' : p.pct >= 40 ? '#B8860B' : '#B5A99A',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="dash-card">
          <div className="dash-section-row">
            <div>
              <div className="dash-card-title">Live Activity Feed</div>
              <div className="dash-card-sub">Most recently updated tasks</div>
            </div>
            <div className="dash-live-dot">
              <div className="dash-live-ping" />
              <span style={{ fontSize: 11, color: '#5C7A3E', fontWeight: 600 }}>Live</span>
            </div>
          </div>
          {recentActivity.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Activity size={32} color="rgba(184,134,11,0.2)" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, color: '#9B8272' }}>No activity yet</p>
            </div>
          ) : (
            <div>{recentActivity.map(task => <ActivityItem key={task._id} task={task} />)}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// USER DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function UserDashboard({ stats, myTasks, leaveBalance, user }) {
  const [taskFilter, setTaskFilter] = useState('active');

  const totalTasks   = myTasks.length;
  const doneTasks    = myTasks.filter(t => t.status === 'done').length;
  const activeTasks  = myTasks.filter(t => t.status !== 'done').length;
  const inProgress   = myTasks.filter(t => t.status === 'in-progress').length;
  const overdueTasks = myTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length;
  const myPct        = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const displayedTasks = taskFilter === 'done'
    ? myTasks.filter(t => t.status === 'done')
    : myTasks.filter(t => t.status !== 'done');

  const statusBreakdown = [
    { name: 'Done',        value: doneTasks,   fill: '#10B981' },
    { name: 'In Progress', value: inProgress,  fill: '#2563EB' },
    { name: 'In Review',   value: myTasks.filter(t => t.status === 'in-review').length, fill: '#3B82F6' },
    { name: 'To Do',       value: myTasks.filter(t => t.status === 'todo').length,      fill: '#9CA3AF' },
    { name: 'Blocked',     value: myTasks.filter(t => t.status === 'blocked').length,   fill: '#EF4444' },
  ].filter(d => d.value > 0);

  const activityData = stats?.weeklyActivity || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Hero greeting ── */}
      <div className="dash-hero">
        <div className="dash-hero-bg" />
        <div className="dash-hero-overlay" />
        <div className="dash-hero-content" style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ fontSize: 13, color: 'rgba(96,165,250,0.85)', fontWeight: 500, margin: '0 0 6px', letterSpacing: '0.04em' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: '#FFFFFF', margin: 0, fontFamily: "'Cormorant Garamond', serif" }}>
                {getGreeting()}, {user?.name?.split(' ')[0]}! ✈️
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '6px 0 0', textTransform: 'capitalize' }}>
                {user?.department} · {user?.role}
              </p>
              {overdueTasks > 0 && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12,
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 100, padding: '5px 12px'
                }}>
                  <AlertCircle size={12} color="#EF4444" />
                  <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>
                    {overdueTasks} overdue task{overdueTasks !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
            {/* Circular progress */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ position: 'relative', width: 80, height: 80 }}>
                <svg width="80" height="80" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#2563EB" strokeWidth="3"
                    strokeDasharray={`${myPct} ${100 - myPct}`} strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Cormorant Garamond', serif" }}>
                    {myPct}%
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Tasks done</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        <StatCard label="My Tasks"    value={totalTasks} icon={CheckSquare}
          bg="linear-gradient(135deg, #1F2937 0%, #374151 100%)" sub="All assigned tasks" />
        <StatCard label="Completed"   value={doneTasks}  icon={CheckCircle2}
          bg="linear-gradient(135deg, #10B981 0%, #059669 100%)" sub="Tasks finished" />
        <StatCard label="In Progress" value={inProgress} icon={Clock}
          bg="linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" sub="Active right now" />
        <StatCard label="Leave Days"  value={leaveBalance ? `${leaveBalance.annual ?? 0}` : '—'} icon={CalendarDays}
          bg="linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)" sub="Annual remaining" />
      </div>

      {/* ── Charts + Task split ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="dash-card">
          <div className="dash-section-row">
            <div>
              <div className="dash-card-title">My Activity</div>
              <div className="dash-card-sub">Task updates this week</div>
            </div>
            <TrendingUp size={16} color="#B8860B" />
          </div>
          {activityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#5C7A3E" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#5C7A3E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,134,11,0.08)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9B8272' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9B8272' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid rgba(184,134,11,0.15)', fontSize: 12 }} />
                <Area type="monotone" dataKey="tasks" stroke="#5C7A3E" strokeWidth={2.5} fill="url(#userGrad)"
                  dot={{ fill: '#5C7A3E', strokeWidth: 0, r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
              <Activity size={32} color="rgba(184,134,11,0.2)" />
              <p style={{ fontSize: 13, color: '#9B8272' }}>No activity data yet</p>
            </div>
          )}
        </div>

        <div className="dash-card">
          <div className="dash-section-row">
            <div className="dash-card-title">My Task Split</div>
            <Award size={16} color="#2563EB" />
          </div>
          {statusBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                    {statusBreakdown.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 11, background: '#FFFFFF' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {statusBreakdown.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.fill }} />
                      <span style={{ fontSize: 12, color: '#6B7280' }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1F2937' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <CheckSquare size={32} color="rgba(37,99,235,0.1)" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, color: '#6B7280' }}>No tasks yet</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Tasks + Leave ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* My tasks */}
        <div className="dash-card">
          <div className="dash-section-row">
            <div className="dash-card-title">My Tasks</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="dash-tabs">
                <button className={`dash-tab ${taskFilter === 'active' ? 'active' : ''}`}
                  onClick={() => setTaskFilter('active')}>
                  Active ({activeTasks})
                </button>
                <button className={`dash-tab ${taskFilter === 'done' ? 'active' : ''}`}
                  onClick={() => setTaskFilter('done')}>
                  Done ({doneTasks})
                </button>
              </div>
              <Link to="/tasks" className="dash-link">All <ArrowRight size={12} /></Link>
            </div>
          </div>

          {displayedTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <CheckSquare size={32} color="rgba(184,134,11,0.2)" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, color: '#9B8272' }}>
                {taskFilter === 'done' ? 'No completed tasks yet' : "You're all caught up!"}
              </p>
            </div>
          ) : (
            <div>
              {displayedTasks.slice(0, 6).map(task => {
                const sc = statusColor(task.status);
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
                return (
                  <div key={task._id} className="dash-task-item">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 13, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        color: task.status === 'done' ? '#B5A99A' : '#2A1F0E',
                        textDecoration: task.status === 'done' ? 'line-through' : 'none',
                      }}>{task.title}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: '#9B8272' }}>{task.project?.name || 'No project'}</span>
                        {isOverdue && (
                          <span style={{ fontSize: 11, color: '#A0432A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <AlertCircle size={10} /> Overdue
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="dash-status-pill" style={{ background: sc + '18', color: sc }}>
                      {task.status?.replace('-', ' ')}
                    </span>
                  </div>
                );
              })}
              {displayedTasks.length > 6 && (
                <Link to="/tasks" className="dash-link" style={{ justifyContent: 'center', display: 'flex', paddingTop: 12 }}>
                  +{displayedTasks.length - 6} more <ArrowRight size={12} />
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Leave + Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="dash-card">
            <div className="dash-section-row">
              <div>
                <div className="dash-card-title">Leave Balance</div>
                <div className="dash-card-sub">Remaining days by type</div>
              </div>
              <Link to="/leaves" className="dash-link">Apply <ArrowRight size={12} /></Link>
            </div>
            {leaveBalance ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Annual', key: 'annual', color: '#B8860B', max: 21 },
                  { label: 'Sick',   key: 'sick',   color: '#9B6B3A', max: 10 },
                  { label: 'Casual', key: 'casual', color: '#5C7A3E', max: 7  },
                ].map(({ label, key, color, max }) => {
                  const val = leaveBalance[key] ?? 0;
                  const pct = Math.min(100, Math.round((val / max) * 100));
                  return (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#4A3820' }}>{label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color }}>{val} days</span>
                      </div>
                      <div className="dash-progress-track" style={{ height: 6 }}>
                        <div className="dash-progress-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#9B8272', textAlign: 'center', padding: '16px 0' }}>Leave balance not available</p>
            )}
          </div>

          {/* Quick actions */}
          <div style={{
            borderRadius: 20, padding: 24, overflow: 'hidden', position: 'relative',
            background: '#FFFFFF', border: '1px solid #E5E7EB',
            animation: 'slideUp 0.6s cubic-bezier(.22,1,.36,1) 0.2s backwards',
          }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(37,99,235,0.04)' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', marginBottom: 14, position: 'relative' }}>
              Quick Actions
            </p>
            <div className="dash-quick-grid" style={{ position: 'relative' }}>
              {[
                { icon: CalendarDays, label: 'Apply Leave',   to: '/leaves' },
                { icon: FolderKanban, label: 'Projects',      to: '/projects' },
                { icon: CheckSquare,  label: 'My Tasks',      to: '/tasks' },
                { icon: Zap,          label: 'Sprint Board',  to: '/sprints' },
              ].map(({ icon: Icon, label, to }) => (
                <Link key={to} to={to} className="dash-quick-btn">
                  <Icon size={13} color="#2563EB" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { reportAPI } from '../../api';
import { Card, Spinner, PageHeader, Badge } from '../../components/ui';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar
} from 'recharts';
import {
  BarChart3, FolderKanban, Users, RefreshCw,
  TrendingUp, CheckCircle2, Clock, AlertTriangle,
  CalendarDays, Target, Layers, Award
} from 'lucide-react';

// ── Color palette ──────────────────────────────────────────────────────────
const STATUS_COLORS = {
  todo:          { fill: '#94a3b8', label: 'To Do' },
  'in-progress': { fill: '#3b82f6', label: 'In Progress' },
  'in-review':   { fill: '#f59e0b', label: 'In Review' },
  done:          { fill: '#10b981', label: 'Done' },
  blocked:       { fill: '#ef4444', label: 'Blocked' },
};
const PROJECT_STATUS_COLORS = {
  planning:      '#6366f1',
  active:        '#3b82f6',
  'in-progress': '#3b82f6',
  completed:     '#10b981',
  'on-hold':     '#f59e0b',
  cancelled:     '#ef4444',
};
const TEAM_PALETTE = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#f97316'];

// ── Reusable stat card ─────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color = 'blue', trend }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   val: 'text-blue-700' },
    green:  { bg: 'bg-emerald-50',icon: 'text-emerald-600',val: 'text-emerald-700' },
    amber:  { bg: 'bg-amber-50',  icon: 'text-amber-600',  val: 'text-amber-700' },
    red:    { bg: 'bg-red-50',    icon: 'text-red-600',    val: 'text-red-700' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', val: 'text-purple-700' },
  };
  const c = colors[color] || colors.blue;
  return (
    <Card className="p-5 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${c.bg}`} style={{ flexShrink: 0 }}>
        <Icon className={`w-5 h-5 ${c.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
        <p className={`text-2xl font-bold ${c.val} leading-none`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        {trend !== undefined && (
          <div className="mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-emerald-600 font-medium">{trend}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Progress bar row ───────────────────────────────────────────────────────
function ProgressRow({ label, value, max, color, sub }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-700 truncate pr-3">{label}</span>
        <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
          {sub && <span className="text-xs text-slate-400">{sub}</span>}
          <span className="text-sm font-bold text-slate-900 w-10 text-right">{pct}%</span>
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color || '#3b82f6' }}
        />
      </div>
    </div>
  );
}

// ── Custom tooltip ─────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      {label && <p className="font-semibold text-slate-800 mb-1 capitalize">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill || p.color, flexShrink: 0 }} />
          <span className="text-slate-600 capitalize">{p.name}:</span>
          <span className="font-semibold text-slate-900">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function ReportsPage() {
  const [dashStats, setDashStats]       = useState(null);
  const [projectReport, setProjectReport] = useState([]);
  const [userReport, setUserReport]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [tab, setTab]                   = useState('overview');
  const [lastUpdated, setLastUpdated]   = useState(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [dRes, pRes, uRes] = await Promise.all([
        reportAPI.getDashboard().catch(() => null),
        reportAPI.getProjectReport().catch(() => ({ data: { data: [] } })),
        reportAPI.getUserReport().catch(() => ({ data: { data: [] } })),
      ]);
      setDashStats(dRes?.data?.data || null);
      setProjectReport(pRes?.data?.data || []);
      setUserReport(uRes?.data?.data || []);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  );

  // ── Derived data ──────────────────────────────────────────────────────────
  const taskStatusData = (dashStats?.tasksByStatus || []).map(s => ({
    name: STATUS_COLORS[s._id]?.label || s._id,
    count: s.count,
    fill: STATUS_COLORS[s._id]?.fill || '#94a3b8',
  }));

  const projectStatusData = (dashStats?.projectsByStatus || []).map(s => ({
    name: s._id ? (s._id.charAt(0).toUpperCase() + s._id.slice(1).replace('-', ' ')) : 'Unknown',
    count: s.count,
    fill: PROJECT_STATUS_COLORS[s._id] || '#94a3b8',
  }));

  const totalTasks      = taskStatusData.reduce((a, d) => a + d.count, 0);
  const doneTasks       = taskStatusData.find(d => d.name === 'Done')?.count || 0;
  const inProgressTasks = taskStatusData.find(d => d.name === 'In Progress')?.count || 0;
  const blockedTasks    = taskStatusData.find(d => d.name === 'Blocked')?.count || 0;
  const overallRate     = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const tabs = [
    { key: 'overview', label: 'Overview',  icon: BarChart3 },
    { key: 'projects', label: 'Projects',  icon: FolderKanban },
    { key: 'team',     label: 'Team',      icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-center">
          <PageHeader
            title="Reports & Analytics"
            subtitle="Live insights across projects, tasks, and team performance"
          />
        </div>
        <div className="flex items-center justify-center gap-3">
          {lastUpdated && (
            <p className="text-xs text-slate-400 hidden sm:block">
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 -mb-px transition-colors
                ${tab === key
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          OVERVIEW TAB
      ════════════════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="space-y-6">

          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={Users}        label="Team Members"    value={dashStats?.totalUsers    ?? '—'} color="blue"   sub="Active employees" />
            <KpiCard icon={FolderKanban} label="Active Projects" value={dashStats?.totalProjects ?? '—'} color="purple" sub="In workspace" />
            <KpiCard icon={CheckCircle2} label="Tasks Completed" value={doneTasks}                       color="green"  sub={`of ${totalTasks} total`} trend={`${overallRate}% completion rate`} />
            <KpiCard icon={CalendarDays} label="Pending Leaves"  value={dashStats?.pendingLeaves ?? '—'} color={dashStats?.pendingLeaves > 0 ? 'amber' : 'green'} sub="Awaiting review" />
          </div>

          {/* Second KPI row — task health */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={Clock}         label="In Progress"    value={inProgressTasks}  color="blue"  sub="Tasks being worked on" />
            <KpiCard icon={AlertTriangle} label="Blocked Tasks"  value={blockedTasks}     color={blockedTasks > 0 ? 'red' : 'green'} sub={blockedTasks > 0 ? 'Need attention' : 'None blocked'} />
            <KpiCard icon={Target}        label="Completion Rate" value={`${overallRate}%`} color={overallRate >= 75 ? 'green' : overallRate >= 50 ? 'amber' : 'red'} sub="Overall task rate" />
            <KpiCard icon={Layers}        label="Total Tasks"    value={totalTasks}       color="purple" sub="Across all projects" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Tasks by Status — colored donut with legend */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Tasks by Status</h3>
              <p className="text-xs text-slate-400 mb-4">Distribution of all tasks across workflow stages</p>
              {taskStatusData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="55%" height={220}>
                    <PieChart>
                      <Pie
                        data={taskStatusData}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={85}
                        paddingAngle={3}
                        dataKey="count"
                      >
                        {taskStatusData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Custom legend */}
                  <div className="flex-1 space-y-2.5">
                    {taskStatusData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill, flexShrink: 0 }} />
                          <span className="text-xs text-slate-600">{d.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{d.count}</span>
                          <span className="text-xs text-slate-400 w-8 text-right">
                            {totalTasks > 0 ? Math.round((d.count / totalTasks) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-slate-400">
                  <Layers className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">No task data yet</p>
                </div>
              )}
            </Card>

            {/* Projects by Status — colored bar chart */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Projects by Status</h3>
              <p className="text-xs text-slate-400 mb-4">Count of projects in each lifecycle stage</p>
              {projectStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={projectStatusData} barSize={36}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {projectStatusData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-slate-400">
                  <FolderKanban className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">No project data yet</p>
                </div>
              )}
            </Card>
          </div>

          {/* Recent tasks activity */}
          {dashStats?.recentTasks?.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Recent Task Activity</h3>
              <div className="space-y-3">
                {dashStats.recentTasks.slice(0, 6).map((task, i) => {
                  const sc = STATUS_COLORS[task.status] || { fill: '#94a3b8', label: task.status };
                  return (
                    <div key={task._id || i} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: sc.fill, flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                        <p className="text-xs text-slate-400">{task.project?.name || '—'}</p>
                      </div>
                      <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: sc.fill + '20', color: sc.fill }}>
                          {sc.label}
                        </span>
                        {task.assignee?.name && (
                          <span className="text-xs text-slate-400">{task.assignee.name}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          PROJECTS TAB
      ════════════════════════════════════════════════════════════════════ */}
      {tab === 'projects' && (
        <div className="space-y-4">
          {projectReport.length === 0 ? (
            <Card className="p-12 text-center">
              <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No project data available</p>
            </Card>
          ) : (
            <>
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard icon={FolderKanban} label="Total Projects"   value={projectReport.length}                                                         color="blue" />
                <KpiCard icon={CheckCircle2} label="Completed"        value={projectReport.filter(p => p.status === 'completed').length}                    color="green" />
                <KpiCard icon={Clock}        label="In Progress"      value={projectReport.filter(p => p.status === 'in-progress' || p.status === 'active').length} color="purple" />
                <KpiCard icon={Target}       label="Avg Completion"   value={`${Math.round(projectReport.reduce((a, p) => a + p.completionRate, 0) / (projectReport.length || 1))}%`} color="amber" />
              </div>

              {/* Completion rate visual per project */}
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Project Completion Rates</h3>
                <div className="space-y-4">
                  {projectReport.map((p, i) => (
                    <ProgressRow
                      key={i}
                      label={p.project}
                      value={p.completedTasks}
                      max={p.totalTasks}
                      color={p.completionRate >= 75 ? '#10b981' : p.completionRate >= 50 ? '#f59e0b' : '#3b82f6'}
                      sub={`${p.completedTasks}/${p.totalTasks} tasks`}
                    />
                  ))}
                </div>
              </Card>

              {/* Detailed table */}
              <Card className="overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900">Project Details</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="text-left px-5 py-3">Project</th>
                        <th className="text-left px-5 py-3">Lead</th>
                        <th className="text-left px-5 py-3">Status</th>
                        <th className="text-center px-5 py-3">Total Tasks</th>
                        <th className="text-center px-5 py-3">Done</th>
                        <th className="text-center px-5 py-3">Completion</th>
                        <th className="text-center px-5 py-3">Members</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {projectReport.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div>
                              <p className="font-semibold text-slate-900">{p.project}</p>
                              {p.key && <p className="text-xs text-slate-400">{p.key}</p>}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">{p.lead || '—'}</td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                              style={{
                                background: (PROJECT_STATUS_COLORS[p.status] || '#94a3b8') + '20',
                                color: PROJECT_STATUS_COLORS[p.status] || '#64748b'
                              }}>
                              {p.status?.replace('-', ' ') || '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center text-slate-600">{p.totalTasks}</td>
                          <td className="px-5 py-3.5 text-center text-slate-600">{p.completedTasks}</td>
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${p.completionRate}%`,
                                    background: p.completionRate >= 75 ? '#10b981' : p.completionRate >= 50 ? '#f59e0b' : '#3b82f6'
                                  }} />
                              </div>
                              <span className={`font-bold text-xs ${p.completionRate >= 75 ? 'text-emerald-600' : p.completionRate >= 50 ? 'text-amber-600' : 'text-slate-600'}`}>
                                {p.completionRate}%
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-center text-slate-600">{p.members}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TEAM TAB
      ════════════════════════════════════════════════════════════════════ */}
      {tab === 'team' && (
        <div className="space-y-4">
          {userReport.length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No team data available</p>
            </Card>
          ) : (
            <>
              {/* Team KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard icon={Users}        label="Team Size"          value={userReport.length}                                                                       color="blue" />
                <KpiCard icon={Award}        label="Top Performer"      value={userReport.sort((a,b) => b.completionRate - a.completionRate)[0]?.name?.split(' ')[0] || '—'} color="green" sub="Highest completion rate" />
                <KpiCard icon={CheckCircle2} label="Total Completed"    value={userReport.reduce((a, u) => a + u.completed, 0)}                                         color="purple" sub="Tasks done by team" />
                <KpiCard icon={Target}       label="Team Avg Rate"      value={`${Math.round(userReport.reduce((a, u) => a + u.completionRate, 0) / (userReport.length || 1))}%`} color="amber" />
              </div>

              {/* Completion rate bars */}
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Individual Completion Rates</h3>
                <div className="space-y-4">
                  {[...userReport]
                    .sort((a, b) => b.completionRate - a.completionRate)
                    .map((u, i) => (
                      <ProgressRow
                        key={i}
                        label={u.name}
                        value={u.completed}
                        max={u.assigned}
                        color={TEAM_PALETTE[i % TEAM_PALETTE.length]}
                        sub={u.department || u.role}
                      />
                    ))}
                </div>
              </Card>

              {/* Team tasks bar chart */}
              {userReport.some(u => u.assigned > 0) && (
                <Card className="p-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">Task Distribution by Member</h3>
                  <p className="text-xs text-slate-400 mb-4">Assigned vs completed tasks per person</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={[...userReport].sort((a, b) => b.assigned - a.assigned).slice(0, 10).map(u => ({
                        name: u.name.split(' ')[0],
                        Assigned: u.assigned,
                        Completed: u.completed,
                        'In Progress': u.inProgress,
                      }))}
                      barSize={14}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                      <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11, color: '#64748b' }}>{v}</span>} />
                      <Bar dataKey="Assigned"    fill="#cbd5e1" radius={[4,4,0,0]} />
                      <Bar dataKey="Completed"   fill="#10b981" radius={[4,4,0,0]} />
                      <Bar dataKey="In Progress" fill="#3b82f6" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Detailed team table */}
              <Card className="overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900">Team Details</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="text-left px-5 py-3">Member</th>
                        <th className="text-left px-5 py-3">Department</th>
                        <th className="text-left px-5 py-3">Role</th>
                        <th className="text-center px-5 py-3">Assigned</th>
                        <th className="text-center px-5 py-3">Done</th>
                        <th className="text-center px-5 py-3">In Progress</th>
                        <th className="text-center px-5 py-3">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[...userReport]
                        .sort((a, b) => b.completionRate - a.completionRate)
                        .map((u, i) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                  style={{ background: TEAM_PALETTE[i % TEAM_PALETTE.length], flexShrink: 0 }}>
                                  {u.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900">{u.name}</p>
                                  <p className="text-xs text-slate-400">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-slate-600">{u.department || '—'}</td>
                            <td className="px-5 py-3.5 text-slate-600 capitalize">{u.role || '—'}</td>
                            <td className="px-5 py-3.5 text-center font-medium text-slate-700">{u.assigned}</td>
                            <td className="px-5 py-3.5 text-center text-emerald-600 font-medium">{u.completed}</td>
                            <td className="px-5 py-3.5 text-center text-blue-600 font-medium">{u.inProgress}</td>
                            <td className="px-5 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${u.completionRate}%`,
                                      background: u.completionRate >= 75 ? '#10b981' : u.completionRate >= 50 ? '#f59e0b' : '#94a3b8'
                                    }} />
                                </div>
                                <span
                                  className={`font-bold text-xs text-right ${u.completionRate >= 75 ? 'text-emerald-600' : u.completionRate >= 50 ? 'text-amber-600' : 'text-slate-500'}`}
                                  style={{ minWidth: '2.5rem' }}>
                                  {u.completionRate}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}

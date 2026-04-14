import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reportAPI, taskAPI, leaveAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Card, StatCard, Badge, Avatar, Spinner, Empty, Button } from '../../components/ui';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  FolderKanban, CheckSquare, CalendarDays, Users, ArrowRight, Clock
} from 'lucide-react';

const PIE_COLORS = ['#1e293b', '#334155', '#64748b', '#94a3b8', '#cbd5e1'];

function priorityVariant(p) {
  return { high: 'danger', medium: 'warning', low: 'success', critical: 'danger' }[p] || 'default';
}
function statusVariant(s) {
  return { done: 'success', 'in-progress': 'primary', todo: 'default', 'in-review': 'info', blocked: 'danger' }[s] || 'default';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      reportAPI.getDashboard().catch(() => null),
      taskAPI.getMy().catch(() => ({ data: { data: [] } })),
      leaveAPI.getBalance().catch(() => null),
    ]).then(([statsRes, tasksRes, leaveRes]) => {
      setStats(statsRes?.data?.data || null);
      setTasks(tasksRes?.data?.data?.slice(0, 5) || []);
      setLeaveBalance(leaveRes?.data?.data || null);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  );

  const taskStatusData = stats?.tasksByStatus || [];
  const projectProgressData = stats?.projectProgress || [];
  const activityData = stats?.weeklyActivity || [];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Good {getGreeting()}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-slate-500 text-sm mt-1">Here's what's happening across your workspace.</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-slate-900">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <p className="text-xs text-slate-400 capitalize">{user?.department} · {user?.role}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Projects" value={stats?.totalProjects ?? '—'} icon={FolderKanban} trend="Active workspace" />
        <StatCard label="Open Tasks" value={stats?.openTasks ?? tasks.filter(t => t.status !== 'done').length} icon={CheckSquare} trend="Assigned to you" />
        <StatCard label="Leave Balance" value={leaveBalance ? `${leaveBalance.annual ?? 0}d` : '—'} icon={CalendarDays} trend="Annual remaining" />
        <StatCard label="Team Members" value={stats?.totalUsers ?? '—'} icon={Users} trend="In your org" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity area chart */}
        <Card className="lg:col-span-2 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Weekly Activity</h3>
          {activityData.length > 0
            ? <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={activityData}>
                  <defs>
                    <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1e293b" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#1e293b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="tasks" stroke="#1e293b" strokeWidth={2} fill="url(#colorTasks)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            : <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No activity data yet</div>
          }
        </Card>

        {/* Tasks by status pie */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Tasks by Status</h3>
          {taskStatusData.length > 0
            ? <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="count">
                    {taskStatusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: '#64748b' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            : <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No task data yet</div>
          }
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* My recent tasks */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">My Tasks</h3>
            <Link to="/tasks" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {tasks.length === 0
            ? <Empty icon={CheckSquare} title="No tasks" description="You have no assigned tasks yet." />
            : <div className="space-y-1">
                {tasks.map(task => (
                  <div key={task._id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{task.project?.name || 'No project'}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge variant={priorityVariant(task.priority)}>{task.priority}</Badge>
                      <Badge variant={statusVariant(task.status)}>{task.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
          }
        </Card>

        {/* Leave balance + Recent activity */}
        <div className="space-y-4">
          {/* Leave balance */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Leave Balance</h3>
              <Link to="/leaves" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium">
                Apply <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {leaveBalance
              ? <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Annual', key: 'annual' },
                    { label: 'Sick', key: 'sick' },
                    { label: 'Casual', key: 'casual' },
                  ].map(({ label, key }) => (
                    <div key={key} className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-slate-900">{leaveBalance[key] ?? 0}</p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              : <p className="text-sm text-slate-400 text-center py-4">Leave balance not available</p>
            }
          </Card>

          {/* Recent activity – from stats */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Recent Activity</h3>
            {stats?.recentTasks?.length > 0
              ? <div className="space-y-3">
                  {stats.recentTasks.slice(0, 4).map(task => (
                    <div key={task._id} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800 truncate">{task.title}</p>
                        <p className="text-xs text-slate-400">{task.project?.name || '—'}</p>
                      </div>
                      {task.assignee && <Avatar name={task.assignee?.name} size="xs" />}
                    </div>
                  ))}
                </div>
              : <p className="text-sm text-slate-400 text-center py-4">No recent activity</p>
            }
          </Card>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

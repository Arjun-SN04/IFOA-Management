import { useState, useEffect } from 'react';
import { reportAPI } from '../../api';
import { Card, Spinner, PageHeader, Badge } from '../../components/ui';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell
} from 'recharts';
import { BarChart3, TrendingUp, Users, FolderKanban } from 'lucide-react';

const COLORS = ['#1e293b', '#334155', '#64748b', '#94a3b8', '#cbd5e1'];

export default function ReportsPage() {
  const [dashStats, setDashStats] = useState(null);
  const [projectReport, setProjectReport] = useState([]);
  const [userReport, setUserReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    Promise.all([
      reportAPI.getDashboard().catch(() => null),
      reportAPI.getProjectReport().catch(() => ({ data: { data: [] } })),
      reportAPI.getUserReport().catch(() => ({ data: { data: [] } })),
    ]).then(([dRes, pRes, uRes]) => {
      setDashStats(dRes?.data?.data || null);
      setProjectReport(pRes?.data?.data || []);
      setUserReport(uRes?.data?.data || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'projects', label: 'Projects', icon: FolderKanban },
    { key: 'team', label: 'Team', icon: Users },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader title="Reports" subtitle="Analytics and performance insights" />

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 -mb-px transition-colors
                ${tab === key ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Stat row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Users', val: dashStats?.totalUsers ?? '—' },
              { label: 'Projects', val: dashStats?.totalProjects ?? '—' },
              { label: 'Tasks', val: dashStats?.totalTasks ?? '—' },
              { label: 'Pending Leaves', val: dashStats?.pendingLeaves ?? '—' },
            ].map(({ label, val }) => (
              <Card key={label} className="p-5 text-center">
                <p className="text-3xl font-bold text-slate-900">{val}</p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Tasks by Status</h3>
              {dashStats?.tasksByStatus?.length > 0
                ? <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={dashStats.tasksByStatus.map(s => ({ name: s._id, count: s.count }))} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="count">
                        {dashStats.tasksByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                : <p className="text-sm text-slate-400 text-center py-12">No data</p>
              }
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Projects by Status</h3>
              {dashStats?.projectsByStatus?.length > 0
                ? <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dashStats.projectsByStatus.map(s => ({ name: s._id, count: s.count }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                      <Bar dataKey="count" fill="#1e293b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                : <p className="text-sm text-slate-400 text-center py-12">No data</p>
              }
            </Card>
          </div>
        </div>
      )}

      {/* Projects tab */}
      {tab === 'projects' && (
        <Card className="overflow-hidden">
          {projectReport.length === 0
            ? <p className="text-sm text-slate-400 text-center py-12">No project data</p>
            : <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="text-left px-5 py-3">Project</th>
                      <th className="text-left px-5 py-3">Status</th>
                      <th className="text-center px-5 py-3">Tasks</th>
                      <th className="text-center px-5 py-3">Completed</th>
                      <th className="text-center px-5 py-3">Rate</th>
                      <th className="text-center px-5 py-3">Members</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {projectReport.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-900">{p.project}</td>
                        <td className="px-5 py-3"><Badge>{p.status}</Badge></td>
                        <td className="px-5 py-3 text-center text-slate-600">{p.totalTasks}</td>
                        <td className="px-5 py-3 text-center text-slate-600">{p.completedTasks}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`font-semibold ${p.completionRate >= 75 ? 'text-emerald-600' : p.completionRate >= 50 ? 'text-amber-600' : 'text-slate-600'}`}>
                            {p.completionRate}%
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center text-slate-600">{p.members}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </Card>
      )}

      {/* Team tab */}
      {tab === 'team' && (
        <Card className="overflow-hidden">
          {userReport.length === 0
            ? <p className="text-sm text-slate-400 text-center py-12">No team data</p>
            : <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="text-left px-5 py-3">Name</th>
                      <th className="text-left px-5 py-3">Department</th>
                      <th className="text-center px-5 py-3">Assigned</th>
                      <th className="text-center px-5 py-3">Completed</th>
                      <th className="text-center px-5 py-3">In Progress</th>
                      <th className="text-center px-5 py-3">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {userReport.map((u, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">
                          <div>
                            <p className="font-medium text-slate-900">{u.name}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-600">{u.department || '—'}</td>
                        <td className="px-5 py-3 text-center text-slate-600">{u.assigned}</td>
                        <td className="px-5 py-3 text-center text-slate-600">{u.completed}</td>
                        <td className="px-5 py-3 text-center text-slate-600">{u.inProgress}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`font-semibold ${u.completionRate >= 75 ? 'text-emerald-600' : u.completionRate >= 50 ? 'text-amber-600' : 'text-slate-600'}`}>
                            {u.completionRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </Card>
      )}
    </div>
  );
}

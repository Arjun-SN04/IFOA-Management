import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectAPI, taskAPI, userAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import {
  Card, Button, Modal, Input, Textarea, Select,
  Badge, Avatar, Empty, Spinner, PageHeader
} from '../../components/ui';
import {
  Plus, ArrowLeft, CheckSquare, Users as UsersIcon,
  Circle, Clock, Eye, CheckCircle2, XCircle, RefreshCw
} from 'lucide-react';

// ── Status column config ───────────────────────────────────────────────────
const COLUMNS = [
  { key: 'todo',        label: 'To Do',       dot: 'bg-slate-400',   fill: '#94a3b8', icon: Circle,       bgText: 'bg-slate-100 text-slate-700' },
  { key: 'in-progress', label: 'In Progress', dot: 'bg-blue-500',    fill: '#3b82f6', icon: Clock,        bgText: 'bg-blue-100 text-blue-700' },
  { key: 'in-review',   label: 'In Review',   dot: 'bg-amber-500',   fill: '#f59e0b', icon: Eye,          bgText: 'bg-amber-100 text-amber-700' },
  { key: 'done',        label: 'Done',        dot: 'bg-emerald-500', fill: '#10b981', icon: CheckCircle2, bgText: 'bg-emerald-100 text-emerald-700' },
  { key: 'blocked',     label: 'Blocked',     dot: 'bg-red-500',     fill: '#ef4444', icon: XCircle,      bgText: 'bg-red-100 text-red-700' },
];

const PRIORITY_COLORS = {
  low:      { bg: '#10b98118', text: '#059669' },
  medium:   { bg: '#f59e0b18', text: '#d97706' },
  high:     { bg: '#ef444418', text: '#dc2626' },
  critical: { bg: '#dc262618', text: '#b91c1c' },
};

function StatusPill({ status }) {
  const col = COLUMNS.find(c => c.key === status) || COLUMNS[0];
  const Icon = col.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${col.bgText}`}>
      <Icon className="w-3 h-3" />
      {col.label}
    </span>
  );
}

// ── Task status breakdown bar ──────────────────────────────────────────────
function StatusBreakdown({ tasks }) {
  const total = tasks.length;
  if (total === 0) return null;
  return (
    <div className="flex h-2 rounded-full overflow-hidden gap-px">
      {COLUMNS.map(col => {
        const count = tasks.filter(t => t.status === col.key).length;
        if (count === 0) return null;
        return (
          <div
            key={col.key}
            title={`${col.label}: ${count}`}
            className="h-full transition-all duration-500"
            style={{ width: `${(count / total) * 100}%`, background: col.fill }}
          />
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isManagerOrAdmin } = useAuth();
  const [project, setProject]   = useState(null);
  const [tasks, setTasks]       = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab]           = useState('overview');
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', status: 'todo', dueDate: '', assignee: '' });
  const [saving, setSaving]     = useState(false);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [pRes, tRes, uRes] = await Promise.all([
        projectAPI.getById(id),
        taskAPI.getAll({ project: id }).catch(() => ({ data: { data: [] } })),
        userAPI.getAll().catch(() => ({ data: { data: [] } })),
      ]);
      setProject(pRes.data.data || pRes.data.project);
      setTasks(tRes.data.data || tRes.data.tasks || []);
      setAllUsers(uRes.data.data || []);
    } catch {
      navigate('/projects');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const handleCreateTask = async () => {
    setSaving(true);
    try {
      const res = await taskAPI.create({ ...taskForm, project: id });
      const newTask = res.data.data || res.data.task;
      if (newTask) setTasks(t => [newTask, ...t]);
      setShowAddTask(false);
      setTaskForm({ title: '', description: '', priority: 'medium', status: 'todo', dueDate: '', assignee: '' });
    } catch (e) { alert(e.response?.data?.message || 'Failed to create task'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskAPI.updateStatus(taskId, newStatus);
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
    } catch (e) { console.error('Status update failed', e); }
  };

  const set = k => e => setTaskForm(p => ({ ...p, [k]: e.target.value }));

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  if (!project) return null;

  const done      = tasks.filter(t => t.status === 'done').length;
  const blocked   = tasks.filter(t => t.status === 'blocked').length;
  const inProg    = tasks.filter(t => t.status === 'in-progress').length;
  const totalPct  = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const PROJ_STATUS_COLOR = {
    'in-progress': 'bg-blue-100 text-blue-700',
    completed:     'bg-emerald-100 text-emerald-700',
    planning:      'bg-slate-100 text-slate-600',
    'on-hold':     'bg-amber-100 text-amber-700',
    active:        'bg-blue-100 text-blue-700',
    cancelled:     'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate('/projects')}
          className="mt-1.5 text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PROJ_STATUS_COLOR[project.status] || 'bg-slate-100 text-slate-600'}`}>
              {project.status?.replace('-', ' ')}
            </span>
            {project.priority && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                style={{
                  background: (PRIORITY_COLORS[project.priority]?.bg || '#94a3b818'),
                  color: PRIORITY_COLORS[project.priority]?.text || '#64748b'
                }}>
                {project.priority} priority
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
          {project.description && <p className="text-sm text-slate-500 mt-1">{project.description}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          {isManagerOrAdmin && (
            <Button onClick={() => setShowAddTask(true)}>
              <Plus className="w-4 h-4" />
              Add Task
            </Button>
          )}
        </div>
      </div>

      {/* ── Summary stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Tasks',   value: tasks.length, color: 'text-slate-800' },
          { label: 'Completed',     value: done,         color: 'text-emerald-600' },
          { label: 'In Progress',   value: inProg,       color: 'text-blue-600' },
          { label: 'Blocked',       value: blocked,      color: blocked > 0 ? 'text-red-600' : 'text-slate-400' },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* ── Progress bar ──────────────────────────────────────────────────── */}
      <Card className="p-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-semibold text-slate-700">Overall Progress</span>
          <span className={`font-bold ${totalPct === 100 ? 'text-emerald-600' : 'text-slate-600'}`}>
            {totalPct}%
          </span>
        </div>
        <StatusBreakdown tasks={tasks} />
        {tasks.length > 0 && (
          <div className="flex gap-3 mt-3 flex-wrap">
            {COLUMNS.map(col => {
              const count = tasks.filter(t => t.status === col.key).length;
              if (count === 0) return null;
              return (
                <span key={col.key} className="flex items-center gap-1 text-xs text-slate-500">
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                  {col.label} ({count})
                </span>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          {['overview', 'tasks', 'members'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium capitalize border-b-2 -mb-px transition-colors
                ${tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t}
              {t === 'tasks' && tasks.length > 0 && (
                <span className="ml-1.5 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-normal">
                  {tasks.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          TASKS TAB — live status + update controls
      ════════════════════════════════════════════════════════════════════ */}
      {tab === 'tasks' && (
        <div>
          {tasks.length === 0 ? (
            <Empty
              icon={CheckSquare}
              title="No tasks yet"
              description="Add tasks to this project to get started"
              action={isManagerOrAdmin && (
                <Button onClick={() => setShowAddTask(true)}>
                  <Plus className="w-4 h-4" /> Add First Task
                </Button>
              )}
            />
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="text-left px-5 py-3">Task</th>
                    <th className="text-left px-5 py-3 hidden sm:table-cell">Assignee</th>
                    <th className="text-center px-5 py-3">Priority</th>
                    <th className="text-center px-5 py-3">Status</th>
                    {isManagerOrAdmin && <th className="text-center px-5 py-3">Update Status</th>}
                    <th className="text-right px-5 py-3 hidden md:table-cell">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks.map(task => (
                    <tr key={task._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="font-medium text-slate-900">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{task.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        {task.assignee
                          ? <div className="flex items-center gap-2">
                              <Avatar name={task.assignee?.name} size="xs" />
                              <span className="text-xs text-slate-600">{task.assignee?.name}</span>
                            </div>
                          : <span className="text-xs text-slate-400">Unassigned</span>
                        }
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                          style={{
                            background: PRIORITY_COLORS[task.priority]?.bg || '#94a3b818',
                            color: PRIORITY_COLORS[task.priority]?.text || '#64748b'
                          }}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <StatusPill status={task.status} />
                      </td>
                      {isManagerOrAdmin && (
                        <td className="px-5 py-3.5 text-center">
                          <select
                            value={task.status}
                            onChange={e => handleStatusChange(task._id, e.target.value)}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer min-w-[110px]">
                            {COLUMNS.map(c => (
                              <option key={c.key} value={c.key}>{c.label}</option>
                            ))}
                          </select>
                        </td>
                      )}
                      <td className="px-5 py-3.5 text-right text-xs text-slate-400 hidden md:table-cell">
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* ── Members tab ───────────────────────────────────────────────────── */}
      {tab === 'members' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {!project.members?.length ? (
            <Empty icon={UsersIcon} title="No members" description="Add members to this project" />
          ) : (
            project.members.map((m, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={m.user?.name || m.name || '?'} size="md" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{m.user?.name || m.name || '—'}</p>
                    <p className="text-xs text-slate-500 capitalize">{m.role || m.user?.role || 'member'}</p>
                    {m.user?.department && (
                      <p className="text-xs text-slate-400">{m.user.department}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── Overview tab ─────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Project Info</h3>
            {[
              ['Start Date', project.startDate ? new Date(project.startDate).toLocaleDateString() : '—'],
              ['End Date',   project.endDate   ? new Date(project.endDate).toLocaleDateString()   : '—'],
              ['Priority',   project.priority],
              ['Status',     project.status?.replace('-', ' ')],
              ['Category',   project.category],
              ['Members',    `${project.members?.length || 0} member(s)`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                <span className="text-slate-500">{k}</span>
                <span className="text-slate-900 font-medium capitalize">{v || '—'}</span>
              </div>
            ))}
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Task Breakdown</h3>
            <div className="space-y-3">
              {COLUMNS.map(({ key, label, dot, fill }) => {
                const count = tasks.filter(t => t.status === key).length;
                const pct   = tasks.length ? Math.round((count / tasks.length) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                      <span className="flex-1 text-sm text-slate-600">{label}</span>
                      <span className="text-sm font-bold text-slate-900">{count}</span>
                      <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden ml-4">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: fill }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── Add Task modal ────────────────────────────────────────────────── */}
      <Modal open={showAddTask} onClose={() => setShowAddTask(false)} title="Add Task to Project">
        <div className="space-y-4">
          <Input label="Title" value={taskForm.title} onChange={set('title')} placeholder="Task title" required />
          <Textarea label="Description" value={taskForm.description} onChange={set('description')} placeholder="Optional description" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Priority" value={taskForm.priority} onChange={set('priority')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
            <Select label="Assignee" value={taskForm.assignee} onChange={set('assignee')}>
              <option value="">Unassigned</option>
              {allUsers.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </Select>
          </div>
          <Input label="Due Date" type="date" value={taskForm.dueDate} onChange={set('dueDate')} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowAddTask(false)}>Cancel</Button>
            <Button onClick={handleCreateTask} loading={saving} disabled={!taskForm.title}>Add Task</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { taskAPI, projectAPI, userAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  Card, Button, Modal, Input, Textarea, Select,
  Badge, Avatar, Empty, Spinner, PageHeader
} from '../../components/ui';
import {
  Plus, CheckSquare, LayoutGrid, List, RefreshCw,
  AlertTriangle, Clock, CheckCircle2, Circle, XCircle,
  Eye, Filter, X, Layers, Calendar, Tag
} from 'lucide-react';

// ── Status config ─────────────────────────────────────────────────────────────
const COLUMNS = [
  { key: 'backlog',     label: 'Backlog',     color: 'bg-slate-100 text-slate-600',    dot: 'bg-slate-400',   fill: '#94a3b8', icon: AlertTriangle, border: 'border-slate-200' },
  { key: 'todo',        label: 'To Do',       color: 'bg-violet-50 text-violet-700',   dot: 'bg-violet-400',  fill: '#7c3aed', icon: Circle,        border: 'border-violet-200' },
  { key: 'in-progress', label: 'In Progress', color: 'bg-blue-50 text-blue-700',       dot: 'bg-blue-500',    fill: '#3b82f6', icon: Clock,         border: 'border-blue-200' },
  { key: 'in-review',   label: 'In Review',   color: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-500',   fill: '#f59e0b', icon: Eye,           border: 'border-amber-200' },
  { key: 'done',        label: 'Done',        color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', fill: '#10b981', icon: CheckCircle2,  border: 'border-emerald-200' },
  { key: 'blocked',     label: 'Blocked',     color: 'bg-red-50 text-red-700',         dot: 'bg-red-500',     fill: '#ef4444', icon: XCircle,       border: 'border-red-200' },
];

const PRIORITY_META = {
  low:      { label: 'Low',      bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e' },
  medium:   { label: 'Medium',   bg: '#fffbeb', color: '#d97706', dot: '#f59e0b' },
  high:     { label: 'High',     bg: '#fff7ed', color: '#ea580c', dot: '#f97316' },
  critical: { label: 'Critical', bg: '#fef2f2', color: '#dc2626', dot: '#ef4444' },
};

// ── Tiny helpers ──────────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const m = PRIORITY_META[priority] || PRIORITY_META.medium;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: m.bg, color: m.color }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

function StatusPill({ status }) {
  const col = COLUMNS.find(c => c.key === status) || COLUMNS[0];
  const Icon = col.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${col.color} ${col.border}`}>
      <Icon className="w-3 h-3" />
      {col.label}
    </span>
  );
}

function DueLabel({ dueDate }) {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  const diff = Math.ceil((d - new Date()) / 86400000);
  let cls = 'text-slate-400';
  if (diff < 0) cls = 'text-red-500 font-semibold';
  else if (diff <= 2) cls = 'text-orange-500 font-medium';
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${cls}`}>
      <Calendar className="w-3 h-3" />
      {diff < 0 ? `${Math.abs(diff)}d overdue` : diff === 0 ? 'Due today' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color, bg }) {
  return (
    <motion.div whileHover={{ y: -3 }}
      className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 shadow-sm">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function TasksPage() {
  const { isManagerOrAdmin, user } = useAuth();
  const { taskEvents } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = user?.role === 'admin';

  const [tasks, setTasks]             = useState([]);
  const [projects, setProjects]       = useState([]);
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [view, setView]               = useState('list');
  const [activeTab, setActiveTab]     = useState('tasks');
  const [taskView, setTaskView]       = useState('active');
  const [filter, setFilter]           = useState({ project: '', priority: '', status: '', search: '' });
  const [showCreate, setShowCreate]   = useState(false);
  const [selected, setSelected]       = useState(null);
  const [form, setForm]               = useState({ title: '', description: '', priority: 'medium', status: 'backlog', project: '', assignee: '', dueDate: '', assignToAll: false });
  const [saving, setSaving]           = useState(false);
  const [drag, setDrag]               = useState(null);
  const [dragOver, setDragOver]       = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [tRes, pRes, uRes] = await Promise.all([
        isManagerOrAdmin
          ? taskAPI.getAll().catch(() => ({ data: { data: [] } }))
          : taskAPI.getMy().catch(() => ({ data: { data: [] } })),
        projectAPI.getAll().catch(() => ({ data: { data: [] } })),
        isManagerOrAdmin ? userAPI.getAll().catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } }),
      ]);
      setTasks(tRes.data.data || tRes.data.tasks || []);
      setProjects(pRes.data.data || []);
      setUsers(uRes.data.data || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isManagerOrAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (!taskId || !tasks.length) return;
    const task = tasks.find((t) => t._id === taskId);
    if (task) {
      setSelected(task);
      const next = new URLSearchParams(searchParams);
      next.delete('taskId');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, tasks, setSearchParams]);

  useEffect(() => {
    if (!taskEvents) return;
    const { type, payload } = taskEvents;
    if (type === 'created') {
      setTasks(prev => {
        if (prev.find(t => t._id === (payload._id || payload.task?._id))) return prev;
        return [payload, ...prev];
      });
      if (isManagerOrAdmin) toast.success(`New task: ${payload.title}`, { icon: '📋' });
    } else if (type === 'updated' || type === 'statusChanged') {
      const u = payload.task || payload;
      setTasks(prev => prev.map(t => t._id === u._id ? { ...t, ...u } : t));
      if (selected?._id === u._id) setSelected(s => ({ ...s, ...u }));
    } else if (type === 'deleted') {
      setTasks(prev => prev.filter(t => t._id !== payload.taskId));
    }
  }, [taskEvents, isManagerOrAdmin, selected]);

  const baseTasks = isManagerOrAdmin
    ? tasks
    : taskView === 'completed'
      ? tasks.filter(t => t.status === 'done')
      : tasks.filter(t => t.status !== 'done');

  const filtered = baseTasks.filter(t => {
    const s = filter.search.toLowerCase();
    return (
      (!s || t.title?.toLowerCase().includes(s) || t.assignee?.name?.toLowerCase().includes(s))
      && (!filter.project  || t.project?._id === filter.project || t.project === filter.project)
      && (!filter.priority || t.priority === filter.priority)
      && (!filter.status   || t.status === filter.status)
    );
  });

  const projectReport = projects.map(p => {
    const pTasks = tasks.filter(t => (t.project?._id || t.project) === p._id);
    const done   = pTasks.filter(t => t.status === 'done').length;
    return { ...p, tasks: pTasks, done, pct: pTasks.length ? Math.round((done / pTasks.length) * 100) : 0 };
  }).filter(p => p.tasks.length > 0);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await taskAPI.create(form);
      const newTasks = res.data.tasks || [];
      const newTask = res.data.data || res.data.task;
      if (newTasks.length) {
        setTasks((prev) => [...newTasks, ...prev]);
      } else if (newTask) {
        setTasks((prev) => [newTask, ...prev]);
      }
      setShowCreate(false);
      setForm({ title: '', description: '', priority: 'medium', status: 'todo', project: '', assignee: '', dueDate: '', assignToAll: false });
      toast.success('Task created!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskAPI.updateStatus(taskId, newStatus);
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
      if (selected?._id === taskId) setSelected(s => ({ ...s, status: newStatus }));
      toast.success(`Moved to "${newStatus.replace('-', ' ')}"`, { icon: '✅', duration: 1800 });
    } catch {
      toast.error('Status update failed');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!isAdmin) return;
    if (!window.confirm('Delete this task permanently?')) return;
    try {
      await taskAPI.delete(taskId);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      if (selected?._id === taskId) setSelected(null);
      toast.success('Task deleted');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleDrop = (colKey) => {
    if (drag && drag !== colKey) handleStatusChange(drag, colKey);
    setDrag(null); setDragOver(null);
  };

  const setF = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const hasFilters = filter.search || filter.project || filter.priority || filter.status;
  const completedCount  = tasks.filter(t => t.status === 'done').length;
  const activeCount     = tasks.filter(t => t.status !== 'done').length;
  const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
  const overdueCount    = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length;

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-slate-400">Loading tasks…</p>
    </div>
  );

  return (
    <div className="space-y-6 min-h-full">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            {isManagerOrAdmin ? 'All Tasks' : 'My Tasks'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}{' '}
            {isManagerOrAdmin ? 'across the workspace' : 'assigned to you'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50 border border-slate-200">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {isManagerOrAdmin && (
            <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-0.5 shadow-sm">
              {[{ key: 'tasks', label: 'Tasks' }, { key: 'report', label: 'Reports' }].map(({ key, label }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-0.5 shadow-sm">
              {[{ key: 'kanban', icon: LayoutGrid, label: 'Board' }, { key: 'list', icon: List, label: 'List' }].map(({ key, icon: Icon, label }) => (
                <button key={key} onClick={() => setView(key)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    view === key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}>
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
          )}

          {isManagerOrAdmin && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" /> New Task
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats (admin) ───────────────────────────────────────────────── */}
      {isManagerOrAdmin && activeTab === 'tasks' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Tasks"  value={tasks.length}      icon={CheckSquare}   color="#3b82f6" bg="#eff6ff" />
          <StatCard label="In Progress"  value={inProgressCount}   icon={Clock}         color="#f59e0b" bg="#fffbeb" />
          <StatCard label="Completed"    value={completedCount}    icon={CheckCircle2}  color="#10b981" bg="#f0fdf4" />
          <StatCard label="Overdue"      value={overdueCount}      icon={AlertTriangle} color="#ef4444" bg="#fef2f2" />
        </motion.div>
      )}

      {/* ── User active/completed toggle ─────────────────────────────────── */}
      {!isManagerOrAdmin && (
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { key: 'active',    label: 'Active',    count: activeCount,    cls: 'bg-slate-900 text-white', icon: Clock },
            { key: 'completed', label: 'Completed', count: completedCount, cls: 'bg-emerald-600 text-white', icon: CheckCircle2 },
          ].map(({ key, label, count, cls, icon: Icon }) => (
            <button key={key} onClick={() => setTaskView(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                taskView === key ? `${cls} border-transparent shadow-sm` : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}>
              <Icon className="w-4 h-4" />
              {label}
              <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${taskView === key ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                {count}
              </span>
            </button>
          ))}
          {taskView === 'completed' && completedCount > 0 && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-sm text-emerald-600 font-medium">
              🎉 {completedCount} task{completedCount !== 1 ? 's' : ''} completed!
            </motion.span>
          )}
        </div>
      )}

      {/* ══ REPORTS TAB ══════════════════════════════════════════════════ */}
      {activeTab === 'report' && isManagerOrAdmin && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {projectReport.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center shadow-sm">
              <Layers className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No project tasks yet</p>
            </div>
          ) : projectReport.map((p, idx) => (
            <motion.div key={p._id}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                      p.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                      p.status === 'in-progress' || p.status === 'active' ? 'bg-blue-50 text-blue-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{p.status?.replace('-', ' ')}</span>
                  </div>
                  <p className="text-xs text-slate-400">{p.tasks.length} tasks · {p.done} done</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-3xl font-black ${p.pct === 100 ? 'text-emerald-600' : p.pct >= 50 ? 'text-blue-600' : 'text-slate-700'}`}>{p.pct}%</p>
                  <p className="text-xs text-slate-400">complete</p>
                </div>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-5">
                <motion.div initial={{ width: 0 }} animate={{ width: `${p.pct}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.06 + 0.2 }}
                  className="h-full rounded-full"
                  style={{ background: p.pct === 100 ? '#10b981' : 'linear-gradient(90deg,#3b82f6,#6366f1)' }} />
              </div>
              <div className="flex flex-wrap gap-2 mb-5">
                {COLUMNS.map(col => {
                  const count = p.tasks.filter(t => t.status === col.key).length;
                  if (!count) return null;
                  return (
                    <span key={col.key} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${col.color} ${col.border}`}>
                      {col.label}: {count}
                    </span>
                  );
                })}
              </div>
              <div className="rounded-xl overflow-hidden border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="text-left px-4 py-3">Task</th>
                      <th className="text-left px-4 py-3 hidden sm:table-cell">Assignee</th>
                      <th className="text-center px-4 py-3">Priority</th>
                      <th className="text-center px-4 py-3">Status</th>
                      <th className="text-center px-4 py-3">Update</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {p.tasks.map(task => (
                      <tr key={task._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-800">{task.title}</p>
                          <DueLabel dueDate={task.dueDate} />
                        </td>
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          {task.assignee
                            ? <div className="flex items-center gap-2"><Avatar name={task.assignee?.name} size="xs" /><span className="text-xs text-slate-600">{task.assignee.name}</span></div>
                            : <span className="text-xs italic text-slate-300">Unassigned</span>}
                        </td>
                        <td className="px-4 py-3.5 text-center"><PriorityBadge priority={task.priority} /></td>
                        <td className="px-4 py-3.5 text-center"><StatusPill status={task.status} /></td>
                        <td className="px-4 py-3.5 text-center">
                          <select value={task.status} onChange={e => handleStatusChange(task._id, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer">
                            {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ══ TASKS TAB ════════════════════════════════════════════════════ */}
      {activeTab === 'tasks' && (
        <>
          {/* Status summary bar */}
          <div className="flex flex-wrap gap-2">
            {COLUMNS.map(col => {
              const count = filtered.filter(t => t.status === col.key).length;
              const active = filter.status === col.key;
              return (
                <motion.button key={col.key} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setFilter(f => ({ ...f, status: active ? '' : col.key }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    active ? `${col.color} ${col.border} shadow-sm` : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}>
                  {col.label}
                  <span className={`ml-0.5 px-1.5 py-px rounded-md font-bold text-[10px] ${active ? 'bg-white/30' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                </motion.button>
              );
            })}
            <motion.button whileHover={{ scale: 1.04 }}
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ml-auto ${
                showFilters || hasFilters ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}>
              <Filter className="w-3.5 h-3.5" />
              Filters
              {hasFilters && <span className="ml-1 text-[10px] font-bold">On</span>}
            </motion.button>
          </div>

          {/* Expandable filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end shadow-sm">
                  <div className="flex-1 min-w-48">
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">Search</label>
                    <input placeholder="Task or assignee…" value={filter.search}
                      onChange={e => setFilter(p => ({ ...p, search: e.target.value }))}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div className="min-w-40">
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">Project</label>
                    <select value={filter.project} onChange={e => setFilter(p => ({ ...p, project: e.target.value }))}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="">All Projects</option>
                      {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="min-w-36">
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">Priority</label>
                    <select value={filter.priority} onChange={e => setFilter(p => ({ ...p, priority: e.target.value }))}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="">All</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  {hasFilters && (
                    <button onClick={() => setFilter({ project: '', priority: '', status: '', search: '' })}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl border border-red-100 transition-colors">
                      <X className="w-3.5 h-3.5" /> Clear all
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty for completed view */}
          {taskView === 'completed' && !isManagerOrAdmin && filtered.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold">No completed tasks yet</p>
              <p className="text-slate-400 text-sm mt-1">Tasks marked as "Done" appear here</p>
            </div>
          )}

          {/* ── KANBAN ───────────────────────────────────────────────── */}
          {view === 'kanban' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
              {COLUMNS.map((col) => {
                if (!isManagerOrAdmin && taskView === 'completed' && col.key !== 'done') return null;
                const colTasks = filtered.filter(t => t.status === col.key);
                const Icon = col.icon;
                const isOver = dragOver === col.key;
                return (
                  <div key={col.key} className="shrink-0 w-72"
                    onDragOver={e => { e.preventDefault(); setDragOver(col.key); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={() => handleDrop(col.key)}>
                    <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-xl border ${col.border} ${col.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold uppercase tracking-wide flex-1">{col.label}</span>
                      <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-white/60">{colTasks.length}</span>
                    </div>
                    <div className={`space-y-2.5 min-h-20 rounded-2xl p-1.5 transition-all duration-200 ${isOver ? 'bg-blue-50 ring-2 ring-blue-200' : ''}`}>
                      {colTasks.length === 0 && (
                        <div className={`border-2 border-dashed rounded-xl h-20 flex items-center justify-center transition-colors ${isOver ? 'border-blue-300' : 'border-slate-200'}`}>
                          <p className="text-xs text-slate-400">{isManagerOrAdmin ? 'Drop here' : 'No tasks'}</p>
                        </div>
                      )}
                      {colTasks.map((task, taskIdx) => (
                        <motion.div key={task._id}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: taskIdx * 0.04 }}
                          whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                          draggable={isManagerOrAdmin}
                          onDragStart={() => isManagerOrAdmin && setDrag(task._id)}
                          onDragEnd={() => { setDrag(null); setDragOver(null); }}
                          onClick={() => setSelected(task)}
                          className="bg-white rounded-xl border border-slate-100 p-3.5 cursor-pointer transition-all duration-200 group shadow-sm hover:border-slate-200">
                          <p className="text-sm font-semibold text-slate-900 mb-1.5 leading-snug group-hover:text-blue-700 transition-colors">{task.title}</p>
                          {task.project?.name && (
                            <div className="flex items-center gap-1 mb-2">
                              <Tag className="w-2.5 h-2.5 text-slate-400" />
                              <p className="text-[10px] text-slate-400 truncate">{task.project.name}</p>
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                            <PriorityBadge priority={task.priority} />
                            <div className="flex items-center gap-2">
                              {task.dueDate && <DueLabel dueDate={task.dueDate} />}
                              {task.assignee && <Avatar name={task.assignee?.name} size="xs" />}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* ── LIST ─────────────────────────────────────────────────── */}
          {view === 'list' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
              {filtered.length === 0 ? (
                <div className="p-16 text-center">
                  <CheckSquare className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No tasks found</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-[1fr_130px_100px_160px_100px] gap-4 px-5 py-3.5 bg-slate-50 border-b border-slate-100">
                    {['Task', 'Project', 'Priority', 'Status', 'Due'].map(h => (
                      <span key={h} className="text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</span>
                    ))}
                  </div>
                  <div className="divide-y divide-slate-50">
                    {filtered.map((task, idx) => (
                      <motion.div key={task._id}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        onClick={() => setSelected(task)}
                        className="grid grid-cols-[1fr_130px_100px_160px_100px] gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/70 transition-all items-center group">
                        <div className="flex items-center gap-3 min-w-0">
                          {task.assignee && <Avatar name={task.assignee?.name} size="xs" />}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">{task.title}</p>
                            {task.assignee && isManagerOrAdmin && <p className="text-xs text-slate-400 truncate">{task.assignee.name}</p>}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{task.project?.name || '—'}</p>
                        <PriorityBadge priority={task.priority} />
                        <span onClick={e => e.stopPropagation()}>
                          <select value={task.status} onChange={e => handleStatusChange(task._id, e.target.value)}
                            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 w-full cursor-pointer">
                            {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                          </select>
                        </span>
                        <DueLabel dueDate={task.dueDate} />
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </>
      )}

      {/* ── Task detail modal ──────────────────────────────────────────── */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Task Details" size="lg">
        {selected && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">{selected.title}</h3>
              {selected.description && <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{selected.description}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Project',  selected.project?.name || '—'],
                ['Assignee', selected.assignee?.name || 'Unassigned'],
                ['Priority', selected.priority],
                ['Due Date', selected.dueDate ? new Date(selected.dueDate).toLocaleDateString() : '—'],
              ].map(([k, v]) => (
                <div key={k} className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">{k}</p>
                  <p className="text-sm font-semibold text-slate-900 capitalize">{v}</p>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">Current Status</p>
              <StatusPill status={selected.status} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-3">
                {isManagerOrAdmin ? 'Update Status' : 'Update Your Status'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COLUMNS.map(col => {
                  const Icon = col.icon;
                  const active = selected.status === col.key;
                  return (
                    <button key={col.key} onClick={() => handleStatusChange(selected._id, col.key)}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        active ? `${col.color} ${col.border} shadow-sm` : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}>
                      <Icon className="w-3.5 h-3.5 shrink-0" />{col.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              {isAdmin && (
                <Button variant="danger" onClick={() => handleDeleteTask(selected._id)}>Delete Task</Button>
              )}
              <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Create Task modal ──────────────────────────────────────────── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Task">
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={setF('title')} placeholder="e.g. Design login screen" required />
          <Textarea label="Description" value={form.description} onChange={setF('description')} placeholder="Optional details…" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Project" value={form.project} onChange={setF('project')}>
              <option value="">No project</option>
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
            <Select label="Assignee" value={form.assignee} onChange={setF('assignee')}>
              <option value="">Unassigned</option>
              {isManagerOrAdmin && <option value="__all__">Assign to all employees</option>}
              {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Priority" value={form.priority} onChange={setF('priority')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
            <Input label="Due Date" type="date" value={form.dueDate} onChange={setF('dueDate')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving} disabled={!form.title || !form.project}>Create Task</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

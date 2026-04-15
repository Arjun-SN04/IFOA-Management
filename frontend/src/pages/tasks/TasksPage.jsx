import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { taskAPI, projectAPI, userAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  Card, Button, Modal, Input, Textarea, Select,
  Badge, Avatar, Empty, Spinner, PageHeader
} from '../../components/ui';
import {
  Plus, CheckSquare, LayoutGrid, List, RefreshCw,
  AlertTriangle, Clock, CheckCircle2, Circle, XCircle, Eye, Filter
} from 'lucide-react';

// ── Status config ─────────────────────────────────────────────────────────────
const COLUMNS = [
  { key: 'backlog',     label: 'Backlog',     color: 'bg-gray-100 text-gray-600',       dot: 'bg-gray-400',    fill: '#9ca3af', icon: AlertTriangle },
  { key: 'todo',        label: 'To Do',       color: 'bg-slate-100 text-slate-700',     dot: 'bg-slate-400',   fill: '#94a3b8', icon: Circle },
  { key: 'in-progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500',    fill: '#3b82f6', icon: Clock },
  { key: 'in-review',   label: 'In Review',   color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500',   fill: '#f59e0b', icon: Eye },
  { key: 'done',        label: 'Done',        color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', fill: '#10b981', icon: CheckCircle2 },
  { key: 'blocked',     label: 'Blocked',     color: 'bg-red-100 text-red-700',         dot: 'bg-red-500',     fill: '#ef4444', icon: XCircle },
];

const PRIORITY_META = {
  low:      { variant: 'success', color: '#10b981' },
  medium:   { variant: 'warning', color: '#f59e0b' },
  high:     { variant: 'danger',  color: '#ef4444' },
  critical: { variant: 'danger',  color: '#dc2626' },
};

// ── Mini progress bar ─────────────────────────────────────────────────────────
function MiniProgress({ tasks }) {
  const total = tasks.length;
  if (total === 0) return <span className="text-xs text-slate-400">No tasks</span>;
  const done = tasks.filter(t => t.status === 'done').length;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: pct === 100 ? '#10b981' : '#3b82f6' }}
        />
      </div>
      <span className={`text-xs font-bold flex-shrink-0 ${pct === 100 ? 'text-emerald-600' : 'text-slate-600'}`}>
        {pct}%
      </span>
    </div>
  );
}

// ── Status dot badge ──────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const col = COLUMNS.find(c => c.key === status) || COLUMNS[0];
  const Icon = col.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${col.color}`}>
      <Icon className="w-3 h-3" />
      {col.label}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function TasksPage() {
  const { isManagerOrAdmin } = useAuth();
  const { taskEvents } = useNotifications();

  const [tasks, setTasks]       = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView]         = useState('kanban');
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'report'
  // For non-admin: 'active' = all non-done, 'completed' = done tasks
  const [taskView, setTaskView] = useState('active');
  const [filter, setFilter]     = useState({ project: '', priority: '', status: '', search: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm]         = useState({ title: '', description: '', priority: 'medium', status: 'backlog', project: '', assignee: '', dueDate: '' });
  const [saving, setSaving]     = useState(false);
  const [drag, setDrag]         = useState(null);

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

  // ── Live socket task events ───────────────────────────────────────────────
  useEffect(() => {
    if (!taskEvents) return;
    const { type, payload } = taskEvents;
    if (type === 'created') {
      setTasks(prev => {
        if (prev.find(t => t._id === (payload._id || payload.task?._id))) return prev;
        return [payload, ...prev];
      });
      if (isManagerOrAdmin) toast.success(`New task created: ${payload.title}`, { icon: '📋' });
    } else if (type === 'updated' || type === 'statusChanged') {
      const updatedTask = payload.task || payload;
      setTasks(prev => prev.map(t => t._id === updatedTask._id ? { ...t, ...updatedTask } : t));
      if (selected?._id === updatedTask._id) setSelected(s => ({ ...s, ...updatedTask }));
    } else if (type === 'deleted') {
      const { taskId } = payload;
      setTasks(prev => prev.filter(t => t._id !== taskId));
    }
  }, [taskEvents, isManagerOrAdmin, selected]);

  // ── Filtered tasks (apply user active/completed split) ────────────────────
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

  // ── Per-project breakdown for admin report view ───────────────────────────
  const projectReport = projects.map(p => {
    const pTasks = tasks.filter(t => (t.project?._id || t.project) === p._id);
    const done   = pTasks.filter(t => t.status === 'done').length;
    return { ...p, tasks: pTasks, done, pct: pTasks.length ? Math.round((done / pTasks.length) * 100) : 0 };
  }).filter(p => p.tasks.length > 0);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await taskAPI.create(form);
      const newTask = res.data.data || res.data.task;
      if (newTask) setTasks(p => [newTask, ...p]);
      setShowCreate(false);
      setForm({ title: '', description: '', priority: 'medium', status: 'todo', project: '', assignee: '', dueDate: '' });
      toast.success('Task created successfully!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskAPI.updateStatus(taskId, newStatus);
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
      if (selected?._id === taskId) setSelected(s => ({ ...s, status: newStatus }));
      toast.success(`Status updated to "${newStatus.replace('-', ' ')}"`, { icon: '✅' });
    } catch (e) {
      toast.error('Status update failed');
      console.error('Status update failed', e);
    }
  };

  const handleDrop = (colKey, taskId) => {
    if (taskId && taskId !== colKey) handleStatusChange(taskId, colKey);
    setDrag(null);
  };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  );

  const counts = COLUMNS.reduce((acc, col) => {
    acc[col.key] = filtered.filter(t => t.status === col.key).length;
    return acc;
  }, {});

  const completedCount = tasks.filter(t => t.status === 'done').length;
  const activeCount    = tasks.filter(t => t.status !== 'done').length;

  return (
    <div className="space-y-5 h-full flex flex-col">
      {/* Header */}
      <PageHeader
        title={isManagerOrAdmin ? 'All Tasks' : 'My Tasks'}
        subtitle={`${tasks.length} task${tasks.length !== 1 ? 's' : ''} ${isManagerOrAdmin ? 'across the workspace' : 'assigned to you'}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {isManagerOrAdmin && (
              <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 gap-0.5">
                <button onClick={() => setActiveTab('tasks')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${activeTab === 'tasks' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                  Tasks
                </button>
                <button onClick={() => setActiveTab('report')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${activeTab === 'report' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                  Project Report
                </button>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 gap-0.5">
                <button onClick={() => setView('kanban')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${view === 'kanban' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                  <LayoutGrid className="w-3.5 h-3.5" /> Board
                </button>
                <button onClick={() => setView('list')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${view === 'list' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                  <List className="w-3.5 h-3.5" /> List
                </button>
              </div>
            )}

            {isManagerOrAdmin && (
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" />
                New Task
              </Button>
            )}
          </div>
        }
      />

      {/* ── Active / Completed toggle for regular users ─────────────────────── */}
      {!isManagerOrAdmin && activeTab === 'tasks' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col items-center gap-4">
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1 shadow-sm">
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => setTaskView('active')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                taskView === 'active'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}>
              <Clock className="w-3.5 h-3.5" />
              Active
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${taskView === 'active' ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'}`}>
                {activeCount}
              </span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => setTaskView('completed')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                taskView === 'completed'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${taskView === 'completed' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-600'}`}>
                {completedCount}
              </span>
            </motion.button>
          </div>
          {taskView === 'completed' && completedCount > 0 && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-emerald-600 font-medium">
              🎉 You've completed {completedCount} task{completedCount !== 1 ? 's' : ''}!
            </motion.p>
          )}
        </motion.div>
      )}

      {/* ── Status summary pills ─────────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex flex-wrap gap-2 justify-center">
          {COLUMNS.map((col, idx) => (
            <motion.button
              key={col.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.03 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => setFilter(f => ({ ...f, status: f.status === col.key ? '' : col.key }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                filter.status === col.key
                  ? `${col.color} border-current shadow-md`
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}>
              <span className={`w-2 h-2 rounded-full ${col.dot}`} />
              {col.label}
              <span className="ml-0.5 font-bold">{counts[col.key]}</span>
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* ════ PROJECT REPORT TAB (admin only) ════ */}
      {activeTab === 'report' && isManagerOrAdmin && (
        <div className="space-y-4">
          {projectReport.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No tasks have been assigned to any projects yet</p>
            </Card>
          ) : (
            projectReport.map(p => (
              <Card key={p._id} className="p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-slate-900">{p.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        p.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        p.status === 'in-progress' || p.status === 'active' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{p.status?.replace('-', ' ')}</span>
                    </div>
                    <p className="text-xs text-slate-400">{p.tasks.length} task{p.tasks.length !== 1 ? 's' : ''} · {p.done} done</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className={`text-2xl font-bold ${p.pct === 100 ? 'text-emerald-600' : p.pct >= 50 ? 'text-blue-600' : 'text-slate-600'}`}>{p.pct}%</p>
                    <p className="text-xs text-slate-400">complete</p>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${p.pct}%`, background: p.pct === 100 ? '#10b981' : '#3b82f6' }} />
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {COLUMNS.map(col => {
                    const count = p.tasks.filter(t => t.status === col.key).length;
                    if (count === 0) return null;
                    return (
                      <span key={col.key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${col.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                        {col.label}: {count}
                      </span>
                    );
                  })}
                </div>
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="text-left px-4 py-2.5">Task</th>
                        <th className="text-left px-4 py-2.5 hidden sm:table-cell">Assignee</th>
                        <th className="text-center px-4 py-2.5">Priority</th>
                        <th className="text-center px-4 py-2.5">Status</th>
                        {isManagerOrAdmin && <th className="text-center px-4 py-2.5">Update</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {p.tasks.map(task => (
                        <tr key={task._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-slate-800 text-sm">{task.title}</p>
                              {task.dueDate && (
                                <p className="text-xs text-slate-400 mt-0.5">Due {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            {task.assignee
                              ? <div className="flex items-center gap-2"><Avatar name={task.assignee?.name} size="xs" /><span className="text-xs text-slate-600">{task.assignee?.name}</span></div>
                              : <span className="text-xs text-slate-400">Unassigned</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                              style={{ background: (PRIORITY_META[task.priority]?.color || '#94a3b8') + '20', color: PRIORITY_META[task.priority]?.color || '#64748b' }}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center"><StatusPill status={task.status} /></td>
                          {isManagerOrAdmin && (
                            <td className="px-4 py-3 text-center">
                              <select value={task.status} onChange={e => handleStatusChange(task._id, e.target.value)}
                                onClick={e => e.stopPropagation()}
                                className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer">
                                {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                              </select>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ════ TASKS TAB ════ */}
      {activeTab === 'tasks' && (
        <>
          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-col gap-4 p-4 bg-gradient-to-r from-blue-50 to-slate-50 rounded-xl border border-blue-100/50">
            <div className="flex flex-wrap gap-3">
              <input
                placeholder="Search tasks or assignee…"
                value={filter.search}
                onChange={e => setFilter(p => ({ ...p, search: e.target.value }))}
                className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all min-w-52"
              />
              <select value={filter.project} onChange={e => setFilter(p => ({ ...p, project: e.target.value }))}
                className="px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all">
                <option value="">All Projects</option>
                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
              <select value={filter.priority} onChange={e => setFilter(p => ({ ...p, priority: e.target.value }))}
                className="px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all">
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              {(filter.search || filter.project || filter.priority || filter.status) && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setFilter({ project: '', priority: '', status: '', search: '' })}
                  className="px-4 py-2.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-100/50 rounded-lg transition-all">
                  Clear filters
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* Empty state for completed view */}
          {taskView === 'completed' && !isManagerOrAdmin && filtered.length === 0 && (
            <Card className="p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No completed tasks yet</p>
              <p className="text-slate-400 text-sm mt-1">Tasks marked as "Done" will appear here</p>
            </Card>
          )}

          {/* ── Kanban board ─────────────────────────────────────────────── */}
          {view === 'kanban' && filtered.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex gap-4 overflow-x-auto pb-4 flex-1">
              {COLUMNS.map((col, colIdx) => {
                // For user completed view, only show the done column
                if (!isManagerOrAdmin && taskView === 'completed' && col.key !== 'done') return null;
                const colTasks = filtered.filter(t => t.status === col.key);
                const Icon = col.icon;
                return (
                  <motion.div
                    key={col.key}
                    initial={{ opacity: 0, x: colIdx * 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: colIdx * 0.05, duration: 0.3 }}
                    className="flex-shrink-0 w-72"
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => handleDrop(col.key, drag)}>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <Icon className="w-3.5 h-3.5" style={{ color: col.fill }} />
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{col.label}</span>
                      <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${col.color}`}>{colTasks.length}</span>
                    </div>
                    <div className={`space-y-2 min-h-16 rounded-xl p-1 transition-colors ${drag ? 'bg-slate-50' : ''}`}>
                      {colTasks.length === 0 && (
                        <div className="border-2 border-dashed border-slate-200 rounded-xl h-20 flex items-center justify-center">
                          <p className="text-xs text-slate-400">{isManagerOrAdmin ? 'Drop here' : 'No tasks'}</p>
                        </div>
                      )}
                      {colTasks.map((task, taskIdx) => (
                        <motion.div
                          key={task._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: taskIdx * 0.05, duration: 0.3 }}
                          whileHover={{ y: -4, boxShadow: '0 8px 16px rgba(37, 99, 235, 0.1)' }}
                          draggable={isManagerOrAdmin}
                          onDragStart={() => isManagerOrAdmin && setDrag(task._id)}
                          onDragEnd={() => setDrag(null)}
                          onClick={() => setSelected(task)}
                          className="bg-white rounded-xl border border-slate-200 p-3.5 cursor-pointer transition-all duration-150 group">
                          <p className="text-sm font-medium text-slate-900 mb-1.5 leading-snug">{task.title}</p>
                          {task.project?.name && <p className="text-xs text-slate-400 mb-2 truncate">{task.project.name}</p>}
                          <div className="flex items-center justify-between">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                              style={{ background: (PRIORITY_META[task.priority]?.color || '#94a3b8') + '18', color: PRIORITY_META[task.priority]?.color || '#64748b' }}>
                              {task.priority}
                            </span>
                            <div className="flex items-center gap-2">
                              {task.dueDate && <span className="text-xs text-slate-400">{new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                              {task.assignee && <Avatar name={task.assignee?.name} size="xs" />}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* ── List view ───────────────────────────────────────────────── */}
          {view === 'list' && (
            <Card className="overflow-hidden">
              {filtered.length === 0 ? (
                <Empty icon={CheckSquare} title="No tasks found" description="Try adjusting your filters" />
              ) : (
                <div className="divide-y divide-slate-100">
                  <div className="grid grid-cols-[1fr_130px_90px_150px_90px] gap-4 px-5 py-3 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <span>Task</span><span>Project</span><span>Priority</span><span className="text-center">Status</span><span>Due</span>
                  </div>
                  <motion.div className="divide-y divide-slate-50">
                    {filtered.map((task, idx) => (
                      <motion.div
                        key={task._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.3 }}
                        whileHover={{ backgroundColor: 'rgba(3, 102, 214, 0.02)' }}
                        onClick={() => setSelected(task)}
                        className="grid grid-cols-[1fr_130px_90px_150px_90px] gap-4 px-5 py-3.5 cursor-pointer transition-all items-center">
                        <div className="flex items-center gap-3 min-w-0">
                          {task.assignee && <Avatar name={task.assignee?.name} size="xs" />}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                            {task.assignee && isManagerOrAdmin && <p className="text-xs text-slate-400 truncate">{task.assignee.name}</p>}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{task.project?.name || '—'}</p>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                          style={{ background: (PRIORITY_META[task.priority]?.color || '#94a3b8') + '18', color: PRIORITY_META[task.priority]?.color || '#64748b' }}>
                          {task.priority}
                        </span>
                        <span onClick={e => e.stopPropagation()}>
                          <select value={task.status} onChange={e => handleStatusChange(task._id, e.target.value)}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 w-full cursor-pointer">
                            {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                          </select>
                        </span>
                        <p className="text-xs text-slate-500">{task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</p>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* ── Task detail modal ─────────────────────────────────────────── */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Task Details" size="lg">
        {selected && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{selected.title}</h3>
              {selected.description && <p className="text-sm text-slate-500 mt-1">{selected.description}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Project',  selected.project?.name || '—'],
                ['Assignee', selected.assignee?.name || 'Unassigned'],
                ['Priority', selected.priority],
                ['Due Date', selected.dueDate ? new Date(selected.dueDate).toLocaleDateString() : '—'],
              ].map(([k, v]) => (
                <div key={k} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-0.5">{k}</p>
                  <p className="text-sm font-semibold text-slate-900 capitalize">{v}</p>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1.5">Current Status</p>
              <StatusPill status={selected.status} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                {isManagerOrAdmin ? 'Update Status' : 'Update Your Status'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COLUMNS.map(col => {
                  const Icon = col.icon;
                  const active = selected.status === col.key;
                  return (
                    <button key={col.key} onClick={() => handleStatusChange(selected._id, col.key)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                        active ? `${col.color} border-current shadow-sm` : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}>
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      {col.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Create Task modal ────────────────────────────────────────── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Task">
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={set('title')} placeholder="Task title" required />
          <Textarea label="Description" value={form.description} onChange={set('description')} placeholder="Optional description" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Project" value={form.project} onChange={set('project')}>
              <option value="">No project</option>
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
            <Select label="Assignee" value={form.assignee} onChange={set('assignee')}>
              <option value="">Unassigned</option>
              {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Priority" value={form.priority} onChange={set('priority')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
            <Input label="Due Date" type="date" value={form.dueDate} onChange={set('dueDate')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving} disabled={!form.title}>Create Task</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

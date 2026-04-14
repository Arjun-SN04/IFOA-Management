import { useState, useEffect } from 'react';
import { taskAPI, projectAPI, userAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Textarea, Select, Badge, Avatar, Empty, Spinner, PageHeader } from '../../components/ui';
import { Plus, CheckSquare } from 'lucide-react';

const COLUMNS = [
  { key: 'todo',        label: 'To Do',      color: 'bg-slate-100 text-slate-700',    dot: 'bg-slate-400' },
  { key: 'in-progress', label: 'In Progress', color: 'bg-indigo-100 text-indigo-700',  dot: 'bg-indigo-500' },
  { key: 'in-review',   label: 'In Review',   color: 'bg-sky-100 text-sky-700',        dot: 'bg-sky-500' },
  { key: 'done',        label: 'Done',        color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  { key: 'blocked',     label: 'Blocked',     color: 'bg-red-100 text-red-700',        dot: 'bg-red-500' },
];

const PRIORITY_V = { high: 'danger', medium: 'warning', low: 'success', critical: 'danger' };

export default function TasksPage() {
  const { isManagerOrAdmin } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban');
  const [filter, setFilter] = useState({ project: '', priority: '', search: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', status: 'todo', project: '', assignee: '', dueDate: '' });
  const [saving, setSaving] = useState(false);
  const [drag, setDrag] = useState(null);

  useEffect(() => {
    Promise.all([
      taskAPI.getMy(),
      projectAPI.getAll().catch(() => ({ data: { data: [] } })),
      userAPI.getAll().catch(() => ({ data: { data: [] } })),
    ]).then(([tRes, pRes, uRes]) => {
      setTasks(tRes.data.data || []);
      setProjects(pRes.data.data || []);
      setUsers(uRes.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = tasks.filter(t => {
    const s = filter.search.toLowerCase();
    return (!s || t.title?.toLowerCase().includes(s))
      && (!filter.project  || t.project?._id === filter.project || t.project === filter.project)
      && (!filter.priority || t.priority === filter.priority);
  });

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await taskAPI.create(form);
      setTasks(p => [res.data.data, ...p]);
      setShowCreate(false);
      setForm({ title: '', description: '', priority: 'medium', status: 'todo', project: '', assignee: '', dueDate: '' });
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskAPI.updateStatus(taskId, newStatus);
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
    } catch {}
  };

  const handleDrop = (status) => {
    if (drag && drag !== status) {
      handleStatusChange(drag, status);
      setDrag(null);
    }
  };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-5 h-full flex flex-col">
      <PageHeader
        title="My Tasks"
        subtitle={`${tasks.length} task${tasks.length !== 1 ? 's' : ''} assigned to you`}
        actions={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 gap-0.5">
              <button onClick={() => setView('kanban')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${view === 'kanban' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                Board
              </button>
              <button onClick={() => setView('list')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${view === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                List
              </button>
            </div>
            {isManagerOrAdmin && (
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" />
                New Task
              </Button>
            )}
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input placeholder="Search tasks…" value={filter.search}
          onChange={e => setFilter(p => ({ ...p, search: e.target.value }))}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-48" />
        <select value={filter.project} onChange={e => setFilter(p => ({ ...p, project: e.target.value }))}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        <select value={filter.priority} onChange={e => setFilter(p => ({ ...p, priority: e.target.value }))}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Kanban board */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {COLUMNS.map(col => {
            const colTasks = filtered.filter(t => t.status === col.key);
            return (
              <div key={col.key} className="flex-shrink-0 w-72"
                onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(col.key)}>
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{col.label}</span>
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${col.color}`}>{colTasks.length}</span>
                </div>

                {/* Cards */}
                <div className="space-y-2 min-h-12">
                  {colTasks.length === 0 && (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl h-20 flex items-center justify-center">
                      <p className="text-xs text-slate-400">Drop here</p>
                    </div>
                  )}
                  {colTasks.map(task => (
                    <div key={task._id} draggable
                      onDragStart={() => setDrag(task._id)}
                      onDragEnd={() => setDrag(null)}
                      onClick={() => setSelected(task)}
                      className="bg-white rounded-xl border border-slate-200 p-3.5 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all duration-150 group">
                      <p className="text-sm font-medium text-slate-900 mb-1.5 leading-snug">{task.title}</p>
                      {task.project?.name && (
                        <p className="text-xs text-slate-400 mb-2 truncate">{task.project.name}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <Badge variant={PRIORITY_V[task.priority]}>{task.priority}</Badge>
                        <div className="flex items-center gap-2">
                          {task.dueDate && (
                            <span className="text-xs text-slate-400">{new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          )}
                          {task.assignee && <Avatar name={task.assignee?.name} size="xs" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <Card className="overflow-hidden">
          {filtered.length === 0
            ? <Empty icon={CheckSquare} title="No tasks" description="You have no tasks matching the filters" />
            : <div className="divide-y divide-slate-100">
                <div className="grid grid-cols-[1fr_120px_100px_100px_100px] gap-4 px-5 py-3 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <span>Task</span><span>Project</span><span>Priority</span><span>Status</span><span>Due</span>
                </div>
                {filtered.map(task => (
                  <div key={task._id} onClick={() => setSelected(task)}
                    className="grid grid-cols-[1fr_120px_100px_100px_100px] gap-4 px-5 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors items-center">
                    <div className="flex items-center gap-3 min-w-0">
                      {task.assignee && <Avatar name={task.assignee?.name} size="xs" />}
                      <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{task.project?.name || '—'}</p>
                    <Badge variant={PRIORITY_V[task.priority]}>{task.priority}</Badge>
                    <span>
                      <select value={task.status}
                        onChange={e => { e.stopPropagation(); handleStatusChange(task._id, e.target.value); }}
                        className="text-xs border border-slate-200 rounded-md px-1 py-0.5 bg-white">
                        {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </span>
                    <p className="text-xs text-slate-500">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </p>
                  </div>
                ))}
              </div>
          }
        </Card>
      )}

      {/* Task detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Task Details" size="lg">
        {selected && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{selected.title}</h3>
              {selected.description && <p className="text-sm text-slate-500 mt-1">{selected.description}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Project',   selected.project?.name || '—'],
                ['Assignee',  selected.assignee?.name || 'Unassigned'],
                ['Priority',  selected.priority],
                ['Due Date',  selected.dueDate ? new Date(selected.dueDate).toLocaleDateString() : '—'],
              ].map(([k, v]) => (
                <div key={k} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-0.5">{k}</p>
                  <p className="text-sm font-medium text-slate-900 capitalize">{v}</p>
                </div>
              ))}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Update Status</label>
              <div className="flex flex-wrap gap-2">
                {COLUMNS.map(col => (
                  <button key={col.key}
                    onClick={() => { handleStatusChange(selected._id, col.key); setSelected(s => ({ ...s, status: col.key })); }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors
                      ${selected.status === col.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                    {col.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Task Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Task">
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

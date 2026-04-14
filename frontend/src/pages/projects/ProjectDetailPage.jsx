import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectAPI, taskAPI, userAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Textarea, Select, Badge, Avatar, Empty, Spinner, PageHeader } from '../../components/ui';
import { Plus, ArrowLeft, CheckSquare, Users as UsersIcon } from 'lucide-react';

const PRIORITY_V = { high: 'danger', medium: 'warning', low: 'success', critical: 'danger' };
const STATUS_V   = { done: 'success', 'in-progress': 'primary', todo: 'default', 'in-review': 'info', blocked: 'danger' };

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isManagerOrAdmin } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', status: 'todo', dueDate: '', assignee: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      projectAPI.getById(id),
      taskAPI.getAll({ project: id }),
      userAPI.getAll().catch(() => ({ data: { data: [] } })),
    ]).then(([pRes, tRes, uRes]) => {
      setProject(pRes.data.data);
      setTasks(tRes.data.data || []);
      setAllUsers(uRes.data.data || []);
    }).catch(() => navigate('/projects'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCreateTask = async () => {
    setSaving(true);
    try {
      const res = await taskAPI.create({ ...taskForm, project: id });
      setTasks(t => [res.data.data, ...t]);
      setShowAddTask(false);
      setTaskForm({ title: '', description: '', priority: 'medium', status: 'todo', dueDate: '', assignee: '' });
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const set = k => e => setTaskForm(p => ({ ...p, [k]: e.target.value }));

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  if (!project) return null;

  const stats = [
    { label: 'Total Tasks',   value: tasks.length },
    { label: 'Completed',     value: tasks.filter(t => t.status === 'done').length },
    { label: 'In Progress',   value: tasks.filter(t => t.status === 'in-progress').length },
    { label: 'Blocked',       value: tasks.filter(t => t.status === 'blocked').length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/projects')} className="mt-1 text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <PageHeader
            title={project.name}
            subtitle={project.description}
            actions={
              <div className="flex gap-2">
                {isManagerOrAdmin && (
                  <Button onClick={() => setShowAddTask(true)}>
                    <Plus className="w-4 h-4" />
                    Add Task
                  </Button>
                )}
              </div>
            }
          />
          <div className="flex gap-2 -mt-4">
            <Badge variant={{ 'in-progress': 'primary', completed: 'success', planning: 'default', 'on-hold': 'warning' }[project.status] || 'default'}>
              {project.status}
            </Badge>
            <Badge variant={PRIORITY_V[project.priority] || 'default'}>{project.priority}</Badge>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <Card key={s.label} className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Progress */}
      <Card className="p-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-slate-700">Overall Progress</span>
          <span className="text-slate-500">{project.progress ?? 0}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${project.progress ?? 0}%` }} />
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          {['overview', 'tasks', 'members'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium capitalize border-b-2 -mb-px transition-colors
                ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'tasks' && (
        <div>
          {tasks.length === 0
            ? <Empty icon={CheckSquare} title="No tasks" description="Add tasks to this project" />
            : <div className="space-y-2">
                {tasks.map(task => (
                  <Card key={task._id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{task.title}</p>
                        {task.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{task.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {task.assignee && <Avatar name={task.assignee?.name} size="xs" />}
                        <Badge variant={PRIORITY_V[task.priority]}>{task.priority}</Badge>
                        <Badge variant={STATUS_V[task.status]}>{task.status}</Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
          }
        </div>
      )}

      {tab === 'members' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {project.members?.length === 0
            ? <Empty icon={UsersIcon} title="No members" description="Add members to this project" />
            : project.members?.map((m, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.user?.name || '?'} size="md" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{m.user?.name || '—'}</p>
                      <p className="text-xs text-slate-500 capitalize">{m.role || m.user?.role || 'member'}</p>
                    </div>
                  </div>
                </Card>
              ))
          }
        </div>
      )}

      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Details</h3>
            {[
              ['Start Date', project.startDate ? new Date(project.startDate).toLocaleDateString() : '—'],
              ['End Date',   project.endDate   ? new Date(project.endDate).toLocaleDateString()   : '—'],
              ['Priority',   project.priority],
              ['Status',     project.status?.replace('-', ' ')],
              ['Members',    `${project.members?.length || 0} member(s)`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-slate-500">{k}</span>
                <span className="text-slate-900 font-medium capitalize">{v}</span>
              </div>
            ))}
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Task Breakdown</h3>
            <div className="space-y-2.5">
              {[
                { label: 'To Do',       count: tasks.filter(t => t.status === 'todo').length,          color: 'bg-slate-400' },
                { label: 'In Progress', count: tasks.filter(t => t.status === 'in-progress').length,   color: 'bg-indigo-500' },
                { label: 'In Review',   count: tasks.filter(t => t.status === 'in-review').length,     color: 'bg-sky-500' },
                { label: 'Done',        count: tasks.filter(t => t.status === 'done').length,           color: 'bg-emerald-500' },
                { label: 'Blocked',     count: tasks.filter(t => t.status === 'blocked').length,        color: 'bg-red-500' },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                  <span className="flex-1 text-slate-600">{label}</span>
                  <span className="font-semibold text-slate-900">{count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Add Task Modal */}
      <Modal open={showAddTask} onClose={() => setShowAddTask(false)} title="Add Task">
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

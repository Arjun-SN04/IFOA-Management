import { useState, useEffect } from 'react';
import { sprintAPI, projectAPI, taskAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Textarea, Select, Badge, Empty, Spinner, PageHeader } from '../../components/ui';
import { Plus, Zap } from 'lucide-react';

const STATUS_V = {
  planned:    { v: 'default',  label: 'Planned' },
  active:     { v: 'primary',  label: 'Active' },
  completed:  { v: 'success',  label: 'Completed' },
};

export default function SprintsPage() {
  const { isManagerOrAdmin } = useAuth();
  const [sprints, setSprints] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [boardTasks, setBoardTasks] = useState([]);
  const [form, setForm] = useState({ name: '', goal: '', project: '', startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      sprintAPI.getAll(),
      projectAPI.getAll().catch(() => ({ data: { data: [] } })),
    ]).then(([sRes, pRes]) => {
      setSprints(sRes.data.data || []);
      setProjects(pRes.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const openSprint = async (sprint) => {
    setSelected(sprint);
    try {
      const res = await sprintAPI.getBoard(sprint._id);
      setBoardTasks(res.data.data || []);
    } catch { setBoardTasks([]); }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await sprintAPI.create(form);
      setSprints(p => [res.data.data, ...p]);
      setShowCreate(false);
      setForm({ name: '', goal: '', project: '', startDate: '', endDate: '' });
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleAction = async (sprint, action) => {
    try {
      let res;
      if (action === 'start')    res = await sprintAPI.start(sprint._id);
      if (action === 'complete') res = await sprintAPI.complete(sprint._id);
      setSprints(prev => prev.map(s => s._id === sprint._id ? res.data.data : s));
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
  };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  const activeSprint = sprints.find(s => s.status === 'active');
  const plannedSprints = sprints.filter(s => s.status === 'planned');
  const completedSprints = sprints.filter(s => s.status === 'completed');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sprints"
        subtitle="Manage your team's sprint cycles"
        actions={isManagerOrAdmin && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            New Sprint
          </Button>
        )}
      />

      {sprints.length === 0
        ? <Empty icon={Zap} title="No sprints yet" description="Create your first sprint to start tracking work" />
        : (
          <div className="space-y-6">
            {/* Active */}
            {activeSprint && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Active Sprint</h2>
                </div>
                <SprintCard sprint={activeSprint} onOpen={openSprint} onAction={handleAction} isManagerOrAdmin={isManagerOrAdmin} />
              </div>
            )}

            {/* Planned */}
            {plannedSprints.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Upcoming ({plannedSprints.length})</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plannedSprints.map(s => <SprintCard key={s._id} sprint={s} onOpen={openSprint} onAction={handleAction} isManagerOrAdmin={isManagerOrAdmin} />)}
                </div>
              </div>
            )}

            {/* Completed */}
            {completedSprints.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Completed ({completedSprints.length})</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedSprints.map(s => <SprintCard key={s._id} sprint={s} onOpen={openSprint} onAction={handleAction} isManagerOrAdmin={isManagerOrAdmin} />)}
                </div>
              </div>
            )}
          </div>
        )
      }

      {/* Sprint Board Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name || 'Sprint Board'} size="xl">
        {selected && (
          <div className="space-y-4">
            {selected.goal && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
                <p className="text-sm text-indigo-700"><span className="font-semibold">Goal:</span> {selected.goal}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-0.5">Start</p>
                <p className="font-medium text-slate-900">{selected.startDate ? new Date(selected.startDate).toLocaleDateString() : '—'}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-0.5">End</p>
                <p className="font-medium text-slate-900">{selected.endDate ? new Date(selected.endDate).toLocaleDateString() : '—'}</p>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Tasks ({boardTasks.length})</h4>
              {boardTasks.length === 0
                ? <p className="text-sm text-slate-400 text-center py-6">No tasks in this sprint</p>
                : <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
                    {boardTasks.map(task => (
                      <div key={task._id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                          <p className="text-xs text-slate-400">{task.assignee?.name || 'Unassigned'}</p>
                        </div>
                        <Badge variant={{ done: 'success', 'in-progress': 'primary', todo: 'default' }[task.status] || 'default'}>
                          {task.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        )}
      </Modal>

      {/* Create Sprint Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Sprint">
        <div className="space-y-4">
          <Input label="Sprint Name" value={form.name} onChange={set('name')} placeholder="e.g. Sprint 12 — Auth Module" required />
          <Textarea label="Sprint Goal" value={form.goal} onChange={set('goal')} placeholder="What should be achieved this sprint?" />
          <Select label="Project" value={form.project} onChange={set('project')} required>
            <option value="">Select project…</option>
            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={form.startDate} onChange={set('startDate')} />
            <Input label="End Date" type="date" value={form.endDate} onChange={set('endDate')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving} disabled={!form.name || !form.project}>Create Sprint</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SprintCard({ sprint, onOpen, onAction, isManagerOrAdmin }) {
  const sv = STATUS_V[sprint.status] || { v: 'default', label: sprint.status };
  const tasksDone = sprint.tasks?.filter(t => t.status === 'done').length || 0;
  const tasksTotal = sprint.tasks?.length || 0;
  const progress = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

  const daysLeft = sprint.endDate
    ? Math.ceil((new Date(sprint.endDate) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={sv.v}>{sv.label}</Badge>
            {sprint.project?.name && <span className="text-xs text-slate-400">{sprint.project.name}</span>}
          </div>
          <h3 className="text-base font-semibold text-slate-900">{sprint.name}</h3>
          {sprint.goal && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{sprint.goal}</p>}
        </div>
        <Button variant="ghost" size="xs" onClick={() => onOpen(sprint)}>
          View Board
        </Button>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>{tasksDone}/{tasksTotal} tasks</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
            style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {sprint.startDate && <span>{new Date(sprint.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
          {sprint.endDate   && <span>→ {new Date(sprint.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
          {daysLeft !== null && sprint.status === 'active' && (
            <span className={`font-medium ${daysLeft <= 2 ? 'text-red-500' : 'text-slate-500'}`}>
              {daysLeft > 0 ? `${daysLeft}d left` : 'Overdue'}
            </span>
          )}
        </div>
        {isManagerOrAdmin && (
          <div className="flex gap-2">
            {sprint.status === 'planned' && (
              <Button variant="secondary" size="xs" onClick={() => onAction(sprint, 'start')}>Start</Button>
            )}
            {sprint.status === 'active' && (
              <Button variant="success" size="xs" onClick={() => onAction(sprint, 'complete')}>Complete</Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

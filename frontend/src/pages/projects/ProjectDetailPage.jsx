import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectAPI, taskAPI, userAPI, teamAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import {
  Card, Button, Modal, Input, Textarea, Select,
  Badge, Avatar, Empty, Spinner, PageHeader
} from '../../components/ui';
import {
  Plus, ArrowLeft, CheckSquare, Users as UsersIcon,
  Circle, Clock, Eye, CheckCircle2, XCircle, RefreshCw,
  Pencil, Trash2, AlertTriangle, Users2, X
} from 'lucide-react';
import toast from 'react-hot-toast';

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

// ── Team Selector (multi-select pill UI for manager) ───────────────────────
function TeamSelector({ projectTeams, selectedTeamIds, onChange }) {
  const toggle = (teamId) => {
    if (selectedTeamIds.includes(teamId)) {
      onChange(selectedTeamIds.filter(id => id !== teamId));
    } else {
      onChange([...selectedTeamIds, teamId]);
    }
  };

  if (!projectTeams || projectTeams.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        No teams are assigned to this project yet. Add teams in the Edit Project panel first.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
        Assign to Team(s){' '}
        <span className="text-slate-400 font-normal normal-case">(all team members will be assigned)</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {projectTeams.map(team => {
          const selected = selectedTeamIds.includes(String(team._id));
          // members array from populated team may or may not include teamLead
          const memberCount = team.members?.length || 0;
          return (
            <button
              key={team._id}
              type="button"
              onClick={() => toggle(String(team._id))}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                ${selected
                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50'
                }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: team.color || '#3B82F6' }}
              />
              {team.name}
              <span className={`text-xs ${selected ? 'text-blue-200' : 'text-slate-400'}`}>
                · {memberCount} member{memberCount !== 1 ? 's' : ''}
              </span>
            </button>
          );
        })}
      </div>

      {selectedTeamIds.length > 0 && (
        <div className="mt-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-xs font-semibold text-blue-700 mb-1.5">Task will be assigned to all members of:</p>
          <div className="flex flex-wrap gap-2">
            {selectedTeamIds.map(tid => {
              const team = projectTeams.find(t => String(t._id) === tid);
              if (!team) return null;
              const memberCount = team.members?.length || 0;
              return (
                <div key={tid} className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-blue-200 rounded-lg text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ background: team.color || '#3B82F6' }} />
                  <span className="font-medium text-slate-800">{team.name}</span>
                  <span className="text-slate-400">({memberCount} member{memberCount !== 1 ? 's' : ''})</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-blue-500 mt-1.5">
            Each team member will receive their own copy of this task.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Team Manager (add/remove teams in Edit Project modal) ──────────────────
function TeamManager({ projectId, currentTeams, allTeams, onChange }) {
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);

  const assignedIds = (currentTeams || []).map(t => String(t._id || t));
  const unassigned = allTeams.filter(t => !assignedIds.includes(String(t._id)));

  const handleAdd = async (teamId) => {
    setAdding(true);
    try {
      const res = await projectAPI.assignTeam(projectId, teamId);
      const updatedProject = res.data.project;
      onChange(updatedProject.teams || []);
      toast.success('Team added to project');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to add team');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (teamId) => {
    setRemoving(teamId);
    try {
      const res = await projectAPI.removeTeam(projectId, teamId);
      const updatedProject = res.data.project;
      onChange(updatedProject.teams || []);
      toast.success('Team removed from project');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to remove team');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
        Teams Assigned to Project
      </label>

      {/* Currently assigned teams */}
      {currentTeams.length === 0 ? (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          No teams assigned yet. Add teams below.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {currentTeams.map(team => (
            <div key={team._id} className="flex items-center justify-between gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: team.color || '#3B82F6' }} />
                <span className="text-sm font-semibold text-slate-800">{team.name}</span>
                <span className="text-xs text-slate-400">· {team.members?.length || 0} member(s)</span>
              </div>
              <button
                onClick={() => handleRemove(String(team._id))}
                disabled={removing === String(team._id)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {removing === String(team._id) ? <Spinner size="xs" /> : <X className="w-3 h-3" />}
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add available teams */}
      {unassigned.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-2">Add a team:</p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map(team => (
              <button
                key={team._id}
                onClick={() => handleAdd(String(team._id))}
                disabled={adding}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-50"
              >
                <span className="w-2 h-2 rounded-full" style={{ background: team.color || '#3B82F6' }} />
                + {team.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {unassigned.length === 0 && currentTeams.length > 0 && (
        <p className="text-xs text-slate-400">All available teams are already assigned to this project.</p>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isManagerOrAdmin, isAdmin, isManagement, user } = useAuth();
  const [project, setProject]   = useState(null);
  const [tasks, setTasks]       = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allTeams, setAllTeams] = useState([]); // all teams (for edit modal team manager)
  const [projectTeams, setProjectTeams] = useState([]); // teams assigned to this project (populated)
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab]           = useState('overview');

  // Task add
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', status: 'backlog', dueDate: '', assignee: '', type: 'task', parent: '' });
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [saving, setSaving]     = useState(false);

  // Member management
  const [selectedMember, setSelectedMember] = useState('');

  // Edit project modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  // Delete project modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Delete task
  const [deletingTaskId, setDeletingTaskId] = useState(null);

  // ── Helper: derive projectTeams from populated project.teams ──────────────
  const deriveProjectTeams = (proj) => {
    // project.teams is populated with { _id, name, color, teamLead, members }
    return (proj?.teams || []).filter(t => t && t._id);
  };

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [pRes, tRes, uRes] = await Promise.all([
        projectAPI.getById(id),
        taskAPI.getAll({ project: id }).catch(() => ({ data: { data: [] } })),
        userAPI.getAll().catch(() => ({ data: { data: [] } })),
      ]);
      const proj = pRes.data.project || pRes.data.data;
      setProject(proj);
      setTasks(tRes.data.tasks || tRes.data.data || []);
      setAllUsers(uRes.data.users || uRes.data.data || []);

      // Use the populated teams directly from project response
      setProjectTeams(deriveProjectTeams(proj));

      // Also load all teams for the edit modal team manager
      try {
        const allTeamsRes = await teamAPI.getAll();
        setAllTeams(allTeamsRes.data.teams || []);
      } catch {
        setAllTeams([]);
      }
    } catch {
      navigate('/projects');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const isProjectLead = project && String(project.lead?._id || project.lead) === String(user?._id || user?.id);
  const canManageProject = isManagerOrAdmin || isProjectLead;
  const canEditProject = isManagerOrAdmin;
  const canDeleteTask = isManagerOrAdmin;

  // Manager-only (not admin): uses team-based task assignment
  const isManagerOnly = isManagement && !isAdmin;

  const handleCreateTask = async () => {
    setSaving(true);
    try {
      if (isManagerOnly && selectedTeamIds.length > 0) {
        for (const teamId of selectedTeamIds) {
          await taskAPI.create({
            ...taskForm,
            project: id,
            team: teamId,
            assignToTeam: true,
          });
        }
        const tRes = await taskAPI.getAll({ project: id }).catch(() => ({ data: { data: [] } }));
        setTasks(tRes.data.tasks || tRes.data.data || []);
        toast.success(`Task assigned to all members of ${selectedTeamIds.length} team(s)`);
      } else {
        const res = await taskAPI.create({ ...taskForm, project: id });
        const newTask = res.data.data || res.data.task;
        if (newTask) setTasks(t => [newTask, ...t]);
        if (res.data.tasks?.length > 1) {
          setTasks(prev => [...res.data.tasks, ...prev]);
        }
        toast.success('Task created');
      }

      setShowAddTask(false);
      setTaskForm({ title: '', description: '', priority: 'medium', status: 'backlog', dueDate: '', assignee: '', type: 'task', parent: '' });
      setSelectedTeamIds([]);
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
    } catch (e) { console.error('Status update failed', e); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task permanently? This cannot be undone.')) return;
    setDeletingTaskId(taskId);
    try {
      await taskAPI.delete(taskId);
      setTasks(prev => prev.filter(t => t._id !== taskId));
      toast.success('Task deleted');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete task');
    } finally {
      setDeletingTaskId(null);
    }
  };

  const set = k => e => setTaskForm(p => ({ ...p, [k]: e.target.value }));

  const handleAddMember = async () => {
    if (!selectedMember) return;
    try {
      const res = await projectAPI.addMember(id, { userId: selectedMember });
      setProject((prev) => ({ ...prev, ...(res.data.project || {}) }));
      setSelectedMember('');
      toast.success('Member added');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member from project?')) return;
    try {
      const res = await projectAPI.removeMember(id, userId);
      setProject((prev) => ({ ...prev, ...(res.data.project || {}) }));
      toast.success('Member removed');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to remove member');
    }
  };

  // ── Edit project ──
  const openEdit = () => {
    setEditForm({
      name: project.name || '',
      description: project.description || '',
      status: project.status || 'planning',
      priority: project.priority || 'medium',
      category: project.category || 'software',
      startDate: project.startDate ? project.startDate.slice(0, 10) : '',
      endDate: project.endDate ? project.endDate.slice(0, 10) : '',
    });
    setShowEditModal(true);
  };

  const handleEditProject = async () => {
    if (!editForm.name?.trim()) { toast.error('Project name is required'); return; }
    setEditSaving(true);
    try {
      const res = await projectAPI.update(id, editForm);
      const updatedProject = res.data.project || res.data.data;
      setProject(prev => ({ ...prev, ...(updatedProject || editForm) }));
      // Refresh teams from updated project if they changed
      if (updatedProject?.teams) {
        setProjectTeams(deriveProjectTeams(updatedProject));
      }
      setShowEditModal(false);
      toast.success('Project updated');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update project');
    } finally {
      setEditSaving(false);
    }
  };

  // Called by TeamManager when teams change — refresh project teams from server
  const handleTeamsChanged = async (updatedTeams) => {
    // updatedTeams is already the populated teams array from the API response
    // But to be safe, reload the project to get fresh populated data
    try {
      const pRes = await projectAPI.getById(id);
      const proj = pRes.data.project || pRes.data.data;
      setProject(proj);
      setProjectTeams(deriveProjectTeams(proj));
    } catch {
      // fallback: just set what we got
      setProjectTeams(updatedTeams);
    }
  };

  // ── Delete project ──
  const handleDeleteProject = async () => {
    if (deleteConfirmName !== project.name) {
      toast.error('Project name does not match');
      return;
    }
    setDeleting(true);
    try {
      await projectAPI.archive(id);
      toast.success('Project deleted');
      navigate('/projects');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete project');
      setDeleting(false);
    }
  };

  const openAddTask = () => {
    setTaskForm({ title: '', description: '', priority: 'medium', status: 'backlog', dueDate: '', assignee: '', type: 'task', parent: '' });
    setSelectedTeamIds([]);
    setShowAddTask(true);
  };

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
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {canEditProject && (
            <button
              onClick={openEdit}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
              title="Edit Project">
              <Pencil className="w-4 h-4" /> Edit
            </button>
          )}

          {canEditProject && (
            <button
              onClick={() => { setShowDeleteModal(true); setDeleteConfirmName(''); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-colors"
              title="Delete Project">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}

          {canManageProject && (
            <Button onClick={openAddTask}>
              <Plus className="w-4 h-4" />
              Add Task
            </Button>
          )}
        </div>
      </div>

      {/* ── Summary stats ── */}
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

      {/* ── Progress bar ── */}
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
                  {col.label} ({count})
                </span>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Tabs ── */}
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

      {/* ── Tasks Tab ── */}
      {tab === 'tasks' && (
        <div>
          {tasks.length === 0 ? (
            <Empty
              icon={CheckSquare}
              title="No tasks yet"
              description="Add tasks to this project to get started"
              action={canManageProject && (
                <Button onClick={openAddTask}>
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
                    {canManageProject && <th className="text-center px-5 py-3">Update Status</th>}
                    {canDeleteTask && <th className="text-center px-5 py-3">Delete</th>}
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
                          {task.team?.name && (
                            <span className="inline-flex items-center gap-1 mt-1 text-xs px-1.5 py-0.5 rounded-md font-medium"
                              style={{ background: (task.team.color || '#3B82F6') + '18', color: task.team.color || '#3B82F6' }}>
                              {task.team.name}
                            </span>
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
                      {canManageProject && (
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
                      {canDeleteTask && (
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => handleDeleteTask(task._id)}
                            disabled={deletingTaskId === task._id}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                            title="Delete task">
                            {deletingTaskId === task._id
                              ? <Spinner size="xs" />
                              : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
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

      {/* ── Members Tab ── */}
      {tab === 'members' && (
        <div className="space-y-4">
          {canManageProject && (
            <Card className="p-4">
              <p className="text-sm font-semibold text-slate-900 mb-2">Add Member</p>
              <div className="flex items-center gap-2">
                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">Select user to add</option>
                  {allUsers
                    .filter((u) => String(u._id) !== String(project.lead?._id || project.lead))
                    .filter((u) => !(project.members || []).some((m) => String(m._id || m.user?._id || m) === String(u._id)))
                    .map((u) => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
                </select>
                <Button onClick={handleAddMember} disabled={!selectedMember}>Add</Button>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <Card className="p-4 border-blue-200 bg-blue-50/40">
              <div className="flex items-center gap-3">
                <Avatar name={project.lead?.name || '?'} size="md" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{project.lead?.name || '—'}</p>
                  <p className="text-xs text-blue-700 capitalize font-medium">Team Lead</p>
                  {project.lead?.department && <p className="text-xs text-slate-500">{project.lead.department}</p>}
                </div>
              </div>
            </Card>

            {!(project.members || []).length ? (
              <Empty icon={UsersIcon} title="No members" description="Add members to this project" />
            ) : (
              project.members
                .filter((m) => String(m._id || m.user?._id || m) !== String(project.lead?._id || project.lead))
                .map((m, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={m.user?.name || m.name || '?'} size="md" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{m.user?.name || m.name || '—'}</p>
                          <p className="text-xs text-slate-500 capitalize">{m.role || m.user?.role || 'member'}</p>
                          {(m.user?.department || m.department) && (
                            <p className="text-xs text-slate-400 truncate">{m.user?.department || m.department}</p>
                          )}
                        </div>
                      </div>
                      {canManageProject && (
                        <Button variant="ghost" size="xs" onClick={() => handleRemoveMember(m._id || m.user?._id || m)}>
                          Remove
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
            )}
          </div>
        </div>
      )}

      {/* ── Overview Tab ── */}
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
              ['Teams',      `${project.teams?.length || 0} team(s)`],
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
              {COLUMNS.map(({ key, label, fill }) => {
                const count = tasks.filter(t => t.status === key).length;
                const pct   = tasks.length ? Math.round((count / tasks.length) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-1">
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

          {/* Teams assigned to project */}
          {projectTeams.length > 0 && (
            <Card className="p-5 md:col-span-2">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Users2 className="w-4 h-4 text-blue-600" />
                Teams on this Project
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {projectTeams.map(team => (
                  <div key={team._id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl bg-slate-50">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: team.color || '#3B82F6' }} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{team.name}</p>
                      {team.teamLead?.name && (
                        <p className="text-xs text-slate-500">Lead: {team.teamLead.name}</p>
                      )}
                      <p className="text-xs text-slate-400">{team.members?.length || 0} member(s)</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ══ Add Task Modal ══════════════════════════════════════════════════ */}
      <Modal open={showAddTask} onClose={() => setShowAddTask(false)} title="Add Task to Project">
        <div className="space-y-4">
          <Input label="Title" value={taskForm.title} onChange={set('title')} placeholder="Task title" required />
          <Textarea label="Description" value={taskForm.description} onChange={set('description')} placeholder="Optional description" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Task Type" value={taskForm.type} onChange={set('type')}>
              <option value="task">Task</option>
              <option value="subtask">Sub Task</option>
            </Select>
            <Select label="Parent Task" value={taskForm.parent} onChange={set('parent')} disabled={taskForm.type !== 'subtask'}>
              <option value="">Select parent task</option>
              {tasks.filter((t) => !t.parent).map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Priority" value={taskForm.priority} onChange={set('priority')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
            {/* Admin sees full user list; Manager uses team picker */}
            {!isManagerOnly && (
              <Select label="Assignee" value={taskForm.assignee} onChange={set('assignee')}>
                <option value="">Unassigned</option>
                {allUsers.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
              </Select>
            )}
          </div>

          {/* Team picker for manager — only shows teams assigned to this project */}
          {isManagerOnly && (
            <TeamSelector
              projectTeams={projectTeams}
              selectedTeamIds={selectedTeamIds}
              onChange={setSelectedTeamIds}
            />
          )}

          <Input label="Due Date" type="date" value={taskForm.dueDate} onChange={set('dueDate')} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowAddTask(false)}>Cancel</Button>
            <Button
              onClick={handleCreateTask}
              loading={saving}
              disabled={!taskForm.title || (isManagerOnly && selectedTeamIds.length === 0)}>
              {isManagerOnly && selectedTeamIds.length > 0
                ? `Assign to ${selectedTeamIds.length} Team(s)`
                : 'Add Task'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Edit Project Modal ── */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Project" size="lg">
        <div className="space-y-4">
          <Input
            label="Project Name *"
            value={editForm.name || ''}
            onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Project name"
          />
          <Textarea
            label="Description"
            value={editForm.description || ''}
            onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Project description"
            rows={3}
          />
          <div className="grid grid-cols-3 gap-3">
            <Select label="Status" value={editForm.status || 'planning'} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="in-progress">In Progress</option>
              <option value="on-hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
            <Select label="Priority" value={editForm.priority || 'medium'} onChange={e => setEditForm(p => ({ ...p, priority: e.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
            <Select label="Category" value={editForm.category || 'software'} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}>
              <option value="software">Software</option>
              <option value="marketing">Marketing</option>
              <option value="operations">Operations</option>
              <option value="hr">HR</option>
              <option value="finance">Finance</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={editForm.startDate || ''} onChange={e => setEditForm(p => ({ ...p, startDate: e.target.value }))} />
            <Input label="End Date" type="date" value={editForm.endDate || ''} onChange={e => setEditForm(p => ({ ...p, endDate: e.target.value }))} />
          </div>

          {/* ── Team Management ── */}
          <div className="border-t border-slate-100 pt-4">
            <TeamManager
              projectId={id}
              currentTeams={projectTeams}
              allTeams={allTeams}
              onChange={handleTeamsChanged}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleEditProject} loading={editSaving} disabled={!editForm.name?.trim()}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Project Confirmation Modal ── */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Project" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">This action cannot be undone</p>
              <p className="text-xs text-red-700 mt-1">
                Deleting <strong>"{project.name}"</strong> will permanently remove it along with all associated tasks and sprints.
              </p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Type <span className="font-mono text-red-600">{project.name}</span> to confirm
            </label>
            <input
              value={deleteConfirmName}
              onChange={e => setDeleteConfirmName(e.target.value)}
              placeholder={project.name}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <button
              onClick={handleDeleteProject}
              disabled={deleteConfirmName !== project.name || deleting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting…' : 'Delete Project'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

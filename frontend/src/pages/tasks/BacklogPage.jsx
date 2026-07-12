import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { taskAPI, projectAPI, teamAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Spinner, Modal, Button, Input, Textarea } from '../../components/ui';
import {
  Archive, RefreshCw, Filter, X, Tag, Users,
  ArrowUp, ArrowDown, Minus, OctagonAlert,
  CheckSquare, BookOpen, Flame, Bug, GitBranch,
  UserCheck, ChevronRight, ChevronLeft, Pencil, Trash2,
} from 'lucide-react';

const PRIORITY_META = {
  low:      { label: 'Low',      bg: '#f0fdf4', color: '#16a34a', icon: ArrowDown },
  medium:   { label: 'Medium',   bg: '#fffbeb', color: '#d97706', icon: Minus },
  high:     { label: 'High',     bg: '#fff7ed', color: '#ea580c', icon: ArrowUp },
  critical: { label: 'Critical', bg: '#fef2f2', color: '#dc2626', icon: OctagonAlert },
};

const TYPE_META = {
  epic:        { label: 'Epic',    icon: Flame,       color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  story:       { label: 'Story',   icon: BookOpen,    color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  task:        { label: 'Task',    icon: CheckSquare, color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  bug:         { label: 'Bug',     icon: Bug,         color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  subtask:     { label: 'Subtask', icon: GitBranch,   color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
  improvement: { label: 'Improve', icon: ArrowUp,     color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
};

function PriorityBadge({ priority }) {
  const m = PRIORITY_META[priority] || PRIORITY_META.medium;
  const Icon = m.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: m.bg, color: m.color }}>
      <Icon size={10} strokeWidth={2.5} />{m.label}
    </span>
  );
}

function TypeChip({ type }) {
  const m = TYPE_META[type] || TYPE_META.task;
  const Icon = m.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>
      <Icon size={9} /> {m.label}
    </span>
  );
}

function ClaimBadge({ task, myId }) {
  if (!task.isTeamTask) return null;
  if (task.claimedBy) {
    const isMine = String(task.claimedBy?._id || task.claimedBy) === myId;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: isMine ? '#ecfdf5' : '#fef9c3', color: isMine ? '#059669' : '#92400e', border: `1px solid ${isMine ? '#a7f3d0' : '#fde68a'}` }}>
        <UserCheck size={9} />
        {isMine ? 'Claimed by you' : `Claimed by ${task.claimedBy?.name?.split(' ')[0] || 'teammate'}`}
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
      <Users size={9} /> Team task · unclaimed
    </span>
  );
}

// ── PAGINATION ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

function Pagination({ page, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', paddingTop: 16 }}>
      <button onClick={() => onChange(page - 1)} disabled={page === 1}
        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0', background: page === 1 ? '#F8FAFC' : '#fff', color: page === 1 ? '#CBD5E1' : '#475569', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
        <ChevronLeft size={14} />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
        <button key={p} onClick={() => onChange(p)}
          style={{ minWidth: 32, padding: '6px 8px', borderRadius: 8, border: `1px solid ${p === page ? '#2563EB' : '#E2E8F0'}`, background: p === page ? '#2563EB' : '#fff', color: p === page ? '#fff' : '#475569', fontWeight: p === page ? 700 : 500, fontSize: 12, cursor: 'pointer' }}>
          {p}
        </button>
      ))}
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0', background: page === totalPages ? '#F8FAFC' : '#fff', color: page === totalPages ? '#CBD5E1' : '#475569', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>
        <ChevronRight size={14} />
      </button>
      <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 4 }}>
        {total} task{total !== 1 ? 's' : ''}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function BacklogPage() {
  const { user, isManagerOrAdmin } = useAuth();
  const myId = String(user?._id || user?.id || '');

  const [tasks, setTasks]           = useState([]);
  const [projects, setProjects]     = useState([]);
  const [teams, setTeams]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]         = useState({ project: '', priority: '', type: '', search: '' });
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage]             = useState(1);

  // Edit modal
  const [editTask, setEditTask]     = useState(null);
  const [editForm, setEditForm]     = useState({ title: '', description: '', priority: 'medium', dueDate: '' });
  const [editSaving, setEditSaving] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [tRes, pRes, teamRes] = await Promise.all([
        taskAPI.getMy().catch(() => ({ data: { data: [] } })),
        projectAPI.getAll().catch(() => ({ data: { data: [] } })),
        teamAPI.getAll().catch(() => ({ data: { teams: [] } })),
      ]);
      const allTasks = tRes.data.tasks || tRes.data.data || [];
      // Only show backlog-status tasks
      setTasks(allTasks.filter(t => t.status === 'backlog'));
      setProjects(pRes.data.projects || pRes.data.data || []);
      setTeams(teamRes.data.teams || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleClaim = async (task) => {
    try {
      await taskAPI.updateStatus(task._id, 'todo');
      setTasks(prev => prev.filter(t => t._id !== task._id));
      toast.success('Task claimed and moved to To Do on your board!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to claim task');
    }
  };

  const openEdit = (task) => {
    setEditTask(task);
    setEditForm({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      dueDate: task.dueDate ? task.dueDate.substring(0, 10) : '',
    });
  };

  const handleEditSave = async () => {
    if (!editForm.title.trim()) { toast.error('Title is required'); return; }
    setEditSaving(true);
    try {
      const payload = { ...editForm };
      if (!payload.dueDate) delete payload.dueDate;
      const res = await taskAPI.update(editTask._id, payload);
      const updated = res.data.data || res.data.task;
      setTasks(prev => prev.map(t => t._id === editTask._id ? { ...t, ...updated } : t));
      setEditTask(null);
      toast.success('Task updated!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update task');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Delete this task permanently?')) return;
    try {
      await taskAPI.delete(taskId);
      setTasks(prev => prev.filter(t => t._id !== taskId));
      toast.success('Task deleted');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete task');
    }
  };

  // Filter
  const filtered = tasks.filter(t => {
    const s = filter.search.toLowerCase();
    return (!s || t.title?.toLowerCase().includes(s) || t.project?.name?.toLowerCase().includes(s))
      && (!filter.project  || (t.project?._id || t.project) === filter.project)
      && (!filter.priority || t.priority === filter.priority)
      && (!filter.type     || t.type === filter.type);
  });

  // Separate personal vs team backlog
  const personalBacklog = filtered.filter(t => !t.isTeamTask);
  const teamBacklog      = filtered.filter(t => t.isTeamTask && (!t.claimedBy || String(t.claimedBy?._id || t.claimedBy) === myId));

  const hasFilters = filter.search || filter.project || filter.priority || filter.type;

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12 }}>
      <Spinner size="lg" />
      <p style={{ fontSize: 13, color: '#94A3B8' }}>Loading backlog…</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Header ── */}
      <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '8px 2px' }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#64748B' }}>Workspace</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 30, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
            My <span style={{ color: '#2563EB' }}>Backlog</span>
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: '#64748B' }}>
            {tasks.length} backlog task{tasks.length !== 1 ? 's' : ''} · move tasks to your board to start working
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => loadData(true)} disabled={refreshing}
            style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', cursor: 'pointer' }}>
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setFilterOpen(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: `1px solid ${hasFilters ? '#2563EB' : '#E2E8F0'}`, background: hasFilters ? '#EFF6FF' : '#fff', color: hasFilters ? '#2563EB' : '#64748B', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            <Filter size={13} /> Filters {hasFilters && '· On'}
          </button>
        </div>
      </section>

      {/* ── Stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10 }}>
        {[
          { label: 'All Backlog',  value: tasks.length,          color: '#64748B', bg: '#F8FAFC' },
          { label: 'Personal',     value: personalBacklog.length, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Team Tasks',   value: teamBacklog.length,     color: '#7C3AED', bg: '#F5F3FF' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '14px 16px', boxShadow: '0 1px 4px rgba(15,23,42,.04)' }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94A3B8' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <AnimatePresence>
        {filterOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Search</label>
                <input placeholder="Search tasks…" value={filter.search} onChange={e => { setFilter(p => ({ ...p, search: e.target.value })); setPage(1); }}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ minWidth: 150 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Project</label>
                <select value={filter.project} onChange={e => { setFilter(p => ({ ...p, project: e.target.value })); setPage(1); }}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="">All Projects</option>
                  {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ minWidth: 130 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Priority</label>
                <select value={filter.priority} onChange={e => { setFilter(p => ({ ...p, priority: e.target.value })); setPage(1); }}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="">All</option>
                  {['low','medium','high','critical'].map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ minWidth: 130 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Type</label>
                <select value={filter.type} onChange={e => { setFilter(p => ({ ...p, type: e.target.value })); setPage(1); }}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="">All Types</option>
                  {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              {hasFilters && (
                <button onClick={() => { setFilter({ project: '', priority: '', type: '', search: '' }); setPage(1); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 9, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <X size={12} /> Clear
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Personal Backlog Section ── */}
      {personalBacklog.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '.07em' }}>Personal Backlog</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '1px 8px', borderRadius: 999 }}>{personalBacklog.length}</span>
            <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 4 }}>· You can edit or delete your tasks here</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 650 }}>
              {personalBacklog.map(task => (
                <BacklogRow
                  key={task._id}
                  task={task}
                  myId={myId}
                  onClaim={handleClaim}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  isManagerOrAdmin={isManagerOrAdmin}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Team Backlog Section ── */}
      {teamBacklog.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '.07em' }}>Team Backlog</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', background: '#F5F3FF', padding: '1px 8px', borderRadius: 999 }}>{teamBacklog.length}</span>
            <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 4 }}>· Claim a task to move it to your board</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 650 }}>
              {teamBacklog.map(task => (
                <BacklogRow
                  key={task._id}
                  task={task}
                  myId={myId}
                  onClaim={handleClaim}
                  onEdit={isManagerOrAdmin ? openEdit : undefined}
                  onDelete={isManagerOrAdmin ? handleDelete : undefined}
                  isManagerOrAdmin={isManagerOrAdmin}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0' }}>
          <Archive size={40} style={{ color: '#CBD5E1', margin: '0 auto 16px' }} />
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#64748B' }}>
            {hasFilters ? 'No tasks match your filters' : 'Your backlog is empty!'}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94A3B8' }}>
            {hasFilters ? 'Try adjusting or clearing filters' : 'All caught up — no backlog tasks assigned to you'}
          </p>
        </div>
      )}

      {/* ── Edit Task Modal ── */}
      <Modal open={!!editTask} onClose={() => setEditTask(null)} title="Edit Task">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Title"
            value={editForm.title}
            onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
            placeholder="Task title"
            required
          />
          <Textarea
            label="Description"
            value={editForm.description}
            onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Optional description…"
            rows={3}
          />
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>Priority</label>
            <select value={editForm.priority} onChange={e => setEditForm(p => ({ ...p, priority: e.target.value }))}
              style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid #E2E8F0', borderRadius: 10, outline: 'none', background: '#fff' }}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>Due Date <span style={{ fontWeight: 400, color: '#94A3B8' }}>(optional)</span></label>
            <input type="date" value={editForm.dueDate} onChange={e => setEditForm(p => ({ ...p, dueDate: e.target.value }))}
              style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid #E2E8F0', borderRadius: 10, outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <Button variant="secondary" onClick={() => setEditTask(null)}>Cancel</Button>
            <Button onClick={handleEditSave} loading={editSaving} disabled={!editForm.title.trim()}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Single backlog row ────────────────────────────────────────────────────────
function BacklogRow({ task, myId, onClaim, onEdit, onDelete, isManagerOrAdmin }) {
  const isTeam = task.isTeamTask;
  const isClaimed = isTeam && task.claimedBy;
  const claimedByMe = isClaimed && String(task.claimedBy?._id || task.claimedBy) === myId;

  const isPersonal = !isTeam;

  // FIX: Check assignee, reporter, AND createdBy so employees who created/assigned
  // their own task always get edit/delete access regardless of which field is set.
  const isMyTask =
    String(task.assignee?._id  || task.assignee)  === myId ||
    String(task.reporter?._id  || task.reporter)  === myId ||
    String(task.createdBy?._id || task.createdBy) === myId;

  // Personal tasks: owner always gets edit+delete. Managers/admins always get it.
  const canEditDelete = isManagerOrAdmin || (isPersonal && isMyTask);

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: '#fff',
        border: `1px solid ${isTeam ? '#BFDBFE' : '#E2E8F0'}`,
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 1px 3px rgba(15,23,42,.04)',
      }}>

      {/* Type chip */}
      <TypeChip type={task.type} />

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{task.title}</p>
          <ClaimBadge task={task} myId={myId} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {task.project?.name && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#94A3B8' }}>
              <Tag size={9} /> {task.project.name}
            </span>
          )}
          {task.team?.name && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: task.team.color || '#7C3AED', fontWeight: 600 }}>
              <Users size={9} /> {task.team.name}
            </span>
          )}
          {task.assignee?.name && !isMyTask && (
            <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>
              → {task.assignee.name}
            </span>
          )}
          {task.dueDate && (
            <span style={{ fontSize: 10, color: new Date(task.dueDate) < new Date() ? '#DC2626' : '#94A3B8', fontWeight: new Date(task.dueDate) < new Date() ? 700 : 400 }}>
              Due {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {/* Priority */}
      <PriorityBadge priority={task.priority} />

      {/* Edit / Delete — only for own tasks or managers */}
      {canEditDelete && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {onEdit && (
            <button
              onClick={() => onEdit(task)}
              title="Edit task"
              style={{
                width: 28, height: 28, borderRadius: 7, border: '1px solid #E2E8F0',
                background: '#F8FAFC', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
            >
              <Pencil size={11} style={{ color: '#2563EB' }} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(task._id)}
              title="Delete task"
              style={{
                width: 28, height: 28, borderRadius: 7, border: '1px solid #FECACA',
                background: '#FEF2F2', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FEF2F2'; }}
            >
              <Trash2 size={11} style={{ color: '#DC2626' }} />
            </button>
          )}
        </div>
      )}

      {/* Claim / Move button */}
      <button
        onClick={() => onClaim(task)}
        disabled={isClaimed && !claimedByMe}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '7px 14px', borderRadius: 9, border: 'none',
          fontSize: 12, fontWeight: 700,
          cursor: (isClaimed && !claimedByMe) ? 'not-allowed' : 'pointer',
          flexShrink: 0,
          background: (isClaimed && !claimedByMe) ? '#F1F5F9' : isTeam ? '#EFF6FF' : '#F0FDF4',
          color: (isClaimed && !claimedByMe) ? '#94A3B8' : isTeam ? '#2563EB' : '#059669',
          opacity: (isClaimed && !claimedByMe) ? 0.5 : 1,
        }}
        title={(isClaimed && !claimedByMe) ? 'Already claimed by a teammate' : isTeam ? 'Claim and move to To Do' : 'Move to To Do'}>
        {isTeam && !isClaimed ? '↑ Claim & Start' : isClaimed && claimedByMe ? '↑ Move to To Do' : isTeam ? 'Claimed' : '↑ Start Task'}
      </button>
    </motion.div>
  );
}

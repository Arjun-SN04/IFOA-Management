import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { taskAPI, projectAPI, userAPI, commentAPI, sprintAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  Card, Button, Modal, Input, Textarea, Select,
  Badge, Avatar, Empty, Spinner, PageHeader
} from '../../components/ui';
import {
  Plus, CheckSquare, LayoutGrid, List, RefreshCw,
  AlertTriangle, Clock, CheckCircle2, Circle, XCircle,
  Eye, Filter, X, Layers, Calendar, Tag,
  ArrowDown, ArrowUp, Minus, OctagonAlert,
  MessageSquare, Send, Trash2, StickyNote, Zap, Archive
} from 'lucide-react';

// ── Status config ─────────────────────────────────────────────────────────────
const COLUMNS = [
  { key: 'backlog',      label: 'Backlog',     color: 'bg-slate-100 text-slate-600',    dot: 'bg-slate-400',   fill: '#94a3b8', icon: AlertTriangle, border: 'border-slate-200' },
  { key: 'todo',         label: 'To Do',       color: 'bg-violet-50 text-violet-700',   dot: 'bg-violet-400',  fill: '#7c3aed', icon: Circle,        border: 'border-violet-200' },
  { key: 'in-progress',  label: 'In Progress', color: 'bg-blue-50 text-blue-700',       dot: 'bg-blue-500',    fill: '#3b82f6', icon: Clock,         border: 'border-blue-200' },
  { key: 'in-review',    label: 'In Review',   color: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-500',   fill: '#f59e0b', icon: Eye,           border: 'border-amber-200' },
  { key: 'done',         label: 'Done',        color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', fill: '#10b981', icon: CheckCircle2,  border: 'border-emerald-200' },
  { key: 'blocked',      label: 'Blocked',     color: 'bg-red-50 text-red-700',         dot: 'bg-red-500',     fill: '#ef4444', icon: XCircle,       border: 'border-red-200' },
];

const PRIORITY_META = {
  low:      { label: 'Low',      bg: '#f0fdf4', color: '#16a34a', icon: ArrowDown },
  medium:   { label: 'Medium',   bg: '#fffbeb', color: '#d97706', icon: Minus },
  high:     { label: 'High',     bg: '#fff7ed', color: '#ea580c', icon: ArrowUp },
  critical: { label: 'Critical', bg: '#fef2f2', color: '#dc2626', icon: OctagonAlert },
};

// Board columns for active sprint (no backlog shown in sprint board)
const SPRINT_BOARD_COLUMNS = COLUMNS.filter(c => c.key !== 'backlog');

// ── Tiny helpers ──────────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const m = PRIORITY_META[priority] || PRIORITY_META.medium;
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold"
      style={{ background: m.bg, color: m.color }}>
      <Icon size={10} strokeWidth={2.5} />
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

// ── Active Sprint Banner ───────────────────────────────────────────────────────
function ActiveSprintBanner({ sprint, sprintTasks, onViewBoard }) {
  if (!sprint) return null;
  const done = sprintTasks.filter(t => t.status === 'done').length;
  const total = sprintTasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const daysLeft = sprint.endDate
    ? Math.ceil((new Date(sprint.endDate) - new Date()) / 86400000)
    : null;
  const isOverdue = daysLeft !== null && daysLeft < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
        borderRadius: 16, padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        boxShadow: '0 4px 20px rgba(37,99,235,0.3)',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Zap size={18} color="#fff" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Active Sprint</span>
            {daysLeft !== null && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: isOverdue ? '#ef4444' : 'rgba(255,255,255,0.2)', color: '#fff' }}>
                {isOverdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Ends today' : `${daysLeft}d left`}
              </span>
            )}
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sprint.name}
          </p>
          {sprint.goal && <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sprint.goal}</p>}
        </div>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>
          <span>{done} / {total} tasks done</span>
          <span style={{ fontWeight: 700 }}>{pct}%</span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 999, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8 }}
            style={{ height: '100%', background: '#fff', borderRadius: 999 }} />
        </div>
      </div>

      <button
        onClick={onViewBoard}
        style={{
          padding: '9px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.4)',
          background: 'rgba(255,255,255,0.15)', color: '#fff',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          backdropFilter: 'blur(4px)', flexShrink: 0,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
        View Sprint Board
      </button>
    </motion.div>
  );
}

// ── Task Notes Panel ──────────────────────────────────────────────────────────
function TaskNotesPanel({ task, currentUser }) {
  const [notes, setNotes]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving]   = useState(false);
  const textareaRef           = useRef(null);

  useEffect(() => {
    if (!task?._id) return;
    setLoading(true);
    commentAPI.getTaskComments(task._id)
      .then(res => setNotes(res.data?.comments || []))
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [task?._id]);

  const handleAddNote = async () => {
    const content = newNote.trim();
    if (!content) return;
    setSaving(true);
    try {
      const res = await commentAPI.add({ content, task: task._id });
      const created = res.data?.comment;
      if (created) setNotes(prev => [...prev, created]);
      setNewNote('');
      toast.success('Note added', { icon: '📝', duration: 1800 });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to add note');
    } finally { setSaving(false); }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await commentAPI.delete(noteId);
      setNotes(prev => prev.filter(n => n._id !== noteId));
      toast.success('Note deleted');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete note');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleAddNote(); }
  };

  return (
    <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <StickyNote size={13} style={{ color: '#2563EB' }} />
        </div>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Notes &amp; Comments</p>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, background: '#F1F5F9', color: '#64748B', padding: '2px 8px', borderRadius: 999 }}>{notes.length}</span>
      </div>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}><Spinner size="sm" /></div>
      ) : notes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '18px 0', background: '#F8FAFC', borderRadius: 12, border: '1px dashed #E2E8F0', marginBottom: 12 }}>
          <MessageSquare size={20} style={{ color: '#CBD5E1', margin: '0 auto 6px' }} />
          <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>No notes yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, maxHeight: 260, overflowY: 'auto' }}>
          {notes.map((note) => {
            const isOwner = note.author?._id === currentUser?._id || note.author?._id === currentUser?.id;
            const isAdmin = currentUser?.role === 'admin';
            const canDelete = isOwner || isAdmin;
            const initials = (note.author?.name || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
            const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];
            const colorIdx = (note.author?.name || '').charCodeAt(0) % colors.length;
            return (
              <motion.div key={note._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '10px 12px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0, background: colors[colorIdx], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{note.author?.name || 'Unknown'}</span>
                      <span style={{ fontSize: 10, color: '#94A3B8' }}>
                        {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' · '}{new Date(note.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.5, wordBreak: 'break-word' }}>{note.content}</p>
                  </div>
                  {canDelete && (
                    <button onClick={() => handleDeleteNote(note._id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 6, color: '#CBD5E1', flexShrink: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <textarea ref={textareaRef} value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Add a note… (Ctrl+Enter to submit)" rows={2}
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 12, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#F8FAFC' }}
            onFocus={e => { e.target.style.borderColor = '#3B82F6'; e.target.style.background = '#fff'; }}
            onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC'; }} />
        </div>
        <button onClick={handleAddNote} disabled={saving || !newNote.trim()}
          style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: newNote.trim() ? '#2563EB' : '#E2E8F0', color: newNote.trim() ? '#fff' : '#94A3B8', cursor: newNote.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
          {saving ? <Spinner size="xs" /> : <Send size={13} />} Add
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function TasksPage() {
  const { isManagerOrAdmin, user } = useAuth();
  const { taskEvents } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = user?.role === 'admin';

  const [tasks, setTasks]           = useState([]);
  const [projects, setProjects]     = useState([]);
  const [users, setUsers]           = useState([]);
  const [sprints, setSprints]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView]             = useState('kanban');
  const [activeTab, setActiveTab]   = useState('tasks');
  // boardScope: 'sprint' (active sprint tasks) | 'backlog' (unassigned tasks) | 'all'
  const [boardScope, setBoardScope] = useState('sprint');
  const [taskView, setTaskView]     = useState('active'); // for non-managers
  const [filter, setFilter]         = useState({ project: '', priority: '', status: '', search: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected]     = useState(null);
  const [form, setForm]             = useState({ title: '', description: '', priority: 'medium', status: 'todo', project: '', assignee: '', dueDate: '', assignToAll: false, sprint: '' });
  const [saving, setSaving]         = useState(false);
  const [drag, setDrag]             = useState(null);
  const [dragOver, setDragOver]     = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const kanbanRef     = useRef(null);
  const scrollRafRef  = useRef(null);
  const isDraggingRef = useRef(false);

  const stopAutoScroll = useCallback(() => {
    if (scrollRafRef.current) { cancelAnimationFrame(scrollRafRef.current); scrollRafRef.current = null; }
  }, []);

  const startAutoScroll = useCallback((speed) => {
    stopAutoScroll();
    const step = () => {
      if (!isDraggingRef.current || !kanbanRef.current) return;
      kanbanRef.current.scrollLeft += speed;
      scrollRafRef.current = requestAnimationFrame(step);
    };
    scrollRafRef.current = requestAnimationFrame(step);
  }, [stopAutoScroll]);

  const handleKanbanDragOver = useCallback((e) => {
    if (!isDraggingRef.current || !kanbanRef.current) return;
    const { left, right, width } = kanbanRef.current.getBoundingClientRect();
    const ZONE = Math.min(140, width * 0.18);
    const x = e.clientX;
    if (x < left + ZONE) { const intensity = 1 - (x - left) / ZONE; startAutoScroll(-(6 + intensity * 12)); }
    else if (x > right - ZONE) { const intensity = 1 - (right - x) / ZONE; startAutoScroll(6 + intensity * 12); }
    else stopAutoScroll();
  }, [startAutoScroll, stopAutoScroll]);

  useEffect(() => () => stopAutoScroll(), [stopAutoScroll]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [tRes, pRes, uRes, sRes] = await Promise.all([
        isManagerOrAdmin
          ? taskAPI.getAll().catch(() => ({ data: { data: [] } }))
          : taskAPI.getMy().catch(() => ({ data: { data: [] } })),
        projectAPI.getAll().catch(() => ({ data: { data: [] } })),
        isManagerOrAdmin ? userAPI.getAll().catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } }),
        sprintAPI.getAll().catch(() => ({ data: { sprints: [] } })),
      ]);
      setTasks(tRes.data.tasks || tRes.data.data || []);
      setProjects(pRes.data.projects || pRes.data.data || []);
      setUsers(uRes.data.users || uRes.data.data || []);
      const sprintData = sRes.data.sprints || sRes.data.data || [];
      setSprints(sprintData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isManagerOrAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (!taskId || !tasks.length) return;
    const task = tasks.find(t => t._id === taskId);
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
      if (isManagerOrAdmin) toast.success(`New task: ${payload.title}`);
    } else if (type === 'updated' || type === 'statusChanged') {
      const u = payload.task || payload;
      setTasks(prev => prev.map(t => t._id === u._id ? { ...t, ...u } : t));
      if (selected?._id === u._id) setSelected(s => ({ ...s, ...u }));
    } else if (type === 'deleted') {
      setTasks(prev => prev.filter(t => t._id !== payload.taskId));
    }
  }, [taskEvents, isManagerOrAdmin, selected]);

  // Derived sprint data
  const activeSprint = sprints.find(s => s.status === 'active');

  // Tasks in active sprint
  const activeSprintTasks = activeSprint
    ? tasks.filter(t => (t.sprint?._id || t.sprint) === activeSprint._id)
    : [];

  // Tasks NOT in any sprint (backlog)
  const backlogOnlyTasks = tasks.filter(t => !t.sprint);

  // Scoped tasks for the board
  const scopedTasks = (() => {
    if (!isManagerOrAdmin) {
      // For regular users: show their tasks in active sprint, or all if no active sprint
      if (activeSprint) {
        return taskView === 'completed'
          ? tasks.filter(t => t.status === 'done')
          : activeSprintTasks.filter(t => t.status !== 'done');
      }
      return taskView === 'completed'
        ? tasks.filter(t => t.status === 'done')
        : tasks.filter(t => t.status !== 'done');
    }
    if (boardScope === 'sprint') return activeSprint ? activeSprintTasks : tasks;
    if (boardScope === 'backlog') return backlogOnlyTasks;
    return tasks; // 'all'
  })();

  const filtered = scopedTasks.filter(t => {
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
    const done = pTasks.filter(t => t.status === 'done').length;
    return { ...p, tasks: pTasks, done, pct: pTasks.length ? Math.round((done / pTasks.length) * 100) : 0 };
  }).filter(p => p.tasks.length > 0);

  const handleCreate = async () => {
    setSaving(true);
    try {
      // Auto-assign to active sprint if in sprint scope
      const payload = { ...form };
      if (boardScope === 'sprint' && activeSprint && !payload.sprint) {
        payload.sprint = activeSprint._id;
      }
      const res = await taskAPI.create(payload);
      const newTasks = res.data.tasks || [];
      const newTask = res.data.data || res.data.task;
      if (newTasks.length) setTasks(prev => [...newTasks, ...prev]);
      else if (newTask) setTasks(prev => [newTask, ...prev]);
      setShowCreate(false);
      setForm({ title: '', description: '', priority: 'medium', status: 'todo', project: '', assignee: '', dueDate: '', assignToAll: false, sprint: '' });
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
      toast.success(`Moved to "${newStatus.replace('-', ' ')}"`, { duration: 1800 });
    } catch {
      toast.error('Status update failed');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!isAdmin) return;
    if (!window.confirm('Delete this task permanently?')) return;
    try {
      await taskAPI.delete(taskId);
      setTasks(prev => prev.filter(t => t._id !== taskId));
      if (selected?._id === taskId) setSelected(null);
      toast.success('Task deleted');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleDrop = (colKey) => {
    if (drag && drag !== colKey) handleStatusChange(drag, colKey);
    setDrag(null); setDragOver(null);
    isDraggingRef.current = false;
    stopAutoScroll();
  };

  const setF = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const hasFilters = filter.search || filter.project || filter.priority || filter.status;
  const completedCount  = tasks.filter(t => t.status === 'done').length;
  const activeCount     = tasks.filter(t => t.status !== 'done').length;
  const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
  const overdueCount    = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length;

  // Board columns: if viewing sprint scope, skip 'backlog'; else show all
  const boardColumns = (isManagerOrAdmin && boardScope === 'sprint') ? SPRINT_BOARD_COLUMNS : COLUMNS;

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-slate-400">Loading tasks…</p>
    </div>
  );

  return (
    <div className="space-y-6 min-h-full">
      {/* ── Hero Header ───────────────────────────────────────────────────── */}
      <section style={{ padding: '8px 2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B' }}>Workspace</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 30, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
            {isManagerOrAdmin ? 'All' : 'My'} <span style={{ color: '#2563EB' }}>Tasks</span>
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: '#64748B' }}>
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} {isManagerOrAdmin ? 'across the workspace' : 'assigned to you'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => loadData(true)} disabled={refreshing}
            style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', cursor: 'pointer' }}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {isManagerOrAdmin && (
            <div style={{ display: 'flex', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 3, gap: 2 }}>
              {[{ key: 'tasks', label: 'Tasks' }, { key: 'report', label: 'Reports' }].map(({ key, label }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  style={{ padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: activeTab === key ? '#0F172A' : 'transparent', color: activeTab === key ? '#fff' : '#64748B', transition: 'all 0.15s' }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div style={{ display: 'flex', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 3, gap: 2 }}>
              {[{ key: 'kanban', icon: LayoutGrid, label: 'Board' }, { key: 'list', icon: List, label: 'List' }].map(({ key, icon: Icon, label }) => (
                <button key={key} onClick={() => setView(key)}
                  style={{ padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, background: view === key ? '#0F172A' : 'transparent', color: view === key ? '#fff' : '#64748B', transition: 'all 0.15s' }}>
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
          )}

          {isManagerOrAdmin && (
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowCreate(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, background: '#2563EB', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}>
              <Plus className="w-4 h-4" /> New Task
            </motion.button>
          )}
        </div>
      </section>

      {/* ── Active Sprint Banner ─────────────────────────────────────────── */}
      {activeTab === 'tasks' && activeSprint && (
        <ActiveSprintBanner
          sprint={activeSprint}
          sprintTasks={activeSprintTasks}
          onViewBoard={() => { setBoardScope('sprint'); setView('kanban'); window.location.href = '/sprints'; }}
        />
      )}

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

      {/* ── Board scope selector (admin) ─────────────────────────────────── */}
      {isManagerOrAdmin && activeTab === 'tasks' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {[
            { key: 'sprint', label: activeSprint ? `Sprint Board` : 'Board', icon: Zap,         count: activeSprint ? activeSprintTasks.length : tasks.length },
            { key: 'backlog', label: 'Backlog',                               icon: Archive,     count: backlogOnlyTasks.length },
            { key: 'all',    label: 'All Tasks',                              icon: CheckSquare, count: tasks.length },
          ].map(({ key, label, icon: Icon, count }) => (
            <button key={key} onClick={() => setBoardScope(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: boardScope === key ? '#0F172A' : '#F8FAFC',
                color: boardScope === key ? '#fff' : '#64748B',
                border: boardScope === key ? '1px solid transparent' : '1px solid #E2E8F0',
                transition: 'all 0.15s',
              }}>
              <Icon size={14} />
              {label}
              <span style={{ fontSize: 11, fontWeight: 800, padding: '1px 6px', borderRadius: 6, background: boardScope === key ? 'rgba(255,255,255,0.2)' : '#E2E8F0', color: boardScope === key ? '#fff' : '#64748B' }}>{count}</span>
            </button>
          ))}
          {boardScope === 'sprint' && !activeSprint && (
            <span style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>No active sprint — showing all tasks</span>
          )}
          {boardScope === 'sprint' && activeSprint && (
            <span style={{ fontSize: 12, color: '#2563EB', fontWeight: 600 }}>
              Showing tasks for: <strong>{activeSprint.name}</strong>
            </span>
          )}
        </div>
      )}

      {/* ── User active/completed toggle ─────────────────────────────────── */}
      {!isManagerOrAdmin && (
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { key: 'active',    label: activeSprint ? 'Current Sprint' : 'Active', count: activeCount, cls: 'bg-slate-900 text-white', icon: activeSprint ? Zap : Clock },
            { key: 'completed', label: 'Completed', count: completedCount, cls: 'bg-emerald-600 text-white', icon: CheckCircle2 },
          ].map(({ key, label, count, cls, icon: Icon }) => (
            <button key={key} onClick={() => setTaskView(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                taskView === key ? `${cls} border-transparent shadow-sm` : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}>
              <Icon className="w-4 h-4" />
              {label}
              <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${taskView === key ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
            </button>
          ))}
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
            <motion.div key={p._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
              className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${p.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : p.status === 'in-progress' || p.status === 'active' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{p.status?.replace('-', ' ')}</span>
                  </div>
                  <p className="text-xs text-slate-400">{p.tasks.length} tasks · {p.done} done</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-3xl font-black ${p.pct === 100 ? 'text-emerald-600' : p.pct >= 50 ? 'text-blue-600' : 'text-slate-700'}`}>{p.pct}%</p>
                  <p className="text-xs text-slate-400">complete</p>
                </div>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-5">
                <motion.div initial={{ width: 0 }} animate={{ width: `${p.pct}%` }} transition={{ duration: 0.8, delay: idx * 0.06 + 0.2 }}
                  className="h-full rounded-full" style={{ background: p.pct === 100 ? '#10b981' : 'linear-gradient(90deg,#3b82f6,#6366f1)' }} />
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
                          <select value={task.status} onChange={e => handleStatusChange(task._id, e.target.value)} onClick={e => e.stopPropagation()}
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
            {boardColumns.map(col => {
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
              <Filter className="w-3.5 h-3.5" /> Filters
              {hasFilters && <span className="ml-1 text-[10px] font-bold">On</span>}
            </motion.button>
          </div>

          {/* Expandable filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end shadow-sm">
                  <div className="flex-1 min-w-48">
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">Search</label>
                    <input placeholder="Task or assignee…" value={filter.search} onChange={e => setFilter(p => ({ ...p, search: e.target.value }))}
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

          {/* ── KANBAN ───────────────────────────────────────────────── */}
          {view === 'kanban' && (
            <motion.div ref={kanbanRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onDragOver={handleKanbanDragOver}
              onDragLeave={e => { if (!kanbanRef.current?.contains(e.relatedTarget)) stopAutoScroll(); }}
              style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16, scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent' }}>
              {boardColumns.map((col) => {
                if (!isManagerOrAdmin && taskView === 'completed' && col.key !== 'done') return null;
                const colTasks = filtered.filter(t => t.status === col.key);
                const Icon = col.icon;
                const isOver = dragOver === col.key;
                return (
                  <div key={col.key} style={{ flexShrink: 0, width: 272 }}
                    onDragOver={e => { e.preventDefault(); setDragOver(col.key); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={() => handleDrop(col.key)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '10px 12px', borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0', borderLeft: `3px solid ${col.fill}`, boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
                      <Icon size={13} style={{ color: col.fill, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1 }}>{col.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: col.fill, padding: '1px 7px', borderRadius: 999, minWidth: 20, textAlign: 'center' }}>{colTasks.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80, borderRadius: 14, padding: 4, border: isOver ? `2px dashed ${col.fill}` : '2px solid transparent', background: isOver ? col.fill + '08' : 'transparent', transition: 'all 0.15s' }}>
                      {colTasks.length === 0 && (
                        <div style={{ border: '1px dashed #CBD5E1', borderRadius: 12, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <p style={{ fontSize: 11, color: '#94A3B8' }}>{isManagerOrAdmin ? 'Drag tasks here' : 'No tasks'}</p>
                        </div>
                      )}
                      {colTasks.map((task, taskIdx) => (
                        <motion.div key={task._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: taskIdx * 0.04 }}
                          whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(15,23,42,0.10)' }}
                          draggable={isManagerOrAdmin}
                          onDragStart={() => { if (!isManagerOrAdmin) return; isDraggingRef.current = true; setDrag(task._id); }}
                          onDragEnd={() => { isDraggingRef.current = false; setDrag(null); setDragOver(null); stopAutoScroll(); }}
                          onClick={() => setSelected(task)}
                          style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '12px 14px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(15,23,42,0.05)', transition: 'border-color 0.15s' }}>
                          <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: '#0F172A', lineHeight: 1.4 }}>{task.title}</p>
                          {task.project?.name && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                              <Tag size={10} style={{ color: '#94A3B8' }} />
                              <p style={{ margin: 0, fontSize: 10, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.project.name}</p>
                            </div>
                          )}
                          {task.sprint?.name && boardScope !== 'sprint' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                              <Zap size={10} style={{ color: '#3b82f6' }} />
                              <p style={{ margin: 0, fontSize: 10, color: '#3b82f6', fontWeight: 600 }}>{task.sprint.name}</p>
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #F1F5F9' }}>
                            <PriorityBadge priority={task.priority} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                      <motion.div key={task._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }}
                        onClick={() => setSelected(task)}
                        className="grid grid-cols-[1fr_130px_100px_160px_100px] gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/70 transition-all items-center group">
                        <div className="flex items-center gap-3 min-w-0">
                          {task.assignee && <Avatar name={task.assignee?.name} size="xs" />}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">{task.title}</p>
                            {task.assignee && isManagerOrAdmin && <p className="text-xs text-slate-400 truncate">{task.assignee.name}</p>}
                            {task.sprint?.name && (
                              <p style={{ fontSize: 10, color: '#3b82f6', fontWeight: 600, margin: 0 }}><Zap size={9} style={{ display: 'inline', marginRight: 3 }} />{task.sprint.name}</p>
                            )}
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
            {/* Sprint badge */}
            {selected.sprint?.name && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: 12, fontWeight: 600, color: '#1D4ED8' }}>
                <Zap size={12} /> {selected.sprint.name}
              </div>
            )}
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
            <TaskNotesPanel task={selected} currentUser={user} />
            <div className="flex justify-end gap-2 pt-1">
              {isAdmin && <Button variant="danger" onClick={() => handleDeleteTask(selected._id)}>Delete Task</Button>}
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
              {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
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
          {/* Sprint assignment */}
          {sprints.filter(s => s.status !== 'completed').length > 0 && (
            <Select label="Sprint" value={form.sprint} onChange={setF('sprint')}>
              <option value="">Backlog (no sprint)</option>
              {sprints.filter(s => s.status !== 'completed').map(s => (
                <option key={s._id} value={s._id}>
                  {s.status === 'active' ? '⚡ ' : ''}{s.name} ({s.status})
                </option>
              ))}
            </Select>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving} disabled={!form.title || !form.project}>Create Task</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

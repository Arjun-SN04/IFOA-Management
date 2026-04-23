import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { taskAPI, projectAPI, userAPI, commentAPI, sprintAPI, teamAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  Card, Button, Modal, Input, Textarea, Select,
  Badge, Avatar, Empty, Spinner, PageHeader
} from '../../components/ui';
import {
  Plus, CheckSquare, LayoutGrid, List, RefreshCw,
  AlertTriangle, Clock, CheckCircle2, Circle,
  Eye, Filter, X, Layers, Calendar, Tag,
  ArrowDown, ArrowUp, Minus, OctagonAlert,
  MessageSquare, Send, Trash2, StickyNote, Zap, Archive,
  ChevronRight, ChevronDown, BookOpen, Flame, Bug, GitBranch,
  Ticket, Users, Lock, UserCheck
} from 'lucide-react';

// ── Column config ─────────────────────────────────────────────────────────────
const COLUMNS = [
  { key: 'backlog',     label: 'Backlog',     color: 'bg-slate-100 text-slate-600',    dot: 'bg-slate-400',   fill: '#94a3b8', icon: AlertTriangle, border: 'border-slate-200' },
  { key: 'todo',        label: 'To Do',       color: 'bg-violet-50 text-violet-700',   dot: 'bg-violet-400',  fill: '#7c3aed', icon: Circle,        border: 'border-violet-200' },
  { key: 'in-progress', label: 'In Progress', color: 'bg-blue-50 text-blue-700',       dot: 'bg-blue-500',    fill: '#3b82f6', icon: Clock,         border: 'border-blue-200' },
  { key: 'in-review',   label: 'In Review',   color: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-500',   fill: '#f59e0b', icon: Eye,           border: 'border-amber-200' },
  { key: 'done',        label: 'Done',        color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', fill: '#10b981', icon: CheckCircle2,  border: 'border-emerald-200' },
];

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

const BOARD_COLUMNS      = COLUMNS.filter(c => c.key !== 'backlog'); // board never shows backlog column
const SPRINT_BOARD_COLS  = COLUMNS.filter(c => c.key !== 'backlog');

// ── Small UI helpers ──────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const m = PRIORITY_META[priority] || PRIORITY_META.medium;
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold" style={{ background: m.bg, color: m.color }}>
      <Icon size={10} strokeWidth={2.5} />{m.label}
    </span>
  );
}

function StatusPill({ status }) {
  const col = COLUMNS.find(c => c.key === status) || COLUMNS[0];
  const Icon = col.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${col.color} ${col.border}`}>
      <Icon className="w-3 h-3" />{col.label}
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
    <motion.div whileHover={{ y: -3 }} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 shadow-sm">
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

function TypeChip({ type }) {
  const m = TYPE_META[type] || TYPE_META.task;
  const Icon = m.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>
      <Icon size={9} /> {m.label}
    </span>
  );
}

// Claim badge shown on team tasks
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

function ActiveSprintBanner({ sprint, sprintTasks, onViewBoard }) {
  if (!sprint) return null;
  const done  = sprintTasks.filter(t => t.status === 'done').length;
  const total = sprintTasks.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;
  const daysLeft  = sprint.endDate ? Math.ceil((new Date(sprint.endDate) - new Date()) / 86400000) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0;
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: 'linear-gradient(135deg,#1e40af 0%,#3b82f6 100%)', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', boxShadow: '0 4px 20px rgba(37,99,235,.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Zap size={18} color="#fff" /></div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.7)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Active Sprint</span>
            {daysLeft !== null && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: isOverdue ? '#ef4444' : 'rgba(255,255,255,.2)', color: '#fff' }}>{isOverdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Ends today' : `${daysLeft}d left`}</span>}
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sprint.name}</p>
          {sprint.goal && <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,.65)' }}>{sprint.goal}</p>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,.8)' }}><span>{done} / {total} done</span><span style={{ fontWeight: 700 }}>{pct}%</span></div>
        <div style={{ height: 6, background: 'rgba(255,255,255,.25)', borderRadius: 999, overflow: 'hidden' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: .8 }} style={{ height: '100%', background: '#fff', borderRadius: 999 }} />
        </div>
      </div>
      <button onClick={onViewBoard}
        style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,.4)', background: 'rgba(255,255,255,.15)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.25)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.15)'}>
        View Sprint Board
      </button>
    </motion.div>
  );
}

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

  const handleAdd = async () => {
    const content = newNote.trim();
    if (!content) return;
    setSaving(true);
    try {
      const res = await commentAPI.add({ content, task: task._id });
      const created = res.data?.comment;
      if (created) setNotes(prev => [...prev, created]);
      setNewNote('');
      toast.success('Note added', { icon: '📝', duration: 1800 });
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to add note'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await commentAPI.delete(id);
      setNotes(prev => prev.filter(n => n._id !== id));
      toast.success('Note deleted');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to delete note'); }
  };

  const colors = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#EC4899'];

  return (
    <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><StickyNote size={13} style={{ color: '#2563EB' }} /></div>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.08em' }}>Notes &amp; Comments</p>
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
          {notes.map(note => {
            const isOwner = note.author?._id === (currentUser?._id || currentUser?.id);
            const canDel  = isOwner || currentUser?.role === 'admin';
            const idx     = (note.author?.name || '').charCodeAt(0) % colors.length;
            const initials = (note.author?.name || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
            return (
              <motion.div key={note._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '10px 12px', boxShadow: '0 1px 3px rgba(15,23,42,.04)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0, background: colors[idx], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{note.author?.name || 'Unknown'}</span>
                      <span style={{ fontSize: 10, color: '#94A3B8' }}>{new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {new Date(note.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.5, wordBreak: 'break-word' }}>{note.content}</p>
                  </div>
                  {canDel && (
                    <button onClick={() => handleDelete(note._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 6, color: '#CBD5E1', flexShrink: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#EF4444'} onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}>
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
          <textarea ref={textareaRef} value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleAdd(); } }}
            placeholder="Add a note… (Ctrl+Enter to submit)" rows={2}
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 12, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#F8FAFC' }}
            onFocus={e => { e.target.style.borderColor = '#3B82F6'; e.target.style.background = '#fff'; }}
            onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC'; }} />
        </div>
        <button onClick={handleAdd} disabled={saving || !newNote.trim()}
          style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: newNote.trim() ? '#2563EB' : '#E2E8F0', color: newNote.trim() ? '#fff' : '#94A3B8', cursor: newNote.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
          {saving ? <Spinner size="xs" /> : <Send size={13} />} Add
        </button>
      </div>
    </div>
  );
}

function HierarchyView({ tasks, onSelect, onCreateChild, canCreate, handleStatusChange }) {
  const [expanded, setExpanded] = useState({});
  const epics    = tasks.filter(t => t.type === 'epic' && !t.parent);
  const stories  = tasks.filter(t => t.type === 'story' && !t.parent);
  const topTasks = tasks.filter(t => ['task','bug','improvement'].includes(t.type) && !t.parent);
  const childrenOf = (pid) => tasks.filter(t => (t.parent?._id || t.parent) === pid);
  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const TaskRow = ({ task, depth = 0 }) => {
    const children   = childrenOf(task._id);
    const isOpen     = expanded[task._id];
    const col        = COLUMNS.find(c => c.key === task.status) || COLUMNS[0];
    const StatusIcon = col.icon;
    const m          = TYPE_META[task.type] || TYPE_META.task;
    const TypeIcon   = m.icon;
    return (
      <>
        <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `10px 14px 10px ${16 + depth * 28}px`, borderBottom: '1px solid #F8FAFC', background: depth === 0 ? '#fff' : depth === 1 ? '#FAFAFA' : '#F8FAFC', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
          onMouseLeave={e => e.currentTarget.style.background = depth === 0 ? '#fff' : depth === 1 ? '#FAFAFA' : '#F8FAFC'}>
          <div style={{ width: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={e => { e.stopPropagation(); if (children.length) toggle(task._id); }}>
            {children.length ? (isOpen ? <ChevronDown size={13} style={{ color: '#64748B' }} /> : <ChevronRight size={13} style={{ color: '#64748B' }} />) : <span style={{ width: 13 }} />}
          </div>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TypeIcon size={11} style={{ color: m.color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }} onClick={() => onSelect(task)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {task.taskKey && <span style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', fontFamily: 'monospace', flexShrink: 0 }}>{task.taskKey}</span>}
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
            </div>
            {children.length > 0 && !isOpen && <span style={{ fontSize: 10, color: '#94A3B8' }}>{children.length} child item{children.length !== 1 ? 's' : ''}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <PriorityBadge priority={task.priority} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: col.fill }}><StatusIcon size={10} /> {col.label}</span>
            {task.assignee?.name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 20, height: 20, borderRadius: 999, background: '#3b82f6', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{task.assignee.name.charAt(0).toUpperCase()}</div>
                <span style={{ fontSize: 10, color: '#64748B' }}>{task.assignee.name.split(' ')[0]}</span>
              </div>
            )}
            {canCreate && (
              <button onClick={e => { e.stopPropagation(); onCreateChild(task); }}
                style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                + Child
              </button>
            )}
          </div>
        </motion.div>
        <AnimatePresence>{isOpen && children.map(child => <TaskRow key={child._id} task={child} depth={depth + 1} />)}</AnimatePresence>
      </>
    );
  };

  if (tasks.length === 0) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0' }}>
      <Layers size={32} style={{ color: '#CBD5E1', margin: '0 auto 12px' }} />
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#64748B' }}>No tasks yet</p>
    </div>
  );

  const epicChildren    = (eid) => tasks.filter(t => (t.parent?._id || t.parent) === eid);
  const storyRoots      = stories.filter(s => !epics.some(e => epicChildren(e._id).some(c => c._id === s._id)));
  const taskRoots       = topTasks.filter(t => !epics.some(e => epicChildren(e._id).some(c => c._id === t._id)));

  return (
    <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 12px rgba(15,23,42,.05)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 140px 80px', gap: 8, padding: '10px 14px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        {['Issue','Priority','Status','Assignee','Action'].map(h => (
          <span key={h} style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', paddingLeft: h === 'Issue' ? 46 : 0 }}>{h}</span>
        ))}
      </div>
      {epics.map(e => <TaskRow key={e._id} task={e} depth={0} />)}
      {storyRoots.map(s => <TaskRow key={s._id} task={s} depth={0} />)}
      {taskRoots.map(t => <TaskRow key={t._id} task={t} depth={0} />)}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function TasksPage() {
  const { isManagerOrAdmin, isHROrAbove, isTeamLead, isEmployee, isHR, user } = useAuth();
  const { taskEvents } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();

  const myId    = String(user?._id || user?.id || '');
  const isAdmin = user?.role === 'admin';

  // Keep employee and team lead capabilities aligned for task creation.
  const canCreateTask = isManagerOrAdmin || isTeamLead || isEmployee;
  // Who can see the full management board (all tasks)
  const isElevatedView = isManagerOrAdmin; // HR gets a read-only scoped view

  const [tasks, setTasks]           = useState([]);
  const [projects, setProjects]     = useState([]);
  const [users, setUsers]           = useState([]);
  const [teams, setTeams]           = useState([]);
  const [sprints, setSprints]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView]             = useState('kanban');
  const [activeTab, setActiveTab]   = useState('tasks');
  const [boardScope, setBoardScope] = useState('sprint');
  const [taskView, setTaskView]     = useState('active');
  // Personal vs Team board mode — for non-management employees/team leads
  const [boardMode, setBoardMode]   = useState('personal');
  const [filter, setFilter]         = useState({ project: '', priority: '', status: '', search: '' });
  const [showCreate, setShowCreate]     = useState(false);
  const [showTicket, setShowTicket]     = useState(false);
  const [selected, setSelected]         = useState(null);
  const [createChildParent, setCreateChildParent] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', status: 'backlog',
    type: 'task', project: '', team: '', assignee: '', dueDate: '',
    assignToAll: false, assignToTeam: false, sprint: '', parent: '',
  });
  const [ticketForm, setTicketForm] = useState({ title: '', description: '', priority: 'medium', type: 'bug', project: '' });
  const [saving, setSaving]         = useState(false);
  const [savingTicket, setSavingTicket] = useState(false);
  const [drag, setDrag]             = useState(null);   // task._id being dragged
  const [dragOver, setDragOver]     = useState(null);   // column key being hovered
  const kanbanRef    = useRef(null);
  const scrollRafRef = useRef(null);
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
    if (x < left + ZONE)       startAutoScroll(-(6 + (1 - (x - left) / ZONE) * 12));
    else if (x > right - ZONE) startAutoScroll(6 + (1 - (right - x) / ZONE) * 12);
    else stopAutoScroll();
  }, [startAutoScroll, stopAutoScroll]);
  useEffect(() => () => stopAutoScroll(), [stopAutoScroll]);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [tRes, pRes, uRes, sRes, teamRes] = await Promise.all([
        // Management + HR see all tasks; team lead + employee see own
        (isElevatedView || isHROrAbove || isTeamLead || isEmployee)
          ? taskAPI.getAll().catch(() => ({ data: { data: [] } }))
          : taskAPI.getMy().catch(() => ({ data: { data: [] } })),
        projectAPI.getAll().catch(() => ({ data: { data: [] } })),
        taskAPI.getAssignableUsers().catch(() => ({ data: { data: [] } })),
        sprintAPI.getAll().catch(() => ({ data: { sprints: [] } })),
        (isElevatedView || isHROrAbove || isTeamLead)
          ? teamAPI.getAll().catch(() => ({ data: { teams: [] } }))
          : teamAPI.getAll().catch(() => ({ data: { teams: [] } })),
      ]);
      const allUsers = uRes.data.users || uRes.data.data || [];
      // Only show employees + team leads as assignable
      const assignableUsers = allUsers.filter(u => ['employee', 'team_lead'].includes(u.role));
      setTasks(tRes.data.tasks || tRes.data.data || []);
      setProjects(pRes.data.projects || pRes.data.data || []);
      setUsers(assignableUsers);
      setSprints(sRes.data.sprints || sRes.data.data || []);
      setTeams(teamRes.data.teams || []);
    } finally { setLoading(false); setRefreshing(false); }
  }, [isElevatedView, isHROrAbove, isTeamLead, isEmployee]);

  useEffect(() => { loadData(); }, [loadData]);

  // Open task from URL param
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

  // ── Socket events ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!taskEvents) return;
    const { type, payload } = taskEvents;
    if (type === 'created') {
      setTasks(prev => prev.find(t => t._id === (payload._id || payload.task?._id)) ? prev : [payload, ...prev]);
      if (isElevatedView) toast.success(`New task: ${payload.title}`);
    } else if (type === 'updated' || type === 'statusChanged') {
      const u = payload.task || payload;
      setTasks(prev => prev.map(t => t._id === u._id ? { ...t, ...u } : t));
      if (selected?._id === u._id) setSelected(s => ({ ...s, ...u }));
    } else if (type === 'deleted') {
      setTasks(prev => prev.filter(t => t._id !== payload.taskId));
    } else if (type === 'claimed') {
      // A teammate claimed a shared task — update it in our local state
      const claimedTask = payload.task;
      if (claimedTask) {
        setTasks(prev => prev.map(t => t._id === claimedTask._id ? { ...t, ...claimedTask } : t));
        if (selected?._id === claimedTask._id) setSelected(s => ({ ...s, ...claimedTask }));
        // If someone else claimed it and it's no longer in backlog, remove from our view if needed
        if (String(payload.claimedBy) !== myId) {
          toast(`A team task was claimed by a teammate`, { icon: '👋', duration: 3000 });
        }
      }
    }
  }, [taskEvents, isElevatedView, selected, myId]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const activeSprint      = sprints.find(s => s.status === 'active');
  const activeSprintTasks = activeSprint ? tasks.filter(t => (t.sprint?._id || t.sprint) === activeSprint._id) : [];
  const backlogOnlyTasks  = tasks.filter(t => t.status === 'backlog');

  // ── Scoped tasks based on role + board mode ────────────────────────────────
  const scopedTasks = (() => {
    // Manager / Admin: full org view
    if (isElevatedView) {
      if (boardScope === 'sprint') return activeSprint ? activeSprintTasks : tasks;
      if (boardScope === 'backlog') return backlogOnlyTasks;
      return tasks;
    }

    // HR: read-only, sees all tasks but cannot drag/drop
    if (isHR) return tasks;

    // Team Lead + Employee: identical board behavior
    if (isTeamLead || isEmployee) {
      const base = taskView === 'completed'
        ? tasks.filter(t => t.status === 'done')
        : tasks.filter(t => t.status !== 'done');
      if (boardMode === 'personal') return base.filter(t => !t.isTeamTask && String(t.assignee?._id || t.assignee) === myId);
      return base.filter(t => t.isTeamTask || (t.team && String(t.assignee?._id || t.assignee) !== myId));
    }
  })();

  const filtered = scopedTasks.filter(t => {
    const s = filter.search.toLowerCase();
    return t.status !== 'backlog'
      && (!s || t.title?.toLowerCase().includes(s) || t.assignee?.name?.toLowerCase().includes(s))
      && (!filter.project  || (t.project?._id || t.project) === filter.project)
      && (!filter.priority || t.priority === filter.priority)
      && (!filter.status   || t.status === filter.status);
  });

  const projectReport = projects.map(p => {
    const pTasks = tasks.filter(t => (t.project?._id || t.project) === p._id);
    const done   = pTasks.filter(t => t.status === 'done').length;
    return { ...p, tasks: pTasks, done, pct: pTasks.length ? Math.round((done / pTasks.length) * 100) : 0 };
  }).filter(p => p.tasks.length > 0);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.title || !form.project) { toast.error('Title and project are required'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (boardScope === 'sprint' && activeSprint && !payload.sprint) payload.sprint = activeSprint._id;
      ['assignee','team','sprint','parent','dueDate'].forEach(k => { if (!payload[k]) delete payload[k]; });

      // If team is selected and assignToTeam is checked → shared team task
      if (payload.team && payload.assignToTeam) {
        payload.assignToTeam = true;
        delete payload.assignee;
      } else if (payload.team && !payload.assignee) {
        // Auto-assign to team lead if no specific assignee chosen
        const selectedTeam = teams.find(t => t._id === payload.team);
        if (selectedTeam?.teamLead) payload.assignee = selectedTeam.teamLead._id || selectedTeam.teamLead;
      }

      const res = await taskAPI.create(payload);
      const newTask  = res.data.data || res.data.task;
      const newTasks = res.data.tasks || [];
      if (newTasks.length) setTasks(prev => [...newTasks, ...prev]);
      else if (newTask) setTasks(prev => [newTask, ...prev]);
      setShowCreate(false);
      setCreateChildParent(null);
      setForm({ title: '', description: '', priority: 'medium', status: 'backlog', type: 'task', project: '', team: '', assignee: '', dueDate: '', assignToAll: false, assignToTeam: false, sprint: '', parent: '' });
      toast.success('Task created!');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to create task'); }
    finally { setSaving(false); }
  };

  const handleRaiseTicket = async () => {
    if (!ticketForm.title || !ticketForm.project) { toast.error('Title and project are required'); return; }
    setSavingTicket(true);
    try {
      const res = await taskAPI.create({ ...ticketForm, status: 'backlog', assignee: myId });
      const newTask = res.data.data || res.data.task;
      if (newTask) setTasks(prev => [newTask, ...prev]);
      setShowTicket(false);
      setTicketForm({ title: '', description: '', priority: 'medium', type: 'bug', project: '' });
      toast.success('Ticket raised! Your team lead has been notified.');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to raise ticket'); }
    finally { setSavingTicket(false); }
  };

  const handleCreateChild = (parentTask) => {
    const childTypeMap = { epic: 'story', story: 'task', task: 'subtask', bug: 'subtask' };
    setCreateChildParent(parentTask);
    setForm(f => ({
      ...f, title: '', description: '',
      type: childTypeMap[parentTask.type] || 'subtask',
      project: parentTask.project?._id || parentTask.project || f.project,
      parent: parentTask._id,
      sprint: parentTask.sprint?._id || parentTask.sprint || f.sprint,
      status: 'backlog', priority: 'medium',
    }));
    setShowCreate(true);
  };

  const handleStatusChange = async (taskId, newStatus) => {
    // Check for team task claim conflict before sending to server
    const task = tasks.find(t => t._id === taskId);
    if (task?.isTeamTask && task.status === 'backlog' && newStatus !== 'backlog') {
      if (task.claimedBy && String(task.claimedBy?._id || task.claimedBy) !== myId && !isManagerOrAdmin) {
        toast.error('This task has already been claimed by a teammate');
        return;
      }
    }
    try {
      await taskAPI.updateStatus(taskId, newStatus);
      setTasks(prev => prev.map(t => t._id === taskId
        ? {
          ...t,
          status: newStatus,
          // If claiming a team task, update claimedBy locally
          ...(t.isTeamTask && t.status === 'backlog' && newStatus !== 'backlog'
            ? { claimedBy: { _id: myId, name: user?.name }, claimedAt: new Date().toISOString() }
            : {}),
        }
        : t
      ));
      if (selected?._id === taskId) setSelected(s => ({ ...s, status: newStatus }));
      toast.success(`Moved to "${newStatus.replace('-', ' ')}"`, { duration: 1800 });
    } catch (e) {
      const msg = e.response?.data?.message || 'Status update failed';
      toast.error(msg);
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
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to delete task'); }
  };

  const handleDrop = (colKey) => {
    if (drag && drag !== colKey) {
      // HR cannot drag
      if (isHR) { toast.error('HR role has read-only access to tasks'); return; }
      handleStatusChange(drag, colKey);
    }
    setDrag(null); setDragOver(null); isDraggingRef.current = false; stopAutoScroll();
  };

  const setF  = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const setTF = k => e => setTicketForm(p => ({ ...p, [k]: e.target.value }));
  const hasFilters = filter.search || filter.project || filter.priority || filter.status;

  // Board columns: manager/admin get full columns; others get board-only (no backlog col)
  const boardColumns = isElevatedView
    ? (boardScope === 'sprint' ? SPRINT_BOARD_COLS : COLUMNS)
    : BOARD_COLUMNS;

  // Counts for toggle badges
  const completedCount  = tasks.filter(t => t.status === 'done').length;
  // Exclude backlog tasks from active count — tasks only count once moved to todo or beyond
  const activeCount     = tasks.filter(t => t.status !== 'done' && t.status !== 'backlog').length;
  const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
  const overdueCount    = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length;
  // Personal / team board counts also exclude backlog
  const personalCount   = !isElevatedView ? tasks.filter(t => !t.isTeamTask && String(t.assignee?._id || t.assignee) === myId && t.status !== 'done' && t.status !== 'backlog').length : 0;
  const teamTaskCount   = !isElevatedView ? tasks.filter(t => t.isTeamTask && (!t.claimedBy || String(t.claimedBy?._id || t.claimedBy) === myId) && t.status !== 'done' && t.status !== 'backlog').length : 0;

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-slate-400">Loading tasks…</p>
    </div>
  );

  return (
    <div className="space-y-6 min-h-full">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '8px 2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#64748B' }}>Workspace</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 30, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
            {isElevatedView ? 'Task' : isHR ? 'Task' : 'My'}{' '}
            <span style={{ color: '#2563EB' }}>{isElevatedView ? 'Overview' : isHR ? 'Overview (Read-only)' : 'Board'}</span>
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: '#64748B' }}>
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}{' '}
            {isElevatedView ? 'across the workspace' : isHR ? '(view only)' : (isTeamLead || isEmployee) ? 'in your team' : 'assigned to you'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => loadData(true)} disabled={refreshing}
            style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', cursor: 'pointer' }}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* View tabs — manager/admin/HR */}
          {isHROrAbove && (
            <div style={{ display: 'flex', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 3, gap: 2 }}>
              {[{ key: 'tasks', label: 'Tasks' }, { key: 'report', label: 'Reports' }].map(({ key, label }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  style={{ padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: activeTab === key ? '#0F172A' : 'transparent', color: activeTab === key ? '#fff' : '#64748B', transition: 'all .15s' }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div style={{ display: 'flex', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 3, gap: 2 }}>
              {[{ key: 'kanban', icon: LayoutGrid, label: 'Board' }, { key: 'list', icon: List, label: 'List' }, { key: 'hierarchy', icon: Layers, label: 'Hierarchy' }].map(({ key, icon: Icon, label }) => (
                <button key={key} onClick={() => setView(key)}
                  style={{ padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, background: view === key ? '#0F172A' : 'transparent', color: view === key ? '#fff' : '#64748B', transition: 'all .15s' }}>
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
          )}

          {/* New Task button — manager, admin, team lead */}
          {canCreateTask && (
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: .97 }} onClick={() => setShowCreate(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, background: '#2563EB', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,.35)' }}>
              <Plus className="w-4 h-4" /> New Task
            </motion.button>
          )}

          {/* Raise Ticket button — employee only (not HR, not team lead) */}
          {!canCreateTask && !isHR && (
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: .97 }} onClick={() => setShowTicket(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, background: '#DC2626', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(220,38,38,.3)' }}>
              <Bug className="w-4 h-4" /> Raise Ticket
            </motion.button>
          )}

          {/* HR read-only badge */}
          {isHR && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#059669', fontSize: 12, fontWeight: 700 }}>
              <Lock size={13} /> View Only
            </span>
          )}
        </div>
      </section>

      {/* ── Active Sprint Banner ────────────────────────────────────────── */}
      {activeTab === 'tasks' && activeSprint && (
        <ActiveSprintBanner sprint={activeSprint} sprintTasks={activeSprintTasks}
          onViewBoard={() => { setBoardScope('sprint'); setView('kanban'); }} />
      )}

      {/* ── Stats (manager/admin/HR) ────────────────────────────────────── */}
      {isHROrAbove && activeTab === 'tasks' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Tasks"  value={tasks.length}      icon={CheckSquare}   color="#3b82f6" bg="#eff6ff" />
          <StatCard label="In Progress"  value={inProgressCount}   icon={Clock}         color="#f59e0b" bg="#fffbeb" />
          <StatCard label="Completed"    value={completedCount}    icon={CheckCircle2}  color="#10b981" bg="#f0fdf4" />
          <StatCard label="Overdue"      value={overdueCount}      icon={AlertTriangle} color="#ef4444" bg="#fef2f2" />
        </motion.div>
      )}

      {/* ── Board scope selector (manager/admin) ───────────────────────── */}
      {isElevatedView && activeTab === 'tasks' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {[
            { key: 'sprint',  label: activeSprint ? 'Sprint Board' : 'Board', icon: Zap,         count: activeSprint ? activeSprintTasks.length : tasks.length },
            { key: 'backlog', label: 'Backlog',                                icon: Archive,     count: backlogOnlyTasks.length },
            { key: 'all',     label: 'All Tasks',                              icon: CheckSquare, count: tasks.length },
          ].map(({ key, label, icon: Icon, count }) => (
            <button key={key} onClick={() => setBoardScope(key)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: boardScope === key ? '#0F172A' : '#F8FAFC', color: boardScope === key ? '#fff' : '#64748B', border: boardScope === key ? '1px solid transparent' : '1px solid #E2E8F0', transition: 'all .15s' }}>
              <Icon size={14} /> {label}
              <span style={{ fontSize: 11, fontWeight: 800, padding: '1px 6px', borderRadius: 6, background: boardScope === key ? 'rgba(255,255,255,.2)' : '#E2E8F0', color: boardScope === key ? '#fff' : '#64748B' }}>{count}</span>
            </button>
          ))}
          {boardScope === 'sprint' && !activeSprint && <span style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>No active sprint — showing all tasks</span>}
          {boardScope === 'sprint' && activeSprint && <span style={{ fontSize: 12, color: '#2563EB', fontWeight: 600 }}>Sprint: <strong>{activeSprint.name}</strong></span>}
        </div>
      )}

      {/* ── Personal / Team board toggle (team lead + employee, not HR) ── */}
      {!isElevatedView && !isHR && (
        <div className="flex items-center gap-3 flex-wrap">
          {/* Active / Completed */}
          {[
            { key: 'active',    label: activeSprint ? 'Current Sprint' : 'Active', count: activeCount,    icon: activeSprint ? Zap : Clock,   cls: 'bg-slate-900 text-white' },
            { key: 'completed', label: 'Completed',                                count: completedCount, icon: CheckCircle2, cls: 'bg-emerald-600 text-white' },
          ].map(({ key, label, count, icon: Icon, cls }) => (
            <button key={key} onClick={() => setTaskView(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${taskView === key ? `${cls} border-transparent shadow-sm` : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              <Icon className="w-4 h-4" /> {label}
              <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${taskView === key ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
            </button>
          ))}

          <div style={{ width: 1, height: 28, background: '#E2E8F0', flexShrink: 0 }} />

          {/* Personal / Team board */}
          {[
            { key: 'personal', label: 'Personal Board', icon: CheckSquare, count: personalCount,  desc: 'Tasks assigned directly to you' },
            { key: 'team',     label: 'Team Board',     icon: Users,       count: teamTaskCount,  desc: 'Shared team tasks — claim to pick up' },
          ].map(({ key, label, icon: Icon, count }) => (
            <button key={key} onClick={() => setBoardMode(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${boardMode === key ? 'bg-blue-600 text-white border-transparent shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              <Icon className="w-4 h-4" /> {label}
              <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${boardMode === key ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
            </button>
          ))}

        </div>
      )}

      {/* ══ REPORTS TAB ═════════════════════════════════════════════════ */}
      {activeTab === 'report' && isHROrAbove && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {projectReport.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center shadow-sm">
              <Layers className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No project tasks yet</p>
            </div>
          ) : projectReport.map((p, idx) => (
            <motion.div key={p._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * .06 }} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${p.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : p.status === 'active' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{p.status?.replace('-',' ')}</span>
                  </div>
                  <p className="text-xs text-slate-400">{p.tasks.length} tasks · {p.done} done</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-3xl font-black ${p.pct === 100 ? 'text-emerald-600' : p.pct >= 50 ? 'text-blue-600' : 'text-slate-700'}`}>{p.pct}%</p>
                  <p className="text-xs text-slate-400">complete</p>
                </div>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-5">
                <motion.div initial={{ width: 0 }} animate={{ width: `${p.pct}%` }} transition={{ duration: .8, delay: idx * .06 + .2 }}
                  className="h-full rounded-full" style={{ background: p.pct === 100 ? '#10b981' : 'linear-gradient(90deg,#3b82f6,#6366f1)' }} />
              </div>
              <div className="rounded-xl overflow-hidden border border-slate-100">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {['Task','Assignee','Priority','Status','Update'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {p.tasks.map(task => (
                      <tr key={task._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5"><p className="font-semibold text-slate-800">{task.title}</p><DueLabel dueDate={task.dueDate} /></td>
                        <td className="px-4 py-3.5">{task.assignee ? <div className="flex items-center gap-2"><Avatar name={task.assignee?.name} size="xs" /><span className="text-xs text-slate-600">{task.assignee.name}</span></div> : <span className="text-xs italic text-slate-300">Unassigned</span>}</td>
                        <td className="px-4 py-3.5"><PriorityBadge priority={task.priority} /></td>
                        <td className="px-4 py-3.5"><StatusPill status={task.status} /></td>
                        <td className="px-4 py-3.5">
                          {isHR ? <StatusPill status={task.status} /> : (
                            <select value={task.status} onChange={e => handleStatusChange(task._id, e.target.value)} onClick={e => e.stopPropagation()}
                              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer">
                              {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                            </select>
                          )}
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
          {/* Status filter chips */}
          <div className="flex flex-wrap gap-2">
            {BOARD_COLUMNS.map(col => {
              const count  = scopedTasks.filter(t => t.status === col.key).length;
              const active = filter.status === col.key;
              return (
                <motion.button key={col.key} whileHover={{ scale: 1.04 }} whileTap={{ scale: .97 }}
                  onClick={() => setFilter(f => ({ ...f, status: active ? '' : col.key }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${active ? `${col.color} ${col.border} shadow-sm` : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                  {col.label}
                  <span className={`ml-0.5 px-1.5 py-px rounded-md font-bold text-[10px] ${active ? 'bg-white/30' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                </motion.button>
              );
            })}
            <motion.button whileHover={{ scale: 1.04 }} onClick={() => setFilter(f => ({ ...f, _open: !f._open }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ml-auto ${hasFilters ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              <Filter className="w-3.5 h-3.5" /> Filters {hasFilters && <span className="ml-1 text-[10px] font-bold">On</span>}
            </motion.button>
          </div>

          {/* Filter panel */}
          <AnimatePresence>
            {filter._open && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end shadow-sm">
                  <div className="flex-1 min-w-48">
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">Search</label>
                    <input placeholder="Task or assignee…" value={filter.search} onChange={e => setFilter(p => ({ ...p, search: e.target.value }))} className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div className="min-w-40">
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">Project</label>
                    <select value={filter.project} onChange={e => setFilter(p => ({ ...p, project: e.target.value }))} className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="">All Projects</option>
                      {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="min-w-36">
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">Priority</label>
                    <select value={filter.priority} onChange={e => setFilter(p => ({ ...p, priority: e.target.value }))} className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="">All</option>
                      {['low','medium','high','critical'].map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>)}
                    </select>
                  </div>
                  {hasFilters && (
                    <button onClick={() => setFilter({ project: '', priority: '', status: '', search: '' })} className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl border border-red-100 transition-colors">
                      <X className="w-3.5 h-3.5" /> Clear all
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── KANBAN ──────────────────────────────────────────────────── */}
          {view === 'kanban' && (
            <motion.div ref={kanbanRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onDragOver={handleKanbanDragOver}
              onDragLeave={e => { if (!kanbanRef.current?.contains(e.relatedTarget)) stopAutoScroll(); }}
              style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16, scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent' }}>
              {boardColumns.map(col => {
                if (!isElevatedView && !isHR && taskView === 'completed' && col.key !== 'done') return null;
                const colTasks = filtered.filter(t => t.status === col.key);
                const Icon     = col.icon;
                const isOver   = dragOver === col.key;
                const canDrag  = !isHR; // HR cannot drag
                return (
                  <div key={col.key} style={{ flexShrink: 0, width: 280 }}
                    onDragOver={e => { if (canDrag) { e.preventDefault(); setDragOver(col.key); } }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={() => { if (canDrag) handleDrop(col.key); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '10px 12px', borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0', borderLeft: `3px solid ${col.fill}`, boxShadow: '0 1px 4px rgba(15,23,42,.04)' }}>
                      <Icon size={13} style={{ color: col.fill, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '.07em', flex: 1 }}>{col.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: col.fill, padding: '1px 7px', borderRadius: 999, minWidth: 20, textAlign: 'center' }}>{colTasks.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80, borderRadius: 14, padding: 4, border: isOver ? `2px dashed ${col.fill}` : '2px solid transparent', background: isOver ? col.fill + '08' : 'transparent', transition: 'all .15s' }}>
                      {colTasks.length === 0 && (
                        <div style={{ border: '1px dashed #CBD5E1', borderRadius: 12, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <p style={{ fontSize: 11, color: '#94A3B8' }}>{canDrag ? 'Drag tasks here' : 'No tasks'}</p>
                        </div>
                      )}
                      {colTasks.map((task, taskIdx) => {
                        const isClaimed   = task.isTeamTask && task.claimedBy;
                        const claimedByMe = isClaimed && String(task.claimedBy?._id || task.claimedBy) === myId;
                        const lockedByOther = isClaimed && !claimedByMe && !isManagerOrAdmin;
                        return (
                          <motion.div key={task._id}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: taskIdx * .04 }}
                            whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(15,23,42,.10)' }}
                            draggable={canDrag && !lockedByOther}
                            onDragStart={() => { if (!canDrag || lockedByOther) return; isDraggingRef.current = true; setDrag(task._id); }}
                            onDragEnd={() => { isDraggingRef.current = false; setDrag(null); setDragOver(null); stopAutoScroll(); }}
                            onClick={() => setSelected(task)}
                            style={{ background: '#fff', borderRadius: 12, border: `1px solid ${task.isTeamTask ? '#BFDBFE' : '#E2E8F0'}`, padding: '12px 14px', cursor: canDrag && !lockedByOther ? 'grab' : 'pointer', boxShadow: '0 1px 4px rgba(15,23,42,.05)', opacity: lockedByOther ? 0.6 : 1 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4, marginBottom: 4 }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0F172A', lineHeight: 1.4 }}>{task.title}</p>
                              <TypeChip type={task.type} />
                            </div>
                            {task.project?.name && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                                <Tag size={10} style={{ color: '#94A3B8' }} />
                                <p style={{ margin: 0, fontSize: 10, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.project.name}</p>
                              </div>
                            )}
                            {task.team?.name && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                                <Users size={10} style={{ color: task.team.color || '#3b82f6' }} />
                                <p style={{ margin: 0, fontSize: 10, color: task.team.color || '#3b82f6', fontWeight: 600 }}>{task.team.name}</p>
                              </div>
                            )}
                            <ClaimBadge task={task} myId={myId} />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #F1F5F9' }}>
                              <PriorityBadge priority={task.priority} />
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {task.dueDate && <DueLabel dueDate={task.dueDate} />}
                                {(task.claimedBy || task.assignee) && <Avatar name={(task.claimedBy || task.assignee)?.name} size="xs" />}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* ── HIERARCHY ────────────────────────────────────────────────── */}
          {view === 'hierarchy' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <HierarchyView tasks={filtered} onSelect={setSelected} onCreateChild={handleCreateChild} canCreate={canCreateTask} handleStatusChange={handleStatusChange} />
            </motion.div>
          )}

          {/* ── LIST ────────────────────────────────────────────────────── */}
          {view === 'list' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
              {filtered.length === 0 ? (
                <div className="p-16 text-center"><CheckSquare className="w-10 h-10 text-slate-200 mx-auto mb-3" /><p className="text-slate-500 font-medium">No tasks found</p></div>
              ) : (
                <>
                  <div className="grid grid-cols-[1fr_130px_100px_160px_100px] gap-4 px-5 py-3.5 bg-slate-50 border-b border-slate-100">
                    {['Task','Project','Priority','Status','Due'].map(h => <span key={h} className="text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</span>)}
                  </div>
                  <div className="divide-y divide-slate-50">
                    {filtered.map((task, idx) => (
                      <motion.div key={task._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * .02 }}
                        onClick={() => setSelected(task)}
                        className="grid grid-cols-[1fr_130px_100px_160px_100px] gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/70 transition-all items-center group">
                        <div className="flex items-center gap-3 min-w-0">
                          {(task.claimedBy || task.assignee) && <Avatar name={(task.claimedBy || task.assignee)?.name} size="xs" />}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700">{task.title}</p>
                            {task.isTeamTask && <ClaimBadge task={task} myId={myId} />}
                            {!task.isTeamTask && task.assignee && isHROrAbove && <p className="text-xs text-slate-400 truncate">{task.assignee.name}</p>}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{task.project?.name || '—'}</p>
                        <PriorityBadge priority={task.priority} />
                        <span onClick={e => e.stopPropagation()}>
                          {isHR ? <StatusPill status={task.status} /> : (
                            <select value={task.status} onChange={e => handleStatusChange(task._id, e.target.value)}
                              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 w-full cursor-pointer">
                              {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                            </select>
                          )}
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

      {/* ── Task detail modal ─────────────────────────────────────────── */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Task Details" size="lg">
        {selected && (
          <div className="space-y-5">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <TypeChip type={selected.type} />
                {selected.taskKey && <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', fontFamily: 'monospace' }}>{selected.taskKey}</span>}
              </div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">{selected.title}</h3>
              {selected.description && <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{selected.description}</p>}
            </div>
            {selected.sprint?.name && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: 12, fontWeight: 600, color: '#1D4ED8' }}>
                <Zap size={12} /> {selected.sprint.name}
              </div>
            )}
            {selected.isTeamTask && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={14} style={{ color: '#2563EB' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8' }}>Shared Team Task</span>
                  {selected.team?.name && <span style={{ fontSize: 11, color: '#2563EB' }}>· {selected.team.name}</span>}
                </div>
                <div style={{ marginTop: 6 }}>
                  <ClaimBadge task={selected} myId={myId} />
                </div>
                {!selected.claimedBy && !isHR && (
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: '#2563EB' }}>Move to "To Do" to claim this task</p>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Project',  selected.project?.name || '—'],
                ['Assignee', selected.isTeamTask ? (selected.claimedBy?.name || 'Unclaimed') : (selected.assignee?.name || 'Unassigned')],
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
            {/* Status update buttons — not for HR */}
            {!isHR && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-3">
                  {selected.isTeamTask && !selected.claimedBy ? 'Move from Backlog to claim this task' : 'Update Status'}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {COLUMNS.map(col => {
                    const Icon   = col.icon;
                    const active = selected.status === col.key;
                    const lockedByOther = selected.isTeamTask && selected.claimedBy
                      && String(selected.claimedBy?._id || selected.claimedBy) !== myId
                      && !isManagerOrAdmin;
                    return (
                      <button key={col.key} onClick={() => !lockedByOther && handleStatusChange(selected._id, col.key)}
                        disabled={lockedByOther}
                        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${active ? `${col.color} ${col.border} shadow-sm` : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'} ${lockedByOther ? 'opacity-40 cursor-not-allowed' : ''}`}>
                        <Icon className="w-3.5 h-3.5 shrink-0" />{col.label}
                      </button>
                    );
                  })}
                </div>
                {selected.isTeamTask && selected.claimedBy && String(selected.claimedBy?._id || selected.claimedBy) !== myId && !isManagerOrAdmin && (
                  <p style={{ marginTop: 8, fontSize: 12, color: '#DC2626' }}>
                    Only {selected.claimedBy?.name || 'the claimer'} or a manager can update this task's status.
                  </p>
                )}
              </div>
            )}
            <TaskNotesPanel task={selected} currentUser={user} />
            <div className="flex justify-end gap-2 pt-1">
              {isAdmin && <Button variant="danger" onClick={() => handleDeleteTask(selected._id)}>Delete Task</Button>}
              <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Raise Ticket Modal (employees) ───────────────────────────── */}
      <Modal open={showTicket} onClose={() => setShowTicket(false)} title="Raise a Ticket">
        <div className="space-y-4">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <Bug size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 12, color: '#991B1B' }}>Your ticket will be visible to your team lead, HR, and managers. You'll be notified when it's reviewed.</p>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Type</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['bug','task','improvement'].map(key => {
                const meta = TYPE_META[key];
                const Icon = meta.icon;
                const active = ticketForm.type === key;
                return (
                  <button key={key} type="button" onClick={() => setTicketForm(f => ({ ...f, type: key }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: `1px solid ${active ? meta.color : '#E2E8F0'}`, background: active ? meta.bg : '#fff', color: active ? meta.color : '#64748B', fontSize: 12, fontWeight: active ? 800 : 600, cursor: 'pointer' }}>
                    <Icon size={12} /> {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
          <Input label="Title" value={ticketForm.title} onChange={setTF('title')} placeholder="Briefly describe the issue…" required />
          <Textarea label="Description" value={ticketForm.description} onChange={setTF('description')} placeholder="Details, steps to reproduce, expected vs actual…" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Project" value={ticketForm.project} onChange={setTF('project')} required>
              <option value="">Select project…</option>
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
            <Select label="Priority" value={ticketForm.priority} onChange={setTF('priority')}>
              {['low','medium','high','critical'].map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowTicket(false)}>Cancel</Button>
            <Button onClick={handleRaiseTicket} loading={savingTicket} disabled={!ticketForm.title || !ticketForm.project} style={{ background: '#DC2626' }}>
              <Bug size={14} /> Raise Ticket
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Create Task Modal (manager / admin / team lead) ──────────── */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setCreateChildParent(null); }} title={createChildParent ? `Add Child to: ${createChildParent.title}` : 'Create New Task'}>
        <div className="space-y-4">
          {!createChildParent && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <Archive size={14} style={{ color: '#D97706', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 12, color: '#92400E' }}>Check your <strong>Backlog</strong> first — you may have tasks waiting to be moved to To Do.</p>
            </div>
          )}
          {createChildParent && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <Layers size={13} style={{ color: '#2563EB', flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: '#1D4ED8' }}>
                <span style={{ fontWeight: 700 }}>Parent:</span> {createChildParent.title}
                <span style={{ marginLeft: 8, background: '#BFDBFE', padding: '1px 7px', borderRadius: 4, fontSize: 10, fontWeight: 800 }}>{createChildParent.type?.toUpperCase()}</span>
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Issue Type</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(TYPE_META).map(([key, meta]) => {
                const Icon = meta.icon;
                const active = form.type === key;
                return (
                  <button key={key} type="button" onClick={() => setForm(f => ({ ...f, type: key }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 7, border: `1px solid ${active ? meta.color : '#E2E8F0'}`, background: active ? meta.bg : '#fff', color: active ? meta.color : '#64748B', fontSize: 11, fontWeight: active ? 800 : 600, cursor: 'pointer' }}>
                    <Icon size={11} /> {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Input label="Title *" value={form.title} onChange={setF('title')} placeholder="e.g. Design login screen" required />
          <Textarea label="Description" value={form.description} onChange={setF('description')} placeholder="Optional details…" />

          <div className="grid grid-cols-2 gap-3">
            <Select label="Project *" value={form.project} onChange={setF('project')}>
              <option value="">Select project…</option>
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>

            {/* Team selector — manager/admin only */}
            {isManagerOrAdmin && (
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Assign to Team</label>
                <select value={form.team} onChange={e => {
                  const teamId = e.target.value;
                  const st = teams.find(t => t._id === teamId);
                  setForm(f => ({ ...f, team: teamId, assignee: '', assignToTeam: !!teamId }));
                }}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="">No team (personal task)</option>
                  {teams.map(t => <option key={t._id} value={t._id}>{t.name}{t.teamLead?.name ? ` · Lead: ${t.teamLead.name}` : ''}</option>)}
                </select>
                {form.team && (
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#2563EB', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!form.assignToTeam} onChange={e => setForm(f => ({ ...f, assignToTeam: e.target.checked }))} />
                      Assign as shared team task (one task, any member can claim)
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Individual assignee — shown when not assigning as shared team task */}
          {!form.assignToTeam && (() => {
            // For manager/admin: show all users
            // For team lead/employee: show self + teammates
            const selfOption = { _id: myId, name: `${user?.name} (me)`, role: user?.role };
            const assigneeOptions = isManagerOrAdmin
              ? users
              : [selfOption, ...users.filter(u => String(u._id) !== myId)];
            return (
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
                  {isManagerOrAdmin ? 'Assignee' : 'Assign to'}
                </label>
                <select value={form.assignee} onChange={setF('assignee')}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="">Unassigned</option>
                  {isManagerOrAdmin && <option value="__all__">Assign to all employees</option>}
                  {assigneeOptions.map(u => (
                    <option key={u._id} value={u._id}>
                      {u.name}{u._id === myId ? '' : ` — ${u.role === 'team_lead' ? 'Team Lead' : 'Employee'}`}
                    </option>
                  ))}
                </select>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 gap-3">
            <Select label="Priority" value={form.priority} onChange={setF('priority')}>
              {['low','medium','high','critical'].map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>)}
            </Select>
            <Input label="Due Date" type="date" value={form.dueDate} onChange={setF('dueDate')} />
          </div>

          {!createChildParent && form.type !== 'epic' && (
            <Select label="Parent Issue (optional)" value={form.parent} onChange={setF('parent')}>
              <option value="">No parent (top-level)</option>
              {tasks.filter(t => {
                if (form.type === 'story')                           return t.type === 'epic';
                if (['task','bug','improvement'].includes(form.type)) return t.type === 'story' || t.type === 'epic';
                if (form.type === 'subtask')                         return t.type === 'task' || t.type === 'bug';
                return false;
              }).map(t => <option key={t._id} value={t._id}>[{TYPE_META[t.type]?.label || t.type}] {t.title}</option>)}
            </Select>
          )}

          {sprints.filter(s => s.status !== 'completed').length > 0 && (
            <Select label="Sprint" value={form.sprint} onChange={setF('sprint')}>
              <option value="">No sprint (starts in Backlog)</option>
              {sprints.filter(s => s.status !== 'completed').map(s => <option key={s._id} value={s._id}>{s.status === 'active' ? '⚡ ' : ''}{s.name} ({s.status})</option>)}
            </Select>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setCreateChildParent(null); }}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving} disabled={!form.title || !form.project}>
              Create {form.assignToTeam ? 'Shared Team Task' : (TYPE_META[form.type]?.label || 'Task')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

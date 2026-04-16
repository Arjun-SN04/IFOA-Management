import { useState, useEffect, useRef } from 'react';
import { sprintAPI, projectAPI, taskAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Textarea, Select, Empty, Spinner, PageHeader } from '../../components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Zap, Trash2, AlertTriangle, ListTodo, CheckCircle2,
  Clock, Circle, XCircle, Eye, ArrowRight, X, Tag, User,
  ChevronDown, ChevronRight, LayoutGrid, List,
  TrendingUp, Archive, Calendar, Flag, Play,
  CheckSquare, ArrowDown, ArrowUp, Minus
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Config ────────────────────────────────────────────────────────────────────
const STATUS_V = {
  planned:   { label: 'Planned',   color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
  active:    { label: 'Active',    color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  completed: { label: 'Completed', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
};

const BOARD_COLS = [
  { key: 'todo',        label: 'To Do',       fill: '#7c3aed', icon: Circle,        border: '#c4b5fd' },
  { key: 'in-progress', label: 'In Progress', fill: '#3b82f6', icon: Clock,         border: '#93c5fd' },
  { key: 'in-review',   label: 'In Review',   fill: '#f59e0b', icon: Eye,           border: '#fcd34d' },
  { key: 'done',        label: 'Done',        fill: '#10b981', icon: CheckCircle2,  border: '#6ee7b7' },
  { key: 'blocked',     label: 'Blocked',     fill: '#ef4444', icon: XCircle,       border: '#fca5a5' },
];

const TASK_STATUS_META = {
  backlog:      { label: 'Backlog',     icon: AlertTriangle, color: '#64748B' },
  todo:         { label: 'To Do',       icon: Circle,        color: '#7c3aed' },
  'in-progress':{ label: 'In Progress', icon: Clock,         color: '#3b82f6' },
  'in-review':  { label: 'In Review',   icon: Eye,           color: '#f59e0b' },
  done:         { label: 'Done',        icon: CheckCircle2,  color: '#10b981' },
  blocked:      { label: 'Blocked',     icon: XCircle,       color: '#ef4444' },
  cancelled:    { label: 'Cancelled',   icon: X,             color: '#94a3b8' },
};

const PRIORITY_COLOR = { critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#16a34a', lowest: '#64748b' };
const PRIORITY_ICON  = { critical: AlertTriangle, high: ArrowUp, medium: Minus, low: ArrowDown, lowest: ArrowDown };

// ── Helpers ───────────────────────────────────────────────────────────────────
function resolveSprints(res) { const d = res?.data; return d?.sprints || d?.data || (Array.isArray(d) ? d : []); }
function resolveProjects(res) { const d = res?.data; return d?.data || d?.projects || (Array.isArray(d) ? d : []); }
function resolveTasks(res) { const d = res?.data; return d?.tasks || d?.data || (Array.isArray(d) ? d : []); }

function daysLeft(endDate) {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate) - new Date()) / 86400000);
}

function SprintStatusBadge({ status }) {
  const sv = STATUS_V[status] || STATUS_V.planned;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: sv.bg, color: sv.color, border: `1px solid ${sv.border}` }}>
      {sv.label}
    </span>
  );
}

function PriorityChip({ priority }) {
  const color = PRIORITY_COLOR[priority] || '#64748B';
  const Icon = PRIORITY_ICON[priority] || Minus;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: color + '15', color, textTransform: 'capitalize' }}>
      <Icon size={9} /> {priority}
    </span>
  );
}

function TaskStatusIcon({ status }) {
  const m = TASK_STATUS_META[status] || TASK_STATUS_META.backlog;
  const Icon = m.icon;
  return <Icon size={13} style={{ color: m.color, flexShrink: 0 }} />;
}

// ── Sprint Kanban Board (shown inside the active sprint panel) ─────────────────
function SprintKanbanBoard({ tasks, onStatusChange, isManagerOrAdmin }) {
  const [dragTask, setDragTask] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const handleDrop = (colKey) => {
    if (dragTask && dragTask !== colKey) onStatusChange(dragTask, colKey);
    setDragTask(null); setDragOver(null);
  };

  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent' }}>
      {BOARD_COLS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.key);
        const Icon = col.icon;
        const isOver = dragOver === col.key;
        return (
          <div key={col.key} style={{ flexShrink: 0, width: 240 }}
            onDragOver={e => { e.preventDefault(); setDragOver(col.key); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop(col.key)}>
            {/* Column header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '8px 10px', borderRadius: 10, background: '#fff', border: '1px solid #E2E8F0', borderLeft: `3px solid ${col.fill}` }}>
              <Icon size={12} style={{ color: col.fill }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1 }}>{col.label}</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: col.fill, padding: '1px 6px', borderRadius: 999 }}>{colTasks.length}</span>
            </div>
            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 60, borderRadius: 10, padding: 3, border: isOver ? `2px dashed ${col.fill}` : '2px solid transparent', background: isOver ? col.fill + '08' : 'transparent', transition: 'all 0.15s' }}>
              {colTasks.length === 0 && (
                <div style={{ border: '1px dashed #CBD5E1', borderRadius: 8, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontSize: 10, color: '#CBD5E1' }}>Drop here</p>
                </div>
              )}
              {colTasks.map((task, i) => (
                <motion.div key={task._id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  whileHover={{ y: -1, boxShadow: '0 4px 14px rgba(15,23,42,0.10)' }}
                  draggable={isManagerOrAdmin}
                  onDragStart={() => { if (isManagerOrAdmin) setDragTask(task._id); }}
                  onDragEnd={() => { setDragTask(null); setDragOver(null); }}
                  style={{ background: '#fff', borderRadius: 9, border: '1px solid #E2E8F0', padding: '10px 11px', cursor: isManagerOrAdmin ? 'grab' : 'default', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
                  <p style={{ margin: '0 0 7px', fontSize: 12, fontWeight: 600, color: '#0F172A', lineHeight: 1.4 }}>{task.title}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <PriorityChip priority={task.priority} />
                    {task.assignee && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 999, background: '#3b82f6', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {(task.assignee.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 10, color: '#64748B' }}>{task.assignee.name.split(' ')[0]}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Complete Sprint Modal ──────────────────────────────────────────────────────
function CompleteSprintModal({ sprint, sprintTasks, plannedSprints, onClose, onComplete }) {
  const [nextSprintId, setNextSprintId] = useState('');
  const [completing, setCompleting] = useState(false);

  const done = sprintTasks.filter(t => t.status === 'done');
  const incomplete = sprintTasks.filter(t => !['done', 'cancelled'].includes(t.status));

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await onComplete(sprint._id, nextSprintId || null);
      onClose();
    } finally { setCompleting(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'Completed', value: done.length, color: '#10b981', bg: '#ECFDF5', icon: CheckCircle2 },
          { label: 'Incomplete', value: incomplete.length, color: '#f59e0b', bg: '#FFFBEB', icon: Clock },
          { label: 'Total', value: sprintTasks.length, color: '#3b82f6', bg: '#EFF6FF', icon: CheckSquare },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} style={{ background: bg, borderRadius: 12, padding: '14px', textAlign: 'center' }}>
            <Icon size={18} style={{ color, margin: '0 auto 6px' }} />
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color }}>{value}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#64748B', fontWeight: 600 }}>{label}</p>
          </div>
        ))}
      </div>

      {incomplete.length > 0 && (
        <div>
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <AlertTriangle size={14} style={{ color: '#D97706' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>
                {incomplete.length} incomplete task{incomplete.length !== 1 ? 's' : ''} will be moved
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#92400E' }}>
              Choose where to send them — move to a next sprint (like Jira) or back to the backlog.
            </p>
          </div>

          {/* Incomplete task list */}
          <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
            {incomplete.map(task => {
              const m = TASK_STATUS_META[task.status] || TASK_STATUS_META.backlog;
              const Icon = m.icon;
              return (
                <div key={task._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <Icon size={12} style={{ color: m.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#0F172A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                  <PriorityChip priority={task.priority} />
                </div>
              );
            })}
          </div>

          {/* Next sprint selector */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
              Move incomplete tasks to
            </label>
            <select
              value={nextSprintId}
              onChange={e => setNextSprintId(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, background: '#fff', outline: 'none', cursor: 'pointer' }}>
              <option value="">📥 Backlog (no sprint)</option>
              {plannedSprints.map(s => (
                <option key={s._id} value={s._id}>
                  ⚡ {s.name} ({s.project?.name || 'Same project'})
                </option>
              ))}
            </select>
            {nextSprintId && (
              <p style={{ margin: '6px 0 0', fontSize: 11, color: '#2563EB', fontWeight: 600 }}>
                ✓ {incomplete.length} task{incomplete.length !== 1 ? 's' : ''} will roll over to the selected sprint
              </p>
            )}
            {!nextSprintId && (
              <p style={{ margin: '6px 0 0', fontSize: 11, color: '#64748B' }}>
                Tasks will return to backlog with no sprint assigned
              </p>
            )}
          </div>
        </div>
      )}

      {incomplete.length === 0 && (
        <div style={{ textAlign: 'center', padding: '12px', background: '#ECFDF5', borderRadius: 12 }}>
          <CheckCircle2 size={24} style={{ color: '#059669', margin: '0 auto 6px' }} />
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#065F46' }}>All tasks completed!</p>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#059669' }}>The sprint can be closed cleanly.</p>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4, borderTop: '1px solid #F1F5F9' }}>
        <button onClick={onClose} disabled={completing}
          style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={handleComplete} disabled={completing}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 10, border: 'none', background: '#059669', color: '#fff', fontSize: 13, fontWeight: 700, cursor: completing ? 'not-allowed' : 'pointer', opacity: completing ? 0.7 : 1 }}>
          {completing ? <Spinner size="xs" /> : <CheckCircle2 size={14} />}
          {completing ? 'Completing…' : 'Complete Sprint'}
        </button>
      </div>
    </div>
  );
}

// ── Active Sprint Panel ────────────────────────────────────────────────────────
function ActiveSprintPanel({ sprint, tasks, allTasks, isManagerOrAdmin, isAdmin, onComplete, onDelete, onAssignTask, onStatusChange, assigning }) {
  const [boardView, setBoardView] = useState('board'); // 'board' | 'list'
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const sprintTasks = tasks.filter(t => (t.sprint?._id || t.sprint) === sprint._id);
  const done = sprintTasks.filter(t => t.status === 'done').length;
  const total = sprintTasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const dl = daysLeft(sprint.endDate);
  const isOverdue = dl !== null && dl < 0;

  // Backlog tasks for the same project
  const backlogTasks = allTasks.filter(t => {
    const tProject = t.project?._id || t.project;
    const sProject = sprint.project?._id || sprint.project;
    return !t.sprint && tProject === sProject;
  });

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 16px rgba(15,23,42,0.06)' }}>
        {/* Header bar */}
        <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', padding: '18px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={14} color="#fff" />
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Active Sprint</span>
                {dl !== null && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: isOverdue ? '#ef4444' : 'rgba(255,255,255,0.25)', color: '#fff' }}>
                    {isOverdue ? `${Math.abs(dl)}d overdue` : dl === 0 ? 'Ends today' : `${dl}d left`}
                  </span>
                )}
              </div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>{sprint.name}</h2>
              {sprint.goal && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Goal: {sprint.goal}</p>}
              {sprint.project?.name && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                  <Tag size={10} /> {sprint.project.name}
                </span>
              )}
            </div>
            {/* Progress + actions */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {/* Board/list toggle */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 2, gap: 1 }}>
                  {[{ key: 'board', icon: LayoutGrid }, { key: 'list', icon: List }].map(({ key, icon: Icon }) => (
                    <button key={key} onClick={() => setBoardView(key)}
                      style={{ padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: boardView === key ? 'rgba(255,255,255,0.35)' : 'transparent', color: '#fff', display: 'flex', alignItems: 'center' }}>
                      <Icon size={13} />
                    </button>
                  ))}
                </div>
                {isManagerOrAdmin && (
                  <button onClick={() => setShowCompleteModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    <CheckCircle2 size={13} /> Complete Sprint
                  </button>
                )}
                {isAdmin && (
                  <button onClick={() => onDelete(sprint)} title="Delete sprint"
                    style={{ padding: '7px 9px', borderRadius: 9, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              {/* Progress bar */}
              <div style={{ minWidth: 180 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>
                  <span>{done}/{total} done</span>
                  <span style={{ fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 999, overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
                    style={{ height: '100%', background: '#fff', borderRadius: 999 }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Board content */}
        <div style={{ padding: '20px 24px' }}>
          {/* Date range */}
          {sprint.startDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: 12, color: '#64748B' }}>
              <Calendar size={13} />
              {new Date(sprint.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              <span>→</span>
              {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            </div>
          )}

          {/* Status summary pills */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {Object.entries(TASK_STATUS_META).filter(([k]) => k !== 'cancelled').map(([key, meta]) => {
              const count = sprintTasks.filter(t => t.status === key).length;
              if (!count) return null;
              const Icon = meta.icon;
              return (
                <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: meta.color + '12', color: meta.color, border: `1px solid ${meta.color}30` }}>
                  <Icon size={10} /> {meta.label}: {count}
                </span>
              );
            })}
          </div>

          {sprintTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed #E2E8F0', borderRadius: 14 }}>
              <ListTodo size={28} style={{ color: '#CBD5E1', margin: '0 auto 10px' }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#94A3B8' }}>No tasks in this sprint yet</p>
              {isManagerOrAdmin && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#CBD5E1' }}>Add tasks from the backlog section below</p>}
            </div>
          ) : boardView === 'board' ? (
            <SprintKanbanBoard tasks={sprintTasks} onStatusChange={onStatusChange} isManagerOrAdmin={isManagerOrAdmin} />
          ) : (
            /* LIST VIEW */
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 110px', gap: 12, padding: '10px 14px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Task', 'Assignee', 'Priority', 'Status'].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</span>
                ))}
              </div>
              {sprintTasks.map((task, i) => {
                const meta = TASK_STATUS_META[task.status] || TASK_STATUS_META.backlog;
                const Icon = meta.icon;
                return (
                  <div key={task._id} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 110px', gap: 12, padding: '11px 14px', borderBottom: i < sprintTasks.length - 1 ? '1px solid #F1F5F9' : 'none', alignItems: 'center', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                      <TaskStatusIcon status={task.status} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.assignee?.name || <span style={{ color: '#CBD5E1', fontStyle: 'italic' }}>Unassigned</span>}</span>
                    <PriorityChip priority={task.priority} />
                    {isManagerOrAdmin ? (
                      <select value={task.status} onChange={e => onStatusChange(task._id, e.target.value)}
                        style={{ fontSize: 11, border: '1px solid #E2E8F0', borderRadius: 7, padding: '3px 6px', background: '#fff', outline: 'none', cursor: 'pointer' }}>
                        {Object.entries(TASK_STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                      </select>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: meta.color }}><Icon size={10} />{meta.label}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Backlog for this project (admin can add tasks to sprint) */}
          {isManagerOrAdmin && backlogTasks.length > 0 && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #F1F5F9' }}>
              <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Backlog — {backlogTasks.length} task{backlogTasks.length !== 1 ? 's' : ''} not in any sprint
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {backlogTasks.map(task => (
                  <div key={task._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                    <TaskStatusIcon status={task.status} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                    <PriorityChip priority={task.priority} />
                    <button
                      onClick={() => onAssignTask(task._id, sprint._id)}
                      disabled={assigning === task._id}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      {assigning === task._id ? <Spinner size="xs" /> : <ArrowRight size={11} />} Add to Sprint
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Complete Sprint Modal */}
      <Modal open={showCompleteModal} onClose={() => setShowCompleteModal(false)} title={`Complete "${sprint.name}"`} size="md">
        <CompleteSprintModal
          sprint={sprint}
          sprintTasks={sprintTasks}
          plannedSprints={[]} // Passed from parent via onComplete — we'll handle this below
          onClose={() => setShowCompleteModal(false)}
          onComplete={onComplete}
        />
      </Modal>
    </>
  );
}

// ── Active Sprint Panel with planned sprints passed correctly ─────────────────
function ActiveSprintPanelWrapper({ sprint, tasks, allTasks, plannedSprints, isManagerOrAdmin, isAdmin, onComplete, onDelete, onAssignTask, onStatusChange, assigning }) {
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [boardView, setBoardView] = useState('board');

  const sprintTasks = tasks.filter(t => (t.sprint?._id || t.sprint) === sprint._id);
  const done = sprintTasks.filter(t => t.status === 'done').length;
  const total = sprintTasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const dl = daysLeft(sprint.endDate);
  const isOverdue = dl !== null && dl < 0;

  const backlogTasks = allTasks.filter(t => {
    const tProject = t.project?._id || t.project;
    const sProject = sprint.project?._id || sprint.project;
    return !t.sprint && tProject === sProject;
  });

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 16px rgba(15,23,42,0.06)' }}>
        {/* Blue header */}
        <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', padding: '18px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={14} color="#fff" />
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Active Sprint</span>
                {dl !== null && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: isOverdue ? '#ef4444' : 'rgba(255,255,255,0.25)', color: '#fff' }}>
                    {isOverdue ? `${Math.abs(dl)}d overdue` : dl === 0 ? 'Ends today' : `${dl}d left`}
                  </span>
                )}
              </div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>{sprint.name}</h2>
              {sprint.goal && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Goal: {sprint.goal}</p>}
              {sprint.project?.name && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                  <Tag size={10} /> {sprint.project.name}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 2, gap: 1 }}>
                  {[{ key: 'board', icon: LayoutGrid }, { key: 'list', icon: List }].map(({ key, icon: Icon }) => (
                    <button key={key} onClick={() => setBoardView(key)}
                      style={{ padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: boardView === key ? 'rgba(255,255,255,0.35)' : 'transparent', color: '#fff', display: 'flex', alignItems: 'center' }}>
                      <Icon size={13} />
                    </button>
                  ))}
                </div>
                {isManagerOrAdmin && (
                  <button onClick={() => setShowCompleteModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <CheckCircle2 size={13} /> Complete Sprint
                  </button>
                )}
                {isAdmin && (
                  <button onClick={() => onDelete(sprint)} title="Delete"
                    style={{ padding: '7px 9px', borderRadius: 9, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <div style={{ minWidth: 180 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>
                  <span>{done}/{total} done</span>
                  <span style={{ fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 999, overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
                    style={{ height: '100%', background: '#fff', borderRadius: 999 }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {sprint.startDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, fontSize: 12, color: '#64748B' }}>
              <Calendar size={13} />
              {new Date(sprint.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {' → '}
              {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            </div>
          )}
          {/* Status pills */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {Object.entries(TASK_STATUS_META).filter(([k]) => k !== 'cancelled').map(([key, meta]) => {
              const count = sprintTasks.filter(t => t.status === key).length;
              if (!count) return null;
              const Icon = meta.icon;
              return (
                <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: meta.color + '12', color: meta.color, border: `1px solid ${meta.color}30` }}>
                  <Icon size={10} /> {meta.label}: {count}
                </span>
              );
            })}
          </div>

          {sprintTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', border: '2px dashed #E2E8F0', borderRadius: 14 }}>
              <ListTodo size={28} style={{ color: '#CBD5E1', margin: '0 auto 10px' }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#94A3B8' }}>No tasks in this sprint yet</p>
              {isManagerOrAdmin && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#CBD5E1' }}>Add tasks from the backlog below</p>}
            </div>
          ) : boardView === 'board' ? (
            <SprintKanbanBoard tasks={sprintTasks} onStatusChange={onStatusChange} isManagerOrAdmin={isManagerOrAdmin} />
          ) : (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 90px 130px', gap: 12, padding: '10px 14px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Task', 'Assignee', 'Priority', 'Status'].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</span>
                ))}
              </div>
              {sprintTasks.map((task, i) => {
                const meta = TASK_STATUS_META[task.status] || TASK_STATUS_META.backlog;
                const Icon = meta.icon;
                return (
                  <div key={task._id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 90px 130px', gap: 12, padding: '11px 14px', borderBottom: i < sprintTasks.length - 1 ? '1px solid #F1F5F9' : 'none', alignItems: 'center', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                      <Icon size={12} style={{ color: meta.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.assignee?.name || '—'}</span>
                    <PriorityChip priority={task.priority} />
                    {isManagerOrAdmin ? (
                      <select value={task.status} onChange={e => onStatusChange(task._id, e.target.value)}
                        style={{ fontSize: 11, border: '1px solid #E2E8F0', borderRadius: 7, padding: '4px 7px', background: '#fff', outline: 'none', cursor: 'pointer', width: '100%' }}>
                        {Object.entries(TASK_STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                      </select>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: meta.color }}><Icon size={10} />{meta.label}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Backlog for this project */}
          {isManagerOrAdmin && backlogTasks.length > 0 && (
            <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #F1F5F9' }}>
              <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Backlog — {backlogTasks.length} unassigned task{backlogTasks.length !== 1 ? 's' : ''}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {backlogTasks.map(task => (
                  <div key={task._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                    <TaskStatusIcon status={task.status} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                    <PriorityChip priority={task.priority} />
                    <button onClick={() => onAssignTask(task._id, sprint._id)} disabled={assigning === task._id}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                      {assigning === task._id ? <Spinner size="xs" /> : <ArrowRight size={11} />} Add to Sprint
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <Modal open={showCompleteModal} onClose={() => setShowCompleteModal(false)} title={`Complete "${sprint.name}"`} size="md">
        <CompleteSprintModal
          sprint={sprint}
          sprintTasks={sprintTasks}
          plannedSprints={plannedSprints}
          onClose={() => setShowCompleteModal(false)}
          onComplete={onComplete}
        />
      </Modal>
    </>
  );
}

// ── Planned Sprint Row ─────────────────────────────────────────────────────────
function PlannedSprintRow({ sprint, tasks, isManagerOrAdmin, isAdmin, onStart, onDelete, onAssignTask, assigning }) {
  const [expanded, setExpanded] = useState(false);
  const sprintTasks = tasks.filter(t => (t.sprint?._id || t.sprint) === sprint._id);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer' }} onClick={() => setExpanded(v => !v)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          {expanded ? <ChevronDown size={16} style={{ color: '#64748B', flexShrink: 0 }} /> : <ChevronRight size={16} style={{ color: '#64748B', flexShrink: 0 }} />}
          <SprintStatusBadge status="planned" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sprint.name}</span>
          {sprint.project?.name && <span style={{ fontSize: 11, color: '#94A3B8' }}>{sprint.project.name}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: '#64748B' }}>{sprintTasks.length} task{sprintTasks.length !== 1 ? 's' : ''}</span>
          {sprint.startDate && (
            <span style={{ fontSize: 11, color: '#94A3B8' }}>
              {new Date(sprint.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '?'}
            </span>
          )}
          {isManagerOrAdmin && (
            <button onClick={e => { e.stopPropagation(); onStart(sprint); }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 7, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              <Play size={10} /> Start Sprint
            </button>
          )}
          {isAdmin && (
            <button onClick={e => { e.stopPropagation(); onDelete(sprint); }}
              style={{ padding: '5px 7px', borderRadius: 7, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', display: 'flex' }}>
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ borderTop: '1px solid #F1F5F9', padding: '14px 18px', overflow: 'hidden' }}>
            {sprint.goal && (
              <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#334155' }}>
                <span style={{ fontWeight: 700 }}>Goal:</span> {sprint.goal}
              </div>
            )}
            {sprintTasks.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: '#CBD5E1', textAlign: 'center', padding: '16px 0' }}>No tasks yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {sprintTasks.map(task => {
                  const meta = TASK_STATUS_META[task.status] || TASK_STATUS_META.backlog;
                  const Icon = meta.icon;
                  return (
                    <div key={task._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#F8FAFC', borderRadius: 8 }}>
                      <Icon size={12} style={{ color: meta.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', flex: 1 }}>{task.title}</span>
                      <PriorityChip priority={task.priority} />
                      {task.assignee && <span style={{ fontSize: 11, color: '#64748B' }}>{task.assignee.name}</span>}
                      {isManagerOrAdmin && (
                        <button onClick={() => onAssignTask(task._id, null)} disabled={assigning === task._id}
                          style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 7px', borderRadius: 5, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                          <X size={9} /> Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Completed Sprint Card ──────────────────────────────────────────────────────
function CompletedSprintCard({ sprint, tasks }) {
  const [expanded, setExpanded] = useState(false);
  const sprintTasks = tasks.filter(t => (t.sprint?._id || t.sprint) === sprint._id);
  const done = sprintTasks.filter(t => t.status === 'done').length;
  const pct = sprintTasks.length ? Math.round((done / sprintTasks.length) * 100) : 100;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer' }} onClick={() => setExpanded(v => !v)}>
        {expanded ? <ChevronDown size={15} style={{ color: '#64748B' }} /> : <ChevronRight size={15} style={{ color: '#64748B' }} />}
        <Archive size={14} style={{ color: '#059669', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{sprint.name}</span>
            {sprint.project?.name && <span style={{ fontSize: 11, color: '#94A3B8' }}>{sprint.project.name}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            {sprint.startDate && (
              <span style={{ fontSize: 10, color: '#94A3B8' }}>
                {new Date(sprint.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '?'}
              </span>
            )}
            <span style={{ fontSize: 10, color: '#059669', fontWeight: 700 }}>{done}/{sprintTasks.length} completed</span>
            {sprint.velocity > 0 && <span style={{ fontSize: 10, color: '#64748B' }}>{sprint.velocity} pts velocity</span>}
          </div>
        </div>
        {/* Mini progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ width: 80, height: 5, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: '#10b981', borderRadius: 999 }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>{pct}%</span>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ borderTop: '1px solid #F1F5F9', padding: '14px 18px', overflow: 'hidden' }}>
            {/* Status breakdown */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {Object.entries(TASK_STATUS_META).map(([key, meta]) => {
                const count = sprintTasks.filter(t => t.status === key).length;
                if (!count) return null;
                const Icon = meta.icon;
                return (
                  <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: meta.color + '12', color: meta.color, border: `1px solid ${meta.color}25` }}>
                    <Icon size={9} /> {meta.label}: {count}
                  </span>
                );
              })}
            </div>
            {sprintTasks.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: '#CBD5E1' }}>No tasks were in this sprint</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {sprintTasks.map(task => {
                  const meta = TASK_STATUS_META[task.status] || TASK_STATUS_META.backlog;
                  const Icon = meta.icon;
                  return (
                    <div key={task._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#F8FAFC', borderRadius: 8 }}>
                      <Icon size={11} style={{ color: meta.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#334155', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: task.status === 'done' ? 'line-through' : 'none', opacity: task.status === 'done' ? 0.65 : 1 }}>{task.title}</span>
                      <PriorityChip priority={task.priority} />
                      {task.assignee && <span style={{ fontSize: 10, color: '#94A3B8' }}>{task.assignee.name}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function SprintsPage() {
  const { isManagerOrAdmin, user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [sprints, setSprints]         = useState([]);
  const [projects, setProjects]       = useState([]);
  const [allTasks, setAllTasks]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [form, setForm]               = useState({ name: '', goal: '', project: '', startDate: '', endDate: '' });
  const [saving, setSaving]           = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting]       = useState(false);
  const [assigning, setAssigning]     = useState(null);
  const [activeTab, setActiveTab]     = useState('board'); // 'board' | 'history'

  useEffect(() => {
    Promise.all([
      sprintAPI.getAll(),
      projectAPI.getAll().catch(() => ({ data: { data: [] } })),
      isManagerOrAdmin
        ? taskAPI.getAll().catch(() => ({ data: { data: [] } }))
        : taskAPI.getMy().catch(() => ({ data: { data: [] } })),
    ]).then(([sRes, pRes, tRes]) => {
      setSprints(resolveSprints(sRes));
      setProjects(resolveProjects(pRes));
      setAllTasks(resolveTasks(tRes));
    }).catch(() => toast.error('Failed to load sprints'))
      .finally(() => setLoading(false));
  }, [isManagerOrAdmin]);

  const reloadAll = async () => {
    try {
      const [sRes, tRes] = await Promise.all([sprintAPI.getAll(), isManagerOrAdmin ? taskAPI.getAll() : taskAPI.getMy()]);
      setSprints(resolveSprints(sRes));
      setAllTasks(resolveTasks(tRes));
    } catch {}
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await sprintAPI.create(form);
      const d = res?.data;
      const newSprint = d?.data || d?.sprint;
      if (newSprint) setSprints(p => [newSprint, ...p]);
      setShowCreate(false);
      setForm({ name: '', goal: '', project: '', startDate: '', endDate: '' });
      toast.success('Sprint created!');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleStart = async (sprint) => {
    try {
      const res = await sprintAPI.start(sprint._id);
      const updated = res?.data?.sprint || res?.data?.data;
      if (updated) setSprints(prev => prev.map(s => s._id === sprint._id ? updated : s));
      toast.success('Sprint started!');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to start sprint'); }
  };

  const handleComplete = async (sprintId, nextSprintId) => {
    try {
      const res = await sprintAPI.complete(sprintId, nextSprintId ? { nextSprintId } : {});
      const updated = res?.data?.sprint || res?.data?.data;
      if (updated) setSprints(prev => prev.map(s => s._id === sprintId ? updated : s));
      toast.success(res?.data?.message || 'Sprint completed!');
      await reloadAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); throw e; }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await sprintAPI.delete(deleteConfirm._id);
      setSprints(prev => prev.filter(s => s._id !== deleteConfirm._id));
      setAllTasks(prev => prev.map(t =>
        (t.sprint?._id || t.sprint) === deleteConfirm._id ? { ...t, sprint: null } : t
      ));
      toast.success(`Sprint deleted. Tasks moved to backlog.`);
      setDeleteConfirm(null);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setDeleting(false); }
  };

  const handleAssignTask = async (taskId, sprintId) => {
    setAssigning(taskId);
    try {
      const res = await taskAPI.assignSprint(taskId, sprintId);
      const updated = res.data?.task;
      if (updated) {
        setAllTasks(prev => prev.map(t => t._id === taskId ? { ...t, sprint: updated.sprint } : t));
      }
      toast.success(sprintId ? 'Task added to sprint!' : 'Task moved to backlog');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setAssigning(null); }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskAPI.updateStatus(taskId, newStatus);
      setAllTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
      toast.success(`Status updated`, { duration: 1500 });
    } catch { toast.error('Status update failed'); }
  };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-slate-400">Loading sprints…</p>
    </div>
  );

  const activeSprint     = sprints.find(s => s.status === 'active');
  const plannedSprints   = sprints.filter(s => s.status === 'planned');
  const completedSprints = sprints.filter(s => s.status === 'completed').sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  // Velocity trend (last 5 completed sprints)
  const velocityData = completedSprints.slice(0, 5).reverse();

  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B' }}>Project Management</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 800, color: '#0F172A' }}>
            Sprint <span style={{ color: '#2563EB' }}>Board</span>
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
            {sprints.length} sprint{sprints.length !== 1 ? 's' : ''} · {activeSprint ? '1 active' : 'no active sprint'} · {completedSprints.length} completed
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Tab switcher */}
          <div style={{ display: 'flex', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 3, gap: 2 }}>
            {[{ key: 'board', label: 'Board', icon: LayoutGrid }, { key: 'history', label: 'Sprint History', icon: Archive }].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: activeTab === key ? '#0F172A' : 'transparent', color: activeTab === key ? '#fff' : '#64748B', transition: 'all 0.15s' }}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
          {isManagerOrAdmin && (
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowCreate(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 12, background: '#2563EB', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}>
              <Plus size={15} /> New Sprint
            </motion.button>
          )}
        </div>
      </div>

      {/* ══ BOARD TAB ════════════════════════════════════════════════════ */}
      {activeTab === 'board' && (
        <div className="space-y-6">
          {sprints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0' }}>
              <Zap size={40} style={{ color: '#CBD5E1', margin: '0 auto 16px' }} />
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#64748B' }}>No sprints yet</p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94A3B8' }}>Create your first sprint to start tracking work</p>
              {isManagerOrAdmin && (
                <button onClick={() => setShowCreate(true)} style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, background: '#2563EB', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  <Plus size={14} /> Create Sprint
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Active Sprint */}
              {activeSprint && (
                <div>
                  <ActiveSprintPanelWrapper
                    sprint={activeSprint}
                    tasks={allTasks}
                    allTasks={allTasks}
                    plannedSprints={plannedSprints}
                    isManagerOrAdmin={isManagerOrAdmin}
                    isAdmin={isAdmin}
                    onComplete={handleComplete}
                    onDelete={setDeleteConfirm}
                    onAssignTask={handleAssignTask}
                    onStatusChange={handleStatusChange}
                    assigning={assigning}
                  />
                </div>
              )}

              {/* Planned Sprints */}
              {plannedSprints.length > 0 && (
                <div>
                  <h2 style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Upcoming Sprints ({plannedSprints.length})
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {plannedSprints.map(s => (
                      <PlannedSprintRow key={s._id} sprint={s} tasks={allTasks}
                        isManagerOrAdmin={isManagerOrAdmin} isAdmin={isAdmin}
                        onStart={handleStart} onDelete={setDeleteConfirm}
                        onAssignTask={handleAssignTask} assigning={assigning} />
                    ))}
                  </div>
                </div>
              )}

              {/* No active, no planned */}
              {!activeSprint && plannedSprints.length === 0 && (
                <div style={{ textAlign: 'center', padding: '50px 20px', background: '#fff', borderRadius: 18, border: '2px dashed #E2E8F0' }}>
                  <Play size={28} style={{ color: '#CBD5E1', margin: '0 auto 12px' }} />
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#64748B' }}>No active or upcoming sprints</p>
                  {isManagerOrAdmin && <p style={{ margin: '5px 0 0', fontSize: 12, color: '#94A3B8' }}>Create a sprint and start it to begin tracking work</p>}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ HISTORY TAB ══════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="space-y-5">
          {/* Velocity summary (if any completed sprints) */}
          {completedSprints.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <TrendingUp size={16} style={{ color: '#2563EB' }} />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Sprint Velocity</h3>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>last {Math.min(completedSprints.length, 5)} sprints</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 60 }}>
                {velocityData.map((s, i) => {
                  const sprintTasks = allTasks.filter(t => (t.sprint?._id || t.sprint) === s._id);
                  const done = sprintTasks.filter(t => t.status === 'done').length;
                  const maxDone = Math.max(...velocityData.map(vs => allTasks.filter(t => (t.sprint?._id || t.sprint) === vs._id && t.status === 'done').length), 1);
                  const h = Math.max(8, (done / maxDone) * 52);
                  return (
                    <div key={s._id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#2563EB' }}>{done}</span>
                      <motion.div initial={{ height: 0 }} animate={{ height: h }} transition={{ duration: 0.5, delay: i * 0.1 }}
                        style={{ width: '100%', background: i === velocityData.length - 1 ? '#2563EB' : '#BFDBFE', borderRadius: '4px 4px 0 0' }} />
                      <span style={{ fontSize: 9, color: '#94A3B8', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{s.name.split(' ').slice(0, 2).join(' ')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed sprints list */}
          <div>
            <h2 style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Completed Sprints ({completedSprints.length})
            </h2>
            {completedSprints.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px', background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0' }}>
                <Archive size={28} style={{ color: '#CBD5E1', margin: '0 auto 10px' }} />
                <p style={{ margin: 0, fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>No completed sprints yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {completedSprints.map(s => (
                  <CompletedSprintCard key={s._id} sprint={s} tasks={allTasks} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteConfirm} onClose={() => !deleting && setDeleteConfirm(null)} title="Delete Sprint" size="sm">
        {deleteConfirm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 12, padding: '14px 16px' }}>
              <AlertTriangle size={18} style={{ color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#991B1B' }}>Delete "{deleteConfirm.name}"?</p>
                <p style={{ margin: 0, fontSize: 12, color: '#B91C1C' }}>All tasks will be moved to backlog. This cannot be undone.</p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setDeleteConfirm(null)} disabled={deleting}
                style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, border: 'none', background: '#DC2626', color: '#fff', fontSize: 13, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}>
                {deleting ? <Spinner size="xs" /> : <Trash2 size={13} />} {deleting ? 'Deleting…' : 'Delete Sprint'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Sprint Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Sprint">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Sprint Name" value={form.name} onChange={set('name')} placeholder="e.g. Sprint 12 — Auth Module" required />
          <Textarea label="Sprint Goal" value={form.goal} onChange={set('goal')} placeholder="What should be achieved this sprint?" />
          <Select label="Project" value={form.project} onChange={set('project')} required>
            <option value="">Select project…</option>
            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </Select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Start Date" type="date" value={form.startDate} onChange={set('startDate')} required />
            <Input label="End Date" type="date" value={form.endDate} onChange={set('endDate')} required />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving} disabled={!form.name || !form.project || !form.startDate || !form.endDate}>
              Create Sprint
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

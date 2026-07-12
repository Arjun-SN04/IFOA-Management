import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { teamAPI, taskAPI, projectAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Modal, Input, Spinner } from '../../components/ui';
import {
  Plus, Users, UserCheck, Briefcase, Trash2,
  ChevronDown, ChevronRight, Edit2, ArrowRightLeft,
  Crown, Shield, LayoutGrid, Activity,
  CheckCircle2, Clock, AlertTriangle, Eye, RefreshCw,
  ArrowRight, X, CheckSquare, Circle, Tag, Kanban,
  Diamond,
} from 'lucide-react';

const TEAM_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#0EA5E9', '#14B8A6',
  '#F97316', '#6366F1',
];

const ROLE_META = {
  admin:     { label: 'Admin',      color: '#7C3AED', bg: '#F5F3FF', icon: Crown },
  manager:   { label: 'Management', color: '#2563EB', bg: '#EFF6FF', icon: Shield },
  team_lead: { label: 'Team Lead',  color: '#059669', bg: '#ECFDF5', icon: Diamond },
  employee:  { label: 'User',       color: '#64748B', bg: '#F8FAFC', icon: Users },
};

const KANBAN_COLS = [
  { key: 'backlog',      label: 'Backlog',      fill: '#94a3b8', icon: AlertTriangle },
  { key: 'todo',         label: 'To Do',        fill: '#7c3aed', icon: Circle },
  { key: 'in-progress',  label: 'In Progress',  fill: '#3b82f6', icon: Clock },
  { key: 'in-review',    label: 'In Review',    fill: '#f59e0b', icon: Eye },
  { key: 'done',         label: 'Done',         fill: '#10b981', icon: CheckCircle2 },
];

const PRIORITY_META = {
  low:      { color: '#16a34a', bg: '#f0fdf4' },
  medium:   { color: '#d97706', bg: '#fffbeb' },
  high:     { color: '#ea580c', bg: '#fff7ed' },
  critical: { color: '#dc2626', bg: '#fef2f2' },
};

function RoleBadge({ role }) {
  const m = ROLE_META[role] || ROLE_META.employee;
  const Icon = m.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: m.bg, color: m.color }}>
      <Icon size={9} /> {m.label}
    </span>
  );
}

const AVATAR_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];
function nameColor(name) { return AVATAR_COLORS[(name || '').charCodeAt(0) % AVATAR_COLORS.length]; }

function MemberAvatar({ name, color, size = 32 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const bg = color || nameColor(name);
  return (
    <div style={{ width: size, height: size, borderRadius: 999, background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.34, fontWeight: 800, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// ── Team Kanban Board Modal ────────────────────────────────────────────────────
function TeamKanbanModal({ team, onClose }) {
  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const TEAM_VIEW_KEY = 'team-board';
  const [memberFilter, setMemberFilter] = useState(TEAM_VIEW_KEY);

  const load = useCallback(async (target = TEAM_VIEW_KEY, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = target === TEAM_VIEW_KEY
        ? await taskAPI.getAll({ team: team._id })
        : await taskAPI.getAll({ assignee: target });

      const loaded = res.data.tasks || res.data.data || [];
      const scoped = target === TEAM_VIEW_KEY
        ? loaded
        : loaded.filter(t => !t.isTeamTask && String(t.assignee?._id || t.assignee) === String(target));

      setTasks(scoped);
    } catch {
      toast.error('Failed to load team board');
    } finally { setLoading(false); setRefreshing(false); }
  }, [team._id]);

  useEffect(() => { load(memberFilter); }, [load, memberFilter]);

  const allMembers = [
    ...(team.teamLead ? [team.teamLead] : []),
    ...(team.members || []).filter(m => String(m._id) !== String(team.teamLead?._id)),
  ];

  const selectedMember = allMembers.find(m => String(m._id) === String(memberFilter));

  return (
    <Modal open={true} onClose={onClose} title={`Team Board — ${team.name}`} size="xl">
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 12 }}>
          <Spinner size="lg" />
          <p style={{ fontSize: 13, color: '#94A3B8' }}>Loading board…</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                {memberFilter === TEAM_VIEW_KEY
                  ? `${tasks.length} tasks in team board`
                  : `${tasks.length} personal tasks for ${selectedMember?.name || 'member'}`}
              </span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                <button onClick={() => setMemberFilter(TEAM_VIEW_KEY)}
                  style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${memberFilter === TEAM_VIEW_KEY ? '#2563EB' : '#E2E8F0'}`, background: memberFilter === TEAM_VIEW_KEY ? '#EFF6FF' : '#fff', color: memberFilter === TEAM_VIEW_KEY ? '#2563EB' : '#64748B', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  Team Board
                </button>
                {allMembers.map(m => (
                  <button key={m._id} onClick={() => setMemberFilter(String(m._id))}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: `1px solid ${memberFilter === String(m._id) ? '#2563EB' : '#E2E8F0'}`, background: memberFilter === String(m._id) ? '#EFF6FF' : '#fff', color: memberFilter === String(m._id) ? '#2563EB' : '#64748B', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    <MemberAvatar name={m.name} size={16} />
                    {m.name?.split(' ')[0]}
                  </button>
                ))}
              </div>
              <button onClick={() => load(memberFilter, true)} disabled={refreshing}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'thin' }}>
            {KANBAN_COLS.map(col => {
              const colTasks = tasks.filter(t => t.status === col.key);
              const Icon = col.icon;
              return (
                <div key={col.key} style={{ flexShrink: 0, width: 240 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, padding: '8px 10px', borderRadius: 10, background: '#fff', border: '1px solid #E2E8F0', borderLeft: `3px solid ${col.fill}` }}>
                    <Icon size={12} style={{ color: col.fill, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '.07em', flex: 1 }}>{col.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: col.fill, padding: '0px 6px', borderRadius: 999 }}>{colTasks.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 60 }}>
                    {colTasks.length === 0 ? (
                      <div style={{ border: '1px dashed #CBD5E1', borderRadius: 10, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p style={{ fontSize: 10, color: '#CBD5E1' }}>Empty</p>
                      </div>
                    ) : colTasks.map(task => {
                      const pm = PRIORITY_META[task.priority] || PRIORITY_META.medium;
                      const assigneeName = task.assignee?.name;
                      return (
                        <motion.div key={task._id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                          style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', boxShadow: '0 1px 3px rgba(15,23,42,.04)' }}>
                          <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: '#0F172A', lineHeight: 1.4 }}>{task.title}</p>
                          {task.project?.name && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                              <Tag size={9} style={{ color: '#94A3B8' }} />
                              <span style={{ fontSize: 10, color: '#94A3B8' }}>{task.project.name}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 5, background: pm.bg, color: pm.color, textTransform: 'capitalize' }}>
                              {task.priority}
                            </span>
                            {assigneeName && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <MemberAvatar name={assigneeName} size={18} />
                                <span style={{ fontSize: 10, color: '#64748B' }}>{assigneeName.split(' ')[0]}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Live Team Dashboard Modal ─────────────────────────────────────────────────
function TeamDashboardModal({ team, onClose, onAssignTask }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await teamAPI.getDashboard(team._id);
      setDashboard(res.data);
    } catch (e) {
      toast.error('Failed to load team dashboard');
    } finally { setLoading(false); setRefreshing(false); }
  }, [team._id]);

  useEffect(() => {
    setDashboard(null);
    setLoading(true);
    load();
  }, [team._id]);

  const STATUS_CONFIG = {
    backlog:       { label: 'Backlog',     color: '#94A3B8', bg: '#F8FAFC' },
    todo:          { label: 'To Do',       color: '#7C3AED', bg: '#F5F3FF' },
    'in-progress': { label: 'In Progress', color: '#2563EB', bg: '#EFF6FF' },
    'in-review':   { label: 'In Review',   color: '#D97706', bg: '#FFFBEB' },
    done:          { label: 'Done',        color: '#059669', bg: '#ECFDF5' },
  };

  return (
    <Modal open={true} onClose={onClose} title={`Team Dashboard — ${team.name}`} size="xl">
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 12 }}>
          <Spinner size="lg" />
          <p style={{ fontSize: 13, color: '#94A3B8' }}>Loading live dashboard…</p>
        </div>
      ) : dashboard ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
              {dashboard.team?.members?.length || 0} members · {dashboard.taskStats?.total || 0} tasks
            </span>
          </div>
            <button onClick={() => load(true)} disabled={refreshing}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 }}>
            {[
              { label: 'Total',       value: dashboard.taskStats?.total || 0,      color: '#2563EB', bg: '#EFF6FF', icon: CheckSquare },
              { label: 'In Progress', value: dashboard.taskStats?.inProgress || 0, color: '#F59E0B', bg: '#FFFBEB', icon: Clock },
              { label: 'In Review',   value: dashboard.taskStats?.inReview || 0,   color: '#7C3AED', bg: '#F5F3FF', icon: Eye },
              { label: 'Done',        value: dashboard.taskStats?.done || 0,       color: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
              { label: 'Overdue',     value: dashboard.taskStats?.overdue || 0,    color: '#DC2626', bg: '#FEF2F2', icon: AlertTriangle },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', textAlign: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={15} style={{ color: s.color }} />
                  </div>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{s.value}</p>
                  <p style={{ margin: 0, fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>{s.label}</p>
                </div>
              );
            })}
          </div>

          {onAssignTask && (
            <div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#065F46' }}>Assign New Task to Team Lead</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#059669' }}>
                  {dashboard.team?.teamLead?.name
                    ? `Tasks assigned to ${dashboard.team.teamLead.name}`
                    : 'No team lead assigned yet'}
                </p>
              </div>
              <button onClick={() => onAssignTask(dashboard.team)} disabled={!dashboard.team?.teamLead}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: dashboard.team?.teamLead ? '#059669' : '#D1FAE5', color: dashboard.team?.teamLead ? '#fff' : '#6EE7B7', fontSize: 13, fontWeight: 700, cursor: dashboard.team?.teamLead ? 'pointer' : 'not-allowed' }}>
                <Plus size={14} /> Assign Task to Team Lead
              </button>
            </div>
          )}

          <div>
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Member Breakdown</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(dashboard.memberStats || []).map(ms => {
                const pct = ms.taskCount > 0 ? Math.round((ms.done / ms.taskCount) * 100) : 0;
                const isLead = String(ms.member?._id) === String(dashboard.team?.teamLead?._id);
                return (
                  <div key={ms.member?._id} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <MemberAvatar name={ms.member?.name} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{ms.member?.name}</p>
                          {isLead && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
                              <Diamond size={8} /> Team Lead
                            </span>
                          )}
                        </div>
                        <p style={{ margin: '1px 0 0', fontSize: 11, color: '#94A3B8' }}>{ms.member?.department || ms.member?.email}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: '#94A3B8' }}>{ms.taskCount} task{ms.taskCount !== 1 ? 's' : ''}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: pct === 100 ? '#059669' : '#2563EB' }}>{pct}%</span>
                      </div>
                    </div>
                    <div style={{ height: 5, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#059669' : '#3B82F6', borderRadius: 999, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {[
                        { key: 'todo', label: 'To Do', val: ms.todo, color: '#7C3AED', bg: '#F5F3FF' },
                        { key: 'inProgress', label: 'Active', val: ms.inProgress, color: '#2563EB', bg: '#EFF6FF' },
                        { key: 'done', label: 'Done', val: ms.done, color: '#059669', bg: '#ECFDF5' },
                        { key: 'overdue', label: 'Overdue', val: ms.overdue, color: '#DC2626', bg: '#FEF2F2' },
                      ].filter(c => c.val > 0).map(c => (
                        <span key={c.key} style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: c.bg, color: c.color }}>
                          {c.val} {c.label}
                        </span>
                      ))}
                      {ms.taskCount === 0 && <span style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>No tasks assigned</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {dashboard.tasks?.length > 0 && (
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>All Team Tasks</p>
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 110px', gap: 0, padding: '10px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  {['Task', 'Assignee', 'Priority', 'Status'].map(h => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
                  ))}
                </div>
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {dashboard.tasks.map(task => {
                    const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
                    return (
                      <div key={task._id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 110px', gap: 0, padding: '10px 16px', borderBottom: '1px solid #F8FAFC', alignItems: 'center' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{task.title}</p>
                          {task.project?.name && <p style={{ margin: '1px 0 0', fontSize: 10, color: '#94A3B8' }}>{task.project.name}</p>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MemberAvatar name={task.assignee?.name} size={22} />
                          <span style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.assignee?.name?.split(' ')[0] || '—'}</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: task.priority === 'critical' ? '#DC2626' : task.priority === 'high' ? '#EA580C' : task.priority === 'low' ? '#16A34A' : '#D97706', textTransform: 'capitalize' }}>{task.priority}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: sc.bg, color: sc.color, display: 'inline-block' }}>{sc.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: '#94A3B8', padding: '40px 0' }}>Failed to load dashboard</p>
      )}
    </Modal>
  );
}

// ── Assign Task Modal ─────────────────────────────────────────────────────────
function AssignTaskModal({ team, projects, onClose, onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', type: 'task', project: '', dueDate: '', status: 'backlog' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.title || !form.project) { toast.error('Title and project are required'); return; }
    setSaving(true);
    try {
      const leadId = team.teamLead?._id || team.teamLead;
      await taskAPI.create({ ...form, assignee: leadId, team: team._id, reporter: user?.id || user?._id, assignedByRole: user?.role });
      toast.success(`Task assigned to ${team.teamLead?.name || 'team lead'}`);
      onSaved(); onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to assign task'); }
    finally { setSaving(false); }
  };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <Modal open={true} onClose={onClose} title={`Assign Task → ${team.name}`} size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, padding: '12px 14px' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#065F46' }}>Assigning to Team Lead: {team.teamLead?.name}</p>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: '#059669' }}>The team lead will receive this task and can assign subtasks to team members.</p>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Task Type</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[{ key: 'task', label: 'Task', color: '#0891b2', bg: '#ecfeff' }, { key: 'bug', label: 'Bug', color: '#DC2626', bg: '#FEF2F2' }, { key: 'story', label: 'Story', color: '#2563EB', bg: '#EFF6FF' }, { key: 'epic', label: 'Epic', color: '#7C3AED', bg: '#F5F3FF' }].map(t => (
              <button key={t.key} onClick={() => setForm(f => ({ ...f, type: t.key }))}
                style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${form.type === t.key ? t.color : '#E2E8F0'}`, background: form.type === t.key ? t.bg : '#fff', color: form.type === t.key ? t.color : '#64748B', fontSize: 12, fontWeight: form.type === t.key ? 800 : 600, cursor: 'pointer' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Title <span style={{ color: '#EF4444' }}>*</span></label>
          <input value={form.title} onChange={set('title')} placeholder="Task title…"
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Description</label>
          <textarea value={form.description} onChange={set('description')} rows={3} placeholder="Optional details…"
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Project <span style={{ color: '#EF4444' }}>*</span></label>
            <select value={form.project} onChange={set('project')}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
              <option value="">Select project…</option>
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Priority</label>
            <select value={form.priority} onChange={set('priority')}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Due Date</label>
          <input type="date" value={form.dueDate} onChange={set('dueDate')}
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving} disabled={!form.title || !form.project}>
            <ArrowRight size={13} /> Assign to Team Lead
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Team Card — professional flat design ──────────────────────────────────────
function TeamCard({ team, onEdit, onDelete, onSwitchMember, onChangeLead, onViewBoard, onViewDashboard, canManage }) {
  const [flipped, setFlipped] = useState(false);

  const lead           = team.teamLead;
  const teamColor      = team.color || '#3B82F6';
  const allMembers     = team.members || [];
  const nonLeadMembers = allMembers.filter(m => String(m._id) !== String(lead?._id));

  return (
    <div style={{ perspective: '1200px', minHeight: 240 }}>
      <div style={{
        position: 'relative', width: '100%', minHeight: 240,
        transformStyle: 'preserve-3d',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        transition: 'transform 0.5s cubic-bezier(0.4,0.2,0.2,1)',
      }}>

        {/* ─── FRONT FACE ─── */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
          background: '#fff', borderRadius: 16,
          border: '1px solid #E8EDF4',
          boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
          overflow: 'hidden',
          zIndex: flipped ? 0 : 1,
          opacity: flipped ? 0 : 1,
          pointerEvents: flipped ? 'none' : 'auto',
          transition: 'opacity 0.15s',
        }}>

          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, height: '100%', boxSizing: 'border-box' }}>

            {/* Header — name + member count */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</h3>
                {team.description && <p style={{ margin: '3px 0 0', fontSize: 11.5, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.description}</p>}
              </div>
              <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>
                {allMembers.length} member{allMembers.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Team Lead */}
            {lead ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MemberAvatar name={lead.name} size={34} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Diamond size={9} style={{ color: teamColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Team Lead</span>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: '#D97706', fontWeight: 600 }}>⚠ No team lead assigned</p>
            )}

            {/* Member pips */}
            {nonLeadMembers.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {nonLeadMembers.slice(0, 5).map((m, i) => (
                  <div key={m._id} title={m.name} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 5 - i, border: '2px solid #fff', borderRadius: '50%' }}>
                    <MemberAvatar name={m.name} size={26} />
                  </div>
                ))}
                {nonLeadMembers.length > 5 && (
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>+{nonLeadMembers.length - 5}</span>
                )}
              </div>
            )}

            {/* Action buttons — ghost style, no backgrounds */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderTop: '1px solid #F1F5F9', paddingTop: 10, marginTop: 'auto' }}>
              <button onClick={() => onViewBoard(team)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px 4px', background: 'none', border: 'none', cursor: 'pointer', color: '#2563EB', fontSize: 11.5, fontWeight: 700, borderRadius: 8, transition: 'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F0F6FF'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <LayoutGrid size={12} /> Board
              </button>
              <div style={{ width: 1, height: 16, background: '#E8EDF4' }} />
              <button onClick={() => onViewDashboard(team)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px 4px', background: 'none', border: 'none', cursor: 'pointer', color: '#059669', fontSize: 11.5, fontWeight: 700, borderRadius: 8, transition: 'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F0FDF4'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <Activity size={12} /> Dashboard
              </button>
              {canManage && (
                <>
                  <div style={{ width: 1, height: 16, background: '#E8EDF4' }} />
                  <button onClick={() => onChangeLead(team)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px 4px', background: 'none', border: 'none', cursor: 'pointer', color: '#D97706', fontSize: 11.5, fontWeight: 700, borderRadius: 8, transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FFFBEB'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <Diamond size={12} /> Lead
                  </button>
                  <div style={{ width: 1, height: 16, background: '#E8EDF4' }} />
                  <button onClick={() => onEdit(team)}
                    style={{ padding: '6px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center', borderRadius: 8, transition: 'color .15s, background .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'none'; }}>
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => onDelete(team)}
                    style={{ padding: '6px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center', borderRadius: 8, transition: 'color .15s, background .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.background = '#FEF2F2'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'none'; }}>
                    <Trash2 size={13} />
                  </button>
                </>
              )}
              <div style={{ width: 1, height: 16, background: '#E8EDF4' }} />
              <button onClick={() => setFlipped(true)}
                style={{ padding: '6px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, borderRadius: 8, transition: 'color .15s, background .15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = '#F8FAFC'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'none'; }}>
                <Users size={12} />
              </button>
            </div>

            {/* Footer */}
            {team.projects?.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: -8 }}>
                <Briefcase size={11} style={{ color: '#CBD5E1' }} />
                <span style={{ fontSize: 11, color: '#94A3B8' }}>{team.projects.length} project{team.projects.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── BACK FACE ─── */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          background: '#fff', borderRadius: 16,
          border: '1px solid #E8EDF4',
          boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
          overflow: 'hidden',
          zIndex: flipped ? 1 : 0,
          opacity: flipped ? 1 : 0,
          pointerEvents: flipped ? 'auto' : 'none',
          transition: 'opacity 0.15s',
        }}>
          <div style={{ height: 3, background: teamColor, borderRadius: '16px 16px 0 0' }} />
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', height: 'calc(100% - 3px)', boxSizing: 'border-box' }}>
            {/* Back header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{team.name}</h3>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94A3B8' }}>{allMembers.length} member{allMembers.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setFlipped(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#64748B', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>
                <ChevronRight size={13} style={{ transform: 'rotate(180deg)' }} /> Back
              </button>
            </div>

            {/* Members list */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 2 }}>
              {lead && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: `${teamColor}0D`, border: `1px solid ${teamColor}30` }}>
                  <MemberAvatar name={lead.name} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{lead.name}</p>
                    <p style={{ margin: 0, fontSize: 10, color: '#64748B' }}>{lead.department || lead.email || ''}</p>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', flexShrink: 0 }}>
                    <Diamond size={8} /> Lead
                  </span>
                </div>
              )}

              {nonLeadMembers.length === 0 && !lead && (
                <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '20px 0' }}>No members yet</p>
              )}
              {nonLeadMembers.map(member => (
                <div key={member._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <MemberAvatar name={member.name} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{member.name}</p>
                    <p style={{ margin: 0, fontSize: 10, color: '#94A3B8' }}>{member.department || member.email}</p>
                  </div>
                  <RoleBadge role={member.role} />
                  {canManage && (
                    <button onClick={() => onSwitchMember(member, team)}
                      style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 7px', borderRadius: 6, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                      <ArrowRightLeft size={9} /> Move
                    </button>
                  )}
                </div>
              ))}

              {team.projects?.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Projects</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {team.projects.map(p => (
                      <span key={p._id} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}


// ─── Assign Project to Team Modal ─────────────────────────────────────────────
function AssignProjectToTeamModal({ team, projects, onClose, onSaved }) {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [saving, setSaving] = useState(false);

  const assignedProjectIds = (team.projects || []).map(p => String(p._id || p));
  const availableProjects = projects.filter(p => !assignedProjectIds.includes(String(p._id)));

  const handleAssign = async () => {
    if (!selectedProjectId) return;
    setSaving(true);
    try {
      await projectAPI.assignTeam(selectedProjectId, team._id);
      toast.success('Project assigned to team successfully');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to assign project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title={`Assign Project → ${team.name}`} size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '12px 14px' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1D4ED8' }}>
            Assigning a project will add all team members to that project automatically.
          </p>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            Select Project
          </label>
          {availableProjects.length === 0 ? (
            <p style={{ fontSize: 13, color: '#94A3B8', padding: '12px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0', textAlign: 'center' }}>
              All projects are already assigned to this team.
            </p>
          ) : (
            <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
              <option value="">Select a project…</option>
              {availableProjects.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} loading={saving} disabled={!selectedProjectId || availableProjects.length === 0}>
            Assign Project
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function TeamsPage() {
  const { isManagerOrAdmin, isHROrAbove } = useAuth();
  const canManage = isManagerOrAdmin;
  const canViewDashboard = isHROrAbove;

  const [teams, setTeams]           = useState([]);
  const [eligibleUsers, setEligibleUsers] = useState([]);
  const [projects, setProjects]     = useState([]);
  const [loading, setLoading]       = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [switchModal, setSwitchModal] = useState(null);
  const [changeLeadModal, setChangeLeadModal] = useState(null);
  const [newLeadId, setNewLeadId] = useState('');

  const [kanbanTeam, setKanbanTeam]             = useState(null);
  const [dashboardTeam, setDashboardTeam]       = useState(null);
  const [assignTaskTeam, setAssignTaskTeam]     = useState(null);
  const [assignProjectTeam, setAssignProjectTeam] = useState(null);

  // Track expanded state per team — stringified _id as key to avoid ObjectId reference issues
  // (kept for future use; cards now use internal flip state)

  // Sort teams by name so array order always matches visual render order
  const sortTeams = (arr) => [...arr].sort((a, b) => String(a.name).localeCompare(String(b.name)));

  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [switching, setSwitching] = useState(false);
  const [changingLead, setChangingLead] = useState(false);

  const emptyForm = { name: '', description: '', teamLead: '', members: [], projects: [], color: TEAM_COLORS[0] };
  const [form, setForm] = useState(emptyForm);
  const [switchToTeam, setSwitchToTeam] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, uRes, pRes] = await Promise.all([
        teamAPI.getAll().catch(() => ({ data: { teams: [] } })),
        teamAPI.getEligibleMembers().catch(() => ({ data: { users: [] } })),
        projectAPI.getAll().catch(() => ({ data: { projects: [] } })),
      ]);
      setTeams(sortTeams(tRes.data.teams || []));
      setEligibleUsers(uRes.data.users || []);
      setProjects(pRes.data.projects || pRes.data.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (!form.name) { toast.error('Team name is required'); return; }
    setSaving(true);
    try {
      if (editingTeam) {
        const res = await teamAPI.update(editingTeam._id, form);
        setTeams(prev => sortTeams(prev.map(t => t._id === editingTeam._id ? (res.data.team || res.data.data) : t)));
        toast.success('Team updated!');
      } else {
        const res = await teamAPI.create(form);
        setTeams(prev => sortTeams([res.data.team || res.data.data, ...prev]));
        toast.success('Team created!');
      }
      setShowCreate(false); setEditingTeam(null); setForm(emptyForm);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to save team'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await teamAPI.delete(deleteConfirm._id);
      setTeams(prev => prev.filter(t => t._id !== deleteConfirm._id));
      toast.success('Team deleted');
      setDeleteConfirm(null);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to delete team'); }
    finally { setDeleting(false); }
  };

  const handleEdit = (team) => {
    setEditingTeam(team);
    setForm({
      name: team.name, description: team.description || '',
      teamLead: team.teamLead?._id || '',
      members: (team.members || []).map(m => m._id || m),
      projects: (team.projects || []).map(p => p._id || p),
      color: team.color || TEAM_COLORS[0],
    });
    setShowCreate(true);
  };

  const handleChangeLead = async () => {
    if (!changeLeadModal || !newLeadId) return;
    setChangingLead(true);
    try {
      const res = await teamAPI.changeLead(changeLeadModal._id, newLeadId);
      const updated = res.data.team;
      setTeams(prev => sortTeams(prev.map(t => t._id === changeLeadModal._id ? updated : t)));
      toast.success(`Team lead changed to ${updated.teamLead?.name}!`);
      setChangeLeadModal(null); setNewLeadId('');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to change team lead'); }
    finally { setChangingLead(false); }
  };

  const handleSwitchMember = async () => {
    if (!switchModal || !switchToTeam) return;
    setSwitching(true);
    try {
      await teamAPI.switchMember({ userId: switchModal.member._id, fromTeamId: switchModal.fromTeam._id, toTeamId: switchToTeam });
      toast.success(`${switchModal.member.name} moved to new team!`);
      setSwitchModal(null); setSwitchToTeam('');
      await loadData(); // always re-fetch so color + members are fresh
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to switch member'); }
    finally { setSwitching(false); }
  };

  const toggleMember = (userId) => setForm(f => ({
    ...f, members: f.members.includes(userId) ? f.members.filter(id => id !== userId) : [...f.members, userId],
  }));
  const toggleProject = (projectId) => setForm(f => ({
    ...f, projects: f.projects.includes(projectId) ? f.projects.filter(id => id !== projectId) : [...f.projects, projectId],
  }));

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12 }}>
      <Spinner size="lg" />
      <p style={{ fontSize: 13, color: '#94A3B8' }}>Loading teams…</p>
    </div>
  );

  const otherTeams = switchModal ? teams.filter(t => t._id !== switchModal.fromTeam._id) : teams;

  const getAssignedTeamNames = (userId) => {
    const uid = String(userId);
    return teams
      .filter(t => String(t.teamLead?._id || t.teamLead || '') === uid
        || (t.members || []).some(m => String(m._id || m) === uid))
      .map(t => t.name);
  };

  const getEligibleBuckets = () => {
    const decorated = eligibleUsers.map(u => {
      const assignedTeams = getAssignedTeamNames(u._id);
      return { ...u, assignedTeams };
    });
    return {
      unassigned: decorated.filter(u => u.assignedTeams.length === 0),
      assigned: decorated.filter(u => u.assignedTeams.length > 0),
    };
  };

  const createBuckets = getEligibleBuckets();
  const editBuckets = getEligibleBuckets();
  const editTeamMemberOptions = editingTeam
    ? [
        ...(editingTeam.teamLead ? [editingTeam.teamLead] : []),
        ...((editingTeam.members || []).filter(m => String(m._id || m) !== String(editingTeam.teamLead?._id || editingTeam.teamLead || ''))),
      ].filter(m => (m._id || m) && (m.name || typeof m === 'object'))
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Header ── */}
      <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '8px 2px' }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B' }}>Organisation</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 30, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
            Teams &amp; <span style={{ color: '#2563EB' }}>Boards</span>
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: '#64748B' }}>
            {teams.length} team{teams.length !== 1 ? 's' : ''} · {eligibleUsers.length} employees
          </p>
        </div>
        {canManage && (
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setEditingTeam(null); setForm(emptyForm); setShowCreate(true); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, background: '#2563EB', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}>
            <Plus size={15} /> Create Team
          </motion.button>
        )}
      </section>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total Teams', value: teams.length,                                            color: '#2563EB', bg: '#EFF6FF', icon: Users },
          { label: 'Team Leads',  value: eligibleUsers.filter(u => u.role === 'team_lead').length, color: '#059669', bg: '#ECFDF5', icon: Diamond },
          { label: 'Employees',   value: eligibleUsers.filter(u => u.role === 'employee').length,  color: '#7C3AED', bg: '#F5F3FF', icon: UserCheck },
          { label: 'Projects',    value: projects.length,                                         color: '#F59E0B', bg: '#FFFBEB', icon: Briefcase },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} style={{ color: s.color }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0F172A' }}>{s.value}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#64748B' }}>{s.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Teams Grid ── */}
      {teams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0' }}>
          <Users size={40} style={{ color: '#CBD5E1', margin: '0 auto 16px' }} />
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#64748B' }}>No teams yet</p>
          <p style={{ margin: '6px 0 16px', fontSize: 13, color: '#94A3B8' }}>Create your first team to organise your workforce</p>
          {canManage && (
            <button onClick={() => { setEditingTeam(null); setForm(emptyForm); setShowCreate(true); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, background: '#2563EB', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={14} /> Create Team
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {teams.map((team) => (
            // key must be stable and unique — team._id from MongoDB is guaranteed
            <TeamCard
              key={String(team._id || team.name)}
              team={team}
              canManage={canManage}
              onEdit={handleEdit}
              onDelete={setDeleteConfirm}
              onSwitchMember={(member, fromTeam) => { setSwitchModal({ member, fromTeam }); setSwitchToTeam(''); }}
              onChangeLead={(t) => { setChangeLeadModal(t); setNewLeadId(t.teamLead?._id || ''); }}
              onViewBoard={(t) => setKanbanTeam(t)}
              onViewDashboard={(t) => setDashboardTeam(t)}
            />
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setEditingTeam(null); setForm(emptyForm); }} title={editingTeam ? `Edit Team: ${editingTeam.name}` : 'Create Team'} size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#1D4ED8', fontWeight: 600 }}>ℹ Only employees are shown. Admins and managers cannot be added as team members.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Team Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Frontend Squad" required />
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Team Color</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TEAM_COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{ width: 28, height: 28, borderRadius: 999, background: c, border: form.color === c ? '3px solid #0F172A' : '2px solid transparent', cursor: 'pointer', outline: 'none' }} />
                ))}
              </div>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Optional team description…"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
              Team Lead <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500, textTransform: 'none' }}>(employees only)</span>
            </label>
            <select value={form.teamLead} onChange={e => setForm(f => ({ ...f, teamLead: e.target.value }))}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
              <option value="">Select team lead…</option>
              {editingTeam ? (
                editTeamMemberOptions.map(u => (
                  <option key={u._id || u} value={u._id || u}>{u.name} — Current team member</option>
                ))
              ) : (
                <>
                  {createBuckets.unassigned.map(u => (
                    <option key={u._id} value={u._id}>{u.name} — No team assigned</option>
                  ))}
                  {createBuckets.assigned.map(u => (
                    <option key={u._id} value={u._id}>{u.name} — In team: {u.assignedTeams.join(', ')}</option>
                  ))}
                </>
              )}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
              Members ({form.members.length} selected)
            </label>
            {eligibleUsers.length === 0 ? (
              <p style={{ fontSize: 12, color: '#94A3B8', padding: '12px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>No employees available</p>
            ) : (
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 12, padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(() => {
                  const buckets = editingTeam ? editBuckets : createBuckets;
                  const rows = [
                    ...buckets.unassigned.map(u => ({ ...u, groupLabel: 'No team assigned', showTeamInfo: false })),
                    ...buckets.assigned.map(u => ({ ...u, groupLabel: 'Already assigned to a team', showTeamInfo: true })),
                  ];
                  let lastGroup = '';
                  return rows.map(u => {
                    const sel = form.members.includes(u._id);
                    const groupHeader = u.groupLabel !== lastGroup;
                    lastGroup = u.groupLabel;
                    return (
                      <div key={u._id}>
                        {groupHeader && (
                          <p style={{ margin: '6px 2px 4px', fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em' }}>
                            {u.groupLabel}
                          </p>
                        )}
                        <div onClick={() => toggleMember(u._id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: sel ? '#EFF6FF' : '#fff', border: `1px solid ${sel ? '#BFDBFE' : 'transparent'}` }}>
                          <div style={{ width: 18, height: 18, borderRadius: 4, background: sel ? '#2563EB' : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {sel && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                          </div>
                          <MemberAvatar name={u.name} size={24} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{u.name}</p>
                            <p style={{ margin: 0, fontSize: 10, color: '#94A3B8' }}>
                              {u.showTeamInfo
                                ? `Current team: ${u.assignedTeams.join(', ')}`
                                : (u.department || u.email)}
                            </p>
                          </div>
                          <RoleBadge role={u.role} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
              Assign Projects ({form.projects.length} selected)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {projects.map(p => {
                const sel = form.projects.includes(p._id);
                return (
                  <button key={p._id} onClick={() => toggleProject(p._id)}
                    style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${sel ? '#2563EB' : '#E2E8F0'}`, background: sel ? '#EFF6FF' : '#fff', color: sel ? '#2563EB' : '#64748B', fontSize: 12, fontWeight: sel ? 700 : 500, cursor: 'pointer' }}>
                    {p.name}
                  </button>
                );
              })}
              {projects.length === 0 && <p style={{ fontSize: 12, color: '#94A3B8' }}>No projects available.</p>}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <Button variant="secondary" onClick={() => { setShowCreate(false); setEditingTeam(null); setForm(emptyForm); }}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.name}>{editingTeam ? 'Update Team' : 'Create Team'}</Button>
          </div>
        </div>
      </Modal>

      {/* ── Switch Member Modal ── */}
      <Modal open={!!switchModal} onClose={() => { setSwitchModal(null); setSwitchToTeam(''); }} title="Move Member to Another Team" size="sm">
        {switchModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <MemberAvatar name={switchModal.member.name} size={36} />
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{switchModal.member.name}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>Currently in: <strong>{switchModal.fromTeam.name}</strong></p>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Move to Team</label>
              <select value={switchToTeam} onChange={e => setSwitchToTeam(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                <option value="">Select target team…</option>
                {otherTeams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="secondary" onClick={() => { setSwitchModal(null); setSwitchToTeam(''); }}>Cancel</Button>
              <Button onClick={handleSwitchMember} loading={switching} disabled={!switchToTeam}>
                <ArrowRightLeft size={14} /> Move Member
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Change Team Lead Modal ── */}
      <Modal open={!!changeLeadModal} onClose={() => { setChangeLeadModal(null); setNewLeadId(''); }} title="Change Team Lead" size="sm">
        {changeLeadModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, padding: '12px 14px' }}>
              <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 700, color: '#065F46' }}>Team: {changeLeadModal.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#059669' }}>Current lead: {changeLeadModal.teamLead?.name || 'None'}</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Select New Team Lead</label>
              <select value={newLeadId} onChange={e => setNewLeadId(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                <option value="">Select employee…</option>
                {(() => {
                  const memberMap = new Map();
                  (changeLeadModal.members || []).forEach(m => {
                    const id = String(m._id || m || '');
                    if (!id) return;
                    memberMap.set(id, m.name ? { _id: id, name: m.name } : { _id: id, name: id });
                  });
                  const lead = changeLeadModal.teamLead;
                  const leadId = String(lead?._id || lead || '');
                  if (leadId) memberMap.set(leadId, { _id: leadId, name: lead?.name || leadId });
                  return Array.from(memberMap.values()).map(m => (
                    <option key={m._id} value={m._id}>{m.name} (team member)</option>
                  ));
                })()}
              </select>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: '#94A3B8' }}>Only current team members are eligible for team lead.</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="secondary" onClick={() => { setChangeLeadModal(null); setNewLeadId(''); }}>Cancel</Button>
              <Button onClick={handleChangeLead} loading={changingLead} disabled={!newLeadId || newLeadId === changeLeadModal.teamLead?._id}>
                <Diamond size={13} /> Change Lead
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal open={!!deleteConfirm} onClose={() => !deleting && setDeleteConfirm(null)} title="Delete Team" size="sm">
        {deleteConfirm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#991B1B' }}>Delete "{deleteConfirm.name}"?</p>
              <p style={{ margin: 0, fontSize: 12, color: '#B91C1C' }}>Members will no longer be associated with this team. This cannot be undone.</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setDeleteConfirm(null)} disabled={deleting}
                style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, border: 'none', background: '#DC2626', color: '#fff', fontSize: 13, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}>
                {deleting ? <Spinner size="xs" /> : <Trash2 size={13} />} {deleting ? 'Deleting…' : 'Delete Team'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Team Kanban Board Modal ── */}
      {kanbanTeam && (
        <TeamKanbanModal team={kanbanTeam} onClose={() => setKanbanTeam(null)} />
      )}

      {/* ── Live Team Dashboard Modal ── */}
      {dashboardTeam && (
        <TeamDashboardModal
          key={dashboardTeam._id}
          team={dashboardTeam}
          onClose={() => setDashboardTeam(null)}
          onAssignTask={canManage ? (team) => { setDashboardTeam(null); setAssignTaskTeam(team); } : null}
        />
      )}

      {/* ── Assign Task to Team Lead Modal ── */}
      {assignTaskTeam && (
        <AssignTaskModal team={assignTaskTeam} projects={projects}
          onClose={() => setAssignTaskTeam(null)} onSaved={loadData}
        />
      )}

      {/* ── Assign Project to Team Modal ── */}
      {assignProjectTeam && (
        <AssignProjectToTeamModal
          team={assignProjectTeam}
          projects={projects}
          onClose={() => setAssignProjectTeam(null)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}

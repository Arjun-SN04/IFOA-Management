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
  Star, Crown, Shield, LayoutGrid, Activity,
  CheckCircle2, Clock, AlertTriangle, Eye, RefreshCw,
  ArrowRight, X, CheckSquare, Circle
} from 'lucide-react';

const TEAM_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#0EA5E9', '#14B8A6',
  '#F97316', '#6366F1',
];

const ROLE_META = {
  admin:     { label: 'Admin',      color: '#7C3AED', bg: '#F5F3FF', icon: Crown },
  manager:   { label: 'Management', color: '#2563EB', bg: '#EFF6FF', icon: Shield },
  team_lead: { label: 'Team Lead',  color: '#059669', bg: '#ECFDF5', icon: Star },
  employee:  { label: 'User',       color: '#64748B', bg: '#F8FAFC', icon: Users },
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

// ── Live Team Dashboard Modal ─────────────────────────────────────────────────
function TeamDashboardModal({ team, onClose, onAssignTask, projects }) {
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

  useEffect(() => { load(); }, [load]);

  const STATUS_CONFIG = {
    backlog:      { label: 'Backlog',     color: '#94A3B8', bg: '#F8FAFC' },
    todo:         { label: 'To Do',       color: '#7C3AED', bg: '#F5F3FF' },
    'in-progress':{ label: 'In Progress', color: '#2563EB', bg: '#EFF6FF' },
    'in-review':  { label: 'In Review',   color: '#D97706', bg: '#FFFBEB' },
    done:         { label: 'Done',        color: '#059669', bg: '#ECFDF5' },
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
          {/* Header actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 999, background: team.color || '#3B82F6' }} />
              <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                {dashboard.team?.members?.length || 0} members · {dashboard.taskStats?.total || 0} tasks
              </span>
            </div>
            <button onClick={() => load(true)} disabled={refreshing}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          {/* Task Stats */}
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

          {/* Assign task to team lead button */}
          <div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#065F46' }}>Assign New Task to Team Lead</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#059669' }}>
                {dashboard.team?.teamLead?.name
                  ? `Tasks assigned to ${dashboard.team.teamLead.name} who will distribute to team members`
                  : 'No team lead assigned yet — assign a team lead first'}
              </p>
            </div>
            <button
              onClick={() => onAssignTask(dashboard.team)}
              disabled={!dashboard.team?.teamLead}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: dashboard.team?.teamLead ? '#059669' : '#D1FAE5', color: dashboard.team?.teamLead ? '#fff' : '#6EE7B7', fontSize: 13, fontWeight: 700, cursor: dashboard.team?.teamLead ? 'pointer' : 'not-allowed' }}>
              <Plus size={14} /> Assign Task to Team Lead
            </button>
          </div>

          {/* Per-member breakdown */}
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
                          {isLead && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>Team Lead</span>}
                        </div>
                        <p style={{ margin: '1px 0 0', fontSize: 11, color: '#94A3B8' }}>{ms.member?.department || ms.member?.email}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: '#94A3B8' }}>{ms.taskCount} task{ms.taskCount !== 1 ? 's' : ''}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: pct === 100 ? '#059669' : '#2563EB' }}>{pct}%</span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 5, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#059669' : '#3B82F6', borderRadius: 999, transition: 'width 0.5s' }} />
                    </div>
                    {/* Task chips */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {[
                        { key: 'todo',       label: 'To Do',  val: ms.todo,       color: '#7C3AED', bg: '#F5F3FF' },
                        { key: 'inProgress', label: 'Active', val: ms.inProgress, color: '#2563EB', bg: '#EFF6FF' },
                        { key: 'done',       label: 'Done',   val: ms.done,       color: '#059669', bg: '#ECFDF5' },
                        { key: 'overdue',    label: 'Overdue',val: ms.overdue,    color: '#DC2626', bg: '#FEF2F2' },
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

          {/* Recent tasks table */}
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

// ── Assign Task to Team Lead Modal ────────────────────────────────────────────
function AssignTaskModal({ team, projects, onClose, onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', type: 'task',
    project: '', dueDate: '', status: 'todo',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.title || !form.project) { toast.error('Title and project are required'); return; }
    setSaving(true);
    try {
      const leadId = team.teamLead?._id || team.teamLead;
      await taskAPI.create({
        ...form,
        assignee: leadId,
        team: team._id,
        reporter: user?.id || user?._id,
        assignedByRole: user?.role,
      });
      toast.success(`Task assigned to ${team.teamLead?.name || 'team lead'}`);
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to assign task');
    } finally { setSaving(false); }
  };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <Modal open={true} onClose={onClose} title={`Assign Task → ${team.name}`} size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Info banner */}
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, padding: '12px 14px' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#065F46' }}>Assigning to Team Lead: {team.teamLead?.name}</p>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: '#059669' }}>
            The team lead will receive this task and can assign subtasks to team members.
          </p>
        </div>

        {/* Task type */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Task Type</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { key: 'task',  label: 'Task',     color: '#0891b2', bg: '#ecfeff' },
              { key: 'bug',   label: 'Bug',      color: '#DC2626', bg: '#FEF2F2' },
              { key: 'story', label: 'Story',    color: '#2563EB', bg: '#EFF6FF' },
              { key: 'epic',  label: 'Epic',     color: '#7C3AED', bg: '#F5F3FF' },
            ].map(t => (
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
              {(team.projects || []).map(p => (
                <option key={p._id || p} value={p._id || p}>{p.name || p}</option>
              ))}
              {(!team.projects || team.projects.length === 0) && projects.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
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

// ── Team Card ─────────────────────────────────────────────────────────────────
function TeamCard({ team, onEdit, onDelete, onSwitchMember, onChangeLead, onViewDashboard, canManage }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const lead = team.teamLead;
  const members = (team.members || []).filter(m => String(m._id) !== String(lead?._id));

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 10px rgba(15,23,42,0.05)' }}>
      <div style={{ height: 4, background: team.color || '#3B82F6' }} />
      <div style={{ padding: '18px 20px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: (team.color || '#3B82F6') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Users size={16} style={{ color: team.color || '#3B82F6' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{team.name}</h3>
                {team.description && <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>{team.description}</p>}
              </div>
            </div>
          </div>
          {canManage && (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {/* View Board — opens task board filtered to this team */}
              <button
                onClick={() => navigate(`/tasks?team=${team._id}`)}
                style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #BFDBFE', background: '#EFF6FF', cursor: 'pointer', color: '#2563EB', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}>
                <LayoutGrid size={12} /> View Board
              </button>
              <button onClick={() => onChangeLead(team)} title="Change Team Lead"
                style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #A7F3D0', background: '#ECFDF5', cursor: 'pointer', color: '#059669', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}>
                <Star size={12} /> Lead
              </button>
              <button onClick={() => onEdit(team)}
                style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', color: '#64748B', display: 'flex' }}>
                <Edit2 size={13} />
              </button>
              <button onClick={() => onDelete(team)}
                style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #FCA5A5', background: '#FEF2F2', cursor: 'pointer', color: '#DC2626', display: 'flex' }}>
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Team lead */}
        {lead && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '10px 12px', borderRadius: 10, background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
            <Star size={13} style={{ color: '#059669', flexShrink: 0 }} />
            <MemberAvatar name={lead.name} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#065F46' }}>{lead.name}</p>
              <p style={{ margin: 0, fontSize: 10, color: '#059669' }}>Team Lead · {lead.email}</p>
            </div>
          </div>
        )}
        {!lead && (
          <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#92400E', fontWeight: 600 }}>⚠ No team lead assigned</p>
          </div>
        )}

        {/* Stats + expand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={12} style={{ color: '#64748B' }} />
            <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>{team.members?.length || 0} members</span>
          </div>
          {team.projects?.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Briefcase size={12} style={{ color: '#64748B' }} />
              <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>{team.projects.length} project{team.projects.length !== 1 ? 's' : ''}</span>
            </div>
          )}
          <button onClick={() => setExpanded(v => !v)}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {expanded ? 'Hide' : 'View'} members
          </button>
        </div>

        {/* Expanded members */}
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {members.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '10px 0' }}>No other members yet</p>
                ) : members.map(member => (
                  <div key={member._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <MemberAvatar name={member.name} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{member.name}</p>
                      <p style={{ margin: 0, fontSize: 10, color: '#94A3B8' }}>{member.department || member.email}</p>
                    </div>
                    <RoleBadge role={member.role} />
                    {canManage && (
                      <button onClick={() => onSwitchMember(member, team)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                        <ArrowRightLeft size={10} /> Move
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Projects */}
              {team.projects?.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Projects</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {team.projects.map(p => (
                      <span key={p._id} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function TeamsPage() {
  const { isManagerOrAdmin } = useAuth();
  const canManage = isManagerOrAdmin;

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

  // Dashboard state
  const [dashboardTeam, setDashboardTeam] = useState(null);
  const [assignTaskTeam, setAssignTaskTeam] = useState(null);

  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
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
      setTeams(tRes.data.teams || []);
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
        setTeams(prev => prev.map(t => t._id === editingTeam._id ? (res.data.team || res.data.data) : t));
        toast.success('Team updated!');
      } else {
        const res = await teamAPI.create(form);
        setTeams(prev => [res.data.team || res.data.data, ...prev]);
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
      name: team.name,
      description: team.description || '',
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
      setTeams(prev => prev.map(t => t._id === changeLeadModal._id ? updated : t));
      toast.success(`Team lead changed to ${updated.teamLead?.name}!`);
      setChangeLeadModal(null); setNewLeadId('');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to change team lead'); }
    finally { setChangingLead(false); }
  };

  const handleSwitchMember = async () => {
    if (!switchModal || !switchToTeam) return;
    setSwitching(true);
    try {
      await teamAPI.switchMember({
        userId: switchModal.member._id,
        fromTeamId: switchModal.fromTeam._id,
        toTeamId: switchToTeam,
      });
      toast.success(`${switchModal.member.name} moved to new team!`);
      setSwitchModal(null); setSwitchToTeam('');
      await loadData();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to switch member'); }
    finally { setSwitching(false); }
  };

  const toggleMember = (userId) => {
    setForm(f => ({
      ...f,
      members: f.members.includes(userId) ? f.members.filter(id => id !== userId) : [...f.members, userId],
    }));
  };

  const toggleProject = (projectId) => {
    setForm(f => ({
      ...f,
      projects: f.projects.includes(projectId) ? f.projects.filter(id => id !== projectId) : [...f.projects, projectId],
    }));
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12 }}>
      <Spinner size="lg" />
      <p style={{ fontSize: 13, color: '#94A3B8' }}>Loading teams…</p>
    </div>
  );

  const otherTeams = switchModal ? teams.filter(t => t._id !== switchModal.fromTeam._id) : teams;

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
          { label: 'Total Teams',  value: teams.length,                                             color: '#2563EB', bg: '#EFF6FF', icon: Users },
          { label: 'Team Leads',   value: eligibleUsers.filter(u => u.role === 'team_lead').length,  color: '#059669', bg: '#ECFDF5', icon: Star },
          { label: 'Employees',    value: eligibleUsers.filter(u => u.role === 'employee').length,   color: '#7C3AED', bg: '#F5F3FF', icon: UserCheck },
          { label: 'Projects',     value: projects.length,                                          color: '#F59E0B', bg: '#FFFBEB', icon: Briefcase },
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {teams.map(team => (
            <TeamCard key={team._id} team={team} canManage={canManage}
              onEdit={handleEdit}
              onDelete={setDeleteConfirm}
              onSwitchMember={(member, fromTeam) => { setSwitchModal({ member, fromTeam }); setSwitchToTeam(''); }}
              onChangeLead={(team) => { setChangeLeadModal(team); setNewLeadId(team.teamLead?._id || ''); }}
              onViewDashboard={(team) => setDashboardTeam(team)}
            />
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setEditingTeam(null); setForm(emptyForm); }} title={editingTeam ? `Edit Team: ${editingTeam.name}` : 'Create Team'} size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#1D4ED8', fontWeight: 600 }}>
              ℹ Only employees are shown in the dropdowns. Admins and managers cannot be added as team members.
            </p>
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
              {eligibleUsers.map(u => <option key={u._id} value={u._id}>{u.name} — {u.role === 'team_lead' ? 'Team Lead' : 'Employee'}</option>)}
            </select>
            {eligibleUsers.length === 0 && <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>No employees found. Create employee accounts first.</p>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
              Members ({form.members.length} selected) <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500, textTransform: 'none' }}>(employees only)</span>
            </label>
            {eligibleUsers.length === 0 ? (
              <p style={{ fontSize: 12, color: '#94A3B8', padding: '12px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>No employees available</p>
            ) : (
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 12, padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {eligibleUsers.map(u => {
                  const selected = form.members.includes(u._id);
                  return (
                    <div key={u._id} onClick={() => toggleMember(u._id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: selected ? '#EFF6FF' : '#fff', border: `1px solid ${selected ? '#BFDBFE' : 'transparent'}` }}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, background: selected ? '#2563EB' : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {selected && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                      </div>
                      <MemberAvatar name={u.name} size={24} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{u.name}</p>
                        <p style={{ margin: 0, fontSize: 10, color: '#94A3B8' }}>{u.department || u.email}</p>
                      </div>
                      <RoleBadge role={u.role} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
              Assign Projects ({form.projects.length} selected)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {projects.map(p => {
                const selected = form.projects.includes(p._id);
                return (
                  <button key={p._id} onClick={() => toggleProject(p._id)}
                    style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${selected ? '#2563EB' : '#E2E8F0'}`, background: selected ? '#EFF6FF' : '#fff', color: selected ? '#2563EB' : '#64748B', fontSize: 12, fontWeight: selected ? 700 : 500, cursor: 'pointer' }}>
                    {p.name}
                  </button>
                );
              })}
              {projects.length === 0 && <p style={{ fontSize: 12, color: '#94A3B8' }}>No projects available. Create projects first.</p>}
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
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                Select New Team Lead <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500, textTransform: 'none' }}>(employees only)</span>
              </label>
              <select value={newLeadId} onChange={e => setNewLeadId(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                <option value="">Select employee…</option>
                {(changeLeadModal.members || []).filter(m => m._id && m.name).map(m => (
                  <option key={m._id} value={m._id}>{m.name} (team member)</option>
                ))}
                {eligibleUsers.filter(u =>
                  !(changeLeadModal.members || []).some(m => String(m._id || m) === String(u._id))
                ).map(u => (
                  <option key={u._id} value={u._id}>{u.name} — {u.role === 'team_lead' ? 'Team Lead' : 'Employee'}</option>
                ))}
              </select>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: '#94A3B8' }}>The selected employee will be promoted to Team Lead role automatically.</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="secondary" onClick={() => { setChangeLeadModal(null); setNewLeadId(''); }}>Cancel</Button>
              <Button onClick={handleChangeLead} loading={changingLead} disabled={!newLeadId || newLeadId === changeLeadModal.teamLead?._id}>
                <Star size={13} /> Change Lead
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

      {/* ── Live Team Dashboard Modal ── */}
      {dashboardTeam && (
        <TeamDashboardModal
          team={dashboardTeam}
          projects={projects}
          onClose={() => setDashboardTeam(null)}
          onAssignTask={(team) => { setDashboardTeam(null); setAssignTaskTeam(team); }}
        />
      )}

      {/* ── Assign Task to Team Lead Modal ── */}
      {assignTaskTeam && (
        <AssignTaskModal
          team={assignTaskTeam}
          projects={projects}
          onClose={() => setAssignTaskTeam(null)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}

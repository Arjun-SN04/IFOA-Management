import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { projectAPI, userAPI, teamAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Textarea, Select, Badge, Empty, Spinner, PageHeader } from '../../components/ui';
import { Plus, FolderKanban, Users, CalendarDays, UsersRound, Trash2 } from 'lucide-react';

export default function ProjectsPage() {
  const { isManagerOrAdmin, isHROrAbove, isHR, user: me } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  // HR + Manager + Admin can delete projects
  const canDelete = isHROrAbove;

  // Form: manager/admin assigns teams — lead is always themselves (the manager)
  const [form, setForm] = useState({
    name: '', key: '', description: '',
    status: 'planning', priority: 'medium', category: 'software',
    startDate: '', endDate: '',
    teams: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      projectAPI.getAll(),
      teamAPI.getAll().catch(() => ({ data: { teams: [] } })),
    ]).then(([pRes, tRes]) => {
      setProjects(pRes.data.projects || pRes.data.data || []);
      setTeams(tRes.data.teams || []);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.status === filter;
    return matchSearch && matchFilter;
  });

  const handleCreate = async () => {
    if (!form.name) { alert('Project name is required'); return; }
    if (form.teams.length === 0) { alert('Please assign at least one team to this project'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        lead: me?.id || me?._id,
      };
      const res = await projectAPI.create(payload);
      const createdProject = res.data.data || res.data.project;
      setProjects(p => [createdProject, ...p]);
      setShowCreate(false);
      setForm({ name: '', key: '', description: '', status: 'planning', priority: 'medium', category: 'software', startDate: '', endDate: '', teams: [] });
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to create project');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await projectAPI.archive(deleteConfirm._id);
      setProjects(prev => prev.filter(p => p._id !== deleteConfirm._id));
      toast.success(`Project "${deleteConfirm.name}" deleted`);
      setDeleteConfirm(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete project');
    } finally { setDeleting(false); }
  };

  const autoKey = (name) =>
    name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 6) + (Date.now() % 1000);

  const set = k => e => {
    const val = e.target.value;
    setForm(p => {
      const next = { ...p, [k]: val };
      if (k === 'name') next.key = autoKey(val);
      return next;
    });
  };

  const toggleTeam = (id) => {
    setForm(prev => ({
      ...prev,
      teams: (prev.teams || []).includes(id)
        ? (prev.teams || []).filter(t => t !== id)
        : [...(prev.teams || []), id],
    }));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      {/* ── Hero Header ── */}
      <section style={{ padding: '8px 2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B' }}>Workspace</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 30, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
            Your <span style={{ color: '#2563EB' }}>Projects</span>
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: '#64748B' }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''} in your workspace
          </p>
        </div>
        {isManagerOrAdmin && (
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowCreate(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 12,
              background: '#2563EB', color: '#fff',
              border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
            }}
          >
            <Plus className="w-4 h-4" /> New Project
          </motion.button>
        )}
      </section>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <input
          placeholder="Search projects…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '10px 16px', fontSize: 13, border: '1px solid #E2E8F0', borderRadius: 10, outline: 'none', background: '#fff', color: '#0F172A' }}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['all', 'planning', 'active', 'completed', 'on-hold'].map((s, idx) => (
            <motion.button key={s} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.04 }}
              onClick={() => setFilter(s)}
              style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1px solid', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap', background: filter === s ? '#2563EB' : '#fff', color: filter === s ? '#fff' : '#475569', borderColor: filter === s ? '#2563EB' : '#E2E8F0', boxShadow: filter === s ? '0 2px 8px rgba(37,99,235,0.25)' : 'none' }}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Grid */}
      {filtered.length === 0
        ? <Empty icon={FolderKanban} title="No projects found" description={search ? "Try a different search term" : "Create your first project to get started"} action={isManagerOrAdmin && <Button onClick={() => setShowCreate(true)}>Create Project</Button>} />
        : <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((p, idx) => (
              <motion.div key={p._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: idx * 0.05 }}>
                <ProjectCard
                  project={p}
                  onClick={() => navigate(`/projects/${p._id}`)}
                  canDelete={canDelete}
                  onDelete={(e) => { e.stopPropagation(); setDeleteConfirm(p); }}
                />
              </motion.div>
            ))}
          </motion.div>
      }

      {/* ── Delete Confirm Modal ── */}
      <Modal open={!!deleteConfirm} onClose={() => !deleting && setDeleteConfirm(null)} title="Delete Project" size="sm">
        {deleteConfirm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#991B1B' }}>
                Delete "{deleteConfirm.name}"?
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#B91C1C' }}>
                This will permanently remove the project and all its associated data. This cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, border: 'none', background: '#DC2626', color: '#fff', fontSize: 13, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}>
                {deleting ? <Spinner size="xs" /> : <Trash2 size={13} />}
                {deleting ? 'Deleting…' : 'Delete Project'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Create Project Modal ── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Project" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Project Name" value={form.name} onChange={set('name')} placeholder="e.g. Q3 Platform Redesign" required />
            <Input label="Project Key" value={form.key} onChange={set('key')} placeholder="Auto-generated" />
          </div>
          <Textarea label="Description" value={form.description} onChange={set('description')} placeholder="What is this project about?" rows={3} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
                Assign Teams <span style={{ color: '#EF4444' }}>*</span>
              </p>
              {(form.teams || []).length > 0 && (
                <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                  {form.teams.length} team{form.teams.length !== 1 ? 's' : ''} selected
                </span>
              )}
            </div>
            {teams.length === 0 ? (
              <div style={{ padding: '16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#92400E', fontWeight: 600 }}>⚠ No teams available</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#B45309' }}>
                  Create teams first in the <strong>Teams &amp; Boards</strong> section before creating a project.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 12, padding: 10 }}>
                {teams.map(team => {
                  const selected = (form.teams || []).includes(team._id);
                  const memberCount = team.members?.length || 0;
                  return (
                    <div key={team._id} onClick={() => toggleTeam(team._id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, cursor: 'pointer', background: selected ? '#EFF6FF' : '#F8FAFC', border: `1.5px solid ${selected ? '#2563EB' : '#E2E8F0'}`, transition: 'all 0.15s' }}>
                      <div style={{ width: 12, height: 12, borderRadius: 999, background: team.color || '#3B82F6', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: selected ? '#1D4ED8' : '#0F172A' }}>{team.name}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748B' }}>
                          {memberCount} member{memberCount !== 1 ? 's' : ''}
                          {team.teamLead?.name ? ` · Lead: ${team.teamLead.name}` : ' · No lead set'}
                        </p>
                      </div>
                      <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${selected ? '#2563EB' : '#D1D5DB'}`, background: selected ? '#2563EB' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                        {selected && <span style={{ color: '#fff', fontSize: 12, fontWeight: 900 }}>✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
              All team members will automatically be added to this project. The project will appear in their board.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Select label="Status" value={form.status} onChange={set('status')}>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on-hold">On Hold</option>
            </Select>
            <Select label="Priority" value={form.priority} onChange={set('priority')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
            <Select label="Category" value={form.category} onChange={set('category')}>
              <option value="software">Software</option>
              <option value="marketing">Marketing</option>
              <option value="operations">Operations</option>
              <option value="hr">HR</option>
              <option value="finance">Finance</option>
              <option value="other">Other</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={form.startDate} onChange={set('startDate')} />
            <Input label="End Date" type="date" value={form.endDate} onChange={set('endDate')} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving} disabled={!form.name || form.teams.length === 0}>
              Create Project
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────
const PROJECT_STATUS_CONFIG = {
  'planning':    { color: '#8B5CF6', bg: '#F5F3FF', label: 'Planning',    border: '#DDD6FE' },
  'active':      { color: '#2563EB', bg: '#EFF6FF', label: 'Active',       border: '#BFDBFE' },
  'on-hold':     { color: '#D97706', bg: '#FFFBEB', label: 'On Hold',      border: '#FDE68A' },
  'completed':   { color: '#059669', bg: '#ECFDF5', label: 'Completed',    border: '#A7F3D0' },
  'cancelled':   { color: '#DC2626', bg: '#FEF2F2', label: 'Cancelled',    border: '#FECACA' },
};
const PROJECT_PRIORITY_CONFIG = {
  low:      { color: '#16A34A', bg: '#F0FDF4', label: 'Low',      icon: '↓' },
  medium:   { color: '#D97706', bg: '#FFFBEB', label: 'Medium',   icon: '−' },
  high:     { color: '#EA580C', bg: '#FFF7ED', label: 'High',     icon: '↑' },
  critical: { color: '#DC2626', bg: '#FEF2F2', label: 'Critical', icon: '↑↑' },
};

function ProjectCard({ project: p, onClick, canDelete, onDelete }) {
  const progress = p.progress ?? 0;
  const memberCount = p.members?.length || 0;
  const teamCount = p.teams?.length || 0;
  const sc = PROJECT_STATUS_CONFIG[p.status] || PROJECT_STATUS_CONFIG['active'];
  const pc = PROJECT_PRIORITY_CONFIG[p.priority] || PROJECT_PRIORITY_CONFIG['medium'];

  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: '0 16px 40px rgba(15,23,42,0.12)' }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      onClick={onClick}
      style={{
        background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0',
        padding: '18px 20px 16px',
        cursor: 'pointer', boxShadow: '0 2px 10px rgba(15,23,42,0.06)',
        display: 'flex', flexDirection: 'column', gap: 14, height: '100%',
        position: 'relative',
      }}
    >
      {/* Delete button — shown to HR + Manager + Admin */}
      {canDelete && (
        <button
          onClick={onDelete}
          title="Delete project"
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 28, height: 28, borderRadius: 8,
            border: '1px solid #FCA5A5', background: '#FEF2F2',
            color: '#DC2626', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', zIndex: 2,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#DC2626'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; }}
        >
          <Trash2 size={12} />
        </button>
      )}

      {/* Status + priority badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingRight: canDelete ? 36 : 0 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {sc.label}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, background: pc.bg, color: pc.color, fontSize: 10, fontWeight: 700 }}>
          {pc.label}
        </span>
      </div>

      {/* Name + description */}
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>{p.name}</h3>
        <p style={{ margin: 0, fontSize: 12, color: '#64748B', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {p.description || 'No description provided.'}
        </p>
      </div>

      {/* Progress */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>Progress</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: progress === 100 ? '#059669' : '#2563EB' }}>{progress}%</span>
        </div>
        <div style={{ height: 6, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.9, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: 999, background: progress === 100 ? 'linear-gradient(90deg, #059669, #34D399)' : 'linear-gradient(90deg, #2563EB, #60A5FA)' }} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Users size={12} style={{ color: '#94A3B8' }} />
            <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>{memberCount}</span>
          </div>
          {teamCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <UsersRound size={12} style={{ color: '#94A3B8' }} />
              <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>{teamCount} team{teamCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        {p.endDate && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94A3B8' }}>
            <CalendarDays size={11} />
            {new Date(p.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </motion.div>
  );
}

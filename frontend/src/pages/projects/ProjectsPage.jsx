import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { projectAPI, userAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Textarea, Select, Badge, Empty, Spinner, PageHeader } from '../../components/ui';
import { Plus, FolderKanban, Sparkles, Users, CalendarDays } from 'lucide-react';

const STATUS_COLORS = {
  planning:    'default',
  'in-progress': 'primary',
  completed:   'success',
  'on-hold':   'warning',
  cancelled:   'danger',
};

export default function ProjectsPage() {
  const { isManagerOrAdmin, user: me } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ name: '', key: '', description: '', status: 'planning', priority: 'medium', lead: '', startDate: '', endDate: '', category: 'software', members: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([projectAPI.getAll(), userAPI.getAll().catch(() => ({ data: { data: [] } }))]).then(([pRes, uRes]) => {
      setProjects(pRes.data.projects || pRes.data.data || []);
      setUsers(uRes.data.users || uRes.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.status === filter;
    return matchSearch && matchFilter;
  });

  const handleCreate = async () => {
    setSaving(true);
    try {
      const leadId = form.lead || me?.id || me?._id;
      const memberIds = [...new Set([...(form.members || []), leadId].filter(Boolean))];
      const payload = { ...form, lead: leadId, members: memberIds };
      const res = await projectAPI.create(payload);
      setProjects(p => [res.data.data || res.data.project, ...p]);
      setShowCreate(false);
      setForm({ name: '', key: '', description: '', status: 'planning', priority: 'medium', lead: '', startDate: '', endDate: '', category: 'software', members: [] });
    } catch (e) { alert(e.response?.data?.message || 'Failed to create project'); }
    finally { setSaving(false); }
  };

  const autoKey = (name) => name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 6) + (Date.now() % 1000);

  const set = k => e => {
    const val = e.target.value;
    setForm(p => {
      const next = { ...p, [k]: val };
      // Auto-generate key from name
      if (k === 'name') next.key = autoKey(val);
      return next;
    });
  };

  const toggleMember = (id, checked) => {
    setForm((prev) => {
      if (checked) return { ...prev, members: [...new Set([...(prev.members || []), id])] };
      return { ...prev, members: (prev.members || []).filter((m) => m !== id) };
    });
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
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <input
          placeholder="Search projects…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 200, padding: '10px 16px', fontSize: 13,
            border: '1px solid #E2E8F0', borderRadius: 10, outline: 'none',
            background: '#fff', color: '#0F172A',
          }}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['all', 'planning', 'in-progress', 'completed', 'on-hold'].map((s, idx) => (
            <motion.button
              key={s}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.04 }}
              onClick={() => setFilter(s)}
              style={{
                padding: '8px 16px', fontSize: 12, fontWeight: 600,
                borderRadius: 8, border: '1px solid',
                cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                background: filter === s ? '#2563EB' : '#fff',
                color: filter === s ? '#fff' : '#475569',
                borderColor: filter === s ? '#2563EB' : '#E2E8F0',
                boxShadow: filter === s ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
              }}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Grid */}
      {filtered.length === 0
        ? <Empty icon={FolderKanban} title="No projects found" description={search ? "Try a different search term" : "Create your first project to get started"} action={isManagerOrAdmin && <Button onClick={() => setShowCreate(true)}>Create Project</Button>} />
        : <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((p, idx) => (
              <motion.div
                key={p._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}>
                <ProjectCard project={p} onClick={() => navigate(`/projects/${p._id}`)} />
              </motion.div>
            ))}
          </motion.div>
      }

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Project" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Project Name" value={form.name} onChange={set('name')} placeholder="e.g. Q3 Platform Redesign" required />
            <Input label="Project Key" value={form.key} onChange={set('key')} placeholder="Auto-generated" />
          </div>
          <Textarea label="Description" value={form.description} onChange={set('description')} placeholder="What is this project about?" rows={3} />
          <Select label="Project Lead" value={form.lead} onChange={set('lead')}>
            <option value="">Select a lead (defaults to you)</option>
            {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
          </Select>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Initial Members</p>
            <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg bg-white p-2">
              {users.length === 0 && <p className="text-xs text-slate-400 p-2">No users available</p>}
              {users.map((u) => (
                <label key={u._id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(form.members || []).includes(u._id)}
                    onChange={(e) => toggleMember(u._id, e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">{u.name}</span>
                  <span className="text-xs text-slate-400">{u.department || u.role}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">Admin/manager and selected lead can add or remove members later.</p>
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
            <Button onClick={handleCreate} loading={saving} disabled={!form.name}>Create Project</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


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

function ProjectCard({ project: p, onClick }) {
  const progress = p.progress ?? 0;
  const memberCount = p.members?.length || 0;
  const leadName = p.lead?.name || '—';
  const sc = PROJECT_STATUS_CONFIG[p.status] || PROJECT_STATUS_CONFIG['active'];
  const pc = PROJECT_PRIORITY_CONFIG[p.priority] || PROJECT_PRIORITY_CONFIG['medium'];

  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: '0 16px 40px rgba(15,23,42,0.12)' }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 18,
        border: '1px solid #E2E8F0',
        borderTop: `3px solid ${sc.color}`,
        padding: '18px 20px 16px',
        cursor: 'pointer',
        boxShadow: '0 2px 10px rgba(15,23,42,0.06)',
        display: 'flex', flexDirection: 'column', gap: 14,
        transition: 'border-color 0.2s',
        height: '100%',
      }}
    >
      {/* Top row: status + priority badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 999,
          background: sc.bg, color: sc.color,
          border: `1px solid ${sc.border}`,
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em'
        }}>
          {sc.label}
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 10px', borderRadius: 999,
          background: pc.bg, color: pc.color,
          fontSize: 10, fontWeight: 700,
        }}>
          {pc.label}
        </span>
      </div>

      {/* Project name + description */}
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
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            style={{
              height: '100%', borderRadius: 999,
              background: progress === 100
                ? 'linear-gradient(90deg, #059669, #34D399)'
                : 'linear-gradient(90deg, #2563EB, #60A5FA)',
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users size={12} style={{ color: '#94A3B8' }} />
          <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {p.endDate && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94A3B8' }}>
              <CalendarDays size={11} />
              {new Date(p.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {leadName}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

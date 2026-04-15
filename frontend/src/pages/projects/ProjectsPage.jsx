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
      setProjects(pRes.data.data || []);
      setUsers(uRes.data.data || []);
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
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} project${projects.length !== 1 ? 's' : ''} in your workspace`}
        actions={isManagerOrAdmin && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        )}
      />

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3 p-4 bg-linear-to-r from-blue-50 to-slate-50 rounded-xl border border-blue-100/50">
        <input
          placeholder="Search projects…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
        />
        <div className="flex gap-2 flex-wrap">
          {['all', 'planning', 'in-progress', 'completed', 'on-hold'].map((s, idx) => (
            <motion.button
              key={s}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 whitespace-nowrap
                ${filter === s
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}>
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

function ProjectCard({ project: p, onClick }) {
  const progress = p.progress ?? 0;
  const memberCount = p.members?.length || 0;
  const leadName = p.lead?.name || '—';

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
      <Card onClick={onClick} className="p-6 group h-full cursor-pointer border-slate-200 hover:border-blue-200 hover:shadow-xl transition-all">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant={STATUS_COLORS[p.status] || 'default'}>{p.status?.replace('-', ' ')}</Badge>
              <Badge variant={p.priority === 'critical' || p.priority === 'high' ? 'danger' : 'warning'}>{p.priority}</Badge>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-700 transition-colors truncate">{p.name}</h3>
          </div>
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
        </div>

        <p className="text-sm text-slate-600 line-clamp-2 mb-5 min-h-10">{p.description || 'No description provided.'}</p>

        <div className="mb-5">
          <div className="flex justify-between text-xs font-medium text-slate-600 mb-2">
            <span>Progress</span>
            <span className={`${progress === 100 ? 'text-emerald-600' : 'text-blue-600'} font-bold`}>{progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {memberCount} members</span>
            <span className="truncate max-w-40">Lead: {leadName}</span>
          </div>
          {p.endDate && (
            <div className="text-xs text-slate-500 inline-flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              Due {new Date(p.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { projectAPI, userAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Textarea, Select, Badge, Avatar, Empty, Spinner, PageHeader } from '../../components/ui';
import { Plus, FolderKanban } from 'lucide-react';

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
      const payload = { ...form, lead: form.lead || me?.id || me?._id };
      const res = await projectAPI.create(payload);
      setProjects(p => [res.data.data, ...p]);
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
        className="flex flex-col sm:flex-row gap-3 p-4 bg-gradient-to-r from-blue-50 to-slate-50 rounded-xl border border-blue-100/50">
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

  return (
    <motion.div
      whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(37, 99, 235, 0.15)' }}
      transition={{ duration: 0.3, ease: 'easeOut' }}>
      <Card onClick={onClick} className="p-6 group h-full cursor-pointer bg-gradient-to-br from-white to-slate-50 border-slate-100 hover:border-blue-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={STATUS_COLORS[p.status] || 'default'}>{p.status?.replace('-', ' ')}</Badge>
              {p.priority === 'high' || p.priority === 'critical'
                ? <Badge variant="danger">{p.priority}</Badge>
                : null
              }
            </div>
            <motion.h3
              className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate"
              whileHover={{ scale: 1.02 }}>
              {p.name}
            </motion.h3>
          </div>
        </div>

        {p.description && (
          <motion.p
            initial={{ opacity: 0.7 }}
            whileHover={{ opacity: 1 }}
            className="text-sm text-slate-600 line-clamp-2 mb-5 transition-all duration-300">
            {p.description}
          </motion.p>
        )}

        {/* Progress */}
        <div className="mb-5">
          <div className="flex justify-between text-xs font-medium text-slate-600 mb-2">
            <span>Progress</span>
            <motion.span
              initial={{ scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              className={`${progress === 100 ? 'text-emerald-600' : 'text-blue-600'}`}>
              {progress}%
            </motion.span>
          </div>
          <motion.div
            className="h-2 bg-slate-100 rounded-full overflow-hidden"
            whileHover={{ boxShadow: '0 0 8px rgba(37, 99, 235, 0.2)' }}>
            <motion.div
              className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ delay: 0.2, duration: 0.8 }}
            />
          </motion.div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex -space-x-1.5">
            {p.members?.slice(0, 4).map((m, i) => (
              <Avatar key={i} name={m.user?.name || m.name || '?'} size="xs"
                className="ring-2 ring-white" />
            ))}
            {memberCount > 4 && (
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="w-6 h-6 rounded-full bg-slate-200 ring-2 ring-white flex items-center justify-center text-xs text-slate-600 font-medium">
                +{memberCount - 4}
              </motion.div>
            )}
          </div>
          {p.endDate && (
            <motion.span
              initial={{ opacity: 0.6 }}
              whileHover={{ opacity: 1 }}
              className="text-xs text-slate-500 font-medium">
              Due {new Date(p.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </motion.span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

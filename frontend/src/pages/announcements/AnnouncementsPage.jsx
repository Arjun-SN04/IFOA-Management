import { useState, useEffect } from 'react';
import { announcementAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Textarea, Badge, Empty, Spinner, PageHeader, Avatar } from '../../components/ui';
import { Plus, Megaphone, Pin, Trash2, Clock } from 'lucide-react';

export default function AnnouncementsPage() {
  const { isManagerOrAdmin, user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', priority: 'normal' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    announcementAPI.getAll()
      .then(res => setItems(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await announcementAPI.create(form);
      setItems(p => [res.data.data, ...p]);
      setShowCreate(false);
      setForm({ title: '', content: '', priority: 'normal' });
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handlePin = async (id) => {
    try {
      const res = await announcementAPI.togglePin(id);
      setItems(prev => prev.map(a => a._id === id ? (res.data.data || { ...a, isPinned: !a.isPinned }) : a));
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await announcementAPI.delete(id);
      setItems(prev => prev.filter(a => a._id !== id));
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
  };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  const pinned = items.filter(a => a.isPinned);
  const regular = items.filter(a => !a.isPinned);

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="Announcements"
        subtitle="View and manage team announcements"
        actions={isManagerOrAdmin && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            New Announcement
          </Button>
        )}
      />

      {items.length === 0
        ? <Empty icon={Megaphone} title="No announcements" description="Post an announcement to keep your team informed" />
        : <div className="space-y-4">
            {/* Pinned */}
            {pinned.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Pin className="w-3 h-3" /> Pinned
                </p>
                {pinned.map(a => <AnnouncementCard key={a._id} item={a} onPin={handlePin} onDelete={handleDelete} isAdmin={isManagerOrAdmin} />)}
              </div>
            )}
            {/* Regular */}
            {regular.map(a => <AnnouncementCard key={a._id} item={a} onPin={handlePin} onDelete={handleDelete} isAdmin={isManagerOrAdmin} />)}
          </div>
      }

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Post Announcement">
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={set('title')} placeholder="Announcement title" required />
          <Textarea label="Content" value={form.content} onChange={set('content')} placeholder="Write your announcement…" rows={4} />
          <select value={form.priority} onChange={set('priority')}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
            <option value="normal">Normal Priority</option>
            <option value="important">Important</option>
            <option value="urgent">Urgent</option>
          </select>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving} disabled={!form.title || !form.content}>Publish</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function AnnouncementCard({ item, onPin, onDelete, isAdmin }) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Megaphone className="w-4 h-4 text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
            {item.priority === 'urgent' && <Badge variant="danger">Urgent</Badge>}
            {item.priority === 'important' && <Badge variant="warning">Important</Badge>}
            {item.isPinned && <Pin className="w-3 h-3 text-slate-400" />}
          </div>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{item.content}</p>
          <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            {item.author?.name && <span>by {item.author.name}</span>}
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="xs" onClick={() => onPin(item._id)} title={item.isPinned ? 'Unpin' : 'Pin'}>
              <Pin className={`w-3.5 h-3.5 ${item.isPinned ? 'text-slate-900' : 'text-slate-400'}`} />
            </Button>
            <Button variant="ghost" size="xs" onClick={() => onDelete(item._id)}>
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

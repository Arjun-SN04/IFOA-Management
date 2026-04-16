import { useState, useEffect } from 'react';
import { announcementAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Modal, Input, Textarea } from '../../components/ui';
import { Plus, Megaphone, Pin, Trash2, Clock, AlertTriangle, Zap, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from '../../components/ui';

const B = {
  blue: '#2563EB', blueBg: '#EFF6FF', blueBorder: '#BFDBFE',
  black: '#0F172A', blackMid: '#1E293B',
  slate: '#475569', slateMid: '#64748B', slateLight: '#94A3B8',
  border: '#E2E8F0', surface: '#FFFFFF', surfaceAlt: '#F8FAFC',
  red: '#DC2626', redBg: '#FEF2F2',
  amber: '#D97706', amberBg: '#FFFBEB', amberBorder: '#FDE68A',
};

const PRIORITY_CONFIG = {
  urgent:    { color: B.red,   bg: B.redBg,   label: 'Urgent',    icon: Zap,           border: '#FECACA' },
  important: { color: B.amber, bg: B.amberBg, label: 'Important', icon: AlertTriangle,  border: B.amberBorder },
  normal:    { color: B.slateMid, bg: B.surfaceAlt, label: 'Normal', icon: Megaphone,  border: B.border },
};

export default function AnnouncementsPage() {
  const { isManagerOrAdmin } = useAuth();
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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
      <Spinner size="lg" />
    </div>
  );

  const pinned = items.filter(a => a.isPinned);
  const regular = items.filter(a => !a.isPinned);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* ── Header ── */}
      <section style={{ padding: '8px 2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: B.slateMid }}>
            Team Updates
          </p>
          <h1 style={{ margin: '4px 0 0', fontSize: 30, fontWeight: 800, color: B.black, lineHeight: 1.1 }}>
            Announcements
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: B.slateMid }}>
            Keep your team informed with the latest updates.
          </p>
        </div>
        {isManagerOrAdmin && (
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowCreate(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 12,
              background: B.blue, color: '#fff',
              border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
            }}
          >
            <Plus size={15} /> New Announcement
          </motion.button>
        )}
      </section>

      {/* ── Count row ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: items.length, color: B.blue, bg: B.blueBg },
          { label: 'Pinned', value: pinned.length, color: '#D97706', bg: '#FFFBEB' },
          { label: 'Urgent', value: items.filter(a => a.priority === 'urgent').length, color: '#DC2626', bg: '#FEF2F2' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            style={{ background: s.bg, borderRadius: 12, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.label}</span>
          </motion.div>
        ))}
      </div>

      {/* ── Content ── */}
      {items.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0', padding: '60px 24px', textAlign: 'center' }}>
          <Megaphone size={40} style={{ color: '#CBD5E1', margin: '0 auto 12px' }} />
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#475569' }}>No announcements yet</p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#94A3B8' }}>Post an announcement to keep your team informed</p>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Pinned */}
          {pinned.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Pin size={13} style={{ color: '#D97706' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Pinned
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pinned.map((a, i) => (
                  <motion.div key={a._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                    <AnnouncementCard item={a} onPin={handlePin} onDelete={handleDelete} isAdmin={isManagerOrAdmin} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          {/* Regular */}
          {regular.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {regular.map((a, i) => (
                <motion.div key={a._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <AnnouncementCard item={a} onPin={handlePin} onDelete={handleDelete} isAdmin={isManagerOrAdmin} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Post Announcement">
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={set('title')} placeholder="Announcement title" required />
          <Textarea label="Content" value={form.content} onChange={set('content')} placeholder="Write your announcement…" rows={4} />
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>Priority</label>
            <select value={form.priority} onChange={set('priority')}
              style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid #E2E8F0', borderRadius: 10, outline: 'none', background: '#fff' }}>
              <option value="normal">Normal Priority</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving} disabled={!form.title || !form.content}>Publish</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function AnnouncementCard({ item, onPin, onDelete, isAdmin }) {
  const pc = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.normal;
  const PIcon = pc.icon;
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 28px rgba(15,23,42,0.09)' }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        background: '#fff',
        borderRadius: 18,
        border: `1px solid ${B.border}`,
        borderLeft: `4px solid ${pc.color}`,
        padding: '18px 20px',
        boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
        transition: 'box-shadow 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: pc.bg, border: `1px solid ${pc.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <PIcon size={18} style={{ color: pc.color }} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: B.black }}>{item.title}</h3>
            {item.priority !== 'normal' && (
              <span style={{
                padding: '2px 8px', borderRadius: 999,
                background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`,
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              }}>{pc.label}</span>
            )}
            {item.isPinned && (
              <span style={{ fontSize: 10, color: '#D97706', background: '#FFFBEB', padding: '2px 7px', borderRadius: 999, border: '1px solid #FDE68A', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Pin size={9} /> Pinned
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: B.slate, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.content}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: B.slateLight }}>
              <Clock size={11} />
              {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            {item.author?.name && (
              <span style={{ fontSize: 11, color: B.slateLight }}>by {item.author.name}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        {isAdmin && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: hovered ? 1 : 0.4, x: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
            >
              <motion.button whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
                onClick={() => onPin(item._id)}
                title={item.isPinned ? 'Unpin' : 'Pin'}
                style={{
                  width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0',
                  background: item.isPinned ? '#FFFBEB' : '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                <Pin size={13} style={{ color: item.isPinned ? '#D97706' : '#94A3B8' }} />
              </motion.button>
              <motion.button whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
                onClick={() => onDelete(item._id)}
                style={{
                  width: 30, height: 30, borderRadius: 8, border: '1px solid #FECACA',
                  background: '#FEF2F2', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                <Trash2 size={13} style={{ color: '#DC2626' }} />
              </motion.button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

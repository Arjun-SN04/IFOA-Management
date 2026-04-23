import { useState, useEffect } from 'react';
import { announcementAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Modal, Input, Textarea } from '../../components/ui';
import {
  Plus, Megaphone, Pin, Trash2, Clock, AlertTriangle,
  Zap, Users, Globe, UserCheck, Calendar,
} from 'lucide-react';
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
  urgent:    { color: B.red,      bg: B.redBg,      label: 'Urgent',    icon: Zap,           border: '#FECACA' },
  important: { color: B.amber,    bg: B.amberBg,    label: 'Important', icon: AlertTriangle,  border: B.amberBorder },
  normal:    { color: B.slateMid, bg: B.surfaceAlt, label: 'Normal',    icon: Megaphone,     border: B.border },
};

const AUDIENCE_OPTIONS = [
  { value: 'all',       label: 'Everyone',        icon: Globe,     desc: 'All employees, team leads & managers' },
  { value: 'employees', label: 'Employees Only',  icon: Users,     desc: 'Only employees and team leads' },
  { value: 'managers',  label: 'Management Only', icon: UserCheck, desc: 'Managers, HR, and admin only' },
];

const EMPTY_FORM = { title: '', content: '', priority: 'normal', audience: 'all', expiresAt: '', scheduledFor: '' };

// Helper: format a date with time (e.g. "Apr 23, 2026 · 3:45 PM")
const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

// Helper: format date only (e.g. "Apr 23")
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function AnnouncementsPage() {
  const { isHROrAbove, user } = useAuth();
  const myId = String(user?._id || user?.id || '');

  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    announcementAPI.getAll()
      .then(res => setItems(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.expiresAt)    delete payload.expiresAt;
      if (!payload.scheduledFor) delete payload.scheduledFor;
      const res = await announcementAPI.create(payload);
      setItems(p => [res.data.data, ...p]);
      setShowCreate(false);
      setForm(EMPTY_FORM);
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handlePin = async (id) => {
    try {
      const res = await announcementAPI.togglePin(id);
      setItems(prev => prev.map(a => a._id === id ? (res.data.data || { ...a, isPinned: !a.isPinned }) : a));
    } catch (e) { alert(e.response?.data?.message || 'Not allowed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await announcementAPI.delete(id);
      setItems(prev => prev.filter(a => a._id !== id));
    } catch (e) { alert(e.response?.data?.message || 'Not allowed'); }
  };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
      <Spinner size="lg" />
    </div>
  );

  const published = items.filter(a => a.isPublished !== false);
  const scheduled = items.filter(a => a.isPublished === false);
  const pinned    = published.filter(a => a.isPinned);
  const regular   = published.filter(a => !a.isPinned);

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
        {isHROrAbove && (
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
          { label: 'Total',     value: published.length,                                      color: B.blue,    bg: B.blueBg   },
          { label: 'Pinned',    value: pinned.length,                                         color: '#D97706', bg: '#FFFBEB'  },
          { label: 'Urgent',    value: published.filter(a => a.priority === 'urgent').length,  color: '#DC2626', bg: '#FEF2F2'  },
          ...(isHROrAbove && scheduled.length > 0
            ? [{ label: 'Scheduled', value: scheduled.length, color: '#7C3AED', bg: '#F5F3FF' }]
            : []),
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            style={{ background: s.bg, borderRadius: 12, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.label}</span>
          </motion.div>
        ))}
      </div>

      {/* ── Scheduled drafts (only visible to HR+) ── */}
      {isHROrAbove && scheduled.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Calendar size={13} style={{ color: '#7C3AED' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Scheduled (your drafts)
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {scheduled.map((a, i) => (
              <motion.div key={a._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <AnnouncementCard item={a} onPin={handlePin} onDelete={handleDelete} myId={myId} isAdmin={user?.role === 'admin'} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Published announcements ── */}
      {published.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0', padding: '60px 24px', textAlign: 'center' }}>
          <Megaphone size={40} style={{ color: '#CBD5E1', margin: '0 auto 12px' }} />
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#475569' }}>No announcements yet</p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#94A3B8' }}>Post an announcement to keep your team informed</p>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {pinned.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Pin size={13} style={{ color: '#D97706' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pinned</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pinned.map((a, i) => (
                  <motion.div key={a._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                    <AnnouncementCard item={a} onPin={handlePin} onDelete={handleDelete} myId={myId} isAdmin={user?.role === 'admin'} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          {regular.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {regular.map((a, i) => (
                <motion.div key={a._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <AnnouncementCard item={a} onPin={handlePin} onDelete={handleDelete} myId={myId} isAdmin={user?.role === 'admin'} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Create Modal ── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Post Announcement">
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={set('title')} placeholder="Announcement title" required />
          <Textarea label="Content" value={form.content} onChange={set('content')} placeholder="Write your announcement…" rows={4} />

          {/* Audience selector */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>
              Who is this for?
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {AUDIENCE_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const isSelected = form.audience === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, audience: opt.value }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                      border: `1.5px solid ${isSelected ? B.blue : '#E2E8F0'}`,
                      background: isSelected ? B.blueBg : '#fff',
                      textAlign: 'left', width: '100%', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: isSelected ? B.blue : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={15} style={{ color: isSelected ? '#fff' : '#475569' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isSelected ? B.blue : '#0F172A' }}>{opt.label}</p>
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: '#64748B' }}>{opt.desc}</p>
                    </div>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, border: `2px solid ${isSelected ? B.blue : '#CBD5E1'}`, background: isSelected ? B.blue : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isSelected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>Priority</label>
            <select value={form.priority} onChange={set('priority')}
              style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid #E2E8F0', borderRadius: 10, outline: 'none', background: '#fff' }}>
              <option value="normal">Normal Priority</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Schedule for later — with time picker */}
          <div style={{ background: '#F5F3FF', borderRadius: 12, padding: '14px', border: '1px solid #DDD6FE' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#7C3AED', marginBottom: 4 }}>
              <Calendar size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
              Schedule for Later{' '}
              <span style={{ fontWeight: 400, color: '#94A3B8', fontSize: 11 }}>(optional — leave empty to post now)</span>
            </label>
            <p style={{ margin: '0 0 8px', fontSize: 11, color: '#6D28D9' }}>
              Pick a date <strong>and time</strong> — the announcement posts automatically at that moment.
            </p>
            <input
              type="datetime-local"
              value={form.scheduledFor}
              onChange={set('scheduledFor')}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
              style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid #DDD6FE', borderRadius: 10, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
            />
            {form.scheduledFor && (
              <p style={{ margin: '6px 0 0', fontSize: 11, color: '#7C3AED', fontWeight: 600 }}>
                📅 Will post at: {fmtDateTime(form.scheduledFor)}
              </p>
            )}
          </div>

          {/* Optional expiry — now with datetime-local so time can be set */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>
              Expires At{' '}
              <span style={{ fontWeight: 400, color: '#94A3B8' }}>(optional — pick date &amp; time)</span>
            </label>
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={set('expiresAt')}
              style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid #E2E8F0', borderRadius: 10, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
            />
            {form.expiresAt && (
              <p style={{ margin: '6px 0 0', fontSize: 11, color: '#D97706', fontWeight: 600 }}>
                ⏱ Expires at: {fmtDateTime(form.expiresAt)}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving} disabled={!form.title || !form.content}>
              {form.scheduledFor ? '📅 Schedule' : 'Publish Now'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Single Announcement Card ──────────────────────────────────────────────────
function AnnouncementCard({ item, onPin, onDelete, myId, isAdmin }) {
  const pc = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.normal;
  const PIcon = pc.icon;
  const [hovered, setHovered] = useState(false);

  const isScheduled = item.isPublished === false;
  const isOwner  = String(item.createdBy?._id || item.createdBy) === myId;
  const canManage = isOwner || isAdmin;

  const audienceLabel = {
    all:       null,
    employees: { text: 'Employees',  color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    managers:  { text: 'Management', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  }[item.audience];

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 28px rgba(15,23,42,0.09)' }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        background: isScheduled ? '#FAFAF5' : '#fff',
        borderRadius: 18,
        border: `1px solid ${isScheduled ? '#DDD6FE' : B.border}`,
        borderLeft: `4px solid ${isScheduled ? '#7C3AED' : pc.color}`,
        padding: '18px 20px',
        boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
        transition: 'box-shadow 0.2s',
        opacity: isScheduled ? 0.85 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: isScheduled ? '#F5F3FF' : pc.bg,
          border: `1px solid ${isScheduled ? '#DDD6FE' : pc.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isScheduled
            ? <Calendar size={18} style={{ color: '#7C3AED' }} />
            : <PIcon size={18} style={{ color: pc.color }} />
          }
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: B.black }}>{item.title}</h3>

            {isScheduled && (
              <span style={{ padding: '2px 8px', borderRadius: 999, background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE', fontSize: 10, fontWeight: 700 }}>
                🕐 Scheduled · {fmtDateTime(item.scheduledFor)}
              </span>
            )}

            {!isScheduled && item.priority !== 'normal' && (
              <span style={{ padding: '2px 8px', borderRadius: 999, background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                {pc.label}
              </span>
            )}

            {audienceLabel && !isScheduled && (
              <span style={{ padding: '2px 8px', borderRadius: 999, background: audienceLabel.bg, color: audienceLabel.color, border: `1px solid ${audienceLabel.border}`, fontSize: 10, fontWeight: 700 }}>
                → {audienceLabel.text}
              </span>
            )}

            {item.isPinned && !isScheduled && (
              <span style={{ fontSize: 10, color: '#D97706', background: '#FFFBEB', padding: '2px 7px', borderRadius: 999, border: '1px solid #FDE68A', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Pin size={9} /> Pinned
              </span>
            )}
          </div>

          <p style={{ margin: 0, fontSize: 13, color: B.slate, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.content}</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            {/* FIX: show date AND time for the posted timestamp */}
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: B.slateLight }}>
              <Clock size={11} />
              {fmtDateTime(item.createdAt)}
            </span>
            {item.createdBy?.name && (
              <span style={{ fontSize: 11, color: B.slateLight }}>by {item.createdBy.name}</span>
            )}
            {item.expiresAt && !isScheduled && (
              <span style={{ fontSize: 11, color: '#D97706', background: '#FFFBEB', padding: '2px 7px', borderRadius: 999, border: '1px solid #FDE68A', fontWeight: 600 }}>
                Expires {fmtDateTime(item.expiresAt)}
              </span>
            )}
          </div>
        </div>

        {/* Actions — visible only to owner or admin */}
        {canManage && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: hovered ? 1 : 0.4, x: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
            >
              {!isScheduled && (
                <motion.button whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
                  onClick={() => onPin(item._id)}
                  title={item.isPinned ? 'Unpin' : 'Pin'}
                  style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: item.isPinned ? '#FFFBEB' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pin size={13} style={{ color: item.isPinned ? '#D97706' : '#94A3B8' }} />
                </motion.button>
              )}
              <motion.button whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
                onClick={() => onDelete(item._id)}
                style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={13} style={{ color: '#DC2626' }} />
              </motion.button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

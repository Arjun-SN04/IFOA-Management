import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userAPI, authAPI } from '../../api';
import { Button, Input, Spinner } from '../../components/ui';
import {
  Save, Lock, Mail, Building, Briefcase,
  Hash, Package, CalendarClock, User, ChevronRight, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const B = {
  blue: '#2563EB', blueBg: '#EFF6FF', blueBorder: '#BFDBFE',
  emerald: '#059669', emeraldBg: '#ECFDF5', emeraldBorder: '#A7F3D0',
  red: '#DC2626', redBg: '#FEF2F2',
  black: '#0F172A', blackMid: '#1E293B',
  slate: '#475569', slateMid: '#64748B', slateLight: '#94A3B8',
  border: '#E2E8F0', surface: '#FFFFFF', surfaceAlt: '#F8FAFC',
};

const ROLE_BADGE = {
  admin:   { bg: '#FEF2F2', color: '#DC2626', label: 'Admin' },
  manager: { bg: '#FFFBEB', color: '#D97706', label: 'Manager' },
  employee:{ bg: '#EFF6FF', color: '#2563EB', label: 'Employee' },
};

function InfoRow({ icon: Icon, label, value }) {
  return (
    <motion.div
      whileHover={{ x: 4 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 14px', borderRadius: 12,
        background: B.surfaceAlt, border: `1px solid ${B.border}`,
        cursor: 'default', transition: 'background 0.15s',
      }}
    >
      <div style={{ width: 32, height: 32, borderRadius: 10, background: B.blueBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={15} style={{ color: B.blue }} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: B.slateLight, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
        <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 600, color: B.black }}>{value}</p>
      </div>
    </motion.div>
  );
}

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', skills: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [accessories, setAccessories] = useState([]);
  const [activeSection, setActiveSection] = useState('info');

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', phone: user.phone || '', skills: user.skills?.join(', ') || '' });
      userAPI.getMyAccessories()
        .then(res => setAccessories(res.data?.accessories || []))
        .catch(() => setAccessories([]));
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      const payload = { ...form, skills: form.skills.split(',').map(s => s.trim()).filter(Boolean) };
      const res = await userAPI.updateProfile(payload);
      setUser(res.data.data || res.data.user);
      setMsg('Profile updated successfully!');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setMsg(e.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async () => {
    setPwSaving(true); setPwMsg('');
    try {
      await authAPI.updatePassword(pwForm);
      setPwMsg('Password updated successfully!');
      setPwForm({ currentPassword: '', newPassword: '' });
      setTimeout(() => setPwMsg(''), 3000);
    } catch (e) { setPwMsg(e.response?.data?.message || 'Failed'); }
    finally { setPwSaving(false); }
  };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  if (!user) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
      <Spinner size="lg" />
    </div>
  );

  const roleBadge = ROLE_BADGE[user.role] || ROLE_BADGE.employee;
  const initials = user.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const SECTIONS = [
    { key: 'info',       label: 'Profile Info',  icon: User },
    { key: 'security',   label: 'Security',       icon: Lock },
    { key: 'accessories',label: 'Accessories',    icon: Package },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 760, margin: '0 auto' }}>
      {/* ── Header ── */}
      <section style={{ padding: '8px 2px' }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: B.slateMid }}>
          Account
        </p>
        <h1 style={{ margin: '4px 0 0', fontSize: 30, fontWeight: 800, color: B.black, lineHeight: 1.1 }}>
          My <span style={{ color: B.blue }}>Profile</span>
        </h1>
        <p style={{ margin: '5px 0 0', fontSize: 13, color: B.slateMid }}>
          Manage your account information and preferences.
        </p>
      </section>

      {/* ── Profile hero card ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        style={{
          background: `linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #3B82F6 100%)`,
          borderRadius: 20, padding: '28px 28px', color: '#fff',
          boxShadow: '0 8px 32px rgba(37,99,235,0.35)',
          position: 'relative', overflow: 'hidden',
        }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -60, right: 60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, position: 'relative' }}>
          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: '3px solid rgba(255,255,255,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 800, color: '#fff', flexShrink: 0
          }}>
            {initials}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff' }}>{user.name}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{user.designation || user.role}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                {roleBadge.label}
              </span>
              {user.employeeId && (
                <span style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontFamily: 'monospace' }}>
                  {user.employeeId}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Section Tabs ── */}
      <div style={{ display: 'flex', gap: 6, background: B.surfaceAlt, borderRadius: 14, padding: 4, border: `1px solid ${B.border}` }}>
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '9px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
              background: activeSection === key ? '#fff' : 'transparent',
              color: activeSection === key ? B.blue : B.slateMid,
              boxShadow: activeSection === key ? '0 2px 8px rgba(15,23,42,0.08)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Sections ── */}
      <AnimatePresence mode="wait">
        {activeSection === 'info' && (
          <motion.div key="info" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* readonly info */}
            <div style={{ background: B.surface, borderRadius: 18, border: `1px solid ${B.border}`, padding: 20, boxShadow: '0 4px 16px rgba(15,23,42,0.05)' }}>
              <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: B.slateMid, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Account Details</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                <InfoRow icon={Mail}     label="Email"       value={user.email} />
                <InfoRow icon={Building} label="Department"  value={user.department || '—'} />
                <InfoRow icon={Briefcase}label="Designation" value={user.designation || '—'} />
                <InfoRow icon={Hash}     label="Employee ID" value={user.employeeId || '—'} />
              </div>
            </div>

            {/* editable info */}
            <div style={{ background: B.surface, borderRadius: 18, border: `1px solid ${B.border}`, padding: 20, boxShadow: '0 4px 16px rgba(15,23,42,0.05)' }}>
              <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: B.slateMid, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Edit Profile</p>
              <AnimatePresence>
                {msg && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '10px 14px', borderRadius: 10, marginBottom: 14,
                      background: msg.includes('success') ? B.emeraldBg : B.redBg,
                      border: `1px solid ${msg.includes('success') ? B.emeraldBorder : '#FECACA'}`,
                      color: msg.includes('success') ? B.emerald : B.red,
                      fontSize: 13, fontWeight: 600,
                    }}>
                    <CheckCircle2 size={15} /> {msg}
                  </motion.div>
                )}
              </AnimatePresence>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Input label="Full Name" value={form.name} onChange={set('name')} />
                <Input label="Phone" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
                <Input label="Skills (comma separated)" value={form.skills} onChange={set('skills')} placeholder="JavaScript, React, Node.js" />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button onClick={handleSave} loading={saving}>
                      <Save size={14} /> Save Changes
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === 'security' && (
          <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div style={{ background: B.surface, borderRadius: 18, border: `1px solid ${B.border}`, padding: 20, boxShadow: '0 4px 16px rgba(15,23,42,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: B.blueBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Lock size={16} style={{ color: B.blue }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: B.black }}>Change Password</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: B.slateMid }}>Keep your account secure with a strong password.</p>
                </div>
              </div>
              <AnimatePresence>
                {pwMsg && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '10px 14px', borderRadius: 10, marginBottom: 14,
                      background: pwMsg.includes('success') ? B.emeraldBg : B.redBg,
                      border: `1px solid ${pwMsg.includes('success') ? B.emeraldBorder : '#FECACA'}`,
                      color: pwMsg.includes('success') ? B.emerald : B.red,
                      fontSize: 13, fontWeight: 600,
                    }}>
                    <CheckCircle2 size={15} /> {pwMsg}
                  </motion.div>
                )}
              </AnimatePresence>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Input type="password" label="Current Password" value={pwForm.currentPassword}
                  onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))} />
                <Input type="password" label="New Password" value={pwForm.newPassword}
                  onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                  placeholder="Minimum 6 characters" />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <Button onClick={handlePasswordChange} loading={pwSaving} variant="secondary">
                    <Lock size={14} /> Update Password
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === 'accessories' && (
          <motion.div key="accessories" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div style={{ background: B.surface, borderRadius: 18, border: `1px solid ${B.border}`, padding: 20, boxShadow: '0 4px 16px rgba(15,23,42,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: B.blueBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={16} style={{ color: B.blue }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: B.black }}>Assigned Accessories</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: B.slateMid }}>Equipment and items assigned to you.</p>
                </div>
              </div>
              {accessories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <Package size={36} style={{ color: '#CBD5E1', margin: '0 auto 10px' }} />
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: B.slateMid }}>No accessories assigned</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: B.slateLight }}>Items assigned to you will appear here</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {accessories.map((item, idx) => (
                    <motion.div key={item._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                      whileHover={{ x: 4 }}
                      style={{ border: `1px solid ${B.border}`, borderRadius: 14, padding: '14px 16px', background: B.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: B.black }}>{item.name}</p>
                        {item.serialNumber && <p style={{ margin: '3px 0 0', fontSize: 12, color: B.slateMid }}>Serial: {item.serialNumber}</p>}
                        {item.notes && <p style={{ margin: '3px 0 0', fontSize: 12, color: B.slateLight }}>{item.notes}</p>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: 11, color: B.slateMid, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CalendarClock size={11} />
                          {item.assignedAt ? new Date(item.assignedAt).toLocaleDateString() : '—'}
                        </p>
                        {item.assignedBy?.name && <p style={{ margin: '2px 0 0', fontSize: 11, color: B.slateLight }}>By: {item.assignedBy.name}</p>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

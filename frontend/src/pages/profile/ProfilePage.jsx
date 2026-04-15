import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userAPI, authAPI } from '../../api';
import { Card, Button, Input, Avatar, Spinner, Alert, PageHeader, Badge } from '../../components/ui';
import { Save, Lock, Mail, Building, Briefcase, Hash, Package, CalendarClock } from 'lucide-react';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', skills: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [accessories, setAccessories] = useState([]);

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
      setMsg('Profile updated successfully');
    } catch (e) { setMsg(e.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async () => {
    setPwSaving(true); setPwMsg('');
    try {
      await authAPI.updatePassword(pwForm);
      setPwMsg('Password updated');
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (e) { setPwMsg(e.response?.data?.message || 'Failed'); }
    finally { setPwSaving(false); }
  };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  if (!user) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      <div className="text-center">
        <PageHeader title="My Profile" subtitle="Manage your account information and preferences" />
      </div>

      {/* Profile overview */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar name={user.name} size="xl" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">{user.name}</h2>
            <p className="text-sm text-slate-500">{user.designation || user.role}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={user.role === 'admin' ? 'danger' : user.role === 'manager' ? 'warning' : 'default'}>
                {user.role}
              </Badge>
              {user.employeeId && <span className="text-xs text-slate-400 font-mono">{user.employeeId}</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {[
            { icon: Mail, label: 'Email', value: user.email },
            { icon: Building, label: 'Department', value: user.department || '—' },
            { icon: Briefcase, label: 'Designation', value: user.designation || '—' },
            { icon: Hash, label: 'Employee ID', value: user.employeeId || '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
              <Icon className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="font-medium text-slate-900">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Edit profile */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Edit Profile</h3>
        {msg && <Alert variant={msg.includes('success') ? 'success' : 'error'}>{msg}</Alert>}
        <div className="space-y-4 mt-3">
          <Input label="Full Name" value={form.name} onChange={set('name')} />
          <Input label="Phone" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
          <Input label="Skills (comma separated)" value={form.skills} onChange={set('skills')} placeholder="JavaScript, React, Node.js" />
          <Button onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </Card>

      {/* Change password */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Change Password</h3>
        {pwMsg && <Alert variant={pwMsg.includes('updated') ? 'success' : 'error'}>{pwMsg}</Alert>}
        <div className="space-y-4 mt-3">
          <Input type="password" label="Current Password" value={pwForm.currentPassword}
            onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))} />
          <Input type="password" label="New Password" value={pwForm.newPassword}
            onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))} placeholder="Minimum 6 characters" />
          <Button onClick={handlePasswordChange} loading={pwSaving} variant="secondary">
            <Lock className="w-4 h-4" />
            Update Password
          </Button>
        </div>
      </Card>

      {/* Assigned accessories (read-only) */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Assigned Accessories</h3>
        {accessories.length === 0 ? (
          <div className="text-sm text-slate-400 flex items-center gap-2">
            <Package className="w-4 h-4" /> No accessories assigned yet
          </div>
        ) : (
          <div className="space-y-3">
            {accessories.map(item => (
              <div key={item._id} className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                    {item.serialNumber && <p className="text-xs text-slate-500">Serial: {item.serialNumber}</p>}
                    {item.notes && <p className="text-xs text-slate-500 mt-1">{item.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" />
                      {item.assignedAt ? new Date(item.assignedAt).toLocaleDateString() : '—'}
                    </p>
                    {item.assignedBy?.name && <p className="text-[11px] text-slate-400">By: {item.assignedBy.name}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

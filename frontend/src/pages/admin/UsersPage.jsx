import { useState, useEffect } from 'react';
import { userAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Modal, Input, Select, Spinner } from '../../components/ui';
import {
  Search, Shield, UserX, Package, Trash2, RotateCcw,
  Users, Crown, Briefcase, User, ChevronDown, ChevronUp,
  Mail, Building2, IdCard, MoreVertical
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Role config ──────────────────────────────────────────────────────────────
const ROLE_CFG = {
  admin: {
    label: 'Administrators',
    icon: Crown,
    accent: '#7C3AED',
    accentBg: '#F5F3FF',
    accentBorder: '#DDD6FE',
    badge: { bg: '#EDE9FE', color: '#6D28D9', border: '#C4B5FD' },
    avatarBg: 'linear-gradient(135deg,#7C3AED,#4F46E5)',
  },
  manager: {
    label: 'Managers',
    icon: Briefcase,
    accent: '#0284C7',
    accentBg: '#F0F9FF',
    accentBorder: '#BAE6FD',
    badge: { bg: '#E0F2FE', color: '#0369A1', border: '#7DD3FC' },
    avatarBg: 'linear-gradient(135deg,#0284C7,#0891B2)',
  },
  employee: {
    label: 'Employees',
    icon: User,
    accent: '#059669',
    accentBg: '#F0FDF4',
    accentBorder: '#BBF7D0',
    badge: { bg: '#DCFCE7', color: '#065F46', border: '#86EFAC' },
    avatarBg: 'linear-gradient(135deg,#059669,#0D9488)',
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

function UserAvatar({ name, role, size = 44 }) {
  const cfg = ROLE_CFG[role] || ROLE_CFG.employee;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: cfg.avatarBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 800, color: '#fff',
      flexShrink: 0, letterSpacing: '-0.02em',
      boxShadow: `0 2px 8px ${cfg.accent}40`,
    }}>
      {getInitials(name)}
    </div>
  );
}

function RoleBadge({ role }) {
  const cfg = ROLE_CFG[role] || ROLE_CFG.employee;
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 999,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'capitalize',
      background: cfg.badge.bg, color: cfg.badge.color, border: `1px solid ${cfg.badge.border}`,
    }}>
      <Icon size={9} />
      {role}
    </span>
  );
}

// ── Individual user card ──────────────────────────────────────────────────────
function UserCard({ u, me, onRoleClick, onAccessories, onToggleStatus, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cfg = ROLE_CFG[u.role] || ROLE_CFG.employee;
  const isSelf = String(u._id) === String(me?._id || me?.id);

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E2E8F0',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
      transition: 'box-shadow 0.2s, transform 0.2s',
      position: 'relative',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(15,23,42,0.10)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,23,42,0.05)'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Role accent top bar */}
      <div style={{ height: 3, background: cfg.accent }} />

      <div style={{ padding: '16px 16px 14px' }}>
        {/* Top row: avatar + name + menu */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <UserAvatar name={u.name} role={u.role} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                {u.name}
              </p>
              {!u.isActive && (
                <span style={{ fontSize: 9, fontWeight: 700, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '2px 6px', borderRadius: 999 }}>
                  INACTIVE
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, overflow: 'hidden' }}>
              <Mail size={10} style={{ color: '#94A3B8', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 11, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
            </div>
          </div>

          {/* ⋮ Menu */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              style={{
                width: 28, height: 28, borderRadius: 8, border: '1px solid #E2E8F0',
                background: menuOpen ? '#F1F5F9' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#64748B',
              }}
            >
              <MoreVertical size={14} />
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute', top: 32, right: 0, zIndex: 50,
                background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12,
                boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
                minWidth: 160, overflow: 'hidden',
              }}
                onMouseLeave={() => setMenuOpen(false)}
              >
                <MenuItem icon={Shield} label="Change Role" color="#7C3AED" onClick={() => { setMenuOpen(false); onRoleClick(u); }} />
                <MenuItem icon={Package} label="Accessories" color="#0284C7" onClick={() => { setMenuOpen(false); onAccessories(u); }} />
                {u.isActive
                  ? <MenuItem icon={UserX} label="Deactivate" color="#D97706" onClick={() => { setMenuOpen(false); onToggleStatus(u._id, true); }} />
                  : <MenuItem icon={RotateCcw} label="Reactivate" color="#059669" onClick={() => { setMenuOpen(false); onToggleStatus(u._id, false); }} />
                }
                {!isSelf && (
                  <MenuItem icon={Trash2} label="Remove User" color="#DC2626" onClick={() => { setMenuOpen(false); onDelete(u); }} danger />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info chips */}
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <RoleBadge role={u.role} />
          {u.department && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#475569', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '3px 8px', borderRadius: 999 }}>
              <Building2 size={9} />{u.department}
            </span>
          )}
          {u.designation && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#475569', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '3px 8px', borderRadius: 999 }}>
              <Briefcase size={9} />{u.designation}
            </span>
          )}
        </div>

        {/* Employee ID */}
        {u.employeeId && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <IdCard size={10} style={{ color: '#94A3B8' }} />
            <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{u.employeeId}</span>
          </div>
        )}

        {/* Action buttons row */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #F1F5F9', display: 'flex', gap: 6 }}>
          <ActionBtn icon={Shield} label="Role" accent={cfg.accent} accentBg={cfg.accentBg} onClick={() => onRoleClick(u)} />
          <ActionBtn icon={Package} label="Assets" accent="#0284C7" accentBg="#F0F9FF" onClick={() => onAccessories(u)} />
          {u.isActive
            ? <ActionBtn icon={UserX} label="Deactivate" accent="#D97706" accentBg="#FFFBEB" onClick={() => onToggleStatus(u._id, true)} />
            : <ActionBtn icon={RotateCcw} label="Activate" accent="#059669" accentBg="#F0FDF4" onClick={() => onToggleStatus(u._id, false)} />
          }
        </div>
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, label, color, onClick, danger }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
        fontSize: 12, fontWeight: 600, color: hov ? color : (danger ? '#DC2626' : '#334155'),
        background: hov ? (danger ? '#FEF2F2' : '#F8FAFC') : '#fff',
        transition: 'background 0.12s, color 0.12s',
      }}
    >
      <Icon size={13} style={{ color }} />{label}
    </button>
  );
}

function ActionBtn({ icon: Icon, label, accent, accentBg, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        padding: '6px 4px', borderRadius: 8, border: `1px solid ${accent}30`,
        background: hov ? accentBg : '#FAFAFA',
        color: accent, fontSize: 10, fontWeight: 700, cursor: 'pointer',
        transition: 'background 0.12s',
      }}
    >
      <Icon size={11} />{label}
    </button>
  );
}

// ── Role section header ───────────────────────────────────────────────────────
function RoleSection({ role, users, me, onRoleClick, onAccessories, onToggleStatus, onDelete }) {
  const [collapsed, setCollapsed] = useState(false);
  const cfg = ROLE_CFG[role];
  const Icon = cfg.icon;
  if (users.length === 0) return null;
  return (
    <div style={{ marginBottom: 32 }}>
      {/* Section header */}
      <button
        onClick={() => setCollapsed(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          background: 'none', border: 'none', cursor: 'pointer',
          marginBottom: collapsed ? 0 : 16, padding: '6px 0',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: cfg.accentBg, border: `1px solid ${cfg.accentBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={15} style={{ color: cfg.accent }} />
        </div>
        <div style={{ textAlign: 'left', flex: 1 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{cfg.label}</p>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, background: cfg.accentBg,
          color: cfg.accent, border: `1px solid ${cfg.accentBorder}`,
          padding: '2px 10px', borderRadius: 999,
        }}>
          {users.length}
        </span>
        {collapsed
          ? <ChevronDown size={16} style={{ color: '#94A3B8' }} />
          : <ChevronUp size={16} style={{ color: '#94A3B8' }} />
        }
      </button>

      {/* Horizontal accent line */}
      {!collapsed && (
        <div style={{ height: 2, background: `linear-gradient(90deg,${cfg.accent}40,transparent)`, borderRadius: 999, marginBottom: 14 }} />
      )}

      {!collapsed && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
          {users.map(u => (
            <UserCard key={u._id} u={u} me={me}
              onRoleClick={onRoleClick} onAccessories={onAccessories}
              onToggleStatus={onToggleStatus} onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [showAccessoriesModal, setShowAccessoriesModal] = useState(null);
  const [accessories, setAccessories] = useState([]);
  const [accessoryForm, setAccessoryForm] = useState({ name: '', serialNumber: '', notes: '', assignedDate: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    userAPI.getAll({ search, department: deptFilter })
      .then(res => setUsers(res.data.users || res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, deptFilter]);

  const handleRoleChange = async () => {
    try {
      await userAPI.changeRole(showRoleModal._id, newRole);
      setUsers(prev => prev.map(u => u._id === showRoleModal._id ? { ...u, role: newRole } : u));
      toast.success('Role updated');
      setShowRoleModal(null);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const handleToggleStatus = async (userId, currentlyActive) => {
    const action = currentlyActive ? 'deactivate' : 'reactivate';
    if (!window.confirm(`Are you sure you want to ${action} this account?`)) return;
    try {
      const res = await userAPI.toggleStatus(userId);
      const newActive = res.data.isActive ?? !currentlyActive;
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isActive: newActive } : u));
      toast.success(`Account ${newActive ? 'reactivated' : 'deactivated'}`);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const handleDeleteUser = async () => {
    if (!showDeleteModal) return;
    setDeleting(true);
    try {
      await userAPI.delete(showDeleteModal._id);
      setUsers(prev => prev.filter(u => u._id !== showDeleteModal._id));
      toast.success('User permanently removed from database');
      setShowDeleteModal(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const openAccessories = async (u) => {
    setShowAccessoriesModal(u);
    try {
      const res = await userAPI.getAccessories(u._id);
      setAccessories(res.data?.accessories || []);
    } catch {
      setAccessories([]);
      toast.error('Failed to load accessories');
    }
  };

  const addAccessory = async () => {
    if (!accessoryForm.name.trim()) { toast.error('Accessory name is required'); return; }
    try {
      const payload = {
        name: accessoryForm.name,
        serialNumber: accessoryForm.serialNumber,
        notes: accessoryForm.notes,
        ...(accessoryForm.assignedDate ? { assignedAt: accessoryForm.assignedDate } : {}),
      };
      const res = await userAPI.addAccessory(showAccessoriesModal._id, payload);
      setAccessories(res.data?.accessories || []);
      setAccessoryForm({ name: '', serialNumber: '', notes: '', assignedDate: '' });
      toast.success('Accessory added');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to add accessory'); }
  };

  const removeAccessory = async (accessoryId) => {
    try {
      const res = await userAPI.removeAccessory(showAccessoriesModal._id, accessoryId);
      setAccessories(res.data?.accessories || []);
      toast.success('Accessory removed');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to remove accessory'); }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}><Spinner size="lg" /></div>;

  const departments = [...new Set(users.map(u => u.department).filter(Boolean))];

  const q = search.toLowerCase();
  const filtered = users.filter(u =>
    (!q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.department?.toLowerCase().includes(q))
    && (!deptFilter || u.department === deptFilter)
  );

  const admins    = filtered.filter(u => u.role === 'admin');
  const managers  = filtered.filter(u => u.role === 'manager');
  const employees = filtered.filter(u => u.role === 'employee');
  const totalActive   = filtered.filter(u => u.isActive !== false).length;
  const totalInactive = filtered.filter(u => u.isActive === false).length;

  const roleProps = { me, onRoleClick: u => { setShowRoleModal(u); setNewRole(u.role); }, onAccessories: openAccessories, onToggleStatus: handleToggleStatus, onDelete: setShowDeleteModal };

  return (
    <div style={{ padding: '0 0 40px' }}>

      {/* ── Page hero ── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748B' }}>Admin Panel</p>
        <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 800, color: '#0F172A', lineHeight: 1.15 }}>Team Directory</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748B' }}>
          {filtered.length} member{filtered.length !== 1 ? 's' : ''} &nbsp;·&nbsp;
          <span style={{ color: '#059669', fontWeight: 600 }}>{totalActive} active</span>
          {totalInactive > 0 && <><span style={{ color: '#94A3B8' }}> · </span><span style={{ color: '#DC2626', fontWeight: 600 }}>{totalInactive} inactive</span></>}
        </p>
      </div>

      {/* ── Summary stat pills ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
        {[['admin','admins'], ['manager','managers'], ['employee','employees']].map(([role, plural]) => {
          const count = filtered.filter(u => u.role === role).length;
          const cfg = ROLE_CFG[role];
          const Icon = cfg.icon;
          return (
            <div key={role} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 12,
              background: cfg.accentBg, border: `1px solid ${cfg.accentBorder}`,
            }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: cfg.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={14} style={{ color: '#fff' }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{count}</p>
                <p style={{ margin: 0, fontSize: 10, color: cfg.accent, fontWeight: 700, textTransform: 'capitalize' }}>{plural}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Filters bar ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            placeholder="Search by name, email or department…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
              fontSize: 13, border: '1px solid #E2E8F0', borderRadius: 10,
              background: '#fff', color: '#0F172A', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          style={{ padding: '9px 12px', fontSize: 13, border: '1px solid #E2E8F0', borderRadius: 10, background: '#fff', color: '#334155', minWidth: 160 }}
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {(search || deptFilter) && (
          <button
            onClick={() => { setSearch(''); setDeptFilter(''); }}
            style={{ padding: '9px 14px', fontSize: 12, fontWeight: 700, border: '1px solid #FECACA', borderRadius: 10, background: '#FEF2F2', color: '#DC2626', cursor: 'pointer' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Role-categorised sections ── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed #E2E8F0', borderRadius: 16 }}>
          <Users size={36} style={{ color: '#CBD5E1', margin: '0 auto 10px' }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#64748B' }}>No users found</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94A3B8' }}>Try adjusting your filters</p>
        </div>
      ) : (
        <>
          <RoleSection role="admin"    users={admins}    {...roleProps} />
          <RoleSection role="manager"  users={managers}  {...roleProps} />
          <RoleSection role="employee" users={employees} {...roleProps} />
        </>
      )}

      {/* ── Role Change Modal ── */}
      <Modal open={!!showRoleModal} onClose={() => setShowRoleModal(null)} title="Change User Role" size="sm">
        {showRoleModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-4">
              <UserAvatar name={showRoleModal.name} role={showRoleModal.role} size={40} />
              <div>
                <p className="text-sm font-semibold text-slate-900">{showRoleModal.name}</p>
                <p className="text-xs text-slate-500">{showRoleModal.email}</p>
              </div>
            </div>
            <Select label="New Role" value={newRole} onChange={e => setNewRole(e.target.value)}>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </Select>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowRoleModal(null)}>Cancel</Button>
              <Button onClick={handleRoleChange}>Update Role</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Accessories Modal ── */}
      <Modal open={!!showAccessoriesModal} onClose={() => setShowAccessoriesModal(null)}
        title={`Accessories — ${showAccessoriesModal?.name || ''}`} size="lg">
        {showAccessoriesModal && (
          <div className="space-y-5">
            {/* Add form */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Add New Accessory</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Accessory Name *"
                  value={accessoryForm.name}
                  onChange={e => setAccessoryForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Laptop, ID Card, Headset…"
                />
                <Input
                  label="Serial Number"
                  value={accessoryForm.serialNumber}
                  onChange={e => setAccessoryForm(p => ({ ...p, serialNumber: e.target.value }))}
                  placeholder="Optional"
                />
                <Input
                  label="Date Given"
                  type="date"
                  value={accessoryForm.assignedDate}
                  onChange={e => setAccessoryForm(p => ({ ...p, assignedDate: e.target.value }))}
                />
                <Input
                  label="Notes"
                  value={accessoryForm.notes}
                  onChange={e => setAccessoryForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional notes"
                />
              </div>
              <div className="flex justify-end mt-3">
                <Button onClick={addAccessory}>
                  <Package className="w-4 h-4" /> Add Accessory
                </Button>
              </div>
            </div>

            {/* Accessories list */}
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                Assigned Accessories ({accessories.length})
              </p>
              <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {accessories.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-400">
                    <Package className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    No accessories assigned yet.
                  </div>
                ) : accessories.map(a => (
                  <div key={a._id} className="p-3.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{a.name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        {a.serialNumber && (
                          <p className="text-xs text-slate-500">Serial: <span className="font-mono">{a.serialNumber}</span></p>
                        )}
                        {a.assignedAt && (
                          <p className="text-xs text-slate-500">
                            Given: {new Date(a.assignedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                        {a.assignedBy?.name && (
                          <p className="text-xs text-slate-400">By: {a.assignedBy.name}</p>
                        )}
                      </div>
                      {a.notes && <p className="text-xs text-slate-500 mt-1 italic">{a.notes}</p>}
                    </div>
                    <button
                      onClick={() => removeAccessory(a._id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0 transition-colors"
                      title="Remove accessory"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Permanent Delete Confirmation Modal ── */}
      <Modal open={!!showDeleteModal} onClose={() => setShowDeleteModal(null)} title="Permanently Remove User" size="sm">
        {showDeleteModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <UserAvatar name={showDeleteModal.name} role={showDeleteModal.role} size={40} />
              <div>
                <p className="text-sm font-semibold text-slate-900">{showDeleteModal.name}</p>
                <p className="text-xs text-slate-500">{showDeleteModal.email}</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ This action is irreversible</p>
              <p className="text-xs text-amber-700">
                This will permanently delete <strong>{showDeleteModal.name}</strong>'s account and all associated data from the database. This cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowDeleteModal(null)}>Cancel</Button>
              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Removing…' : 'Permanently Remove'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

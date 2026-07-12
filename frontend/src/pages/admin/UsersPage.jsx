import { useState, useEffect, useCallback } from 'react';
import { userAPI, nocAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Button, Modal, Input, Select, Spinner } from '../../components/ui';
import {
  Search, Shield, UserX, Package, Trash2, RotateCcw,
  Users, Crown, Briefcase, User, ChevronDown, ChevronUp,
  Mail, Building2, IdCard, MoreVertical, HeartHandshake, Pencil, FileWarning,
  UserCheck, UserMinus, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Role config ───────────────────────────────────────────────────────────────
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
  hr: {
    label: 'HR',
    icon: HeartHandshake,
    accent: '#DB2777',
    accentBg: '#FDF2F8',
    accentBorder: '#FBCFE8',
    badge: { bg: '#FCE7F3', color: '#9D174D', border: '#F9A8D4' },
    avatarBg: 'linear-gradient(135deg,#DB2777,#EC4899)',
  },
  team_lead: {
    label: 'Team Leads',
    icon: Users,
    accent: '#059669',
    accentBg: '#ECFDF5',
    accentBorder: '#A7F3D0',
    badge: { bg: '#DCFCE7', color: '#065F46', border: '#86EFAC' },
    avatarBg: 'linear-gradient(135deg,#059669,#0D9488)',
  },
  employee: {
    label: 'Employees',
    icon: User,
    accent: '#64748B',
    accentBg: '#F8FAFC',
    accentBorder: '#E2E8F0',
    badge: { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' },
    avatarBg: 'linear-gradient(135deg,#64748B,#475569)',
  },
};

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

function UserAvatar({ name, role, size = 44 }) {
  const cfg = ROLE_CFG[role] || ROLE_CFG.employee;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: cfg.avatarBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 800, color: '#fff', flexShrink: 0,
      letterSpacing: '-0.02em', boxShadow: `0 2px 8px ${cfg.accent}40`,
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
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 999,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'capitalize',
      background: cfg.badge.bg, color: cfg.badge.color, border: `1px solid ${cfg.badge.border}`,
    }}>
      <Icon size={9} /> {role}
    </span>
  );
}

function MenuItem({ icon: Icon, label, color, onClick, danger }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 12, fontWeight: 600, color: hov ? color : (danger ? '#DC2626' : '#334155'), background: hov ? (danger ? '#FEF2F2' : '#F8FAFC') : '#fff', transition: 'background .12s, color .12s' }}>
      <Icon size={13} style={{ color }} />{label}
    </button>
  );
}

function ActionBtn({ icon: Icon, label, accent, accentBg, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px 4px', borderRadius: 8, border: `1px solid ${accent}30`, background: hov ? accentBg : '#FAFAFA', color: accent, fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'background .12s' }}>
      <Icon size={11} />{label}
    </button>
  );
}

// ── Edit Employee ID Modal ─────────────────────────────────────────────────────
function EditEmployeeIdModal({ open, onClose, user, onSave }) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setValue(user?.employeeId || ''); setError(''); setSaving(false); }
  }, [open, user]);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed) { setError('Employee ID cannot be empty.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await userAPI.updateEmployeeId(user._id, trimmed);
      onSave(res.data.user);
      toast.success('Employee ID updated');
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update Employee ID.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Employee ID" size="sm">
      {user && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserAvatar name={user.name} role={user.role} size={36} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{user.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748B' }}>{user.email}</p>
            </div>
          </div>
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '9px 12px' }}>
            <p style={{ margin: 0, fontSize: 11, color: '#92400E', fontWeight: 600 }}>
              Employee IDs must be unique across all users. The system will reject duplicates.
            </p>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
              Employee ID <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              value={value}
              onChange={e => { setValue(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              maxLength={30}
              placeholder="e.g. EMP-0042"
              style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${error ? '#EF4444' : '#E2E8F0'}`, borderRadius: 9, fontSize: 14, fontFamily: 'monospace', letterSpacing: '0.05em', outline: 'none', boxSizing: 'border-box', color: '#0F172A' }}
              autoFocus
            />
            {error && <p style={{ margin: '5px 0 0', fontSize: 12, color: '#DC2626', fontWeight: 600 }}>{error}</p>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save ID</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function UserCard({ u, me, canManageAssets, canRaiseNoc, canEditEmpId, onRoleClick, onAccessories, onRaiseNoc, onToggleStatus, onDelete, onEditEmpId }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [showItemsPopup, setShowItemsPopup] = useState(false);
  const cfg    = ROLE_CFG[u.role] || ROLE_CFG.employee;
  const isSelf = String(u._id) === String(me?._id || me?.id);
  const accessoryCount = Array.isArray(u.accessories) ? u.accessories.length : 0;
  const previewAssets = Array.isArray(u.accessories) ? u.accessories.slice(0, 3) : [];

  return (
    <div style={{ perspective: 1200 }}>
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,.05)', transition: 'box-shadow .2s, transform .2s', position: 'relative', minHeight: 280 }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(15,23,42,.10)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,23,42,.05)'; e.currentTarget.style.transform = 'none'; }}>
      <div style={{ transformStyle: 'preserve-3d', transition: 'transform .45s ease', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', minHeight: 280 }}>
      <div style={{ backfaceVisibility: 'hidden' }}>
      <div style={{ height: 3, background: cfg.accent }} />
      <div style={{ padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <UserAvatar name={u.name} role={u.role} />
          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <p onMouseEnter={() => setShowItemsPopup(true)} onMouseLeave={() => setShowItemsPopup(false)}
                style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140, cursor: 'help' }}>{u.name}</p>
              {!u.isActive && <span style={{ fontSize: 9, fontWeight: 700, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '2px 6px', borderRadius: 999 }}>INACTIVE</span>}
            </div>
            {showItemsPopup && (
              <div onMouseEnter={() => setShowItemsPopup(true)} onMouseLeave={() => setShowItemsPopup(false)}
                style={{ position: 'absolute', top: 18, left: 0, zIndex: 60, minWidth: 220, maxWidth: 280, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,.12)', padding: '8px 10px' }}>
                <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em' }}>All Assigned Items</p>
                {Array.isArray(u.accessories) && u.accessories.length > 0 ? (
                  u.accessories.map(a => (
                    <p key={a._id} style={{ margin: 0, fontSize: 11, color: '#334155', fontWeight: 600 }}>{a.name}{a.serialNumber ? ` · ${a.serialNumber}` : ''}</p>
                  ))
                ) : (
                  <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>No assigned items</p>
                )}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, overflow: 'hidden' }}>
              <Mail size={10} style={{ color: '#94A3B8', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 11, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
            </div>
          </div>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button onClick={() => setMenuOpen(v => !v)}
              style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #E2E8F0', background: menuOpen ? '#F1F5F9' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
              <MoreVertical size={14} />
            </button>
            {menuOpen && (
              <div style={{ position: 'absolute', top: 32, right: 0, zIndex: 50, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,.12)', minWidth: 160, overflow: 'hidden' }}
                onMouseLeave={() => setMenuOpen(false)}>
                <MenuItem icon={Shield}    label="Change Role"  color="#7C3AED" onClick={() => { setMenuOpen(false); onRoleClick(u); }} />
                <MenuItem icon={Package}   label="Accessories"  color="#0284C7" onClick={() => { setMenuOpen(false); setFlipped(true); }} />
                {canEditEmpId && <MenuItem icon={IdCard} label="Edit Employee ID" color="#0284C7" onClick={() => { setMenuOpen(false); onEditEmpId(u); }} />}
                {u.isActive
                  ? <MenuItem icon={UserX}      label="Deactivate" color="#D97706" onClick={() => { setMenuOpen(false); onToggleStatus(u._id, true); }} />
                  : <MenuItem icon={RotateCcw}  label="Reactivate" color="#059669" onClick={() => { setMenuOpen(false); onToggleStatus(u._id, false); }} />
                }
                {!isSelf && <MenuItem icon={Trash2} label="Remove User" color="#DC2626" onClick={() => { setMenuOpen(false); onDelete(u); }} danger />}
              </div>
            )}
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <RoleBadge role={u.role} />
          {u.department && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#475569', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '3px 8px', borderRadius: 999 }}><Building2 size={9} />{u.department}</span>}
          {u.designation && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#475569', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '3px 8px', borderRadius: 999 }}><Briefcase size={9} />{u.designation}</span>}
        </div>
        {u.employeeId && <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}><IdCard size={10} style={{ color: '#94A3B8' }} /><span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace', letterSpacing: '.05em' }}>{u.employeeId}</span>{canEditEmpId && <button onClick={() => onEditEmpId(u)} title="Edit Employee ID" style={{ marginLeft: 4, padding: '1px 6px', border: '1px solid #BAE6FD', borderRadius: 5, background: '#F0F9FF', color: '#0369A1', fontSize: 9, fontWeight: 700, cursor: 'pointer', lineHeight: '16px' }}>Edit</button>}</div>}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #F1F5F9', display: 'flex', gap: 6 }}>
          <ActionBtn icon={Shield}  label="Role"       accent={cfg.accent}  accentBg={cfg.accentBg} onClick={() => onRoleClick(u)} />
          <ActionBtn icon={Package} label="Assets"     accent="#0284C7"     accentBg="#F0F9FF"       onClick={() => setFlipped(true)} />
          {u.isActive
            ? <ActionBtn icon={UserX}     label="Deactivate" accent="#D97706" accentBg="#FFFBEB" onClick={() => onToggleStatus(u._id, true)} />
            : <ActionBtn icon={RotateCcw} label="Activate"   accent="#059669" accentBg="#F0FDF4" onClick={() => onToggleStatus(u._id, false)} />
          }
        </div>
      </div>
      </div>

      <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: 16, background: '#FFFFFF' }}>
        <div style={{ height: 3, background: '#0284C7' }} />
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Assets & NOC</p>
            <button onClick={() => setFlipped(false)} style={{ border: '1px solid #E2E8F0', background: '#fff', borderRadius: 8, cursor: 'pointer', padding: '4px 8px', fontSize: 11, fontWeight: 700, color: '#475569' }}>Back</button>
          </div>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '10px 12px', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#334155' }}>{u.name}</p>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#0284C7', fontWeight: 700 }}>{accessoryCount} asset{accessoryCount !== 1 ? 's' : ''} assigned</p>
            <div style={{ marginTop: 6 }}>
              {previewAssets.length === 0 ? (
                <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>No assets assigned yet</p>
              ) : (
                previewAssets.map(a => (
                  <p key={a._id} style={{ margin: 0, fontSize: 11, color: '#334155', fontWeight: 600 }}>
                    {a.name}{a.serialNumber ? ` · ${a.serialNumber}` : ''}
                  </p>
                ))
              )}
              {accessoryCount > previewAssets.length && (
                <p style={{ margin: 0, fontSize: 10, color: '#64748B' }}>+{accessoryCount - previewAssets.length} more</p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => onAccessories(u)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #BAE6FD', background: '#F0F9FF', color: '#0369A1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              View / Edit Assets
            </button>
            {canRaiseNoc && (
              <button onClick={() => onRaiseNoc(u)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #FDE68A', background: '#FFFBEB', color: '#B45309', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Raise NOC
              </button>
            )}
            {!canManageAssets && (
              <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>You can view only.</p>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
    </div>
  );
}

function RoleSection({ role, users, me, canManageAssets, canRaiseNoc, canEditEmpId, onRoleClick, onAccessories, onRaiseNoc, onToggleStatus, onDelete, onEditEmpId }) {
  const [collapsed, setCollapsed] = useState(false);
  const cfg  = ROLE_CFG[role];
  const Icon = cfg.icon;
  if (users.length === 0) return null;
  return (
    <div style={{ marginBottom: 32 }}>
      <button onClick={() => setCollapsed(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', marginBottom: collapsed ? 0 : 16, padding: '6px 0' }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: cfg.accentBg, border: `1px solid ${cfg.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={15} style={{ color: cfg.accent }} />
        </div>
        <div style={{ textAlign: 'left', flex: 1 }}><p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{cfg.label}</p></div>
        <span style={{ fontSize: 11, fontWeight: 700, background: cfg.accentBg, color: cfg.accent, border: `1px solid ${cfg.accentBorder}`, padding: '2px 10px', borderRadius: 999 }}>{users.length}</span>
        {collapsed ? <ChevronDown size={16} style={{ color: '#94A3B8' }} /> : <ChevronUp size={16} style={{ color: '#94A3B8' }} />}
      </button>
      {!collapsed && <div style={{ height: 2, background: `linear-gradient(90deg,${cfg.accent}40,transparent)`, borderRadius: 999, marginBottom: 14 }} />}
      {!collapsed && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
          {users.map(u => (
            <UserCard key={u._id} u={u} me={me}
              canManageAssets={canManageAssets}
              canRaiseNoc={canRaiseNoc}
              canEditEmpId={canEditEmpId}
              onRoleClick={onRoleClick} onAccessories={onAccessories}
              onRaiseNoc={onRaiseNoc}
              onToggleStatus={onToggleStatus} onDelete={onDelete}
              onEditEmpId={onEditEmpId} />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function UsersPage() {
  const { user: me, isAdmin, isManager, isHR } = useAuth();
  const { socketRef, setPendingUsersCount } = useNotifications();
  const canManageAssets = isAdmin || isManager || isHR;
  const canRaiseNoc = isAdmin || isManager;
  const canReviewNoc = isAdmin || isHR;
  const canEditEmpId = isAdmin || isManager || isHR;
  const [users, setUsers]           = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvingId, setApprovingId] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showRoleModal, setShowRoleModal]       = useState(null);
  const [newRole, setNewRole]                   = useState('');
  const [showAccessoriesModal, setShowAccessoriesModal] = useState(null);
  const [accessories, setAccessories]           = useState([]);
  const [accessoryForm, setAccessoryForm]       = useState({ name: '', serialNumber: '', notes: '', assignedDate: '' });
  const [editingAccessory, setEditingAccessory] = useState(null);
  const [showNocModal, setShowNocModal]         = useState(null);
  const [nocAssets, setNocAssets]               = useState([]);
  const [nocs, setNocs]                         = useState([]);
  const [nocForm, setNocForm] = useState({ accessoryName: '', serialNumber: '', issueType: 'damaged', description: '' });
  const [reviewComment, setReviewComment]       = useState('');
  const [showDeleteModal, setShowDeleteModal]   = useState(null);
  const [deleting, setDeleting]                 = useState(false);
  const [subPage, setSubPage]                   = useState('directory'); // 'directory' or 'noc'
  const [showEditEmpIdModal, setShowEditEmpIdModal] = useState(null); // user object or null

  const loadUsers = useCallback(() => {
    userAPI.getAll({ search, department: deptFilter })
      .then(res => setUsers(res.data.users || res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, deptFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // Load pending (unapproved) users
  const loadPending = useCallback(() => {
    userAPI.getPending()
      .then(res => setPendingUsers(res.data.users || []))
      .catch(() => setPendingUsers([]));
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);

  // ── Real-time pending list updates via socket ─────────────────────────────
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;

    // A new user just registered — add them to the pending list immediately
    const onRegistered = (data) => {
      // Fetch full user record so we have all fields (name, email, department, createdAt…)
      userAPI.getPending()
        .then(res => setPendingUsers(res.data.users || []))
        .catch(() => {});
    };

    // An admin/HR/manager approved a pending user — remove from pending, refresh active list
    const onApproved = ({ userId }) => {
      setPendingUsers(prev => prev.filter(u => String(u._id) !== String(userId)));
      loadUsers();
    };

    // A pending user was rejected — remove from pending list
    const onRejected = ({ userId }) => {
      setPendingUsers(prev => prev.filter(u => String(u._id) !== String(userId)));
    };

    socket.on('user:registered', onRegistered);
    socket.on('user:approved',   onApproved);
    socket.on('user:rejected',   onRejected);

    return () => {
      socket.off('user:registered', onRegistered);
      socket.off('user:approved',   onApproved);
      socket.off('user:rejected',   onRejected);
    };
  }, [socketRef, loadUsers]);

  const handleApprove = async (userId, approved) => {
    setApprovingId(userId);
    try {
      await userAPI.approveUser(userId, approved);
      setPendingUsers(prev => {
        const next = prev.filter(u => u._id !== userId);
        setPendingUsersCount(next.length); // keep sidebar badge in sync
        return next;
      });
      if (approved) {
        toast.success('User approved! They can now log in.');
        loadUsers(); // refresh active user list
      } else {
        toast.success('Registration rejected and removed.');
      }
    } catch (e) { toast.error(e.response?.data?.message || 'Action failed'); }
    finally { setApprovingId(null); }
  };

  useEffect(() => {
    nocAPI.getAll().then(res => setNocs(res.data.nocs || res.data.data || [])).catch(() => setNocs([]));
  }, []);

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
      toast.success('User permanently removed');
      setShowDeleteModal(null);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to delete user'); }
    finally { setDeleting(false); }
  };

  const openAccessories = async (u) => {
    setShowAccessoriesModal(u);
    try {
      const res = await userAPI.getAccessories(u._id);
      const nextAccessories = res.data?.accessories || [];
      setAccessories(nextAccessories);
      setUsers(prev => prev.map(x => String(x._id) === String(u._id) ? { ...x, accessories: nextAccessories } : x));
    } catch { setAccessories([]); toast.error('Failed to load accessories'); }
  };

  const addAccessory = async () => {
    if (!accessoryForm.name.trim()) { toast.error('Accessory name is required'); return; }
    try {
      const res = await userAPI.addAccessory(showAccessoriesModal._id, {
        name: accessoryForm.name, serialNumber: accessoryForm.serialNumber,
        notes: accessoryForm.notes, ...(accessoryForm.assignedDate ? { assignedAt: accessoryForm.assignedDate } : {}),
      });
      const nextAccessories = res.data?.accessories || [];
      setAccessories(nextAccessories);
      setUsers(prev => prev.map(x => String(x._id) === String(showAccessoriesModal._id) ? { ...x, accessories: nextAccessories } : x));
      setAccessoryForm({ name: '', serialNumber: '', notes: '', assignedDate: '' });
      toast.success('Accessory added');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const updateAccessory = async () => {
    if (!editingAccessory || !accessoryForm.name.trim()) return;
    try {
      const res = await userAPI.updateAccessory(showAccessoriesModal._id, editingAccessory._id, {
        name: accessoryForm.name,
        serialNumber: accessoryForm.serialNumber,
        notes: accessoryForm.notes,
        ...(accessoryForm.assignedDate ? { assignedAt: accessoryForm.assignedDate } : {}),
      });
      const nextAccessories = res.data?.accessories || [];
      setAccessories(nextAccessories);
      setUsers(prev => prev.map(x => String(x._id) === String(showAccessoriesModal._id) ? { ...x, accessories: nextAccessories } : x));
      setEditingAccessory(null);
      setAccessoryForm({ name: '', serialNumber: '', notes: '', assignedDate: '' });
      toast.success('Accessory updated');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const removeAccessory = async (accessoryId) => {
    try {
      const res = await userAPI.removeAccessory(showAccessoriesModal._id, accessoryId);
      const nextAccessories = res.data?.accessories || [];
      setAccessories(nextAccessories);
      setUsers(prev => prev.map(x => String(x._id) === String(showAccessoriesModal._id) ? { ...x, accessories: nextAccessories } : x));
      toast.success('Accessory removed');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const openNocForAsset = (user, asset) => {
    setShowNocModal(user);
    setNocAssets(Array.isArray(user?.accessories) ? user.accessories : []);
    setNocForm({
      accessoryName: asset?.name || '',
      serialNumber: asset?.serialNumber || '',
      issueType: 'damaged',
      description: '',
    });
  };

  const startEditAccessory = (a) => {
    setEditingAccessory(a);
    setAccessoryForm({
      name: a.name || '',
      serialNumber: a.serialNumber || '',
      notes: a.notes || '',
      assignedDate: a.assignedAt ? new Date(a.assignedAt).toISOString().slice(0, 10) : '',
    });
  };

  const raiseNoc = async () => {
    if (!showNocModal || !nocForm.accessoryName.trim() || !nocForm.description.trim()) {
      toast.error('Accessory and description are required');
      return;
    }
    try {
      const res = await nocAPI.create({ employeeId: showNocModal._id, ...nocForm });
      setNocs(prev => [res.data.noc, ...prev]);
      setShowNocModal(null);
      setNocForm({ accessoryName: '', serialNumber: '', issueType: 'damaged', description: '' });
      toast.success('NOC raised and sent to HR');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to raise NOC'); }
  };

  useEffect(() => {
    if (!showNocModal?._id) {
      setNocAssets([]);
      return;
    }
    userAPI.getAccessories(showNocModal._id)
      .then(res => setNocAssets(res.data?.accessories || []))
      .catch(() => setNocAssets([]));
  }, [showNocModal?._id]);

  const reviewNoc = async (id, status) => {
    try {
      const res = await nocAPI.review(id, { status, hrReviewComment: reviewComment });
      setNocs(prev => prev.map(n => n._id === id ? res.data.noc : n));
      setReviewComment('');
      toast.success(`NOC ${status}`);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to review NOC'); }
  };

  const deleteNoc = async (id) => {
    if (!window.confirm('Delete this NOC request? This cannot be undone.')) return;
    try {
      await nocAPI.delete(id);
      setNocs(prev => prev.filter(n => n._id !== id));
      toast.success('NOC deleted');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to delete NOC'); }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}><Spinner size="lg" /></div>;

  const departments = [...new Set(users.map(u => u.department).filter(Boolean))];
  const q = search.toLowerCase();
  const filtered = users.filter(u =>
    (!q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.department?.toLowerCase().includes(q))
    && (!deptFilter || u.department === deptFilter)
  );

  // Role-scoped visibility:
  // Admin → sees all roles
  // HR → sees managers + team_leads + employees (not admins, not other HR)
  // Manager → sees team_leads + employees only
  const visibleFiltered = filtered.filter(u => {
    if (isAdmin) return true;
    if (isHR)      return ['manager', 'team_lead', 'employee'].includes(u.role);
    if (isManager) return ['team_lead', 'employee'].includes(u.role);
    return false;
  });

  const byRole = {
    admin:     isAdmin ? visibleFiltered.filter(u => u.role === 'admin')     : [],
    manager:   (isAdmin || isHR) ? visibleFiltered.filter(u => u.role === 'manager')   : [],
    hr:        isAdmin ? visibleFiltered.filter(u => u.role === 'hr')        : [],
    team_lead: visibleFiltered.filter(u => u.role === 'team_lead'),
    employee:  visibleFiltered.filter(u => u.role === 'employee'),
  };
  const totalActive   = visibleFiltered.filter(u => u.isActive !== false).length;
  const totalInactive = visibleFiltered.filter(u => u.isActive === false).length;

  const roleProps = {
    me,
    canManageAssets,
    canRaiseNoc,
    canEditEmpId,
    onRoleClick:     u => { setShowRoleModal(u); setNewRole(u.role); },
    onAccessories:   openAccessories,
    onRaiseNoc:      u => setShowNocModal(u),
    onToggleStatus:  handleToggleStatus,
    onDelete:        setShowDeleteModal,
    onEditEmpId:     u => setShowEditEmpIdModal(u),
  };

  return (
    <div style={{ padding: '0 0 40px' }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#64748B' }}>
          {subPage === 'noc' 
            ? 'Organisation' 
            : (isAdmin ? 'Admin Panel' : isManager ? 'Manager Panel' : 'HR Panel')}
        </p>
        <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 800, color: '#0F172A', lineHeight: 1.15 }}>
          {subPage === 'noc' ? 'NOC Requests' : 'Team Directory'}
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748B' }}>
          {subPage === 'noc' ? (
            <>
              {nocs.length} request{nocs.length !== 1 ? 's' : ''} &nbsp;·&nbsp;
              <span style={{ color: '#059669', fontWeight: 600 }}>{nocs.filter(n => n.status === 'approved').length} approved</span> &nbsp;·&nbsp;
              <span style={{ color: '#D97706', fontWeight: 600 }}>{nocs.filter(n => n.status === 'pending').length} pending</span>
            </>
          ) : (
            <>
              {visibleFiltered.length} member{visibleFiltered.length !== 1 ? 's' : ''} &nbsp;·&nbsp;
              <span style={{ color: '#059669', fontWeight: 600 }}>{totalActive} active</span>
              {totalInactive > 0 && <><span style={{ color: '#94A3B8' }}> · </span><span style={{ color: '#DC2626', fontWeight: 600 }}>{totalInactive} inactive</span></>}
              {pendingUsers.length > 0 && <><span style={{ color: '#94A3B8' }}> · </span><span style={{ color: '#D97706', fontWeight: 700 }}>{pendingUsers.length} awaiting approval</span></>}
            </>
          )}
        </p>
      </div>

      {/* Tab Switcher */}
      {(isManager || isHR || isAdmin) && (
        <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid #E2E8F0', paddingBottom: 1, marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => setSubPage('directory')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              borderBottom: subPage === 'directory' ? '3px solid #2563EB' : '3px solid transparent',
              color: subPage === 'directory' ? '#2563EB' : '#64748B',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            Team Directory
          </button>
          <button
            type="button"
            onClick={() => setSubPage('noc')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              borderBottom: subPage === 'noc' ? '3px solid #2563EB' : '3px solid transparent',
              color: subPage === 'noc' ? '#2563EB' : '#64748B',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            NOC Requests
            {nocs.filter(n => n.status === 'pending').length > 0 && (
              <span style={{ fontSize: 10, background: '#DC2626', color: '#fff', padding: '1px 6px', borderRadius: 999, fontWeight: 800 }}>
                {nocs.filter(n => n.status === 'pending').length}
              </span>
            )}
          </button>
        </div>
      )}

      {subPage === 'directory' ? (
        <>
          {/* ── PENDING APPROVALS BANNER ── */}
          {pendingUsers.length > 0 && (
            <div style={{ marginBottom: 28, background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #FDE68A', background: '#FEF3C7', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={18} style={{ color: '#92400E' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#78350F' }}>Pending Approval Requests</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#92400E' }}>
                    {pendingUsers.length} account{pendingUsers.length !== 1 ? 's' : ''} awaiting your approval before they can access the dashboard
                  </p>
                </div>
                <span style={{ fontSize: 22, fontWeight: 800, color: '#B45309', background: '#FDE68A', borderRadius: 10, padding: '4px 14px' }}>
                  {pendingUsers.length}
                </span>
              </div>
              <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pendingUsers.map(u => (
                  <div key={u._id} style={{ background: '#fff', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#D97706,#B45309)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 14, flexShrink: 0 }}>
                      {(u.name || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{u.name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Mail size={11} />{u.email}
                        {u.department && <><span style={{ color: '#CBD5E1' }}>·</span><Building2 size={11} />{u.department}</>}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94A3B8' }}>
                        Registered {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        disabled={approvingId === u._id}
                        onClick={() => handleApprove(u._id, true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1px solid #A7F3D0', background: '#ECFDF5', color: '#065F46', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        <UserCheck size={13} /> Approve
                      </button>
                      <button
                        disabled={approvingId === u._id}
                        onClick={() => handleApprove(u._id, false)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1px solid #FECACA', background: '#FEF2F2', color: '#991B1B', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        <UserMinus size={13} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary pills — scoped by viewer role */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
            {Object.entries(ROLE_CFG).filter(([role]) => {
              // Admin sees all pills
              if (isAdmin) return true;
              // HR sees manager + team_lead + employee pills only
              if (isHR) return ['manager', 'team_lead', 'employee'].includes(role);
              // Manager sees team_lead + employee pills only
              if (isManager) return ['team_lead', 'employee'].includes(role);
              return false;
            }).map(([role, cfg]) => {
              const count = byRole[role]?.length || 0;
              const Icon  = cfg.icon;
              return (
                <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 12, background: cfg.accentBg, border: `1px solid ${cfg.accentBorder}` }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: cfg.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={14} style={{ color: '#fff' }} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{count}</p>
                    <p style={{ margin: 0, fontSize: 10, color: cfg.accent, fontWeight: 700, textTransform: 'capitalize' }}>{cfg.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input placeholder="Search by name, email or department…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 9, paddingBottom: 9, fontSize: 13, border: '1px solid #E2E8F0', borderRadius: 10, background: '#fff', color: '#0F172A', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              style={{ padding: '9px 12px', fontSize: 13, border: '1px solid #E2E8F0', borderRadius: 10, background: '#fff', color: '#334155', minWidth: 160 }}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {(search || deptFilter) && (
              <button onClick={() => { setSearch(''); setDeptFilter(''); }}
                style={{ padding: '9px 14px', fontSize: 12, fontWeight: 700, border: '1px solid #FECACA', borderRadius: 10, background: '#FEF2F2', color: '#DC2626', cursor: 'pointer' }}>
                Clear
              </button>
            )}
          </div>

          {/* Role sections */}
          {visibleFiltered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed #E2E8F0', borderRadius: 16 }}>
              <Users size={36} style={{ color: '#CBD5E1', margin: '0 auto 10px' }} />
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#64748B' }}>No users found</p>
            </div>
          ) : (
            <>
              <RoleSection role="admin"     users={byRole.admin}     {...roleProps} />
              <RoleSection role="manager"   users={byRole.manager}   {...roleProps} />
              <RoleSection role="hr"        users={byRole.hr}        {...roleProps} />
              <RoleSection role="team_lead" users={byRole.team_lead} {...roleProps} />
              <RoleSection role="employee"  users={byRole.employee}  {...roleProps} />
            </>
          )}
        </>
      ) : (
        /* subPage === 'noc' */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* NOC Header Card with stats */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {[
              { label: 'Pending NOCs', count: nocs.filter(n => n.status === 'pending').length, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
              { label: 'Approved NOCs', count: nocs.filter(n => n.status === 'approved').length, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
              { label: 'Rejected NOCs', count: nocs.filter(n => n.status === 'rejected').length, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
            ].map(card => (
              <div key={card.label} style={{ flex: '1 1 200px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: card.bg, border: `1px solid ${card.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileWarning size={16} style={{ color: card.color }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{card.count}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#64748B', fontWeight: 600 }}>{card.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* NOC Requests List */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 3px 12px rgba(15,23,42,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0F172A' }}>All NOC Requests</h2>
                <p style={{ margin: '1px 0 0', fontSize: 11, color: '#64748B' }}>Non-Objection Certificates raised by managers</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '3px 10px', borderRadius: 999 }}>
                {nocs.length} total
              </span>
            </div>

            <div style={{ padding: '20px' }}>
              {nocs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 20px' }}>
                  <FileWarning size={36} style={{ color: '#CBD5E1', margin: '0 auto 10px' }} />
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#94A3B8' }}>No NOC requests yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '450px', overflowY: 'auto', paddingRight: 6 }}>
                  {nocs.map(n => (
                    <div key={n._id} style={{ border: `1px solid ${n.status === 'approved' ? '#A7F3D0' : n.status === 'rejected' ? '#FECACA' : '#FDE68A'}`, borderRadius: 12, padding: '12px 14px', background: n.status === 'approved' ? '#F0FDF4' : n.status === 'rejected' ? '#FEF2F2' : '#FFFBEB' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{n.employee?.name}</p>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', background: '#F1F5F9', border: '1px solid #E2E8F0', padding: '2px 7px', borderRadius: 999 }}>·</span>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#334155' }}>{n.accessoryName}</p>
                          </div>
                          <p style={{ margin: '0 0 4px', fontSize: 11, color: '#64748B' }}>
                            <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{n.issueType}</span>
                            {' · '}
                            Raised by {n.raisedBy?.name || 'Manager'}
                            {n.serialNumber && <> · Serial: <span style={{ fontFamily: 'monospace' }}>{n.serialNumber}</span></>}
                          </p>
                          <p style={{ margin: 0, fontSize: 12, color: '#334155' }}>{n.description}</p>
                          {n.hrReviewComment && (
                            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#475569', fontStyle: 'italic' }}>Review note: {n.hrReviewComment}</p>
                          )}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 999, textTransform: 'uppercase', flexShrink: 0, background: n.status === 'approved' ? '#ECFDF5' : n.status === 'rejected' ? '#FEF2F2' : '#FFFBEB', color: n.status === 'approved' ? '#059669' : n.status === 'rejected' ? '#DC2626' : '#B45309', border: `1px solid ${n.status === 'approved' ? '#A7F3D0' : n.status === 'rejected' ? '#FECACA' : '#FDE68A'}` }}>{n.status}</span>
                        {(canReviewNoc || canRaiseNoc) && (
                          <button onClick={() => deleteNoc(n._id)}
                            title="Delete NOC"
                            style={{ padding: '5px 7px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      {canReviewNoc && n.status === 'pending' && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <input value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Review note (optional)"
                            style={{ flex: '1 1 220px', minWidth: 160, padding: '7px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, outline: 'none' }} />
                          <button onClick={() => reviewNoc(n._id, 'approved')} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #A7F3D0', background: '#ECFDF5', color: '#059669', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✓ Approve</button>
                          <button onClick={() => reviewNoc(n._id, 'rejected')} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✕ Reject</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
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
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                <strong>Role permissions:</strong> Admin = full access · Manager = create projects &amp; teams · HR = view all, manage leaves · Employee = own tasks only
              </p>
            </div>
            <Select label="New Role" value={newRole} onChange={e => setNewRole(e.target.value)}>
              <option value="employee">Employee — own tasks only</option>
              <option value="hr">HR — view all, manage leaves (no project/team creation)</option>
              <option value="manager">Manager — create projects &amp; teams</option>
              <option value="admin">Admin — full system access</option>
            </Select>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowRoleModal(null)}>Cancel</Button>
              <Button onClick={handleRoleChange}>Update Role</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Accessories Modal */}
      <Modal open={!!showAccessoriesModal} onClose={() => setShowAccessoriesModal(null)} title={`Accessories — ${showAccessoriesModal?.name || ''}`} size="lg">
        {showAccessoriesModal && (
          <div className="space-y-5">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">{editingAccessory ? 'Edit Accessory' : 'Add New Accessory'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Accessory Name *" value={accessoryForm.name} onChange={e => setAccessoryForm(p => ({ ...p, name: e.target.value }))} placeholder="Laptop, ID Card, Headset…" />
                <Input label="Serial Number" value={accessoryForm.serialNumber} onChange={e => setAccessoryForm(p => ({ ...p, serialNumber: e.target.value }))} placeholder="Optional" />
                <Input label="Date Given" type="date" value={accessoryForm.assignedDate} onChange={e => setAccessoryForm(p => ({ ...p, assignedDate: e.target.value }))} />
                <Input label="Notes" value={accessoryForm.notes} onChange={e => setAccessoryForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
              </div>
              {canManageAssets && (
                <div className="flex justify-end mt-3 gap-2">
                  {editingAccessory && <Button variant="secondary" onClick={() => { setEditingAccessory(null); setAccessoryForm({ name: '', serialNumber: '', notes: '', assignedDate: '' }); }}>Cancel Edit</Button>}
                  <Button onClick={editingAccessory ? updateAccessory : addAccessory}><Package className="w-4 h-4" /> {editingAccessory ? 'Update Accessory' : 'Add Accessory'}</Button>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Assigned Accessories ({accessories.length})</p>
              <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {accessories.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-400"><Package className="w-8 h-8 text-slate-200 mx-auto mb-2" />No accessories yet.</div>
                ) : accessories.map(a => (
                  <div key={a._id} className="p-3.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{a.name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        {a.serialNumber && <p className="text-xs text-slate-500">Serial: <span className="font-mono">{a.serialNumber}</span></p>}
                        {a.assignedAt && <p className="text-xs text-slate-500">Given: {new Date(a.assignedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
                        {a.assignedBy?.name && <p className="text-xs text-slate-400">By: {a.assignedBy.name}</p>}
                      </div>
                      {a.notes && <p className="text-xs text-slate-500 mt-1 italic">{a.notes}</p>}
                    </div>
                    {canManageAssets && (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => startEditAccessory(a)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg shrink-0 transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {canRaiseNoc && (
                          <button onClick={() => openNocForAsset(showAccessoriesModal, a)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg shrink-0 transition-colors" title="Raise NOC">
                            <FileWarning className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => removeAccessory(a._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg shrink-0 transition-colors" title="Remove">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Raise NOC Modal */}
      <Modal open={!!showNocModal} onClose={() => setShowNocModal(null)} title={`Raise NOC — ${showNocModal?.name || ''}`} size="md">
        {showNocModal && (
          <div className="space-y-4">
            <Select label="Accessory Name *" value={nocForm.accessoryName} onChange={e => {
              const selectedName = e.target.value;
              const selected = (nocAssets || []).find(a => a.name === selectedName);
              setNocForm(p => ({
                ...p,
                accessoryName: selectedName,
                serialNumber: selected?.serialNumber || p.serialNumber,
              }));
            }}>
              <option value="">Select assigned item...</option>
              {(nocAssets || []).map(a => (
                <option key={a._id} value={a.name}>{a.name}{a.serialNumber ? ` · ${a.serialNumber}` : ''}</option>
              ))}
            </Select>
            <Input label="Serial Number" value={nocForm.serialNumber} onChange={e => setNocForm(p => ({ ...p, serialNumber: e.target.value }))} placeholder="Optional" />
            <Select label="Issue Type" value={nocForm.issueType} onChange={e => setNocForm(p => ({ ...p, issueType: e.target.value }))}>
              <option value="broken">Broken</option>
              <option value="damaged">Damaged</option>
              <option value="missing">Missing</option>
              <option value="other">Other</option>
            </Select>
            <Input label="Description *" value={nocForm.description} onChange={e => setNocForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the issue and return condition" />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowNocModal(null)}>Cancel</Button>
              <Button onClick={raiseNoc}>Raise NOC</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Employee ID Modal — admin / manager / HR */}
      <EditEmployeeIdModal
        open={!!showEditEmpIdModal}
        onClose={() => setShowEditEmpIdModal(null)}
        user={showEditEmpIdModal}
        onSave={updatedUser => {
          setUsers(prev => prev.map(u => u._id === updatedUser._id ? { ...u, employeeId: updatedUser.employeeId } : u));
        }}
      />

      {/* Delete Modal — admin only */}
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
              <p className="text-xs text-amber-700">This will permanently delete <strong>{showDeleteModal.name}</strong>'s account. This cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowDeleteModal(null)}>Cancel</Button>
              <button onClick={handleDeleteUser} disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />{deleting ? 'Removing…' : 'Permanently Remove'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

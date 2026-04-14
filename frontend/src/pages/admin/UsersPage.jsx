import { useState, useEffect } from 'react';
import { userAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Select, Badge, Avatar, Empty, Spinner, PageHeader } from '../../components/ui';
import { Plus, Search, Users as UsersIcon, Shield, MoreVertical, UserX, UserCheck } from 'lucide-react';

const ROLE_V = { admin: 'danger', manager: 'warning', employee: 'default' };

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(null);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    userAPI.getAll({ search, role: roleFilter, department: deptFilter })
      .then(res => setUsers(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, roleFilter, deptFilter]);

  const handleRoleChange = async () => {
    try {
      await userAPI.changeRole(showRoleModal._id, newRole);
      setUsers(prev => prev.map(u => u._id === showRoleModal._id ? { ...u, role: newRole } : u));
      setShowRoleModal(null);
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
  };

  const handleToggleStatus = async (userId) => {
    try {
      const res = await userAPI.toggleStatus(userId);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isActive: res.data.data?.isActive ?? !u.isActive } : u));
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  const departments = [...new Set(users.map(u => u.department).filter(Boolean))];

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="User Management"
        subtitle={`${users.length} team member${users.length !== 1 ? 's' : ''}`}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-300" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Users grid */}
      {users.length === 0
        ? <Empty icon={UsersIcon} title="No users found" description="Try adjusting your filters" />
        : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {users.map(u => (
              <Card key={u._id} className="p-5">
                <div className="flex items-start gap-3">
                  <Avatar name={u.name} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">{u.name}</h3>
                      {!u.isActive && <span className="w-2 h-2 bg-red-400 rounded-full" title="Inactive" />}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant={ROLE_V[u.role]}>{u.role}</Badge>
                      {u.department && <Badge>{u.department}</Badge>}
                    </div>
                    {u.designation && <p className="text-xs text-slate-400 mt-1">{u.designation}</p>}
                    {u.employeeId && <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{u.employeeId}</p>}
                  </div>
                  {/* Actions */}
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="xs" onClick={() => { setShowRoleModal(u); setNewRole(u.role); }}>
                      <Shield className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="xs" onClick={() => handleToggleStatus(u._id)}>
                      {u.isActive
                        ? <UserX className="w-3.5 h-3.5 text-red-500" />
                        : <UserCheck className="w-3.5 h-3.5 text-emerald-500" />}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
      }

      {/* Role Change Modal */}
      <Modal open={!!showRoleModal} onClose={() => setShowRoleModal(null)} title="Change User Role" size="sm">
        {showRoleModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-4">
              <Avatar name={showRoleModal.name} size="md" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{showRoleModal.name}</p>
                <p className="text-xs text-slate-500">{showRoleModal.email}</p>
              </div>
            </div>
            <Select label="Role" value={newRole} onChange={e => setNewRole(e.target.value)}>
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
    </div>
  );
}

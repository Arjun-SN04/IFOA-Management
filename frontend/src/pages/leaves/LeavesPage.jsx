import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { leaveAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Modal, Input, Avatar, Spinner, Alert } from '../../components/ui';
import {
  Plus, CalendarDays, Clock, CheckCircle, XCircle,
  AlertCircle, RotateCcw, ChevronRight, ChevronLeft,
  CalendarRange, Users, RefreshCw, ChevronUp, ChevronDown,
  Send, MousePointerClick, Search, X, Trash2, Mail, UserCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const B = {
  blue: '#2563EB', blueBg: '#EFF6FF', blueBorder: '#BFDBFE',
  emerald: '#059669', emeraldBg: '#ECFDF5', emeraldBorder: '#A7F3D0',
  amber: '#D97706', amberBg: '#FFFBEB', amberBorder: '#FDE68A',
  red: '#DC2626', redBg: '#FEF2F2', redBorder: '#FECACA',
  purple: '#7C3AED', purpleBg: '#F5F3FF', purpleBorder: '#DDD6FE',
  black: '#0F172A', blackMid: '#1E293B',
  slate: '#475569', slateMid: '#64748B', slateLight: '#94A3B8',
  border: '#E2E8F0', surface: '#FFFFFF', surfaceAlt: '#F8FAFC',
};

const STATUS_V = {
  pending:   { color: B.amber,   bg: B.amberBg,   border: B.amberBorder,   label: 'Pending',   icon: Clock },
  approved:  { color: B.emerald, bg: B.emeraldBg, border: B.emeraldBorder, label: 'Approved',  icon: CheckCircle },
  rejected:  { color: B.red,     bg: B.redBg,     border: B.redBorder,     label: 'Rejected',  icon: XCircle },
  cancelled: { color: B.slate,   bg: B.surfaceAlt,border: B.border,        label: 'Cancelled', icon: AlertCircle },
};

function getCalendarStatusView(leave, todayBase) {
  const isExpiredApproved =
    leave?.status === 'approved' && leave?.endDate && new Date(leave.endDate) < todayBase;
  if (isExpiredApproved) return { color: '#475569', bg: '#F1F5F9', border: '#CBD5E1', label: 'Completed' };
  const sv = STATUS_V[leave?.status] || STATUS_V.pending;
  return { color: sv.color, bg: sv.bg, border: sv.border, label: sv.label };
}

const AVATAR_COLORS = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#EC4899','#0EA5E9','#14B8A6'];
function nameColor(name) { return AVATAR_COLORS[(name || '').charCodeAt(0) % AVATAR_COLORS.length]; }
function initials(name) { return (name || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase(); }

// ── Shared Apply Leave Modal ──────────────────────────────────────────────────
// allowPastDates = true for HR/Admin (they can apply for historical dates)
function ApplyLeaveModal({ open, onClose, initialDate, onSubmit, isManager, allowPastDates = false }) {
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setSaving(false);
      if (initialDate) {
        setForm({ startDate: initialDate, endDate: initialDate, reason: '' });
      } else {
        setForm({ startDate: '', endDate: '', reason: '' });
      }
    }
  }, [open, initialDate]);

  const totalDays = useMemo(() => {
    if (!form.startDate || !form.endDate) return 0;
    const s = new Date(form.startDate), e = new Date(form.endDate);
    if (e < s) return 0;
    let count = 0;
    const cur = new Date(s);
    while (cur <= e) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }, [form.startDate, form.endDate]);

  const todayStr = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
  }, []);

  const handleSubmit = async () => {
    setError('');
    if (!form.startDate) { setError('Start date is required.'); return; }
    // Only enforce past-date restriction for non-admin/HR
    if (!allowPastDates && form.startDate < todayStr) { setError('Cannot apply leave for a past date.'); return; }
    if (!form.endDate) { setError('End date is required.'); return; }
    if (!allowPastDates && form.endDate < todayStr) { setError('End date cannot be in the past.'); return; }
    if (new Date(form.endDate) < new Date(form.startDate)) { setError('End date cannot be before start date.'); return; }
    if (!form.reason.trim()) { setError('Please provide a reason for leave.'); return; }
    setSaving(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to submit leave request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isManager ? 'Apply / Request Leave' : 'Apply for Leave'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <Alert variant="error">{error}</Alert>}
        {initialDate && (
          <div style={{ background: B.blueBg, border: `1px solid ${B.blueBorder}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarDays size={14} style={{ color: B.blue, flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 12, color: B.blue, fontWeight: 600 }}>
              Selected: {new Date(initialDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        )}
        {allowPastDates && (
          <div style={{ background: B.amberBg, border: `1px solid ${B.amberBorder}`, borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ margin: 0, fontSize: 12, color: B.amber, fontWeight: 600 }}>
              ✓ HR/Admin privilege: past dates are allowed for this leave entry.
            </p>
          </div>
        )}
        {isManager && !allowPastDates && (
          <div style={{ background: B.blueBg, border: `1px solid ${B.blueBorder}`, borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ margin: 0, fontSize: 12, color: B.blue, fontWeight: 600 }}>
              As a manager, your leave request will be reviewed by HR before approval.
            </p>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Start Date" type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} required />
          <Input label="End Date" type="date" min={form.startDate || undefined} value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} required />
        </div>
        {totalDays > 0 && (
          <div style={{ background: B.surfaceAlt, border: `1px solid ${B.border}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={14} style={{ color: B.slateMid, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: B.slate, fontWeight: 500 }}>
              {totalDays} working day{totalDays !== 1 ? 's' : ''}
              {form.startDate === form.endDate ? ' (same day)' : ` (${form.startDate} → ${form.endDate})`}
            </span>
          </div>
        )}
        {form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate) && (
          <div style={{ background: B.redBg, border: `1px solid ${B.redBorder}`, borderRadius: 10, padding: '8px 12px' }}>
            <p style={{ margin: 0, fontSize: 12, color: B.red, fontWeight: 600 }}>End date cannot be before start date.</p>
          </div>
        )}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: B.black, marginBottom: 6 }}>
            Reason <span style={{ color: B.red }}>*</span>
          </label>
          <textarea
            value={form.reason}
            onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
            rows={3}
            placeholder="Briefly describe the reason for your leave…"
            style={{ width: '100%', padding: '10px 14px', border: `1px solid ${B.border}`, borderRadius: 10, fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving}>
            {isManager ? 'Submit Request to HR' : 'Submit Request'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Set Leave on Behalf of Employee (HR/Admin popup) ─────────────────────────
function SetEmployeeLeaveModal({ open, onClose, allUsers, onSubmit, initialDate }) {
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '', status: 'approved' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedUser(null);
      setError('');
      setSaving(false);
      const d = initialDate || '';
      setForm({ startDate: d, endDate: d, reason: '', status: 'approved' });
    }
  }, [open, initialDate]);

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allUsers.slice(0, 20);
    return allUsers.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [allUsers, search]);

  const totalDays = useMemo(() => {
    if (!form.startDate || !form.endDate) return 0;
    const s = new Date(form.startDate), e = new Date(form.endDate);
    if (e < s) return 0;
    let count = 0;
    const cur = new Date(s);
    while (cur <= e) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }, [form.startDate, form.endDate]);

  const handleSubmit = async () => {
    setError('');
    if (!selectedUser) { setError('Please select an employee.'); return; }
    if (!form.startDate) { setError('Start date is required.'); return; }
    if (!form.endDate) { setError('End date is required.'); return; }
    if (new Date(form.endDate) < new Date(form.startDate)) { setError('End date cannot be before start date.'); return; }
    if (!form.reason.trim()) { setError('Please provide a reason.'); return; }
    setSaving(true);
    try {
      await onSubmit({ employeeId: selectedUser._id, ...form });
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to set leave.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Set Leave on Behalf of Employee">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <Alert variant="error">{error}</Alert>}

        {/* Info banner */}
        <div style={{ background: B.blueBg, border: `1px solid ${B.blueBorder}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserCheck size={14} style={{ color: B.blue, flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 12, color: B.blue, fontWeight: 600 }}>
            Set leave directly for any employee — past or future dates allowed. The leave will appear in their My Calendar and My Leaves.
          </p>
        </div>

        {/* Employee search */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: B.black, marginBottom: 6 }}>
            Employee <span style={{ color: B.red }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            {selectedUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: `1.5px solid ${B.blue}`, borderRadius: 10, background: B.blueBg }}>
                <div style={{ width: 32, height: 32, borderRadius: 999, background: nameColor(selectedUser.name), color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {initials(selectedUser.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: B.black }}>{selectedUser.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: B.slateMid }}>{selectedUser.department || selectedUser.email}</p>
                </div>
                <button onClick={() => { setSelectedUser(null); setSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: B.slateLight, display: 'flex', padding: 4, borderRadius: 6 }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', border: `1.5px solid ${B.border}`, borderRadius: 10, padding: '10px 14px', gap: 8, background: '#fff' }}>
                  <Search size={14} style={{ color: B.slateLight, flexShrink: 0 }} />
                  <input
                    value={search}
                    onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search by name, email or department…"
                    style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: B.black, width: '100%' }}
                    autoComplete="off"
                  />
                  {search && <button onClick={() => { setSearch(''); setShowDropdown(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: B.slateLight, display: 'flex', padding: 0 }}><X size={12} /></button>}
                </div>
                {showDropdown && filteredUsers.length > 0 && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: `1px solid ${B.border}`, borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.12)', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
                    {filteredUsers.map(u => (
                      <div key={u._id}
                        onClick={() => { setSelectedUser(u); setSearch(''); setShowDropdown(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${B.border}` }}
                        onMouseEnter={e => e.currentTarget.style.background = B.surfaceAlt}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ width: 30, height: 30, borderRadius: 999, background: nameColor(u.name), color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {initials(u.name)}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: B.black }}>{u.name}</p>
                          <p style={{ margin: 0, fontSize: 11, color: B.slateMid }}>{u.department || u.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {showDropdown && <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowDropdown(false)} />}
              </>
            )}
          </div>
        </div>

        {/* Date range */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Start Date" type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} required />
          <Input label="End Date" type="date" min={form.startDate || undefined} value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} required />
        </div>

        {totalDays > 0 && (
          <div style={{ background: B.surfaceAlt, border: `1px solid ${B.border}`, borderRadius: 10, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={13} style={{ color: B.slateMid }} />
            <span style={{ fontSize: 12, color: B.slate, fontWeight: 500 }}>
              {totalDays} working day{totalDays !== 1 ? 's' : ''} ({form.startDate} → {form.endDate})
            </span>
          </div>
        )}

        {/* Leave status */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: B.black, marginBottom: 6 }}>Leave Status</label>
          <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
            style={{ width: '100%', padding: '10px 14px', border: `1px solid ${B.border}`, borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff' }}>
            <option value="approved">Approved (direct)</option>
            <option value="pending">Pending (needs review)</option>
          </select>
        </div>

        {/* Reason */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: B.black, marginBottom: 6 }}>
            Reason <span style={{ color: B.red }}>*</span>
          </label>
          <textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} rows={3}
            placeholder="Reason for leave…"
            style={{ width: '100%', padding: '10px 14px', border: `1px solid ${B.border}`, borderRadius: 10, fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving}>Set Leave</Button>
        </div>
      </div>
    </Modal>
  );
}

function StatCard({ label, value, icon: Icon, color, bg, border }) {
  return (
    <motion.div whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(15,23,42,0.10)' }} transition={{ duration: 0.22 }}
      style={{ background: B.surface, borderRadius: 14, border: `1px solid ${B.border}`, padding: '12px 14px', boxShadow: '0 4px 16px rgba(15,23,42,0.05)', cursor: 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={17} style={{ color }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: B.black, lineHeight: 1 }}>{value}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: B.slateMid, fontWeight: 500 }}>{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }) {
  const sv = STATUS_V[status] || STATUS_V.pending;
  const Icon = sv.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: sv.bg, color: sv.color, border: `1px solid ${sv.border}`, fontSize: 11, fontWeight: 700 }}>
      <Icon size={11} />{sv.label}
    </span>
  );
}

// ── Self-Leave Calendar (for HR / Manager "My Leaves" tab) ─────────────────────
function SelfLeaveCalendar({ leaves, onMarkLeave, onRefresh, refreshing, isManager, onApplyLeave }) {
  const today = new Date();
  const todayBase = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()), []);
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(null);
  const [markModal, setMarkModal] = useState(null);
  const [markReason, setMarkReason] = useState('');
  const [marking, setMarking] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const dayMap = useMemo(() => {
    const map = {};
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
    for (const leave of (leaves || [])) {
      if (!leave?.startDate || !leave?.endDate) continue;
      const s = new Date(leave.startDate);
      const e = new Date(leave.endDate);
      const loopStart = new Date(Math.max(s.getTime(), monthStart.getTime()));
      const loopEnd = new Date(Math.min(e.getTime(), monthEnd.getTime()));
      for (let d = new Date(loopStart); d <= loopEnd; d.setDate(d.getDate() + 1)) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(leave);
      }
    }
    return map;
  }, [leaves, year, month]);

  const prevMonth = () => { setSelectedDay(null); setCurrentDate(new Date(year, month - 1, 1)); };
  const nextMonth = () => { setSelectedDay(null); setCurrentDate(new Date(year, month + 1, 1)); };
  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dateStr = (day) => {
    const d = new Date(year, month, day);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  const handleDayClick = (day) => {
    const clickedDate = new Date(year, month, day);
    const isPast = clickedDate < todayBase;
    const dayLeaves = dayMap[day] || [];
    if (dayLeaves.length > 0) {
      setSelectedDay(selectedDay === day ? null : day);
    } else if (!isPast) {
      setMarkReason('');
      setMarkModal({ date: dateStr(day), mode: 'mark' });
    }
  };

  const handleMark = async () => {
    if (!markModal) return;
    setMarking(true);
    try {
      const asRequest = markModal.mode === 'request';
      await onMarkLeave(markModal.date, markReason || 'Self-marked leave', asRequest);
      setMarkModal(null);
      setMarkReason('');
    } catch {}
    finally { setMarking(false); }
  };

  const selectedDayLeaves = selectedDay ? (dayMap[selectedDay] || []) : [];
  const myPending = (leaves || []).filter(l => l.status === 'pending').length;
  const myApproved = (leaves || []).filter(l => l.status === 'approved').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <MousePointerClick size={16} style={{ color: B.emerald, flexShrink: 0 }} />
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#065F46' }}>
            {isManager ? 'Click any empty day to mark leave directly or request HR approval.' : 'Click any empty day to instantly mark yourself as on leave.'}
          </p>
          <p style={{ margin: '1px 0 0', fontSize: 11, color: '#059669' }}>Click a day with a leave chip to view details.</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { label: 'Pending', value: myPending, color: B.amber, bg: B.amberBg },
          { label: 'Approved', value: myApproved, color: B.emerald, bg: B.emeraldBg },
          { label: 'Total this month', value: Object.keys(dayMap).length, color: B.blue, bg: B.blueBg },
        ].map(s => (
          <div key={s.label} style={{ flex: '1 1 120px', background: '#fff', borderRadius: 12, border: `1px solid ${B.border}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarDays size={14} style={{ color: s.color }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: B.black }}>{s.value}</p>
              <p style={{ margin: 0, fontSize: 11, color: B.slateMid }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${B.border}`, overflow: 'hidden', boxShadow: '0 3px 12px rgba(15,23,42,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: `1px solid ${B.border}`, background: B.surfaceAlt, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: B.blueBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarRange size={16} style={{ color: B.blue }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: B.black }}>{monthName}</p>
              <p style={{ margin: 0, fontSize: 11, color: B.slateMid }}>My Leave Calendar · {(leaves || []).length} total</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onRefresh && <button onClick={onRefresh} style={{ padding: '7px 9px', borderRadius: 9, border: `1px solid ${B.border}`, background: '#fff', cursor: 'pointer', color: B.blue, display: 'flex', opacity: refreshing ? 0.6 : 1 }}><RefreshCw size={14} /></button>}
            <button onClick={prevMonth} style={{ padding: '7px 9px', borderRadius: 9, border: `1px solid ${B.border}`, background: '#fff', cursor: 'pointer', color: B.slate, display: 'flex' }}><ChevronLeft size={15} /></button>
            <button onClick={() => { setSelectedDay(null); setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1)); }} style={{ padding: '6px 12px', borderRadius: 9, border: `1px solid ${B.border}`, background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: B.blue }}>Today</button>
            <button onClick={nextMonth} style={{ padding: '7px 9px', borderRadius: 9, border: `1px solid ${B.border}`, background: '#fff', cursor: 'pointer', color: B.slate, display: 'flex' }}><ChevronRight size={15} /></button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: B.surfaceAlt, borderBottom: `1px solid ${B.border}` }}>
          {DAYS_OF_WEEK.map(d => <div key={d} style={{ textAlign: 'center', padding: '8px 0', fontSize: 10, fontWeight: 800, color: B.slateLight, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={`blank-${idx}`} style={{ minHeight: 90, borderBottom: `1px solid ${B.border}`, borderRight: (idx+1)%7===0 ? 'none' : `1px solid ${B.border}`, background: '#FAFAFA' }} />;
            const dayLeaves = dayMap[day] || [];
            const hasLeaves = dayLeaves.length > 0;
            const isTod = isToday(day);
            const isSelected = selectedDay === day;
            const isPastDay = new Date(year, month, day) < todayBase;
            const hasPending = dayLeaves.some(l => l.status === 'pending');
            const hasApproved = dayLeaves.some(l => l.status === 'approved');
            const bgColor = isSelected ? '#DBEAFE' : hasApproved ? '#ECFDF5' : hasPending ? '#FFFBEB' : isPastDay ? '#F8FAFC' : '#fff';
            return (
              <div key={day} onClick={() => handleDayClick(day)}
                style={{ minHeight: 80, padding: '5px 4px', borderBottom: `1px solid ${B.border}`, borderRight: (idx+1)%7===0 ? 'none' : `1px solid ${B.border}`, background: bgColor, cursor: hasLeaves ? 'pointer' : isPastDay ? 'not-allowed' : 'pointer', outline: isSelected ? `2px solid ${B.blue}` : 'none', outlineOffset: -2, boxSizing: 'border-box', transition: 'background 0.1s', opacity: isPastDay && !hasLeaves ? 0.45 : 1 }}
                onMouseEnter={e => { if (!isSelected && !isPastDay) e.currentTarget.style.background = hasLeaves ? '#F0F9FF' : '#F0FDF4'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = bgColor; }}>
                <div style={{ width: 24, height: 24, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isTod ? B.blue : 'transparent', color: isTod ? '#fff' : B.black, fontSize: 11, fontWeight: isTod ? 800 : 600, marginBottom: 4 }}>{day}</div>
                {dayLeaves.slice(0, 2).map((leave, li) => {
                  const sv = getCalendarStatusView(leave, todayBase);
                  return (
                    <div key={(leave._id || li)} style={{ marginBottom: 3, borderRadius: 5, background: sv.bg, border: `1px solid ${sv.border}`, padding: '2px 4px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 5px', borderRadius: 3, background: sv.color, color: '#fff', fontSize: 8, fontWeight: 800, lineHeight: '14px', whiteSpace: 'nowrap' }}>{sv.label}</div>
                    </div>
                  );
                })}
                {dayLeaves.length > 2 && <div style={{ fontSize: 9, fontWeight: 700, color: B.blue, padding: '1px 4px', background: B.blueBg, borderRadius: 3, display: 'inline-block' }}>+{dayLeaves.length - 2}</div>}
                {!hasLeaves && !isPastDay && <div style={{ fontSize: 11, color: '#CBD5E1', fontWeight: 700, textAlign: 'center', paddingTop: 4 }}>+</div>}
              </div>
            );
          })}
        </div>
      </div>
      <AnimatePresence>
        {selectedDay && selectedDayLeaves.length > 0 && (
          <motion.div key={`day-${selectedDay}-${month}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ background: '#fff', borderRadius: 16, border: `1px solid ${B.border}`, padding: 14, boxShadow: '0 4px 14px rgba(15,23,42,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: B.black }}>{new Date(year, month, selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => onApplyLeave && onApplyLeave(dateStr(selectedDay))} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${B.blue}`, background: B.blueBg, color: B.blue, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={11} /> Apply Leave</button>
                <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: B.slateLight, fontSize: 18, fontWeight: 700, padding: '2px 6px', borderRadius: 6 }}>×</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedDayLeaves.map(leave => {
                const sv = getCalendarStatusView(leave, todayBase);
                const start = new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const end = new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return (
                  <div key={leave._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: sv.bg, border: `1px solid ${sv.border}` }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: B.black }}>{start} → {end} · {leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}</p>
                      {leave.reason && <p style={{ margin: '2px 0 0', fontSize: 11, color: B.slateMid, fontStyle: 'italic' }}>"{leave.reason}"</p>}
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: 4, background: sv.color, color: '#fff', fontSize: 10, fontWeight: 800 }}>{sv.label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingLeft: 4 }}>
        {[
          { label: 'Approved', color: B.emerald, bg: B.emeraldBg, border: B.emeraldBorder },
          { label: 'Pending', color: B.amber, bg: B.amberBg, border: B.amberBorder },
          { label: 'Rejected', color: B.red, bg: B.redBg, border: B.redBorder },
          { label: 'Completed', color: B.slate, bg: '#F1F5F9', border: '#CBD5E1' },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: s.bg, border: `1px solid ${s.border}` }} />
            <span style={{ fontSize: 11, color: B.slateMid, fontWeight: 500 }}>{s.label}</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <Modal open={!!markModal} onClose={() => setMarkModal(null)} title={markModal?.mode === 'request' ? 'Request Leave (HR Approval)' : 'Mark Day as Leave'}>
        {markModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: B.surfaceAlt, borderRadius: 12, padding: '12px 14px', border: `1px solid ${B.border}` }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: B.black }}>📅 {new Date(markModal.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
              {markModal.mode === 'request'
                ? <p style={{ margin: '3px 0 0', fontSize: 11, color: B.slateMid }}>This will be sent to HR for approval.</p>
                : <p style={{ margin: '3px 0 0', fontSize: 11, color: B.emerald, fontWeight: 600 }}>This will be marked as approved instantly.</p>}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: B.black, marginBottom: 6 }}>Reason <span style={{ color: B.slateMid, fontWeight: 400 }}>(optional)</span></label>
              <textarea value={markReason} onChange={e => setMarkReason(e.target.value)} rows={2} placeholder="e.g. Sick day, personal day…"
                style={{ width: '100%', padding: '10px 14px', border: `1px solid ${B.border}`, borderRadius: 10, fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            {isManager && (
              <div style={{ display: 'flex', gap: 8, background: '#F1F5F9', borderRadius: 10, padding: 4 }}>
                <button onClick={() => setMarkModal(m => ({ ...m, mode: 'mark' }))}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: markModal.mode === 'mark' ? '#fff' : 'transparent', color: markModal.mode === 'mark' ? B.emerald : B.slateMid, boxShadow: markModal.mode === 'mark' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
                  ✓ Mark Directly
                </button>
                <button onClick={() => setMarkModal(m => ({ ...m, mode: 'request' }))}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: markModal.mode === 'request' ? '#fff' : 'transparent', color: markModal.mode === 'request' ? B.blue : B.slateMid, boxShadow: markModal.mode === 'request' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
                  <Send size={11} style={{ display: 'inline', marginRight: 4 }} />Request HR
                </button>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="secondary" onClick={() => setMarkModal(null)}>Cancel</Button>
              <Button onClick={handleMark} loading={marking} style={{ background: markModal.mode === 'request' ? B.blue : B.emerald }}>
                {markModal.mode === 'request' ? 'Send Request' : 'Mark as Leave'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Team / Employee Leave Calendar ────────────────────────────────────────────
function LeaveCalendar({ leaves, allLeaves, onRefresh, refreshing, showEmployeeNames = true, onApplyLeave, onReview, onSetEmployeeLeave }) {
  const today = new Date();
  const todayBase = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()), []);
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [empFilter, setEmpFilter] = useState('all');
  const [showEmpDropdown, setShowEmpDropdown] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const sourceLeaves = (allLeaves && allLeaves.length > 0) ? allLeaves : (leaves || []);

  const empOptions = useMemo(() => {
    const map = new Map();
    for (const l of sourceLeaves) {
      const id = l.employee?._id || l.employee;
      const name = l.employee?.name || 'Unknown';
      if (id && !map.has(id)) map.set(id, name);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [sourceLeaves]);

  const filteredEmpOptions = useMemo(() => {
    if (!searchQuery.trim()) return empOptions;
    return empOptions.filter(([, name]) => name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [empOptions, searchQuery]);

  const activeEmpLabel = useMemo(() => empOptions.find(([id]) => id === empFilter)?.[1] || null, [empFilter, empOptions]);

  const relevantLeaves = useMemo(() => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
    return sourceLeaves.filter(l => {
      if (!l?.startDate || !l?.endDate) return false;
      if (filterStatus !== 'all' && l.status !== filterStatus) return false;
      if (empFilter !== 'all' && (l.employee?._id || l.employee) !== empFilter) return false;
      if (searchQuery && empFilter === 'all') {
        const name = (l.employee?.name || '').toLowerCase();
        if (!name.includes(searchQuery.toLowerCase())) return false;
      }
      return new Date(l.startDate) <= monthEnd && new Date(l.endDate) >= monthStart;
    });
  }, [sourceLeaves, year, month, filterStatus, empFilter, searchQuery]);

  const dayMap = useMemo(() => {
    const map = {};
    const monthEnd = new Date(year, month + 1, 0);
    for (const leave of relevantLeaves) {
      const s = new Date(leave.startDate);
      const e = new Date(leave.endDate);
      const loopStart = new Date(Math.max(s.getTime(), new Date(year, month, 1).getTime()));
      const loopEnd = new Date(Math.min(e.getTime(), monthEnd.getTime()));
      for (let d = new Date(loopStart); d <= loopEnd; d.setDate(d.getDate() + 1)) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(leave);
      }
    }
    return map;
  }, [relevantLeaves, year, month]);

  const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedDayLeaves = selectedDay ? (dayMap[selectedDay] || []) : [];
  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const uniqueEmps = new Set(relevantLeaves.map(l => l.employee?._id || l.employee)).size;

  const dateStr = (day) => {
    const d = new Date(year, month, day);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  const handleDayClick = (day) => {
    const dayLeaves = dayMap[day] || [];
    const clickedDate = new Date(year, month, day);
    const isPast = clickedDate < todayBase;
    if (dayLeaves.length > 0) {
      setSelectedDay(selectedDay === day ? null : day);
    } else if (onApplyLeave && !isPast) {
      onApplyLeave(dateStr(day));
    } else if (onSetEmployeeLeave) {
      // HR/Admin: clicking past/future empty day opens set-employee-leave
      onSetEmployeeLeave(dateStr(day));
    }
  };

  const handleLeaveCardClick = (leave) => {
    if (onReview && leave.status === 'pending') {
      onReview(leave);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* HR/Admin hint */}
      {onSetEmployeeLeave && (
        <div style={{ background: B.purpleBg, border: `1px solid ${B.purpleBorder}`, borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <UserCheck size={16} style={{ color: B.purple, flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: B.purple }}>HR/Admin: Click any empty date to set leave on behalf of an employee.</p>
            <p style={{ margin: '1px 0 0', fontSize: 11, color: '#7C3AED' }}>Click a day with leave chips to view or review requests. Past dates are allowed.</p>
          </div>
        </div>
      )}
      {!onSetEmployeeLeave && onApplyLeave && (
        <div style={{ background: B.blueBg, border: `1px solid ${B.blueBorder}`, borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <MousePointerClick size={16} style={{ color: B.blue, flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1E40AF' }}>Click any empty date to apply for leave on that day.</p>
            <p style={{ margin: '1px 0 0', fontSize: 11, color: B.blue }}>Click a date with leave chips to view details.</p>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { label: 'Employees on leave', value: uniqueEmps, color: B.blue, bg: B.blueBg },
          { label: 'Leave requests', value: relevantLeaves.length, color: B.emerald, bg: B.emeraldBg },
          { label: 'Days covered', value: Object.keys(dayMap).length, color: B.amber, bg: B.amberBg },
        ].map(s => (
          <div key={s.label} style={{ flex: '1 1 140px', background: '#fff', borderRadius: 12, border: `1px solid ${B.border}`, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={16} style={{ color: s.color }} /></div>
            <div>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: B.black }}>{s.value}</p>
              <p style={{ margin: 0, fontSize: 11, color: B.slateMid }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${B.border}`, overflow: 'hidden', boxShadow: '0 3px 12px rgba(15,23,42,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: `1px solid ${B.border}`, background: B.surfaceAlt, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: B.blueBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CalendarRange size={16} style={{ color: B.blue }} /></div>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: B.black }}>{monthName}</p>
              <p style={{ margin: 0, fontSize: 11, color: B.slateMid }}>Team Leave Calendar · {sourceLeaves.length} total</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', minWidth: 180, zIndex: 30 }}>
              <div style={{ display: 'flex', alignItems: 'center', border: `1.5px solid ${empFilter !== 'all' ? B.blue : B.border}`, borderRadius: 9, padding: '6px 10px', gap: 7, background: empFilter !== 'all' ? B.blueBg : '#fff' }}>
                <Search size={12} style={{ color: empFilter !== 'all' ? B.blue : B.slateLight, flexShrink: 0 }} />
                <input
                  value={empFilter !== 'all' ? (activeEmpLabel || '') : searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setEmpFilter('all'); setShowEmpDropdown(true); }}
                  onFocus={() => setShowEmpDropdown(true)}
                  readOnly={empFilter !== 'all'}
                  onClick={() => { if (empFilter !== 'all') { setEmpFilter('all'); setSearchQuery(''); setShowEmpDropdown(true); } }}
                  placeholder="Filter by employee…"
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 11, fontWeight: empFilter !== 'all' ? 700 : 400, color: empFilter !== 'all' ? B.blue : B.black, width: 120 }}
                />
                {(empFilter !== 'all' || searchQuery) && <button onClick={e => { e.stopPropagation(); setEmpFilter('all'); setSearchQuery(''); setShowEmpDropdown(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: B.slateLight, padding: 0, display: 'flex' }}><X size={11} /></button>}
              </div>
              {showEmpDropdown && filteredEmpOptions.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: `1px solid ${B.border}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,0.12)', zIndex: 50, maxHeight: 180, overflowY: 'auto' }}>
                  <div onClick={() => { setEmpFilter('all'); setSearchQuery(''); setShowEmpDropdown(false); }} style={{ padding: '7px 12px', fontSize: 11, fontWeight: 700, color: empFilter === 'all' ? B.blue : B.slateMid, cursor: 'pointer', borderBottom: `1px solid ${B.border}`, background: empFilter === 'all' ? B.blueBg : 'transparent' }}>All Employees</div>
                  {filteredEmpOptions.map(([id, name]) => (
                    <div key={id} onClick={() => { setEmpFilter(id); setSearchQuery(''); setShowEmpDropdown(false); }}
                      style={{ padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: empFilter === id ? B.blueBg : 'transparent', borderBottom: `1px solid ${B.border}` }}
                      onMouseEnter={e => { if (empFilter !== id) e.currentTarget.style.background = B.surfaceAlt; }}
                      onMouseLeave={e => { if (empFilter !== id) e.currentTarget.style.background = 'transparent'; }}>
                      <div style={{ width: 20, height: 20, borderRadius: 999, background: nameColor(name), color: '#fff', fontSize: 7, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials(name).slice(0, 1)}</div>
                      <span style={{ fontSize: 11, fontWeight: empFilter === id ? 700 : 500, color: empFilter === id ? B.blue : B.black }}>{name}</span>
                    </div>
                  ))}
                </div>
              )}
              {showEmpDropdown && <div style={{ position: 'fixed', inset: 0, zIndex: 25 }} onClick={() => setShowEmpDropdown(false)} />}
            </div>
            <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 10, padding: 3, gap: 2 }}>
              {[['all','All'],['pending','Pending'],['approved','Approved'],['rejected','Rejected']].map(([key, lbl]) => (
                <button key={key} onClick={() => setFilterStatus(key)} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: filterStatus === key ? '#fff' : 'transparent', color: filterStatus === key ? B.black : B.slateMid, boxShadow: filterStatus === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>{lbl}</button>
              ))}
            </div>
            {onRefresh && <button onClick={onRefresh} style={{ padding: '7px 9px', borderRadius: 9, border: `1px solid ${B.border}`, background: '#fff', cursor: 'pointer', color: B.blue, display: 'flex', opacity: refreshing ? 0.6 : 1 }}><RefreshCw size={14} /></button>}
            {/* HR/Admin: quick "Set Leave for Employee" button */}
            {onSetEmployeeLeave && (
              <button onClick={() => onSetEmployeeLeave(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: `1px solid ${B.purpleBorder}`, background: B.purpleBg, cursor: 'pointer', fontSize: 11, fontWeight: 700, color: B.purple }}>
                <UserCheck size={13} /> Set Employee Leave
              </button>
            )}
            <button onClick={() => { setSelectedDay(null); setCurrentDate(new Date(year, month - 1, 1)); }} style={{ padding: '7px 9px', borderRadius: 9, border: `1px solid ${B.border}`, background: '#fff', cursor: 'pointer', color: B.slate, display: 'flex' }}><ChevronLeft size={15} /></button>
            <button onClick={() => { setSelectedDay(null); setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1)); }} style={{ padding: '6px 12px', borderRadius: 9, border: `1px solid ${B.border}`, background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: B.blue }}>Today</button>
            <button onClick={() => { setSelectedDay(null); setCurrentDate(new Date(year, month + 1, 1)); }} style={{ padding: '7px 9px', borderRadius: 9, border: `1px solid ${B.border}`, background: '#fff', cursor: 'pointer', color: B.slate, display: 'flex' }}><ChevronRight size={15} /></button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: B.surfaceAlt, borderBottom: `1px solid ${B.border}` }}>
          {DAYS_OF_WEEK.map(d => <div key={d} style={{ textAlign: 'center', padding: '8px 0', fontSize: 10, fontWeight: 800, color: B.slateLight, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={`blank-${idx}`} style={{ minHeight: 100, borderBottom: `1px solid ${B.border}`, borderRight: (idx+1)%7===0 ? 'none' : `1px solid ${B.border}`, background: '#FAFAFA' }} />;
            const dayLeaves = dayMap[day] || [];
            const hasLeaves = dayLeaves.length > 0;
            const isTod = isToday(day);
            const isSelected = selectedDay === day;
            const isPastDay = new Date(year, month, day) < todayBase;
            // HR/Admin can interact with past days too
            const isClickable = hasLeaves || !!onApplyLeave || !!onSetEmployeeLeave;
            const hasPending = dayLeaves.some(l => l.status === 'pending');
            const hasApproved = dayLeaves.some(l => l.status === 'approved' && new Date(l.endDate) >= todayBase);
            const hasCompleted = dayLeaves.some(l => l.status === 'approved' && new Date(l.endDate) < todayBase);
            const bgColor = isSelected ? '#DBEAFE' : hasApproved ? '#ECFDF5' : hasCompleted ? '#F1F5F9' : hasPending ? '#FFFBEB' : isPastDay ? '#F8FAFC' : '#fff';
            return (
              <div key={day} onClick={() => handleDayClick(day)}
                style={{ minHeight: 84, padding: '5px 4px', borderBottom: `1px solid ${B.border}`, borderRight: (idx+1)%7===0 ? 'none' : `1px solid ${B.border}`, background: bgColor, cursor: isClickable ? 'pointer' : 'default', outline: isSelected ? `2px solid ${B.blue}` : 'none', outlineOffset: -2, boxSizing: 'border-box', transition: 'background 0.12s', opacity: isPastDay && !hasLeaves && !onSetEmployeeLeave ? 0.45 : 1 }}
                onMouseEnter={e => { if (!isSelected && isClickable) e.currentTarget.style.background = hasLeaves ? '#F0F9FF' : isPastDay ? '#F3F0FF' : '#F0FDF4'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = bgColor; }}>
                <div style={{ width: 24, height: 24, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isTod ? B.blue : 'transparent', color: isTod ? '#fff' : B.black, fontSize: 11, fontWeight: isTod ? 800 : 600, marginBottom: 4 }}>{day}</div>
                {dayLeaves.slice(0, 2).map((leave, li) => {
                  const sv = getCalendarStatusView(leave, todayBase);
                  const empName = leave.employee?.name || 'Unknown';
                  return (
                    <div key={(leave._id || li)} style={{ marginBottom: 3, borderRadius: 5, background: sv.bg, border: `1px solid ${sv.border}`, padding: '2px 4px 3px' }}>
                      {showEmployeeNames && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2 }}>
                          <div style={{ width: 12, height: 12, borderRadius: 999, flexShrink: 0, background: nameColor(empName), color: '#fff', fontSize: 6, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials(empName).slice(0, 1)}</div>
                          <span style={{ fontSize: 9, fontWeight: 700, color: B.black, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{empName.split(' ')[0]}</span>
                        </div>
                      )}
                      <div style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 5px', borderRadius: 3, background: sv.color, color: '#fff', fontSize: 8, fontWeight: 800, lineHeight: '14px', whiteSpace: 'nowrap' }}>{sv.label}</div>
                    </div>
                  );
                })}
                {dayLeaves.length > 2 && <div style={{ fontSize: 9, fontWeight: 700, color: B.blue, padding: '1px 4px', background: B.blueBg, borderRadius: 3, display: 'inline-block' }}>+{dayLeaves.length - 2} more</div>}
                {!hasLeaves && onSetEmployeeLeave && isPastDay && <div style={{ fontSize: 10, color: '#C4B5FD', fontWeight: 700, textAlign: 'center', paddingTop: 2, lineHeight: 1 }}>+</div>}
                {!hasLeaves && onApplyLeave && !isPastDay && <div style={{ fontSize: 13, color: '#CBD5E1', fontWeight: 700, textAlign: 'center', paddingTop: 2, lineHeight: 1 }}>+</div>}
              </div>
            );
          })}
        </div>
      </div>
      <AnimatePresence>
        {selectedDay && (
          <motion.div key={`day-${selectedDay}-${month}-${year}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ background: '#fff', borderRadius: 16, border: `1px solid ${B.border}`, padding: 14, boxShadow: '0 4px 14px rgba(15,23,42,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: B.blueBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CalendarDays size={16} style={{ color: B.blue }} /></div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: B.black }}>{new Date(year, month, selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  <p style={{ margin: 0, fontSize: 11, color: B.slateMid }}>{selectedDayLeaves.length} leave request{selectedDayLeaves.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* HR/Admin: set leave for employee from expanded day panel */}
                {onSetEmployeeLeave && (
                  <button onClick={() => onSetEmployeeLeave(dateStr(selectedDay))} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${B.purpleBorder}`, background: B.purpleBg, color: B.purple, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <UserCheck size={11} /> Set Employee Leave
                  </button>
                )}
                {onApplyLeave && <button onClick={() => onApplyLeave(dateStr(selectedDay))} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${B.blue}`, background: B.blueBg, color: B.blue, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={11} /> Apply Leave</button>}
                <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: B.slateLight, fontSize: 18, fontWeight: 700, padding: '4px 8px', borderRadius: 8 }}>×</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedDayLeaves.map(leave => {
                const sv = getCalendarStatusView(leave, todayBase);
                const empName = leave.employee?.name || 'Unknown';
                const start = new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const end = new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const isPending = leave.status === 'pending';
                return (
                  <div key={leave._id}
                    onClick={() => handleLeaveCardClick(leave)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: sv.bg, border: `1.5px solid ${isPending && onReview ? B.blue : sv.border}`, cursor: isPending && onReview ? 'pointer' : 'default', transition: 'box-shadow 0.15s' }}
                    onMouseEnter={e => { if (isPending && onReview) e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,99,235,0.18)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}>
                    {showEmployeeNames && <div style={{ width: 36, height: 36, borderRadius: 999, flexShrink: 0, background: nameColor(empName), color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials(empName)}</div>}
                    <div style={{ flex: 1 }}>
                      {showEmployeeNames && <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: B.black }}>{empName}</p>}
                      <p style={{ margin: 0, fontSize: 11, color: B.slate }}>{start} → {end} · {leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}</p>
                      {leave.reason && <p style={{ margin: '2px 0 0', fontSize: 11, color: B.slateMid, fontStyle: 'italic' }}>"{leave.reason}"</p>}
                      {isPending && onReview && <p style={{ margin: '4px 0 0', fontSize: 10, color: B.blue, fontWeight: 700 }}>Click to Review →</p>}
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: 4, background: sv.color, color: '#fff', fontSize: 10, fontWeight: 800 }}>{sv.label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingLeft: 4 }}>
        {[
          { label: 'Approved', color: B.emerald, bg: B.emeraldBg, border: B.emeraldBorder },
          { label: 'Completed', color: B.slate, bg: '#F1F5F9', border: '#CBD5E1' },
          { label: 'Pending', color: B.amber, bg: B.amberBg, border: B.amberBorder },
          { label: 'Rejected', color: B.red, bg: B.redBg, border: B.redBorder },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: s.bg, border: `1px solid ${s.border}` }} />
            <span style={{ fontSize: 11, color: B.slateMid, fontWeight: 500 }}>{s.label}</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function LeavesPage() {
  const { isHROrAbove, isAdmin, isManager, isHR, user } = useAuth();
  const [myLeaves, setMyLeaves] = useState([]);
  const [teamLeaves, setTeamLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('loading');
  const [showSummaryCards, setShowSummaryCards] = useState(false);

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyModalDate, setApplyModalDate] = useState(null);

  // "Set Leave for Employee" modal (HR/Admin from team calendar)
  const [setEmpLeaveOpen, setSetEmpLeaveOpen] = useState(false);
  const [setEmpLeaveDate, setSetEmpLeaveDate] = useState(null);

  const [showAdminAddLeave, setShowAdminAddLeave] = useState(false);
  const [adminLeaveForm, setAdminLeaveForm] = useState({ employeeId: '', startDate: '', endDate: '', reason: '', status: 'approved' });
  const [savingAdminLeave, setSavingAdminLeave] = useState(false);
  const [adminLeaveError, setAdminLeaveError] = useState('');
  const [allUsers, setAllUsers] = useState([]);

  const [reviewModal, setReviewModal] = useState(null);
  const [reviewNote, setReviewNote] = useState('');

  const [resetDayOfMonth, setResetDayOfMonth] = useState(1);
  const [lastResetMonthKey, setLastResetMonthKey] = useState('');
  const [savingReset, setSavingReset] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const myRes = await leaveAPI.getMy().catch(() => ({ data: { leaves: [] } }));
      const myData = myRes?.data?.leaves || myRes?.data?.data || [];
      setMyLeaves(myData);

      if (isHROrAbove) {
        const allRes = await leaveAPI.getAll({ limit: 500 }).catch(() => ({ data: { leaves: [] } }));
        const allData = allRes?.data?.leaves || allRes?.data?.data || [];
        setTeamLeaves(allData);
      }

      // Load all users for HR/Admin (needed for "Set Leave for Employee")
      if (isHROrAbove) {
        const [usersRes] = await Promise.all([
          import('../../api').then(m => m.userAPI.getAll()).catch(() => ({ data: { users: [] } })),
        ]);
        if (usersRes?.data) setAllUsers(usersRes.data.users || usersRes.data.data || []);
      }

      if (isAdmin) {
        const resetRes = await leaveAPI.getResetSettings().catch(() => null);
        if (resetRes?.data) {
          setResetDayOfMonth(resetRes.data.resetDayOfMonth || 1);
          setLastResetMonthKey(resetRes.data.lastResetMonthKey || '');
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isHROrAbove, isAdmin]);

  useEffect(() => { if (!user) return; loadData(false); }, [loadData, user]);

  useEffect(() => {
    if (!user) return;
    setTab(isHROrAbove ? 'team-calendar' : 'my-calendar');
  }, [user, isHROrAbove]);

  const intervalRef = useRef(null);
  useEffect(() => {
    if (!user) return;
    intervalRef.current = setInterval(() => loadData(true), 30000);
    return () => clearInterval(intervalRef.current);
  }, [loadData, user]);

  const handleRefresh = useCallback(() => loadData(true), [loadData]);

  // HR/Admin can open apply modal with past dates
  const openApplyModal = useCallback((date = null) => {
    // Only enforce future-date restriction for non-HR/Admin
    if (date && !isHROrAbove) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const picked = new Date(date + 'T00:00:00');
      if (picked < today) {
        toast.error('Cannot apply leave for a past date. Please select today or a future date.');
        return;
      }
    }
    setApplyModalDate(date);
    setApplyModalOpen(true);
  }, [isHROrAbove]);

  // HR/Admin: open set-employee-leave modal (from team calendar)
  const openSetEmpLeave = useCallback((date = null) => {
    setSetEmpLeaveDate(date);
    setSetEmpLeaveOpen(true);
  }, []);

  const handleApplyLeave = useCallback(async (form) => {
    const res = await leaveAPI.apply(form);
    const created = res.data?.leave || res.data?.data;
    if (created) {
      setMyLeaves(prev => [created, ...prev]);
      if (isHROrAbove) setTeamLeaves(prev => [created, ...prev]);
    }
    toast.success('Leave request submitted');
    setTimeout(() => loadData(true), 500);
  }, [isHROrAbove, loadData]);

  // HR/Admin sets leave on behalf of an employee
  const handleSetEmployeeLeave = useCallback(async (form) => {
    const res = await leaveAPI.adminCreate(form);
    const created = res.data?.leave || res.data?.data;
    if (created) setTeamLeaves(prev => [created, ...prev]);
    toast.success('Leave set for employee successfully');
    setTimeout(() => loadData(true), 500);
  }, [loadData]);

  const handleSelfMark = useCallback(async (date, reason, asRequest = false) => {
    try {
      const res = await leaveAPI.selfMark({ startDate: date, endDate: date, reason, asRequest });
      const created = res.data?.leave;
      if (created) {
        setMyLeaves(prev => [created, ...prev]);
        if (isHROrAbove) setTeamLeaves(prev => [created, ...prev]);
      }
      toast.success(asRequest ? 'Leave request sent to HR' : 'Day marked as leave');
      setTimeout(() => loadData(true), 500);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to mark leave');
      throw e;
    }
  }, [isHROrAbove, loadData]);

  const handleAdminCreateLeave = async () => {
    setAdminLeaveError('');
    if (!adminLeaveForm.employeeId || !adminLeaveForm.startDate || !adminLeaveForm.endDate || !adminLeaveForm.reason.trim()) {
      setAdminLeaveError('Please fill all required fields'); return;
    }
    setSavingAdminLeave(true);
    try {
      const res = await leaveAPI.adminCreate(adminLeaveForm);
      const created = res.data?.leave || res.data?.data;
      if (created) setTeamLeaves(prev => [created, ...prev]);
      setShowAdminAddLeave(false);
      setAdminLeaveForm({ employeeId: '', startDate: '', endDate: '', reason: '', status: 'approved' });
      toast.success('Leave added successfully');
      setTimeout(() => loadData(true), 500);
    } catch (e) {
      setAdminLeaveError(e.response?.data?.message || 'Failed to add leave');
    } finally { setSavingAdminLeave(false); }
  };

  const handleAdminDelete = useCallback(async (id) => {
    if (!window.confirm('Permanently remove this leave record? The employee will be notified.')) return;
    try {
      await leaveAPI.adminDelete(id);
      setMyLeaves(prev => prev.filter(l => l._id !== id));
      setTeamLeaves(prev => prev.filter(l => l._id !== id));
      toast.success('Leave record removed');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to remove leave'); }
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this leave request?')) return;
    try {
      const res = await leaveAPI.cancel(id);
      const updated = res.data?.leave || res.data?.data;
      const updater = l => l._id === id ? (updated || { ...l, status: 'cancelled' }) : l;
      setMyLeaves(prev => prev.map(updater));
      setTeamLeaves(prev => prev.map(updater));
      toast.success('Leave cancelled');
    } catch (e) { toast.error(e.response?.data?.message || 'Cancel failed'); }
  };

  const handleReview = async (status) => {
    try {
      const res = await leaveAPI.review(reviewModal._id, { status, reviewComment: reviewNote });
      const updated = res.data?.leave || res.data?.data;
      if (updated) {
        const updater = l => l._id === reviewModal._id ? updated : l;
        setTeamLeaves(prev => prev.map(updater));
        setMyLeaves(prev => prev.map(updater));
      }
      setReviewModal(null); setReviewNote('');
      toast.success(`Leave ${status}`);
    } catch (e) { toast.error(e.response?.data?.message || 'Review failed'); }
  };

  const handleSaveReset = async () => {
    setSavingReset(true);
    try {
      const res = await leaveAPI.updateResetSettings({ resetDayOfMonth });
      setResetDayOfMonth(res.data?.resetDayOfMonth || resetDayOfMonth);
      setLastResetMonthKey(res.data?.lastResetMonthKey || lastResetMonthKey);
      toast.success('Monthly reset date updated');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to save reset date'); }
    finally { setSavingReset(false); }
  };

  const teamDashboardLeaves = useMemo(
    () => teamLeaves.filter(l => l.status !== 'cancelled' && l.employee?._id !== user?._id),
    [teamLeaves, user]
  );

  if (loading || tab === 'loading') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
      <Spinner size="lg" />
    </div>
  );

  const summary = {
    pending:   myLeaves.filter(l => l.status === 'pending').length,
    approved:  myLeaves.filter(l => l.status === 'approved').length,
    rejected:  myLeaves.filter(l => l.status === 'rejected').length,
    cancelled: myLeaves.filter(l => l.status === 'cancelled').length,
  };

  const summaryCards = [
    { label: 'Pending',   value: summary.pending,   icon: Clock,        color: B.amber,   bg: B.amberBg,   border: B.amberBorder },
    { label: 'Approved',  value: summary.approved,  icon: CheckCircle,  color: B.emerald, bg: B.emeraldBg, border: B.emeraldBorder },
    { label: 'Rejected',  value: summary.rejected,  icon: XCircle,      color: B.red,     bg: B.redBg,     border: B.redBorder },
    ...(!isHROrAbove ? [{ label: 'Cancelled', value: summary.cancelled, icon: AlertCircle, color: B.slate, bg: B.surfaceAlt, border: B.border }] : []),
  ];

  const tabs = [
    { key: 'my-calendar', label: 'My Leaves', icon: CalendarRange },
    ...(isHROrAbove ? [
      { key: 'team-calendar', label: 'Team Calendar', icon: CalendarRange },
      { key: 'team', label: 'Team List' },
    ] : [
      { key: 'my', label: 'My List' },
    ]),
    ...(isAdmin ? [{ key: 'reset', label: 'Reset Schedule', icon: RotateCcw }] : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <section style={{ padding: '4px 2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: B.slateMid }}>HR Management</p>
          <h1 style={{ margin: '2px 0 0', fontSize: 26, fontWeight: 800, color: B.black, lineHeight: 1.1 }}>Leave <span style={{ color: B.blue }}>Management</span></h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: B.slateMid }}>
            {isHROrAbove ? 'Track your leaves and manage your team.' : 'Request leave and track approvals.'}
            {refreshing && <span style={{ marginLeft: 8, fontSize: 11, color: B.blue }}>↻ Syncing…</span>}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setShowSummaryCards(prev => !prev)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 9, border: `1px solid ${B.border}`, background: '#fff', color: B.slateMid, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {showSummaryCards ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showSummaryCards ? 'Hide Summary' : 'Show Summary'}
          </button>
          {isAdmin && (
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => { setAdminLeaveError(''); setShowAdminAddLeave(true); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: B.black, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(15,23,42,0.25)' }}>
              <Plus size={15} /> Add Leave
            </motion.button>
          )}
          {/* HR/Admin: Set Leave for Employee button in header */}
          {isHROrAbove && (
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => openSetEmpLeave(null)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: B.purple, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
              <UserCheck size={15} /> Set Employee Leave
            </motion.button>
          )}
          {/* HR cannot apply for leave — only employees and managers can */}
          {!isHR && (
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => openApplyModal(null)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: B.blue, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}>
              <Plus size={15} /> {isManager ? 'Apply / Request Leave' : 'Apply for Leave'}
            </motion.button>
          )}
        </div>
      </section>

      {showSummaryCards && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          {summaryCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <StatCard {...s} />
            </motion.div>
          ))}
        </div>
      )}

      <div style={{ borderBottom: `1px solid ${B.border}` }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', fontSize: 13, fontWeight: 600, border: 'none', borderBottom: `2px solid ${tab === key ? B.blue : 'transparent'}`, background: 'none', cursor: 'pointer', color: tab === key ? B.blue : B.slateMid, marginBottom: -1, transition: 'all 0.15s' }}>
              {Icon && <Icon size={14} />}{label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'my-calendar' && (
          <motion.div key="my-calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {isHROrAbove ? (
              <SelfLeaveCalendar leaves={myLeaves} onMarkLeave={handleSelfMark} isManager={isManager} onRefresh={handleRefresh} refreshing={refreshing} onApplyLeave={openApplyModal} />
            ) : (
              <LeaveCalendar leaves={myLeaves} allLeaves={myLeaves} showEmployeeNames={false} onRefresh={handleRefresh} refreshing={refreshing} onApplyLeave={openApplyModal} />
            )}
          </motion.div>
        )}
        {tab === 'my' && !isHROrAbove && (
          <motion.div key="my" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <LeaveList leaves={myLeaves} mine onCancel={handleCancel} />
          </motion.div>
        )}
        {tab === 'team' && isHROrAbove && (
          <motion.div key="team" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <LeaveList leaves={teamDashboardLeaves} showUser onReview={setReviewModal} onAdminDelete={isAdmin ? handleAdminDelete : null} />
          </motion.div>
        )}
        {tab === 'team-calendar' && isHROrAbove && (
          <motion.div key="team-calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <LeaveCalendar
              leaves={teamDashboardLeaves}
              allLeaves={teamDashboardLeaves}
              showEmployeeNames
              onRefresh={handleRefresh}
              refreshing={refreshing}
              onApplyLeave={!isHR ? openApplyModal : undefined}
              onReview={setReviewModal}
              onSetEmployeeLeave={openSetEmpLeave}
            />
          </motion.div>
        )}
        {tab === 'reset' && isAdmin && (
          <motion.div key="reset" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div style={{ maxWidth: 480, background: B.surface, borderRadius: 18, border: `1px solid ${B.border}`, padding: 24, boxShadow: '0 4px 16px rgba(15,23,42,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: B.blueBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RotateCcw size={16} style={{ color: B.blue }} /></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: B.black }}>Monthly Leave Reset</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: B.slateMid }}>All leave requests are cleared monthly on this date.</p>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', fontSize: 11, color: B.slateMid, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reset day of month (1–28)</label>
                <input type="number" min="1" max="28" value={resetDayOfMonth}
                  onChange={(e) => setResetDayOfMonth(Math.max(1, Math.min(28, parseInt(e.target.value, 10) || 1)))}
                  style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: `1px solid ${B.border}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <p style={{ fontSize: 11, color: B.slateLight, marginTop: 10 }}>Last reset month: {lastResetMonthKey || 'Not yet'}</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <Button onClick={handleSaveReset} loading={savingReset}>Save Reset Date</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Apply Leave Modal — past dates allowed for HR/Admin */}
      <ApplyLeaveModal
        open={applyModalOpen}
        onClose={() => { setApplyModalOpen(false); setApplyModalDate(null); }}
        initialDate={applyModalDate}
        onSubmit={handleApplyLeave}
        isManager={isManager && !isHR}
        allowPastDates={isHROrAbove}
      />

      {/* Set Leave for Employee Modal (HR/Admin) */}
      <SetEmployeeLeaveModal
        open={setEmpLeaveOpen}
        onClose={() => { setSetEmpLeaveOpen(false); setSetEmpLeaveDate(null); }}
        initialDate={setEmpLeaveDate}
        allUsers={allUsers}
        onSubmit={handleSetEmployeeLeave}
      />

      <Modal open={showAdminAddLeave} onClose={() => setShowAdminAddLeave(false)} title="Add Leave for Employee">
        <div className="space-y-4">
          {adminLeaveError && <Alert variant="error">{adminLeaveError}</Alert>}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: B.black, marginBottom: 6 }}>Employee <span style={{ color: B.red }}>*</span></label>
            <select value={adminLeaveForm.employeeId} onChange={(e) => setAdminLeaveForm(p => ({ ...p, employeeId: e.target.value }))}
              style={{ width: '100%', padding: '10px 14px', border: `1px solid ${B.border}`, borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff' }}>
              <option value="">Select employee</option>
              {allUsers.filter(u => u?._id && u.isActive !== false).sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(u => (
                <option key={u._id} value={u._id}>{u.name} {u.department ? `(${u.department})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={adminLeaveForm.startDate} onChange={e => setAdminLeaveForm(p => ({ ...p, startDate: e.target.value }))} required />
            <Input label="End Date" type="date" value={adminLeaveForm.endDate} onChange={e => setAdminLeaveForm(p => ({ ...p, endDate: e.target.value }))} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: B.black, marginBottom: 6 }}>Status</label>
            <select value={adminLeaveForm.status} onChange={(e) => setAdminLeaveForm(p => ({ ...p, status: e.target.value }))}
              style={{ width: '100%', padding: '10px 14px', border: `1px solid ${B.border}`, borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff' }}>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: B.black, marginBottom: 6 }}>Reason <span style={{ color: B.red }}>*</span></label>
            <textarea value={adminLeaveForm.reason} onChange={e => setAdminLeaveForm(p => ({ ...p, reason: e.target.value }))} rows={3} placeholder="Reason for leave…"
              style={{ width: '100%', padding: '10px 14px', border: `1px solid ${B.border}`, borderRadius: 10, fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <Button variant="secondary" onClick={() => setShowAdminAddLeave(false)}>Cancel</Button>
            <Button onClick={handleAdminCreateLeave} loading={savingAdminLeave}>Add Leave</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!reviewModal} onClose={() => setReviewModal(null)} title="Review Leave Request">
        {reviewModal && (
          <div className="space-y-4">
            <div style={{ background: B.surfaceAlt, borderRadius: 14, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Avatar name={reviewModal.employee?.name} size="sm" />
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: B.black }}>{reviewModal.employee?.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: B.slateMid }}>{reviewModal.employee?.department}</p>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: B.slate }}>{new Date(reviewModal.startDate).toLocaleDateString()} – {new Date(reviewModal.endDate).toLocaleDateString()}</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: B.slate }}>{reviewModal.totalDays} day(s)</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: B.slateMid }}>Reason: {reviewModal.reason || '—'}</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: B.black, marginBottom: 6 }}>Review Comment (optional)</label>
              <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={2} placeholder="Add a note…"
                style={{ width: '100%', padding: '10px 14px', border: `1px solid ${B.border}`, borderRadius: 10, fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
              <Button variant="secondary" onClick={() => setReviewModal(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => handleReview('rejected')}>Reject</Button>
              <Button variant="success" onClick={() => handleReview('approved')}>Approve</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Leave list ────────────────────────────────────────────────────────────────
function LeaveList({ leaves, onCancel, onReview, onAdminDelete, showUser, mine }) {
  const { isAdmin, user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [empFilter, setEmpFilter] = useState('all');
  const [showEmpDropdown, setShowEmpDropdown] = useState(false);

  const empOptions = useMemo(() => {
    const map = new Map();
    for (const l of leaves) {
      const id = l.employee?._id || l.employee;
      const name = l.employee?.name || 'Unknown';
      if (id && !map.has(id)) map.set(id, name);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [leaves]);

  const filteredEmpOptions = useMemo(() => {
    if (!search.trim()) return empOptions;
    return empOptions.filter(([, name]) => name.toLowerCase().includes(search.toLowerCase()));
  }, [empOptions, search]);

  const activeEmpLabel = useMemo(() => empOptions.find(([id]) => id === empFilter)?.[1] || null, [empFilter, empOptions]);

  const filtered = useMemo(() => {
    return leaves.filter(l => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (empFilter !== 'all' && (l.employee?._id || l.employee) !== empFilter) return false;
      if (search && empFilter === 'all') {
        const name = (l.employee?.name || '').toLowerCase();
        const reason = (l.reason || '').toLowerCase();
        if (!name.includes(search.toLowerCase()) && !reason.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [leaves, statusFilter, empFilter, search]);

  const buildMailtoHR = (leave) => {
    const empName = leave.employee?.name || user?.name || 'Employee';
    const dept = leave.employee?.department || user?.department || '';
    const start = new Date(leave.startDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const end   = new Date(leave.endDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const days  = leave.totalDays;
    const reason = leave.reason || 'N/A';
    const status = leave.status?.charAt(0).toUpperCase() + leave.status?.slice(1);

    const subject = encodeURIComponent(`Leave Request – ${empName} (${start})`);
    const body = encodeURIComponent(
`Dear HR Team,

I am writing regarding the following leave request:

Employee  : ${empName}${dept ? ` (${dept})` : ''}
Period    : ${start} → ${end}
Duration  : ${days} working day${days !== 1 ? 's' : ''}
Reason    : ${reason}
Status    : ${status}

Kindly review and confirm the approval at your earliest convenience.

Thank you,
${empName}`
    );
    return `mailto:hr@company.com?subject=${subject}&body=${body}`;
  };

  const clearAll = () => { setSearch(''); setStatusFilter('all'); setEmpFilter('all'); };
  const hasFilters = statusFilter !== 'all' || empFilter !== 'all' || search;

  return (
    <section style={{ background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(15,23,42,0.05)', overflow: 'visible' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', borderRadius: '18px 18px 0 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{showUser ? 'All Employee Leaves' : 'My Leaves'}</p>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748B' }}>{filtered.length} of {leaves.length} record{leaves.length !== 1 ? 's' : ''}</p>
          </div>
          {hasFilters && (
            <button onClick={clearAll} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: `1px solid ${B.border}`, background: '#fff', fontSize: 11, fontWeight: 700, color: B.slateMid, cursor: 'pointer' }}>
              <X size={11} /> Clear Filters
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {showUser && (
            <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 150, zIndex: 30 }}>
              <div style={{ display: 'flex', alignItems: 'center', border: `1.5px solid ${empFilter !== 'all' ? B.blue : B.border}`, borderRadius: 9, padding: '7px 10px', gap: 8, background: empFilter !== 'all' ? B.blueBg : '#fff' }}>
                <Search size={13} style={{ color: empFilter !== 'all' ? B.blue : B.slateLight, flexShrink: 0 }} />
                <input
                  value={empFilter !== 'all' ? (activeEmpLabel || '') : search}
                  onChange={e => { setSearch(e.target.value); setEmpFilter('all'); setShowEmpDropdown(true); }}
                  onFocus={() => setShowEmpDropdown(true)}
                  placeholder="Search by name or reason…"
                  readOnly={empFilter !== 'all'}
                  onClick={() => { if (empFilter !== 'all') { setEmpFilter('all'); setSearch(''); setShowEmpDropdown(true); } }}
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, fontWeight: empFilter !== 'all' ? 700 : 400, color: empFilter !== 'all' ? B.blue : B.black, width: '100%' }}
                />
                {(empFilter !== 'all' || search) && (
                  <button onClick={e => { e.stopPropagation(); setEmpFilter('all'); setSearch(''); setShowEmpDropdown(false); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: B.slateLight, padding: 0, display: 'flex' }}><X size={12} /></button>
                )}
              </div>
              {showEmpDropdown && filteredEmpOptions.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: `1px solid ${B.border}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,0.12)', zIndex: 50, maxHeight: 200, overflowY: 'auto' }}>
                  <div onClick={() => { setEmpFilter('all'); setSearch(''); setShowEmpDropdown(false); }}
                    style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, color: empFilter === 'all' ? B.blue : B.slateMid, cursor: 'pointer', borderBottom: `1px solid ${B.border}`, background: empFilter === 'all' ? B.blueBg : 'transparent' }}>All Employees</div>
                  {filteredEmpOptions.map(([id, name]) => (
                    <div key={id} onClick={() => { setEmpFilter(id); setSearch(''); setShowEmpDropdown(false); }}
                      style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: empFilter === id ? B.blueBg : 'transparent', borderBottom: `1px solid ${B.border}` }}
                      onMouseEnter={e => { if (empFilter !== id) e.currentTarget.style.background = B.surfaceAlt; }}
                      onMouseLeave={e => { if (empFilter !== id) e.currentTarget.style.background = 'transparent'; }}>
                      <div style={{ width: 22, height: 22, borderRadius: 999, background: nameColor(name), color: '#fff', fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials(name)}</div>
                      <span style={{ fontSize: 12, fontWeight: empFilter === id ? 700 : 500, color: empFilter === id ? B.blue : B.black }}>{name}</span>
                    </div>
                  ))}
                </div>
              )}
              {showEmpDropdown && <div style={{ position: 'fixed', inset: 0, zIndex: 25 }} onClick={() => setShowEmpDropdown(false)} />}
            </div>
          )}
          <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 10, padding: 3, gap: 2, flexShrink: 0 }}>
            {[['all','All'],['pending','Pending'],['approved','Approved'],['rejected','Rejected'],['cancelled','Cancelled']].map(([key, lbl]) => (
              <button key={key} onClick={() => setStatusFilter(key)}
                style={{ padding: '5px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: statusFilter === key ? '#fff' : 'transparent', color: statusFilter === key ? B.black : B.slateMid, boxShadow: statusFilter === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Search size={20} style={{ color: '#CBD5E1' }} />
          </div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#475569' }}>No results found</p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#94A3B8' }}>Try adjusting your filters or search query</p>
          {hasFilters && <button onClick={clearAll} style={{ marginTop: 12, padding: '7px 16px', borderRadius: 8, border: `1px solid ${B.border}`, background: '#fff', fontSize: 12, fontWeight: 600, color: B.slateMid, cursor: 'pointer' }}>Clear all filters</button>}
        </div>
      ) : (
        <div style={{ height: 'clamp(300px, 56vh, 680px)', overflowY: 'scroll', overflowX: 'hidden', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((leave, idx) => {
            const sv = STATUS_V[leave.status] || STATUS_V.pending;
            const Icon = sv.icon;
            const isPending = leave.status === 'pending';
            const start = new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const end = new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            return (
              <motion.div key={leave._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04 }}
                whileHover={{ boxShadow: '0 10px 28px rgba(15,23,42,0.09)' }}
                style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 1px 6px rgba(15,23,42,0.04)', overflow: 'visible', display: 'flex', transition: 'box-shadow 0.2s' }}>
                <div style={{ width: 4, flexShrink: 0, background: sv.color, borderRadius: '4px 0 0 4px' }} />
                <div style={{ flex: 1, padding: '14px 18px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {showUser ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <Avatar name={leave.employee?.name} size="sm" />
                          <div>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{leave.employee?.name}</p>
                            <p style={{ margin: '1px 0 0', fontSize: 11, color: '#94A3B8' }}>{leave.employee?.department || '—'}</p>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <Icon size={14} style={{ color: sv.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Leave Request</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#334155', fontWeight: 500 }}>
                          <CalendarDays size={12} style={{ color: '#94A3B8' }} />{start} → {end}
                        </span>
                        <span style={{ background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}</span>
                        <StatusBadge status={leave.status} />
                      </div>
                      {leave.reason && <p style={{ margin: '7px 0 0', fontSize: 12, color: '#64748B', lineHeight: 1.5 }}><span style={{ fontWeight: 600, color: '#475569' }}>Reason:</span> {leave.reason}</p>}
                      {leave.reviewComment && (
                        <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: 12, color: '#475569' }}>
                          <span style={{ fontWeight: 700 }}>Review note:</span> {leave.reviewComment}
                        </div>
                      )}
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      {mine && isPending && (
                        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => onCancel(leave._id)}
                          style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Cancel
                        </motion.button>
                      )}
                      {!mine && isPending && (
                        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => onReview(leave)}
                          style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#2563EB', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 8px rgba(37,99,235,0.3)', whiteSpace: 'nowrap' }}>
                          Review <ChevronRight size={12} />
                        </motion.button>
                      )}
                      {mine && (
                        <button
                          onClick={() => { window.location.href = buildMailtoHR(leave); }}
                          title="Email HR about this leave"
                          style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${B.blueBorder}`, background: B.blueBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Mail size={13} style={{ color: B.blue }} />
                        </button>
                      )}
                      {isAdmin && onAdminDelete && (
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onAdminDelete(leave._id)}
                          title="Remove leave record (admin only)"
                          style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Trash2 size={13} style={{ color: '#DC2626' }} />
                        </motion.button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}

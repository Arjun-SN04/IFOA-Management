import { useState, useEffect, useMemo } from 'react';
import { leaveAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Modal, Input, Avatar, Spinner, Alert } from '../../components/ui';
import {
  Plus, CalendarDays, Clock, CheckCircle, XCircle,
  AlertCircle, RotateCcw, ChevronRight, ChevronLeft,
  CalendarRange, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const B = {
  blue: '#2563EB', blueBg: '#EFF6FF', blueBorder: '#BFDBFE',
  emerald: '#059669', emeraldBg: '#ECFDF5', emeraldBorder: '#A7F3D0',
  amber: '#D97706', amberBg: '#FFFBEB', amberBorder: '#FDE68A',
  red: '#DC2626', redBg: '#FEF2F2', redBorder: '#FECACA',
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

// Employee avatar colors
const AVATAR_COLORS = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#EC4899','#0EA5E9','#14B8A6'];
function nameColor(name) {
  return AVATAR_COLORS[(name || '').charCodeAt(0) % AVATAR_COLORS.length];
}
function initials(name) {
  return (name || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

function StatCard({ label, value, icon: Icon, color, bg, border }) {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(15,23,42,0.10)' }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{
        background: B.surface, borderRadius: 18,
        border: `1px solid ${B.border}`, borderTop: `3px solid ${color}`,
        padding: '18px 20px', boxShadow: '0 4px 16px rgba(15,23,42,0.05)', cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: bg, border: `1px solid ${border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Icon size={20} style={{ color }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: B.black, lineHeight: 1 }}>{value}</p>
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
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 999,
      background: sv.bg, color: sv.color,
      border: `1px solid ${sv.border}`,
      fontSize: 11, fontWeight: 700
    }}>
      <Icon size={11} />
      {sv.label}
    </span>
  );
}

// ── Leave Calendar ─────────────────────────────────────────────────────────────
function LeaveCalendar({ leaves, allLeaves, onApply }) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'pending' | 'approved'

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun

  // Which leaves overlap with this month?
  const relevantLeaves = useMemo(() => {
    const monthStart = new Date(year, month, 1);
    const monthEnd   = new Date(year, month + 1, 0, 23, 59, 59);
    return (allLeaves || leaves).filter(l => {
      if (filterStatus !== 'all' && l.status !== filterStatus) return false;
      const s = new Date(l.startDate);
      const e = new Date(l.endDate);
      return s <= monthEnd && e >= monthStart;
    });
  }, [allLeaves, leaves, year, month, filterStatus]);

  // Build a map: day -> [leave, ...]
  const dayMap = useMemo(() => {
    const map = {};
    for (const leave of relevantLeaves) {
      const s = new Date(leave.startDate);
      const e = new Date(leave.endDate);
      for (let d = new Date(year, month, 1); d <= new Date(year, month + 1, 0); d.setDate(d.getDate() + 1)) {
        if (d >= s && d <= e) {
          const day = d.getDate();
          if (!map[day]) map[day] = [];
          map[day].push(leave);
        }
      }
    }
    return map;
  }, [relevantLeaves, year, month]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Build calendar grid cells: blanks + day numbers
  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedDayLeaves = selectedDay ? (dayMap[selectedDay] || []) : [];
  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  // Total employees on leave this month
  const uniqueEmps = new Set(relevantLeaves.map(l => l.employee?._id || l.employee)).size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Employees on leave', value: uniqueEmps, color: B.blue, bg: B.blueBg },
          { label: 'Leave requests', value: relevantLeaves.length, color: B.emerald, bg: B.emeraldBg },
          { label: 'Days covered', value: Object.keys(dayMap).length, color: B.amber, bg: B.amberBg },
        ].map((s) => (
          <div key={s.label} style={{
            flex: '1 1 140px', background: '#fff', borderRadius: 14,
            border: `1px solid ${B.border}`, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={16} style={{ color: s.color }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: B.black }}>{s.value}</p>
              <p style={{ margin: 0, fontSize: 11, color: B.slateMid }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Calendar card */}
      <div style={{ background: '#fff', borderRadius: 18, border: `1px solid ${B.border}`, overflow: 'hidden', boxShadow: '0 4px 16px rgba(15,23,42,0.05)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${B.border}`, background: B.surfaceAlt }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: B.blueBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarRange size={16} style={{ color: B.blue }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: B.black }}>{monthName}</p>
              <p style={{ margin: 0, fontSize: 11, color: B.slateMid }}>Leave Calendar</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Status filter */}
            <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 10, padding: 3, gap: 2 }}>
              {[['all','All'],['pending','Pending'],['approved','Approved']].map(([key, lbl]) => (
                <button key={key} onClick={() => setFilterStatus(key)}
                  style={{
                    padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 700,
                    background: filterStatus === key ? '#fff' : 'transparent',
                    color: filterStatus === key ? B.black : B.slateMid,
                    boxShadow: filterStatus === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s',
                  }}>
                  {lbl}
                </button>
              ))}
            </div>
            {/* Month nav */}
            <button onClick={prevMonth} style={{ padding: '7px 9px', borderRadius: 9, border: `1px solid ${B.border}`, background: '#fff', cursor: 'pointer', color: B.slate, display: 'flex' }}>
              <ChevronLeft size={15} />
            </button>
            <button onClick={() => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))}
              style={{ padding: '6px 12px', borderRadius: 9, border: `1px solid ${B.border}`, background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: B.blue }}>
              Today
            </button>
            <button onClick={nextMonth} style={{ padding: '7px 9px', borderRadius: 9, border: `1px solid ${B.border}`, background: '#fff', cursor: 'pointer', color: B.slate, display: 'flex' }}>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Day-of-week labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: B.surfaceAlt, borderBottom: `1px solid ${B.border}` }}>
          {DAYS_OF_WEEK.map(d => (
            <div key={d} style={{ textAlign: 'center', padding: '8px 0', fontSize: 10, fontWeight: 800, color: B.slateLight, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={`blank-${idx}`} style={{ minHeight: 90, borderBottom: `1px solid ${B.border}`, borderRight: `1px solid ${B.border}` }} />;

            const dayLeaves = dayMap[day] || [];
            const hasLeaves = dayLeaves.length > 0;
            const isTod = isToday(day);
            const isSelected = selectedDay === day;

            // Group by status for color coding
            const hasPending  = dayLeaves.some(l => l.status === 'pending');
            const hasApproved = dayLeaves.some(l => l.status === 'approved');
            const bgColor = isSelected ? '#EFF6FF'
              : hasApproved ? '#ECFDF5'
              : hasPending  ? '#FFFBEB'
              : 'transparent';

            return (
              <motion.div
                key={day}
                whileHover={hasLeaves ? { background: '#F0F9FF' } : {}}
                onClick={() => {
                  if (hasLeaves) {
                    setSelectedDay(isSelected ? null : day);
                  } else if (onApply) {
                    // Format as YYYY-MM-DD for the date input
                    const d = new Date(year, month, day);
                    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                    onApply(iso);
                  }
                }}
                style={{
                  minHeight: 90, padding: '8px 6px',
                  borderBottom: `1px solid ${B.border}`,
                  borderRight: (idx + 1) % 7 === 0 ? 'none' : `1px solid ${B.border}`,
                  background: bgColor,
                  cursor: hasLeaves ? 'pointer' : onApply ? 'pointer' : 'default',
                  position: 'relative',
                  transition: 'background 0.15s',
                  outline: isSelected ? `2px solid ${B.blue}` : 'none',
                  outlineOffset: -2,
                }}
              >
                {/* Day number */}
                <div style={{
                  width: 26, height: 26, borderRadius: 999,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isTod ? B.blue : 'transparent',
                  color: isTod ? '#fff' : B.black,
                  fontSize: 12, fontWeight: isTod ? 800 : 600,
                  marginBottom: 4,
                }}>
                  {day}
                </div>

                {/* Leave chips — show up to 3 */}
                {dayLeaves.slice(0, 3).map((leave, li) => {
                  const sv = STATUS_V[leave.status] || STATUS_V.pending;
                  const empName = leave.employee?.name || 'Unknown';
                  return (
                    <div key={leave._id + li} style={{
                      display: 'flex', alignItems: 'center', gap: 3,
                      padding: '2px 5px', borderRadius: 5, marginBottom: 2,
                      background: sv.bg, border: `1px solid ${sv.border}`,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: 14, height: 14, borderRadius: 999, flexShrink: 0,
                        background: nameColor(empName),
                        color: '#fff', fontSize: 7, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {initials(empName).slice(0, 1)}
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 600, color: sv.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 60 }}>
                        {empName.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
                {dayLeaves.length > 3 && (
                  <p style={{ margin: '2px 0 0', fontSize: 9, fontWeight: 700, color: B.slateMid }}>+{dayLeaves.length - 3} more</p>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Selected day panel */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              background: '#fff', borderRadius: 18, border: `1px solid ${B.border}`,
              padding: 20, boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: B.blueBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarDays size={16} style={{ color: B.blue }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: B.black }}>
                    {new Date(year, month, selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: B.slateMid }}>{selectedDayLeaves.length} leave request{selectedDayLeaves.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDay(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: B.slateLight, fontSize: 18, fontWeight: 700, padding: '4px 8px', borderRadius: 8 }}>
                ×
              </button>
            </div>

            {selectedDayLeaves.length === 0 ? (
              <p style={{ textAlign: 'center', color: B.slateLight, fontSize: 13, padding: '16px 0' }}>No leaves on this day.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedDayLeaves.map((leave) => {
                  const sv = STATUS_V[leave.status] || STATUS_V.pending;
                  const empName = leave.employee?.name || 'Unknown';
                  const dept = leave.employee?.department || '';
                  const start = new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const end   = new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <div key={leave._id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 12,
                      background: sv.bg, border: `1px solid ${sv.border}`,
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 999, flexShrink: 0,
                        background: nameColor(empName), color: '#fff',
                        fontSize: 12, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {initials(empName)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: B.black }}>{empName}</p>
                        {dept && <p style={{ margin: '1px 0 0', fontSize: 11, color: B.slateMid }}>{dept}</p>}
                        <p style={{ margin: '3px 0 0', fontSize: 11, color: B.slate }}>
                          {start} → {end} · {leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}
                        </p>
                        {leave.reason && <p style={{ margin: '2px 0 0', fontSize: 11, color: B.slateMid, fontStyle: 'italic' }}>"{leave.reason}"</p>}
                      </div>
                      <StatusBadge status={leave.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingLeft: 4 }}>
        {Object.entries(STATUS_V).map(([key, sv]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: sv.bg, border: `1px solid ${sv.border}` }} />
            <span style={{ fontSize: 11, color: B.slateMid, fontWeight: 500 }}>{sv.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function LeavesPage() {
  const { user, isManagerOrAdmin, isAdmin } = useAuth();
  const [myLeaves, setMyLeaves] = useState([]);
  const [teamLeaves, setTeamLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(isAdmin ? 'team' : 'my');

  const [showAdminAddLeave, setShowAdminAddLeave] = useState(false);
  const [adminLeaveForm, setAdminLeaveForm] = useState({ employeeId: '', startDate: '', endDate: '', reason: '', status: 'approved' });
  const [savingAdminLeave, setSavingAdminLeave] = useState(false);
  const [adminLeaveError, setAdminLeaveError] = useState('');
  const [allUsers, setAllUsers] = useState([]);

  const [showApply, setShowApply] = useState(false);
  const [applyForm, setApplyForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [savingApply, setSavingApply] = useState(false);
  const [applyError, setApplyError] = useState('');

  const [reviewModal, setReviewModal] = useState(null);
  const [reviewNote, setReviewNote] = useState('');

  const [resetDayOfMonth, setResetDayOfMonth] = useState(1);
  const [lastResetMonthKey, setLastResetMonthKey] = useState('');
  const [savingReset, setSavingReset] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const calls = [leaveAPI.getMy().catch(() => ({ data: { leaves: [] } }))];
      if (isManagerOrAdmin) calls.push(leaveAPI.getAll().catch(() => ({ data: { leaves: [] } })));
      if (isAdmin) calls.push(leaveAPI.getResetSettings().catch(() => null));
      if (isAdmin) calls.push(import('../../api').then(m => m.userAPI.getAll()).catch(() => ({ data: { users: [] } })));
      const [myRes, allRes, resetRes, usersRes] = await Promise.all(calls);
      setMyLeaves(myRes?.data?.leaves || myRes?.data?.data || []);
      if (allRes) setTeamLeaves(allRes?.data?.leaves || allRes?.data?.data || []);
      if (resetRes?.data) {
        setResetDayOfMonth(resetRes.data.resetDayOfMonth || 1);
        setLastResetMonthKey(resetRes.data.lastResetMonthKey || '');
      }
      if (usersRes?.data) setAllUsers(usersRes.data.users || usersRes.data.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [isManagerOrAdmin, isAdmin]);
  useEffect(() => { setTab(isAdmin ? 'team' : 'my'); }, [isAdmin]);

  const handleApply = async () => {
    setApplyError('');
    if (!applyForm.startDate || !applyForm.endDate || !applyForm.reason.trim()) {
      setApplyError('Please fill all required fields'); return;
    }
    setSavingApply(true);
    try {
      const res = await leaveAPI.apply(applyForm);
      const created = res.data?.leave || res.data?.data;
      if (created) setMyLeaves(prev => [created, ...prev]);
      setShowApply(false);
      setApplyForm({ startDate: '', endDate: '', reason: '' });
      toast.success('Leave request submitted');
    } catch (e) {
      setApplyError(e.response?.data?.message || 'Failed to apply leave');
    } finally { setSavingApply(false); }
  };

  const handleAdminCreateLeave = async () => {
    setAdminLeaveError('');
    if (!adminLeaveForm.employeeId || !adminLeaveForm.startDate || !adminLeaveForm.endDate || !adminLeaveForm.reason.trim()) {
      setAdminLeaveError('Please fill all required fields');
      return;
    }

    setSavingAdminLeave(true);
    try {
      const res = await leaveAPI.adminCreate(adminLeaveForm);
      const created = res.data?.leave || res.data?.data;
      if (created) {
        setTeamLeaves(prev => [created, ...prev]);
      }
      setShowAdminAddLeave(false);
      setAdminLeaveForm({ employeeId: '', startDate: '', endDate: '', reason: '', status: 'approved' });
      toast.success('Leave added successfully');
    } catch (e) {
      setAdminLeaveError(e.response?.data?.message || 'Failed to add leave');
    } finally {
      setSavingAdminLeave(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this leave request?')) return;
    try {
      const res = await leaveAPI.cancel(id);
      const updated = res.data?.leave || res.data?.data;
      setMyLeaves(prev => prev.map(l => (l._id === id ? (updated || { ...l, status: 'cancelled' }) : l)));
      toast.success('Leave cancelled');
    } catch (e) { toast.error(e.response?.data?.message || 'Cancel failed'); }
  };

  const handleReview = async (status) => {
    try {
      const res = await leaveAPI.review(reviewModal._id, { status, reviewComment: reviewNote });
      const updated = res.data?.leave || res.data?.data;
      if (updated) setTeamLeaves(prev => prev.map(l => (l._id === reviewModal._id ? updated : l)));
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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
      <Spinner size="lg" />
    </div>
  );

  const summary = {
    pending: myLeaves.filter(l => l.status === 'pending').length,
    approved: myLeaves.filter(l => l.status === 'approved').length,
    rejected: myLeaves.filter(l => l.status === 'rejected').length,
    cancelled: myLeaves.filter(l => l.status === 'cancelled').length,
  };

  const tabs = [
    ...(!isAdmin ? [{ key: 'my', label: 'My Leaves' }] : []),
    ...(!isAdmin ? [{ key: 'calendar', label: 'My Calendar', icon: CalendarRange }] : []),
    ...(isManagerOrAdmin ? [{ key: 'team', label: 'Leave Dashboard' }] : []),
    ...(isManagerOrAdmin ? [{ key: 'calendar', label: 'Team Calendar', icon: CalendarRange }] : []),
    ...(isAdmin ? [{ key: 'reset', label: 'Reset Schedule', icon: RotateCcw }] : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Header ── */}
      <section style={{ padding: '8px 2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: B.slateMid }}>
            HR Management
          </p>
          <h1 style={{ margin: '4px 0 0', fontSize: 30, fontWeight: 800, color: B.black, lineHeight: 1.1 }}>
            Leave <span style={{ color: B.blue }}>Management</span>
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: B.slateMid }}>
            Request leave, track approvals, and manage your team.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!isAdmin && (
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => { setApplyError(''); setShowApply(true); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 12,
                background: B.blue, color: '#fff',
                border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
              }}
            >
              <Plus size={15} /> Apply for Leave
            </motion.button>
          )}
          {isAdmin && (
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => { setAdminLeaveError(''); setShowAdminAddLeave(true); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 12,
                background: B.blue, color: '#fff',
                border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
              }}
            >
              <Plus size={15} /> Add Leave
            </motion.button>
          )}
        </div>
      </section>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'Pending',   value: summary.pending,   icon: Clock,        color: B.amber,   bg: B.amberBg,   border: B.amberBorder },
          { label: 'Approved',  value: summary.approved,  icon: CheckCircle,  color: B.emerald, bg: B.emeraldBg, border: B.emeraldBorder },
          { label: 'Rejected',  value: summary.rejected,  icon: XCircle,      color: B.red,     bg: B.redBg,     border: B.redBorder },
          { label: 'Cancelled', value: summary.cancelled, icon: AlertCircle,  color: B.slate,   bg: B.surfaceAlt,border: B.border },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ borderBottom: `1px solid ${B.border}` }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 18px', fontSize: 13, fontWeight: 600,
                border: 'none', borderBottom: `2px solid ${tab === key ? B.blue : 'transparent'}`,
                background: 'none', cursor: 'pointer',
                color: tab === key ? B.blue : B.slateMid,
                marginBottom: -1, transition: 'all 0.15s',
              }}
            >
              {Icon && <Icon size={14} />}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        {tab === 'my' && (
          <motion.div key="my" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <LeaveList leaves={myLeaves} mine onCancel={handleCancel} />
          </motion.div>
        )}
        {tab === 'team' && isManagerOrAdmin && (
          <motion.div key="team" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <LeaveList leaves={teamLeaves} showUser onReview={setReviewModal} />
          </motion.div>
        )}
        {tab === 'calendar' && isManagerOrAdmin && (
          <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <LeaveCalendar leaves={myLeaves} allLeaves={teamLeaves} />
          </motion.div>
        )}
        {tab === 'calendar' && !isManagerOrAdmin && (
          <motion.div key="my-calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <LeaveCalendar
              leaves={myLeaves}
              allLeaves={myLeaves}
              onApply={(date) => {
                setApplyError('');
                setApplyForm(p => ({ ...p, startDate: date, endDate: date }));
                setShowApply(true);
              }}
            />
          </motion.div>
        )}
        {tab === 'reset' && isAdmin && (
          <motion.div key="reset" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div style={{ maxWidth: 480, background: B.surface, borderRadius: 18, border: `1px solid ${B.border}`, padding: 24, boxShadow: '0 4px 16px rgba(15,23,42,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: B.blueBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RotateCcw size={16} style={{ color: B.blue }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: B.black }}>Monthly Leave Reset</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: B.slateMid }}>All leave requests are cleared monthly on this date.</p>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', fontSize: 11, color: B.slateMid, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Reset day of month (1–28)
                </label>
                <input
                  type="number" min="1" max="28" value={resetDayOfMonth}
                  onChange={(e) => setResetDayOfMonth(Math.max(1, Math.min(28, parseInt(e.target.value, 10) || 1)))}
                  style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: `1px solid ${B.border}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <p style={{ fontSize: 11, color: B.slateLight, marginTop: 10 }}>Last reset month: {lastResetMonthKey || 'Not yet'}</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <Button onClick={handleSaveReset} loading={savingReset}>Save Reset Date</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Apply Modal ── */}
      <Modal open={showApply} onClose={() => setShowApply(false)} title="Apply for Leave">
        <div className="space-y-4">
          {applyError && <Alert variant="error">{applyError}</Alert>}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={applyForm.startDate} onChange={e => setApplyForm(p => ({ ...p, startDate: e.target.value }))} required />
            <Input label="End Date" type="date" value={applyForm.endDate} onChange={e => setApplyForm(p => ({ ...p, endDate: e.target.value }))} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: B.black, marginBottom: 6 }}>
              Reason <span style={{ color: B.red }}>*</span>
            </label>
            <textarea
              value={applyForm.reason}
              onChange={e => setApplyForm(p => ({ ...p, reason: e.target.value }))}
              rows={3} placeholder="Reason for leave..."
              style={{ width: '100%', padding: '10px 14px', border: `1px solid ${B.border}`, borderRadius: 10, fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <Button variant="secondary" onClick={() => setShowApply(false)}>Cancel</Button>
            <Button onClick={handleApply} loading={savingApply}>Submit Request</Button>
          </div>
        </div>
      </Modal>

      {/* ── Admin Add Leave Modal ── */}
      <Modal open={showAdminAddLeave} onClose={() => setShowAdminAddLeave(false)} title="Add Leave for Employee">
        <div className="space-y-4">
          {adminLeaveError && <Alert variant="error">{adminLeaveError}</Alert>}

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: B.black, marginBottom: 6 }}>
              Employee <span style={{ color: B.red }}>*</span>
            </label>
            <select
              value={adminLeaveForm.employeeId}
              onChange={(e) => setAdminLeaveForm(p => ({ ...p, employeeId: e.target.value }))}
              style={{
                width: '100%', padding: '10px 14px', border: `1px solid ${B.border}`,
                borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff'
              }}
            >
              <option value="">Select employee</option>
              {allUsers
                .filter(u => u?._id && u.isActive !== false)
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                .map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} {u.department ? `(${u.department})` : ''}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={adminLeaveForm.startDate}
              onChange={e => setAdminLeaveForm(p => ({ ...p, startDate: e.target.value }))}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={adminLeaveForm.endDate}
              onChange={e => setAdminLeaveForm(p => ({ ...p, endDate: e.target.value }))}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: B.black, marginBottom: 6 }}>
              Status <span style={{ color: B.red }}>*</span>
            </label>
            <select
              value={adminLeaveForm.status}
              onChange={(e) => setAdminLeaveForm(p => ({ ...p, status: e.target.value }))}
              style={{
                width: '100%', padding: '10px 14px', border: `1px solid ${B.border}`,
                borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff'
              }}
            >
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: B.black, marginBottom: 6 }}>
              Reason <span style={{ color: B.red }}>*</span>
            </label>
            <textarea
              value={adminLeaveForm.reason}
              onChange={e => setAdminLeaveForm(p => ({ ...p, reason: e.target.value }))}
              rows={3}
              placeholder="Reason for leave..."
              style={{
                width: '100%', padding: '10px 14px', border: `1px solid ${B.border}`,
                borderRadius: 10, fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <Button variant="secondary" onClick={() => setShowAdminAddLeave(false)}>Cancel</Button>
            <Button onClick={handleAdminCreateLeave} loading={savingAdminLeave}>Add Leave</Button>
          </div>
        </div>
      </Modal>

      {/* ── Review Modal ── */}
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
              <textarea
                value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={2} placeholder="Add a note..."
                style={{ width: '100%', padding: '10px 14px', border: `1px solid ${B.border}`, borderRadius: 10, fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box' }}
              />
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

function LeaveList({ leaves, onCancel, onReview, showUser, mine }) {
  if (!leaves.length) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0', padding: '56px 24px', textAlign: 'center', boxShadow: '0 4px 16px rgba(15,23,42,0.05)' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <CalendarDays size={24} style={{ color: '#CBD5E1' }} />
        </div>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#475569' }}>No leave requests found</p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#94A3B8' }}>Leave requests will appear here once submitted</p>
      </motion.div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {leaves.map((leave, idx) => {
        const sv = STATUS_V[leave.status] || STATUS_V.pending;
        const Icon = sv.icon;
        const isPending = leave.status === 'pending';
        const start = new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const end = new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return (
          <motion.div
            key={leave._id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ y: -2, boxShadow: '0 10px 28px rgba(15,23,42,0.09)' }}
            style={{
              background: '#fff', borderRadius: 16,
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 6px rgba(15,23,42,0.04)',
              overflow: 'hidden', display: 'flex',
              transition: 'box-shadow 0.2s',
            }}
          >
            <div style={{ width: 4, flexShrink: 0, background: sv.color }} />
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: showUser ? 0 : 2 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#334155', fontWeight: 500 }}>
                      <CalendarDays size={12} style={{ color: '#94A3B8' }} />
                      {start} → {end}
                    </span>
                    <span style={{ background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                      {leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}
                    </span>
                    <StatusBadge status={leave.status} />
                  </div>
                  {leave.reason && (
                    <p style={{ margin: '7px 0 0', fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 600, color: '#475569' }}>Reason:</span> {leave.reason}
                    </p>
                  )}
                  {leave.reviewComment && (
                    <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: 12, color: '#475569' }}>
                      <span style={{ fontWeight: 700 }}>Review note:</span> {leave.reviewComment}
                    </div>
                  )}
                </div>
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  {mine && isPending && (
                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                      onClick={() => onCancel(leave._id)}
                      style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Cancel
                    </motion.button>
                  )}
                  {!mine && isPending && (
                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                      onClick={() => onReview(leave)}
                      style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#2563EB', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 8px rgba(37,99,235,0.3)', whiteSpace: 'nowrap' }}>
                      Review <ChevronRight size={12} />
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

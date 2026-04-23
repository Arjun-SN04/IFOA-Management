import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { leaveAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Modal, Input, Avatar, Spinner, Alert } from '../../components/ui';
import {
  Plus, CalendarDays, Clock, CheckCircle, XCircle,
  AlertCircle, RotateCcw, ChevronRight, ChevronLeft,
  CalendarRange, Users, RefreshCw, ChevronUp, ChevronDown
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

// Calendar labels are role-friendly and date-aware.
const CALENDAR_STATUS_LABEL = {
  pending:   'Pending',
  approved:  'Approved',
  rejected:  'Rejected',
  cancelled: 'Cancelled',
};

function getCalendarStatusView(leave, todayBase) {
  const isExpiredApproved =
    leave?.status === 'approved' && leave?.endDate && new Date(leave.endDate) < todayBase;

  if (isExpiredApproved) {
    return {
      color: '#475569',
      bg: '#F1F5F9',
      border: '#CBD5E1',
      label: 'Completed',
    };
  }

  const sv = STATUS_V[leave?.status] || STATUS_V.pending;
  return {
    color: sv.color,
    bg: sv.bg,
    border: sv.border,
    label: CALENDAR_STATUS_LABEL[leave?.status] || 'Pending',
  };
}

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
        background: B.surface, borderRadius: 14,
        border: `1px solid ${B.border}`, borderTop: `3px solid ${color}`,
        padding: '12px 14px', boxShadow: '0 4px 16px rgba(15,23,42,0.05)', cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          background: bg, border: `1px solid ${border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
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
function LeaveCalendar({ leaves, allLeaves, onApply, onRefresh, refreshing, showEmployeeNames = true, showCancelledLegend = true }) {
  const today = new Date();
  const todayBase = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0), [today]);
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  // Use allLeaves if provided and non-empty, otherwise fall back to leaves
  const sourceLeaves = (allLeaves && allLeaves.length > 0) ? allLeaves : (leaves || []);

  const relevantLeaves = useMemo(() => {
    const monthStart = new Date(year, month, 1);
    const monthEnd   = new Date(year, month + 1, 0, 23, 59, 59);
    return sourceLeaves.filter(l => {
      if (!l || !l.startDate || !l.endDate) return false;
      if (filterStatus !== 'all' && l.status !== filterStatus) return false;
      const s = new Date(l.startDate);
      const e = new Date(l.endDate);
      return s <= monthEnd && e >= monthStart;
    });
  }, [sourceLeaves, year, month, filterStatus]);

  const dayMap = useMemo(() => {
    const map = {};
    const monthEnd = new Date(year, month + 1, 0);
    for (const leave of relevantLeaves) {
      const s = new Date(leave.startDate);
      const e = new Date(leave.endDate);
      // Iterate only days within this month that the leave covers
      const loopStart = new Date(Math.max(s.getTime(), new Date(year, month, 1).getTime()));
      const loopEnd   = new Date(Math.min(e.getTime(), monthEnd.getTime()));
      for (let d = new Date(loopStart); d <= loopEnd; d.setDate(d.getDate() + 1)) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(leave);
      }
    }
    return map;
  }, [relevantLeaves, year, month]);

  const prevMonth = () => { setSelectedDay(null); setCurrentDate(new Date(year, month - 1, 1)); };
  const nextMonth = () => { setSelectedDay(null); setCurrentDate(new Date(year, month + 1, 1)); };

  const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedDayLeaves = selectedDay ? (dayMap[selectedDay] || []) : [];
  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const uniqueEmps = new Set(relevantLeaves.map(l => l.employee?._id || l.employee)).size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { label: 'Employees on leave', value: uniqueEmps, color: B.blue, bg: B.blueBg },
          { label: 'Leave requests', value: relevantLeaves.length, color: B.emerald, bg: B.emeraldBg },
          { label: 'Days covered', value: Object.keys(dayMap).length, color: B.amber, bg: B.amberBg },
        ].map((s) => (
          <div key={s.label} style={{
            flex: '1 1 140px', background: '#fff', borderRadius: 12,
            border: `1px solid ${B.border}`, padding: '10px 12px',
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
      <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${B.border}`, overflow: 'hidden', boxShadow: '0 3px 12px rgba(15,23,42,0.05)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: `1px solid ${B.border}`, background: B.surfaceAlt, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: B.blueBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarRange size={16} style={{ color: B.blue }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: B.black }}>{monthName}</p>
              <p style={{ margin: 0, fontSize: 11, color: B.slateMid }}>Leave Calendar · {sourceLeaves.length} total leave{sourceLeaves.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
            {/* Refresh button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                title="Refresh calendar"
                style={{
                  padding: '7px 9px', borderRadius: 9,
                  border: `1px solid ${B.border}`, background: '#fff',
                  cursor: 'pointer', color: B.blue, display: 'flex',
                  opacity: refreshing ? 0.6 : 1,
                }}
              >
                <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              </button>
            )}
            {/* Month nav */}
            <button onClick={prevMonth} style={{ padding: '7px 9px', borderRadius: 9, border: `1px solid ${B.border}`, background: '#fff', cursor: 'pointer', color: B.slate, display: 'flex' }}>
              <ChevronLeft size={15} />
            </button>
            <button onClick={() => { setSelectedDay(null); setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1)); }}
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
            if (!day) return (
              <div key={`blank-${idx}`} style={{
                minHeight: 100,
                borderBottom: `1px solid ${B.border}`,
                borderRight: (idx + 1) % 7 === 0 ? 'none' : `1px solid ${B.border}`,
                background: '#FAFAFA',
              }} />
            );

            const dayLeaves = dayMap[day] || [];
            const hasLeaves = dayLeaves.length > 0;
            const isTod = isToday(day);
            const isSelected = selectedDay === day;

            const hasPending  = dayLeaves.some(l => l.status === 'pending');
            const hasApproved = dayLeaves.some(l => l.status === 'approved' && new Date(l.endDate) >= todayBase);
            const hasCompleted = dayLeaves.some(l => l.status === 'approved' && new Date(l.endDate) < todayBase);
            const bgColor = isSelected ? '#DBEAFE'
              : hasApproved ? '#ECFDF5'
              : hasCompleted ? '#F1F5F9'
              : hasPending  ? '#FFFBEB'
              : '#fff';

            return (
              <div
                key={day}
                onClick={() => {
                  if (hasLeaves) {
                    setSelectedDay(isSelected ? null : day);
                  } else if (onApply) {
                    const d = new Date(year, month, day);
                    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                    onApply(iso);
                  }
                }}
                style={{
                  minHeight: 84, padding: '5px 4px',
                  borderBottom: `1px solid ${B.border}`,
                  borderRight: (idx + 1) % 7 === 0 ? 'none' : `1px solid ${B.border}`,
                  background: bgColor,
                  cursor: hasLeaves ? 'pointer' : onApply ? 'pointer' : 'default',
                  transition: 'background 0.12s',
                  outline: isSelected ? `2px solid ${B.blue}` : 'none',
                  outlineOffset: -2,
                  boxSizing: 'border-box',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = hasLeaves ? '#F0F9FF' : bgColor; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = bgColor; }}
              >
                {/* Day number */}
                <div style={{
                  width: 24, height: 24, borderRadius: 999,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isTod ? B.blue : 'transparent',
                  color: isTod ? '#fff' : B.black,
                  fontSize: 11, fontWeight: isTod ? 800 : 600,
                  marginBottom: 4,
                }}>
                  {day}
                </div>

                {/* Leave chips */}
                {dayLeaves.slice(0, 2).map((leave, li) => {
                  const sv = getCalendarStatusView(leave, todayBase);
                  const empName = leave.employee?.name || 'Unknown';
                  return (
                    <div key={(leave._id || li) + '-' + li} style={{
                      marginBottom: 3, borderRadius: 5,
                      background: sv.bg, border: `1px solid ${sv.border}`,
                      padding: '2px 4px 3px',
                    }}>
                      {showEmployeeNames && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2 }}>
                          <div style={{
                            width: 12, height: 12, borderRadius: 999, flexShrink: 0,
                            background: nameColor(empName),
                            color: '#fff', fontSize: 6, fontWeight: 800,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {initials(empName).slice(0, 1)}
                          </div>
                          <span style={{
                            fontSize: 9, fontWeight: 700, color: B.black,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            maxWidth: '100%',
                          }}>
                            {empName.split(' ')[0]}
                          </span>
                        </div>
                      )}
                      {/* Status pill */}
                      <div style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '1px 5px', borderRadius: 3,
                        background: sv.color, color: '#fff',
                        fontSize: 8, fontWeight: 800, lineHeight: '14px',
                        whiteSpace: 'nowrap',
                      }}>
                        {sv.label}
                      </div>
                    </div>
                  );
                })}
                {dayLeaves.length > 2 && (
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: B.blue,
                    padding: '1px 4px', background: B.blueBg,
                    borderRadius: 3, display: 'inline-block',
                  }}>
                    +{dayLeaves.length - 2} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day detail panel */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            key={`day-${selectedDay}-${month}-${year}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              background: '#fff', borderRadius: 16, border: `1px solid ${B.border}`,
              padding: 14, boxShadow: '0 4px 14px rgba(15,23,42,0.06)',
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
                  const sv = getCalendarStatusView(leave, todayBase);
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
                      {showEmployeeNames && (
                        <div style={{
                          width: 36, height: 36, borderRadius: 999, flexShrink: 0,
                          background: nameColor(empName), color: '#fff',
                          fontSize: 12, fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {initials(empName)}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {showEmployeeNames ? (
                          <>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: B.black }}>{empName}</p>
                            {dept && <p style={{ margin: '1px 0 0', fontSize: 11, color: B.slateMid }}>{dept}</p>}
                          </>
                        ) : (
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: B.black }}>Leave</p>
                        )}
                        <p style={{ margin: '3px 0 0', fontSize: 11, color: B.slate }}>
                          {start} → {end} · {leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}
                        </p>
                        {leave.reason && <p style={{ margin: '2px 0 0', fontSize: 11, color: B.slateMid, fontStyle: 'italic' }}>"{leave.reason}"</p>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4,
                          background: sv.color, color: '#fff',
                          fontSize: 10, fontWeight: 800,
                        }}>
                          {sv.label}
                        </span>
                      </div>
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
        {[
          { label: 'Approved', color: B.emerald, bg: B.emeraldBg, border: B.emeraldBorder },
          { label: 'Completed', color: B.slate, bg: '#F1F5F9', border: '#CBD5E1' },
          { label: 'Pending', color: B.amber, bg: B.amberBg, border: B.amberBorder },
          { label: 'Rejected', color: B.red, bg: B.redBg, border: B.redBorder },
          ...(showCancelledLegend ? [{ label: 'Cancelled', color: B.slate, bg: B.surfaceAlt, border: B.border }] : []),
        ].map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: s.bg, border: `1px solid ${s.border}` }} />
            <span style={{ fontSize: 11, color: B.slateMid, fontWeight: 500 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Spin animation for refresh button */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function LeavesPage() {
  const { isHROrAbove, isAdmin, user } = useAuth();
  const [myLeaves, setMyLeaves] = useState([]);
  const [teamLeaves, setTeamLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('loading'); // resolved after auth
  const [showSummaryCards, setShowSummaryCards] = useState(false);

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

  // ── Core data fetcher ────────────────────────────────────────────────────
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      // Always fetch own leaves
      const myRes = await leaveAPI.getMy().catch(() => ({ data: { leaves: [] } }));
      const myData = myRes?.data?.leaves || myRes?.data?.data || [];
      setMyLeaves(myData);

      // Fetch all team leaves for HR/Manager/Admin
      if (isHROrAbove) {
        const allRes = await leaveAPI.getAll({ limit: 500 }).catch(() => ({ data: { leaves: [] } }));
        const allData = allRes?.data?.leaves || allRes?.data?.data || [];
        setTeamLeaves(allData);
      }

      // Admin-only extras
      if (isAdmin) {
        const [resetRes, usersRes] = await Promise.all([
          leaveAPI.getResetSettings().catch(() => null),
          import('../../api').then(m => m.userAPI.getAll()).catch(() => ({ data: { users: [] } })),
        ]);
        if (resetRes?.data) {
          setResetDayOfMonth(resetRes.data.resetDayOfMonth || 1);
          setLastResetMonthKey(resetRes.data.lastResetMonthKey || '');
        }
        if (usersRes?.data) setAllUsers(usersRes.data.users || usersRes.data.data || []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isHROrAbove, isAdmin]);

  // Initial load — wait for user to resolve before loading
  useEffect(() => {
    if (!user) return; // auth not yet resolved
    loadData(false);
  }, [loadData, user]);

  // Set default tab once auth resolves
  useEffect(() => {
    if (!user) return;
    // Default to calendar view — team calendar for HR/Manager, personal calendar for employees
    setTab(isHROrAbove ? 'team-calendar' : 'my-calendar');
  }, [user, isHROrAbove]);

  // ── Auto-refresh every 30s so status stays live without manual reload ────
  const intervalRef = useRef(null);
  useEffect(() => {
    if (!user) return;
    intervalRef.current = setInterval(() => {
      loadData(true); // silent — no spinner, just refreshes data
    }, 30000);
    return () => clearInterval(intervalRef.current);
  }, [loadData, user]);

  // ── Manual refresh ───────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  // ── Apply for leave ──────────────────────────────────────────────────────
  const handleApply = async () => {
    setApplyError('');
    if (!applyForm.startDate || !applyForm.endDate || !applyForm.reason.trim()) {
      setApplyError('Please fill all required fields'); return;
    }
    setSavingApply(true);
    try {
      const res = await leaveAPI.apply(applyForm);
      const created = res.data?.leave || res.data?.data;
      if (created) {
        setMyLeaves(prev => [created, ...prev]);
        // Immediately reflect in teamLeaves too (for HR/Manager view)
        if (isHROrAbove) {
          setTeamLeaves(prev => [created, ...prev]);
        }
      }
      setShowApply(false);
      setApplyForm({ startDate: '', endDate: '', reason: '' });
      toast.success('Leave request submitted');
      // Re-fetch to get fully populated data (with employee details)
      setTimeout(() => loadData(true), 500);
    } catch (e) {
      setApplyError(e.response?.data?.message || 'Failed to apply leave');
    } finally { setSavingApply(false); }
  };

  // ── Admin create leave ───────────────────────────────────────────────────
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
      setTimeout(() => loadData(true), 500);
    } catch (e) {
      setAdminLeaveError(e.response?.data?.message || 'Failed to add leave');
    } finally { setSavingAdminLeave(false); }
  };

  // ── Cancel leave ─────────────────────────────────────────────────────────
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

  // ── Review leave (approve / reject) ─────────────────────────────────────
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

  // ── Save reset settings ──────────────────────────────────────────────────
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

  // ── Derived: all leaves visible to HR/Manager/Admin ─────────────────────
  // Show leaves from all roles — the backend already scopes by role access
  const teamDashboardLeaves = useMemo(
    () => teamLeaves.filter((leave) => leave.status !== 'cancelled'),
    [teamLeaves]
  );

  // ── Loading state ────────────────────────────────────────────────────────
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
    { key: 'my', label: 'My Leaves' },
    ...(!isHROrAbove ? [{ key: 'my-calendar', label: 'My Calendar', icon: CalendarRange }] : []),
    ...(isHROrAbove ? [{ key: 'team', label: 'Team Dashboard' }] : []),
    ...(isHROrAbove ? [{ key: 'team-calendar', label: 'Team Calendar', icon: CalendarRange }] : []),
    ...(isAdmin ? [{ key: 'reset', label: 'Reset Schedule', icon: RotateCcw }] : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ── Header ── */}
      <section style={{ padding: '4px 2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: B.slateMid }}>
            HR Management
          </p>
          <h1 style={{ margin: '2px 0 0', fontSize: 26, fontWeight: 800, color: B.black, lineHeight: 1.1 }}>
            Leave <span style={{ color: B.blue }}>Management</span>
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: B.slateMid }}>
            Request leave, track approvals, and manage your team.
            {refreshing && <span style={{ marginLeft: 8, fontSize: 11, color: B.blue }}>↻ Syncing…</span>}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setShowSummaryCards((prev) => !prev)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 10px', borderRadius: 9,
              border: `1px solid ${B.border}`, background: '#fff',
              color: B.slateMid, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {showSummaryCards ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showSummaryCards ? 'Hide Summary' : 'Show Summary'}
          </button>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setApplyError(''); setShowApply(true); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 10,
              background: B.blue, color: '#fff',
              border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
            }}
          >
            <Plus size={15} /> Apply for Leave
          </motion.button>
          {isAdmin && (
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => { setAdminLeaveError(''); setShowAdminAddLeave(true); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', borderRadius: 10,
                background: B.black, color: '#fff',
                border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(15,23,42,0.25)',
              }}
            >
              <Plus size={15} /> Add Leave
            </motion.button>
          )}
        </div>
      </section>

      {/* ── Stat cards ── */}
      {showSummaryCards && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          {summaryCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <StatCard {...s} />
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ borderBottom: `1px solid ${B.border}` }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 14px', fontSize: 13, fontWeight: 600,
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

        {tab === 'team' && isHROrAbove && (
          <motion.div key="team" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <LeaveList leaves={teamDashboardLeaves} showUser onReview={setReviewModal} />
          </motion.div>
        )}

        {tab === 'team-calendar' && isHROrAbove && (
          <motion.div key="team-calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <LeaveCalendar
              leaves={teamDashboardLeaves}
              allLeaves={teamDashboardLeaves}
              showEmployeeNames
              showCancelledLegend={false}
              onRefresh={handleRefresh}
              refreshing={refreshing}
            />
          </motion.div>
        )}

        {tab === 'my-calendar' && !isHROrAbove && (
          <motion.div key="my-calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <LeaveCalendar
              leaves={myLeaves}
              allLeaves={myLeaves}
              showEmployeeNames={false}
              onApply={(date) => {
                setApplyError('');
                setApplyForm(p => ({ ...p, startDate: date, endDate: date }));
                setShowApply(true);
              }}
              onRefresh={handleRefresh}
              refreshing={refreshing}
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
              style={{ width: '100%', padding: '10px 14px', border: `1px solid ${B.border}`, borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff' }}
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
            <Input label="Start Date" type="date" value={adminLeaveForm.startDate} onChange={e => setAdminLeaveForm(p => ({ ...p, startDate: e.target.value }))} required />
            <Input label="End Date" type="date" value={adminLeaveForm.endDate} onChange={e => setAdminLeaveForm(p => ({ ...p, endDate: e.target.value }))} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: B.black, marginBottom: 6 }}>
              Status <span style={{ color: B.red }}>*</span>
            </label>
            <select
              value={adminLeaveForm.status}
              onChange={(e) => setAdminLeaveForm(p => ({ ...p, status: e.target.value }))}
              style={{ width: '100%', padding: '10px 14px', border: `1px solid ${B.border}`, borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff' }}
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
              rows={3} placeholder="Reason for leave..."
              style={{ width: '100%', padding: '10px 14px', border: `1px solid ${B.border}`, borderRadius: 10, fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box' }}
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

function NOCSection({ nocs }) {
  if (!nocs.length) {
    return (
      <div style={{ background: '#fff', border: `1px solid ${B.border}`, borderRadius: 14, padding: 24, textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: B.slate }}>No NOC requests found</p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: B.slateLight }}>New requests will appear here.</p>
      </div>
    );
  }

  return (
    <section style={{ background: '#fff', borderRadius: 14, border: `1px solid ${B.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${B.border}`, background: B.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: B.black }}>NOC Requests</p>
        <span style={{ fontSize: 11, fontWeight: 700, color: B.amber, background: B.amberBg, border: `1px solid ${B.amberBorder}`, borderRadius: 999, padding: '2px 8px' }}>
          Pending {nocs.filter(n => n.status === 'pending').length}
        </span>
      </div>

      <div style={{ maxHeight: '56vh', overflowY: 'auto', padding: 10, display: 'grid', gap: 8 }}>
        {nocs.map((n) => {
          const statusColor =
            n.status === 'approved' ? B.emerald : n.status === 'rejected' ? B.red : B.amber;
          const statusBg =
            n.status === 'approved' ? B.emeraldBg : n.status === 'rejected' ? B.redBg : B.amberBg;

          return (
            <div key={n._id} style={{ border: `1px solid ${B.border}`, borderRadius: 10, padding: '10px 12px', background: '#F8FAFC' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: B.black }}>
                  {n.employee?.name} · {n.accessoryName}
                </p>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', background: statusBg, color: statusColor }}>
                  {n.status}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: B.slateMid }}>
                {n.issueType} · Raised by {n.raisedBy?.name || 'Manager'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: B.slate }}>
                {n.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Leave list component ───────────────────────────────────────────────────────
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

  const sectionTitle = showUser ? 'All Employee Leaves' : 'My Leaves';
  const sectionSubtitle = `${leaves.length} request${leaves.length !== 1 ? 's' : ''}`;
  const listHeight = showUser ? 'clamp(340px, 64vh, 760px)' : 'clamp(300px, 56vh, 680px)';

  return (
    <section style={{ background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(15,23,42,0.05)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{sectionTitle}</p>
        <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748B' }}>{sectionSubtitle}</p>
      </div>

      <div
        style={{
          height: listHeight,
          overflowY: 'scroll',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          padding: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {leaves.map((leave, idx) => {
          const sv = STATUS_V[leave.status] || STATUS_V.pending;
          const Icon = sv.icon;
          const isPending = leave.status === 'pending';
          const start = new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const end   = new Date(leave.endDate).toLocaleDateString('en-US',   { month: 'short', day: 'numeric', year: 'numeric' });
          return (
            <motion.div
              key={leave._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              whileHover={{ boxShadow: '0 10px 28px rgba(15,23,42,0.09)' }}
              style={{
                background: '#fff', borderRadius: 16,
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 6px rgba(15,23,42,0.04)',
                overflow: 'visible', display: 'flex',
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
    </section>
  );
}

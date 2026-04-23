import { useState, useEffect, useCallback, useMemo } from 'react';
import { dailyTaskAPI, teamAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Modal, Avatar, Spinner } from '../../components/ui';
import {
  ClipboardList, Plus, Trash2, CheckCircle2,
  Users, Calendar, ToggleLeft, ToggleRight, RefreshCw,
  FileText, Send, Clock, CheckSquare,
  User as UserIcon, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// ─── helpers ──────────────────────────────────────────────────────────────────
function toLocalDayKey(dateLike) {
  const d = new Date(dateLike);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fromLocalDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function dateLabel(dayKey) {
  const d = fromLocalDayKey(dayKey);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ═══════════════════════════════════════════════════════════════════════════
// EMPLOYEE VIEW
// ═══════════════════════════════════════════════════════════════════════════
function EmployeeView() {
  const [status, setStatus] = useState(null);
  const [todayEntry, setTodayEntry] = useState(null);
  const [taskInputs, setTaskInputs] = useState(['']);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dailyTaskAPI.getMyStatus()
      .then(r => setStatus(r.data))
      .catch(() => setStatus({ isRequired: false, submittedToday: false }));

    dailyTaskAPI.getMyToday().then(r => {
      if (r.data?.entry) {
        setTodayEntry(r.data.entry);
        setTaskInputs(r.data.entry.tasks.length ? r.data.entry.tasks : ['']);
        setNotes(r.data.entry.notes || '');
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    const validTasks = taskInputs.filter(t => t.trim());
    if (!validTasks.length) { toast.error('Add at least one task'); return; }
    setSubmitting(true);
    try {
      const r = await dailyTaskAPI.submit({ tasks: validTasks, notes });
      setTodayEntry(r.data.entry);
      setStatus(s => ({ ...s, submittedToday: true }));
      toast.success(todayEntry ? 'Tasks updated!' : 'Daily tasks logged!');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to submit'); }
    finally { setSubmitting(false); }
  };

  if (!status) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, gap: 12 }}>
      <Spinner size="lg" />
      <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Loading your workspace…</p>
    </div>
  );

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const validCount = taskInputs.filter(t => t.trim()).length;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8' }}>Work Log</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
            My Daily <span style={{ color: '#2563eb' }}>Tasks</span>
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>{todayStr}</p>
        </div>

        <AnimatePresence>
          {status.submittedToday && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 999, background: '#ecfdf5', border: '1px solid #a7f3d0', fontSize: 12, fontWeight: 700, color: '#059669' }}>
              <CheckCircle2 size={14} /> Logged for today
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Instruction banner for required employees ── */}
      {status.isRequired && !status.submittedToday && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <AlertCircle size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 13, color: '#1e40af', fontWeight: 500 }}>
            Your manager has enabled daily task logging for you. Please log your tasks for today.
          </p>
        </motion.div>
      )}

      {/* ── Task input card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 2px 16px rgba(15,23,42,.06)', overflow: 'hidden' }}>

        {/* Card header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', background: '#fafbfc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardList size={16} style={{ color: '#2563eb' }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>What are you working on today?</p>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Log resets daily at midnight</p>
            </div>
          </div>
          {validCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '3px 10px', borderRadius: 999 }}>
              {validCount} task{validCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Task inputs */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {taskInputs.map((task, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flexShrink: 0, width: 26, height: 26, borderRadius: '50%', background: task.trim() ? '#eff6ff' : '#f8fafc', color: task.trim() ? '#2563eb' : '#cbd5e1', border: `1.5px solid ${task.trim() ? '#bfdbfe' : '#e2e8f0'}`, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}>
                  {i + 1}
                </div>
                <input
                  value={task}
                  onChange={e => setTaskInputs(p => p.map((t, idx) => idx === i ? e.target.value : t))}
                  placeholder={i === 0 ? 'e.g. Completing the login module…' : 'Add another task…'}
                  style={{ flex: 1, padding: '10px 14px', fontSize: 13, border: '1.5px solid #e2e8f0', borderRadius: 12, outline: 'none', background: '#fafafa', transition: 'border-color .15s, background .15s', color: '#0f172a' }}
                  onFocus={e => { e.target.style.borderColor = '#93c5fd'; e.target.style.background = '#fff'; }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#fafafa'; }}
                  onKeyDown={e => { if (e.key === 'Enter' && task.trim()) setTaskInputs(p => [...p, '']); }}
                />
                {taskInputs.length > 1 && (
                  <button
                    onClick={() => setTaskInputs(p => p.filter((_, idx) => idx !== i))}
                    style={{ padding: 7, border: 'none', background: 'transparent', cursor: 'pointer', color: '#cbd5e1', borderRadius: 8, display: 'flex', alignItems: 'center', transition: 'color .15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}>
                    <Trash2 size={14} />
                  </button>
                )}
              </motion.div>
            ))}
          </div>

          <button
            onClick={() => setTaskInputs(p => [...p, ''])}
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#2563eb', border: '1.5px dashed #bfdbfe', background: '#f8fbff', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', transition: 'background .15s, border-color .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f8fbff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}>
            <Plus size={13} /> Add task
          </button>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
              Notes <span style={{ fontWeight: 400, color: '#94a3b8', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any blockers, progress notes, or context for your manager…"
              style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1.5px solid #e2e8f0', borderRadius: 12, resize: 'none', outline: 'none', boxSizing: 'border-box', background: '#fafafa', color: '#0f172a', transition: 'border-color .15s, background .15s' }}
              onFocus={e => { e.target.style.borderColor = '#93c5fd'; e.target.style.background = '#fff'; }}
              onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#fafafa'; }}
            />
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
              {status.submittedToday
                ? '✓ Updating your log for today'
                : 'Press Enter in any field to add a new task'}
            </p>
            <Button
              onClick={handleSubmit}
              loading={submitting}
              disabled={validCount === 0}>
              <Send size={14} />
              {todayEntry ? 'Update log' : 'Submit log'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Today's submitted snapshot (read-only view after submit) ── */}
      <AnimatePresence>
        {todayEntry && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(15,23,42,.05)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', background: '#fafbfc', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={14} style={{ color: '#059669' }} />
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Last submitted snapshot</p>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>
                {new Date(todayEntry.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayEntry.tasks.map((task, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CheckCircle2 size={14} style={{ color: '#2563eb', flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>{task}</span>
                </div>
              ))}
              {todayEntry.notes && (
                <div style={{ marginTop: 6, padding: '8px 12px', background: '#f8fafc', borderRadius: 10, fontSize: 12, color: '#64748b', border: '1px solid #f1f5f9', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <FileText size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                  {todayEntry.notes}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Not required & no entry yet ── */}
      {!status.isRequired && !todayEntry && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 12, background: '#fffbeb', border: '1px solid #fde68a' }}>
          <AlertCircle size={14} style={{ color: '#d97706', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 12, color: '#92400e' }}>
            Daily task logging is not required for your account by your manager, but you can still log your tasks above voluntarily.
          </p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MANAGEMENT VIEW
// ═══════════════════════════════════════════════════════════════════════════
function ManagementView() {
  const [adminTab, setAdminTab] = useState('submissions');
  const [allEntries, setAllEntries] = useState([]);
  const [settings, setSettings] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [viewEntry, setViewEntry] = useState(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    try { const r = await dailyTaskAPI.adminGetAll(); setAllEntries(r.data.entries || []); }
    catch { toast.error('Failed to load submissions'); }
    finally { setLoadingEntries(false); }
  }, []);

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    try { const r = await dailyTaskAPI.adminGetSettings(); setSettings(r.data.users || []); }
    catch { toast.error('Failed to load employee settings'); }
    finally { setLoadingSettings(false); }
  }, []);

  const loadTeams = useCallback(async () => {
    try {
      const r = await teamAPI.getAll();
      setTeams(r.data.teams || []);
    } catch {
      setTeams([]);
    }
  }, []);

  useEffect(() => {
    loadEntries();
    loadSettings();
    loadTeams();
  }, [loadEntries, loadSettings, loadTeams]);

  const selectedTeamMemberIds = useMemo(() => {
    if (!selectedTeamId) return [];
    const team = teams.find(t => t._id === selectedTeamId);
    if (!team) return [];
    const memberIds = new Set((team.members || []).map(m => String(m._id || m)));
    const eligibleIds = new Set(settings.map(u => String(u._id)));
    return Array.from(memberIds).filter(id => eligibleIds.has(id));
  }, [selectedTeamId, teams, settings]);

  // ── Handlers ──
  const handleToggle = async (userId, current) => {
    setTogglingId(userId);
    try {
      await dailyTaskAPI.adminToggle(userId, !current);
      setSettings(prev => prev.map(u => u._id === userId ? { ...u, isRequired: !current } : u));
      toast.success(`Daily logging ${!current ? 'enabled' : 'disabled'}`);
    } catch { toast.error('Failed to update'); }
    finally { setTogglingId(null); }
  };

  const handleBulk = async (isRequired) => {
    try {
      await dailyTaskAPI.adminBulkToggle(isRequired);
      setSettings(prev => prev.map(u => ({ ...u, isRequired })));
      setSelectedEmployeeIds([]);
      toast.success(isRequired ? 'Enabled for all employees' : 'Disabled for all employees');
    } catch { toast.error('Failed'); }
  };

  const handleSelectedAssign = async (isRequired) => {
    if (!selectedEmployeeIds.length) { toast.error('Select at least one employee'); return; }
    try {
      await dailyTaskAPI.adminSetSelected(selectedEmployeeIds, isRequired);
      const sel = new Set(selectedEmployeeIds);
      setSettings(prev => prev.map(u => sel.has(u._id) ? { ...u, isRequired } : u));
      toast.success(`${isRequired ? 'Enabled' : 'Disabled'} for ${selectedEmployeeIds.length} employee(s)`);
      setSelectedEmployeeIds([]);
    } catch { toast.error('Failed to update selected employees'); }
  };

  const handleTeamAssign = async (isRequired) => {
    if (!selectedTeamMemberIds.length) {
      toast.error('Selected team has no active employees/team leads');
      return;
    }
    try {
      await dailyTaskAPI.adminSetSelected(selectedTeamMemberIds, isRequired);
      const selectedSet = new Set(selectedTeamMemberIds);
      setSettings(prev => prev.map(u => selectedSet.has(u._id) ? { ...u, isRequired } : u));
      setSelectedEmployeeIds([]);
      toast.success(`${isRequired ? 'Enabled' : 'Disabled'} for selected team (${selectedTeamMemberIds.length})`);
    } catch {
      toast.error('Failed to update team members');
    }
  };

  // ── Stats ──
  const totalEnrolled = settings.filter(u => u.isRequired).length;
  const submittedToday = allEntries.length;
  const pendingCount = Math.max(0, totalEnrolled - submittedToday);

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8' }}>Work Log</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
            Daily Task <span style={{ color: '#2563eb' }}>Overview</span>
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>{todayStr}</p>
        </div>
        <button
          onClick={() => { loadEntries(); loadSettings(); }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer', transition: 'background .15s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
          <RefreshCw size={13} className={loadingEntries ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'Enrolled', value: totalEnrolled, icon: Users, color: '#2563eb', bg: '#eff6ff' },
          { label: 'Submitted Today', value: submittedToday, icon: CheckSquare, color: '#059669', bg: '#ecfdf5' },
          { label: 'Yet to Submit', value: pendingCount, icon: Clock, color: '#d97706', bg: '#fffbeb' },
          { label: 'Total Employees', value: settings.length, icon: UserIcon, color: '#7c3aed', bg: '#f5f3ff' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <motion.div key={label} whileHover={{ y: -2 }}
            style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 8px rgba(15,23,42,.05)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{value}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { key: 'submissions', label: "Today's Submissions", icon: FileText },
            { key: 'employees', label: 'Manage Employees', icon: Users },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setAdminTab(key)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', fontSize: 13, fontWeight: 600, border: 'none', borderBottom: `2px solid ${adminTab === key ? '#2563eb' : 'transparent'}`, marginBottom: -1, color: adminTab === key ? '#2563eb' : '#64748b', background: 'none', cursor: 'pointer', transition: 'color .15s' }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Today's Submissions ── */}
      {adminTab === 'submissions' && (
        <div>
          {loadingEntries ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}><Spinner /></div>
          ) : allEntries.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ background: '#fff', borderRadius: 20, border: '1px solid #f1f5f9', padding: '64px 24px', textAlign: 'center', boxShadow: '0 1px 8px rgba(15,23,42,.04)' }}>
              <ClipboardList size={40} style={{ color: '#e2e8f0', margin: '0 auto 12px' }} />
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#64748b' }}>No submissions yet today</p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94a3b8' }}>Employees log their own tasks. Check back later.</p>
            </motion.div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {allEntries.map(entry => (
                <motion.div key={entry._id}
                  whileHover={{ y: -2 }}
                  onClick={() => setViewEntry(entry)}
                  style={{ background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', padding: 16, boxShadow: '0 1px 8px rgba(15,23,42,.05)', cursor: 'pointer', transition: 'border-color .15s, box-shadow .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.boxShadow = '0 1px 8px rgba(15,23,42,.05)'; }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={entry.employee?.name} size="sm" />
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{entry.employee?.name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{entry.employee?.department || entry.employee?.designation}</p>
                      </div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '3px 9px', borderRadius: 999 }}>
                      <CheckCircle2 size={10} /> Submitted
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {entry.tasks.slice(0, 3).map((task, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#2563eb', flexShrink: 0, marginTop: 6 }} />
                        <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{task}</span>
                      </div>
                    ))}
                    {entry.tasks.length > 3 && (
                      <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', paddingLeft: 13 }}>+{entry.tasks.length - 3} more task{entry.tasks.length - 3 !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      {entry.tasks.length} task{entry.tasks.length !== 1 ? 's' : ''}
                    </span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      {new Date(entry.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Manage Employees ── */}
      {adminTab === 'employees' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Info banner */}
          <div style={{ padding: '12px 16px', borderRadius: 12, background: '#f0f9ff', border: '1px solid #bae6fd', fontSize: 13, color: '#0369a1' }}>
            Enable daily task logging for individual employees, selected users, or complete teams. Enrolled employees will see a task log form each morning to fill out what they're working on — <strong>you can view submissions above</strong>.
          </div>

          {/* Team actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Assign by team</span>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, color: '#334155', background: '#fff', minWidth: 220 }}
              >
                <option value="">Select a team...</option>
                {teams.map(team => (
                  <option key={team._id} value={team._id}>{team.name}</option>
                ))}
              </select>
              {selectedTeamId && (
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  {selectedTeamMemberIds.length} eligible members
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {selectedTeamId && (
                <button
                  onClick={() => setSelectedEmployeeIds(selectedTeamMemberIds)}
                  style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 10, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer' }}
                >
                  Select Team Members
                </button>
              )}
              {selectedTeamId && (
                <>
                  <button
                    onClick={() => handleTeamAssign(true)}
                    style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 10, border: '1px solid #a7f3d0', background: '#ecfdf5', color: '#065f46', cursor: 'pointer' }}
                  >
                    Enable Team
                  </button>
                  <button
                    onClick={() => handleTeamAssign(false)}
                    style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', cursor: 'pointer' }}
                  >
                    Disable Team
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Bulk actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
              <strong>{settings.filter(u => u.isRequired).length}</strong> of <strong>{settings.length}</strong> employees enrolled
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {selectedEmployeeIds.length > 0 && (
                <>
                  <button onClick={() => handleSelectedAssign(true)}
                    style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 10, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer' }}>
                    Enable {selectedEmployeeIds.length} selected
                  </button>
                  <button onClick={() => handleSelectedAssign(false)}
                    style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 10, border: '1px solid #fde68a', background: '#fffbeb', color: '#b45309', cursor: 'pointer' }}>
                    Disable {selectedEmployeeIds.length} selected
                  </button>
                </>
              )}
              <button onClick={() => handleBulk(true)}
                style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 10, border: '1px solid #a7f3d0', background: '#ecfdf5', color: '#065f46', cursor: 'pointer' }}>
                Enable All
              </button>
              <button onClick={() => handleBulk(false)}
                style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', cursor: 'pointer' }}>
                Disable All
              </button>
            </div>
          </div>

          {/* Employee list */}
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 1px 8px rgba(15,23,42,.04)' }}>
            {loadingSettings ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80 }}><Spinner /></div>
            ) : (
              <>
                {/* Table header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
                    <input type="checkbox"
                      checked={settings.length > 0 && selectedEmployeeIds.length === settings.length}
                      onChange={e => setSelectedEmployeeIds(e.target.checked ? settings.map(u => u._id) : [])}
                      style={{ width: 15, height: 15, accentColor: '#2563eb' }} />
                    Select all
                  </label>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{selectedEmployeeIds.length} selected</span>
                </div>

                {/* Rows */}
                <div>
                  {settings.map((u, idx) => {
                    // Did this employee submit today?
                    const submitted = allEntries.some(e => e.employee?._id === u._id || e.employee?.toString() === u._id);
                    return (
                      <div key={u._id}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: idx < settings.length - 1 ? '1px solid #f8fafc' : 'none', transition: 'background .1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <input type="checkbox"
                            checked={selectedEmployeeIds.includes(u._id)}
                            onChange={e => setSelectedEmployeeIds(prev => e.target.checked ? [...new Set([...prev, u._id])] : prev.filter(id => id !== u._id))}
                            style={{ width: 15, height: 15, accentColor: '#2563eb' }} />
                          <Avatar name={u.name} size="sm" />
                          <div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{u.name}</p>
                            <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{u.department || u.email}</p>
                          </div>
                          {u.isRequired && submitted && (
                            <span style={{ fontSize: 10, fontWeight: 700, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 7px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle2 size={9} /> Submitted
                            </span>
                          )}
                          {u.isRequired && !submitted && (
                            <span style={{ fontSize: 10, fontWeight: 700, background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', padding: '2px 7px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={9} /> Pending
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleToggle(u._id, u.isRequired)}
                          disabled={togglingId === u._id}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, border: u.isRequired ? '1px solid #a7f3d0' : '1px solid #e2e8f0', background: u.isRequired ? '#ecfdf5' : '#f8fafc', color: u.isRequired ? '#065f46' : '#64748b', fontSize: 12, fontWeight: 600, cursor: togglingId === u._id ? 'not-allowed' : 'pointer', opacity: togglingId === u._id ? 0.5 : 1, transition: 'all .15s' }}>
                          {u.isRequired
                            ? <><ToggleRight size={15} style={{ color: '#059669' }} /> Enrolled</>
                            : <><ToggleLeft size={15} /> Not enrolled</>}
                        </button>
                      </div>
                    );
                  })}
                  {settings.length === 0 && (
                    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                      <Users size={32} style={{ color: '#e2e8f0', margin: '0 auto 8px' }} />
                      <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>No employees found</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Entry detail modal ── */}
      <Modal open={!!viewEntry} onClose={() => setViewEntry(null)} title="Submission Details">
        {viewEntry && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f8fafc', borderRadius: 14, padding: 14 }}>
              <Avatar name={viewEntry.employee?.name} size="sm" />
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{viewEntry.employee?.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{viewEntry.employee?.department || viewEntry.employee?.designation}</p>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#0f172a' }}>Today</p>
                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
                  {new Date(viewEntry.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div>
              <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>
                Tasks ({viewEntry.tasks.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {viewEntry.tasks.map((task, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#f8fafc', borderRadius: 12, padding: '10px 14px' }}>
                    <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>{i + 1}</span>
                    <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>{task}</span>
                  </div>
                ))}
              </div>
            </div>

            {viewEntry.notes && (
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>Notes</p>
                <p style={{ margin: 0, fontSize: 13, color: '#475569', background: '#f8fafc', borderRadius: 12, padding: '10px 14px', border: '1px solid #f1f5f9' }}>
                  {viewEntry.notes}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setViewEntry(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════
export default function DailyTasksPage() {
  const { user } = useAuth();
  const isManagement = ['admin', 'hr', 'manager'].includes(user?.role);

  return isManagement ? <ManagementView /> : <EmployeeView />;
}

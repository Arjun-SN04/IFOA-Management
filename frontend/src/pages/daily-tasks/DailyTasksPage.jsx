import { useState, useEffect } from 'react';
import { dailyTaskAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Modal, Avatar, Spinner } from '../../components/ui';
import {
  ClipboardList, Plus, Trash2, CheckCircle2,
  Users, Calendar, ToggleLeft, ToggleRight, RefreshCw,
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

function toLocalDayKey(dateLike) {
  const d = new Date(dateLike);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

function groupByDate(entries) {
  const map = {};
  entries.forEach(e => {
    const key = toLocalDayKey(e.submittedAt || e.date);
    if (!map[key]) map[key] = [];
    map[key].push(e);
  });
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
}

export default function DailyTasksPage() {
  const { user } = useAuth();
  const isAdminUser = user?.role === 'admin';

  // Employee state
  const [status, setStatus]         = useState(null);
  const [todayEntry, setTodayEntry] = useState(null);
  const [taskInputs, setTaskInputs] = useState(['']);
  const [notes, setNotes]           = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Admin state
  const [adminTab, setAdminTab]         = useState('entries');
  const [allEntries, setAllEntries]     = useState([]);
  const [settings, setSettings]         = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [togglingId, setTogglingId]     = useState(null);
  const [viewEntry, setViewEntry]       = useState(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);

  useEffect(() => {
    if (!isAdminUser) {
      dailyTaskAPI.getMyStatus().then(r => setStatus(r.data)).catch(() => setStatus({ isRequired: false, submittedToday: false }));
      dailyTaskAPI.getMyToday().then(r => {
        if (r.data?.entry) {
          setTodayEntry(r.data.entry);
          setTaskInputs(r.data.entry.tasks.length ? r.data.entry.tasks : ['']);
          setNotes(r.data.entry.notes || '');
        }
      }).catch(() => {});
    }
  }, [isAdminUser]);

  useEffect(() => {
    if (isAdminUser) { loadEntries(); loadSettings(); }
  }, [isAdminUser]);

  const loadEntries = async () => {
    setLoadingEntries(true);
    try { const r = await dailyTaskAPI.adminGetAll(); setAllEntries(r.data.entries || []); }
    catch { toast.error('Failed to load entries'); }
    finally { setLoadingEntries(false); }
  };

  const loadSettings = async () => {
    setLoadingSettings(true);
    try { const r = await dailyTaskAPI.adminGetSettings(); setSettings(r.data.users || []); }
    catch { toast.error('Failed to load settings'); }
    finally { setLoadingSettings(false); }
  };

  const handleSelectEmployee = (userId, checked) => {
    setSelectedEmployeeIds(prev => {
      if (checked) return prev.includes(userId) ? prev : [...prev, userId];
      return prev.filter(id => id !== userId);
    });
  };

  const handleSelectAllVisible = (checked) => {
    if (checked) {
      setSelectedEmployeeIds(settings.map(u => u._id));
    } else {
      setSelectedEmployeeIds([]);
    }
  };

  const handleSubmit = async () => {
    const validTasks = taskInputs.filter(t => t.trim());
    if (!validTasks.length) { toast.error('Add at least one task'); return; }
    setSubmitting(true);
    try {
      const r = await dailyTaskAPI.submit({ tasks: validTasks, notes });
      setTodayEntry(r.data.entry);
      setStatus(s => ({ ...s, submittedToday: true }));
      toast.success(todayEntry ? 'Tasks updated!' : 'Tasks submitted!');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleToggle = async (userId, current) => {
    setTogglingId(userId);
    try {
      await dailyTaskAPI.adminToggle(userId, !current);
      setSettings(prev => prev.map(u => u._id === userId ? { ...u, isRequired: !current } : u));
      toast.success(`Daily entry ${!current ? 'enabled' : 'disabled'}`);
    } catch { toast.error('Failed'); }
    finally { setTogglingId(null); }
  };

  const handleBulk = async (isRequired) => {
    try {
      await dailyTaskAPI.adminBulkToggle(isRequired);
      setSettings(prev => prev.map(u => ({ ...u, isRequired })));
      setSelectedEmployeeIds([]);
      toast.success(isRequired ? 'Enabled for all' : 'Disabled for all');
    } catch { toast.error('Failed'); }
  };

  const handleSelectedAssign = async (isRequired) => {
    if (!selectedEmployeeIds.length) {
      toast.error('Select at least one employee');
      return;
    }

    try {
      await dailyTaskAPI.adminSetSelected(selectedEmployeeIds, isRequired);
      const selectedSet = new Set(selectedEmployeeIds);
      setSettings(prev => prev.map(u => (selectedSet.has(u._id) ? { ...u, isRequired } : u)));
      toast.success(`${isRequired ? 'Enabled' : 'Disabled'} for ${selectedEmployeeIds.length} selected employee(s)`);
      setSelectedEmployeeIds([]);
    } catch {
      toast.error('Failed to update selected employees');
    }
  };

  // ── Employee view ─────────────────────────────────────────────────────────
  if (!isAdminUser) {
    if (!status) return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );

    if (!status.isRequired) return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
          <ClipboardList className="w-8 h-8 text-slate-300" />
        </div>
        <div>
          <p className="text-slate-600 font-semibold">Daily Check-ins Not Required</p>
          <p className="text-slate-400 text-sm mt-1">Your admin hasn't enabled daily task submissions for you yet.</p>
        </div>
      </div>
    );

    return (
      <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header */}
        <div style={{ padding: '8px 2px' }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B' }}>Work Log</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 30, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
            Daily <span style={{ color: '#2563EB' }}>Check-in</span>
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: '#64748B' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {status.submittedToday && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 16, padding: '14px 16px' }}>
            <CheckCircle2 style={{ color: '#059669', flexShrink: 0 }} size={20} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#065F46' }}>Submitted for today</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#059669' }}>You can still update your tasks below.</p>
            </div>
          </motion.div>
        )}

        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(15,23,42,0.05)', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>
              What are you working on today? <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {taskInputs.map((task, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flexShrink: 0, width: 26, height: 26, borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                  <input value={task} onChange={e => setTaskInputs(p => p.map((t, idx) => idx === i ? e.target.value : t))}
                    placeholder={`Task ${i + 1}…`}
                    style={{ flex: 1, padding: '10px 14px', fontSize: 13, border: '1px solid #E2E8F0', borderRadius: 10, outline: 'none', background: '#fff' }} />
                  {taskInputs.length > 1 && (
                    <button onClick={() => setTaskInputs(p => p.filter((_, idx) => idx !== i))}
                      style={{ padding: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#94A3B8', borderRadius: 8, display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setTaskInputs(p => [...p, ''])}
              style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#2563EB', border: 'none', background: 'none', cursor: 'pointer', padding: '6px 4px' }}>
              <Plus size={14} /> Add another task
            </button>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Blockers, context, or anything else for today…"
              style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid #E2E8F0', borderRadius: 10, resize: 'none', outline: 'none', boxSizing: 'border-box', background: '#fff' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={handleSubmit} loading={submitting} disabled={!taskInputs.filter(t => t.trim()).length}>
              <CheckCircle2 size={15} />
              {todayEntry ? 'Update Tasks' : 'Submit for Today'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Admin view ────────────────────────────────────────────────────────────
  const grouped = groupByDate(allEntries);
  const requiredCount = settings.filter(u => u.isRequired).length;

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <section style={{ padding: '8px 2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B' }}>Work Log</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 30, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
            Daily Task <span style={{ color: '#2563EB' }}>Entries</span>
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: '#64748B' }}>Today's submissions · previous days auto-removed daily</p>
        </div>
        <button onClick={() => { loadEntries(); loadSettings(); }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', border: '1px solid #E2E8F0', borderRadius: 10, background: '#fff', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
          <RefreshCw size={13} className={loadingEntries ? 'animate-spin' : ''} /> Refresh
        </button>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Total (Today)', value: allEntries.length, icon: ClipboardList, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Today', value: allEntries.filter(e => toLocalDayKey(e.submittedAt || e.date) === toLocalDayKey(new Date())).length, icon: CheckCircle2, color: '#10b981', bg: '#f0fdf4' },
          { label: `Required (${requiredCount}/${settings.length})`, value: requiredCount, icon: Users, color: '#8b5cf6', bg: '#f5f3ff' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <motion.div key={label} whileHover={{ y: -2 }}
            className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 shadow-sm">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          {[{ key: 'entries', label: 'Submissions', icon: ClipboardList }, { key: 'settings', label: 'Manage Employees', icon: Users }].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setAdminTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                adminTab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Entries */}
      {adminTab === 'entries' && (
        <div className="space-y-6">
          {loadingEntries ? (
            <div className="flex items-center justify-center h-32"><Spinner /></div>
          ) : grouped.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center shadow-sm">
              <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold">No entries yet</p>
              <p className="text-slate-400 text-sm mt-1">Employee submissions appear here</p>
            </div>
          ) : grouped.map(([date, entries]) => (
            <motion.div key={date} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-700">{dateLabel(date)}</h3>
                <span className="text-xs text-slate-400">{fromLocalDayKey(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">{entries.length}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {entries.map(entry => (
                  <motion.div key={entry._id} whileHover={{ y: -2 }}
                    className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm cursor-pointer hover:border-blue-200 transition-all"
                    onClick={() => setViewEntry(entry)}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={entry.employee?.name} size="sm" />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{entry.employee?.name}</p>
                          <p className="text-xs text-slate-400">{entry.employee?.department || entry.employee?.designation}</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(entry.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {entry.tasks.slice(0, 3).map((task, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <CheckCircle2 size={12} style={{ color: '#2563EB', flexShrink: 0, marginTop: 3 }} />
                          <span className="line-clamp-1">{task}</span>
                        </li>
                      ))}
                      {entry.tasks.length > 3 && <li className="text-xs text-slate-400 ml-3.5">+{entry.tasks.length - 3} more</li>}
                    </ul>
                    {entry.notes && (
                      <p className="mt-2 text-xs text-slate-400 bg-slate-50 rounded-lg px-2 py-1.5 line-clamp-1 flex items-center gap-1">
                        <FileText size={10} style={{ flexShrink: 0 }} /> {entry.notes}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Settings */}
      {adminTab === 'settings' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">Select which employees must submit daily task entries.</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => handleSelectedAssign(true)}
                className="px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 rounded-xl border border-blue-200 transition-colors">
                Enable Selected ({selectedEmployeeIds.length})
              </button>
              <button onClick={() => handleSelectedAssign(false)}
                className="px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 rounded-xl border border-amber-200 transition-colors">
                Disable Selected ({selectedEmployeeIds.length})
              </button>
              <button onClick={() => handleBulk(false)}
                className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors">
                Disable All
              </button>
              <button onClick={() => handleBulk(true)}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-xl border border-emerald-200 transition-colors">
                Enable All
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            {loadingSettings ? (
              <div className="flex items-center justify-center h-24"><Spinner /></div>
            ) : (
              <div className="divide-y divide-slate-50">
                <div className="flex items-center justify-between px-5 py-3 bg-slate-50/80">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={settings.length > 0 && selectedEmployeeIds.length === settings.length}
                      onChange={(e) => handleSelectAllVisible(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Select all visible employees
                  </label>
                  <span className="text-xs text-slate-400">{selectedEmployeeIds.length} selected</span>
                </div>
                {settings.map(u => (
                  <div key={u._id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedEmployeeIds.includes(u._id)}
                        onChange={(e) => handleSelectEmployee(u._id, e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Avatar name={u.name} size="sm" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.department || u.email}</p>
                      </div>
                    </div>
                    <button onClick={() => handleToggle(u._id, u.isRequired)}
                      disabled={togglingId === u._id}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        u.isRequired
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      } ${togglingId === u._id ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {u.isRequired ? <><ToggleRight className="w-4 h-4" /> Required</> : <><ToggleLeft className="w-4 h-4" /> Optional</>}
                    </button>
                  </div>
                ))}
                {settings.length === 0 && (
                  <div className="p-12 text-center">
                    <Users className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No employees found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Entry detail modal */}
      <Modal open={!!viewEntry} onClose={() => setViewEntry(null)} title="Task Entry Detail">
        {viewEntry && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
              <Avatar name={viewEntry.employee?.name} size="sm" />
              <div>
                <p className="text-sm font-bold text-slate-900">{viewEntry.employee?.name}</p>
                <p className="text-xs text-slate-400">{viewEntry.employee?.department}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs font-semibold text-slate-700">{dateLabel(viewEntry.date)}</p>
                <p className="text-xs text-slate-400">{new Date(viewEntry.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Tasks ({viewEntry.tasks.length})</p>
              <ul className="space-y-2">
                {viewEntry.tasks.map((task, i) => (
                  <li key={i} className="flex items-start gap-2.5 bg-slate-50 rounded-xl px-3 py-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
                    <span className="text-sm text-slate-700">{task}</span>
                  </li>
                ))}
              </ul>
            </div>
            {viewEntry.notes && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Notes</p>
                <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{viewEntry.notes}</p>
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setViewEntry(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

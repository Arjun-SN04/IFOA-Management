import { useState, useEffect } from 'react';
import { leaveAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Badge, Avatar, Spinner, Alert } from '../../components/ui';
import { Plus, CalendarDays, Clock, CheckCircle, XCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const STATUS_V = {
  pending: { v: 'warning', label: 'Pending', icon: Clock },
  approved: { v: 'success', label: 'Approved', icon: CheckCircle },
  rejected: { v: 'danger', label: 'Rejected', icon: XCircle },
  cancelled: { v: 'default', label: 'Cancelled', icon: AlertCircle },
};

function Stat({ label, value, icon: Icon, color, bg }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: bg }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function LeavesPage() {
  const { user, isManagerOrAdmin, isAdmin } = useAuth();
  const [myLeaves, setMyLeaves] = useState([]);
  const [teamLeaves, setTeamLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(isAdmin ? 'team' : 'my');

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
      const calls = [
        leaveAPI.getMy().catch(() => ({ data: { leaves: [] } })),
      ];
      if (isManagerOrAdmin) calls.push(leaveAPI.getAll().catch(() => ({ data: { leaves: [] } })));
      if (isAdmin) calls.push(leaveAPI.getResetSettings().catch(() => null));

      const [myRes, allRes, resetRes] = await Promise.all(calls);
      setMyLeaves(myRes?.data?.leaves || myRes?.data?.data || []);
      if (allRes) setTeamLeaves(allRes?.data?.leaves || allRes?.data?.data || []);

      if (resetRes?.data) {
        setResetDayOfMonth(resetRes.data.resetDayOfMonth || 1);
        setLastResetMonthKey(resetRes.data.lastResetMonthKey || '');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isManagerOrAdmin, isAdmin]);

  useEffect(() => {
    setTab(isAdmin ? 'team' : 'my');
  }, [isAdmin]);

  const handleApply = async () => {
    setApplyError('');
    if (!applyForm.startDate || !applyForm.endDate || !applyForm.reason.trim()) {
      setApplyError('Please fill all required fields');
      return;
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
    } finally {
      setSavingApply(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this leave request?')) return;
    try {
      const res = await leaveAPI.cancel(id);
      const updated = res.data?.leave || res.data?.data;
      setMyLeaves(prev => prev.map(l => (l._id === id ? (updated || { ...l, status: 'cancelled' }) : l)));
      toast.success('Leave cancelled');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Cancel failed');
    }
  };

  const handleReview = async (status) => {
    try {
      const res = await leaveAPI.review(reviewModal._id, { status, reviewComment: reviewNote });
      const updated = res.data?.leave || res.data?.data;
      if (updated) {
        setTeamLeaves(prev => prev.map(l => (l._id === reviewModal._id ? updated : l)));
      }
      setReviewModal(null);
      setReviewNote('');
      toast.success(`Leave ${status}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Review failed');
    }
  };

  const handleSaveReset = async () => {
    setSavingReset(true);
    try {
      const res = await leaveAPI.updateResetSettings({ resetDayOfMonth });
      setResetDayOfMonth(res.data?.resetDayOfMonth || resetDayOfMonth);
      setLastResetMonthKey(res.data?.lastResetMonthKey || lastResetMonthKey);
      toast.success('Monthly reset date updated');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save reset date');
    } finally {
      setSavingReset(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  const summary = {
    pending: myLeaves.filter(l => l.status === 'pending').length,
    approved: myLeaves.filter(l => l.status === 'approved').length,
    rejected: myLeaves.filter(l => l.status === 'rejected').length,
    cancelled: myLeaves.filter(l => l.status === 'cancelled').length,
  };

  const tabs = [
    ...(!isAdmin ? [{ key: 'my', label: 'My Leaves' }] : []),
    ...(isManagerOrAdmin ? [{ key: 'team', label: 'Leave Dashboard' }] : []),
    ...(isAdmin ? [{ key: 'reset', label: 'Reset Schedule', icon: RotateCcw }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leave Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Request leave and track approval status</p>
        </div>
        {!isAdmin && (
          <Button onClick={() => { setApplyError(''); setShowApply(true); }}>
            <Plus className="w-4 h-4" /> Apply for Leave
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Pending" value={summary.pending} icon={Clock} color="#f59e0b" bg="#fffbeb" />
        <Stat label="Approved" value={summary.approved} icon={CheckCircle} color="#10b981" bg="#f0fdf4" />
        <Stat label="Rejected" value={summary.rejected} icon={XCircle} color="#ef4444" bg="#fef2f2" />
        <Stat label="Cancelled" value={summary.cancelled} icon={AlertCircle} color="#64748b" bg="#f8fafc" />
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                tab === key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'my' && <LeaveList leaves={myLeaves} mine onCancel={handleCancel} />}
      {tab === 'team' && isManagerOrAdmin && <LeaveList leaves={teamLeaves} showUser onReview={setReviewModal} />}

      {tab === 'reset' && isAdmin && (
        <Card className="p-6 max-w-xl mx-auto">
          <h3 className="text-base font-bold text-slate-900">Monthly Leave Reset</h3>
          <p className="text-sm text-slate-500 mt-1">All leave requests are cleared monthly on this date.</p>
          <div className="mt-4">
            <label className="block text-xs text-slate-500 mb-1">Reset day of month (1-28)</label>
            <input
              type="number"
              min="1"
              max="28"
              value={resetDayOfMonth}
              onChange={(e) => setResetDayOfMonth(Math.max(1, Math.min(28, parseInt(e.target.value, 10) || 1)))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <p className="text-xs text-slate-400 mt-3">Last reset month: {lastResetMonthKey || 'Not yet'}</p>
          <div className="flex justify-end mt-4">
            <Button onClick={handleSaveReset} loading={savingReset}>Save Reset Date</Button>
          </div>
        </Card>
      )}

      <Modal open={showApply} onClose={() => setShowApply(false)} title="Apply for Leave">
        <div className="space-y-4">
          {applyError && <Alert variant="error">{applyError}</Alert>}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={applyForm.startDate} onChange={e => setApplyForm(p => ({ ...p, startDate: e.target.value }))} required />
            <Input label="End Date" type="date" value={applyForm.endDate} onChange={e => setApplyForm(p => ({ ...p, endDate: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason <span className="text-red-500">*</span></label>
            <textarea
              value={applyForm.reason}
              onChange={e => setApplyForm(p => ({ ...p, reason: e.target.value }))}
              rows={3}
              placeholder="Reason for leave..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowApply(false)}>Cancel</Button>
            <Button onClick={handleApply} loading={savingApply}>Submit Request</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!reviewModal} onClose={() => setReviewModal(null)} title="Review Leave Request">
        {reviewModal && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-3 mb-2">
                <Avatar name={reviewModal.employee?.name} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{reviewModal.employee?.name}</p>
                  <p className="text-xs text-slate-400">{reviewModal.employee?.department}</p>
                </div>
              </div>
              <p className="text-sm text-slate-700">{new Date(reviewModal.startDate).toLocaleDateString()} - {new Date(reviewModal.endDate).toLocaleDateString()}</p>
              <p className="text-sm text-slate-600">{reviewModal.totalDays} day(s)</p>
              <p className="text-sm text-slate-500">Reason: {reviewModal.reason || '—'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Review Comment (optional)</label>
              <textarea
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                rows={2}
                placeholder="Add a note..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
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
      <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center shadow-sm">
        <CalendarDays className="w-10 h-10 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">No leave requests found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {leaves.map(leave => {
        const sv = STATUS_V[leave.status] || STATUS_V.pending;
        const Icon = sv.icon;
        const isPending = leave.status === 'pending';
        return (
          <motion.div key={leave._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {showUser && <Avatar name={leave.employee?.name} size="sm" className="mt-0.5" />}
                <div className="flex-1 min-w-0">
                  {showUser && (
                    <p className="text-sm font-bold text-slate-900">
                      {leave.employee?.name}
                      <span className="text-xs font-normal text-slate-400 ml-1">- {leave.employee?.department}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <span className="text-sm font-semibold text-slate-900">Leave Request</span>
                    <Badge variant={sv.v}><Icon className="w-3 h-3 mr-1" />{sv.label}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' - '}
                    {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' - '}{leave.totalDays} day(s)
                  </p>
                  {leave.reason && <p className="text-xs text-slate-400 mt-1 line-clamp-1">Reason: {leave.reason}</p>}
                  {leave.reviewComment && (
                    <p className="text-xs text-slate-500 bg-slate-50 rounded px-2 py-1 mt-1.5">
                      <span className="font-semibold">Review note:</span> {leave.reviewComment}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {mine && isPending && <Button variant="ghost" size="xs" onClick={() => onCancel(leave._id)}>Cancel</Button>}
                {!mine && isPending && <Button variant="secondary" size="xs" onClick={() => onReview(leave)}>Review</Button>}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

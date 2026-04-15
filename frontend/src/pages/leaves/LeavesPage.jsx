import { useState, useEffect } from 'react';
import { leaveAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Textarea, Select, Badge, Avatar, Empty, Spinner, PageHeader, Alert } from '../../components/ui';
import { Plus, CalendarDays, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const STATUS_V = {
  pending:   { v: 'warning', label: 'Pending',   icon: Clock },
  approved:  { v: 'success', label: 'Approved',  icon: CheckCircle },
  rejected:  { v: 'danger',  label: 'Rejected',  icon: XCircle },
  cancelled: { v: 'default', label: 'Cancelled', icon: AlertCircle },
};

// Must match backend enum exactly
const LEAVE_TYPES = ['casual', 'sick', 'annual', 'unpaid', 'maternity', 'paternity', 'compensatory'];

export default function LeavesPage() {
  const { isManagerOrAdmin, user } = useAuth();
  const [leaves, setLeaves]         = useState([]);
  const [allLeaves, setAllLeaves]   = useState([]);
  const [balance, setBalance]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState('my');
  const [showApply, setShowApply]   = useState(false);
  // leaveType must match backend model field name
  const [form, setForm]             = useState({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewNote, setReviewNote]   = useState('');

  useEffect(() => {
    const calls = [
      leaveAPI.getMy().catch(() => ({ data: { leaves: [] } })),
      leaveAPI.getBalance().catch(() => null),
    ];
    if (isManagerOrAdmin) calls.push(leaveAPI.getAll().catch(() => ({ data: { leaves: [] } })));
    Promise.all(calls).then(([myRes, balRes, allRes]) => {
      // Backend returns { success, leaves } (not data.data)
      setLeaves(myRes?.data?.leaves || myRes?.data?.data || []);
      setBalance(balRes?.data?.leaveBalance || balRes?.data?.data || null);
      if (allRes) setAllLeaves(allRes?.data?.leaves || allRes?.data?.data || []);
    }).finally(() => setLoading(false));
  }, [isManagerOrAdmin]);

  const handleApply = async () => {
    setSaving(true); setError('');
    try {
      // Backend expects: leaveType, startDate, endDate, reason (all required)
      if (!form.leaveType || !form.startDate || !form.endDate || !form.reason.trim()) {
        setError('Please fill in all required fields.');
        setSaving(false);
        return;
      }
      const res = await leaveAPI.apply(form);
      const newLeave = res.data?.leave || res.data?.data;
      if (newLeave) setLeaves(p => [newLeave, ...p]);
      setShowApply(false);
      setForm({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to submit leave request.');
    } finally { setSaving(false); }
  };

  const handleReview = async (status) => {
    try {
      const res = await leaveAPI.review(reviewModal._id, { status, reviewComment: reviewNote });
      const updated = res.data?.leave || res.data?.data;
      if (updated) setAllLeaves(p => p.map(l => l._id === reviewModal._id ? updated : l));
      setReviewModal(null); setReviewNote('');
    } catch (e) { alert(e.response?.data?.message || 'Review failed'); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this leave request?')) return;
    try {
      const res = await leaveAPI.cancel(id);
      const updated = res.data?.leave || res.data?.data;
      setLeaves(p => p.map(l => l._id === id ? (updated || { ...l, status: 'cancelled' }) : l));
    } catch (e) { alert(e.response?.data?.message || 'Cancel failed'); }
  };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  const pendingCount = allLeaves.filter(l => l.status === 'pending').length;

  // Balance display — backend field is leaveBalance: { casual, sick, annual, ... }
  const balanceCards = balance ? [
    { label: 'Casual Leave',       key: 'casual',       color: 'indigo' },
    { label: 'Sick Leave',         key: 'sick',         color: 'emerald' },
    { label: 'Annual Leave',       key: 'annual',       color: 'amber' },
    { label: 'Compensatory Leave', key: 'compensatory', color: 'purple' },
  ] : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management"
        subtitle="Apply for leaves and track your leave requests"
        actions={
          <Button onClick={() => { setError(''); setShowApply(true); }}>
            <Plus className="w-4 h-4" />
            Apply for Leave
          </Button>
        }
      />

      {/* Balance cards */}
      {balance && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {balanceCards.map(({ label, key, color }) => (
            <Card key={key} className="p-4 text-center">
              <p className={`text-3xl font-bold text-${color}-600`}>{balance[key] ?? 0}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
              <p className="text-xs text-slate-400">days remaining</p>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      {isManagerOrAdmin && (
        <div className="border-b border-slate-200">
          <div className="flex gap-6">
            {[
              { key: 'my',  label: 'My Leaves' },
              { key: 'all', label: 'Team Leaves', badge: pendingCount },
            ].map(({ key, label, badge }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2
                  ${tab === key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                {label}
                {badge > 0 && (
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">{badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* My Leaves */}
      {(!isManagerOrAdmin || tab === 'my') && (
        <LeaveList leaves={leaves} onCancel={handleCancel} mine />
      )}

      {/* All Leaves (admin/manager) */}
      {isManagerOrAdmin && tab === 'all' && (
        <LeaveList leaves={allLeaves} onReview={setReviewModal} showUser />
      )}

      {/* ── Apply Modal ── */}
      <Modal open={showApply} onClose={() => setShowApply(false)} title="Apply for Leave">
        <div className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Leave Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.leaveType}
              onChange={set('leaveType')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
              {LEAVE_TYPES.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={form.startDate} onChange={set('startDate')} required />
            <Input label="End Date"   type="date" value={form.endDate}   onChange={set('endDate')}   required />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.reason}
              onChange={set('reason')}
              placeholder="Please provide a reason for your leave request…"
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowApply(false)}>Cancel</Button>
            <Button
              onClick={handleApply}
              loading={saving}
              disabled={!form.startDate || !form.endDate || !form.reason.trim()}>
              Submit Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Review Modal (admin/manager) ── */}
      <Modal open={!!reviewModal} onClose={() => setReviewModal(null)} title="Review Leave Request">
        {reviewModal && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar name={reviewModal.employee?.name} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{reviewModal.employee?.name}</p>
                  <p className="text-xs text-slate-400">{reviewModal.employee?.department}</p>
                </div>
              </div>
              {[
                ['Leave Type', reviewModal.leaveType],
                ['Dates', `${new Date(reviewModal.startDate).toLocaleDateString()} – ${new Date(reviewModal.endDate).toLocaleDateString()}`],
                ['Total Days', `${reviewModal.totalDays} day${reviewModal.totalDays !== 1 ? 's' : ''}`],
                ['Reason', reviewModal.reason || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2 text-sm">
                  <span className="text-slate-500 w-24 flex-shrink-0">{k}:</span>
                  <span className="text-slate-900 capitalize">{v}</span>
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Review Comment (optional)</label>
              <textarea
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                placeholder="Add a note for the employee…"
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setReviewModal(null)}>Cancel</Button>
              <Button variant="danger"  onClick={() => handleReview('rejected')}>Reject</Button>
              <Button variant="success" onClick={() => handleReview('approved')}>Approve</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ─── Leave list sub-component ─── */
function LeaveList({ leaves, onCancel, onReview, showUser, mine }) {
  if (!leaves.length)
    return (
      <Empty
        icon={CalendarDays}
        title="No leave requests"
        description={mine ? "You haven't applied for any leave yet" : "No leave requests found"}
      />
    );

  return (
    <div className="space-y-3">
      {leaves.map(leave => {
        const sv     = STATUS_V[leave.status] || { v: 'default', label: leave.status, icon: AlertCircle };
        const Icon   = sv.icon;
        const days   = leave.totalDays || (Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / 86400000) + 1);
        const isPending = leave.status === 'pending';

        return (
          <Card key={leave._id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {showUser && <Avatar name={leave.employee?.name} size="sm" className="mt-0.5 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  {showUser && (
                    <p className="text-sm font-semibold text-slate-900">{leave.employee?.name}
                      <span className="text-xs font-normal text-slate-400 ml-1">· {leave.employee?.department}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <span className="text-sm font-medium text-slate-900 capitalize">{leave.leaveType} leave</span>
                    <Badge variant={sv.v}>
                      <Icon className="w-3 h-3 mr-1" />
                      {sv.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' – '}
                    {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' · '}{days} day{days !== 1 ? 's' : ''}
                  </p>
                  {leave.reason && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">Reason: {leave.reason}</p>
                  )}
                  {leave.reviewComment && (
                    <p className="text-xs text-slate-500 bg-slate-50 rounded px-2 py-1 mt-1.5">
                      <span className="font-medium">Review note:</span> {leave.reviewComment}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 flex-shrink-0">
                {mine && isPending && (
                  <Button variant="ghost" size="xs" onClick={() => onCancel(leave._id)}>Cancel</Button>
                )}
                {!mine && isPending && (
                  <Button variant="secondary" size="xs" onClick={() => onReview(leave)}>Review</Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

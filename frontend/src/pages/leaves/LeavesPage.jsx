import { useState, useEffect } from 'react';
import { leaveAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Modal, Input, Textarea, Select, Badge, Avatar, Empty, Spinner, PageHeader, Alert } from '../../components/ui';
import { Plus, CalendarDays } from 'lucide-react';

const STATUS_V = {
  pending:  { v: 'warning', label: 'Pending' },
  approved: { v: 'success', label: 'Approved' },
  rejected: { v: 'danger',  label: 'Rejected' },
  cancelled:{ v: 'default', label: 'Cancelled' },
};

const LEAVE_TYPES = ['annual', 'sick', 'personal', 'maternity', 'paternity', 'unpaid', 'other'];

export default function LeavesPage() {
  const { isManagerOrAdmin, user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('my');
  const [showApply, setShowApply] = useState(false);
  const [form, setForm] = useState({ type: 'annual', startDate: '', endDate: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewNote, setReviewNote] = useState('');

  useEffect(() => {
    const calls = [
      leaveAPI.getMy(),
      leaveAPI.getBalance().catch(() => null),
    ];
    if (isManagerOrAdmin) calls.push(leaveAPI.getAll().catch(() => ({ data: { data: [] } })));
    Promise.all(calls).then(([myRes, balRes, allRes]) => {
      setLeaves(myRes.data.data || []);
      setBalance(balRes?.data?.data || null);
      if (allRes) setAllLeaves(allRes.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleApply = async () => {
    setSaving(true); setError('');
    try {
      const res = await leaveAPI.apply(form);
      setLeaves(p => [res.data.data, ...p]);
      setShowApply(false);
      setForm({ type: 'annual', startDate: '', endDate: '', reason: '' });
    } catch (e) { setError(e.response?.data?.message || 'Failed to apply'); }
    finally { setSaving(false); }
  };

  const handleReview = async (status) => {
    try {
      const res = await leaveAPI.review(reviewModal._id, { status, note: reviewNote });
      setAllLeaves(p => p.map(l => l._id === reviewModal._id ? res.data.data : l));
      setReviewModal(null); setReviewNote('');
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
  };

  const handleCancel = async (id) => {
    try {
      const res = await leaveAPI.cancel(id);
      setLeaves(p => p.map(l => l._id === id ? res.data.data : l));
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
  };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  const pendingCount = allLeaves.filter(l => l.status === 'pending').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management"
        subtitle="Manage your leave requests and balances"
        actions={
          <Button onClick={() => setShowApply(true)}>
            <Plus className="w-4 h-4" />
            Apply Leave
          </Button>
        }
      />

      {/* Balance cards */}
      {balance && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Annual Leave',   key: 'annual',    color: 'indigo' },
            { label: 'Sick Leave',     key: 'sick',      color: 'emerald' },
            { label: 'Personal Leave', key: 'personal',  color: 'amber' },
            { label: 'Carry Forward',  key: 'carryForward', color: 'purple' },
          ].map(({ label, key, color }) => (
            <Card key={key} className="p-4 text-center">
              <p className={`text-3xl font-bold text-${color}-600`}>
                {balance[key] ?? 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
              <p className="text-xs text-slate-400">days remaining</p>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs (admin sees both) */}
      {isManagerOrAdmin && (
        <div className="border-b border-slate-200">
          <div className="flex gap-6">
            <button onClick={() => setTab('my')}
              className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'my' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              My Leaves
            </button>
            <button onClick={() => setTab('all')}
              className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${tab === 'all' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              Team Leaves
              {pendingCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">{pendingCount}</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* My Leaves */}
      {(!isManagerOrAdmin || tab === 'my') && (
        <LeaveList leaves={leaves} onCancel={handleCancel} mine />
      )}

      {/* All Leaves (admin) */}
      {isManagerOrAdmin && tab === 'all' && (
        <LeaveList leaves={allLeaves} onReview={setReviewModal} showUser />
      )}

      {/* Apply Modal */}
      <Modal open={showApply} onClose={() => setShowApply(false)} title="Apply for Leave">
        <div className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <Select label="Leave Type" value={form.type} onChange={set('type')}>
            {LEAVE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={form.startDate} onChange={set('startDate')} required />
            <Input label="End Date"   type="date" value={form.endDate}   onChange={set('endDate')}   required />
          </div>
          <Textarea label="Reason" value={form.reason} onChange={set('reason')} placeholder="Brief reason for leave request…" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowApply(false)}>Cancel</Button>
            <Button onClick={handleApply} loading={saving} disabled={!form.startDate || !form.endDate}>Submit Request</Button>
          </div>
        </div>
      </Modal>

      {/* Review Modal */}
      <Modal open={!!reviewModal} onClose={() => setReviewModal(null)} title="Review Leave Request">
        {reviewModal && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-3">
                <Avatar name={reviewModal.user?.name} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{reviewModal.user?.name}</p>
                  <p className="text-xs text-slate-400">{reviewModal.user?.department}</p>
                </div>
              </div>
              {[
                ['Type',   reviewModal.type],
                ['Dates',  `${new Date(reviewModal.startDate).toLocaleDateString()} – ${new Date(reviewModal.endDate).toLocaleDateString()}`],
                ['Reason', reviewModal.reason || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2 text-sm">
                  <span className="text-slate-500 w-16 flex-shrink-0">{k}:</span>
                  <span className="text-slate-900 capitalize">{v}</span>
                </div>
              ))}
            </div>
            <Textarea label="Review Note (optional)" value={reviewNote} onChange={e => setReviewNote(e.target.value)} placeholder="Add a note for the employee…" />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setReviewModal(null)}>Cancel</Button>
              <Button variant="danger"   onClick={() => handleReview('rejected')}>Reject</Button>
              <Button variant="success"  onClick={() => handleReview('approved')}>Approve</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function LeaveList({ leaves, onCancel, onReview, showUser, mine }) {
  if (leaves.length === 0) return <Empty icon={CalendarDays} title="No leave requests" description={mine ? "You haven't applied for any leave yet" : "No leave requests found"} />;

  return (
    <div className="space-y-3">
      {leaves.map(leave => {
        const sv = STATUS_V[leave.status] || { v: 'default', label: leave.status };
        const days = Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1;
        return (
          <Card key={leave._id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {showUser && <Avatar name={leave.user?.name} size="sm" className="mt-0.5 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  {showUser && <p className="text-sm font-semibold text-slate-900">{leave.user?.name}</p>}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-900 capitalize">{leave.type} leave</span>
                    <Badge variant={sv.v}>{sv.label}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
                    {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {days} day{days !== 1 ? 's' : ''}
                  </p>
                  {leave.reason && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{leave.reason}</p>}
                  {leave.reviewNote && (
                    <p className="text-xs text-slate-500 bg-slate-50 rounded px-2 py-1 mt-1.5">
                      <span className="font-medium">Note:</span> {leave.reviewNote}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                {mine && leave.status === 'pending' && (
                  <Button variant="ghost" size="xs" onClick={() => onCancel(leave._id)}>Cancel</Button>
                )}
                {!mine && leave.status === 'pending' && (
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

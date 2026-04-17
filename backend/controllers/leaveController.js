const Leave = require('../models/Leave');
const User = require('../models/User');
const LeaveSettings = require('../models/LeaveSettings');
const { createAndEmit } = require('./notificationController');

function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

async function runMonthlyResetIfDue() {
  let settings = await LeaveSettings.findOne();
  if (!settings) {
    settings = await LeaveSettings.create({ resetDayOfMonth: 1, lastResetMonthKey: '' });
  }

  const now = new Date();
  const monthKey = getMonthKey(now);
  if (now.getDate() >= settings.resetDayOfMonth && settings.lastResetMonthKey !== monthKey) {
    await Leave.deleteMany({});
    settings.lastResetMonthKey = monthKey;
    await settings.save();
  }

  return settings;
}

// @desc  Admin manually create leave for any user
// @route POST /api/leaves/admin/create
exports.adminCreateLeave = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, reason, status = 'approved' } = req.body;
    if (!employeeId || !startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'employeeId, startDate, endDate and reason are required' });
    }

    const employee = await User.findById(employeeId);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.status(400).json({ success: false, message: 'End date cannot be before start date' });
    }

    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const leave = await Leave.create({
      employee: employeeId,
      startDate,
      endDate,
      totalDays,
      reason,
      status,
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      reviewComment: 'Manually added by admin',
    });

    await leave.populate('employee', 'name email department employeeId');
    await leave.populate('reviewedBy', 'name email');

    // Notify employee
    await createAndEmit({
      recipient: employeeId,
      sender: req.user.id,
      type: status === 'approved' ? 'leave_approved' : 'leave_applied',
      title: 'Leave Added by Admin',
      message: `A ${totalDays}-day leave has been added to your record by admin`,
      link: '/leaves',
    });

    res.status(201).json({ success: true, leave });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Apply for leave
// @route POST /api/leaves/apply
exports.applyLeave = async (req, res) => {
  try {
    await runMonthlyResetIfDue();

    const { startDate, endDate, reason, isHalfDay, halfDaySession, handoverNote, emergencyContact } = req.body;
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'startDate, endDate and reason are required' });
    }

    // Calculate total days
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.status(400).json({ success: false, message: 'End date cannot be before start date' });
    }
    const totalDays = isHalfDay ? 0.5 : Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const user = await User.findById(req.user.id);

    // Check for overlapping leaves
    const overlap = await Leave.findOne({
      employee: req.user.id,
      status: { $in: ['pending', 'approved'] },
      $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }],
    });
    if (overlap) return res.status(400).json({ success: false, message: 'You already have a leave request for overlapping dates' });

    const leave = await Leave.create({ employee: req.user.id, startDate, endDate, totalDays, reason, isHalfDay, halfDaySession, handoverNote, emergencyContact });

    // Notify managers/admins/team_leads
    const managers = await User.find({ role: { $in: ['admin', 'manager', 'team_lead'] }, isActive: true });
    await Promise.all(
      managers.map((m) =>
        createAndEmit({
          recipient: m._id,
          sender: req.user.id,
          type: 'leave_applied',
          title: 'New Leave Request',
          message: `${user.name} applied for ${totalDays} day(s) leave`,
          link: '/leaves',
        })
      )
    );

    await leave.populate('employee', 'name email department employeeId');
    res.status(201).json({ success: true, leave });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get leaves (admin/manager/team_lead sees all, employee sees own)
// @route GET /api/leaves
exports.getLeaves = async (req, res) => {
  try {
    await runMonthlyResetIfDue();

    const { status, employee, page = 1, limit = 500 } = req.query;
    const query = {};

    // Employees only see their own leaves
    if (req.user.role === 'employee') {
      query.employee = req.user.id;
    } else if (employee) {
      // Elevated roles can filter by employee
      query.employee = employee;
    }
    // status filter — if provided, filter; otherwise show ALL statuses (including pending)
    if (status) query.status = status;

    const leaves = await Leave.find(query)
      .populate('employee', 'name email department designation employeeId avatar')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Leave.countDocuments(query);
    res.json({ success: true, total, leaves });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get single leave
// @route GET /api/leaves/:id
exports.getLeaveById = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate('employee', 'name email department designation leaveBalance')
      .populate('reviewedBy', 'name email');
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
    res.json({ success: true, leave });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Review leave (approve/reject)
// @route PUT /api/leaves/:id/review
exports.reviewLeave = async (req, res) => {
  try {
    await runMonthlyResetIfDue();

    const { status, reviewComment } = req.body;
    const leave = await Leave.findById(req.params.id).populate('employee');
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    if (leave.status !== 'pending') return res.status(400).json({ success: false, message: 'Leave already reviewed' });

    leave.status = status;
    leave.reviewedBy = req.user.id;
    leave.reviewedAt = new Date();
    leave.reviewComment = reviewComment;
    await leave.save();

    // Notify employee
    await createAndEmit({
      recipient: leave.employee._id,
      sender: req.user.id,
      type: status === 'approved' ? 'leave_approved' : 'leave_rejected',
      title: `Leave ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your leave request has been ${status}${reviewComment ? ': ' + reviewComment : ''}`,
      link: '/leaves',
    });

    await leave.populate('reviewedBy', 'name email');
    res.json({ success: true, leave });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Cancel leave (employee cancels own pending leave)
// @route PUT /api/leaves/:id/cancel
exports.cancelLeave = async (req, res) => {
  try {
    await runMonthlyResetIfDue();

    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    if (leave.employee.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (leave.status !== 'pending') return res.status(400).json({ success: false, message: 'Can only cancel pending leaves' });
    leave.status = 'cancelled';
    await leave.save();
    res.json({ success: true, message: 'Leave cancelled', leave });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get leave balance for current user
// @route GET /api/leaves/balance
exports.getLeaveBalance = async (req, res) => {
  try {
    await runMonthlyResetIfDue();
    const [pending, approved, rejected, cancelled] = await Promise.all([
      Leave.countDocuments({ employee: req.user.id, status: 'pending' }),
      Leave.countDocuments({ employee: req.user.id, status: 'approved' }),
      Leave.countDocuments({ employee: req.user.id, status: 'rejected' }),
      Leave.countDocuments({ employee: req.user.id, status: 'cancelled' }),
    ]);
    res.json({ success: true, summary: { pending, approved, rejected, cancelled } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get leave calendar (all statuses for admin/manager/team_lead, only own for employee)
// @route GET /api/leaves/calendar
exports.getLeaveCalendar = async (req, res) => {
  try {
    await runMonthlyResetIfDue();

    const query = {};
    // Employees only see their own leaves in calendar; elevated roles see ALL leaves ALL statuses
    if (req.user.role === 'employee') {
      query.employee = req.user.id;
    }
    // No status filter — include pending, approved, rejected, cancelled

    const leaves = await Leave.find(query)
      .populate('employee', 'name department')
      .select('employee startDate endDate totalDays status reason')
      .sort({ startDate: 1 });
    res.json({ success: true, leaves });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get leave reset settings
// @route GET /api/leaves/reset-settings
exports.getLeaveResetSettings = async (req, res) => {
  try {
    const settings = await runMonthlyResetIfDue();
    res.json({
      success: true,
      resetDayOfMonth: settings.resetDayOfMonth,
      lastResetMonthKey: settings.lastResetMonthKey,
      updatedAt: settings.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update leave reset settings (admin)
// @route PUT /api/leaves/reset-settings
exports.updateLeaveResetSettings = async (req, res) => {
  try {
    const resetDayOfMonth = Number(req.body.resetDayOfMonth);
    if (!Number.isInteger(resetDayOfMonth) || resetDayOfMonth < 1 || resetDayOfMonth > 28) {
      return res.status(400).json({ success: false, message: 'resetDayOfMonth must be an integer between 1 and 28' });
    }

    const settings = await LeaveSettings.findOneAndUpdate(
      {},
      { resetDayOfMonth, updatedBy: req.user.id },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      resetDayOfMonth: settings.resetDayOfMonth,
      lastResetMonthKey: settings.lastResetMonthKey,
      updatedAt: settings.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const Leave = require('../models/Leave');
const User = require('../models/User');
const { createAndEmit } = require('./notificationController');

function resolveLeaveStatus(leaveDoc) {
  const managerStatus = leaveDoc?.managerDecision?.status || 'pending';
  const hrStatus = leaveDoc?.hrDecision?.status || 'pending';
  const flow = leaveDoc?.approvalFlow || 'employee_request';

  if (managerStatus === 'rejected' || hrStatus === 'rejected') return 'rejected';
  if (flow === 'manager_request') {
    return hrStatus === 'approved' ? 'approved' : 'pending';
  }
  if (hrStatus === 'approved') return 'approved';
  return 'pending';
}

function getReviewActorRole(role) {
  if (role === 'manager') return 'manager';
  if (role === 'hr' || role === 'admin') return 'hr';
  return null;
}

function calcTotalDays(startDate, endDate, isHalfDay) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isHalfDay) return 0.5;
  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
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

    // Admin, Manager, and HR are allowed to create leave on past dates for record-keeping.
    // Past-date restriction only applies to employees using the regular applyLeave route.
    if (end < start) {
      return res.status(400).json({ success: false, message: 'End date cannot be before start date' });
    }

    const totalDays = calcTotalDays(startDate, endDate, false);

    const leave = await Leave.create({
      employee: employeeId,
      startDate,
      endDate,
      totalDays,
      reason,
      status,
      approvalFlow: 'admin_created',
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      reviewComment: 'Manually added by admin',
      managerDecision: {
        status: status === 'pending' ? 'pending' : status,
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        reviewComment: 'Manually added by admin',
      },
      hrDecision: {
        status: status === 'pending' ? 'pending' : status,
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        reviewComment: 'Manually added by admin',
      },
    });

    await leave.populate('employee', 'name email department employeeId');
    await leave.populate('reviewedBy', 'name email');

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

// @desc  Admin delete/remove any leave record (admin only)
// @route DELETE /api/leaves/admin/:id
exports.adminDeleteLeave = async (req, res) => {
  try {
    // Only admin can call this — enforced at route level via adminOnly middleware
    const leave = await Leave.findById(req.params.id).populate('employee', 'name email');
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });

    const employeeId = leave.employee?._id || leave.employee;

    await Leave.findByIdAndDelete(req.params.id);

    // Notify the employee that their leave was removed
    await createAndEmit({
      recipient: employeeId,
      sender: req.user.id,
      type: 'leave_rejected',
      title: 'Leave Record Removed',
      message: `Your leave record (${new Date(leave.startDate).toLocaleDateString()} – ${new Date(leave.endDate).toLocaleDateString()}) has been removed by admin`,
      link: '/leaves',
    });

    res.json({ success: true, message: 'Leave record removed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Apply for leave (employees & managers via form)
// @route POST /api/leaves/apply
exports.applyLeave = async (req, res) => {
  try {
    const { startDate, endDate, reason, isHalfDay, halfDaySession, handoverNote, emergencyContact } = req.body;
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'startDate, endDate and reason are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.status(400).json({ success: false, message: 'End date cannot be before start date' });
    }

    const totalDays = calcTotalDays(startDate, endDate, isHalfDay);
    const user = await User.findById(req.user.id);

    const overlap = await Leave.findOne({
      employee: req.user.id,
      status: { $in: ['pending', 'approved'] },
      $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }],
    });
    if (overlap) return res.status(400).json({ success: false, message: 'You already have a leave request for overlapping dates' });

    const isManagerUser = user?.role === 'manager';
    const approvalFlow = isManagerUser ? 'manager_request' : 'employee_request';

    const leave = await Leave.create({
      employee: req.user.id,
      startDate,
      endDate,
      totalDays,
      reason,
      isHalfDay,
      halfDaySession,
      handoverNote,
      emergencyContact,
      approvalFlow,
      managerDecision: {
        status: isManagerUser ? 'approved' : 'pending',
      },
      hrDecision: {
        status: 'pending',
      },
    });

    const reviewers = await User.find({
      role: { $in: isManagerUser ? ['hr', 'admin'] : ['manager', 'hr', 'admin'] },
      isActive: true,
    });
    await Promise.all(
      reviewers.map((reviewer) =>
        createAndEmit({
          recipient: reviewer._id,
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

// @desc  Get leaves
// @route GET /api/leaves
exports.getLeaves = async (req, res) => {
  try {
    const { status, employee, page = 1, limit = 500, scope } = req.query;
    const query = {};

    if (req.user.role === 'employee') {
      query.employee = req.user.id;
    } else if (scope === 'employees' && ['manager', 'hr', 'admin'].includes(req.user.role)) {
      const employeeUsers = await User.find({ role: 'employee', isActive: true }).select('_id');
      query.employee = { $in: employeeUsers.map((u) => u._id) };
    } else if (employee) {
      query.employee = employee;
    }

    if (status) query.status = status;

    const leaves = await Leave.find(query)
      .populate('employee', 'name email department designation employeeId avatar role')
      .populate('reviewedBy', 'name email')
      .populate('managerDecision.reviewedBy', 'name email role')
      .populate('hrDecision.reviewedBy', 'name email role')
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
      .populate('employee', 'name email department designation leaveBalance role')
      .populate('reviewedBy', 'name email')
      .populate('managerDecision.reviewedBy', 'name email role')
      .populate('hrDecision.reviewedBy', 'name email role');
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
    const { status, reviewComment } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be approved or rejected' });
    }

    const leave = await Leave.findById(req.params.id).populate('employee');
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });

    if (leave.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cancelled leave cannot be reviewed' });
    }

    if (['approved', 'rejected'].includes(leave.status)) {
      return res.status(400).json({ success: false, message: 'Leave already finalized' });
    }

    const actorRole = getReviewActorRole(req.user.role);
    if (!actorRole) {
      return res.status(403).json({ success: false, message: 'Not authorized to review leave' });
    }

    if (leave.approvalFlow === 'manager_request' && actorRole === 'manager') {
      return res.status(403).json({ success: false, message: 'Manager leave requests can only be reviewed by HR/Admin' });
    }

    const now = new Date();
    if (actorRole === 'manager') {
      leave.managerDecision = {
        status,
        reviewedBy: req.user.id,
        reviewedAt: now,
        reviewComment,
      };
    } else {
      leave.hrDecision = {
        status,
        reviewedBy: req.user.id,
        reviewedAt: now,
        reviewComment,
      };
    }

    leave.status = resolveLeaveStatus(leave);
    leave.reviewedBy = req.user.id;
    leave.reviewedAt = now;
    leave.reviewComment = reviewComment;
    await leave.save();

    await createAndEmit({
      recipient: leave.employee._id,
      sender: req.user.id,
      type: leave.status === 'approved' ? 'leave_approved' : leave.status === 'rejected' ? 'leave_rejected' : 'leave_applied',
      title: leave.status === 'pending'
        ? 'Leave Review Updated'
        : `Leave ${leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}`,
      message: leave.status === 'pending'
        ? `Your leave request is still pending final approval${reviewComment ? ': ' + reviewComment : ''}`
        : `Your leave request has been ${leave.status}${reviewComment ? ': ' + reviewComment : ''}`,
      link: '/leaves',
    });

    await leave.populate('reviewedBy', 'name email');
    await leave.populate('managerDecision.reviewedBy', 'name email role');
    await leave.populate('hrDecision.reviewedBy', 'name email role');
    res.json({ success: true, leave });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Cancel leave
// @route PUT /api/leaves/:id/cancel
exports.cancelLeave = async (req, res) => {
  try {
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

// @desc  Get leave calendar
// @route GET /api/leaves/calendar
exports.getLeaveCalendar = async (req, res) => {
  try {
    const { scope } = req.query;
    const query = {};

    if (req.user.role === 'employee') {
      query.employee = req.user.id;
    } else if (scope === 'employees' && ['manager', 'hr', 'admin'].includes(req.user.role)) {
      const employeeUsers = await User.find({ role: 'employee', isActive: true }).select('_id');
      query.employee = { $in: employeeUsers.map((u) => u._id) };
    }

    const leaves = await Leave.find(query)
      .populate('employee', 'name department role')
      .select('employee startDate endDate totalDays status reason')
      .sort({ startDate: 1 });

    res.json({ success: true, leaves });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get leaves for current user only
// @route GET /api/leaves/my
exports.getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ employee: req.user.id })
      .populate('employee', 'name email department designation employeeId avatar role')
      .populate('reviewedBy', 'name email')
      .populate('managerDecision.reviewedBy', 'name email role')
      .populate('hrDecision.reviewedBy', 'name email role')
      .sort({ createdAt: -1 });

    res.json({ success: true, total: leaves.length, leaves });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  HR/Manager/Employee mark a day as leave by clicking calendar date
// @route POST /api/leaves/self-mark
exports.selfMarkLeave = async (req, res) => {
  try {
    const { startDate, endDate, reason = 'Self-marked leave', asRequest = false } = req.body;
    if (!startDate) return res.status(400).json({ success: false, message: 'startDate is required' });

    const end = endDate || startDate;
    const start = new Date(startDate);
    const endD = new Date(end);
    const role = req.user.role;

    // Block past-date self-marks for regular employees only.
    // HR, Admin, and Managers are allowed to mark past dates for record-keeping.
    const isPrivileged = role === 'hr' || role === 'admin' || role === 'manager';
    if (!isPrivileged) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      if (start < todayStart) {
        return res.status(400).json({ success: false, message: 'Cannot mark leave for a past date' });
      }
    }

    if (endD < start) return res.status(400).json({ success: false, message: 'End date cannot be before start date' });

    const totalDays = calcTotalDays(startDate, end, false);

    const overlap = await Leave.findOne({
      employee: req.user.id,
      status: { $in: ['pending', 'approved'] },
      $or: [{ startDate: { $lte: endD }, endDate: { $gte: start } }],
    });
    if (overlap) return res.status(400).json({ success: false, message: 'You already have a leave on overlapping dates' });

    const isHRRole = role === 'hr' || role === 'admin';
    const isManagerRole = role === 'manager';
    const isEmployee = role === 'employee';

    const shouldAutoApprove = isHRRole || (isManagerRole && !asRequest);

    let approvalFlow;
    if (isEmployee) approvalFlow = 'employee_request';
    else if (asRequest) approvalFlow = 'manager_request';
    else approvalFlow = isHRRole ? 'admin_created' : 'employee_request';

    const leave = await Leave.create({
      employee: req.user.id,
      startDate,
      endDate: end,
      totalDays,
      reason,
      status: shouldAutoApprove ? 'approved' : 'pending',
      approvalFlow,
      reviewedBy: shouldAutoApprove ? req.user.id : undefined,
      reviewedAt: shouldAutoApprove ? new Date() : undefined,
      reviewComment: shouldAutoApprove ? 'Self-marked leave' : undefined,
      managerDecision: {
        status: shouldAutoApprove ? 'approved' : (isManagerRole ? 'approved' : 'pending'),
        reviewedBy: shouldAutoApprove || isManagerRole ? req.user.id : undefined,
        reviewedAt: shouldAutoApprove || isManagerRole ? new Date() : undefined,
        reviewComment: shouldAutoApprove ? 'Self-marked' : undefined,
      },
      hrDecision: {
        status: shouldAutoApprove ? 'approved' : 'pending',
        reviewedBy: shouldAutoApprove ? req.user.id : undefined,
        reviewedAt: shouldAutoApprove ? new Date() : undefined,
        reviewComment: shouldAutoApprove ? 'Self-marked leave' : undefined,
      },
    });

    if (!shouldAutoApprove) {
      const user = await User.findById(req.user.id);
      const notifyRoles = isEmployee ? ['manager', 'hr', 'admin'] : ['hr', 'admin'];
      const reviewers = await User.find({ role: { $in: notifyRoles }, isActive: true });
      await Promise.all(reviewers.map(reviewer =>
        createAndEmit({
          recipient: reviewer._id,
          sender: req.user.id,
          type: 'leave_applied',
          title: isManagerRole ? 'Manager Leave Request' : 'New Leave Request',
          message: `${user.name} requested ${totalDays} day(s) leave`,
          link: '/leaves',
        })
      ));
    }

    await leave.populate('employee', 'name email department employeeId avatar role');
    res.status(201).json({ success: true, leave });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

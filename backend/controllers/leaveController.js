const Leave = require('../models/Leave');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc  Apply for leave
// @route POST /api/leaves
exports.applyLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason, isHalfDay, halfDaySession, handoverNote, emergencyContact } = req.body;

    // Calculate total days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = isHalfDay ? 0.5 : Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Check leave balance
    const user = await User.findById(req.user.id);
    const balance = user.leaveBalance[leaveType];
    if (balance !== undefined && balance < totalDays) {
      return res.status(400).json({ success: false, message: `Insufficient ${leaveType} leave balance. Available: ${balance} days` });
    }

    // Check for overlapping leaves
    const overlap = await Leave.findOne({
      employee: req.user.id,
      status: { $in: ['pending', 'approved'] },
      $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }],
    });
    if (overlap) return res.status(400).json({ success: false, message: 'You already have a leave request for overlapping dates' });

    const leave = await Leave.create({ employee: req.user.id, leaveType, startDate, endDate, totalDays, reason, isHalfDay, halfDaySession, handoverNote, emergencyContact });

    // Notify managers/admins
    const managers = await User.find({ role: { $in: ['admin', 'manager'] }, isActive: true });
    const notifs = managers.map(m => ({
      recipient: m._id,
      sender: req.user.id,
      type: 'leave_applied',
      title: 'New Leave Request',
      message: `${user.name} applied for ${totalDays} day(s) of ${leaveType} leave`,
      link: `/admin/leaves/${leave._id}`,
    }));
    await Notification.insertMany(notifs);

    await leave.populate('employee', 'name email department employeeId');
    res.status(201).json({ success: true, leave });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get leaves (admin/manager sees all, employee sees own)
// @route GET /api/leaves
exports.getLeaves = async (req, res) => {
  try {
    const { status, leaveType, employee, page = 1, limit = 20 } = req.query;
    const query = {};
    if (req.user.role === 'employee') query.employee = req.user.id;
    else if (employee) query.employee = employee;
    if (status) query.status = status;
    if (leaveType) query.leaveType = leaveType;

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
    const { status, reviewComment } = req.body;
    const leave = await Leave.findById(req.params.id).populate('employee');
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    if (leave.status !== 'pending') return res.status(400).json({ success: false, message: 'Leave already reviewed' });

    leave.status = status;
    leave.reviewedBy = req.user.id;
    leave.reviewedAt = new Date();
    leave.reviewComment = reviewComment;
    await leave.save();

    // Deduct leave balance if approved
    if (status === 'approved') {
      const field = `leaveBalance.${leave.leaveType}`;
      await User.findByIdAndUpdate(leave.employee._id, { $inc: { [field]: -leave.totalDays } });
    }

    // Notify employee
    await Notification.create({
      recipient: leave.employee._id,
      sender: req.user.id,
      type: status === 'approved' ? 'leave_approved' : 'leave_rejected',
      title: `Leave ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your ${leave.leaveType} leave request has been ${status}${reviewComment ? ': ' + reviewComment : ''}`,
      link: `/leaves/${leave._id}`,
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
    const user = await User.findById(req.user.id).select('leaveBalance name employeeId');
    res.json({ success: true, leaveBalance: user.leaveBalance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get leave calendar (approved leaves for calendar view)
// @route GET /api/leaves/calendar
exports.getLeaveCalendar = async (req, res) => {
  try {
    const leaves = await Leave.find({ status: 'approved' })
      .populate('employee', 'name department')
      .select('employee startDate endDate leaveType totalDays');
    res.json({ success: true, leaves });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

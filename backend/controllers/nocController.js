const NOC = require('../models/NOC');
const User = require('../models/User');
const { createAndEmit } = require('./notificationController');

const isHR = (u) => u.role === 'hr';
const isAdmin = (u) => u.role === 'admin';
const isManager = (u) => u.role === 'manager';

// @desc  Raise NOC for employee asset issue
// @route POST /api/nocs
// Access: manager/admin
exports.raiseNOC = async (req, res) => {
  try {
    const { employeeId, accessoryName, serialNumber, issueType = 'damaged', description } = req.body;

    if (!employeeId || !accessoryName || !description) {
      return res.status(400).json({ success: false, message: 'employeeId, accessoryName and description are required' });
    }

    const employee = await User.findById(employeeId).select('name role');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    if (!['employee', 'team_lead'].includes(employee.role)) {
      return res.status(400).json({ success: false, message: 'NOC can be raised only for employee or team lead' });
    }

    const noc = await NOC.create({
      employee: employeeId,
      raisedBy: req.user.id,
      accessoryName: String(accessoryName).trim(),
      serialNumber: serialNumber ? String(serialNumber).trim() : '',
      issueType,
      description: String(description).trim(),
    });

    await noc.populate('employee', 'name email department');
    await noc.populate('raisedBy', 'name email role');

    const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] }, isActive: true }).select('_id');
    await Promise.all(hrUsers.map((hr) =>
      createAndEmit({
        recipient: hr._id,
        sender: req.user.id,
        type: 'task_assigned',
        title: 'New NOC Raised',
        message: `NOC raised for ${noc.employee?.name}: ${noc.accessoryName}`,
        link: '/admin/users',
      })
    ));

    res.status(201).json({ success: true, noc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  List NOCs
// @route GET /api/nocs
// Access: hr/manager/admin
exports.getNOCs = async (req, res) => {
  try {
    const { status, employee, raisedBy, issueType } = req.query;
    const query = {};

    if (status) query.status = status;
    if (employee) query.employee = employee;
    if (raisedBy) query.raisedBy = raisedBy;
    if (issueType) query.issueType = issueType;

    if (isManager(req.user)) {
      query.raisedBy = req.user.id;
    }

    const nocs = await NOC.find(query)
      .populate('employee', 'name email department')
      .populate('raisedBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .sort({ createdAt: -1 });

    res.json({ success: true, nocs, data: nocs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Review NOC (approve/reject)
// @route PATCH /api/nocs/:id/review
// Access: hr/admin
exports.reviewNOC = async (req, res) => {
  try {
    if (!isHR(req.user) && !isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Only HR or Admin can review NOCs' });
    }

    const { status, hrReviewComment } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be approved or rejected' });
    }

    const noc = await NOC.findById(req.params.id);
    if (!noc) return res.status(404).json({ success: false, message: 'NOC not found' });
    if (noc.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'NOC already reviewed' });
    }

    noc.status = status;
    noc.hrReviewComment = hrReviewComment ? String(hrReviewComment).trim() : '';
    noc.reviewedBy = req.user.id;
    noc.reviewedAt = new Date();
    await noc.save();

    await noc.populate('employee', 'name email department');
    await noc.populate('raisedBy', 'name email role');
    await noc.populate('reviewedBy', 'name email role');

    const notifyTo = [String(noc.raisedBy?._id || noc.raisedBy), String(noc.employee?._id || noc.employee)];
    await Promise.all(notifyTo.filter(Boolean).map((uid) =>
      createAndEmit({
        recipient: uid,
        sender: req.user.id,
        type: status === 'approved' ? 'leave_approved' : 'leave_rejected',
        title: `NOC ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message: `NOC for ${noc.employee?.name} (${noc.accessoryName}) was ${status}`,
        link: '/admin/users',
      })
    ));

    res.json({ success: true, noc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Delete NOC
// @route DELETE /api/nocs/:id
// Access: manager (own NOCs only) / hr / admin
exports.deleteNOC = async (req, res) => {
  try {
    const noc = await NOC.findById(req.params.id);
    if (!noc) return res.status(404).json({ success: false, message: 'NOC not found' });

    // Managers can only delete their own NOCs; HR and admin can delete any
    if (isManager(req.user) && String(noc.raisedBy) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You can only delete NOCs you raised' });
    }

    await noc.deleteOne();
    res.json({ success: true, message: 'NOC deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const User = require('../models/User');
const Notification = require('../models/Notification');
const { getIO } = require('../socket');

// ── Internal helper: push notification + socket event ─────────────────────────
const pushNotification = async ({ recipient, sender, type, title, message, link }) => {
  try {
    const notif = await Notification.create({ recipient, sender, type, title, message, link });
    try { getIO().to(`user:${recipient}`).emit('notification:new', notif); } catch {}
    return notif;
  } catch {}
};

// @desc  Get pending (unapproved) users — admin / manager / HR only
// @route GET /api/users/pending
exports.getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({
      role: { $in: ['employee', 'manager'] },
      $or: [
        { isApproved: false },
        { isApproved: null },
        { isApproved: { $exists: false } },
      ],
    })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get all users (only approved/active users — pending users are shown separately)
// @route GET /api/users
exports.getAllUsers = async (req, res) => {
  try {
    const { department, role, search, page = 1, limit = 100 } = req.query;

    // Always exclude unapproved (pending) users from the main directory
    const query = { isApproved: true };

    if (department) query.department = department;
    if (role) query.role = role;
    if (search) query.$or = [
      { name:       { $regex: search, $options: 'i' } },
      { email:      { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
    ];

    const users = await User.find(query)
      .populate('manager', 'name email')
      .select('-password')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });
    const total = await User.countDocuments(query);
    res.json({ success: true, total, page: Number(page), users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get my own profile
// @route GET /api/users/profile
exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('manager', 'name email').select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update my own profile
// @route PUT /api/users/profile
exports.updateMyProfile = async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'skills', 'avatar'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true }).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get single user
// @route GET /api/users/:id
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('manager', 'name email').select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update user (admin)
// @route PUT /api/users/:id
exports.updateUser = async (req, res) => {
  try {
    const { name, phone, department, designation, skills, manager } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, phone, department, designation, skills, manager },
      { new: true, runValidators: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Delete user (admin)
// @route DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Change user role (admin)
// @route PUT /api/users/:id/role
exports.changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'hr', 'manager', 'employee'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Valid roles: admin, hr, manager, employee' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Toggle user active status (admin)
// @route PATCH /api/users/:id/toggle-status
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Approve a registered user (admin / manager / HR)
// @route PATCH /api/users/:id/approve
// When approved: isApproved = true, isActive = true
// When rejected: user is deleted (they can re-register if needed)
exports.approveUser = async (req, res) => {
  try {
    const { approved, reason } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.isApproved) {
      return res.status(400).json({ success: false, message: 'User is already approved' });
    }

    if (approved) {
      user.isApproved = true;
      user.isActive = true;
      await user.save();

      await pushNotification({
        recipient: user._id,
        sender: req.user.id,
        type: 'user_approved',
        title: 'Account Approved!',
        message: `Your account has been approved by ${req.user.name}. You can now log in to the dashboard.`,
        link: '/dashboard',
      });

      // Notify all admins/managers/HR so their pending list refreshes
      try {
        getIO().to('admin').emit('user:approved', { userId: user._id, user: { _id: user._id, name: user.name, email: user.email } });
      } catch {}

      const updated = await User.findById(user._id).select('-password');
      res.json({ success: true, message: `${user.name} has been approved and can now log in.`, user: updated });
    } else {
      const userName = user.name;
      const userId   = req.params.id;
      await User.findByIdAndDelete(userId);

      // Broadcast so all admin/HR/manager tabs remove the user from their pending list
      try {
        getIO().to('admin').emit('user:rejected', { userId });
      } catch {}

      res.json({ success: true, message: `${userName}'s registration has been rejected and removed.` });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update leave balance
// @route PUT /api/users/:id/leave-balance
exports.updateLeaveBalance = async (req, res) => {
  try {
    const { casual, sick, annual, unpaid, compensatory } = req.body;
    const update = {};
    if (casual       !== undefined) update['leaveBalance.casual']       = casual;
    if (sick         !== undefined) update['leaveBalance.sick']         = sick;
    if (annual       !== undefined) update['leaveBalance.annual']       = annual;
    if (unpaid       !== undefined) update['leaveBalance.unpaid']       = unpaid;
    if (compensatory !== undefined) update['leaveBalance.compensatory'] = compensatory;
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get accessories for current user
// @route GET /api/users/me/accessories
exports.getMyAccessories = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('accessories')
      .populate('accessories.assignedBy', 'name email');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, accessories: user.accessories || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get accessories by user id
// @route GET /api/users/:id/accessories
exports.getUserAccessories = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name email accessories')
      .populate('accessories.assignedBy', 'name email');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: { _id: user._id, name: user.name, email: user.email }, accessories: user.accessories || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Add accessory for an employee (manager/admin)
// @route POST /api/users/:id/accessories
exports.addUserAccessory = async (req, res) => {
  try {
    const { name, serialNumber, notes, assignedAt } = req.body;
    if (!name || !String(name).trim())
      return res.status(400).json({ success: false, message: 'Accessory name is required' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.accessories.push({
      name: String(name).trim(),
      serialNumber: serialNumber ? String(serialNumber).trim() : '',
      notes: notes ? String(notes).trim() : '',
      assignedAt: assignedAt ? new Date(assignedAt) : new Date(),
      assignedBy: req.user.id,
    });
    await user.save();
    await user.populate('accessories.assignedBy', 'name email');
    res.status(201).json({ success: true, accessories: user.accessories || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Remove accessory from an employee (manager/admin)
// @route DELETE /api/users/:id/accessories/:accessoryId
exports.removeUserAccessory = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const found = user.accessories.id(req.params.accessoryId);
    if (!found) return res.status(404).json({ success: false, message: 'Accessory not found' });

    found.deleteOne();
    await user.save();
    await user.populate('accessories.assignedBy', 'name email');
    res.json({ success: true, accessories: user.accessories || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update accessory for an employee (hr/manager/admin)
// @route PUT /api/users/:id/accessories/:accessoryId
exports.updateUserAccessory = async (req, res) => {
  try {
    const { name, serialNumber, notes, assignedAt } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const found = user.accessories.id(req.params.accessoryId);
    if (!found) return res.status(404).json({ success: false, message: 'Accessory not found' });

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ success: false, message: 'Accessory name is required' });
      }
      found.name = String(name).trim();
    }
    if (serialNumber !== undefined) found.serialNumber = String(serialNumber || '').trim();
    if (notes !== undefined) found.notes = String(notes || '').trim();
    if (assignedAt !== undefined && assignedAt) found.assignedAt = new Date(assignedAt);

    await user.save();
    await user.populate('accessories.assignedBy', 'name email');
    res.json({ success: true, accessories: user.accessories || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

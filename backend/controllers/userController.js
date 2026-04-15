const User = require('../models/User');

// @desc  Get all users (admin)
// @route GET /api/users
exports.getAllUsers = async (req, res) => {
  try {
    const { department, role, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (department) query.department = department;
    if (role) query.role = role;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } }
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
    allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true }).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get single user by id
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
    if (!['admin', 'manager', 'employee'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Toggle user active status (admin)
// @route PUT /api/users/:id/toggle-status
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

// @desc  Update leave balance (admin)
// @route PUT /api/users/:id/leave-balance
exports.updateLeaveBalance = async (req, res) => {
  try {
    const { casual, sick, annual, unpaid, compensatory } = req.body;
    const update = {};
    if (casual !== undefined) update['leaveBalance.casual'] = casual;
    if (sick !== undefined) update['leaveBalance.sick'] = sick;
    if (annual !== undefined) update['leaveBalance.annual'] = annual;
    if (unpaid !== undefined) update['leaveBalance.unpaid'] = unpaid;
    if (compensatory !== undefined) update['leaveBalance.compensatory'] = compensatory;
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get accessories for current user (read-only for employee)
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

// @desc  Get accessories by user id (manager/admin)
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
    const { name, serialNumber, notes } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Accessory name is required' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const accessory = {
      name: String(name).trim(),
      serialNumber: serialNumber ? String(serialNumber).trim() : '',
      notes: notes ? String(notes).trim() : '',
      assignedAt: new Date(),
      assignedBy: req.user.id,
    };

    user.accessories.push(accessory);
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
    const { id, accessoryId } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const found = user.accessories.id(accessoryId);
    if (!found) return res.status(404).json({ success: false, message: 'Accessory not found' });

    found.deleteOne();
    await user.save();
    await user.populate('accessories.assignedBy', 'name email');

    res.json({ success: true, accessories: user.accessories || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

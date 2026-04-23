const User = require('../models/User');
const Notification = require('../models/Notification');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getIO } = require('../socket');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
const APPROVAL_REQUIRED_ROLES = new Set(['employee', 'manager']);

// ── Internal helper: create + emit a notification ─────────────────────────────
const pushNotification = async ({ recipient, sender, type, title, message, link }) => {
  try {
    const notif = await Notification.create({ recipient, sender, type, title, message, link });
    try { getIO().to(`user:${recipient}`).emit('notification:new', notif); } catch {}
    return notif;
  } catch {}
};

// @desc  Register user (self-registration — requires approval)
// @route POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, department, designation, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    const count = await User.countDocuments();
    const suffix = String(count + 1).padStart(4, '0');
    const employeeId = `IFOA-${suffix}`;

    const requestedRole = String(role || '').trim().toLowerCase();
    const signupRole = APPROVAL_REQUIRED_ROLES.has(requestedRole) ? requestedRole : 'employee';

    // New self-registered manager/employee users start as unapproved (isApproved: false)
    const user = await User.create({
      name,
      email,
      password,
      role: signupRole,
      department,
      designation,
      phone,
      employeeId,
      isApproved: false, // manager/employee must be approved by admin/manager/HR before login
    });

    // ── Notify ALL admins, managers, and HR about the new sign-up ─────────────
    const approvers = await User.find({
      role: { $in: ['admin', 'manager', 'hr'] },
      isActive: true,
    }).select('_id');

    await Promise.all(approvers.map(approver =>
      pushNotification({
        recipient: approver._id,
        sender: user._id,
        type: 'user_registered',
        title: 'New User Registration',
        message: `${user.name} (${user.email}) has signed up and is awaiting approval.`,
        link: '/admin/users',
      })
    ));

    // Also broadcast to the 'admin' socket room so online admins see it instantly
    try {
      getIO().to('admin').emit('user:registered', {
        userId: user._id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
      });
    } catch {}

    // Do NOT return a JWT — the user cannot log in until approved.
    res.status(201).json({
      success: true,
      pending: true,
      message: 'Registration successful! Your account is pending approval by an admin, manager, or HR. You will be able to log in once approved.',
      user: { id: user._id, name: user.name, email: user.email, employeeId: user.employeeId },
    });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.employeeId) {
      return res.status(409).json({ success: false, message: 'Registration conflict, please try again' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Login
// @route POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const needsApproval = APPROVAL_REQUIRED_ROLES.has(user.role);

    // Check approval only for manager and employee accounts
    if (needsApproval && !user.isApproved) {
      // Notify admins/managers/HR again that this user tried to log in (reminder)
      const approvers = await User.find({
        role: { $in: ['admin', 'manager', 'hr'] },
        isActive: true,
      }).select('_id');

      await Promise.all(approvers.map(approver =>
        pushNotification({
          recipient: approver._id,
          sender: user._id,
          type: 'user_registered',
          title: 'Pending User Tried to Log In',
          message: `${user.name} (${user.email}) attempted to log in but is still awaiting approval.`,
          link: '/admin/users',
        })
      ));

      return res.status(403).json({
        success: false,
        pending: true,
        message: 'Your account is pending approval. An admin, manager, or HR will review and activate your account.',
      });
    }

    // Keep non-approval roles (e.g., admin/hr) in a consistent approved state.
    if (!needsApproval && !user.isApproved) {
      user.isApproved = true;
      await user.save();
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact admin.' });
    }

    const token = generateToken(user._id);
    res.json({
      success: true, token,
      user: {
        id: user._id, name: user.name, email: user.email, role: user.role,
        department: user.department, designation: user.designation,
        employeeId: user.employeeId, avatar: user.avatar,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get current user
// @route GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('manager', 'name email').select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update password
// @route PUT /api/auth/update-password
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both currentPassword and newPassword are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }
    const user = await User.findById(req.user.id);
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Forgot password — generates reset token
// @route POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.json({ success: true, message: 'If that email exists, a reset link has been sent' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    res.json({ success: true, message: 'Password reset link generated', resetUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Reset password using token
// @route PUT /api/auth/reset-password/:token
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    const token = generateToken(user._id);
    res.json({ success: true, token, message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

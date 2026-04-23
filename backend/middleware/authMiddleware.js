const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ── Base auth: verify JWT and attach user to req ──────────────────────────────
exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ success: false, message: 'Not authorized, no token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
    if (!req.user.isActive) return res.status(403).json({ success: false, message: 'Account deactivated' });
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

// ── Admin only ────────────────────────────────────────────────────────────────
exports.adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// ── Admin + Manager only (can create projects, assign projects, create teams) ──
// HR is explicitly excluded from project/team management
exports.managerOrAdmin = (req, res, next) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Manager or Admin access required' });
  }
  next();
};

// Alias for managerOrAdmin — used for project/team creation routes
exports.managementOnly = exports.managerOrAdmin;

// ── Admin + Manager + HR: can delete projects ─────────────────────────────────
// HR can delete projects without needing full admin access
exports.hrOrAdminForDelete = (req, res, next) => {
  if (!['admin', 'manager', 'hr'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'HR, Manager or Admin access required to delete projects' });
  }
  next();
};

// ── Admin + Manager + HR (can view all data, manage leaves, manage users) ──────
// HR can do everything except create/assign projects and create teams
exports.hrOrAbove = (req, res, next) => {
  if (!['admin', 'manager', 'hr'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'HR, Manager or Admin access required' });
  }
  next();
};

// ── Admin + Manager + HR + Team Lead (elevated task access) ──────────────────
exports.teamLeadOrAbove = (req, res, next) => {
  if (!['admin', 'manager', 'hr', 'team_lead'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Team Lead access required' });
  }
  next();
};

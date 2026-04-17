const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

// Admin only — full system control
exports.adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });
  next();
};

// Management (manager) + Admin — can create projects, manage teams, assign team leads
// Does NOT include team_lead
exports.managementOnly = (req, res, next) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Management or Admin access required' });
  }
  next();
};

// Manager + Admin + Team Lead — broad elevated access (backward compat)
exports.managerOrAdmin = (req, res, next) => {
  if (!['admin', 'manager', 'team_lead'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Manager or Admin access required' });
  }
  next();
};

// Team lead or above — can create/assign tasks within their team
exports.teamLeadOrAbove = (req, res, next) => {
  if (!['admin', 'manager', 'team_lead'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Team Lead access required' });
  }
  next();
};

const express = require('express');
const router = express.Router();
const {
  getAllUsers, getUserById, updateUser, deleteUser,
  changeUserRole, updateLeaveBalance, getMyProfile, updateMyProfile,
  toggleUserStatus
} = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Static/specific routes MUST come before wildcard /:id routes
router.get('/', protect, adminOnly, getAllUsers);
router.get('/profile', protect, getMyProfile);
router.put('/profile', protect, updateMyProfile);

// Wildcard /:id routes
router.get('/:id', protect, getUserById);
router.put('/:id', protect, adminOnly, updateUser);
router.delete('/:id', protect, adminOnly, deleteUser);
router.put('/:id/role', protect, adminOnly, changeUserRole);
router.put('/:id/leave-balance', protect, adminOnly, updateLeaveBalance);
router.patch('/:id/toggle-status', protect, adminOnly, toggleUserStatus);

module.exports = router;

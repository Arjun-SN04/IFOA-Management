const express = require('express');
const router = express.Router();
const {
  getAllUsers, getUserById, updateUser, deleteUser,
  changeUserRole, updateLeaveBalance, getMyProfile, updateMyProfile,
  toggleUserStatus, getMyAccessories, getUserAccessories, addUserAccessory, removeUserAccessory
} = require('../controllers/userController');
const { protect, adminOnly, managerOrAdmin } = require('../middleware/authMiddleware');

// Static/specific routes MUST come before wildcard /:id routes
router.get('/', protect, getAllUsers);
router.get('/profile', protect, getMyProfile);
router.put('/profile', protect, updateMyProfile);
router.get('/me/accessories', protect, getMyAccessories);

// Wildcard /:id routes
router.get('/:id', protect, getUserById);
router.get('/:id/accessories', protect, managerOrAdmin, getUserAccessories);
router.post('/:id/accessories', protect, managerOrAdmin, addUserAccessory);
router.delete('/:id/accessories/:accessoryId', protect, managerOrAdmin, removeUserAccessory);
router.put('/:id', protect, adminOnly, updateUser);
router.delete('/:id', protect, adminOnly, deleteUser);
router.put('/:id/role', protect, adminOnly, changeUserRole);
router.put('/:id/leave-balance', protect, managerOrAdmin, updateLeaveBalance);
router.patch('/:id/toggle-status', protect, adminOnly, toggleUserStatus);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  getAllUsers, getUserById, updateUser, deleteUser,
  changeUserRole, updateLeaveBalance, getMyProfile, updateMyProfile,
  toggleUserStatus, getMyAccessories, getUserAccessories, addUserAccessory, removeUserAccessory, updateUserAccessory,
  approveUser, getPendingUsers, updateEmployeeId,
} = require('../controllers/userController');
const { protect, adminOnly, managerOrAdmin, hrOrAbove } = require('../middleware/authMiddleware');

// ── Static/specific routes MUST come before wildcard /:id routes ──────────────
router.get('/',                protect, hrOrAbove, getAllUsers);
router.get('/profile',         protect, getMyProfile);
router.put('/profile',         protect, updateMyProfile);
router.get('/me/accessories',  protect, getMyAccessories);

// ── Pending approvals (must be before /:id) ───────────────────────────────────
router.get('/pending',         protect, hrOrAbove, getPendingUsers);

// ── Wildcard /:id routes ──────────────────────────────────────────────────────
router.get('/:id',                             protect, hrOrAbove, getUserById);
router.get('/:id/accessories',                 protect, hrOrAbove, getUserAccessories);
router.post('/:id/accessories',                protect, hrOrAbove, addUserAccessory);
router.put('/:id/accessories/:accessoryId',    protect, hrOrAbove, updateUserAccessory);
router.delete('/:id/accessories/:accessoryId', protect, hrOrAbove, removeUserAccessory);
router.put('/:id',                             protect, adminOnly, updateUser);
router.delete('/:id',                          protect, adminOnly, deleteUser);
router.put('/:id/role',                        protect, adminOnly, changeUserRole);
router.put('/:id/leave-balance',               protect, hrOrAbove, updateLeaveBalance);
router.patch('/:id/toggle-status',             protect, adminOnly, toggleUserStatus);

// ── Employee ID update — admin / manager / HR can edit, uniqueness enforced ───
router.patch('/:id/employee-id',               protect, hrOrAbove, updateEmployeeId);

// ── Approval flow: admin / manager / HR can approve or reject pending users ───
router.patch('/:id/approve',                   protect, hrOrAbove, approveUser);

module.exports = router;

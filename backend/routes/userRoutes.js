const express = require('express');
const router = express.Router();
const {
  getAllUsers, getUserById, updateUser, deleteUser,
  changeUserRole, updateLeaveBalance, getMyProfile, updateMyProfile
} = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', protect, adminOnly, getAllUsers);
router.get('/profile', protect, getMyProfile);
router.put('/profile', protect, updateMyProfile);
router.get('/:id', protect, getUserById);
router.put('/:id', protect, adminOnly, updateUser);
router.delete('/:id', protect, adminOnly, deleteUser);
router.put('/:id/role', protect, adminOnly, changeUserRole);
router.put('/:id/leave-balance', protect, adminOnly, updateLeaveBalance);

module.exports = router;

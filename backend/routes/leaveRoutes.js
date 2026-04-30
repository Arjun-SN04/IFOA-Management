const express = require('express');
const router = express.Router();
const {
  applyLeave,
  getLeaves,
  reviewLeave,
  cancelLeave,
  getLeaveBalance,
  getLeaveCalendar,
  getLeaveResetSettings,
  updateLeaveResetSettings,
  adminCreateLeave,
  getMyLeaves,
  selfMarkLeave,
} = require('../controllers/leaveController');
const { protect, hrOrAbove, adminOnly } = require('../middleware/authMiddleware');

// Static named routes before wildcard /:id routes
router.post('/admin/create', protect, hrOrAbove, adminCreateLeave);   // HR + manager + admin can add leave manually
router.post('/self-mark',    protect, hrOrAbove, selfMarkLeave);       // HR/Manager mark own day as leave
router.post('/apply',        protect, applyLeave);                    // any authenticated user
router.get('/balance',       protect, getLeaveBalance);
router.get('/calendar',      protect, getLeaveCalendar);
router.get('/reset-settings', protect, hrOrAbove, getLeaveResetSettings);
router.put('/reset-settings', protect, adminOnly, updateLeaveResetSettings);

// /api/leaves/my — always returns current user's own leaves
router.get('/my', protect, getMyLeaves);

// HR + manager + admin — view all leaves
router.get('/', protect, hrOrAbove, getLeaves);

// Wildcard /:id routes last
router.put('/:id/review', protect, hrOrAbove, reviewLeave);           // HR can approve/reject leaves
router.put('/:id/cancel', protect, cancelLeave);                      // employee cancels own pending leave

module.exports = router;

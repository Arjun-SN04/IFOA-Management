const express = require('express');
const router = express.Router();
const {
  applyLeave,
  getLeaves,
  reviewLeave,
  cancelLeave,
  getLeaveBalance,
  getLeaveCalendar,
  adminCreateLeave,
  adminDeleteLeave,
  getMyLeaves,
  selfMarkLeave,
} = require('../controllers/leaveController');
const { protect, hrOrAbove, adminOnly } = require('../middleware/authMiddleware');

// Static named routes before wildcard /:id routes
router.post('/admin/create',   protect, hrOrAbove, adminCreateLeave);
router.delete('/admin/:id',    protect, adminOnly, adminDeleteLeave);   // ← admin-only delete
router.post('/self-mark',      protect, selfMarkLeave);
router.post('/apply',          protect, applyLeave);
router.get('/balance',         protect, getLeaveBalance);
router.get('/calendar',        protect, getLeaveCalendar);
router.get('/my',              protect, getMyLeaves);

// HR + manager + admin — view all leaves
router.get('/', protect, hrOrAbove, getLeaves);

// Wildcard /:id routes last
router.put('/:id/review', protect, hrOrAbove, reviewLeave);
router.put('/:id/cancel', protect, cancelLeave);

module.exports = router;

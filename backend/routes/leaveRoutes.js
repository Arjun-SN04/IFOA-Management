const express = require('express');
const router = express.Router();
const { applyLeave, getLeaves, reviewLeave, cancelLeave, getLeaveBalance, getLeaveCalendar } = require('../controllers/leaveController');
const { protect, managerOrAdmin } = require('../middleware/authMiddleware');

// FIX: static named routes before wildcard /:id routes
router.post('/apply', protect, applyLeave);
router.get('/my', protect, getLeaves);          // employee's own leaves
router.get('/balance', protect, getLeaveBalance);
router.get('/calendar', protect, getLeaveCalendar);

// Admin/manager — all leaves
router.get('/', protect, managerOrAdmin, getLeaves);

// Wildcard /:id routes last
router.put('/:id/review', protect, managerOrAdmin, reviewLeave);
router.put('/:id/cancel', protect, cancelLeave);

module.exports = router;

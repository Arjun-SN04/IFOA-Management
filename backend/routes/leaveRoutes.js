const express = require('express');
const router = express.Router();
const { applyLeave, getLeaves, reviewLeave, cancelLeave, getLeaveBalance, getLeaveCalendar } = require('../controllers/leaveController');
const { protect, managerOrAdmin } = require('../middleware/authMiddleware');

router.post('/apply', protect, applyLeave);
router.get('/my', protect, getLeaves);
router.get('/balance', protect, getLeaveBalance);
router.get('/calendar', protect, getLeaveCalendar);
router.get('/', protect, managerOrAdmin, getLeaves);
router.put('/:id/review', protect, managerOrAdmin, reviewLeave);
router.put('/:id/cancel', protect, cancelLeave);

module.exports = router;

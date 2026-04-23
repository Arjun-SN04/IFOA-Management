const express = require('express');
const router = express.Router();
const {
  getDashboardStats, getProjectReport, getUserReport,
  getLeaveReport, getSprintReport
} = require('../controllers/reportController');
const { protect, hrOrAbove } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, getDashboardStats);
router.get('/projects', protect, hrOrAbove, getProjectReport);
router.get('/users', protect, hrOrAbove, getUserReport);
router.get('/leaves', protect, hrOrAbove, getLeaveReport);
router.get('/sprints', protect, hrOrAbove, getSprintReport);

module.exports = router;

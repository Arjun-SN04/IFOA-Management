const express = require('express');
const router = express.Router();
const {
  getDashboardStats, getProjectReport, getUserReport,
  getLeaveReport, getSprintReport
} = require('../controllers/reportController');
const { protect, managerOrAdmin } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, getDashboardStats);
router.get('/projects', protect, managerOrAdmin, getProjectReport);
router.get('/users', protect, managerOrAdmin, getUserReport);
router.get('/leaves', protect, managerOrAdmin, getLeaveReport);
router.get('/sprints', protect, managerOrAdmin, getSprintReport);

module.exports = router;

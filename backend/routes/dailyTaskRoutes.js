const express = require('express');
const router = express.Router();
const {
  submitDailyTasks,
  getMyToday,
  getMyStatus,
  adminGetAllEntries,
  adminGetSettings,
  adminToggleEmployee,
  adminBulkToggle,
  adminSetSelected,
} = require('../controllers/dailyTaskController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Employee routes
router.post('/submit',     protect, submitDailyTasks);
router.get('/my-today',    protect, getMyToday);
router.get('/my-status',   protect, getMyStatus);

// Admin routes
router.get('/admin/all',              protect, adminOnly, adminGetAllEntries);
router.get('/admin/settings',         protect, adminOnly, adminGetSettings);
router.patch('/admin/settings/:userId', protect, adminOnly, adminToggleEmployee);
router.post('/admin/settings/bulk',   protect, adminOnly, adminBulkToggle);
router.post('/admin/settings/selected', protect, adminOnly, adminSetSelected);

module.exports = router;

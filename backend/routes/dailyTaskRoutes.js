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
const { protect, hrOrAbove } = require('../middleware/authMiddleware');

// Employee routes (all authenticated users)
router.post('/submit',   protect, submitDailyTasks);
router.get('/my-today',  protect, getMyToday);
router.get('/my-status', protect, getMyStatus);

// Management routes — HR, Manager, Admin
router.get('/admin/all',                protect, hrOrAbove, adminGetAllEntries);
router.get('/admin/settings',           protect, hrOrAbove, adminGetSettings);
router.patch('/admin/settings/:userId', protect, hrOrAbove, adminToggleEmployee);
router.post('/admin/settings/bulk',     protect, hrOrAbove, adminBulkToggle);
router.post('/admin/settings/selected', protect, hrOrAbove, adminSetSelected);

module.exports = router;

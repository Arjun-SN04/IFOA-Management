const express = require('express');
const router = express.Router();
const {
  createSprint, getSprints, updateSprint, deleteSprint,
  startSprint, completeSprint, getSprintBoard,
  getBacklogTasks, moveBacklogTaskToSprint,
} = require('../controllers/sprintController');
const { protect, managerOrAdmin } = require('../middleware/authMiddleware');

// ── Specific static routes BEFORE wildcard /:id routes ──────────────────────
router.get('/backlog',              protect, getBacklogTasks);
router.patch('/backlog/:taskId/move', protect, moveBacklogTaskToSprint);

router.post('/',                    protect, managerOrAdmin, createSprint);
router.get('/',                     protect, getSprints);
router.put('/:id',                  protect, managerOrAdmin, updateSprint);
router.delete('/:id',               protect, managerOrAdmin, deleteSprint);
router.patch('/:id/start',          protect, managerOrAdmin, startSprint);
router.patch('/:id/complete',       protect, managerOrAdmin, completeSprint);
router.get('/:id/board',            protect, getSprintBoard);

module.exports = router;

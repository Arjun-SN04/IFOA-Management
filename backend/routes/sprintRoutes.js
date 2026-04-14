const express = require('express');
const router = express.Router();
const { createSprint, getSprints, updateSprint, startSprint, completeSprint, getSprintBoard } = require('../controllers/sprintController');
const { protect, managerOrAdmin } = require('../middleware/authMiddleware');

router.post('/', protect, managerOrAdmin, createSprint);
router.get('/', protect, getSprints);
router.put('/:id', protect, managerOrAdmin, updateSprint);
router.patch('/:id/start', protect, managerOrAdmin, startSprint);
router.patch('/:id/complete', protect, managerOrAdmin, completeSprint);
router.get('/:id/board', protect, getSprintBoard);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  createTask, getTasks, getTaskById, updateTask,
  deleteTask, updateTaskStatus, assignTask, logTime, getMyTasks, updateTaskSprint
} = require('../controllers/taskController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/', protect, createTask);
router.get('/', protect, getTasks);
router.get('/my', protect, getMyTasks);
router.get('/:id', protect, getTaskById);
router.put('/:id', protect, updateTask);
router.delete('/:id', protect, adminOnly, deleteTask);
router.patch('/:id/status', protect, updateTaskStatus);
router.patch('/:id/assign',    protect, assignTask);
router.patch('/:id/sprint',    protect, updateTaskSprint);
router.post('/:id/log-time',   protect, logTime);

module.exports = router;

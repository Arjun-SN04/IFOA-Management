const express = require('express');
const router = express.Router();
const {
  createProject, getProjects, getProjectById,
  updateProject, archiveProject, addMember, removeMember, getProjectStats
} = require('../controllers/projectController');
const { protect, adminOnly, managerOrAdmin } = require('../middleware/authMiddleware');

router.post('/', protect, managerOrAdmin, createProject);
router.get('/', protect, getProjects);
router.get('/:id', protect, getProjectById);
router.put('/:id', protect, updateProject);
router.delete('/:id', protect, adminOnly, archiveProject);
router.post('/:id/members', protect, addMember);
router.delete('/:id/members/:userId', protect, removeMember);
router.get('/:id/stats', protect, getProjectStats);

module.exports = router;

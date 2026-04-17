const express = require('express');
const router = express.Router();
const {
  createProject, getProjects, getProjectById,
  updateProject, archiveProject, addMember, removeMember, getProjectStats,
  assignTeamToProject, removeTeamFromProject,
} = require('../controllers/projectController');
const { protect, adminOnly, managementOnly, managerOrAdmin } = require('../middleware/authMiddleware');

// Project CRUD — management + admin can create/update projects
router.post('/',     protect, managementOnly, createProject);
router.get('/',      protect, getProjects);
router.get('/:id',   protect, getProjectById);
router.put('/:id',   protect, managementOnly, updateProject);     // edit project — management only
router.delete('/:id',protect, adminOnly, archiveProject);          // delete — admin only

// Member management
router.post('/:id/members',              protect, managementOnly, addMember);
router.delete('/:id/members/:userId',    protect, managementOnly, removeMember);

// Team assignment to project — management + admin
router.post('/:id/teams',                protect, managementOnly, assignTeamToProject);
router.delete('/:id/teams/:teamId',      protect, managementOnly, removeTeamFromProject);

router.get('/:id/stats', protect, getProjectStats);

module.exports = router;

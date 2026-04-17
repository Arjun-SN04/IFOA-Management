const express = require('express');
const router = express.Router();
const {
  createTeam, getTeams, getTeamById, updateTeam, deleteTeam,
  addMember, removeMember, switchMember, assignProject, removeProject,
  changeTeamLead, getTeamDashboard, getEligibleMembers,
} = require('../controllers/teamController');
const { protect, adminOnly, managementOnly, managerOrAdmin } = require('../middleware/authMiddleware');

// Get eligible members (employees only) for dropdowns — management + admin
router.get('/eligible-members', protect, managementOnly, getEligibleMembers);

// Switch member between teams — management + admin
router.post('/switch-member', protect, managementOnly, switchMember);

// Team CRUD — management + admin can create/update/delete teams
router.post('/',   protect, managementOnly, createTeam);
router.get('/',    protect, getTeams);
router.get('/:id', protect, getTeamById);
router.put('/:id', protect, managementOnly, updateTeam);
router.delete('/:id', protect, adminOnly, deleteTeam);

// Live team dashboard — management + admin
router.get('/:id/dashboard', protect, managementOnly, getTeamDashboard);

// Change team lead — management + admin only
router.patch('/:id/lead', protect, managementOnly, changeTeamLead);

// Member management — management + admin
router.post('/:id/members',               protect, managementOnly, addMember);
router.delete('/:id/members/:userId',     protect, managementOnly, removeMember);

// Project assignment to team — management + admin
router.post('/:id/projects',              protect, managementOnly, assignProject);
router.delete('/:id/projects/:projectId', protect, managementOnly, removeProject);

module.exports = router;

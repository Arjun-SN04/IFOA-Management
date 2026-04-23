const express = require('express');
const router = express.Router();
const {
  createTeam, getTeams, getTeamById, updateTeam, deleteTeam,
  addMember, removeMember, switchMember, assignProject, removeProject,
  changeTeamLead, getTeamDashboard, getEligibleMembers,
} = require('../controllers/teamController');
const { protect, adminOnly, managementOnly, hrOrAbove } = require('../middleware/authMiddleware');

// Get eligible members (employees only) — manager + admin
router.get('/eligible-members', protect, managementOnly, getEligibleMembers);

// Switch member between teams — manager + admin
router.post('/switch-member', protect, managementOnly, switchMember);

// Team CRUD — manager + admin only (HR cannot create/delete teams)
router.post('/',      protect, managementOnly, createTeam);
router.get('/',       protect, hrOrAbove, getTeams);         // HR can view teams
router.get('/:id',    protect, hrOrAbove, getTeamById);      // HR can view single team
router.put('/:id',    protect, managementOnly, updateTeam);
router.delete('/:id', protect, managementOnly, deleteTeam);

// Live team dashboard — manager + admin + HR (view only for HR)
router.get('/:id/dashboard', protect, hrOrAbove, getTeamDashboard);

// Change team lead — manager + admin only
router.patch('/:id/lead', protect, managementOnly, changeTeamLead);

// Member management — manager + admin
router.post('/:id/members',               protect, managementOnly, addMember);
router.delete('/:id/members/:userId',     protect, managementOnly, removeMember);

// Project assignment to team — manager + admin (NOT HR)
router.post('/:id/projects',              protect, managementOnly, assignProject);
router.delete('/:id/projects/:projectId', protect, managementOnly, removeProject);

module.exports = router;

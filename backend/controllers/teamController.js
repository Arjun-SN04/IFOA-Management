const Team = require('../models/Team');
const User = require('../models/User');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { createAndEmit } = require('./notificationController');

// @desc  Create team
// @route POST /api/teams
// Access: Management + Admin
exports.createTeam = async (req, res) => {
  try {
    const { name, description, teamLead, members = [], projects = [], color } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Team name is required' });

    const employeeRoles = ['employee', 'team_lead'];

    if (teamLead) {
      const leadUser = await User.findById(teamLead).select('role name');
      if (!leadUser) return res.status(400).json({ success: false, message: 'Team lead user not found' });
      if (!employeeRoles.includes(leadUser.role)) {
        return res.status(400).json({ success: false, message: 'Only employees can be assigned as team lead.' });
      }
    }

    let filteredMembers = [];
    if (members.length > 0) {
      const memberUsers = await User.find({ _id: { $in: members } }).select('role _id');
      filteredMembers = memberUsers.filter(u => employeeRoles.includes(u.role)).map(u => String(u._id));
    }

    const team = await Team.create({
      name, description, teamLead, members: filteredMembers, projects, color,
      createdBy: req.user.id,
    });

    await team.populate([
      { path: 'teamLead', select: 'name email avatar role' },
      { path: 'members',  select: 'name email avatar role' },
      { path: 'projects', select: 'name key' },
    ]);

    if (teamLead && String(teamLead) !== req.user.id) {
      await User.findByIdAndUpdate(teamLead, { role: 'team_lead' });
      await createAndEmit({
        recipient: teamLead,
        sender: req.user.id,
        type: 'project_added',
        title: 'You are a Team Lead',
        message: `You have been assigned as Team Lead of "${name}"`,
        link: '/admin/teams',
      });
    }

    const uniqueMembers = [...new Set(filteredMembers)].filter(id => id !== req.user.id && id !== String(teamLead));
    await Promise.all(uniqueMembers.map(memberId =>
      createAndEmit({
        recipient: memberId,
        sender: req.user.id,
        type: 'project_added',
        title: 'Added to Team',
        message: `You have been added to team "${name}"`,
        link: '/admin/teams',
      })
    ));

    res.status(201).json({ success: true, team });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'A team with this name already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get all teams (scoped by role)
// @route GET /api/teams
exports.getTeams = async (req, res) => {
  try {
    const query = {};

    if (req.user.role === 'employee') {
      query.$or = [{ members: req.user.id }, { teamLead: req.user.id }];
    } else if (req.user.role === 'team_lead') {
      query.$or = [{ teamLead: req.user.id }, { members: req.user.id }];
    }

    const teams = await Team.find(query)
      .populate('teamLead', 'name email avatar role department')
      .populate('members',  'name email avatar role department')
      .populate('projects', 'name key status')
      .sort({ createdAt: -1 });

    res.json({ success: true, teams });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get single team with live dashboard data
// @route GET /api/teams/:id
exports.getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('teamLead', 'name email avatar role department designation')
      .populate('members',  'name email avatar role department designation')
      .populate('projects', 'name key status priority')
      .populate('createdBy', 'name');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const memberIds = team.members.map(m => m._id || m);
    const tasks = await Task.find({ assignee: { $in: memberIds } })
      .populate('assignee', 'name email avatar')
      .populate('project', 'name key')
      .select('title status priority assignee project dueDate type taskKey');

    const taskStats = {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      inReview: tasks.filter(t => t.status === 'in-review').length,
      done: tasks.filter(t => t.status === 'done').length,
      overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length,
    };

    const memberStats = team.members.map(member => {
      const memberId = String(member._id || member);
      const memberTasks = tasks.filter(t => String(t.assignee?._id || t.assignee) === memberId);
      return {
        member,
        tasks: {
          total: memberTasks.length,
          todo: memberTasks.filter(t => t.status === 'todo').length,
          inProgress: memberTasks.filter(t => t.status === 'in-progress').length,
          done: memberTasks.filter(t => t.status === 'done').length,
          overdue: memberTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length,
        },
        recentTasks: memberTasks.slice(0, 5),
      };
    });

    res.json({ success: true, team, tasks, taskStats, memberStats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update team
// @route PUT /api/teams/:id
// Access: Management + Admin
exports.updateTeam = async (req, res) => {
  try {
    if (req.body.members && req.body.members.length > 0) {
      const memberUsers = await User.find({ _id: { $in: req.body.members } }).select('role _id');
      req.body.members = memberUsers.filter(u => ['employee', 'team_lead'].includes(u.role)).map(u => String(u._id));
    }

    const team = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('teamLead', 'name email avatar role')
      .populate('members',  'name email avatar role')
      .populate('projects', 'name key');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, team });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Change team lead
// @route PATCH /api/teams/:id/lead
// Access: Management + Admin
exports.changeTeamLead = async (req, res) => {
  try {
    const { newLeadId } = req.body;
    if (!newLeadId) return res.status(400).json({ success: false, message: 'newLeadId is required' });

    const newLeadUser = await User.findById(newLeadId).select('role name');
    if (!newLeadUser) return res.status(404).json({ success: false, message: 'New team lead user not found' });
    if (!['employee', 'team_lead'].includes(newLeadUser.role)) {
      return res.status(400).json({ success: false, message: 'Only employees can be assigned as team lead.' });
    }

    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    // New lead must already belong to this team (member or current lead).
    const currentTeamUserIds = new Set([
      ...(team.members || []).map(id => String(id)),
      team.teamLead ? String(team.teamLead) : null,
    ].filter(Boolean));
    if (!currentTeamUserIds.has(String(newLeadId))) {
      return res.status(400).json({ success: false, message: 'New team lead must be selected from current team members' });
    }

    const oldLeadId = team.teamLead ? String(team.teamLead) : null;

    if (oldLeadId && oldLeadId !== String(newLeadId)) {
      const otherTeamsAsLead = await Team.countDocuments({
        teamLead: oldLeadId,
        _id: { $ne: req.params.id },
      });
      if (otherTeamsAsLead === 0) {
        await User.findByIdAndUpdate(oldLeadId, { role: 'employee' });
      }
      await createAndEmit({
        recipient: oldLeadId,
        sender: req.user.id,
        type: 'project_updated',
        title: 'Team Lead Changed',
        message: `You are no longer the Team Lead of "${team.name}"`,
        link: '/admin/teams',
      });
    }

    await User.findByIdAndUpdate(newLeadId, { role: 'team_lead' });

    team.teamLead = newLeadId;
    const memberIds = team.members.map(String);
    if (!memberIds.includes(String(newLeadId))) {
      team.members.push(newLeadId);
    }
    await team.save();

    const updated = await Team.findById(req.params.id)
      .populate('teamLead', 'name email avatar role')
      .populate('members',  'name email avatar role')
      .populate('projects', 'name key');

    await createAndEmit({
      recipient: newLeadId,
      sender: req.user.id,
      type: 'project_added',
      title: 'You are now a Team Lead',
      message: `You have been assigned as Team Lead of "${team.name}"`,
      link: '/admin/teams',
    });

    res.json({ success: true, team: updated, message: 'Team lead changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Delete team
// @route DELETE /api/teams/:id
// Access: Admin only
exports.deleteTeam = async (req, res) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, message: 'Team deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Add member to team
// @route POST /api/teams/:id/members
exports.addMember = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });

    const memberUser = await User.findById(userId).select('role name');
    if (!memberUser) return res.status(404).json({ success: false, message: 'User not found' });
    if (!['employee', 'team_lead'].includes(memberUser.role)) {
      return res.status(400).json({ success: false, message: 'Only employees can be added as team members' });
    }

    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { members: userId } },
      { new: true }
    )
      .populate('teamLead', 'name email avatar role')
      .populate('members',  'name email avatar role');

    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    if (String(userId) !== req.user.id) {
      await createAndEmit({
        recipient: userId,
        sender: req.user.id,
        type: 'project_added',
        title: 'Added to Team',
        message: `You have been added to team "${team.name}"`,
        link: '/admin/teams',
      });
    }

    res.json({ success: true, team });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Remove member from team
// @route DELETE /api/teams/:id/members/:userId
exports.removeMember = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    if (String(team.teamLead) === String(req.params.userId)) {
      return res.status(400).json({ success: false, message: 'Cannot remove team lead from team. Change team lead first.' });
    }

    const updated = await Team.findByIdAndUpdate(
      req.params.id,
      { $pull: { members: req.params.userId } },
      { new: true }
    )
      .populate('teamLead', 'name email avatar role')
      .populate('members',  'name email avatar role');

    res.json({ success: true, team: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Switch member from one team to another
// @route POST /api/teams/switch-member
exports.switchMember = async (req, res) => {
  try {
    const { userId, fromTeamId, toTeamId } = req.body;
    if (!userId || !toTeamId) {
      return res.status(400).json({ success: false, message: 'userId and toTeamId are required' });
    }

    if (fromTeamId) {
      const fromTeam = await Team.findById(fromTeamId);
      if (fromTeam && String(fromTeam.teamLead) !== String(userId)) {
        await Team.findByIdAndUpdate(fromTeamId, { $pull: { members: userId } });
      }
    }

    const toTeam = await Team.findByIdAndUpdate(
      toTeamId,
      { $addToSet: { members: userId } },
      { new: true }
    )
      .populate('teamLead', 'name email avatar role')
      .populate('members',  'name email avatar role');

    if (!toTeam) return res.status(404).json({ success: false, message: 'Target team not found' });

    if (String(userId) !== req.user.id) {
      await createAndEmit({
        recipient: userId,
        sender: req.user.id,
        type: 'project_added',
        title: 'Team Assignment Updated',
        message: `You have been moved to team "${toTeam.name}"`,
        link: '/admin/teams',
      });
    }

    res.json({ success: true, team: toTeam, message: 'Member switched successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Assign project to team — FIXED: now does full bidirectional sync
// @route POST /api/teams/:id/projects
// Access: Management + Admin
exports.assignProject = async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ success: false, message: 'projectId is required' });

    // Get team details to collect all member IDs
    const teamDoc = await Team.findById(req.params.id)
      .populate('members', '_id name')
      .populate('teamLead', '_id name');

    if (!teamDoc) return res.status(404).json({ success: false, message: 'Team not found' });

    const memberIds = (teamDoc.members || []).map(m => String(m._id || m));
    const leadId = teamDoc.teamLead ? String(teamDoc.teamLead._id || teamDoc.teamLead) : null;
    const allIds = [...new Set([...memberIds, leadId].filter(Boolean))];

    // 1. Add project to team's projects list
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { projects: projectId } },
      { new: true }
    )
      .populate('teamLead', 'name email avatar')
      .populate('members',  'name email avatar')
      .populate('projects', 'name key status');

    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    // 2. Add team to project's teams list AND add all team members to project.members
    //    This is the critical fix: bidirectional sync so project knows which teams are assigned
    await Project.findByIdAndUpdate(
      projectId,
      {
        $addToSet: {
          teams: req.params.id,
          members: { $each: allIds },
        },
      }
    );

    // 3. Notify team members
    const project = await Project.findById(projectId).select('name');
    const notifyIds = allIds.filter(id => id !== req.user.id);
    if (project) {
      await Promise.all(notifyIds.map(memberId =>
        createAndEmit({
          recipient: memberId,
          sender: req.user.id,
          type: 'project_added',
          title: 'Project Assigned to Your Team',
          message: `Project "${project.name}" has been assigned to your team "${team.name}"`,
          link: `/projects/${projectId}`,
        }).catch(() => {})
      ));
    }

    res.json({ success: true, team, message: 'Project assigned to team' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Remove project from team
// @route DELETE /api/teams/:id/projects/:projectId
// Access: Management + Admin
exports.removeProject = async (req, res) => {
  try {
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { $pull: { projects: req.params.projectId } },
      { new: true }
    )
      .populate('teamLead', 'name email avatar')
      .populate('members',  'name email avatar')
      .populate('projects', 'name key status');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    // Also remove team from Project.teams for bidirectional sync
    await Project.findByIdAndUpdate(req.params.projectId, {
      $pull: { teams: req.params.id },
    });

    res.json({ success: true, team });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get live dashboard for a specific team
// @route GET /api/teams/:id/dashboard
// Access: HR + Management + Admin
exports.getTeamDashboard = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('teamLead', 'name email avatar role department')
      .populate('members',  'name email avatar role department')
      .populate('projects', 'name key status priority progress');

    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const memberIds = team.members.map(m => m._id || m);

    // Fetch tasks assigned to members of THIS specific team only
    const tasks = await Task.find({ assignee: { $in: memberIds } })
      .populate('assignee', 'name email avatar')
      .populate('project', 'name key')
      .populate('reporter', 'name')
      .sort({ createdAt: -1 });

    const taskStats = {
      total: tasks.length,
      backlog: tasks.filter(t => t.status === 'backlog').length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      inReview: tasks.filter(t => t.status === 'in-review').length,
      done: tasks.filter(t => t.status === 'done').length,
      overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length,
    };

    const memberStats = team.members.map(member => {
      const memberId = String(member._id || member);
      const memberTasks = tasks.filter(t => String(t.assignee?._id || t.assignee) === memberId);
      return {
        member,
        taskCount: memberTasks.length,
        done: memberTasks.filter(t => t.status === 'done').length,
        inProgress: memberTasks.filter(t => t.status === 'in-progress').length,
        todo: memberTasks.filter(t => t.status === 'todo').length,
        overdue: memberTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length,
        tasks: memberTasks,
      };
    });

    res.json({ success: true, team, tasks, taskStats, memberStats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get only eligible team members (employees only, no admin/manager)
// @route GET /api/teams/eligible-members
// Access: Management + Admin
exports.getEligibleMembers = async (req, res) => {
  try {
    const employees = await User.find({
      role: { $in: ['employee', 'team_lead'] },
      isActive: true,
    }).select('name email avatar role department designation');

    res.json({ success: true, users: employees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const Project = require('../models/Project');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const Team = require('../models/Team');
const { createAndEmit } = require('./notificationController');

const uniqueRecipients = (ids = [], excludeId) => {
  const exclude = excludeId ? String(excludeId) : null;
  return [...new Set(ids.map((id) => {
    // Handle populated objects or raw strings/ObjectIds
    if (id && typeof id === 'object' && id._id) return String(id._id);
    return id ? String(id) : null;
  }).filter((id) => id && id !== exclude))];
};

const canManageProject = (user, project) => {
  if (!user || !project) return false;
  if (['admin', 'manager'].includes(user.role)) return true;
  return false;
};

// @desc  Create project
// @route POST /api/projects
// Access: Management + Admin
exports.createProject = async (req, res) => {
  try {
    // Manager/admin is always the lead — they are creating and assigning to teams
    const lead = req.user.id;

    // If teams are selected, gather all team members to add to project.members
    const selectedTeamIds = req.body.teams || [];
    let teamMemberIds = [];
    let teamLeadIds = [];

    if (selectedTeamIds.length > 0) {
      const teamDocs = await Team.find({ _id: { $in: selectedTeamIds } })
        .populate('members', '_id')
        .populate('teamLead', '_id');

      teamMemberIds = teamDocs.flatMap(t => (t.members || []).map(m => String(m._id || m)));
      teamLeadIds = teamDocs.map(t => t.teamLead?._id || t.teamLead).filter(Boolean).map(String);
    }

    const allMemberIds = [...new Set([lead, ...teamMemberIds, ...teamLeadIds].filter(Boolean))];

    const project = await Project.create({
      ...req.body,
      lead,
      members: allMemberIds,
      createdBy: req.user.id,
    });

    // Link each team to this project
    if (selectedTeamIds.length > 0) {
      await Promise.all(
        selectedTeamIds.map(teamId =>
          Team.findByIdAndUpdate(teamId, { $addToSet: { projects: project._id } })
        )
      );
    }

    await project.populate([
      { path: 'lead', select: 'name email' },
      { path: 'teams', select: 'name' },
      { path: 'members', select: 'name email' },
    ]);

    // Notify all team members (not the creator)
    const notifyIds = uniqueRecipients(allMemberIds, req.user.id);
    if (notifyIds.length) {
      await Promise.all(
        notifyIds.map((recipient) =>
          createAndEmit({
            recipient,
            sender: req.user.id,
            type: 'project_added',
            title: 'Project Assigned to You',
            message: `You have been assigned to project: ${project.name}`,
            link: `/projects/${project._id}`,
          })
        )
      );
    }

    res.status(201).json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get all projects (scoped by role)
// @route GET /api/projects
exports.getProjects = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = { isArchived: false };

    if (req.user.role === 'employee') {
      // Employees only see projects they are members of (via their team assignment)
      query.$or = [{ lead: req.user.id }, { members: req.user.id }];
    } else if (req.user.role === 'team_lead') {
      // Team leads see projects their teams are assigned to, or they are a member
      const myTeams = await Team.find({
        $or: [{ teamLead: req.user.id }, { members: req.user.id }],
      }).select('projects');
      const teamProjectIds = myTeams.flatMap(t => t.projects.map(String));
      const uniqueProjectIds = [...new Set(teamProjectIds)];

      if (uniqueProjectIds.length > 0) {
        query.$or = [
          { _id: { $in: uniqueProjectIds } },
          { lead: req.user.id },
          { members: req.user.id },
        ];
      } else {
        query.$or = [{ lead: req.user.id }, { members: req.user.id }];
      }
    }
    // managers and admins see all projects

    if (status) query.status = status;
    if (search) query.name = { $regex: search, $options: 'i' };

    const projects = await Project.find(query)
      .populate('lead', 'name email avatar')
      .populate('members', 'name email avatar')
      .populate('teams', 'name color teamLead')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get single project
// @route GET /api/projects/:id
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('lead', 'name email avatar')
      .populate('members', 'name email avatar designation')
      .populate({
        path: 'teams',
        select: 'name color teamLead members',
        populate: [
          { path: 'teamLead', select: 'name email avatar' },
          { path: 'members', select: 'name email avatar' },
        ],
      })
      .populate('createdBy', 'name');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update project
// @route PUT /api/projects/:id
// Access: Management + Admin
exports.updateProject = async (req, res) => {
  try {
    const existing = await Project.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Project not found' });
    if (!canManageProject(req.user, existing)) {
      return res.status(403).json({ success: false, message: 'Only Management or Admin can update projects' });
    }

    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('lead', 'name email')
      .populate('members', 'name email avatar')
      .populate('teams', 'name color');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Safely extract plain string IDs from potentially-populated documents
    const leadId = project.lead?._id ? String(project.lead._id) : (project.lead ? String(project.lead) : null);
    const memberIds = (project.members || []).map(m => m?._id ? String(m._id) : String(m)).filter(Boolean);
    const recipients = uniqueRecipients([leadId, ...memberIds].filter(Boolean), req.user.id);

    if (recipients.length) {
      await Promise.all(
        recipients.map((recipient) =>
          createAndEmit({
            recipient,
            sender: req.user.id,
            type: 'project_updated',
            title: 'Project Updated',
            message: `Project "${project.name}" was updated`,
            link: `/projects/${project._id}`,
          }).catch(() => {}) // don't let notification failure break the response
        )
      );
    }

    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Add member to project
// @route POST /api/projects/:id/members
// Access: Management + Admin
exports.addMember = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });

    const existing = await Project.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Project not found' });
    if (!canManageProject(req.user, existing)) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage project members' });
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { members: userId } },
      { new: true }
    )
      .populate('lead', 'name email avatar')
      .populate('members', 'name email avatar designation');

    if (project && userId && String(userId) !== req.user.id) {
      await createAndEmit({
        recipient: userId,
        sender: req.user.id,
        type: 'project_added',
        title: 'Added to Project',
        message: `You were added to project: ${project.name}`,
        link: `/projects/${project._id}`,
      }).catch(() => {});
    }

    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Remove member from project
// @route DELETE /api/projects/:id/members/:userId
// Access: Management + Admin
exports.removeMember = async (req, res) => {
  try {
    const existing = await Project.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Project not found' });
    if (!canManageProject(req.user, existing)) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage project members' });
    }

    if (String(existing.lead) === String(req.params.userId)) {
      return res.status(400).json({ success: false, message: 'Project lead cannot be removed from members' });
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $pull: { members: req.params.userId } },
      { new: true }
    )
      .populate('lead', 'name email avatar')
      .populate('members', 'name email avatar designation');
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Assign a team to a project
// @route POST /api/projects/:id/teams
// Access: Management + Admin
exports.assignTeamToProject = async (req, res) => {
  try {
    const { teamId } = req.body;
    if (!teamId) return res.status(400).json({ success: false, message: 'teamId is required' });

    // Get team details to add members to project
    const teamDoc = await Team.findById(teamId)
      .populate('members', '_id name')
      .populate('teamLead', '_id name');

    if (!teamDoc) return res.status(404).json({ success: false, message: 'Team not found' });

    // Collect team member IDs
    const memberIds = (teamDoc.members || []).map(m => String(m._id || m));
    const leadId = teamDoc.teamLead ? String(teamDoc.teamLead._id || teamDoc.teamLead) : null;
    const allIds = [...new Set([...memberIds, leadId].filter(Boolean))];

    // Add team to project and add all team members to project.members
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      {
        $addToSet: { teams: teamId, members: { $each: allIds } },
      },
      { new: true }
    )
      .populate('lead', 'name email avatar')
      .populate('members', 'name email avatar')
      .populate('teams', 'name color teamLead members');

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Link project in Team document
    await Team.findByIdAndUpdate(teamId, { $addToSet: { projects: req.params.id } });

    // Notify team members
    const notifyIds = allIds.filter(id => id !== req.user.id);
    await Promise.all(notifyIds.map(memberId =>
      createAndEmit({
        recipient: memberId,
        sender: req.user.id,
        type: 'project_added',
        title: 'Project Assigned to Your Team',
        message: `Project "${project.name}" has been assigned to your team "${teamDoc.name}"`,
        link: `/projects/${project._id}`,
      }).catch(() => {})
    ));

    res.json({ success: true, project, message: 'Team assigned to project' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Remove a team from a project
// @route DELETE /api/projects/:id/teams/:teamId
// Access: Management + Admin
exports.removeTeamFromProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $pull: { teams: req.params.teamId } },
      { new: true }
    )
      .populate('lead', 'name email avatar')
      .populate('members', 'name email avatar')
      .populate('teams', 'name color teamLead');

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    await Team.findByIdAndUpdate(req.params.teamId, { $pull: { projects: req.params.id } });

    res.json({ success: true, project, message: 'Team removed from project' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Delete (hard delete) project — also deletes all tasks & sprints
// @route DELETE /api/projects/:id
// Access: Admin only
exports.archiveProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    await Task.deleteMany({ project: req.params.id });
    await Sprint.deleteMany({ project: req.params.id });
    await Project.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Project and all associated tasks and sprints deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get project stats
// @route GET /api/projects/:id/stats
exports.getProjectStats = async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.id });
    const stats = {
      total: tasks.length,
      backlog: tasks.filter(t => t.status === 'backlog').length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      inReview: tasks.filter(t => t.status === 'in-review').length,
      done: tasks.filter(t => t.status === 'done').length,
      bugs: tasks.filter(t => t.type === 'bug').length,
      totalStoryPoints: tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0),
      completedStoryPoints: tasks.filter(t => t.status === 'done').reduce((sum, t) => sum + (t.storyPoints || 0), 0),
    };
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

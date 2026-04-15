const Project = require('../models/Project');
const Task = require('../models/Task');
const { createAndEmit } = require('./notificationController');

const uniqueRecipients = (ids = [], excludeId) => {
  const exclude = excludeId ? String(excludeId) : null;
  return [...new Set(ids.map((id) => String(id)).filter((id) => id && id !== exclude))];
};

const canManageProject = (user, project) => {
  if (!user || !project) return false;
  if (['admin', 'manager'].includes(user.role)) return true;
  return String(project.lead) === String(user.id || user._id);
};

// @desc  Create project
// @route POST /api/projects
exports.createProject = async (req, res) => {
  try {
    const project = await Project.create({ ...req.body, createdBy: req.user.id });
    await project.populate('lead', 'name email');

    const recipients = uniqueRecipients([project.lead?._id || project.lead, ...(project.members || [])], req.user.id);
    if (recipients.length) {
      await Promise.all(
        recipients.map((recipient) =>
          createAndEmit({
            recipient,
            sender: req.user.id,
            type: 'project_added',
            title: 'Added to Project',
            message: `You were added to project: ${project.name}`,
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

// @desc  Get all projects
// @route GET /api/projects
exports.getProjects = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = { isArchived: false };

    // Non-admin only see projects they're on
    if (req.user.role === 'employee') {
      query.$or = [{ lead: req.user.id }, { members: req.user.id }];
    }
    if (status) query.status = status;
    if (search) query.name = { $regex: search, $options: 'i' };

    const projects = await Project.find(query)
      .populate('lead', 'name email avatar')
      .populate('members', 'name email avatar')
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
      .populate('createdBy', 'name');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update project
// @route PUT /api/projects/:id
exports.updateProject = async (req, res) => {
  try {
    const existing = await Project.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Project not found' });
    if (!canManageProject(req.user, existing)) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this project' });
    }

    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('lead', 'name email')
      .populate('members', 'name email avatar');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const recipients = uniqueRecipients([project.lead?._id || project.lead, ...(project.members || [])], req.user.id);
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
          })
        )
      );
    }

    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Add member to project
// @route PUT /api/projects/:id/members
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
      });
    }

    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Remove member from project
// @route DELETE /api/projects/:id/members/:userId
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

// @desc  Archive project
// @route PUT /api/projects/:id/archive
exports.archiveProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, { isArchived: true }, { new: true });
    res.json({ success: true, message: 'Project archived', project });
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

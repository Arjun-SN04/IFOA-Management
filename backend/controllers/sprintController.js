const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { createAndEmit } = require('./notificationController');

const notifyProjectTeam = async ({ projectId, actorId, type, title, message, link }) => {
  const project = await Project.findById(projectId).select('lead members');
  if (!project) return;
  const recipients = [...new Set([project.lead, ...(project.members || [])].map((id) => String(id)))]
    .filter((id) => id !== String(actorId));
  if (!recipients.length) return;
  await Promise.all(
    recipients.map((recipient) => createAndEmit({ recipient, sender: actorId, type, title, message, link }))
  );
};

// @desc  Create sprint
// @route POST /api/sprints
exports.createSprint = async (req, res) => {
  try {
    const { name, startDate, endDate } = req.body;
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'name, startDate and endDate are required' });
    }
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ success: false, message: 'End date cannot be before start date' });
    }

    // Sprints are global — `project` is optional. Drop empty string to keep it unset.
    const payload = { ...req.body, createdBy: req.user.id };
    if (!payload.project) delete payload.project;

    let sprint = await Sprint.create(payload);
    sprint = await Sprint.findById(sprint._id)
      .populate('project', 'name')
      .populate('createdBy', 'name');
    res.status(201).json({ success: true, sprint, data: sprint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get sprints by project
// @route GET /api/sprints?project=:id&status=:status
exports.getSprints = async (req, res) => {
  try {
    const { project, status } = req.query;
    const query = {};
    if (project) query.project = project;
    if (status) query.status = status;
    const sprints = await Sprint.find(query)
      .populate('createdBy', 'name')
      .populate('project', 'name')
      .sort({ startDate: -1 });
    res.json({ success: true, sprints, data: sprints });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update sprint
// @route PUT /api/sprints/:id
exports.updateSprint = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const current = await Sprint.findById(req.params.id).select('startDate endDate');
    if (!current) return res.status(404).json({ success: false, message: 'Sprint not found' });
    const s = startDate ? new Date(startDate) : current.startDate;
    const e = endDate ? new Date(endDate) : current.endDate;
    if (s && e && e < s) {
      return res.status(400).json({ success: false, message: 'End date cannot be before start date' });
    }

    const sprint = await Sprint.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('project', 'name');
    if (!sprint) return res.status(404).json({ success: false, message: 'Sprint not found' });
    res.json({ success: true, sprint, data: sprint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Delete sprint (admin/manager)
// @route DELETE /api/sprints/:id
exports.deleteSprint = async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ success: false, message: 'Sprint not found' });

    // Unlink tasks from this sprint (move to backlog), stamp originSprint
    await Task.updateMany(
      { sprint: sprint._id },
      { $unset: { sprint: 1 }, status: 'backlog', originSprint: sprint._id }
    );

    await Sprint.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: `Sprint "${sprint.name}" deleted. Tasks moved to backlog.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Start sprint
// @route PATCH /api/sprints/:id/start
exports.startSprint = async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ success: false, message: 'Sprint not found' });

    const activeSprint = await Sprint.findOne({ status: 'active' });
    if (activeSprint) return res.status(400).json({ success: false, message: 'Another sprint is already active. Complete it before starting a new one.' });

    sprint.status = 'active';
    await sprint.save();
    await sprint.populate('project', 'name');
    await sprint.populate('createdBy', 'name');

    if (sprint.project) {
      await notifyProjectTeam({
        projectId: sprint.project._id || sprint.project,
        actorId: req.user.id,
        type: 'sprint_started',
        title: 'Sprint Started',
        message: `Sprint "${sprint.name}" has started`,
        link: '/sprints',
      });
    }

    res.json({ success: true, sprint, data: sprint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Complete sprint — optionally move incomplete tasks to a next sprint
// @route PATCH /api/sprints/:id/complete
// @body  { nextSprintId?: string }  — if provided, incomplete tasks move there; otherwise → backlog
exports.completeSprint = async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ success: false, message: 'Sprint not found' });
    if (sprint.status !== 'active') return res.status(400).json({ success: false, message: 'Only active sprints can be completed' });

    const { nextSprintId } = req.body;

    const allSprintTasks = await Task.find({ sprint: sprint._id });
    const doneTasks = allSprintTasks.filter(t => t.status === 'done');
    const incompleteTasks = allSprintTasks.filter(t => !['done', 'cancelled'].includes(t.status));

    sprint.velocity = doneTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    sprint.status = 'completed';
    await sprint.save();
    await sprint.populate('project', 'name');
    await sprint.populate('createdBy', 'name');

    // Move incomplete tasks — stamp originSprint so UI can show badge
    if (incompleteTasks.length > 0) {
      if (nextSprintId) {
        const nextSprint = await Sprint.findById(nextSprintId);
        if (!nextSprint) {
          return res.status(404).json({ success: false, message: 'Next sprint not found' });
        }
        // Sprints are global — incomplete tasks (any project) roll into the next sprint.
        // Move to next sprint, keep originSprint as this sprint (set only if not already set)
        const incompleteIds = incompleteTasks.map(t => t._id);
        await Task.updateMany(
          { _id: { $in: incompleteIds }, originSprint: null },
          { sprint: nextSprintId, originSprint: sprint._id }
        );
        await Task.updateMany(
          { _id: { $in: incompleteIds }, originSprint: { $ne: null } },
          { sprint: nextSprintId }
        );
      } else {
        // Move to backlog — stamp originSprint so employee can see which sprint it came from
        const incompleteIds = incompleteTasks.map(t => t._id);
        await Task.updateMany(
          { _id: { $in: incompleteIds }, originSprint: null },
          { $unset: { sprint: 1 }, status: 'backlog', originSprint: sprint._id }
        );
        await Task.updateMany(
          { _id: { $in: incompleteIds }, originSprint: { $ne: null } },
          { $unset: { sprint: 1 }, status: 'backlog' }
        );
      }
    }

    if (sprint.project) {
      await notifyProjectTeam({
        projectId: sprint.project._id || sprint.project,
        actorId: req.user.id,
        type: 'sprint_ended',
        title: 'Sprint Completed',
        message: `Sprint "${sprint.name}" completed. ${doneTasks.length} done, ${incompleteTasks.length} moved to ${nextSprintId ? 'next sprint' : 'backlog'}.`,
        link: '/sprints',
      });
    }

    res.json({
      success: true,
      sprint,
      data: sprint,
      message: `Sprint completed. ${doneTasks.length} tasks done, ${incompleteTasks.length} incomplete tasks moved to ${nextSprintId ? 'next sprint' : 'backlog'}.`,
      stats: {
        done: doneTasks.length,
        incomplete: incompleteTasks.length,
        total: allSprintTasks.length,
        velocity: sprint.velocity,
        movedTo: nextSprintId ? 'next_sprint' : 'backlog',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get sprint board (tasks grouped by status)
// @route GET /api/sprints/:id/board
exports.getSprintBoard = async (req, res) => {
  try {
    const tasks = await Task.find({ sprint: req.params.id })
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email')
      .populate('sprint', 'name status')
      .populate('originSprint', 'name status startDate endDate')
      .sort({ order: 1 });

    const board = {
      backlog:       tasks.filter(t => t.status === 'backlog'),
      todo:          tasks.filter(t => t.status === 'todo'),
      'in-progress': tasks.filter(t => t.status === 'in-progress'),
      'in-review':   tasks.filter(t => t.status === 'in-review'),
      testing:       tasks.filter(t => t.status === 'testing'),
      done:          tasks.filter(t => t.status === 'done'),
    };
    res.json({ success: true, board, tasks, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get backlog tasks for a project (tasks with no sprint, or status=backlog)
// @route GET /api/sprints/backlog?project=:id
exports.getBacklogTasks = async (req, res) => {
  try {
    const { project } = req.query;
    if (!project) return res.status(400).json({ success: false, message: 'project is required' });

    const tasks = await Task.find({
      project,
      $or: [{ sprint: { $exists: false } }, { sprint: null }],
      status: 'backlog',
    })
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email')
      .populate('originSprint', 'name status startDate endDate')
      .sort({ createdAt: -1 });

    res.json({ success: true, tasks, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Move a backlog task into an active sprint
// @route PATCH /api/sprints/backlog/:taskId/move
// @body  { sprintId }
exports.moveBacklogTaskToSprint = async (req, res) => {
  try {
    const { sprintId } = req.body;
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const sprint = await Sprint.findById(sprintId);
    if (!sprint) return res.status(404).json({ success: false, message: 'Sprint not found' });
    if (sprint.status !== 'active') return res.status(400).json({ success: false, message: 'Can only move tasks into an active sprint' });

    task.sprint  = sprintId;
    task.status  = 'todo';
    await task.save();

    await task.populate('assignee', 'name email avatar');
    await task.populate('reporter', 'name email');
    await task.populate('sprint', 'name status');
    await task.populate('originSprint', 'name status startDate endDate');

    res.json({ success: true, task, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

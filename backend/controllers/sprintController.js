const Sprint = require('../models/Sprint');
const Task = require('../models/Task');

// @desc  Create sprint
// @route POST /api/sprints
exports.createSprint = async (req, res) => {
  try {
    const sprint = await Sprint.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, sprint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get sprints by project
// @route GET /api/sprints?project=:id
exports.getSprints = async (req, res) => {
  try {
    const { project, status } = req.query;
    const query = {};
    if (project) query.project = project;
    if (status) query.status = status;
    const sprints = await Sprint.find(query).populate('createdBy', 'name').sort({ startDate: -1 });
    res.json({ success: true, sprints });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update sprint
// @route PUT /api/sprints/:id
exports.updateSprint = async (req, res) => {
  try {
    const sprint = await Sprint.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!sprint) return res.status(404).json({ success: false, message: 'Sprint not found' });
    res.json({ success: true, sprint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Start sprint
// @route PUT /api/sprints/:id/start
exports.startSprint = async (req, res) => {
  try {
    // Check no other active sprint in same project
    const sprint = await Sprint.findById(req.params.id);
    const activeSprint = await Sprint.findOne({ project: sprint.project, status: 'active' });
    if (activeSprint) return res.status(400).json({ success: false, message: 'Another sprint is already active for this project' });

    sprint.status = 'active';
    await sprint.save();
    res.json({ success: true, sprint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Complete sprint
// @route PUT /api/sprints/:id/complete
exports.completeSprint = async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    // Calculate velocity
    const doneTasks = await Task.find({ sprint: sprint._id, status: 'done' });
    sprint.velocity = doneTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    sprint.status = 'completed';
    await sprint.save();

    // Move incomplete tasks to backlog
    await Task.updateMany({ sprint: sprint._id, status: { $nin: ['done', 'cancelled'] } }, { $unset: { sprint: 1 }, status: 'backlog' });

    res.json({ success: true, sprint, message: `Sprint completed. Velocity: ${sprint.velocity} points.` });
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
      .sort({ order: 1 });

    const board = {
      backlog: tasks.filter(t => t.status === 'backlog'),
      todo: tasks.filter(t => t.status === 'todo'),
      'in-progress': tasks.filter(t => t.status === 'in-progress'),
      'in-review': tasks.filter(t => t.status === 'in-review'),
      testing: tasks.filter(t => t.status === 'testing'),
      done: tasks.filter(t => t.status === 'done'),
    };
    res.json({ success: true, board });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

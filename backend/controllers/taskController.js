const Task = require('../models/Task');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const { getIO } = require('../socket');

// Helper to generate task key safely (e.g. PROJ-12)
const generateTaskKey = async (projectId) => {
  const project = await Project.findById(projectId).select('key');
  if (!project) throw new Error('Project not found');
  const count = await Task.countDocuments({ project: projectId });
  return `${project.key}-${count + 1}`;
};

// Helper: push a notification via DB + WebSocket
const pushNotification = async ({ recipient, sender, type, title, message, link }) => {
  const notif = await Notification.create({ recipient, sender, type, title, message, link });
  try {
    getIO().to(`user:${recipient}`).emit('notification:new', notif);
  } catch { /* socket may not be up in tests */ }
  return notif;
};

// @desc  Create task
// @route POST /api/tasks
exports.createTask = async (req, res) => {
  try {
    let task;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const taskKey = await generateTaskKey(req.body.project);
        task = await Task.create({ ...req.body, reporter: req.user.id, taskKey });
        break;
      } catch (err) {
        if (err.code === 11000 && err.keyPattern?.taskKey && attempt < 2) continue;
        throw err;
      }
    }

    // Notify assignee
    if (req.body.assignee && req.body.assignee !== req.user.id.toString()) {
      await pushNotification({
        recipient: req.body.assignee,
        sender:    req.user.id,
        type:      'task_assigned',
        title:     'New Task Assigned',
        message:   `You have been assigned task: ${task.title}`,
        link:      `/tasks/${task._id}`,
      });
    }

    await task.populate([
      { path: 'assignee', select: 'name email avatar' },
      { path: 'reporter', select: 'name email' },
      { path: 'project',  select: 'name key' },
    ]);

    // Broadcast to admin room so boards update live
    try { getIO().to('admin').emit('task:created', task); } catch {}

    res.status(201).json({ success: true, data: task, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get tasks (with filters)
// @route GET /api/tasks
exports.getTasks = async (req, res) => {
  try {
    const { project, sprint, assignee, status, type, priority, search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (project)  query.project  = project;
    if (sprint)   query.sprint   = sprint;
    if (assignee) query.assignee = assignee;
    if (status)   query.status   = status;
    if (type)     query.type     = type;
    if (priority) query.priority = priority;
    if (search)   query.title    = { $regex: search, $options: 'i' };

    const tasks = await Task.find(query)
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email')
      .populate('project',  'name key')
      .populate('sprint',   'name status')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ order: 1, createdAt: -1 });

    const total = await Task.countDocuments(query);
    res.json({ success: true, total, data: tasks, tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get single task
// @route GET /api/tasks/:id
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email avatar department')
      .populate('reporter', 'name email avatar')
      .populate('watchers', 'name email')
      .populate('project',  'name key')
      .populate('sprint',   'name status startDate endDate')
      .populate('parent',   'title taskKey');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update task
// @route PUT /api/tasks/:id
exports.updateTask = async (req, res) => {
  try {
    const oldTask = await Task.findById(req.params.id);
    if (!oldTask) return res.status(404).json({ success: false, message: 'Task not found' });

    if (req.body.status === 'done' && oldTask.status !== 'done')   req.body.completedDate = new Date();
    if (req.body.status && req.body.status !== 'done' && oldTask.status === 'done') req.body.completedDate = null;

    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email')
      .populate('project',  'name key');

    // Notify on assignee change
    if (req.body.assignee && req.body.assignee !== oldTask.assignee?.toString()) {
      await pushNotification({
        recipient: req.body.assignee,
        sender:    req.user.id,
        type:      'task_assigned',
        title:     'Task Assigned to You',
        message:   `Task "${task.title}" has been assigned to you`,
        link:      `/tasks/${task._id}`,
      });
    }

    try { getIO().to('admin').emit('task:updated', task); } catch {}
    if (task.assignee) {
      try { getIO().to(`user:${task.assignee._id}`).emit('task:updated', task); } catch {}
    }

    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update task status (drag & drop / quick update)
// @route PATCH /api/tasks/:id/status
exports.updateTaskStatus = async (req, res) => {
  try {
    const { status, order } = req.body;
    const update = { status };
    if (order !== undefined) update.order = order;
    if (status === 'done') update.completedDate = new Date();
    if (status !== 'done') update.completedDate = null;

    const task = await Task.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('assignee', 'name email avatar')
      .populate('project',  'name key');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Broadcast status change to admin room and assignee
    const payload = { task, statusChanged: true };
    try { getIO().to('admin').emit('task:statusChanged', payload); } catch {}
    if (task.assignee) {
      try { getIO().to(`user:${task.assignee._id}`).emit('task:statusChanged', payload); } catch {}
    }

    res.json({ success: true, task, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Delete task
// @route DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    try { getIO().to('admin').emit('task:deleted', { taskId: req.params.id }); } catch {}
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Log time on task
// @route POST /api/tasks/:id/log-time
exports.logTime = async (req, res) => {
  try {
    const { hours } = req.body;
    if (!hours || hours <= 0) return res.status(400).json({ success: false, message: 'Hours must be a positive number' });
    const task = await Task.findByIdAndUpdate(req.params.id, { $inc: { loggedHours: hours } }, { new: true });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  My tasks — ALL statuses (user can filter on the frontend)
// @route GET /api/tasks/my
exports.getMyTasks = async (req, res) => {
  try {
    const { status } = req.query; // optional filter
    const query = { assignee: req.user.id };
    if (status) query.status = status; // allow optional status filter from frontend

    const tasks = await Task.find(query)
      .populate('project', 'name key')
      .populate('sprint',  'name')
      .sort({ priority: -1, dueDate: 1 });

    res.json({ success: true, data: tasks, tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Assign task
// @route PATCH /api/tasks/:id/assign
exports.assignTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { assignee: req.body.assignee },
      { new: true }
    ).populate('assignee', 'name email avatar');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    if (req.body.assignee && req.body.assignee !== req.user.id.toString()) {
      await pushNotification({
        recipient: req.body.assignee,
        sender:    req.user.id,
        type:      'task_assigned',
        title:     'Task Assigned to You',
        message:   `Task "${task.title}" has been assigned to you`,
        link:      `/tasks/${task._id}`,
      });
    }

    try { getIO().to('admin').emit('task:updated', task); } catch {}
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

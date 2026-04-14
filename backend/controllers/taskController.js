const Task = require('../models/Task');
const Project = require('../models/Project');
const Notification = require('../models/Notification');

// Helper to generate task key (e.g. IFOA-12)
const generateTaskKey = async (projectId) => {
  const project = await Project.findById(projectId).select('key');
  const count = await Task.countDocuments({ project: projectId });
  return `${project.key}-${count + 1}`;
};

// @desc  Create task
// @route POST /api/tasks
exports.createTask = async (req, res) => {
  try {
    const taskKey = await generateTaskKey(req.body.project);
    const task = await Task.create({ ...req.body, reporter: req.user.id, taskKey });

    // Notify assignee
    if (req.body.assignee && req.body.assignee !== req.user.id.toString()) {
      await Notification.create({
        recipient: req.body.assignee,
        sender: req.user.id,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You have been assigned task: ${task.title}`,
        link: `/tasks/${task._id}`,
      });
    }
    await task.populate([{ path: 'assignee', select: 'name email avatar' }, { path: 'reporter', select: 'name email' }]);
    res.status(201).json({ success: true, task });
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
    if (project) query.project = project;
    if (sprint) query.sprint = sprint;
    if (assignee) query.assignee = assignee;
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (search) query.title = { $regex: search, $options: 'i' };

    const tasks = await Task.find(query)
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email')
      .populate('project', 'name key')
      .populate('sprint', 'name status')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ order: 1, createdAt: -1 });

    const total = await Task.countDocuments(query);
    res.json({ success: true, total, tasks });
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
      .populate('project', 'name key')
      .populate('sprint', 'name status startDate endDate')
      .populate('parent', 'title taskKey');
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

    // Set completedDate when status changes to done
    if (req.body.status === 'done' && oldTask.status !== 'done') req.body.completedDate = new Date();

    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email');

    // Notify assignee change
    if (req.body.assignee && req.body.assignee !== oldTask.assignee?.toString()) {
      await Notification.create({
        recipient: req.body.assignee,
        sender: req.user.id,
        type: 'task_assigned',
        title: 'Task Assigned to You',
        message: `Task "${task.title}" has been assigned to you`,
        link: `/tasks/${task._id}`,
      });
    }
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update task status (drag & drop)
// @route PATCH /api/tasks/:id/status
exports.updateTaskStatus = async (req, res) => {
  try {
    const { status, order } = req.body;
    const task = await Task.findByIdAndUpdate(req.params.id, { status, order }, { new: true });
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Delete task
// @route DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
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
    const task = await Task.findByIdAndUpdate(req.params.id, { $inc: { loggedHours: hours } }, { new: true });
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  My tasks
// @route GET /api/tasks/my-tasks
exports.getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ assignee: req.user.id, status: { $nin: ['done', 'cancelled'] } })
      .populate('project', 'name key')
      .populate('sprint', 'name')
      .sort({ priority: -1, dueDate: 1 });
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
// assign task
exports.assignTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, { assignee: req.body.assignee }, { new: true }).populate('assignee', 'name email avatar');
    res.json({ success: true, task });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
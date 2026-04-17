const Task = require('../models/Task');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Team = require('../models/Team');
const mongoose = require('mongoose');
const { getIO } = require('../socket');

// Helper to generate task key safely (e.g. PROJ-12)
const generateTaskKey = async (projectId) => {
  const project = await Project.findById(projectId).select('key name');
  if (!project) throw new Error('Project not found');
  const count = await Task.countDocuments({ project: projectId });
  const keyBase = project.key || project.name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6) || 'TASK';
  return `${keyBase}-${count + 1}`;
};

// Helper: push a notification via DB + WebSocket
const pushNotification = async ({ recipient, sender, type, title, message, link }) => {
  const notif = await Notification.create({ recipient, sender, type, title, message, link });
  try {
    getIO().to(`user:${recipient}`).emit('notification:new', notif);
  } catch { /* socket may not be up in tests */ }
  return notif;
};

const createTaskWithRetry = async (payload) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const taskKey = await generateTaskKey(payload.project);
      return await Task.create({ ...payload, taskKey });
    } catch (err) {
      if (err.code === 11000 && err.keyPattern?.taskKey && attempt < 2) continue;
      throw err;
    }
  }
  throw new Error('Unable to generate unique task key');
};

// Role hierarchy helpers
const isAdmin       = (user) => user.role === 'admin';
const isManagement  = (user) => user.role === 'manager';
const isTeamLead    = (user) => user.role === 'team_lead';
const isEmployee    = (user) => user.role === 'employee';

// Safely collect team member IDs even when legacy team docs are missing members arrays
const collectTeamMemberIds = (teams = []) => {
  return [...new Set(teams.flatMap((t) => (Array.isArray(t.members) ? t.members : []).map(String)))];
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// Can assign tasks to others (team lead, manager, admin)
const canAssignToOthers = (user) => ['admin', 'manager', 'team_lead'].includes(user.role);

// Get the team(s) a user belongs to
const getUserTeams = async (userId) => {
  return Team.find({ $or: [{ teamLead: userId }, { members: userId }] }).select('_id members teamLead');
};

// Check if two users are in the same team
const areSameTeam = async (userId1, userId2) => {
  const teams1 = await getUserTeams(userId1);
  const teams2 = await getUserTeams(userId2);
  const teamIds1 = new Set(teams1.map(t => String(t._id)));
  return teams2.some(t => teamIds1.has(String(t._id)));
};

// @desc  Create task
// @route POST /api/tasks
// Access: All authenticated users
// - Admin/Management: can assign to anyone, assign to all, assign to whole team
// - Team Lead: can assign to their team members only
// - User (Employee): can assign to themselves OR to same-team members
exports.createTask = async (req, res) => {
  try {
    const user = req.user;
    const normalizedBody = {
      ...req.body,
      assignee: req.body.assignee || undefined,
      team: req.body.team || undefined,
      sprint: req.body.sprint || undefined,
      parent: req.body.parent || undefined,
    };
    const isElevated = canAssignToOthers(user);
    const assignToAll = isElevated && (!!req.body.assignToAll || normalizedBody.assignee === '__all__');
    // NEW: assign to every member of a specific team
    const assignToTeam = isElevated && !!req.body.assignToTeam && !!normalizedBody.team;

    let assignee = normalizedBody.assignee;
    let teamId = normalizedBody.team || null;

    if (isEmployee(user)) {
      // Employees can self-assign OR assign to same-team members
      if (assignee && assignee !== String(user.id) && assignee !== '__all__') {
        const sameTeam = await areSameTeam(String(user.id), assignee);
        if (!sameTeam) {
          assignee = user.id; // force self-assign if not same team
        }
      }
    } else if (isTeamLead(user)) {
      // Team leads can only assign within their team
      if (assignee && assignee !== String(user.id) && assignee !== '__all__') {
        const myTeams = await getUserTeams(user.id);
        const myMemberIds = collectTeamMemberIds(myTeams);
        if (!myMemberIds.includes(String(assignee))) {
          return res.status(403).json({ success: false, message: 'Team leads can only assign tasks to their team members' });
        }
        // Automatically set team from team lead's team
        if (!teamId && myTeams.length > 0) {
          teamId = String(myTeams[0]._id);
        }
      }
    }

    // ── ASSIGN TO ENTIRE TEAM (all members + team lead) ──────────────────────
    if (assignToTeam) {
      const teamDoc = await Team.findById(teamId)
        .populate('members', '_id name')
        .populate('teamLead', '_id name');
      if (!teamDoc) {
        return res.status(404).json({ success: false, message: 'Team not found' });
      }

      // Collect unique member IDs: all members + team lead
      const memberIds = [
        ...new Set([
          ...(teamDoc.members || []).map(m => String(m._id || m)),
          teamDoc.teamLead ? String(teamDoc.teamLead._id || teamDoc.teamLead) : null,
        ].filter(Boolean))
      ];

      if (!memberIds.length) {
        return res.status(400).json({ success: false, message: 'Team has no members to assign to' });
      }

      const tasks = [];
      for (const memberId of memberIds) {
        const task = await createTaskWithRetry({
          ...normalizedBody,
          assignee: memberId,
          reporter: user.id,
          team: teamId,
          assignedByRole: user.role,
          assignToTeam: undefined,
          assignToAll: undefined,
        });
        tasks.push(task);
      }

      await Promise.all(tasks.map(t =>
        pushNotification({
          recipient: t.assignee,
          sender: user.id,
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `You have been assigned: ${t.title}`,
          link: `/tasks?taskId=${t._id}`,
        })
      ));

      const populated = await Task.find({ _id: { $in: tasks.map(t => t._id) } })
        .populate('assignee', 'name email avatar role')
        .populate('reporter', 'name email')
        .populate('project', 'name key')
        .populate('team', 'name color')
        .sort({ createdAt: -1 });

      try { getIO().to('admin').emit('task:created', populated[0]); } catch {}
      return res.status(201).json({ success: true, data: populated[0], task: populated[0], tasks: populated });
    }

    // ── ASSIGN TO ALL EMPLOYEES ───────────────────────────────────────────────
    if (assignToAll) {
      const recipients = await User.find({ role: 'employee', isActive: true }).select('_id');
      if (!recipients.length) {
        return res.status(400).json({ success: false, message: 'No active employees available for assign-to-all' });
      }

      const tasks = [];
      for (const recipient of recipients) {
        const task = await createTaskWithRetry({
          ...normalizedBody,
          assignee: recipient._id,
          reporter: user.id,
          team: teamId || undefined,
          assignedByRole: user.role,
          assignToAll: undefined,
        });
        tasks.push(task);
      }

      await Promise.all(
        tasks.map((createdTask) =>
          pushNotification({
            recipient: createdTask.assignee,
            sender: user.id,
            type: 'task_assigned',
            title: 'New Task Assigned',
            message: `You have been assigned task: ${createdTask.title}`,
            link: `/tasks?taskId=${createdTask._id}`,
          })
        )
      );

      const populated = await Task.find({ _id: { $in: tasks.map((t) => t._id) } })
        .populate('assignee', 'name email avatar role')
        .populate('reporter', 'name email')
        .populate('project', 'name key')
        .populate('team', 'name color')
        .sort({ createdAt: -1 });

      try { getIO().to('admin').emit('task:created', populated[0]); } catch {}
      return res.status(201).json({ success: true, data: populated[0], task: populated[0], tasks: populated });
    }

    // ── SINGLE TASK ───────────────────────────────────────────────────────────
    const task = await createTaskWithRetry({
      ...normalizedBody,
      assignee: assignee || undefined,
      reporter: user.id,
      team: teamId || undefined,
      assignedByRole: user.role,
      assignToAll: undefined,
      assignToTeam: undefined,
    });

    // Notify assignee if different from creator
    if (task.assignee && String(task.assignee) !== String(user.id)) {
      await pushNotification({
        recipient: task.assignee,
        sender:    user.id,
        type:      'task_assigned',
        title:     'New Task Assigned',
        message:   `You have been assigned task: ${task.title}`,
        link:      `/tasks?taskId=${task._id}`,
      });
    }

    // Notify management/team lead when employee raises a ticket
    if (isEmployee(user)) {
      const managers = await User.find({ role: { $in: ['admin', 'manager', 'team_lead'] }, isActive: true }).select('_id');
      await Promise.all(managers.map(m =>
        pushNotification({
          recipient: m._id,
          sender: user.id,
          type: 'task_assigned',
          title: 'New Ticket Raised',
          message: `${user.name} raised a ticket: ${task.title}`,
          link: `/tasks?taskId=${task._id}`,
        })
      ));
    }

    await task.populate([
      { path: 'assignee', select: 'name email avatar role' },
      { path: 'reporter', select: 'name email' },
      { path: 'project',  select: 'name key' },
      { path: 'team',     select: 'name color' },
    ]);

    try { getIO().to('admin').emit('task:created', task); } catch {}

    res.status(201).json({ success: true, data: task, task });
  } catch (err) {
    if (err.name === 'ValidationError' || err.name === 'CastError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get tasks (with filters, scoped by role)
// @route GET /api/tasks
// - Admin/Management: see ALL tasks across all projects
// - Team Lead: see tasks for their team's members only
// - User (Employee): see only tasks assigned to them
exports.getTasks = async (req, res) => {
  try {
    const { project, sprint, assignee, status, type, priority, search, page = 1, limit = 100 } = req.query;
    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, Number.parseInt(limit, 10) || 100));
    const query = {};
    if (project && isValidObjectId(project))  query.project  = project;
    if (sprint && isValidObjectId(sprint))    query.sprint   = sprint;
    if (assignee && isValidObjectId(assignee)) query.assignee = assignee;
    if (status)   query.status   = status;
    if (type)     query.type     = type;
    if (priority) query.priority = priority;
    if (search)   query.title    = { $regex: search, $options: 'i' };

    const user = req.user;

    if (isEmployee(user)) {
      // Users see ONLY tasks assigned to them or reported by them
      query.$or = [
        { assignee: user.id },
        { reporter: user.id },
      ];
    } else if (isTeamLead(user)) {
      // Team leads see all tasks assigned to their team members
      const myTeams = await getUserTeams(user.id);
      const myMemberIds = collectTeamMemberIds(myTeams);
      if (myMemberIds.length > 0) {
        const projectFilter = project ? [project] : undefined;
        if (projectFilter) {
          query.project = { $in: projectFilter };
          query.$or = [
            { assignee: { $in: myMemberIds } },
            { reporter: user.id },
          ];
        } else {
          query.$or = [
            { assignee: { $in: myMemberIds } },
            { reporter: user.id },
          ];
        }
      } else {
        query.$or = [{ assignee: user.id }, { reporter: user.id }];
      }
    }
    // admins and managers see everything — no extra filter

    const tasks = await Task.find(query)
      .populate('assignee', 'name email avatar role')
      .populate('reporter', 'name email')
      .populate('project',  'name key')
      .populate('sprint',   'name status')
      .populate('parent',   'title taskKey type')
      .populate('team',     'name color')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
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
      .populate('assignee', 'name email avatar department role')
      .populate('reporter', 'name email avatar')
      .populate('watchers', 'name email')
      .populate('project',  'name key')
      .populate('sprint',   'name status startDate endDate')
      .populate('parent',   'title taskKey')
      .populate('team',     'name color');
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

    const user = req.user;

    if (isEmployee(user)) {
      const isOwner = String(oldTask.assignee) === String(user.id) || String(oldTask.reporter) === String(user.id);
      if (!isOwner) return res.status(403).json({ success: false, message: 'Not authorized to update this task' });
      const allowedFields = ['status', 'loggedHours'];
      const filtered = {};
      allowedFields.forEach(f => { if (req.body[f] !== undefined) filtered[f] = req.body[f]; });
      req.body = filtered;
    } else if (isTeamLead(user)) {
      if (req.body.assignee && req.body.assignee !== String(oldTask.assignee)) {
        const myTeams = await getUserTeams(user.id);
        const myMemberIds = collectTeamMemberIds(myTeams);
        if (!myMemberIds.includes(String(req.body.assignee))) {
          return res.status(403).json({ success: false, message: 'Team leads can only assign within their team' });
        }
      }
    }

    if (req.body.status === 'done' && oldTask.status !== 'done')   req.body.completedDate = new Date();
    if (req.body.status && req.body.status !== 'done' && oldTask.status === 'done') req.body.completedDate = null;

    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('assignee', 'name email avatar role')
      .populate('reporter', 'name email')
      .populate('project',  'name key')
      .populate('team',     'name color');

    if (req.body.assignee && req.body.assignee !== oldTask.assignee?.toString()) {
      await pushNotification({
        recipient: req.body.assignee,
        sender:    user.id,
        type:      'task_assigned',
        title:     'Task Assigned to You',
        message:   `Task "${task.title}" has been assigned to you`,
        link:      `/tasks?taskId=${task._id}`,
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

    const existing = await Task.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Task not found' });

    const user = req.user;

    if (isEmployee(user)) {
      const isOwner = String(existing.assignee) === String(user.id) || String(existing.reporter) === String(user.id);
      if (!isOwner) return res.status(403).json({ success: false, message: 'Not authorized' });
    } else if (isTeamLead(user)) {
      const myTeams = await getUserTeams(user.id);
      const myMemberIds = collectTeamMemberIds(myTeams);
      const isOwner = String(existing.assignee) === String(user.id) ||
                      String(existing.reporter) === String(user.id) ||
                      myMemberIds.includes(String(existing.assignee));
      if (!isOwner) return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const update = { status };
    if (order !== undefined) update.order = order;
    if (status === 'done') update.completedDate = new Date();
    if (status !== 'done') update.completedDate = null;

    const task = await Task.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('assignee', 'name email avatar role')
      .populate('project',  'name key')
      .populate('team',     'name color');

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
// Access: Admin + Manager
exports.deleteTask = async (req, res) => {
  try {
    // Allow admin AND manager to delete tasks
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only managers and admins can delete tasks' });
    }
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

// @desc  My tasks — ALL statuses (for current user's personal board)
// @route GET /api/tasks/my
exports.getMyTasks = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {
      $or: [
        { assignee: req.user.id },
        { reporter: req.user.id },
      ]
    };
    if (status) query.status = status;

    const tasks = await Task.find(query)
      .populate('project', 'name key')
      .populate('sprint',  'name')
      .populate('parent',  'title taskKey type')
      .populate('team',    'name color')
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
    const user = req.user;
    const { assignee, assignToAll } = req.body;
    const baseTask = await Task.findById(req.params.id);
    if (!baseTask) return res.status(404).json({ success: false, message: 'Task not found' });

    if (isEmployee(user)) {
      if (!assignee) return res.status(400).json({ success: false, message: 'assignee is required' });
      const sameTeam = await areSameTeam(String(user.id), String(assignee));
      if (!sameTeam) {
        return res.status(403).json({ success: false, message: 'You can only assign tasks to your team members' });
      }
    }

    if (isTeamLead(user)) {
      if (assignee && assignee !== '__all__') {
        const myTeams = await getUserTeams(user.id);
        const myMemberIds = collectTeamMemberIds(myTeams);
        if (!myMemberIds.includes(String(assignee))) {
          return res.status(403).json({ success: false, message: 'Team leads can only assign tasks within their team' });
        }
      }
    }

    if ((assignToAll || assignee === '__all__') && !['admin', 'manager'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Only Management or Admin can assign to all employees' });
    }

    if (assignToAll || assignee === '__all__') {
      const recipients = await User.find({ role: 'employee', isActive: true }).select('_id');
      if (!recipients.length) {
        return res.status(400).json({ success: false, message: 'No active employees available for assign-to-all' });
      }

      const clones = [];
      for (const recipient of recipients) {
        if (String(baseTask.assignee || '') === String(recipient._id)) continue;
        const clone = await createTaskWithRetry({
          title: baseTask.title,
          description: baseTask.description,
          project: baseTask.project,
          sprint: baseTask.sprint,
          team: baseTask.team,
          type: baseTask.type,
          status: baseTask.status,
          priority: baseTask.priority,
          dueDate: baseTask.dueDate,
          parent: baseTask.parent,
          reporter: user.id,
          assignee: recipient._id,
          assignedByRole: user.role,
        });
        clones.push(clone);
      }

      await Promise.all(
        clones.map((clone) =>
          pushNotification({
            recipient: clone.assignee,
            sender: user.id,
            type: 'task_assigned',
            title: 'Task Assigned to You',
            message: `Task "${clone.title}" has been assigned to you`,
            link: `/tasks?taskId=${clone._id}`,
          })
        )
      );

      const populated = await Task.find({ _id: { $in: clones.map((c) => c._id) } })
        .populate('assignee', 'name email avatar role')
        .populate('project', 'name key')
        .populate('team', 'name color')
        .sort({ createdAt: -1 });

      try { getIO().to('admin').emit('task:updated', baseTask); } catch {}
      return res.json({ success: true, task: baseTask, tasks: populated, message: 'Assigned to all employees' });
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { assignee, assignedByRole: user.role },
      { new: true }
    ).populate('assignee', 'name email avatar role')
     .populate('team', 'name color');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    if (assignee && assignee !== user.id.toString()) {
      await pushNotification({
        recipient: assignee,
        sender:    user.id,
        type:      'task_assigned',
        title:     'Task Assigned to You',
        message:   `Task "${task.title}" has been assigned to you`,
        link:      `/tasks?taskId=${task._id}`,
      });
    }

    try { getIO().to('admin').emit('task:updated', task); } catch {}
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Assign or remove task from sprint
// @route PATCH /api/tasks/:id/sprint
exports.updateTaskSprint = async (req, res) => {
  try {
    const { sprintId } = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { sprint: sprintId || null },
      { new: true }
    )
      .populate('assignee', 'name email avatar role')
      .populate('project',  'name key')
      .populate('sprint',   'name status')
      .populate('team',     'name color');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    try { getIO().to('admin').emit('task:updated', task); } catch {}
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

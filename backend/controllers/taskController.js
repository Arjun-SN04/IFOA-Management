const Task = require('../models/Task');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Team = require('../models/Team');
const mongoose = require('mongoose');
const { getIO } = require('../socket');

// ── Helpers ───────────────────────────────────────────────────────────────────

const generateTaskKey = async (projectId) => {
  const project = await Project.findById(projectId).select('key name');
  if (!project) throw new Error('Project not found');
  const count = await Task.countDocuments({ project: projectId });
  const keyBase = project.key || project.name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6) || 'TASK';
  return `${keyBase}-${count + 1}`;
};

const pushNotification = async ({ recipient, sender, type, title, message, link }) => {
  const notif = await Notification.create({ recipient, sender, type, title, message, link });
  try { getIO().to(`user:${recipient}`).emit('notification:new', notif); } catch {}
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

// Role helpers
const isAdmin      = (u) => u.role === 'admin';
const isManager    = (u) => u.role === 'manager';
const isHR         = (u) => u.role === 'hr';
const isTeamLead   = (u) => u.role === 'team_lead';
const isEmployee   = (u) => u.role === 'employee';
// Elevated = can assign tasks to others
const isElevated   = (u) => ['admin', 'manager', 'hr', 'team_lead'].includes(u.role);
// Management = admin + manager + hr
const isManagement = (u) => ['admin', 'manager', 'hr'].includes(u.role);

const isValidObjectId = (v) => mongoose.Types.ObjectId.isValid(v);

const collectTeamMemberIds = (teams = []) =>
  [...new Set(teams.flatMap(t => (Array.isArray(t.members) ? t.members : []).map(String)))];

const getUserTeams = (userId) =>
  Team.find({ $or: [{ teamLead: userId }, { members: userId }] }).select('_id members teamLead');

const areSameTeam = async (uid1, uid2) => {
  const [t1, t2] = await Promise.all([getUserTeams(uid1), getUserTeams(uid2)]);
  const set1 = new Set(t1.map(t => String(t._id)));
  return t2.some(t => set1.has(String(t._id)));
};

const populateTask = (query) =>
  query
    .populate('assignee', 'name email avatar role')
    .populate('claimedBy', 'name email avatar role')
    .populate('reporter', 'name email')
    .populate('project', 'name key')
    .populate('sprint', 'name status')
    .populate('parent', 'title taskKey type')
    .populate('team', 'name color');

// ── Broadcast to a team room (all members + team lead) ───────────────────────
const broadcastToTeam = async (teamId, event, payload) => {
  try {
    const io = getIO();
    const team = await Team.findById(teamId).select('members teamLead');
    if (!team) return;
    const ids = [...new Set([
      ...(team.members || []).map(String),
      team.teamLead ? String(team.teamLead) : null,
    ].filter(Boolean))];
    ids.forEach(uid => io.to(`user:${uid}`).emit(event, payload));
    io.to('admin').emit(event, payload);
  } catch {}
};

// ── CREATE TASK ───────────────────────────────────────────────────────────────
// @route POST /api/tasks
exports.createTask = async (req, res) => {
  try {
    const user = req.user;
    const body = { ...req.body };

    // Clean empty strings
    ['assignee', 'team', 'sprint', 'parent', 'dueDate'].forEach(k => {
      if (!body[k]) delete body[k];
    });

    // ── ASSIGN TO ENTIRE TEAM as a SHARED task ────────────────────────────────
    // Only manager/admin can do this
    if (body.assignToTeam && body.team && isManagement(user)) {
      const teamDoc = await Team.findById(body.team)
        .populate('members', '_id name')
        .populate('teamLead', '_id name');
      if (!teamDoc) return res.status(404).json({ success: false, message: 'Team not found' });

      const memberIds = [
        ...new Set([
          ...(teamDoc.members || []).map(m => String(m._id || m)),
          teamDoc.teamLead ? String(teamDoc.teamLead._id || teamDoc.teamLead) : null,
        ].filter(Boolean))
      ];
      if (!memberIds.length)
        return res.status(400).json({ success: false, message: 'Team has no members' });

      // Create ONE shared task (isTeamTask: true, no assignee, no claimedBy)
      const sharedTask = await createTaskWithRetry({
        title: body.title,
        description: body.description,
        project: body.project,
        sprint: body.sprint,
        team: body.team,
        type: body.type || 'task',
        status: 'backlog',
        priority: body.priority || 'medium',
        dueDate: body.dueDate,
        parent: body.parent,
        storyPoints: body.storyPoints,
        reporter: user.id,
        assignedByRole: user.role,
        isTeamTask: true,
        claimedBy: null,
        claimedAt: null,
      });

      // Notify every team member
      await Promise.all(memberIds.map(memberId =>
        pushNotification({
          recipient: memberId,
          sender: user.id,
          type: 'task_assigned',
          title: 'New Team Task Assigned',
          message: `A new task was assigned to your team: ${sharedTask.title}`,
          link: `/tasks?taskId=${sharedTask._id}`,
        })
      ));

      await populateTask(Task.findById(sharedTask._id)).then(t => {
        broadcastToTeam(body.team, 'task:created', t);
      });

      const populated = await populateTask(Task.findById(sharedTask._id));
      return res.status(201).json({ success: true, data: populated, task: populated });
    }

    // ── ASSIGN TO ALL EMPLOYEES ───────────────────────────────────────────────
    if ((body.assignToAll || body.assignee === '__all__') && isManagement(user)) {
      const recipients = await User.find({ role: 'employee', isActive: true }).select('_id');
      if (!recipients.length)
        return res.status(400).json({ success: false, message: 'No active employees found' });

      const tasks = [];
      for (const r of recipients) {
        const t = await createTaskWithRetry({
          ...body, assignee: r._id, reporter: user.id, assignedByRole: user.role,
          assignToAll: undefined, assignee: r._id,
        });
        tasks.push(t);
      }

      await Promise.all(tasks.map(t =>
        pushNotification({
          recipient: t.assignee, sender: user.id, type: 'task_assigned',
          title: 'New Task Assigned', message: `You have been assigned: ${t.title}`,
          link: `/tasks?taskId=${t._id}`,
        })
      ));

      const populated = await populateTask(Task.find({ _id: { $in: tasks.map(t => t._id) } }));
      try { getIO().to('admin').emit('task:created', populated[0]); } catch {}
      return res.status(201).json({ success: true, data: populated[0], task: populated[0], tasks: populated });
    }

    // ── SINGLE TASK ───────────────────────────────────────────────────────────
    let { assignee } = body;

    // Employee: can only self-assign or assign to same-team member
    if (isEmployee(user)) {
      if (assignee && assignee !== String(user.id)) {
        const same = await areSameTeam(String(user.id), assignee);
        if (!same) assignee = user.id;
      }
      if (!assignee) assignee = user.id;
    }

    // Team lead: can only assign within their team
    if (isTeamLead(user) && assignee && assignee !== String(user.id)) {
      const myTeams = await getUserTeams(user.id);
      const memberIds = collectTeamMemberIds(myTeams);
      if (!memberIds.includes(String(assignee))) {
        return res.status(403).json({ success: false, message: 'Team leads can only assign tasks to their team members' });
      }
    }

    // HR restriction removed as per request: HR can now assign to all like managers

    const task = await createTaskWithRetry({
      ...body,
      assignee: assignee || undefined,
      reporter: user.id,
      assignedByRole: user.role,
      isTeamTask: false,
      assignToAll: undefined,
      assignToTeam: undefined,
    });

    // Notify assignee
    if (task.assignee && String(task.assignee) !== String(user.id)) {
      await pushNotification({
        recipient: task.assignee, sender: user.id, type: 'task_assigned',
        title: 'New Task Assigned', message: `You have been assigned: ${task.title}`,
        link: `/tasks?taskId=${task._id}`,
      });
    }

    // Notify management when employee/team_lead raises a ticket
    if (isEmployee(user) || isTeamLead(user)) {
      const managers = await User.find({ role: { $in: ['admin', 'manager', 'hr', 'team_lead'] }, isActive: true }).select('_id');
      await Promise.all(managers.map(m =>
        pushNotification({
          recipient: m._id, sender: user.id, type: 'task_assigned',
          title: 'New Ticket Raised', message: `${user.name} raised a ticket: ${task.title}`,
          link: `/tasks?taskId=${task._id}`,
        })
      ));
    }

    const populated = await populateTask(Task.findById(task._id));
    try { getIO().to('admin').emit('task:created', populated); } catch {}
    res.status(201).json({ success: true, data: populated, task: populated });
  } catch (err) {
    if (err.name === 'ValidationError' || err.name === 'CastError')
      return res.status(400).json({ success: false, message: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET TASKS ─────────────────────────────────────────────────────────────────
// @route GET /api/tasks
exports.getTasks = async (req, res) => {
  try {
    const { project, sprint, assignee, status, type, priority, search, page = 1, limit = 100 } = req.query;
    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
    const query = {};

    if (project && isValidObjectId(project))   query.project  = project;
    if (sprint && isValidObjectId(sprint))     query.sprint   = sprint;
    if (assignee && isValidObjectId(assignee)) query.assignee = assignee;
    if (status)   query.status   = status;
    if (type)     query.type     = type;
    if (priority) query.priority = priority;
    if (search)   query.title    = { $regex: search, $options: 'i' };

    const { team: teamFilter } = req.query;
    if (teamFilter && isValidObjectId(teamFilter)) query.team = teamFilter;

    const user = req.user;

    if (isEmployee(user)) {
      const myTeams = await getUserTeams(user.id);
      const myTeamIds = myTeams.map(t => String(t._id));
      query.$or = [
        { assignee: user.id, isTeamTask: false },
        { reporter: user.id, isTeamTask: false },
        { isTeamTask: true, team: { $in: myTeamIds }, $or: [{ claimedBy: null }, { claimedBy: user.id }] },
      ];
    } else if (isTeamLead(user)) {
      const myTeams = await getUserTeams(user.id);
      const myTeamIds = myTeams.map(t => String(t._id));
      const myMemberIds = collectTeamMemberIds(myTeams);
      query.$or = [
        { assignee: { $in: myMemberIds }, isTeamTask: false },
        { reporter: user.id },
        { isTeamTask: true, team: { $in: myTeamIds } },
      ];
    }
    // HR, admin, manager see everything

    const tasks = await populateTask(
      Task.find(query)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .sort({ order: 1, createdAt: -1 })
    );

    const total = await Task.countDocuments(query);
    res.json({ success: true, total, data: tasks, tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET MY TASKS (personal board) ────────────────────────────────────────────
// @route GET /api/tasks/my
exports.getMyTasks = async (req, res) => {
  try {
    const user = req.user;
    const { status } = req.query;
    const myTeams = await getUserTeams(user.id);
    const myTeamIds = myTeams.map(t => String(t._id));

    // Only return tasks where I am the ASSIGNEE (not just reporter).
    // This ensures tasks assigned to teammates do NOT show in the assigner's board.
    // Team tasks: show unclaimed pool tasks + tasks I claimed myself.
    const query = {
      $or: [
        { assignee: user.id, isTeamTask: false },
        { isTeamTask: true, team: { $in: myTeamIds }, $or: [{ claimedBy: null }, { claimedBy: user.id }] },
      ]
    };
    if (status) query.status = status;

    const tasks = await populateTask(
      Task.find(query).sort({ priority: -1, dueDate: 1 })
    );
    res.json({ success: true, data: tasks, tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET ASSIGNABLE USERS FOR TASK CREATION ─────────────────────────────────
// @route GET /api/tasks/assignable-users
exports.getAssignableUsers = async (req, res) => {
  try {
    const user = req.user;

    if (isManagement(user) || isHR(user)) {
      const users = await User.find({
        role: { $in: ['employee', 'team_lead'] },
        isActive: true,
      })
        .select('name email avatar role department')
        .sort({ name: 1 });
      return res.json({ success: true, users, data: users });
    }

    const myTeams = await Team.find({ $or: [{ teamLead: user.id }, { members: user.id }] })
      .select('members teamLead');

    const ids = new Set([String(user.id)]);
    myTeams.forEach((team) => {
      (team.members || []).forEach((memberId) => ids.add(String(memberId)));
      if (team.teamLead) ids.add(String(team.teamLead));
    });

    const users = await User.find({
      _id: { $in: Array.from(ids) },
      role: { $in: ['employee', 'team_lead'] },
      isActive: true,
    })
      .select('name email avatar role department')
      .sort({ name: 1 });

    res.json({ success: true, users, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET SINGLE TASK ───────────────────────────────────────────────────────────
// @route GET /api/tasks/:id
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email avatar department role')
      .populate('claimedBy', 'name email avatar role')
      .populate('reporter', 'name email avatar')
      .populate('watchers', 'name email')
      .populate('project', 'name key')
      .populate('sprint', 'name status startDate endDate')
      .populate('parent', 'title taskKey')
      .populate('team', 'name color');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE TASK ───────────────────────────────────────────────────────────────
// @route PUT /api/tasks/:id
exports.updateTask = async (req, res) => {
  try {
    const oldTask = await Task.findById(req.params.id);
    if (!oldTask) return res.status(404).json({ success: false, message: 'Task not found' });

    const user = req.user;

    if (isEmployee(user)) {
      const isOwner = String(oldTask.assignee) === String(user.id)
        || String(oldTask.reporter) === String(user.id)
        || String(oldTask.claimedBy) === String(user.id);
      if (!isOwner) return res.status(403).json({ success: false, message: 'Not authorized to update this task' });
      const allowed = ['status', 'loggedHours'];
      const filtered = {};
      allowed.forEach(f => { if (req.body[f] !== undefined) filtered[f] = req.body[f]; });
      req.body = filtered;
    } else if (isTeamLead(user)) {
      if (req.body.assignee && req.body.assignee !== String(oldTask.assignee)) {
        const myTeams = await getUserTeams(user.id);
        const ids = collectTeamMemberIds(myTeams);
        if (!ids.includes(String(req.body.assignee)))
          return res.status(403).json({ success: false, message: 'Team leads can only reassign within their team' });
      }
    }

    if (req.body.status === 'done' && oldTask.status !== 'done')   req.body.completedDate = new Date();
    if (req.body.status && req.body.status !== 'done' && oldTask.status === 'done') req.body.completedDate = null;

    const task = await populateTask(
      Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    );

    if (req.body.assignee && req.body.assignee !== String(oldTask.assignee)) {
      await pushNotification({
        recipient: req.body.assignee, sender: user.id, type: 'task_assigned',
        title: 'Task Assigned to You', message: `"${task.title}" has been assigned to you`,
        link: `/tasks?taskId=${task._id}`,
      });
    }

    try { getIO().to('admin').emit('task:updated', task); } catch {}
    if (task.team) broadcastToTeam(String(task.team._id || task.team), 'task:updated', task);
    else if (task.assignee) {
      try { getIO().to(`user:${task.assignee._id}`).emit('task:updated', task); } catch {}
    }

    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE TASK STATUS (drag & drop / manual) ─────────────────────────────────
// @route PATCH /api/tasks/:id/status
//
// Status pipeline: backlog → todo → in-progress → in-review → done
// RULE: Non-admin/non-manager users can only move tasks ONE step at a time
//       (one forward or one backward). Admin and Manager can jump freely.
const STATUS_ORDER = ['backlog', 'todo', 'in-progress', 'in-review', 'done'];

const isAdjacentStatus = (from, to) => {
  const fromIdx = STATUS_ORDER.indexOf(from);
  const toIdx   = STATUS_ORDER.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return false;
  return Math.abs(toIdx - fromIdx) === 1;
};

exports.updateTaskStatus = async (req, res) => {
  try {
    const { status, order } = req.body;
    const existing = await Task.findById(req.params.id).populate('team', '_id name');
    if (!existing) return res.status(404).json({ success: false, message: 'Task not found' });

    const user = req.user;

    // ── STEP-BY-STEP ENFORCEMENT ──────────────────────────────────────────────
    // Admin and Manager can jump freely; everyone else must move one step at a time.
    if (!isManagement(user) && status !== existing.status) {
      if (!isAdjacentStatus(existing.status, status)) {
        const fromLabel = existing.status.replace(/-/g, ' ');
        const toLabel   = status.replace(/-/g, ' ');
        return res.status(400).json({
          success: false,
          message: `Tasks must move one step at a time. Cannot move from "${fromLabel}" to "${toLabel}" directly.`,
        });
      }
    }

    // ── SHARED TEAM TASK CLAIM LOGIC ──────────────────────────────────────────
    if (existing.isTeamTask) {
      const myTeams = await getUserTeams(user.id);
      const myTeamIds = myTeams.map(t => String(t._id));
      const taskTeamId = String(existing.team?._id || existing.team || '');
      const isMember = myTeamIds.includes(taskTeamId) || isManagement(user) || isHR(user);

      if (!isMember)
        return res.status(403).json({ success: false, message: 'You are not a member of this task\'s team' });

      // Moving from backlog → any active status = CLAIM the task
      if (existing.status === 'backlog' && status !== 'backlog') {
        if (existing.claimedBy && String(existing.claimedBy) !== String(user.id) && !isManagement(user)) {
          return res.status(409).json({
            success: false,
            message: 'This task has already been claimed by another team member',
          });
        }

        const update = { status, claimedBy: user.id, claimedAt: new Date() };
        if (order !== undefined) update.order = order;
        if (status === 'done') update.completedDate = new Date();

        const task = await populateTask(
          Task.findByIdAndUpdate(req.params.id, update, { new: true })
        );

        const teamId = String(task.team?._id || task.team);
        broadcastToTeam(teamId, 'task:claimed', { task, claimedBy: user.id });

        const teamDoc = await Team.findById(teamId).select('members teamLead');
        const othersToNotify = [
          ...(teamDoc?.members || []).map(String),
          teamDoc?.teamLead ? String(teamDoc.teamLead) : null,
        ].filter(id => id && id !== String(user.id));

        await Promise.all(othersToNotify.map(uid =>
          pushNotification({
            recipient: uid, sender: user.id, type: 'task_assigned',
            title: 'Team Task Claimed',
            message: `${user.name} has picked up: "${task.title}"`,
            link: `/tasks?taskId=${task._id}`,
          })
        ));

        return res.json({ success: true, task, claimed: true });
      }

      if (existing.claimedBy && String(existing.claimedBy) !== String(user.id) && !isManagement(user)) {
        return res.status(403).json({ success: false, message: 'Only the team member who claimed this task can update its status' });
      }
    } else {
      // Personal task auth
      if (isEmployee(user)) {
        const isOwner = String(existing.assignee) === String(user.id)
          || String(existing.reporter) === String(user.id);
        if (!isOwner) return res.status(403).json({ success: false, message: 'Not authorized' });
      } else if (isTeamLead(user)) {
        const myTeams = await getUserTeams(user.id);
        const ids = collectTeamMemberIds(myTeams);
        const isOwner = String(existing.assignee) === String(user.id)
          || String(existing.reporter) === String(user.id)
          || ids.includes(String(existing.assignee));
        if (!isOwner) return res.status(403).json({ success: false, message: 'Not authorized' });
      }
    }

    const update = { status };
    if (order !== undefined) update.order = order;
    if (status === 'done') update.completedDate = new Date();
    if (status !== 'done') update.completedDate = null;

    const task = await populateTask(
      Task.findByIdAndUpdate(req.params.id, update, { new: true })
    );

    const payload = { task, statusChanged: true };
    try { getIO().to('admin').emit('task:statusChanged', payload); } catch {}
    if (task.team) broadcastToTeam(String(task.team._id || task.team), 'task:statusChanged', payload);
    else if (task.assignee) {
      try { getIO().to(`user:${task.assignee._id}`).emit('task:statusChanged', payload); } catch {}
    }

    res.json({ success: true, task, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE TASK ───────────────────────────────────────────────────────────────
// @route DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const user = req.user;

    // Managers and admins can delete anything
    if (['admin', 'manager'].includes(user.role)) {
      await Task.findByIdAndDelete(req.params.id);
      try { getIO().to('admin').emit('task:deleted', { taskId: req.params.id }); } catch {}
      if (task.team) broadcastToTeam(String(task.team), 'task:deleted', { taskId: req.params.id });
      return res.json({ success: true, message: 'Task deleted' });
    }

    // Employees/team leads can delete their own personal (non-team) tasks
    if (!task.isTeamTask) {
      const isOwner = String(task.assignee) === String(user.id)
        || String(task.reporter) === String(user.id);
      if (!isOwner) {
        return res.status(403).json({ success: false, message: 'You can only delete tasks you created or are assigned to' });
      }
      await Task.findByIdAndDelete(req.params.id);
      try { getIO().to(`user:${user.id}`).emit('task:deleted', { taskId: req.params.id }); } catch {}
      return res.json({ success: true, message: 'Task deleted' });
    }

    return res.status(403).json({ success: false, message: 'Team tasks can only be deleted by managers or admins' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ── LOG TIME ──────────────────────────────────────────────────────────────────
// @route POST /api/tasks/:id/log-time
exports.logTime = async (req, res) => {
  try {
    const { hours } = req.body;
    if (!hours || hours <= 0) return res.status(400).json({ success: false, message: 'Hours must be positive' });

    const existing = await Task.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Task not found' });

    const user = req.user;
    if (!isManagement(user)) {
      const isOwner = String(existing.assignee) === String(user.id)
        || String(existing.reporter) === String(user.id)
        || String(existing.claimedBy) === String(user.id);
      if (!isOwner) return res.status(403).json({ success: false, message: 'Not authorized to log time on this task' });
    }

    const task = await Task.findByIdAndUpdate(req.params.id, { $inc: { loggedHours: hours } }, { new: true });
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── ASSIGN TASK ───────────────────────────────────────────────────────────────
// @route PATCH /api/tasks/:id/assign
exports.assignTask = async (req, res) => {
  try {
    const user = req.user;
    const { assignee } = req.body;
    const baseTask = await Task.findById(req.params.id);
    if (!baseTask) return res.status(404).json({ success: false, message: 'Task not found' });

    if (isEmployee(user)) {
      const same = await areSameTeam(String(user.id), String(assignee));
      if (!same) return res.status(403).json({ success: false, message: 'You can only assign tasks to your team members' });
    }

    if (isHR(user)) {
      return res.status(403).json({ success: false, message: 'HR cannot reassign tasks' });
    }

    if (isTeamLead(user) && assignee && assignee !== '__all__') {
      const myTeams = await getUserTeams(user.id);
      const ids = collectTeamMemberIds(myTeams);
      if (!ids.includes(String(assignee)))
        return res.status(403).json({ success: false, message: 'Team leads can only assign within their team' });
    }

    const task = await populateTask(
      Task.findByIdAndUpdate(req.params.id, { assignee, assignedByRole: user.role }, { new: true })
    );
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    if (assignee && assignee !== String(user.id)) {
      await pushNotification({
        recipient: assignee, sender: user.id, type: 'task_assigned',
        title: 'Task Assigned to You', message: `"${task.title}" has been assigned to you`,
        link: `/tasks?taskId=${task._id}`,
      });
    }

    try { getIO().to('admin').emit('task:updated', task); } catch {}
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE SPRINT ─────────────────────────────────────────────────────────────
// @route PATCH /api/tasks/:id/sprint
exports.updateTaskSprint = async (req, res) => {
  try {
    const { sprintId } = req.body;
    const user = req.user;

    const existing = await Task.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Task not found' });

    // Authorization: only elevated roles (admin/manager/hr/team_lead) or the task
    // owner (reporter/assignee/claimedBy) may move a task in/out of a sprint.
    if (!isElevated(user)) {
      const isOwner = String(existing.assignee) === String(user.id)
        || String(existing.reporter) === String(user.id)
        || String(existing.claimedBy) === String(user.id);
      if (!isOwner) return res.status(403).json({ success: false, message: 'Not authorized to change this task\'s sprint' });
    }

    // Sprints are global — a task from any project may join any sprint.
    if (sprintId) {
      if (!isValidObjectId(sprintId)) return res.status(400).json({ success: false, message: 'Invalid sprint id' });
      const Sprint = require('../models/Sprint');
      const sprint = await Sprint.findById(sprintId).select('_id');
      if (!sprint) return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    // Jira-style status transition:
    //   backlog task → sprint  ⇒ becomes 'todo' (committed to the sprint)
    //   task → backlog (removed from sprint) ⇒ reset to 'backlog'
    const update = { sprint: sprintId || null };
    if (sprintId && existing.status === 'backlog') update.status = 'todo';
    if (!sprintId) { update.status = 'backlog'; update.completedDate = null; }

    const task = await populateTask(
      Task.findByIdAndUpdate(req.params.id, update, { new: true })
    );
    try { getIO().to('admin').emit('task:updated', task); } catch {}
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

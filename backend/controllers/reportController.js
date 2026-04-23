const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Leave = require('../models/Leave');
const Sprint = require('../models/Sprint');

// @desc  Admin dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalProjects, totalTasks, pendingLeaves] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Project.countDocuments({ isArchived: false }),
      Task.countDocuments(),
      Leave.countDocuments({ status: 'pending' }),
    ]);

    const tasksByStatus = await Task.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const projectsByStatus = await Project.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Recent activity — last 5 tasks updated
    const recentTasks = await Task.find()
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('assignee', 'name avatar')
      .populate('project', 'name key');

    res.json({
      success: true,
      data: {
        totalUsers, totalProjects, totalTasks, pendingLeaves,
        tasksByStatus, projectsByStatus, recentTasks
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Project-level report
exports.getProjectReport = async (req, res) => {
  try {
    // FIX: members is an array of ObjectIds, not objects — remove .user populate
    const projects = await Project.find({ isArchived: false })
      .populate('members', 'name')
      .populate('lead', 'name');

    const report = await Promise.all(projects.map(async (p) => {
      const tasks = await Task.find({ project: p._id });
      const done = tasks.filter(t => t.status === 'done').length;
      return {
        project: p.name,
        key: p.key,
        status: p.status,
        lead: p.lead?.name || 'N/A',
        totalTasks: tasks.length,
        completedTasks: done,
        completionRate: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
        members: p.members.length,
      };
    }));

    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  User productivity report
exports.getUserReport = async (req, res) => {
  try {
    // Only include task-doing roles — exclude manager, hr, admin
    const users = await User.find({ isActive: true, role: { $in: ['employee', 'team_lead'] } }).select('name email role department');
    const report = await Promise.all(users.map(async (u) => {
      const assigned = await Task.countDocuments({ assignee: u._id });
      const completed = await Task.countDocuments({ assignee: u._id, status: 'done' });
      // FIX: was 'in_progress' (underscore) — Task model uses 'in-progress' (hyphen)
      const inProgress = await Task.countDocuments({ assignee: u._id, status: 'in-progress' });
      return {
        name: u.name, email: u.email, role: u.role, department: u.department,
        assigned, completed, inProgress,
        completionRate: assigned ? Math.round((completed / assigned) * 100) : 0
      };
    }));
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Leave summary report
exports.getLeaveReport = async (req, res) => {
  try {
    const leaveStats = await Leave.aggregate([
      { $group: { _id: { status: '$status' }, count: { $sum: 1 } } }
    ]);

    const pendingLeaves = await Leave.find({ status: 'pending' })
      .populate('employee', 'name email department')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { leaveStats, pendingLeaves } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Sprint velocity report
exports.getSprintReport = async (req, res) => {
  try {
    const sprints = await Sprint.find({ status: 'completed' })
      .populate('project', 'name key')
      .sort({ endDate: -1 })
      .limit(10);

    const report = await Promise.all(sprints.map(async (s) => {
      const tasks = await Task.find({ sprint: s._id });
      const completed = tasks.filter(t => t.status === 'done');
      const velocity = completed.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      return {
        sprint: s.name,
        project: s.project?.name || 'N/A',
        totalTasks: tasks.length,
        completedTasks: completed.length,
        velocity
      };
    }));

    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

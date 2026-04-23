const DailyTaskEntry = require('../models/DailyTaskEntry');
const DailyTaskSettings = require('../models/DailyTaskSettings');
const User = require('../models/User');

// ── Helpers ───────────────────────────────────────────────────────────────────
function startOfDay(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function endOfDay(d) {
  const dt = new Date(d);
  dt.setHours(23, 59, 59, 999);
  return dt;
}

// ── Auto-cleanup: remove previous day entries, keep only current day ─────────
async function pruneOldEntries() {
  const today = startOfDay(new Date());
  await DailyTaskEntry.deleteMany({ date: { $lt: today } });
}

// ── Employee: submit today's tasks ────────────────────────────────────────────
// POST /api/daily-tasks/submit
// Any employee can submit, regardless of isRequired setting
exports.submitDailyTasks = async (req, res) => {
  try {
    await pruneOldEntries();

    const { tasks, notes } = req.body;
    const cleanedTasks = Array.isArray(tasks)
      ? tasks.map(t => (typeof t === 'string' ? t.trim() : '')).filter(Boolean)
      : [];

    if (cleanedTasks.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide at least one task.' });
    }

    const today = startOfDay(new Date());

    // Upsert: one entry per employee per day
    const entry = await DailyTaskEntry.findOneAndUpdate(
      { employee: req.user.id, date: today },
      { tasks: cleanedTasks, notes: notes || '', submittedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('employee', 'name email department designation');

    res.status(200).json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Employee: get own entry for today ─────────────────────────────────────────
// GET /api/daily-tasks/my-today
exports.getMyToday = async (req, res) => {
  try {
    const today = startOfDay(new Date());
    const entry = await DailyTaskEntry.findOne({ employee: req.user.id, date: today });
    res.json({ success: true, entry: entry || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Employee: check if they are required to submit + today's status ───────────
// GET /api/daily-tasks/my-status
exports.getMyStatus = async (req, res) => {
  try {
    const setting = await DailyTaskSettings.findOne({ employee: req.user.id, isRequired: true });
    const today = startOfDay(new Date());
    const todayEntry = await DailyTaskEntry.findOne({ employee: req.user.id, date: today });

    res.json({
      success: true,
      isRequired: !!setting,
      submittedToday: !!todayEntry,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Management: get all entries for today ────────────────────────────────────
// GET /api/daily-tasks/admin/all
exports.adminGetAllEntries = async (req, res) => {
  try {
    await pruneOldEntries();
    const today = startOfDay(new Date());

    const entries = await DailyTaskEntry.find({ date: { $gte: today } })
      .populate('employee', 'name email department designation avatar employeeId')
      .sort({ submittedAt: -1 });

    res.json({ success: true, entries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Management: get all employees with their isRequired flag ─────────────────
// GET /api/daily-tasks/admin/settings
exports.adminGetSettings = async (req, res) => {
  try {
    const [allUsers, settings] = await Promise.all([
      User.find({ isActive: true, role: { $in: ['employee', 'team_lead'] } })
        .select('name email department designation avatar employeeId role'),
      DailyTaskSettings.find({ isRequired: true }).select('employee'),
    ]);
    const requiredIds = new Set(settings.map(s => s.employee.toString()));
    const result = allUsers.map(u => ({ ...u.toObject(), isRequired: requiredIds.has(u._id.toString()) }));
    res.json({ success: true, users: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Management: toggle requirement for a single employee ─────────────────────
// PATCH /api/daily-tasks/admin/settings/:userId
exports.adminToggleEmployee = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isRequired } = req.body;

    if (isRequired) {
      await DailyTaskSettings.findOneAndUpdate(
        { employee: userId },
        { isRequired: true, enabledBy: req.user.id, enabledAt: new Date() },
        { upsert: true, new: true }
      );
    } else {
      await DailyTaskSettings.findOneAndDelete({ employee: userId });
    }

    res.json({ success: true, userId, isRequired: !!isRequired });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Management: enable/disable for ALL employees at once ─────────────────────
// POST /api/daily-tasks/admin/settings/bulk
exports.adminBulkToggle = async (req, res) => {
  try {
    const { isRequired } = req.body;
    const employees = await User.find({ isActive: true, role: { $in: ['employee', 'team_lead'] } }).select('_id');
    const ids = employees.map(u => u._id);

    if (isRequired) {
      const ops = ids.map(id => ({
        updateOne: {
          filter: { employee: id },
          update: { $set: { isRequired: true, enabledBy: req.user.id, enabledAt: new Date() } },
          upsert: true,
        },
      }));
      await DailyTaskSettings.bulkWrite(ops);
    } else {
      await DailyTaskSettings.deleteMany({ employee: { $in: ids } });
    }

    res.json({ success: true, isRequired, count: ids.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Management: enable/disable for selected employees ────────────────────────
// POST /api/daily-tasks/admin/settings/selected
exports.adminSetSelected = async (req, res) => {
  try {
    const { userIds, isRequired = true } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide at least one employee.' });
    }

    const employees = await User.find({
      _id: { $in: userIds },
      role: { $in: ['employee', 'team_lead'] },
      isActive: true,
    }).select('_id');

    const validIds = employees.map(u => u._id);

    if (!validIds.length) {
      return res.status(404).json({ success: false, message: 'No active employees found for the selected users.' });
    }

    if (isRequired) {
      const now = new Date();
      const ops = validIds.map(id => ({
        updateOne: {
          filter: { employee: id },
          update: { $set: { isRequired: true, enabledBy: req.user.id, enabledAt: now } },
          upsert: true,
        },
      }));
      await DailyTaskSettings.bulkWrite(ops);
    } else {
      await DailyTaskSettings.deleteMany({ employee: { $in: validIds } });
    }

    res.json({ success: true, isRequired: !!isRequired, count: validIds.length, userIds: validIds });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint' },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }, // which team this task belongs to
  type: { type: String, enum: ['story', 'bug', 'task', 'epic', 'subtask', 'improvement'], default: 'task' },
  status: { type: String, enum: ['backlog', 'todo', 'in-progress', 'in-review', 'testing', 'done', 'cancelled'], default: 'backlog' },
  priority: { type: String, enum: ['lowest', 'low', 'medium', 'high', 'critical'], default: 'medium' },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // for personal tasks: the assigned person
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  watchers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' }, // for subtasks
  storyPoints: { type: Number, default: 0 },
  dueDate: { type: Date },
  startDate: { type: Date },
  completedDate: { type: Date },
  estimatedHours: { type: Number, default: 0 },
  loggedHours: { type: Number, default: 0 },
  labels: [{ type: String }],
  attachments: [{
    filename: String,
    url: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  }],
  taskKey: { type: String, unique: true }, // e.g. IFOA-101
  order: { type: Number, default: 0 }, // for board ordering
  assignedByRole: { type: String, enum: ['admin', 'hr', 'manager', 'team_lead', 'employee'] },

  // ── Shared team task fields ────────────────────────────────────────────────
  // isTeamTask = true  → single task shared across all team members (not per-person copies)
  // claimedBy         → set when a team member moves it from backlog→todo (claims it)
  // claimedAt         → timestamp of claim
  isTeamTask: { type: Boolean, default: false },
  claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  claimedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);

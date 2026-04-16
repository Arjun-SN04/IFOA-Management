const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint' },
  type: { type: String, enum: ['story', 'bug', 'task', 'epic', 'subtask', 'improvement'], default: 'task' },
  status: { type: String, enum: ['backlog', 'todo', 'in-progress', 'in-review', 'testing', 'done', 'blocked', 'cancelled'], default: 'todo' },
  priority: { type: String, enum: ['lowest', 'low', 'medium', 'high', 'critical'], default: 'medium' },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);

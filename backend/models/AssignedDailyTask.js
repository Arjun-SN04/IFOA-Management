const mongoose = require('mongoose');

/**
 * AssignedDailyTask — a task assigned by HR/Manager to a specific employee or entire team.
 * Employees see these as "tasks assigned to me". HR & manager see all of them in a shared view.
 * Changes made by either HR or Manager are immediately visible to the other.
 */
const assignedDailyTaskSchema = new mongoose.Schema({
  title:        { type: String, required: true, trim: true },
  description:  { type: String, trim: true },
  assignedTo:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },   // null = team-wide
  assignedTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },   // null = individual
  assignedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  priority:     { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  dueDate:      { type: Date },
  status:       { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
  date:         { type: Date, required: true }, // the day this task is for
  completedAt:  { type: Date },
  completedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

assignedDailyTaskSchema.index({ assignedTo: 1, date: 1 });
assignedDailyTaskSchema.index({ assignedTeam: 1, date: 1 });
assignedDailyTaskSchema.index({ assignedBy: 1 });

module.exports = mongoose.model('AssignedDailyTask', assignedDailyTaskSchema);

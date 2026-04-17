const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  key:  { type: String, required: true, unique: true, uppercase: true, trim: true }, // e.g. "IFOA"
  description: { type: String },
  status: { type: String, enum: ['planning', 'active', 'on-hold', 'completed', 'cancelled'], default: 'planning' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  startDate: { type: Date },
  endDate: { type: Date },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }], // multiple teams can work on one project
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  category: { type: String, enum: ['software', 'marketing', 'operations', 'hr', 'finance', 'other'], default: 'software' },
  repository: { type: String }, // GitHub/GitLab link
  isArchived: { type: Boolean, default: false },
  progress: { type: Number, default: 0, min: 0, max: 100 },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);


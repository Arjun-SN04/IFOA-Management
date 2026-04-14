const mongoose = require('mongoose');

const sprintSchema = new mongoose.Schema({
  name: { type: String, required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  goal: { type: String },
  status: { type: String, enum: ['planned', 'active', 'completed'], default: 'planned' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  velocity: { type: Number, default: 0 }, // story points completed
  capacity: { type: Number, default: 0 }, // total story points planned
}, { timestamps: true });

module.exports = mongoose.model('Sprint', sprintSchema);

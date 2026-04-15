const mongoose = require('mongoose');

const leaveSettingsSchema = new mongoose.Schema({
  resetDayOfMonth: { type: Number, min: 1, max: 28, default: 1 },
  lastResetMonthKey: { type: String, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('LeaveSettings', leaveSettingsSchema);
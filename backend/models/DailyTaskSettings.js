const mongoose = require('mongoose');

// Stores which employees are required to submit daily task entries
const dailyTaskSettingsSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  isRequired: { type: Boolean, default: true },
  enabledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  enabledAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('DailyTaskSettings', dailyTaskSettingsSchema);

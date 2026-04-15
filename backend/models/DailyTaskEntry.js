const mongoose = require('mongoose');

const dailyTaskEntrySchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  tasks: [{ type: String, required: true, trim: true }],
  notes: { type: String, trim: true },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Unique entry per employee per day
dailyTaskEntrySchema.index({ employee: 1, date: 1 }, { unique: true });
// Hard auto-expiry so only latest day data remains.
dailyTaskEntrySchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

module.exports = mongoose.model('DailyTaskEntry', dailyTaskEntrySchema);

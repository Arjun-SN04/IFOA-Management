const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  audience: { type: String, enum: ['all', 'managers', 'employees', 'department'], default: 'all' },
  department: { type: String }, // if audience === 'department'
  isPinned: { type: Boolean, default: false },
  expiresAt: { type: Date },
  attachments: [{ filename: String, url: String }],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);

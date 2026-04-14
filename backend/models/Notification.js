const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: [
      'task_assigned', 'task_updated', 'task_commented', 'task_due',
      'leave_applied', 'leave_approved', 'leave_rejected',
      'project_added', 'project_updated',
      'mention', 'announcement', 'sprint_started', 'sprint_ended',
      'deadline_reminder'
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String }, // frontend route to redirect
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);

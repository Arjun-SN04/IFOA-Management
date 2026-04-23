const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalDays: { type: Number, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  reviewComment: { type: String },
  approvalFlow: {
    type: String,
    enum: ['employee_request', 'manager_request', 'admin_created'],
    default: 'employee_request',
  },
  managerDecision: {
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewComment: { type: String },
  },
  hrDecision: {
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewComment: { type: String },
  },
  isHalfDay: { type: Boolean, default: false },
  halfDaySession: { type: String, enum: ['morning', 'afternoon'] },
  attachments: [{ filename: String, url: String }],
  handoverNote: { type: String }, // task handover during leave
  emergencyContact: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Leave', leaveSchema);

const mongoose = require('mongoose');

const nocSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accessoryName: { type: String, required: true, trim: true },
  serialNumber: { type: String, trim: true },
  issueType: { type: String, enum: ['broken', 'damaged', 'missing', 'other'], default: 'damaged' },
  description: { type: String, required: true, trim: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  hrReviewComment: { type: String, trim: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('NOC', nocSchema);

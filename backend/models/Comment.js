const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }, // for threaded replies
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isEdited: { type: Boolean, default: false },
  attachments: [{ filename: String, url: String }],
}, { timestamps: true });

module.exports = mongoose.model('Comment', commentSchema);

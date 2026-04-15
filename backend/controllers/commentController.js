const Comment = require('../models/Comment');
const Task = require('../models/Task');
const { createAndEmit } = require('./notificationController');

// @desc  Add comment to task
// @route POST /api/comments
exports.addComment = async (req, res) => {
  try {
    const { content, task, parentComment, mentions } = req.body;
    const comment = await Comment.create({ content, task, author: req.user.id, parentComment, mentions });
    await comment.populate('author', 'name email avatar');

    // Notify mentioned users
    if (mentions && mentions.length) {
      const uniqueMentions = [...new Set(mentions.map(String))].filter(uid => uid !== req.user.id);
      await Promise.all(
        uniqueMentions.map((uid) =>
          createAndEmit({
            recipient: uid,
            sender: req.user.id,
            type: 'mention',
            title: 'You were mentioned',
            message: `${req.user.name} mentioned you in a comment`,
            link: `/tasks/${task}`,
          })
        )
      );
    }

    // Notify task watchers/assignee
    const taskDoc = await Task.findById(task).populate('assignee watchers');
    const toNotify = new Set();
    if (taskDoc.assignee && taskDoc.assignee._id.toString() !== req.user.id) toNotify.add(taskDoc.assignee._id.toString());
    taskDoc.watchers.forEach(w => { if (w._id.toString() !== req.user.id) toNotify.add(w._id.toString()); });
    const watcherNotifs = [...toNotify];
    if (watcherNotifs.length) {
      await Promise.all(
        watcherNotifs.map((uid) =>
          createAndEmit({
            recipient: uid,
            sender: req.user.id,
            type: 'task_commented',
            title: 'New Comment',
            message: `${req.user.name} commented on task: ${taskDoc.title}`,
            link: `/tasks/${task}`,
          })
        )
      );
    }

    res.status(201).json({ success: true, comment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get comments for a task
// @route GET /api/comments?task=:id
exports.getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ task: req.query.task, parentComment: null })
      .populate('author', 'name email avatar')
      .populate({ path: 'mentions', select: 'name email' })
      .sort({ createdAt: 1 });

    // Attach replies
    const withReplies = await Promise.all(comments.map(async c => {
      const replies = await Comment.find({ parentComment: c._id }).populate('author', 'name email avatar').sort({ createdAt: 1 });
      return { ...c.toObject(), replies };
    }));
    res.json({ success: true, comments: withReplies });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update comment
// @route PUT /api/comments/:id
exports.updateComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    if (comment.author.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });
    comment.content = req.body.content;
    comment.isEdited = true;
    await comment.save();
    await comment.populate('author', 'name email avatar');
    res.json({ success: true, comment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Delete comment
// @route DELETE /api/comments/:id
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await Comment.deleteMany({ parentComment: comment._id }); // delete replies too
    await comment.deleteOne();
    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

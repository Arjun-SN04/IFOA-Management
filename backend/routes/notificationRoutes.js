const express = require('express');
const router = express.Router();
const {
  getMyNotifications, markAsRead, markAllRead, deleteNotification, getUnreadCount
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// FIX: static/named routes MUST come before wildcard /:id routes
router.get('/', protect, getMyNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.patch('/mark-all-read', protect, markAllRead);

// Wildcard /:id routes last
router.patch('/:id/read', protect, markAsRead);
router.delete('/:id', protect, deleteNotification);

module.exports = router;

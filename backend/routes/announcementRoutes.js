const express = require('express');
const router = express.Router();
const {
  createAnnouncement, getAllAnnouncements, getAnnouncementById,
  updateAnnouncement, deleteAnnouncement, pinAnnouncement
} = require('../controllers/announcementController');
const { protect, managerOrAdmin, adminOnly } = require('../middleware/authMiddleware');

router.post('/', protect, managerOrAdmin, createAnnouncement);
router.get('/', protect, getAllAnnouncements);
router.get('/:id', protect, getAnnouncementById);
router.put('/:id', protect, managerOrAdmin, updateAnnouncement);
router.delete('/:id', protect, adminOnly, deleteAnnouncement);
router.patch('/:id/pin', protect, adminOnly, pinAnnouncement);

module.exports = router;

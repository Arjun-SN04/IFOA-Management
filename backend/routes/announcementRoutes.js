const express = require('express');
const router = express.Router();
const {
  createAnnouncement, getAllAnnouncements, getAnnouncementById,
  updateAnnouncement, deleteAnnouncement, pinAnnouncement
} = require('../controllers/announcementController');
const { protect, hrOrAbove } = require('../middleware/authMiddleware');

router.post('/',       protect, hrOrAbove, createAnnouncement);
router.get('/',        protect, getAllAnnouncements);
router.get('/:id',     protect, getAnnouncementById);
router.put('/:id',     protect, hrOrAbove, updateAnnouncement);
// Delete and pin: hrOrAbove can act — ownership check is enforced in the controller
router.delete('/:id',  protect, hrOrAbove, deleteAnnouncement);
router.patch('/:id/pin', protect, hrOrAbove, pinAnnouncement);

module.exports = router;

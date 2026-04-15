const Announcement = require('../models/Announcement');
const User = require('../models/User');
const { createAndEmit } = require('./notificationController');

const getAnnouncementAudienceFilter = (announcement) => {
  if (announcement.audience === 'employees') {
    return { role: 'employee' };
  }

  if (announcement.audience === 'managers') {
    return { role: { $in: ['admin', 'manager'] } };
  }

  if (announcement.audience === 'department' && announcement.department) {
    return { department: announcement.department };
  }

  return {};
};

// @desc  Create announcement
exports.createAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.create({ ...req.body, createdBy: req.user._id });

    const audienceFilter = getAnnouncementAudienceFilter(announcement);
    const recipients = await User.find({
      ...audienceFilter,
      isActive: true,
      _id: { $ne: req.user._id },
    }).select('_id');

    if (recipients.length) {
      await Promise.all(
        recipients.map((recipient) =>
          createAndEmit({
            recipient: recipient._id,
            sender: req.user._id,
            type: 'announcement',
            title: 'New Announcement',
            message: `${req.user.name} posted: ${announcement.title}`,
            link: '/announcements',
          })
        )
      );
    }

    res.status(201).json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get all announcements
exports.getAllAnnouncements = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'employee') {
      filter.$or = [{ audience: 'all' }, { audience: 'employees' }];
    }
    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'name avatar')
      .sort({ isPinned: -1, createdAt: -1 });
    res.json({ success: true, data: announcements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get single announcement
exports.getAnnouncementById = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id).populate('createdBy', 'name avatar');
    if (!announcement) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update announcement
exports.updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!announcement) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Delete announcement
exports.deleteAnnouncement = async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Pin/unpin announcement
exports.pinAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ success: false, message: 'Not found' });
    announcement.isPinned = !announcement.isPinned;
    await announcement.save();
    res.json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

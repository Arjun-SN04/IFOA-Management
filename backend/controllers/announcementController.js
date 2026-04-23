const Announcement = require('../models/Announcement');
const User = require('../models/User');
const { createAndEmit } = require('./notificationController');

// ── Audience filter helper ─────────────────────────────────────────────────────
const getAnnouncementAudienceFilter = (announcement) => {
  if (announcement.audience === 'employees') {
    return { role: { $in: ['employee', 'team_lead'] } };
  }
  if (announcement.audience === 'managers') {
    return { role: { $in: ['admin', 'manager', 'hr'] } };
  }
  if (announcement.audience === 'department' && announcement.department) {
    return { department: announcement.department };
  }
  return {};
};

// ── Send notifications to all relevant recipients ─────────────────────────────
const sendAnnouncementNotifications = async (announcement, senderUser) => {
  const audienceFilter = getAnnouncementAudienceFilter(announcement);
  const recipients = await User.find({
    ...audienceFilter,
    isActive: true,
    _id: { $ne: senderUser._id },
  }).select('_id');

  if (recipients.length) {
    await Promise.all(
      recipients.map((recipient) =>
        createAndEmit({
          recipient: recipient._id,
          sender: senderUser._id,
          type: 'announcement',
          title: 'New Announcement',
          message: `${senderUser.name} posted: ${announcement.title}`,
          link: '/announcements',
        })
      )
    );
  }
};

// @desc  Create announcement (immediate or scheduled)
exports.createAnnouncement = async (req, res) => {
  try {
    const { scheduledFor, ...rest } = req.body;

    // Determine if this is scheduled or immediate
    const isScheduled = scheduledFor && new Date(scheduledFor) > new Date();
    const announcement = await Announcement.create({
      ...rest,
      createdBy: req.user._id,
      creatorRole: req.user.role,
      scheduledFor: isScheduled ? new Date(scheduledFor) : undefined,
      isPublished: !isScheduled, // scheduled = not yet published
    });

    // Send notifications immediately only if not scheduled
    if (!isScheduled) {
      await sendAnnouncementNotifications(announcement, req.user);
    }

    res.status(201).json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get all announcements (audience-filtered, only published + creator's own scheduled)
exports.getAllAnnouncements = async (req, res) => {
  try {
    const role = req.user.role;
    let audienceFilter = {};

    if (role === 'employee' || role === 'team_lead') {
      audienceFilter.$or = [{ audience: 'all' }, { audience: 'employees' }];
    } else if (role === 'manager' || role === 'hr') {
      audienceFilter.$or = [{ audience: 'all' }, { audience: 'managers' }];
    }
    // admin sees everything (no audience filter)

    // Published announcements (audience-filtered) + own scheduled drafts
    let filter;
    if (role === 'admin') {
      filter = {}; // admin sees all
    } else {
      filter = {
        $or: [
          { ...audienceFilter, isPublished: true },
          // Also show creator their own scheduled (unpublished) drafts
          { createdBy: req.user._id, isPublished: false },
        ],
      };
    }

    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'name avatar role')
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

// @desc  Update announcement (only own, or admin)
exports.updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ success: false, message: 'Not found' });

    // Only admin or the original creator can update
    const isOwner = String(announcement.createdBy) === String(req.user._id);
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You can only edit announcements you created' });
    }

    const updated = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Delete announcement — HR/Manager can delete ONLY their own; Admin can delete any
exports.deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ success: false, message: 'Not found' });

    const isOwner = String(announcement.createdBy) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'You can only delete announcements you created' });
    }

    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Pin/unpin — HR/Manager own announcements; Admin any
exports.pinAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ success: false, message: 'Not found' });

    const isOwner = String(announcement.createdBy) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'You can only pin announcements you created' });
    }

    announcement.isPinned = !announcement.isPinned;
    await announcement.save();
    res.json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Scheduler: publish scheduled announcements when their time arrives ──────────
// Call this from server.js on an interval (every minute)
exports.processScheduledAnnouncements = async () => {
  try {
    const due = await Announcement.find({
      isPublished: false,
      scheduledFor: { $lte: new Date() },
    }).populate('createdBy', 'name _id role');

    for (const ann of due) {
      ann.isPublished = true;
      await ann.save();

      if (ann.createdBy) {
        await sendAnnouncementNotifications(ann, ann.createdBy);
      }
    }

    if (due.length > 0) {
      console.log(`[Scheduler] Published ${due.length} scheduled announcement(s)`);
    }
  } catch (err) {
    console.error('[Scheduler] Error processing scheduled announcements:', err.message);
  }
};

const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { createAndEmit } = require('./notificationController');
const { getIO } = require('../socket');

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

// ── Send notifications + socket broadcast to all relevant recipients ───────────
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

  // ── Broadcast a dedicated socket event so all connected clients redirect ────
  // The payload contains just enough info for the client to decide whether to redirect
  try {
    const io = getIO();
    const broadcastPayload = {
      _id: announcement._id,
      title: announcement.title,
      audience: announcement.audience,
      department: announcement.department || null,
      priority: announcement.priority || 'normal',
      createdBy: { _id: senderUser._id, name: senderUser.name },
    };
    // Emit to all connected sockets (across all authenticated users)
    io.emit('announcement:new', broadcastPayload);
  } catch {}
};

// @desc  Create announcement (immediate or scheduled)
exports.createAnnouncement = async (req, res) => {
  try {
    const { scheduledFor, expiresAt, ...rest } = req.body;

    const isScheduled = scheduledFor && new Date(scheduledFor) > new Date();

    // If user explicitly sets expiresAt, use it.
    // Otherwise: immediate posts expire in 24 hours, scheduled posts expire 24h after their publish time.
    // This intentional 24-hour window keeps the feed fresh — old announcements auto-clear.
    let resolvedExpiresAt;
    if (expiresAt) {
      resolvedExpiresAt = new Date(expiresAt);
    } else if (!isScheduled) {
      resolvedExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else {
      resolvedExpiresAt = new Date(new Date(scheduledFor).getTime() + 24 * 60 * 60 * 1000);
    }

    const announcement = await Announcement.create({
      ...rest,
      createdBy: req.user._id,
      creatorRole: req.user.role,
      scheduledFor: isScheduled ? new Date(scheduledFor) : undefined,
      isPublished: !isScheduled,
      expiresAt: resolvedExpiresAt,
    });

    if (!isScheduled) {
      await sendAnnouncementNotifications(announcement, req.user);
    }

    res.status(201).json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get all announcements — expired ones are excluded and auto-deleted
exports.getAllAnnouncements = async (req, res) => {
  try {
    const role = req.user.role;
    const now = new Date();

    // ── Auto-delete announcements that have an explicit expiresAt that has passed ──
    Announcement.find({
      expiresAt: { $exists: true, $ne: null, $type: 'date', $lte: now },
    }).then(async (expired) => {
      if (!expired.length) return;
      const ids = expired.map(a => a._id);
      await Announcement.deleteMany({ _id: { $in: ids } });
      console.log(`[Announcements] Auto-deleted ${expired.length} expired announcement(s)`);
    }).catch(() => {});

    // ── Audience filter ────────────────────────────────────────────────────
    let audienceFilter = {};
    if (role === 'employee' || role === 'team_lead') {
      audienceFilter.$or = [{ audience: 'all' }, { audience: 'employees' }];
    } else if (role === 'manager' || role === 'hr') {
      audienceFilter.$or = [{ audience: 'all' }, { audience: 'managers' }];
    }

    const notExpired = {
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: now } },
      ],
    };

    let filter;
    if (role === 'admin') {
      filter = { $and: [notExpired] };
    } else {
      filter = {
        $and: [
          notExpired,
          {
            $or: [
              { ...audienceFilter, isPublished: true },
              { createdBy: req.user._id, isPublished: false },
            ],
          },
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

    const escapedTitle = announcement.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await Notification.deleteMany({
      type: 'announcement',
      message: { $regex: escapedTitle },
    });

    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Pin/unpin
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

// ── Scheduler: publish scheduled announcements ────────────────────────────────
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

// ── Scheduler: delete expired announcements ───────────────────────────────────
exports.deleteExpiredAnnouncements = async () => {
  try {
    const now = new Date();
    // Only delete announcements that have an explicit expiresAt in the past
    const result = await Announcement.deleteMany({
      expiresAt: { $exists: true, $ne: null, $lte: now },
    });
    if (result.deletedCount > 0) {
      console.log(`[Scheduler] Deleted ${result.deletedCount} expired announcement(s)`);
    }
  } catch (err) {
    console.error('[Scheduler] Error deleting expired announcements:', err.message);
  }
};

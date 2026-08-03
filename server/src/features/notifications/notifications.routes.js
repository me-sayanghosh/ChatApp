import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.js';
import { Notification } from './notification.model.js';
import { User } from '../auth/user.model.js';

const router = Router();

router.use(requireAuth);

// GET /api/notifications - List user's notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .populate('actor', 'username profileImage')
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ user: req.user.id, read: false });

    res.json({
      notifications: notifications.map((n) => n.toClient()),
      unreadCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/read-all', async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id, read: false }, { $set: { read: true } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/:id/read - Mark single notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const notif = await Notification.findOne({ _id: req.params.id, user: req.user.id });
    if (!notif) return res.status(404).json({ error: 'Notification not found' });

    notif.read = true;
    await notif.save();
    res.json({ ok: true, notification: notif.toClient() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notifications/clear-all - Clear all notifications for user
// NOTE: This MUST be declared before /:id or Express will match 'clear-all' as an id param
router.delete('/clear-all', async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notifications/room/:roomId - Auto-remove notifications for seen room messages
// NOTE: This MUST be declared before /:id or Express will match 'room' as an id param
router.delete('/room/:roomId', async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user.id, roomId: req.params.roomId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notifications/:id - Delete single notification
router.delete('/:id', async (req, res) => {
  try {
    await Notification.deleteOne({ _id: req.params.id, user: req.user.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/settings - Update notification preferences
router.put('/settings', async (req, res) => {
  try {
    const { groupNotifications, directNotifications, backgroundSync } = req.body || {};

    const updateObj = {};
    if (typeof groupNotifications === 'boolean') updateObj['notificationSettings.groupNotifications'] = groupNotifications;
    if (typeof directNotifications === 'boolean') updateObj['notificationSettings.directNotifications'] = directNotifications;
    if (typeof backgroundSync === 'boolean') updateObj['notificationSettings.backgroundSync'] = backgroundSync;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateObj },
      { new: true }
    );

    res.json({ ok: true, user: user.toClient() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole, requireAtLeastRole } from '../middleware/roles.js';
import { Message } from '../models/Message.js';
import { Room } from '../models/Room.js';

const router = Router();

router.use(requireAuth);

router.post('/:roomId/members/:userId/kick', requireAtLeastRole('moderator'), async (req, res) => {
  try {
    const { userId } = req.params;
    const room = req.room;

    const target = room.members.find((m) => m.user.toString() === userId);
    if (!target) return res.status(404).json({ error: 'user not a member' });

    if (target.role === 'owner') return res.status(403).json({ error: 'cannot kick the owner' });

    if (req.roomMember.role === 'moderator' && target.role === 'moderator') {
      return res.status(403).json({ error: 'moderators cannot kick other moderators' });
    }

    room.members = room.members.filter((m) => m.user.toString() !== userId);
    await room.save();

    res.json({ ok: true, kicked: userId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:roomId/members/:userId/mute', requireAtLeastRole('moderator'), async (req, res) => {
  try {
    const { userId } = req.params;
    const room = req.room;

    const target = room.members.find((m) => m.user.toString() === userId);
    if (!target) return res.status(404).json({ error: 'user not a member' });

    if (target.role === 'owner') return res.status(403).json({ error: 'cannot mute the owner' });

    if (req.roomMember.role === 'moderator' && target.role === 'moderator') {
      return res.status(403).json({ error: 'moderators cannot mute other moderators' });
    }

    target.muted = !target.muted;
    await room.save();

    res.json({ ok: true, userId, muted: target.muted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:roomId/members/:userId/role', requireRole('owner'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body || {};
    const room = req.room;

    if (!['moderator', 'member'].includes(role)) {
      return res.status(400).json({ error: 'role must be moderator or member' });
    }

    const target = room.members.find((m) => m.user.toString() === userId);
    if (!target) return res.status(404).json({ error: 'user not a member' });

    target.role = role;
    await room.save();

    res.json({ ok: true, userId, role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:roomId/messages/:messageId', requireAtLeastRole('moderator'), async (req, res) => {
  try {
    const { roomId, messageId } = req.params;

    const message = await Message.findOne({ _id: messageId, room: roomId });
    if (!message) return res.status(404).json({ error: 'message not found' });

    const isSender = message.sender.toString() === req.user.id;
    const isMod = ['owner', 'moderator'].includes(req.roomMember.role);

    if (!isSender && !isMod) {
      return res.status(403).json({ error: 'no permission to delete this message' });
    }

    message.deleted = true;
    message.deletedBy = req.user.id;
    message.text = '';
    await message.save();

    res.json({ ok: true, messageId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:roomId/messages/:messageId/report', async (req, res) => {
  try {
    const { roomId, messageId } = req.params;

    const message = await Message.findOne({ _id: messageId, room: roomId });
    if (!message) return res.status(404).json({ error: 'message not found' });

    message.reported = true;
    await message.save();

    res.json({ ok: true, messageId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:roomId/members', async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });
    res.json({ members: room.members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

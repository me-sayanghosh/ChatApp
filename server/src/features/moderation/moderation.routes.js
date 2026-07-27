import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.js';
import { requireRole, requireAtLeastRole } from '../../shared/middleware/roles.js';
import { Message } from '../messages/message.model.js';
import { Room } from '../rooms/room.model.js';
import { getIO } from '../../shared/socket/index.js';

const router = Router();

router.use(requireAuth);

router.post('/:roomId/members/:userId/kick', requireAtLeastRole('moderator'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { ban } = req.body || {};
    const room = req.room;

    const target = room.members.find((m) => m.user.toString() === userId);
    if (!target) return res.status(404).json({ error: 'user not a member' });

    if (target.role === 'owner') return res.status(403).json({ error: 'cannot kick the owner' });

    if (req.roomMember.role === 'moderator' && target.role === 'moderator') {
      return res.status(403).json({ error: 'moderators cannot kick other moderators' });
    }

    if (ban) {
      const alreadyBanned = (room.bannedUsers || []).some((b) => b.user.toString() === userId);
      if (!alreadyBanned) {
        room.bannedUsers.push({ user: userId, bannedAt: new Date(), bannedBy: req.user.id });
      }
    }

    room.members = room.members.filter((m) => m.user.toString() !== userId);
    await room.save();

    const io = getIO();
    if (io) {
      const roomIdStr = room._id.toString();
      io.to(roomIdStr).emit('room:user-kicked', { roomId: roomIdStr, userId, banned: !!ban });
      const sockets = await io.in(roomIdStr).fetchSockets();
      for (const s of sockets) {
        if (s.user.id === userId) {
          s.leave(roomIdStr);
          s.emit('room:kicked', { roomId: roomIdStr, banned: !!ban });
        }
      }
      const remaining = await io.in(roomIdStr).fetchSockets();
      const online = remaining.map((s) => s.user);
      io.to(roomIdStr).emit('room:online', { roomId: roomIdStr, online });
    }

    res.json({ ok: true, kicked: userId, banned: !!ban });
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

    const { User } = await import('../auth/user.model.js');
    const userIds = room.members.map((m) => m.user);
    const users = await User.find({ _id: { $in: userIds } }).select('username').lean();
    const usernameMap = new Map(users.map((u) => [u._id.toString(), u.username]));

    const members = room.members.map((m) => ({
      user: m.user.toString(),
      username: usernameMap.get(m.user.toString()) || 'unknown',
      role: m.role,
      muted: m.muted,
      joinedAt: m.joinedAt,
    }));

    res.json({ members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:roomId/ban/:userId', requireAtLeastRole('moderator'), async (req, res) => {
  try {
    const { userId } = req.params;
    const room = req.room;

    if (userId === req.user.id) return res.status(400).json({ error: 'cannot ban yourself' });

    const alreadyBanned = (room.bannedUsers || []).some((b) => b.user.toString() === userId);
    if (alreadyBanned) return res.status(400).json({ error: 'already banned' });

    room.bannedUsers.push({ user: userId, bannedAt: new Date(), bannedBy: req.user.id });
    room.members = room.members.filter((m) => m.user.toString() !== userId);
    room.encryptedKeys = room.encryptedKeys.filter((ek) => ek.user.toString() !== userId);
    await room.save();

    const io = getIO();
    if (io) {
      const roomIdStr = room._id.toString();
      io.to(roomIdStr).emit('room:user-kicked', { roomId: roomIdStr, userId, banned: true });
      const sockets = await io.in(roomIdStr).fetchSockets();
      for (const s of sockets) {
        if (s.user.id === userId) {
          s.leave(roomIdStr);
          s.emit('room:kicked', { roomId: roomIdStr, banned: true });
        }
      }
      const remaining = await io.in(roomIdStr).fetchSockets();
      const online = remaining.map((s) => s.user);
      io.to(roomIdStr).emit('room:online', { roomId: roomIdStr, online });
    }

    res.json({ ok: true, banned: userId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:roomId/unban/:userId', requireAtLeastRole('moderator'), async (req, res) => {
  try {
    const { userId } = req.params;
    const room = req.room;

    const banIndex = (room.bannedUsers || []).findIndex((b) => b.user.toString() === userId);
    if (banIndex === -1) return res.status(404).json({ error: 'user not banned' });

    room.bannedUsers.splice(banIndex, 1);
    await room.save();

    res.json({ ok: true, unbanned: userId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:roomId/banned', requireAtLeastRole('moderator'), async (req, res) => {
  try {
    const room = req.room;
    const banned = [];
    for (const b of (room.bannedUsers || [])) {
      const { User } = await import('../auth/user.model.js');
      const user = await User.findById(b.user).select('username').lean();
      banned.push({
        user: b.user.toString(),
        username: user?.username || 'unknown',
        bannedAt: b.bannedAt,
      });
    }
    res.json({ banned });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

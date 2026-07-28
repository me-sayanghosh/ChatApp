import { Router } from 'express';
import { Room } from './room.model.js';
import { requireAuth } from '../../shared/middleware/auth.js';
import { DEFAULT_ROOMS, ROOM_TYPES } from '../../shared/utils/constants.js';

import { Message } from '../messages/message.model.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    // Exclude DM rooms from the main channel list — they belong in the DM panel
    let rooms = await Room.find({ isDM: { $ne: true } }).sort({ createdAt: 1 });
    if (rooms.length === 0 && req.user?.id) {
      for (const d of DEFAULT_ROOMS) {
        await Room.create({
          name: d.name,
          createdBy: req.user.id,
          type: d.type,
          members: [{ user: req.user.id, role: 'owner', joinedAt: new Date(), muted: false }],
        });
      }
      rooms = await Room.find({ isDM: { $ne: true } }).sort({ createdAt: 1 });
    }

    const membershipIds = new Set();
    const pendingIds = new Set();
    const memberCounts = {};

    for (const r of rooms) {
      if (r.members.some((m) => m.user.toString() === req.user.id)) {
        membershipIds.add(r._id.toString());
      }
      if (r.pendingRequests.some((pr) => pr.user.toString() === req.user.id)) {
        pendingIds.add(r._id.toString());
      }
      memberCounts[r._id.toString()] = r.members.length;
    }

    const enrichedRooms = await Promise.all(
      rooms.map(async (r) => {
        const lastMsg = await Message.findOne({ room: r._id, deleted: { $ne: true } })
          .sort({ createdAt: -1 })
          .populate('sender', 'username')
          .lean();

        return {
          ...r.toSummary(),
          membersCount: memberCounts[r._id.toString()] || 0,
          lastMessage: lastMsg
            ? {
                text: lastMsg.text || (lastMsg.attachments?.length ? 'Sent an attachment' : ''),
                senderUsername: lastMsg.sender?.username || 'User',
                createdAt: lastMsg.createdAt,
              }
            : null,
        };
      })
    );

    res.json({
      rooms: enrichedRooms,
      memberships: [...membershipIds],
      pending: [...pendingIds],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, type, inactivityMinutes } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });

    const roomType = ROOM_TYPES.includes(type) ? type : 'public';

    const existing = await Room.findOne({ name: name.trim() });
    if (existing) return res.status(200).json({ room: existing.toSummary() });

    const memberEntry = {
      user: req.user.id,
      role: 'owner',
      joinedAt: new Date(),
      muted: false,
    };

    const doc = {
      name: name.trim(),
      createdBy: req.user.id,
      type: roomType,
      members: [memberEntry],
    };

    if (roomType === 'ephemeral') {
      const minutes = typeof inactivityMinutes === 'number' && inactivityMinutes > 0 ? inactivityMinutes : 60;
      doc.expiresAt = new Date(Date.now() + minutes * 60 * 1000);
    }

    const room = await Room.create(doc);
    res.status(201).json({ room: room.toSummary() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:roomId', async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });
    res.json({ room: room.toClient() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:roomId', async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });

    const member = room.members.find((m) => m.user.toString() === req.user.id);
    if (!member || member.role !== 'owner') {
      return res.status(403).json({ error: 'only the room owner can update settings' });
    }

    const { name, type, inactivityMinutes } = req.body || {};
    if (name && name.trim()) room.name = name.trim();
    if (ROOM_TYPES.includes(type)) room.type = type;

    if (room.type === 'ephemeral') {
      const minutes = typeof inactivityMinutes === 'number' && inactivityMinutes > 0 ? inactivityMinutes : 60;
      room.expiresAt = new Date(Date.now() + minutes * 60 * 1000);
    } else {
      room.expiresAt = null;
    }

    await room.save();
    res.json({ room: room.toClient() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:roomId/request-join', async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });
    if (room.type !== 'private') return res.status(400).json({ error: 'only private rooms require join requests' });

    const isBanned = (room.bannedUsers || []).some((b) => b.user.toString() === req.user.id);
    if (isBanned) return res.status(403).json({ error: 'you are banned from this room' });

    const isMember = room.members.some((m) => m.user.toString() === req.user.id);
    if (isMember) return res.status(400).json({ error: 'already a member' });

    const alreadyRequested = room.pendingRequests.some((r) => r.user.toString() === req.user.id);
    if (alreadyRequested) return res.status(400).json({ error: 'request already pending' });

    room.pendingRequests.push({ user: req.user.id, requestedAt: new Date() });
    await room.save();

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:roomId/pending-requests', async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });

    const member = room.members.find((m) => m.user.toString() === req.user.id);
    if (!member || (member.role !== 'owner' && member.role !== 'moderator')) {
      return res.status(403).json({ error: 'only admins can view pending requests' });
    }

    const requests = [];
    for (const r of room.pendingRequests) {
      const { User } = await import('../auth/user.model.js');
      const user = await User.findById(r.user).select('username').lean();
      requests.push({
        user: r.user.toString(),
        username: user?.username || 'unknown',
        requestedAt: r.requestedAt,
      });
    }

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:roomId/pending-requests/:requestId/grant', async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });

    const member = room.members.find((m) => m.user.toString() === req.user.id);
    if (!member || (member.role !== 'owner' && member.role !== 'moderator')) {
      return res.status(403).json({ error: 'only admins can grant requests' });
    }

    const requestIndex = room.pendingRequests.findIndex((r) => r.user.toString() === req.params.requestId);
    if (requestIndex === -1) return res.status(404).json({ error: 'request not found' });

    const request = room.pendingRequests[requestIndex];
    const userId = request.user.toString();

    room.pendingRequests.splice(requestIndex, 1);
    room.members.push({ user: userId, role: 'member', joinedAt: new Date(), muted: false });
    await room.save();

    res.json({ ok: true, userId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:roomId/pending-requests/:requestId/deny', async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });

    const member = room.members.find((m) => m.user.toString() === req.user.id);
    if (!member || (member.role !== 'owner' && member.role !== 'moderator')) {
      return res.status(403).json({ error: 'only admins can deny requests' });
    }

    const requestIndex = room.pendingRequests.findIndex((r) => r.user.toString() === req.params.requestId);
    if (requestIndex === -1) return res.status(404).json({ error: 'request not found' });

    const userId = room.pendingRequests[requestIndex].user.toString();
    room.pendingRequests.splice(requestIndex, 1);
    await room.save();

    res.json({ ok: true, userId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/rooms/:roomId/settings - Update channel settings (topic, category, slowMode, name)
router.put('/:roomId/settings', async (req, res) => {
  try {
    const { name, topic, category, slowMode } = req.body || {};
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });

    const member = room.members.find((m) => m.user.toString() === req.user.id);
    if (!member || (member.role !== 'owner' && member.role !== 'moderator')) {
      return res.status(403).json({ error: 'only owners and moderators can update channel settings' });
    }

    if (name && name.trim()) {
      const existing = await Room.findOne({ name: name.trim(), _id: { $ne: room._id } });
      if (existing) return res.status(400).json({ error: 'room name already taken' });
      room.name = name.trim();
    }

    if (topic !== undefined) room.topic = typeof topic === 'string' ? topic.trim().substring(0, 250) : '';
    if (category !== undefined) room.category = typeof category === 'string' ? category.trim().substring(0, 50) : 'General';
    if (slowMode !== undefined) room.slowMode = Math.max(0, parseInt(slowMode, 10) || 0);

    await room.save();
    res.json({ room: room.toClient() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

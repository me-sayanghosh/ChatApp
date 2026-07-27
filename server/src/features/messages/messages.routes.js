import { Router } from 'express';
import mongoose from 'mongoose';
import { Message } from './message.model.js';
import { Room } from '../rooms/room.model.js';
import { requireAuth } from '../../shared/middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { after, before, limit } = req.query;
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });

    if (room.type === 'private') {
      const isMember = room.members.some((m) => m.user.toString() === req.user.id);
      if (!isMember) return res.status(403).json({ error: 'not a member of this private room' });
    }

    const query = { room: roomId };
    if (after) {
      if (!mongoose.Types.ObjectId.isValid(after)) {
        return res.status(400).json({ error: 'invalid after parameter' });
      }
      query._id = { $gt: new mongoose.Types.ObjectId(after) };
    } else if (before) {
      if (!mongoose.Types.ObjectId.isValid(before)) {
        return res.status(400).json({ error: 'invalid before parameter' });
      }
      query._id = { $lt: new mongoose.Types.ObjectId(before) };
    }

    const cap = Math.min(parseInt(limit, 10) || 50, 500);
    // If before parameter is passed (loading older history), sort descending then reverse
    const sortDir = before ? -1 : 1;
    let messages = await Message.find(query).sort({ _id: sortDir }).limit(cap);
    if (before) {
      messages = messages.reverse();
    }

    const filtered = messages.filter((m) => {
      if (m.deletedFor && m.deletedFor.some((id) => id.toString() === req.user.id)) {
        return false;
      }
      return true;
    });

    const replyToIds = filtered.filter(m => m.replyTo).map(m => m.replyTo);
    let replyToMap = {};
    if (replyToIds.length > 0) {
      const replyToMsgs = await Message.find({ _id: { $in: replyToIds } }).populate('sender', 'username').lean();
      for (const rm of replyToMsgs) {
        replyToMap[rm._id.toString()] = {
          id: rm._id.toString(),
          senderUsername: rm.sender?.username || 'unknown',
          text: rm.text ? rm.text.substring(0, 100) : '',
        };
      }
    }

    res.json({
      messages: filtered.map((m) => ({
        ...m.toClient(),
        replyToData: replyToMap[m._id.toString()] || null,
      })),
      hasMore: filtered.length === cap,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rooms/:roomId/messages/search?q=query - Search messages within a room
router.get('/:roomId/messages/search', async (req, res) => {
  try {
    const { roomId } = req.params;
    const q = req.query.q?.trim();
    if (!q) return res.json({ messages: [] });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });

    if (room.type === 'private') {
      const isMember = room.members.some((m) => m.user.toString() === req.user.id);
      if (!isMember) return res.status(403).json({ error: 'not a member of this private room' });
    }

    const reg = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const messages = await Message.find({
      room: roomId,
      text: reg,
      deleted: false,
    })
      .populate('sender', 'username profileImage')
      .sort({ createdAt: -1 })
      .limit(30);

    const filtered = messages.filter(
      (m) => !(m.deletedFor || []).some((id) => id.toString() === req.user.id)
    );

    res.json({
      messages: filtered.map((m) => ({
        ...m.toClient(),
        sender: {
          id: m.sender?._id?.toString() || m.sender?.toString(),
          username: m.sender?.username || 'User',
          profileImage: m.sender?.profileImage || '',
        },
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/backfill', requireAuth, async (req, res) => {
  try {
    const { rooms } = req.body || {};
    if (!Array.isArray(rooms) || rooms.length === 0) {
      return res.status(400).json({ error: 'rooms array required' });
    }
    const capped = rooms.slice(0, 20);
    const results = await backfillMessages(req.user.id, capped);
    res.json({ backfill: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

export async function backfillMessages(userId, rooms) {
  const results = {};
  const validRooms = rooms.filter((r) => {
    if (!r.roomId || !r.after) return false;
    try {
      new mongoose.Types.ObjectId(r.roomId);
      new mongoose.Types.ObjectId(r.after);
      return true;
    } catch {
      return false;
    }
  });

  if (validRooms.length === 0) return results;

  const roomIds = validRooms.map((r) => {
    try { return new mongoose.Types.ObjectId(r.roomId); } catch { return null; }
  }).filter(Boolean);

  const roomDocs = await Room.find({ _id: { $in: roomIds } }).lean();

  const accessibleIds = new Set();
  for (const doc of roomDocs) {
    if (doc.type === 'private') {
      const isMember = doc.members.some((m) => m.user.toString() === userId);
      if (!isMember) continue;
    }
    accessibleIds.add(doc._id.toString());
  }

  const queries = validRooms
    .filter((r) => accessibleIds.has(r.roomId.toString()))
    .map(async (r) => {
      try {
        const afterObjId = new mongoose.Types.ObjectId(r.after);
        const roomIdObj = new mongoose.Types.ObjectId(r.roomId);
        const messages = await Message.find({
          room: roomIdObj,
          _id: { $gt: afterObjId },
        })
          .sort({ _id: 1 })
          .limit(100)
          .lean();
        results[r.roomId.toString()] = messages.map((m) => ({
          id: m._id.toString(),
          roomId: m.room.toString(),
          senderId: m.sender.toString(),
          clientMsgId: m.clientMsgId || null,
          text: m.text,
          parentMessage: m.parentMessage ? m.parentMessage.toString() : null,
          replyTo: m.replyTo ? m.replyTo.toString() : null,
          deletedFor: (m.deletedFor || []).map(id => id.toString()),
          deleted: m.deleted,
          reported: m.reported,
          reactions: (m.reactions || []).map((rx) => ({
            emoji: rx.emoji,
            users: rx.users.map((u) => u.toString()),
          })),
          createdAt: m.createdAt,
        }));
      } catch {
        results[r.roomId.toString()] = [];
      }
    });

  await Promise.all(queries);
  return results;
}

import { Router } from 'express';
import mongoose from 'mongoose';
import { Room } from '../rooms/room.model.js';
import { Message } from '../messages/message.model.js';
import { User } from '../auth/user.model.js';
import { requireAuth } from '../../shared/middleware/auth.js';
import { getIO } from '../../shared/socket/index.js';

const router = Router();
router.use(requireAuth);

/**
 * POST /api/dm/send
 * Create or reuse a pending DM room, send the initial message.
 * Body: { toUserId, text }
 */
router.post('/send', async (req, res) => {
  try {
    const { toUserId, text } = req.body;
    const fromUserId = req.user.id;

    if (!toUserId || !text?.trim()) {
      return res.status(400).json({ error: 'toUserId and text required' });
    }
    if (toUserId === fromUserId) {
      return res.status(400).json({ error: 'Cannot DM yourself' });
    }

    const toUser = await User.findById(toUserId);
    if (!toUser) return res.status(404).json({ error: 'User not found' });

    // Reuse existing DM room between these two users (either direction)
    let room = await Room.findOne({
      isDM: true,
      'members.user': { $all: [fromUserId, toUserId] },
    });

    if (!room) {
      // Unique room name for the DM pair
      const dmName = `dm-${[fromUserId, toUserId].sort().join('-')}`;
      room = await Room.create({
        name: dmName,
        createdBy: fromUserId,
        type: 'public',
        isDM: true,
        dmStatus: 'pending',
        dmInitiator: fromUserId,
        members: [
          { user: fromUserId, role: 'member' },
          { user: toUserId, role: 'member' },
        ],
      });
    }

    // Only send initial message if room is still pending (no messages yet)
    // or if it's already accepted (free chat)
    const existingCount = await Message.countDocuments({ room: room._id });
    if (room.dmStatus === 'pending' && existingCount > 0) {
      // Pending room already has the initial message — just return the room
      return res.json({ room: room.toClient(), alreadySent: true });
    }

    const msg = await Message.create({
      room: room._id,
      sender: fromUserId,
      text: text.trim(),
    });

    const io = getIO();
    const payload = {
      ...msg.toClient(),
      sender: { id: fromUserId, username: req.user.username },
    };

    // Notify both parties in real-time
    io?.to(room._id.toString()).emit('message:new', {
      roomId: room._id.toString(),
      message: payload,
    });

    // Notify the recipient of a new pending DM
    io?.emit('dm:new-request', {
      roomId: room._id.toString(),
      fromUserId,
      fromUsername: req.user.username,
      toUserId,
    });

    res.status(201).json({ room: room.toClient(), message: payload });
  } catch (err) {
    console.error('[dm] send error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/dm/conversations
 * List all DM conversations for the current user (pending + accepted).
 */
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user.id;

    const rooms = await Room.find({
      isDM: true,
      'members.user': userId,
    }).sort({ updatedAt: -1 });

    // Enrich with partner info and last message
    const enriched = await Promise.all(
      rooms.map(async (room) => {
        const partnerMember = room.members.find(
          (m) => m.user.toString() !== userId
        );
        const partner = partnerMember
          ? await User.findById(partnerMember.user).lean()
          : null;

        const lastMsg = await Message.findOne({ room: room._id })
          .sort({ createdAt: -1 })
          .lean();

        return {
          ...room.toClient(),
          partner: partner
            ? {
                id: partner._id.toString(),
                username: partner.username,
                name: partner.name || '',
                profileImage: partner.profileImage || '',
              }
            : null,
          lastMessage: lastMsg
            ? {
                text: lastMsg.deleted ? '' : lastMsg.text,
                createdAt: lastMsg.createdAt,
              }
            : null,
        };
      })
    );

    res.json({ conversations: enriched });
  } catch (err) {
    console.error('[dm] list error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/dm/:roomId/accept
 * Recipient accepts the DM request.
 */
router.post('/:roomId/accept', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await Room.findOne({
      _id: roomId,
      isDM: true,
      'members.user': userId,
    });
    if (!room) return res.status(404).json({ error: 'DM not found' });

    // Only the non-initiator can accept
    if (room.dmInitiator?.toString() === userId) {
      return res.status(403).json({ error: 'Initiator cannot accept their own request' });
    }

    room.dmStatus = 'accepted';
    await room.save();

    const io = getIO();
    // Notify both parties
    io?.emit('dm:accepted', {
      roomId: room._id.toString(),
      acceptedBy: userId,
    });

    res.json({ room: room.toClient() });
  } catch (err) {
    console.error('[dm] accept error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/dm/:roomId
 * Recipient removes/rejects the DM request (or either party deletes the conversation).
 */
router.delete('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await Room.findOne({
      _id: roomId,
      isDM: true,
      'members.user': userId,
    });
    if (!room) return res.status(404).json({ error: 'DM not found' });

    // Delete all messages and the room
    await Message.deleteMany({ room: room._id });
    await room.deleteOne();

    const io = getIO();
    io?.emit('dm:removed', { roomId: room._id.toString(), removedBy: userId });

    res.json({ ok: true });
  } catch (err) {
    console.error('[dm] remove error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/dm/:roomId/messages
 * Fetch messages for a DM conversation (reuses existing message history pattern).
 */
router.get('/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const { after, limit } = req.query;

    const room = await Room.findOne({
      _id: roomId,
      isDM: true,
      'members.user': userId,
    });
    if (!room) return res.status(404).json({ error: 'DM not found' });

    const query = { room: roomId, parentMessage: null };
    if (after && mongoose.Types.ObjectId.isValid(after)) {
      query._id = { $gt: new mongoose.Types.ObjectId(after) };
    }

    const cap = Math.min(parseInt(limit) || 50, 500);
    const messages = await Message.find(query).sort({ createdAt: 1 }).limit(cap);

    // Filter deletedFor and enrich replyTo
    const filtered = messages.filter(
      (m) => !m.deletedFor.some((id) => id.toString() === userId)
    );

    const replyIds = filtered.map((m) => m.replyTo).filter(Boolean);
    const replyDocs = replyIds.length
      ? await Message.find({ _id: { $in: replyIds } })
          .populate('sender', 'username')
          .lean()
      : [];
    const replyMap = Object.fromEntries(
      replyDocs.map((r) => [
        r._id.toString(),
        { text: r.text, senderUsername: r.sender?.username || 'Unknown' },
      ])
    );

    const result = filtered.map((m) => ({
      ...m.toClient(),
      replyToData: m.replyTo ? replyMap[m.replyTo.toString()] || null : null,
    }));

    res.json({ messages: result });
  } catch (err) {
    console.error('[dm] messages error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

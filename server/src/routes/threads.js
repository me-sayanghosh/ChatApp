import { Router } from 'express';
import { Message } from '../models/Message.js';
import { Room } from '../models/Room.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/:roomId/messages/:messageId/replies', async (req, res) => {
  try {
    const { roomId, messageId } = req.params;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });

    if (room.type === 'private') {
      const isMember = room.members.some((m) => m.user.toString() === req.user.id);
      if (!isMember) return res.status(403).json({ error: 'not a member of this private room' });
    }

    const parent = await Message.findOne({ _id: messageId, room: roomId });
    if (!parent) return res.status(404).json({ error: 'message not found' });

    const replies = await Message.find({ parentMessage: messageId })
      .sort({ createdAt: 1 })
      .limit(100);

    res.json({ replies: replies.map((m) => m.toClient()) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:roomId/threads', async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });

    if (room.type === 'private') {
      const isMember = room.members.some((m) => m.user.toString() === req.user.id);
      if (!isMember) return res.status(403).json({ error: 'not a member of this private room' });
    }

    const threads = await Message.aggregate([
      { $match: { room: room._id, parentMessage: null } },
      {
        $lookup: {
          from: 'messages',
          localField: '_id',
          foreignField: 'parentMessage',
          as: 'replies',
        },
      },
      { $match: { 'replies.0': { $exists: true } } },
      {
        $addFields: {
          replyCount: { $size: '$replies' },
          lastReply: { $last: '$replies' },
        },
      },
      { $sort: { 'lastReply.createdAt': -1 } },
      { $limit: 50 },
      { $project: { _id: 1, text: 1, sender: 1, createdAt: 1, replyCount: 1, lastReply: 1 } },
    ]);

    res.json({ threads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

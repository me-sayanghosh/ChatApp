import { Router } from 'express';
import { Message } from '../models/Message.js';
import { Room } from '../models/Room.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });

    if (room.type === 'private') {
      const isMember = room.members.some((m) => m.user.toString() === req.user.id);
      if (!isMember) return res.status(403).json({ error: 'not a member of this private room' });
    }

    const messages = await Message.find({ room: roomId }).sort({ createdAt: 1 }).limit(100);
    res.json({ messages: messages.map((m) => m.toClient()) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

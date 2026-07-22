import { Router } from 'express';
import { Message } from '../models/Message.js';
import { Room } from '../models/Room.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/:roomId/messages', async (req, res) => {
  const { roomId } = req.params;
  const room = await Room.findById(roomId);
  if (!room) return res.status(404).json({ error: 'room not found' });
  const messages = await Message.find({ room: roomId }).sort({ createdAt: 1 }).limit(100);
  res.json({ messages: messages.map((m) => m.toClient()) });
});

export default router;

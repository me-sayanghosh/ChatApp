import { Router } from 'express';
import { Room } from '../models/Room.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (_req, res) => {
  const rooms = await Room.find().sort({ createdAt: 1 });
  res.json({ rooms: rooms.map((r) => r.toClient()) });
});

router.post('/', async (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
  const existing = await Room.findOne({ name: name.trim() });
  if (existing) return res.status(200).json({ room: existing.toClient() });
  const room = await Room.create({ name: name.trim(), createdBy: req.user.id });
  res.status(201).json({ room: room.toClient() });
});

export default router;

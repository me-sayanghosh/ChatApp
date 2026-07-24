import { Router } from 'express';
import { Room } from '../models/Room.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    let rooms = await Room.find().sort({ createdAt: 1 });
    if (rooms.length === 0 && req.user?.id) {
      const defaults = [
        { name: 'general', type: 'public' },
        { name: 'random', type: 'public' },
        { name: 'lounge', type: 'public' },
      ];
      for (const d of defaults) {
        await Room.create({
          name: d.name,
          createdBy: req.user.id,
          type: d.type,
          members: [{ user: req.user.id, role: 'owner', joinedAt: new Date(), muted: false }],
        });
      }
      rooms = await Room.find().sort({ createdAt: 1 });
    }
    res.json({ rooms: rooms.map((r) => r.toSummary()) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, type, inactivityMinutes } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });

    const roomType = ['public', 'private', 'ephemeral'].includes(type) ? type : 'public';

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
    if (['public', 'private', 'ephemeral'].includes(type)) room.type = type;

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

export default router;

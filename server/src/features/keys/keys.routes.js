import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.js';
import { Room } from '../rooms/room.model.js';

const router = Router();

router.use(requireAuth);

router.post('/:roomId/keys', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { encryptedKey } = req.body || {};

    if (!encryptedKey) return res.status(400).json({ error: 'encryptedKey required' });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });

    const isMember = room.members.some((m) => m.user.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ error: 'not a member' });

    const keyId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    room.encryptedKeys.push({ user: req.user.id, key: encryptedKey, keyId });

    await room.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:roomId/keys', async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });

    const isMember = room.members.some((m) => m.user.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ error: 'not a member' });

    const myKeys = room.encryptedKeys
      .filter((ek) => ek.user.toString() === req.user.id)
      .map((ek) => ({ key: ek.key, keyId: ek.keyId }));
    res.json({ encryptedKeys: myKeys });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:roomId/keys/all', async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });

    const isMember = room.members.some((m) => m.user.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ error: 'not a member' });

    const keys = room.encryptedKeys.map((ek) => ({
      user: ek.user.toString(),
      key: ek.key,
    }));

    res.json({ keys });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

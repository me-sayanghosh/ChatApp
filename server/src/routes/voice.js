import { Router } from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { requireAuth } from '../middleware/auth.js';
import { Room } from '../models/Room.js';

const router = Router();

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://your-livekit-server.com';

router.post('/:roomId/voice-token', requireAuth, async (req, res) => {
  try {
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      throw new Error('LiveKit not configured');
    }

    const room = await Room.findById(req.params.roomId);
    if (!room) throw new Error('room not found');
    if (!room.members.some((m) => m.user.toString() === req.user.id)) {
      throw new Error('not a member');
    }

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: req.user.id,
      name: req.user.username,
    });

    const roomName = room._id.toString();
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = at.toJwt();
    res.json({ token, url: LIVEKIT_URL, roomName });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

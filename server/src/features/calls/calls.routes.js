import { Router } from 'express';
import mongoose from 'mongoose';
import { CallLog } from './callLog.model.js';
import { User } from '../auth/user.model.js';
import { requireAuth } from '../../shared/middleware/auth.js';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/calls/history
 * Fetch call logs for current user (caller or receiver).
 */
router.get('/history', async (req, res) => {
  try {
    const userId = req.user.id;
    let logs = await CallLog.find({
      $or: [{ caller: userId }, { receiver: userId }],
    })
      .sort({ createdAt: -1 })
      .populate('caller', 'username name profileImage')
      .populate('receiver', 'username name profileImage')
      .populate('room', 'name')
      .limit(100);

    const clientLogs = logs.map((l) => l.toClient(userId));
    res.json({ logs: clientLogs });
  } catch (err) {
    console.error('[calls] history error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/calls/log
 * Create a new call log entry.
 */
router.post('/log', async (req, res) => {
  try {
    const { receiverId, roomId, type = 'voice', status = 'completed', durationSeconds = 0 } = req.body;
    const callerId = req.user.id;

    let validReceiver = null;
    if (receiverId && receiverId !== 'null' && receiverId !== 'undefined') {
      if (mongoose.Types.ObjectId.isValid(receiverId)) {
        validReceiver = receiverId;
      }
    }

    let validRoom = null;
    if (roomId && roomId !== 'null' && roomId !== 'undefined') {
      if (mongoose.Types.ObjectId.isValid(roomId)) {
        validRoom = roomId;
      }
    }

    const log = await CallLog.create({
      caller: callerId,
      receiver: validReceiver,
      room: validRoom,
      type: type === 'video' ? 'video' : 'voice',
      status: status || 'completed',
      durationSeconds: parseInt(durationSeconds, 10) || 0,
    });

    const populated = await CallLog.findById(log._id)
      .populate('caller', 'username name profileImage')
      .populate('receiver', 'username name profileImage')
      .populate('room', 'name');

    res.status(201).json({ log: populated.toClient(callerId) });
  } catch (err) {
    console.error('[calls] log error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/calls/history
 * Clear call history for current user.
 */
router.delete('/history', async (req, res) => {
  try {
    const userId = req.user.id;
    await CallLog.deleteMany({
      $or: [{ caller: userId }, { receiver: userId }],
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[calls] clear error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

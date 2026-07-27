import { User } from '../auth/user.model.js';
import {
  getPresenceMap,
  setTyping,
  removeTyping,
} from './presence.service.js';
import { setLastRead } from '../messages/readReceipts.service.js';

export function registerPresenceHandlers(socket, io, { joined }) {
  socket.on('user:typing', async ({ roomId }) => {
    try {
      if (!joined.has(roomId)) return;
      await setTyping(roomId, socket.user.id, 3000);
      socket.to(roomId).emit('user:typing', {
        roomId,
        user: { id: socket.user.id, username: socket.user.username },
      });
    } catch (err) {
      console.error('[socket] user:typing error:', err.message);
    }
  });

  socket.on('user:stopped-typing', async ({ roomId }) => {
    try {
      if (!joined.has(roomId)) return;
      await removeTyping(roomId, socket.user.id);
      socket.to(roomId).emit('user:stopped-typing', {
        roomId,
        userId: socket.user.id,
      });
    } catch (err) {
      console.error('[socket] user:stopped-typing error:', err.message);
    }
  });

  socket.on('message:read', async ({ roomId, lastReadMessageId }) => {
    try {
      if (!joined.has(roomId)) return;
      await setLastRead(roomId, socket.user.id, lastReadMessageId);
      socket.to(roomId).emit('message:read', {
        roomId,
        userId: socket.user.id,
        lastReadMessageId,
      });
    } catch (err) {
      console.error('[socket] message:read error:', err.message);
    }
  });

  socket.on('presence:request-map', async (ack) => {
    try {
      const map = await getPresenceMap();
      const enriched = {};
      for (const [userId, pres] of Object.entries(map)) {
        const user = await User.findById(userId).select('username').lean();
        enriched[userId] = { ...pres, username: user?.username || 'unknown' };
      }
      ack?.(enriched);
    } catch (err) {
      console.error('[socket] presence:request-map error:', err.message);
      ack?.({});
    }
  });
}

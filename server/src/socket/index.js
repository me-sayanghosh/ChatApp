import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createAdapter } from '@socket.io/redis-adapter';
import { User } from '../models/User.js';
import redis from '../config/redis.js';
import {
  setPresence,
  incrementPresence,
  decrementPresence,
  startHeartbeat,
} from '../services/presence.js';
import {
  registerRoomHandlers,
  registerMessageHandlers,
  registerPresenceHandlers,
  registerKeyHandlers,
} from './handlers/index.js';

let ioInstance = null;

export function getIO() {
  return ioInstance;
}

export function attachSocket(httpServer) {
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

  const io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();
  pubClient.on('error', (err) => console.error('[redis] pubClient error:', err.message));
  subClient.on('error', (err) => console.error('[redis] subClient error:', err.message));
  io.adapter(createAdapter(pubClient, subClient));
  ioInstance = io;

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('missing token'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.sub);
      if (!user) return next(new Error('user not found'));
      socket.user = {
        id: user._id.toString(),
        username: user.username,
        publicKeyJwk: socket.handshake.auth?.publicKeyJwk || null,
      };
      next();
    } catch (err) {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const joined = new Set();

    setPresence(socket.user.id, { status: 'online', currentRoom: null }).catch(() => {});
    incrementPresence(socket.user.id, socket.id).catch(() => {});
    const heartbeatInterval = startHeartbeat(socket.user.id, socket.id);
    io.emit('presence:update', { userId: socket.user.id, status: 'online', currentRoom: null });

    registerRoomHandlers(socket, io, { joined });
    registerMessageHandlers(socket, io, { joined });
    registerPresenceHandlers(socket, io, { joined });
    registerKeyHandlers(socket, io, { joined });

    socket.on('disconnect', async () => {
      try {
        clearInterval(heartbeatInterval);
        for (const roomId of joined) {
          socket.to(roomId).emit('room:user-left', { roomId, userId: socket.user.id });
        }
        const remaining = await decrementPresence(socket.user.id, socket.id).catch(() => 0);
        if (remaining === 0) {
          io.emit('presence:update', { userId: socket.user.id, status: 'offline', currentRoom: null });
        } else {
          const { clearUserCurrentRoom } = await import('../services/presence.js');
          clearUserCurrentRoom(socket.user.id).catch(() => {});
        }
      } catch (err) {
        console.error('[socket] disconnect error:', err.message);
      }
    });
  });

  console.log('[socket] attached');

  const close = () =>
    Promise.all([
      new Promise((resolve) => io.close(resolve)),
      pubClient.quit().catch(() => pubClient.disconnect()),
      subClient.quit().catch(() => subClient.disconnect()),
    ]);

  return { io, close };
}

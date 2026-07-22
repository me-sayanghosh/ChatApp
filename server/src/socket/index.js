import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Message } from '../models/Message.js';
import { Room } from '../models/Room.js';
import { User } from '../models/User.js';

export function attachSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('missing token'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.sub);
      if (!user) return next(new Error('user not found'));
      socket.user = { id: user._id.toString(), username: user.username };
      next();
    } catch (err) {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const joined = new Set(); // room ids this socket has joined

    socket.on('room:join', async ({ roomId }, ack) => {
      try {
        if (!roomId) throw new Error('roomId required');
        const room = await Room.findById(roomId);
        if (!room) throw new Error('room not found');
        socket.join(roomId);
        joined.add(roomId);
        socket.to(roomId).emit('room:user-joined', { roomId, user: socket.user });
        const sockets = await io.in(roomId).fetchSockets();
        const online = sockets.map((s) => s.user);
        ack?.({ ok: true, online });
        io.to(roomId).emit('room:online', { roomId, online });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('room:leave', async ({ roomId }, ack) => {
      socket.leave(roomId);
      joined.delete(roomId);
      socket.to(roomId).emit('room:user-left', { roomId, userId: socket.user.id });
      ack?.({ ok: true });
    });

    socket.on('message:send', async ({ roomId, text }, ack) => {
      try {
        if (!roomId || !text || !text.trim()) throw new Error('roomId and text required');
        if (!joined.has(roomId)) throw new Error('join the room before sending');
        const msg = await Message.create({ room: roomId, sender: socket.user.id, text: text.trim() });
        const payload = { ...msg.toClient(), sender: { id: socket.user.id, username: socket.user.username } };
        io.to(roomId).emit('message:new', { roomId, message: payload });
        ack?.({ ok: true, message: payload });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('disconnect', () => {
      for (const roomId of joined) {
        socket.to(roomId).emit('room:user-left', { roomId, userId: socket.user.id });
      }
    });
  });

  console.log('[socket] attached');
  return io;
}

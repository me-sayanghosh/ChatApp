import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createAdapter } from '@socket.io/redis-adapter';
import { Message } from '../models/Message.js';
import { Room } from '../models/Room.js';
import { User } from '../models/User.js';
import redis from '../config/redis.js';
import { checkSocketRateLimit } from '../middleware/rateLimit.js';
import {
  setPresence,
  incrementPresence,
  decrementPresence,
  startHeartbeat,
  reconcilePresence,
  removePresence,
  getPresenceMap,
  setUserCurrentRoom,
  clearUserCurrentRoom,
  setTyping,
  getTypingUsers,
  removeTyping,
} from '../services/presence.js';
import { setLastRead } from '../services/readReceipts.js';

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
    let typingTimeout = null;

    setPresence(socket.user.id, { status: 'online', currentRoom: null }).catch(() => {});
    incrementPresence(socket.user.id, socket.id).catch(() => {});
    const heartbeatInterval = startHeartbeat(socket.user.id, socket.id);
    io.emit('presence:update', { userId: socket.user.id, status: 'online', currentRoom: null });

    socket.on('room:join', async ({ roomId }, ack) => {
      try {
        if (!roomId) throw new Error('roomId required');
        const room = await Room.findById(roomId);
        if (!room) throw new Error('room not found');

        const isBanned = (room.bannedUsers || []).some((b) => b.user.toString() === socket.user.id);
        if (isBanned) throw new Error('you are banned from this room');

        const existingMember = room.members.find((m) => m.user.toString() === socket.user.id);

        if (room.type === 'private' && !existingMember) {
          throw new Error('not a member of this private room');
        }

        if (!existingMember) {
          room.members.push({
            user: socket.user.id,
            role: 'member',
            joinedAt: new Date(),
            muted: false,
          });
          await room.save();
        }

        if (room.type === 'ephemeral' && room.expiresAt) {
          room.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
          await room.save();
        }

        socket.join(roomId);
        joined.add(roomId);

        await setUserCurrentRoom(socket.user.id, roomId);
        io.emit('presence:update', { userId: socket.user.id, status: 'online', currentRoom: roomId });

        socket.to(roomId).emit('room:user-joined', { roomId, user: socket.user });

        const sockets = await io.in(roomId).fetchSockets();
        const online = sockets.map((s) => s.user);
        const memberUserIds = room.members.map((m) => m.user);
        const memberDocs = await User.find({ _id: { $in: memberUserIds } }).select('username').lean();
        const memberUsernameMap = new Map(memberDocs.map((u) => [u._id.toString(), u.username]));
        const members = room.members.map((m) => ({
          user: m.user.toString(),
          username: memberUsernameMap.get(m.user.toString()) || 'unknown',
          role: m.role,
          muted: m.muted,
        }));

        ack?.({ ok: true, online, members, roomType: room.type });
        io.to(roomId).emit('room:online', { roomId, online, members });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('room:leave', async ({ roomId }, ack) => {
      try {
        socket.leave(roomId);
        joined.delete(roomId);

        if (joined.size === 0) {
          await clearUserCurrentRoom(socket.user.id);
        }
        io.emit('presence:update', { userId: socket.user.id, status: 'online', currentRoom: joined.size > 0 ? [...joined][0] : null });

        socket.to(roomId).emit('room:user-left', { roomId, userId: socket.user.id });

        const socketsInRoom = await io.in(roomId).fetchSockets();
        const online = socketsInRoom.map((s) => s.user);
        io.to(roomId).emit('room:online', { roomId, online });

        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('message:send', async ({ roomId, text, clientMsgId, replyTo }, ack) => {
      try {
        if (!roomId || !text || !text.trim()) throw new Error('roomId and text required');

        const allowed = await checkSocketRateLimit(socket.user.id, 'message', { windowMs: 60000, max: 30 });
        if (!allowed) throw new Error('rate limit exceeded, slow down');

        const room = await Room.findById(roomId);
        if (!room) throw new Error('room not found');

        if (!joined.has(roomId)) throw new Error('join the room before sending');

        const isBanned = (room.bannedUsers || []).some((b) => b.user.toString() === socket.user.id);
        if (isBanned) {
          joined.delete(roomId);
          socket.leave(roomId);
          throw new Error('you are banned from this room');
        }

        const member = room.members.find((m) => m.user.toString() === socket.user.id);
        if (!member) {
          joined.delete(roomId);
          socket.leave(roomId);
          throw new Error('not a member of this room');
        }
        if (member.muted) throw new Error('you are muted in this room');

        if (clientMsgId) {
          const existing = await Message.findOne({ clientMsgId }).lean();
          if (existing) {
            const payload = { ...existing, roomId: existing.room.toString(), senderId: existing.sender.toString() };
            ack?.({ ok: true, message: payload });
            return;
          }
        }

        await removeTyping(roomId, socket.user.id);

        const msg = await Message.create({
          room: roomId,
          sender: socket.user.id,
          text: text.trim(),
          clientMsgId: clientMsgId || null,
          replyTo: replyTo || null,
        });
        const payload = { ...msg.toClient(), sender: { id: socket.user.id, username: socket.user.username }, replyTo: msg.replyTo ? msg.replyTo.toString() : null };
        io.to(roomId).emit('message:new', { roomId, message: payload });
        ack?.({ ok: true, message: payload });
      } catch (err) {
        if (err.code === 11000) {
          const existing = await Message.findOne({ clientMsgId }).lean();
          if (existing) {
            ack?.({ ok: true, message: { ...existing, roomId: existing.room.toString(), senderId: existing.sender.toString() } });
            return;
          }
        }
        ack?.({ ok: false, error: err.message });
        socket.emit('error', { message: err.message });
      }
    });

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

    socket.on('room:kick', async ({ roomId, userId, ban }, ack) => {
      try {
        const room = await Room.findById(roomId);
        if (!room) throw new Error('room not found');

        const self = room.members.find((m) => m.user.toString() === socket.user.id);
        if (!self || (self.role !== 'owner' && self.role !== 'moderator')) {
          throw new Error('no permission');
        }

        const target = room.members.find((m) => m.user.toString() === userId);
        if (!target) throw new Error('user not a member');
        if (target.role === 'owner') throw new Error('cannot kick the owner');
        if (self.role === 'moderator' && target.role === 'moderator') {
          throw new Error('moderators cannot kick other moderators');
        }

        if (ban) {
          const alreadyBanned = (room.bannedUsers || []).some((b) => b.user.toString() === userId);
          if (!alreadyBanned) {
            room.bannedUsers.push({ user: userId, bannedAt: new Date(), bannedBy: socket.user.id });
          }
        }

        room.members = room.members.filter((m) => m.user.toString() !== userId);
        room.encryptedKeys = room.encryptedKeys.filter((ek) => ek.user.toString() !== userId);
        await room.save();

        io.to(roomId).emit('room:user-kicked', { roomId, userId, banned: !!ban });
        const targetSockets = await io.in(roomId).fetchSockets();
        for (const s of targetSockets) {
          if (s.user.id === userId) {
            s.leave(roomId);
            s.emit('room:kicked', { roomId, banned: !!ban });
          }
        }

        const remaining = await io.in(roomId).fetchSockets();
        const online = remaining.map((s) => s.user);
        io.to(roomId).emit('room:online', { roomId, online });

        ack?.({ ok: true, banned: !!ban });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('message:delete', async ({ roomId, messageId }, ack) => {
      try {
        const room = await Room.findById(roomId);
        if (!room) throw new Error('room not found');

        const member = room.members.find((m) => m.user.toString() === socket.user.id);
        if (!member) throw new Error('not a member');

        const msg = await Message.findOne({ _id: messageId, room: roomId });
        if (!msg) throw new Error('message not found');

        const isSender = msg.sender.toString() === socket.user.id;
        const isMod = member.role === 'owner' || member.role === 'moderator';
        if (!isSender && !isMod) throw new Error('no permission');

        msg.deleted = true;
        msg.deletedBy = socket.user.id;
        msg.text = '';
        await msg.save();

        io.to(roomId).emit('message:deleted', { roomId, messageId });
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('message:delete-for-me', async ({ roomId, messageId }, ack) => {
      try {
        if (!roomId || !messageId) throw new Error('roomId and messageId required');
        const room = await Room.findById(roomId);
        if (!room) throw new Error('room not found');

        const member = room.members.find((m) => m.user.toString() === socket.user.id);
        if (!member) throw new Error('not a member');

        const msg = await Message.findOne({ _id: messageId, room: roomId });
        if (!msg) throw new Error('message not found');

        if (!msg.deletedFor.some((id) => id.toString() === socket.user.id)) {
          msg.deletedFor.push(socket.user.id);
          await msg.save();
        }

        socket.emit('message:deleted-for-me', { roomId, messageId });
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('message:thread-reply', async ({ roomId, parentMessageId, text, clientMsgId, replyTo }, ack) => {
      try {
        if (!roomId || !parentMessageId || !text || !text.trim()) {
          throw new Error('roomId, parentMessageId, and text required');
        }

        const allowed = await checkSocketRateLimit(socket.user.id, 'message', { windowMs: 60000, max: 30 });
        if (!allowed) throw new Error('rate limit exceeded, slow down');

        const room = await Room.findById(roomId);
        if (!room) throw new Error('room not found');

        if (!joined.has(roomId)) throw new Error('join the room before sending');

        const isBanned = (room.bannedUsers || []).some((b) => b.user.toString() === socket.user.id);
        if (isBanned) {
          joined.delete(roomId);
          socket.leave(roomId);
          throw new Error('you are banned from this room');
        }

        const member = room.members.find((m) => m.user.toString() === socket.user.id);
        if (!member) {
          joined.delete(roomId);
          socket.leave(roomId);
          throw new Error('not a member of this room');
        }
        if (member.muted) throw new Error('you are muted in this room');

        const parent = await Message.findOne({ _id: parentMessageId, room: roomId });
        if (!parent) throw new Error('parent message not found');

        if (clientMsgId) {
          const existing = await Message.findOne({ clientMsgId }).lean();
          if (existing) {
            const payload = { ...existing, roomId: existing.room.toString(), senderId: existing.sender.toString() };
            ack?.({ ok: true, message: payload });
            return;
          }
        }

        const msg = await Message.create({
          room: roomId,
          sender: socket.user.id,
          text: text.trim(),
          parentMessage: parentMessageId,
          clientMsgId: clientMsgId || null,
          replyTo: replyTo || null,
        });

        const payload = { ...msg.toClient(), sender: { id: socket.user.id, username: socket.user.username }, replyTo: msg.replyTo ? msg.replyTo.toString() : null };
        io.to(roomId).emit('message:new', { roomId, message: payload });
        io.to(roomId).emit('message:thread-reply', {
          roomId,
          parentMessageId,
          reply: payload,
        });
        ack?.({ ok: true, message: payload });
      } catch (err) {
        if (err.code === 11000) {
          const existing = await Message.findOne({ clientMsgId }).lean();
          if (existing) {
            ack?.({ ok: true, message: { ...existing, roomId: existing.room.toString(), senderId: existing.sender.toString() } });
            return;
          }
        }
        ack?.({ ok: false, error: err.message });
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('message:react', async ({ roomId, messageId, emoji }, ack) => {
      try {
        if (!roomId || !messageId || !emoji) throw new Error('roomId, messageId, and emoji required');
        if (!joined.has(roomId)) throw new Error('join the room first');

        const msg = await Message.findOne({ _id: messageId, room: roomId });
        if (!msg) throw new Error('message not found');

        const reaction = msg.reactions.find((r) => r.emoji === emoji);
        if (reaction) {
          const userIdx = reaction.users.findIndex((u) => u.toString() === socket.user.id);
          if (userIdx >= 0) {
            reaction.users.splice(userIdx, 1);
            if (reaction.users.length === 0) {
              msg.reactions = msg.reactions.filter((r) => r.emoji !== emoji);
            }
          } else {
            reaction.users.push(socket.user.id);
          }
        } else {
          msg.reactions.push({ emoji, users: [socket.user.id] });
        }

        await msg.save();

        const reactions = msg.reactions.map((r) => ({
          emoji: r.emoji,
          users: r.users.map((u) => u.toString()),
        }));

        io.to(roomId).emit('message:reaction', { roomId, messageId, reactions });
        ack?.({ ok: true, reactions });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('room:key-request', async ({ roomId, publicKeyJwk }, ack) => {
      try {
        if (!roomId) throw new Error('roomId required');
        if (!joined.has(roomId)) throw new Error('join the room first');

        const room = await Room.findById(roomId);
        if (!room) throw new Error('room not found');
        if (room.type !== 'private') throw new Error('key exchange only for private rooms');

        if (publicKeyJwk) {
          socket.user.publicKeyJwk = publicKeyJwk;
        }

        const myKeys = room.encryptedKeys.filter((ek) => ek.user.toString() === socket.user.id);
        if (myKeys.length > 0) {
          ack?.({
            ok: true,
            hasKey: true,
            encryptedKeys: myKeys.map((k) => ({ key: k.key, keyId: k.keyId })),
          });
          return;
        }

        const sockets = await io.in(roomId).fetchSockets();
        for (const s of sockets) {
          if (s.user.id !== socket.user.id) {
            s.emit('room:key-share-request', {
              roomId,
              requesterId: socket.user.id,
              requesterUsername: socket.user.username,
              requesterPublicKeyJwk: socket.user.publicKeyJwk,
            });
          }
        }

        ack?.({ ok: true, hasKey: false });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('room:key-share', async ({ roomId, targetUserId, encryptedKey }, ack) => {
      try {
        if (!roomId || !targetUserId || !encryptedKey) {
          throw new Error('roomId, targetUserId, and encryptedKey required');
        }
        if (!joined.has(roomId)) throw new Error('join the room first');

        const room = await Room.findById(roomId);
        if (!room) throw new Error('room not found');

        const targetSockets = await io.in(roomId).fetchSockets();
        for (const s of targetSockets) {
          if (s.user.id === targetUserId) {
            s.emit('room:key-receive', {
              roomId,
              encryptedKey,
              fromUserId: socket.user.id,
              fromUsername: socket.user.username,
            });
          }
        }

        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('room:key-store', async ({ roomId, encryptedKey }, ack) => {
      try {
        if (!roomId || !encryptedKey) throw new Error('roomId and encryptedKey required');
        if (!joined.has(roomId)) throw new Error('join the room first');

        const room = await Room.findById(roomId);
        if (!room) throw new Error('room not found');

        const keyId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        room.encryptedKeys.push({ user: socket.user.id, key: encryptedKey, keyId });
        await room.save();

        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('room:request-join', async ({ roomId }, ack) => {
      try {
        if (!roomId) throw new Error('roomId required');
        const room = await Room.findById(roomId);
        if (!room) throw new Error('room not found');
        if (room.type !== 'private') throw new Error('only private rooms require join requests');

        const isBanned = (room.bannedUsers || []).some((b) => b.user.toString() === socket.user.id);
        if (isBanned) throw new Error('you are banned from this room');

        const isMember = room.members.some((m) => m.user.toString() === socket.user.id);
        if (isMember) throw new Error('already a member');

        const alreadyRequested = room.pendingRequests.some((r) => r.user.toString() === socket.user.id);
        if (alreadyRequested) throw new Error('request already pending');

        room.pendingRequests.push({ user: socket.user.id, requestedAt: new Date() });
        await room.save();

        io.to(roomId).emit('room:new-request', {
          roomId,
          user: { id: socket.user.id, username: socket.user.username },
          requestedAt: new Date(),
        });

        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('room:grant-join', async ({ roomId, userId }, ack) => {
      try {
        if (!roomId || !userId) throw new Error('roomId and userId required');
        const room = await Room.findById(roomId);
        if (!room) throw new Error('room not found');

        const self = room.members.find((m) => m.user.toString() === socket.user.id);
        if (!self || (self.role !== 'owner' && self.role !== 'moderator')) {
          throw new Error('only admins can grant requests');
        }

        const requestIndex = room.pendingRequests.findIndex((r) => r.user.toString() === userId);
        if (requestIndex === -1) throw new Error('request not found');

        room.pendingRequests.splice(requestIndex, 1);
        room.members.push({ user: userId, role: 'member', joinedAt: new Date(), muted: false });
        await room.save();

        io.to(roomId).emit('room:request-granted', { roomId, userId });
        io.to(roomId).emit('room:user-joined', { roomId, user: { id: userId } });

        const sockets = await io.in(roomId).fetchSockets();
        const online = sockets.map((s) => s.user);
        const memberUserIds2 = room.members.map((m) => m.user);
        const memberDocs2 = await User.find({ _id: { $in: memberUserIds2 } }).select('username').lean();
        const memberUsernameMap2 = new Map(memberDocs2.map((u) => [u._id.toString(), u.username]));
        const members = room.members.map((m) => ({
          user: m.user.toString(),
          username: memberUsernameMap2.get(m.user.toString()) || 'unknown',
          role: m.role,
          muted: m.muted,
        }));
        io.to(roomId).emit('room:online', { roomId, online, members });

        const targetSockets = await io.in(roomId).fetchSockets();
        for (const s of targetSockets) {
          if (s.user.id === userId) {
            s.emit('room:auto-join', { roomId });
          }
        }

        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('room:deny-join', async ({ roomId, userId }, ack) => {
      try {
        if (!roomId || !userId) throw new Error('roomId and userId required');
        const room = await Room.findById(roomId);
        if (!room) throw new Error('room not found');

        const self = room.members.find((m) => m.user.toString() === socket.user.id);
        if (!self || (self.role !== 'owner' && self.role !== 'moderator')) {
          throw new Error('only admins can deny requests');
        }

        const requestIndex = room.pendingRequests.findIndex((r) => r.user.toString() === userId);
        if (requestIndex === -1) throw new Error('request not found');

        room.pendingRequests.splice(requestIndex, 1);
        await room.save();

        io.to(roomId).emit('room:request-denied', { roomId, userId });

        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

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

import { Room } from './room.model.js';
import { User } from '../auth/user.model.js';
import { setUserCurrentRoom, clearUserCurrentRoom } from '../presence/presence.service.js';

export function registerRoomHandlers(socket, io, { joined }) {
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
}

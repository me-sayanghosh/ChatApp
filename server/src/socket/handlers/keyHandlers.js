import { Room } from '../../models/Room.js';
import { generateKeyId } from '../../utils/errors.js';

export function registerKeyHandlers(socket, io, { joined }) {
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

      const keyId = generateKeyId();
      room.encryptedKeys.push({ user: socket.user.id, key: encryptedKey, keyId });
      await room.save();

      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
      socket.emit('error', { message: err.message });
    }
  });
}

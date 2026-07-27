import { Message } from './message.model.js';
import { Room } from '../rooms/room.model.js';
import { User } from '../auth/user.model.js';
import { checkSocketRateLimit } from '../../shared/middleware/rateLimit.js';
import { removeTyping } from '../presence/presence.service.js';
import { createNotification } from '../notifications/notifications.service.js';

/**
 * Parse @username mentions from raw text.
 * Returns an array of unique usernames found.
 */
function parseMentions(text) {
  const matches = text.match(/@(\w+)/g) || [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

/**
 * Resolve usernames to user IDs and filter out the sender.
 */
async function resolveMentionIds(usernames, senderId) {
  if (usernames.length === 0) return [];
  const users = await User.find({ username: { $in: usernames } }).select('_id').lean();
  return users.map((u) => u._id).filter((id) => id.toString() !== senderId);
}

export function registerMessageHandlers(socket, io, { joined }) {
  socket.on('message:send', async ({ roomId, text = '', attachments = [], clientMsgId, replyTo, forwardedFrom }, ack) => {
    try {
      const trimmedText = typeof text === 'string' ? text.trim() : '';
      if (!roomId || (!trimmedText && (!attachments || attachments.length === 0))) {
        throw new Error('roomId and message text or attachment required');
      }

      const allowed = await checkSocketRateLimit(socket.user.id, 'message', { windowMs: 60000, max: 30 });
      if (!allowed) throw new Error('rate limit exceeded, slow down');

      const room = await Room.findById(roomId);
      if (!room) throw new Error('room not found');

      if (!joined.has(roomId)) {
        const existingMember = room.members.find((m) => m.user.toString() === socket.user.id);
        if (!existingMember) {
          if (room.type === 'public') {
            room.members.push({ user: socket.user.id, role: 'member', joinedAt: new Date(), muted: false });
            await room.save();
          } else {
            throw new Error('not a member of this room');
          }
        }
        socket.join(roomId);
        joined.add(roomId);
      }

      const member = room.members.find((m) => m.user.toString() === socket.user.id);
      if (member && member.muted) throw new Error('you are muted in this room');

      if (room.isDM && room.dmStatus === 'pending') {
        if (room.dmInitiator?.toString() !== socket.user.id) {
          throw new Error('DM request is pending acceptance');
        }
        const existingCount = await Message.countDocuments({ room: roomId });
        if (existingCount > 0) {
          throw new Error('Wait for the recipient to accept your DM request');
        }
      }

      if (clientMsgId) {
        const existing = await Message.findOne({ clientMsgId }).lean();
        if (existing) {
          const payload = { ...existing, roomId: existing.room.toString(), senderId: existing.sender.toString() };
          ack?.({ ok: true, message: payload });
          return;
        }
      }

      await removeTyping(roomId, socket.user.id);

      // Resolve @mentions
      const mentionedUsernames = parseMentions(trimmedText);
      const mentionIds = await resolveMentionIds(mentionedUsernames, socket.user.id);

      const msg = await Message.create({
        room: roomId,
        sender: socket.user.id,
        text: trimmedText,
        attachments: Array.isArray(attachments) ? attachments : [],
        clientMsgId: clientMsgId || null,
        replyTo: replyTo || null,
        forwardedFrom: forwardedFrom || null,
        mentions: mentionIds,
      });
      const payload = {
        ...msg.toClient(),
        sender: { id: socket.user.id, username: socket.user.username },
        replyTo: msg.replyTo ? msg.replyTo.toString() : null,
      };
      io.to(roomId).emit('message:new', { roomId, message: payload });

      // Notify each mentioned user via their personal socket room and persist notification
      for (const mentionedId of mentionIds) {
        io.to(`user:${mentionedId.toString()}`).emit('message:mention', {
          roomId,
          messageId: msg._id.toString(),
          fromUsername: socket.user.username,
          text: text.trim().substring(0, 120),
          roomName: room.name,
        });

        createNotification({
          userId: mentionedId,
          actorId: socket.user.id,
          type: 'mention',
          title: `@${socket.user.username} mentioned you in #${room.name}`,
          message: text.trim().substring(0, 100),
          link: '/chat',
          roomId,
          messageId: msg._id,
        }).catch((e) => console.error('[mention notification] error:', e.message));
      }

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

  // Message Edit Event
  socket.on('message:edit', async ({ roomId, messageId, text }, ack) => {
    try {
      if (!roomId || !messageId || !text?.trim()) throw new Error('roomId, messageId, and text required');
      if (!joined.has(roomId)) throw new Error('join the room first');

      const msg = await Message.findOne({ _id: messageId, room: roomId });
      if (!msg) throw new Error('message not found');
      if (msg.sender.toString() !== socket.user.id) throw new Error('only the author can edit this message');
      if (msg.deleted) throw new Error('cannot edit deleted message');

      msg.text = text.trim();
      msg.edited = true;
      msg.editedAt = new Date();
      await msg.save();

      const payload = {
        messageId: msg._id.toString(),
        roomId,
        text: msg.text,
        edited: true,
        editedAt: msg.editedAt,
      };

      io.to(roomId).emit('message:edited', payload);
      ack?.({ ok: true, message: payload });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  // Message Pin Event
  socket.on('message:pin', async ({ roomId, messageId }, ack) => {
    try {
      if (!roomId || !messageId) throw new Error('roomId and messageId required');
      if (!joined.has(roomId)) throw new Error('join the room first');

      const room = await Room.findById(roomId);
      if (!room) throw new Error('room not found');

      const msg = await Message.findOne({ _id: messageId, room: roomId });
      if (!msg) throw new Error('message not found');

      if (!room.pinnedMessages) room.pinnedMessages = [];
      if (!room.pinnedMessages.some((p) => p.toString() === messageId)) {
        room.pinnedMessages.push(messageId);
        await room.save();
      }

      const pinnedIds = room.pinnedMessages.map((p) => p.toString());
      io.to(roomId).emit('message:pinned', { roomId, messageId, pinnedMessages: pinnedIds });
      ack?.({ ok: true, pinnedMessages: pinnedIds });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  // Message Unpin Event
  socket.on('message:unpin', async ({ roomId, messageId }, ack) => {
    try {
      if (!roomId || !messageId) throw new Error('roomId and messageId required');
      if (!joined.has(roomId)) throw new Error('join the room first');

      const room = await Room.findById(roomId);
      if (!room) throw new Error('room not found');

      if (room.pinnedMessages) {
        room.pinnedMessages = room.pinnedMessages.filter((p) => p.toString() !== messageId);
        await room.save();
      }

      const pinnedIds = (room.pinnedMessages || []).map((p) => p.toString());
      io.to(roomId).emit('message:unpinned', { roomId, messageId, pinnedMessages: pinnedIds });
      ack?.({ ok: true, pinnedMessages: pinnedIds });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });
}

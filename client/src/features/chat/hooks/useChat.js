import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../../shared/context/AuthContext.jsx';
import {
  getSocket,
  sendOffline,
  setLastSeenMessage,
  getLastSeenMessages,
  onReconnect,
  api,
} from '../../../shared/utils/index.js';
import {
  getPublicKeyJwk,
  encryptRoomKey,
  decryptRoomKey,
  generateRoomKey,
  encryptText,
  decryptText,
  storeRoomKey,
  getRoomKey,
  clearRoomKey,
} from '../../../shared/utils/crypto.js';

export default function useChat() {
  const { user, logout } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [online, setOnline] = useState([]);
  const [members, setMembers] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [showPresence, setShowPresence] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [presenceMap, setPresenceMap] = useState({});
  const [readReceipts, setReadReceipts] = useState({});
  const [threadMessage, setThreadMessage] = useState(null);
  const [threadCounts, setThreadCounts] = useState({});
  const [decryptedMessages, setDecryptedMessages] = useState({});
  const [keyStatus, setKeyStatus] = useState(null);
  const [currentInput, setCurrentInput] = useState('');
  const [memberRooms, setMemberRooms] = useState(new Set());
  const [pendingRooms, setPendingRooms] = useState(new Set());
  const [replyTo, setReplyTo] = useState(null);
  const [replyToData, setReplyToData] = useState({});
  const [membersMap, setMembersMap] = useState({});
  const [toast, setToast] = useState(null);
  // unreadCounts: { [roomId]: number } — resets to 0 when room is opened
  const [unreadCounts, setUnreadCounts] = useState({});
  // mentionAlerts: [{ roomId, roomName, fromUsername, text, messageId }]
  const [mentionAlerts, setMentionAlerts] = useState([]);

  const socketRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const decryptedMessagesRef = useRef(decryptedMessages);
  useEffect(() => { decryptedMessagesRef.current = decryptedMessages; }, [decryptedMessages]);
  const currentRoomRef = useRef(null);
  useEffect(() => { currentRoomRef.current = currentRoom?.id; }, [currentRoom]);

  const isPrivate = currentRoom?.type === 'private';
  const hasKey = isPrivate && getRoomKey(currentRoom?.id);

  useEffect(() => {
    const map = {};
    for (const m of members) {
      map[m.user] = m.username;
    }
    setMembersMap(map);
  }, [members]);

  useEffect(() => {
    const map = {};
    for (const m of messages) {
      if (m.replyToData) {
        map[m.replyTo] = m.replyToData;
      }
    }
    setReplyToData(map);
  }, [messages]);

  const fetchRooms = useCallback(() => {
    api.get('/rooms')
      .then((r) => {
        const fetchedRooms = r.data.rooms || [];
        setRooms(fetchedRooms);
        setMemberRooms(new Set(r.data.memberships || []));
        setPendingRooms(new Set(r.data.pending || []));
        if (fetchedRooms.length > 0 && !currentRoomRef.current) {
          const firstMemberRoom = fetchedRooms.find((room) => (r.data.memberships || []).includes(room.id));
          selectRoom(firstMemberRoom || fetchedRooms[0]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  async function maybeDecrypt(roomId, message) {
    const aesKey = getRoomKey(roomId);
    if (!aesKey || !message.text || message.deleted) return;
    try {
      const text = await decryptText(aesKey, message.text);
      setDecryptedMessages((prev) => ({ ...prev, [message.id]: text }));
    } catch {
      setDecryptedMessages((prev) => ({ ...prev, [message.id]: '[decryption failed]' }));
    }
  }

  async function initiateKeyExchange(roomId) {
    const socket = getSocket();
    if (!socket) return;

    const publicKeyJwk = await getPublicKeyJwk();
    socket.emit('room:key-request', { roomId, publicKeyJwk }, async (resp) => {
      if (!resp?.ok) return;
      if (resp.hasKey) {
        try {
          const stored = localStorage.getItem('chatapp:userRsaKeys');
          if (!stored) return;
          const { privateKeyJwk } = JSON.parse(stored);
          const privKey = await crypto.subtle.importKey(
            'jwk', privateKeyJwk,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            false, ['decrypt']
          );
          for (const enc of resp.encryptedKeys) {
            try {
              const aesKey = await decryptRoomKey(privKey, enc.key);
              storeRoomKey(roomId, aesKey);
              setKeyStatus('ready');
              return;
            } catch { /* try next key */ }
          }
          setKeyStatus('error');
        } catch (err) {
          console.error('key decrypt failed:', err);
          setKeyStatus('error');
        }
      } else {
        setKeyStatus('waiting');
      }
    });
  }

  async function handleKeyReceive({ roomId, encryptedKey, fromUserId, fromUsername }) {
    try {
      const stored = localStorage.getItem('chatapp:userRsaKeys');
      if (!stored) return;
      const { privateKeyJwk } = JSON.parse(stored);
      const privateKey = await crypto.subtle.importKey(
        'jwk', privateKeyJwk,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false, ['decrypt']
      );
      const aesKey = await decryptRoomKey(privateKey, encryptedKey);
      storeRoomKey(roomId, aesKey);
      setKeyStatus('ready');

      if (roomId === currentRoomRef.current) {
        setMessages((prev) => {
          for (const msg of prev) {
            if (!msg.deleted && msg.text && !decryptedMessagesRef.current[msg.id]) {
              maybeDecrypt(roomId, msg);
            }
          }
          return prev;
        });
      }

      const socket = getSocket();
      if (socket) {
        const pubJwk = await getPublicKeyJwk();
        const myEncrypted = await encryptRoomKey(pubJwk, aesKey);
        socket.emit('room:key-store', { roomId, encryptedKey: myEncrypted });
      }
    } catch (err) {
      console.error('key receive decrypt failed:', err);
    }
  }

  async function setupPrivateRoom(room) {
    const roomId = room.id;
    if (getRoomKey(roomId)) {
      setKeyStatus('ready');
      return;
    }

    const socket = getSocket();
    if (!socket) return;

    socket.off('room:key-receive');
    socket.once('room:key-receive', handleKeyReceive);
    initiateKeyExchange(roomId);
  }

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;

    if (currentRoomRef.current) {
      socket.emit('room:join', { roomId: currentRoomRef.current });
    }

    onReconnect(() => {
      if (currentRoomRef.current) {
        getSocket()?.emit('room:join', { roomId: currentRoomRef.current });
      }
    });

    socket.on('message:new', ({ roomId, message }) => {
      if (roomId === currentRoomRef.current) {
        if (message.parentMessage) {
          setThreadCounts((prev) => ({
            ...prev,
            [message.parentMessage]: (prev[message.parentMessage] || 0) + 1,
          }));
        } else {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message];
          });
          if (currentRoomRef.current && getRoomKey(currentRoomRef.current) && message.text) {
            maybeDecrypt(currentRoomRef.current, message);
          }
        }
        setLastSeenMessage(roomId, message.id);
      } else {
        // Increment unread count for rooms not currently open
        setUnreadCounts((prev) => ({ ...prev, [roomId]: (prev[roomId] || 0) + 1 }));
      }
    });

    // @mention notifications
    socket.on('message:mention', (alert) => {
      setMentionAlerts((prev) => [alert, ...prev].slice(0, 50));
      // Also bump unread count for the mentioned room if not active
      if (alert.roomId !== currentRoomRef.current) {
        setUnreadCounts((prev) => ({ ...prev, [alert.roomId]: (prev[alert.roomId] || 0) + 1 }));
      }
    });

    socket.on('room:online', ({ roomId, online: onlineUsers, members: roomMembers }) => {
      if (roomId === currentRoomRef.current) {
        setOnline(onlineUsers);
        if (roomMembers) setMembers(roomMembers);
      }
    });

    socket.on('message:edited', ({ roomId, messageId, text, edited, editedAt }) => {
      if (roomId === currentRoomRef.current) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, text, edited, editedAt } : m))
        );
      }
    });

    socket.on('message:pinned', ({ roomId, pinnedMessages }) => {
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, pinnedMessages } : r))
      );
    });

    socket.on('message:unpinned', ({ roomId, pinnedMessages }) => {
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, pinnedMessages } : r))
      );
    });

    socket.on('message:deleted', ({ roomId, messageId }) => {
      if (roomId === currentRoomRef.current) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, deleted: true, text: '' } : m))
        );
        setDecryptedMessages((prev) => { const n = { ...prev }; delete n[messageId]; return n; });
      }
    });

    socket.on('message:deleted-for-me', ({ roomId, messageId }) => {
      if (roomId === currentRoomRef.current) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    });

    socket.on('message:reaction', ({ roomId, messageId, reactions }) => {
      if (roomId === currentRoomRef.current) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
        );
      }
    });

    socket.on('room:user-kicked', ({ roomId, userId }) => {
      if (roomId === currentRoomRef.current) {
        setMembers((prev) => prev.filter((m) => m.user !== userId));
      }
    });

    socket.on('room:kicked', ({ roomId }) => {
      if (roomId === currentRoomRef.current) {
        setCurrentRoom(null);
        setMessages([]);
        setOnline([]);
        setMembers([]);
        setTypingUsers([]);
        setThreadMessage(null);
        setThreadCounts({});
        setDecryptedMessages({});
        setKeyStatus(null);
        setReplyTo(null);
        clearRoomKey(roomId);
        fetchRooms();
      }
    });

    socket.on('user:typing', ({ roomId, user: typingUser }) => {
      if (roomId === currentRoomRef.current && typingUser.id !== userRef.current?.id) {
        setTypingUsers((prev) => {
          if (prev.find((u) => u.id === typingUser.id)) return prev;
          return [...prev, typingUser];
        });
      }
    });

    socket.on('user:stopped-typing', ({ roomId, userId }) => {
      if (roomId === currentRoomRef.current) {
        setTypingUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    });

    socket.on('message:read', ({ roomId, userId, lastReadMessageId }) => {
      if (roomId === currentRoomRef.current) {
        setReadReceipts((prev) => ({ ...prev, [userId]: lastReadMessageId }));
        if (userId === userRef.current?.id) {
          setLastSeenMessage(roomId, lastReadMessageId);
        }
      }
    });

    socket.on('presence:update', ({ userId, status, currentRoom: room }) => {
      setPresenceMap((prev) => ({
        ...prev,
        [userId]: { status, currentRoom: room, username: prev[userId]?.username || userId.slice(0, 8) },
      }));
    });

    socket.on('room:key-share-request', async ({ roomId, requesterId, requesterPublicKeyJwk }) => {
      const aesKey = getRoomKey(roomId);
      if (!aesKey || !requesterPublicKeyJwk) return;
      try {
        const encryptedKey = await encryptRoomKey(requesterPublicKeyJwk, aesKey);
        socket.emit('room:key-share', {
          roomId,
          targetUserId: requesterId,
          encryptedKey,
        });
      } catch (err) {
        console.error('[crypto] key share failed:', err);
      }
    });

    socket.on('room:request-granted', ({ roomId, userId }) => {
      if (userId === userRef.current?.id) {
        setMemberRooms((prev) => new Set([...prev, roomId]));
        setPendingRooms((prev) => { const next = new Set(prev); next.delete(roomId); return next; });
        fetchRooms();
      }
    });

    socket.on('room:request-denied', ({ roomId, userId }) => {
      if (userId === userRef.current?.id) {
        setPendingRooms((prev) => { const next = new Set(prev); next.delete(roomId); return next; });
      }
    });

    socket.on('room:auto-join', ({ roomId }) => {
      const room = rooms.find((r) => r.id === roomId);
      if (room) selectRoom(room);
    });

    return () => {
      socket.off('message:new');
      socket.off('room:online');
      socket.off('message:deleted');
      socket.off('message:deleted-for-me');
      socket.off('message:reaction');
      socket.off('room:user-kicked');
      socket.off('room:kicked');
      socket.off('user:typing');
      socket.off('user:stopped-typing');
      socket.off('message:read');
      socket.off('presence:update');
      socket.off('room:key-receive');
      socket.off('room:key-share-request');
      socket.off('room:request-granted');
      socket.off('room:request-denied');
      socket.off('room:auto-join');
      socket.off('message:mention');
    };
  }, [user]);

  useEffect(() => {
    onReconnect(async () => {
      const lastSeen = getLastSeenMessages();
      const roomsToBackfill = Object.entries(lastSeen)
        .filter(([, msgId]) => msgId)
        .map(([roomId, after]) => ({ roomId, after }));

      if (roomsToBackfill.length === 0) return;

      try {
        const res = await api.post('/rooms/messages/backfill', { rooms: roomsToBackfill });
        const backfill = res.data.backfill || {};

        for (const [roomId, newMsgs] of Object.entries(backfill)) {
          if (!newMsgs || newMsgs.length === 0) continue;

          if (roomId === currentRoomRef.current) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const unique = newMsgs.filter((m) => !existingIds.has(m.id));
              return [...prev, ...unique];
            });

            for (const msg of newMsgs) {
              if (getRoomKey(roomId) && !msg.deleted && msg.text) {
                maybeDecrypt(roomId, msg);
              }
            }
          }

          const lastNew = newMsgs[newMsgs.length - 1];
          setLastSeenMessage(roomId, lastNew.id);
        }
      } catch {
        // backfill failed, will retry on next reconnect
      }
    });

    const socket = getSocket();
    if (!socket) return;
    socket.emit('presence:request-map', (map) => {
      if (map) {
        const enriched = {};
        for (const [userId, pres] of Object.entries(map)) {
          enriched[userId] = { ...pres, username: pres.username || userId.slice(0, 8) };
        }
        setPresenceMap(enriched);
      }
    });
  }, []);

  async function selectRoom(room) {
    if (!room) return;
    const socket = socketRef.current;
    if (currentRoom && socket) socket.emit('room:leave', { roomId: currentRoom.id });
    setCurrentRoom(room);
    setMessages([]);
    setOnline([]);
    setMembers([]);
    setTypingUsers([]);
    setReadReceipts({});
    setThreadMessage(null);
    setThreadCounts({});
    setDecryptedMessages({});
    setKeyStatus(null);
    setReplyTo(null);
    // Clear unread count for this room
    setUnreadCounts((prev) => { const n = { ...prev }; delete n[room.id]; return n; });

    const isMember = memberRooms.has(room.id);
    if (room.type === 'private' && !isMember) return;

    const res = await api.get(`/rooms/${room.id}/messages`);
    let msgs = res.data.messages || [];

    if (room.type === 'private') {
      await setupPrivateRoom(room);
    }

    setMessages(msgs);

    if (msgs.length > 0) {
      setLastSeenMessage(room.id, msgs[msgs.length - 1].id);
    }

    if (room.type === 'private' && getRoomKey(room.id)) {
      for (const msg of msgs) {
        if (!msg.deleted && msg.text) {
          maybeDecrypt(room.id, msg);
        }
      }
    }

    if (socket) {
      socket.emit('room:join', { roomId: room.id }, (resp) => {
        if (resp?.ok) {
          setOnline(resp.online);
          if (resp.members) setMembers(resp.members);
        }
      });
    }
  }

  function leaveRoom(room) {
    const socket = socketRef.current;
    if (socket) socket.emit('room:leave', { roomId: room.id });
    if (currentRoom?.id === room.id) {
      setCurrentRoom(null);
      setMessages([]);
      setOnline([]);
      setMembers([]);
      setTypingUsers([]);
      setThreadMessage(null);
      setDecryptedMessages({});
      setKeyStatus(null);
      setReplyTo(null);
    }
  }

  function handleRequestJoin(room) {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('room:request-join', { roomId: room.id }, (resp) => {
      if (resp?.ok) {
        setPendingRooms((prev) => new Set([...prev, room.id]));
      }
    });
  }

  async function createRoom(name, type, inactivityMinutes) {
    const body = { name, type };
    if (type === 'ephemeral' && inactivityMinutes) body.inactivityMinutes = inactivityMinutes;
    const res = await api.post('/rooms', body);
    const data = res.data;
    setRooms((prev) => (prev.find((r) => r.id === data.room.id) ? prev : [...prev, data.room]));

    if (type === 'private') {
      try {
        const aesKey = await generateRoomKey();
        storeRoomKey(data.room.id, aesKey);
        const pubJwk = await getPublicKeyJwk();
        const encrypted = await encryptRoomKey(pubJwk, aesKey);
        const socket = getSocket();
        if (socket) {
          socket.emit('room:key-store', { roomId: data.room.id, encryptedKey: encrypted });
        }
        setKeyStatus('ready');
      } catch (err) {
        console.error('key generation failed:', err);
      }
    }

    selectRoom(data.room).catch(() => {});
  }

  async function send(text, attachments = []) {
    if (!currentRoom) return;
    let textToSend = text || '';

    if (isPrivate && hasKey && textToSend) {
      try {
        const aesKey = getRoomKey(currentRoom.id);
        textToSend = await encryptText(aesKey, text);
      } catch (err) {
        console.error('encrypt failed:', err);
        return;
      }
    }

    const clientMsgId = crypto.randomUUID();
    const payload = {
      roomId: currentRoom.id,
      text: textToSend,
      attachments: attachments || [],
      clientMsgId,
    };
    if (replyTo) {
      payload.replyTo = replyTo.id;
    }
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('room:join', { roomId: currentRoom.id });
    }
    sendOffline('message:send', payload);
    setReplyTo(null);
    if (isTypingRef.current) {
      const socket = getSocket();
      if (socket) socket.emit('user:stopped-typing', { roomId: currentRoom.id });
      isTypingRef.current = false;
    }
  }

  function handleTyping() {
    if (!currentRoom) return;
    const socket = getSocket();
    if (!socket) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('user:typing', { roomId: currentRoom.id });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('user:stopped-typing', { roomId: currentRoom.id });
      isTypingRef.current = false;
    }, 3000);
  }

  function deleteMessage(messageId) {
    if (!currentRoom) return;
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('message:delete', { roomId: currentRoom.id, messageId });
  }

  function deleteForMe(messageId) {
    if (!currentRoom) return;
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('message:delete-for-me', { roomId: currentRoom.id, messageId });
  }

  function handleReadReceipt(messageId) {
    if (!currentRoom) return;
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('message:read', { roomId: currentRoom.id, lastReadMessageId: messageId });
  }

  function handleReact(messageId, emoji) {
    if (!currentRoom) return;
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('message:react', { roomId: currentRoom.id, messageId, emoji });
  }

  function editMessage(messageId, newText) {
    if (!currentRoom || !messageId || !newText?.trim()) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('message:edit', { roomId: currentRoom.id, messageId, text: newText.trim() });
    }
  }

  function pinMessage(messageId) {
    if (!currentRoom || !messageId) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('message:pin', { roomId: currentRoom.id, messageId });
    }
  }

  function unpinMessage(messageId) {
    if (!currentRoom || !messageId) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('message:unpin', { roomId: currentRoom.id, messageId });
    }
  }

  async function forwardMessage(target, message) {
    const socket = getSocket();
    if (!socket || !target || !message) return;

    const forwardedFrom = {
      senderUsername: message.sender?.username || membersMap?.[message.senderId] || 'User',
      roomName: currentRoom?.name || 'chat',
    };

    if (target.type === 'channel') {
      socket.emit('message:send', {
        roomId: target.id,
        text: message.text || '',
        attachments: message.attachments || [],
        forwardedFrom,
      });
    } else {
      await api.post('/dm/send', {
        toUserId: target.id,
        text: message.text ? `[Forwarded from @${forwardedFrom.senderUsername}]: ${message.text}` : `[Forwarded attachment from @${forwardedFrom.senderUsername}]`,
      });
    }
  }

  async function loadOlderMessages() {
    if (!currentRoom || messages.length === 0) return;
    const oldestId = messages[0].id;
    try {
      const res = await api.get(`/rooms/${currentRoom.id}/messages?before=${oldestId}&limit=50`);
      const older = res.data.messages || [];
      if (older.length > 0) {
        setMessages((prev) => [...older, ...prev]);
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
    }
  }

  function refreshMembers() {
    if (!currentRoom) return;
    api.get(`/rooms/${currentRoom.id}/members`)
      .then((r) => setMembers(r.data.members || []));
  }

  const displayMessages = messages.map((m) => {
    if (decryptedMessages[m.id]) {
      return { ...m, text: decryptedMessages[m.id] };
    }
    return m;
  });

  return {
    user,
    logout,
    rooms,
    currentRoom,
    messages,
    displayMessages,
    online,
    members,
    showMembers,
    setShowMembers,
    showPresence,
    setShowPresence,
    typingUsers,
    presenceMap,
    readReceipts,
    threadMessage,
    setThreadMessage,
    threadCounts,
    decryptedMessages,
    keyStatus,
    currentInput,
    setCurrentInput,
    memberRooms,
    pendingRooms,
    replyTo,
    setReplyTo,
    replyToData,
    membersMap,
    toast,
    setToast,
    unreadCounts,
    mentionAlerts,
    setMentionAlerts,
    messagesContainerRef,
    isPrivate: currentRoom?.type === 'private',
    hasKey: currentRoom ? hasRoomKey(currentRoom.id) : false,
    selectRoom,
    leaveRoom,
    handleRequestJoin,
    createRoom,
    send,
    handleTyping,
    deleteMessage,
    deleteForMe,
    handleReadReceipt,
    handleReact,
    refreshMembers,
    editMessage,
    pinMessage,
    unpinMessage,
    forwardMessage,
    loadOlderMessages,
  };
}

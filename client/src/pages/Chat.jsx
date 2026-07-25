import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getSocket, sendOffline, setLastSeenMessage, getLastSeenMessages, onReconnect } from '../socket.js';
import { api } from '../api.js';
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
} from '../crypto.js';
import RoomList from '../components/RoomList.jsx';
import MessageList from '../components/MessageList.jsx';
import MessageInput from '../components/MessageInput.jsx';
import MemberList from '../components/MemberList.jsx';
import TypingIndicator from '../components/TypingIndicator.jsx';
import PresenceMap from '../components/PresenceMap.jsx';
import ThreadPanel from '../components/ThreadPanel.jsx';
import AIPanel from '../components/AIPanel.jsx';
import PendingRequests from '../components/PendingRequests.jsx';

export default function Chat() {
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
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const decryptedMessagesRef = useRef(decryptedMessages);
  useEffect(() => { decryptedMessagesRef.current = decryptedMessages; }, [decryptedMessages]);

  const isPrivate = currentRoom?.type === 'private';
  const hasKey = isPrivate && getRoomKey(currentRoom?.id);

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
      }
    });

    socket.on('room:online', ({ roomId, online: onlineUsers, members: roomMembers }) => {
      if (roomId === currentRoomRef.current) {
        setOnline(onlineUsers);
        if (roomMembers) setMembers(roomMembers);
      }
    });

    socket.on('message:deleted', ({ roomId, messageId }) => {
      if (roomId === currentRoomRef.current) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, deleted: true, text: '' } : m))
        );
        setDecryptedMessages((prev) => { const n = { ...prev }; delete n[messageId]; return n; });
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
    };
  }, [user]);

  const currentRoomRef = useRef(null);
  useEffect(() => { currentRoomRef.current = currentRoom?.id; }, [currentRoom]);

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

  async function createRoom(name, type) {
    const res = await api.post('/rooms', { name, type });
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

  async function send(text) {
    if (!currentRoom) return;
    let textToSend = text;

    if (isPrivate && hasKey) {
      try {
        const aesKey = getRoomKey(currentRoom.id);
        textToSend = await encryptText(aesKey, text);
      } catch (err) {
        console.error('encrypt failed:', err);
        return;
      }
    }

    const clientMsgId = crypto.randomUUID();
    sendOffline('message:send', { roomId: currentRoom.id, text: textToSend, clientMsgId });
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

  return (
    <div className="chat">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">💬</div>
          <span className="brand-title">ChatApp</span>
        </div>

        <div className="me-card">
          <div className="avatar">{user?.username?.[0]?.toUpperCase() || 'U'}</div>
          <div className="user-details">
            <span className="username">{user?.username}</span>
            <span className="status-badge"><span className="dot online"></span> Active</span>
          </div>
        </div>

        <RoomList
          rooms={rooms}
          current={currentRoom}
          onSelect={selectRoom}
          onCreate={createRoom}
          onLeave={leaveRoom}
          onRequestJoin={handleRequestJoin}
          memberRooms={memberRooms}
          pendingRooms={pendingRooms}
        />
        
        <button className="logout" onClick={logout}>
          <span>🚪</span> Log out
        </button>
      </aside>
      
      <main className="main">
        <header>
          {currentRoom ? (
            <>
              <h2>
                {currentRoom.type === 'private' && '🔒 '}
                {currentRoom.type === 'ephemeral' && '⏳ '}
                #{currentRoom.name}
                {currentRoom.type === 'private' && keyStatus === 'waiting' && <span className="key-status waiting"> (exchanging keys...)</span>}
                {currentRoom.type === 'private' && keyStatus === 'error' && <span className="key-status error"> (key error)</span>}
              </h2>
              <div className="header-right">
                <div className="online">
                  <span className="dot online"></span> {online.length} Online
                </div>
                <button
                  className={`members-toggle ${showPresence ? 'active' : ''}`}
                  onClick={() => { setShowPresence(!showPresence); setShowMembers(false); }}
                >
                  👤 Presence
                </button>
                <button
                  className={`members-toggle ${showMembers ? 'active' : ''}`}
                  onClick={() => { setShowMembers(!showMembers); setShowPresence(false); }}
                >
                  Members ({members.length})
                </button>
                <AIPanel roomId={currentRoom.id} currentInput={currentInput} />
              </div>
            </>
          ) : (
            <h2>Welcome to ChatApp</h2>
          )}
        </header>
        <div className="main-content">
          {currentRoom ? (
            <>
              <div className="chat-area">
                {isPrivate && keyStatus !== 'ready' && keyStatus !== null && (
                  <div className="encryption-notice">
                    {keyStatus === 'waiting' ? 'Waiting for encryption keys...' : 'Encryption key error'}
                  </div>
                )}
                <MessageList
                  messages={displayMessages}
                  meId={user?.id}
                  onDelete={deleteMessage}
                  members={members}
                  onRead={handleReadReceipt}
                  readReceipts={readReceipts}
                  onlineUserIds={online.map((u) => u.id)}
                  onOpenThread={setThreadMessage}
                  onReact={handleReact}
                  threadCounts={threadCounts}
                />
                <TypingIndicator typingUsers={typingUsers} />
                <MessageInput onSend={send} onTyping={handleTyping} onTextChange={setCurrentInput} />
              </div>
              {showMembers && (
                <aside className="members-panel">
                  <MemberList
                    members={members}
                    online={online}
                    roomId={currentRoom.id}
                    currentUserId={user?.id}
                    onMemberUpdate={refreshMembers}
                  />
                  <PendingRequests
                    roomId={currentRoom.id}
                    isAdmin={members.some((m) => m.user === user?.id && (m.role === 'owner' || m.role === 'moderator'))}
                    onRequestHandled={refreshMembers}
                  />
                </aside>
              )}
              {showPresence && (
                <aside className="members-panel">
                  <PresenceMap presenceMap={presenceMap} currentUserId={user?.id} />
                </aside>
              )}
              {threadMessage && (
                <ThreadPanel
                  parentMessage={threadMessage}
                  roomId={currentRoom.id}
                  meId={user?.id}
                  isPrivate={isPrivate}
                  onClose={() => setThreadMessage(null)}
                />
              )}
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <h3>No channel selected</h3>
              <p>Select a channel from the left sidebar or create a new one to start real-time messaging.</p>
              {rooms.length > 0 && (
                <button className="primary-action-btn" onClick={() => selectRoom(rooms[0])}>
                  Join #{rooms[0].name}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

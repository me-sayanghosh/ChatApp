import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import Channels from '../components/Channels.jsx';
import MessageList from '../components/MessageList.jsx';
import MessageInput from '../components/MessageInput.jsx';
import MemberList from '../components/MemberList.jsx';
import TypingIndicator from '../components/TypingIndicator.jsx';
import PresenceMap from '../components/PresenceMap.jsx';
import ThreadPanel from '../components/ThreadPanel.jsx';
import AIPanel from '../components/AIPanel.jsx';
import PendingRequests from '../components/PendingRequests.jsx';
import ScrollToBottom from '../components/ScrollToBottom.jsx';
import SuggestionsBar from '../components/SuggestionsBar.jsx';

export default function Chat() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
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
  const socketRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const decryptedMessagesRef = useRef(decryptedMessages);
  useEffect(() => { decryptedMessagesRef.current = decryptedMessages; }, [decryptedMessages]);

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
    setReplyTo(null);

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
    const payload = { roomId: currentRoom.id, text: textToSend, clientMsgId };
    if (replyTo) {
      payload.replyTo = replyTo.id;
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
          <span className="brand-title">DropTalk</span>
          <button className="sidebar-avatar" onClick={() => nav('/profile')} title="Profile Settings">
            {user?.profileImage ? (
              <img src={user.profileImage} alt="Profile" />
            ) : (
              <span>{(user?.username || 'U')[0].toUpperCase()}</span>
            )}
          </button>
        </div>

        <Channels
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Log out
        </button>
      </aside>

      <main className="main">
        <header className="chat-header">
          {currentRoom ? (
            <>
              <div className="header-left">
                <div className="header-room-icon" style={{ color: currentRoom.type === 'private' ? '#f59e0b' : currentRoom.type === 'ephemeral' ? '#a855f7' : '#38bdf8' }}>
                  {currentRoom.type === 'private' ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  ) : currentRoom.type === 'ephemeral' ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
                    </svg>
                  )}
                </div>
                <div className="header-room-info">
                  <h2 className="header-room-name">{currentRoom.name}</h2>
                  <div className="header-room-meta">
                    <span className="dot online"></span>
                    <span>{online.length} online</span>
                    <span className="header-sep">&middot;</span>
                    <span>{members.length} members</span>
                    {currentRoom.type === 'private' && keyStatus === 'waiting' && (
                      <span className="key-status waiting"> &middot; exchanging keys...</span>
                    )}
                    {currentRoom.type === 'private' && keyStatus === 'error' && (
                      <span className="key-status error"> &middot; key error</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="header-right">
                <button
                  className={`header-action ${showPresence ? 'active' : ''}`}
                  onClick={() => { setShowPresence(!showPresence); setShowMembers(false); }}
                  title="Presence"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </button>
                <button
                  className={`header-action ${showMembers ? 'active' : ''}`}
                  onClick={() => { setShowMembers(!showMembers); setShowPresence(false); }}
                  title="Members"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span className="header-action-count">{members.length}</span>
                </button>
                <AIPanel roomId={currentRoom.id} currentInput={currentInput} />
              </div>
            </>
          ) : (
            <h2>Welcome to DropTalk</h2>
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
                <div className="messages-container" ref={messagesContainerRef}>
                  <MessageList
                    messages={displayMessages}
                    meId={user?.id}
                    onDelete={deleteMessage}
                    onDeleteForMe={deleteForMe}
                    members={members}
                    onRead={handleReadReceipt}
                    readReceipts={readReceipts}
                    onlineUserIds={online.map((u) => u.id)}
                    onOpenThread={setThreadMessage}
                    onReact={handleReact}
                    threadCounts={threadCounts}
                    onReply={setReplyTo}
                    replyToData={replyToData}
                    membersMap={membersMap}
                  />
                  <ScrollToBottom containerRef={messagesContainerRef} />
                </div>
                <TypingIndicator typingUsers={typingUsers} />
                <SuggestionsBar
                  roomId={currentRoom.id}
                  currentInput={currentInput}
                  onSuggestionClick={(s) => setCurrentInput(s)}
                />
                <MessageInput
                  onSend={send}
                  onTyping={handleTyping}
                  onTextChange={setCurrentInput}
                  replyTo={replyTo}
                  onClearReply={() => setReplyTo(null)}
                  membersMap={membersMap}
                />
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
                  <PresenceMap presenceMap={presenceMap} currentUserId={user?.id} rooms={rooms} />
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
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
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

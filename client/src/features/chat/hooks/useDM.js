import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../shared/context/AuthContext.jsx';
import { getSocket } from '../../../shared/utils/index.js';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

function authHeader() {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function useDM() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [currentDM, setCurrentDM] = useState(null); // the room object
  const [dmMessages, setDmMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const socketRef = useRef(null);

  // Fetch all DM conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API}/dm/conversations`, {
        headers: { ...authHeader() },
      });
      if (!res.ok) return;
      const data = await res.json();
      const convos = data.conversations || [];
      setConversations(convos);
      setPendingCount(
        convos.filter(
          (c) => c.dmStatus === 'pending' && c.dmInitiator !== user?.id
        ).length
      );
    } catch (_) {}
  }, [user?.id]);

  // Fetch messages for a DM conversation
  const fetchDMMessages = useCallback(async (roomId) => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/dm/${roomId}/messages`, {
        headers: { ...authHeader() },
      });
      if (!res.ok) return;
      const data = await res.json();
      setDmMessages(data.messages || []);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, []);

  // Open a DM conversation
  const openDM = useCallback(
    async (room) => {
      setCurrentDM(room);
      await fetchDMMessages(room.id);
      // Join the socket room so we receive messages
      const socket = getSocket();
      socket?.emit('room:join', { roomId: room.id });
    },
    [fetchDMMessages]
  );

  // Send a DM from a group chat message (POST /api/dm/send)
  const sendDMRequest = useCallback(async (toUserId, initialText) => {
    try {
      const res = await fetch(`${API}/dm/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ toUserId, text: initialText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send DM');
      await fetchConversations();
      return data.room;
    } catch (err) {
      console.error('[useDM] sendDMRequest error:', err.message);
      throw err;
    }
  }, [fetchConversations]);

  // Send a message in an accepted DM via the normal message socket
  const sendDMMessage = useCallback(
    (text) => {
      if (!currentDM || !text.trim()) return;
      const socket = getSocket();
      const clientMsgId = crypto.randomUUID();
      socket?.emit(
        'message:send',
        { roomId: currentDM.id, text: text.trim(), clientMsgId },
        (ack) => {
          if (ack?.ok) {
            setDmMessages((prev) => {
              if (prev.some((m) => m.id === ack.message.id)) return prev;
              return [...prev, ack.message];
            });
          }
        }
      );
    },
    [currentDM]
  );

  // Accept a DM request
  const acceptDM = useCallback(
    async (roomId) => {
      const res = await fetch(`${API}/dm/${roomId}/accept`, {
        method: 'POST',
        headers: { ...authHeader() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to accept DM');
      setCurrentDM(data.room);
      setConversations((prev) =>
        prev.map((c) => (c.id === roomId ? { ...c, dmStatus: 'accepted' } : c))
      );
      setPendingCount((n) => Math.max(0, n - 1));
    },
    []
  );

  // Remove a DM conversation
  const removeDM = useCallback(
    async (roomId) => {
      const res = await fetch(`${API}/dm/${roomId}`, {
        method: 'DELETE',
        headers: { ...authHeader() },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove DM');
      }
      setConversations((prev) => prev.filter((c) => c.id !== roomId));
      if (currentDM?.id === roomId) {
        setCurrentDM(null);
        setDmMessages([]);
      }
      setPendingCount((n) => Math.max(0, n - 1));
    },
    [currentDM]
  );

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;

    function onMessageNew({ roomId, message }) {
      if (!currentDM || roomId !== currentDM.id) {
        // Update conversation list preview even if not open
        setConversations((prev) =>
          prev.map((c) =>
            c.id === roomId
              ? { ...c, lastMessage: { text: message.text, createdAt: message.createdAt } }
              : c
          )
        );
        return;
      }
      setDmMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    }

    function onDMNewRequest({ roomId, fromUserId, fromUsername }) {
      if (fromUserId === user?.id) return; // ignore self
      fetchConversations();
    }

    function onDMAccepted({ roomId, acceptedBy }) {
      setConversations((prev) =>
        prev.map((c) => (c.id === roomId ? { ...c, dmStatus: 'accepted' } : c))
      );
      if (currentDM?.id === roomId) {
        setCurrentDM((prev) => (prev ? { ...prev, dmStatus: 'accepted' } : prev));
      }
      if (acceptedBy !== user?.id) {
        // If the OTHER person accepted, update pending count
        setPendingCount((n) => Math.max(0, n - 1));
      }
    }

    function onDMRemoved({ roomId }) {
      setConversations((prev) => prev.filter((c) => c.id !== roomId));
      if (currentDM?.id === roomId) {
        setCurrentDM(null);
        setDmMessages([]);
      }
    }

    socket.on('message:new', onMessageNew);
    socket.on('dm:new-request', onDMNewRequest);
    socket.on('dm:accepted', onDMAccepted);
    socket.on('dm:removed', onDMRemoved);

    return () => {
      socket.off('message:new', onMessageNew);
      socket.off('dm:new-request', onDMNewRequest);
      socket.off('dm:accepted', onDMAccepted);
      socket.off('dm:removed', onDMRemoved);
    };
  }, [currentDM, user?.id, fetchConversations]);

  // Initial load
  useEffect(() => {
    if (user) fetchConversations();
  }, [user, fetchConversations]);

  return {
    conversations,
    currentDM,
    setCurrentDM,
    dmMessages,
    loading,
    pendingCount,
    openDM,
    sendDMRequest,
    sendDMMessage,
    acceptDM,
    removeDM,
    fetchConversations,
  };
}

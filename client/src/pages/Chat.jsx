import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getSocket } from '../socket.js';
import RoomList from '../components/RoomList.jsx';
import MessageList from '../components/MessageList.jsx';
import MessageInput from '../components/MessageInput.jsx';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

export default function Chat() {
  const { user, token, logout } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [online, setOnline] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;
    socket.on('message:new', ({ roomId, message }) => {
      if (roomId === currentRoomRef.current) {
        setMessages((prev) => [...prev, message]);
      }
    });
    socket.on('room:online', ({ roomId, online }) => {
      if (roomId === currentRoomRef.current) setOnline(online);
    });
    return () => {
      socket.off('message:new');
      socket.off('room:online');
    };
  }, []);

  const currentRoomRef = useRef(null);
  useEffect(() => { currentRoomRef.current = currentRoom?.id; }, [currentRoom]);

  useEffect(() => {
    fetch(`${API}/rooms`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setRooms(d.rooms || []))
      .catch(() => {});
  }, [token]);

  async function createRoom(name) {
    const res = await fetch(`${API}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'failed');
    setRooms((prev) => (prev.find((r) => r.id === data.room.id) ? prev : [...prev, data.room]));
    selectRoom(data.room);
  }

  function selectRoom(room) {
    if (!room) return;
    const socket = socketRef.current;
    if (currentRoom && socket) socket.emit('room:leave', { roomId: currentRoom.id });
    setCurrentRoom(room);
    setMessages([]);
    setOnline([]);
    fetch(`${API}/rooms/${room.id}/messages`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setMessages(d.messages || []));
    if (socket) {
      socket.emit('room:join', { roomId: room.id }, (resp) => {
        if (resp?.ok) setOnline(resp.online);
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
    }
  }

  function send(text) {
    if (!currentRoom) return;
    const socket = socketRef.current;
    socket.emit('message:send', { roomId: currentRoom.id, text }, (resp) => {
      if (!resp?.ok) console.warn('send failed:', resp?.error);
    });
  }

  return (
    <div className="chat">
      <aside className="sidebar">
        <div className="me">
          {user?.username} <small>online</small>
        </div>
        <RoomList rooms={rooms} current={currentRoom} onSelect={selectRoom} onCreate={createRoom} onLeave={leaveRoom} />
        <button className="logout" onClick={logout}>Log out</button>
      </aside>
      <main className="main">
        <header>
          {currentRoom ? (
            <>
              <h2>#{currentRoom.name}</h2>
              <div className="online">
                online: {online.length} {online.length > 0 ? `(${online.map((u) => u.username).join(', ')})` : ''}
              </div>
            </>
          ) : (
            <h2>Pick a room</h2>
          )}
        </header>
        {currentRoom ? (
          <>
            <MessageList messages={messages} meId={user?.id} />
            <MessageInput onSend={send} />
          </>
        ) : (
          <div className="empty">Create or pick a room on the left to start chatting.</div>
        )}
      </main>
    </div>
  );
}

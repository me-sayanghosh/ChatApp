import { useState } from 'react';
import AnimatedList from './AnimatedList.jsx';

const ROOM_TYPES = [
  { id: 'public', label: 'Public', icon: '#', color: '#38bdf8' },
  { id: 'private', label: 'Private (E2EE)', icon: '🔒', color: '#f59e0b' },
  { id: 'ephemeral', label: 'Ephemeral', icon: '⏳', color: '#a855f7' },
];

export default function Channels({ rooms, current, onSelect, onCreate, onLeave, onRequestJoin, memberRooms, pendingRooms }) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('public');
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!name.trim()) {
      setErr('Please enter a room name');
      return;
    }
    try {
      await onCreate(name.trim(), type);
      setName('');
      setType('public');
      setShowCreate(false);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
  }

  function renderRoom(room) {
    const typeObj = ROOM_TYPES.find((t) => t.id === (room.type || 'public')) || ROOM_TYPES[0];
    const isMember = memberRooms?.has(room.id);
    const isPending = pendingRooms?.has(room.id);
    const isPrivateNotMember = room.type === 'private' && !isMember;
    const isActive = current?.id === room.id;

    return (
      <div className={`channel-row ${isActive ? 'active' : ''} ${isPrivateNotMember ? 'private-locked' : ''}`}>
        <span className="room-type-icon" style={{ color: typeObj.color }}>
          {typeObj.icon}
        </span>
        <span className="room-name">{room.name}</span>
        {isPrivateNotMember ? (
          isPending ? (
            <span className="room-request-status pending">Requested</span>
          ) : (
            <button
              type="button"
              className="room-request-join"
              title={`Request to join #${room.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onRequestJoin?.(room);
              }}
            >
              Join
            </button>
          )
        ) : (
          <button
            type="button"
            className="room-leave"
            title={`Leave #${room.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onLeave?.(room);
            }}
          >
            &times;
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="room-list-container">
      <div className="room-list-header">
        <span className="section-title">CHANNELS</span>
        <button
          className={`create-room-btn ${showCreate ? 'active' : ''}`}
          onClick={() => setShowCreate(!showCreate)}
          title="Create Channel"
        >
          {showCreate ? '✕' : '+'}
        </button>
      </div>

      {showCreate && (
        <form className="new-room-form" onSubmit={submit}>
          <input
            placeholder="Channel name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <div className="room-type-pills">
            {ROOM_TYPES.map((t) => (
              <button
                type="button"
                key={t.id}
                className={`type-pill ${type === t.id ? 'selected' : ''}`}
                onClick={() => setType(t.id)}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
          {err && <div className="error">{err}</div>}
          <button type="submit" className="submit-room-btn">Create Channel</button>
        </form>
      )}

      <AnimatedList
        items={rooms}
        renderItem={renderRoom}
        onItemSelect={(room) => onSelect?.(room)}
        showGradients
        enableArrowNavigation
        displayScrollbar
      />
    </div>
  );
}

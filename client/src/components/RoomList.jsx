import { useState } from 'react';

const ROOM_TYPES = [
  { id: 'public', label: 'Public', icon: '#', color: '#38bdf8' },
  { id: 'private', label: 'Private (E2EE)', icon: '🔒', color: '#f59e0b' },
  { id: 'ephemeral', label: 'Ephemeral', icon: '⏳', color: '#a855f7' },
  { id: 'voice', label: 'Voice', icon: '🎙️', color: '#ec4899' },
];

export default function RoomList({ rooms, current, onSelect, onCreate, onLeave, onRequestJoin, memberRooms, pendingRooms }) {
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

  function leave(e, room) {
    e.stopPropagation();
    onLeave?.(room);
  }

  function requestJoin(e, room) {
    e.stopPropagation();
    onRequestJoin?.(room);
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

      <ul className="room-list">
        {rooms.map((r) => {
          const typeObj = ROOM_TYPES.find((t) => t.id === (r.type || 'public')) || ROOM_TYPES[0];
          const isMember = memberRooms?.has(r.id);
          const isPending = pendingRooms?.has(r.id);
          const isPrivateNotMember = r.type === 'private' && !isMember;

          return (
            <li
              key={r.id}
              className={`${current?.id === r.id ? 'active' : ''} ${isPrivateNotMember ? 'private-locked' : ''}`}
              onClick={() => !isPrivateNotMember && onSelect(r)}
            >
              <span className="room-type-icon" style={{ color: typeObj.color }}>
                {typeObj.icon}
              </span>
              <span className="room-name">{r.name}</span>
              {isPrivateNotMember ? (
                isPending ? (
                  <span className="room-request-status pending">Requested</span>
                ) : (
                  <button
                    type="button"
                    className="room-request-join"
                    title={`Request to join #${r.name}`}
                    onClick={(e) => requestJoin(e, r)}
                  >
                    Join
                  </button>
                )
              ) : (
                <button
                  type="button"
                  className="room-leave"
                  title={`Leave #${r.name}`}
                  onClick={(e) => leave(e, r)}
                >
                  &times;
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}


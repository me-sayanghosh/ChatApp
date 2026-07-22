import { useState } from 'react';

export default function RoomList({ rooms, current, onSelect, onCreate, onLeave }) {
  const [name, setName] = useState('');
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!name.trim()) return;
    try {
      await onCreate(name.trim());
      setName('');
    } catch (e) {
      setErr(e.message);
    }
  }

  function leave(e, room) {
    e.stopPropagation();
    onLeave?.(room);
  }

  return (
    <>
      <form className="new-room" onSubmit={submit}>
        <input placeholder="New room" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit">+</button>
      </form>
      {err && <div className="error" style={{ color: '#f87171', fontSize: '0.8rem' }}>{err}</div>}
      <ul className="room-list">
        {rooms.map((r) => (
          <li
            key={r.id}
            className={current?.id === r.id ? 'active' : ''}
            onClick={() => onSelect(r)}
          >
            <span className="room-name"># {r.name}</span>
            <button
              type="button"
              className="room-leave"
              title={`Leave #${r.name}`}
              onClick={(e) => leave(e, r)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function PresenceMap({ presenceMap, currentUserId }) {
  const entries = Object.entries(presenceMap).filter(([userId]) => userId !== currentUserId);

  if (entries.length === 0) {
    return (
      <div className="presence-map">
        <h3>Online Users</h3>
        <div className="presence-empty">No other users online</div>
      </div>
    );
  }

  const grouped = {};
  for (const [userId, pres] of entries) {
    const room = pres.currentRoom || 'lobby';
    if (!grouped[room]) grouped[room] = [];
    grouped[room].push({ userId, ...pres });
  }

  return (
    <div className="presence-map">
      <h3>Online Users ({entries.length})</h3>
      {Object.entries(grouped).map(([roomName, users]) => (
        <div key={roomName} className="presence-group">
          <div className="presence-room-label">
            {roomName === 'lobby' ? 'In lobby' : `In #${roomName}`}
          </div>
          <ul>
            {users.map((u) => (
              <li key={u.userId} className="presence-user">
                <span className="presence-dot online"></span>
                <span className="presence-username">{u.username || u.userId.slice(0, 8)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

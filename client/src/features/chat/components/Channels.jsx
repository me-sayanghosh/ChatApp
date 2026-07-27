import AnimatedList from '../../../shared/components/ui/AnimatedList.jsx';

const ROOM_TYPES = [
  {
    id: 'public',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    color: '#0052FF',
  },
  {
    id: 'private',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    color: '#F59E0B',
  },
  {
    id: 'ephemeral',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    color: '#8B5CF6',
  },
];

export default function Channels({
  rooms, current, onSelect, onLeave, onRequestJoin,
  memberRooms, pendingRooms, onOpenCreate, unreadCounts, mentionAlerts,
}) {
  function renderRoom(room) {
    const typeObj = ROOM_TYPES.find((t) => t.id === (room.type || 'public')) || ROOM_TYPES[0];
    const isMember = memberRooms?.has(room.id);
    const isPending = pendingRooms?.has(room.id);
    const isPrivateNotMember = room.type === 'private' && !isMember;
    const isActive = current?.id === room.id;
    const unread = unreadCounts?.[room.id] || 0;
    const hasMention = mentionAlerts?.some((a) => a.roomId === room.id);

    return (
      <div className={`conv-card ${isActive ? 'active' : ''} ${isPrivateNotMember ? 'private-locked' : ''} ${unread > 0 && !isActive ? 'has-unread' : ''}`}>
        <div className="conv-card-left">
          <div className="conv-icon-box" style={{ color: typeObj.color }}>
            {typeObj.icon}
          </div>
        </div>
        <div className="conv-card-body">
          <div className="conv-card-header">
            <span className={`conv-title ${unread > 0 && !isActive ? 'conv-title-unread' : ''}`}>
              {hasMention && !isActive && <span className="conv-mention-dot">@</span>}
              {room.name}
            </span>
            <span className="conv-time">3m ago</span>
          </div>
          <div className="conv-card-footer">
            <span className="conv-snippet">
              {room.type === 'private' ? 'Encrypted channel...' : 'Real-time discussion'}
            </span>
            {isPrivateNotMember ? (
              isPending ? (
                <span className="conv-badge pending">Pending</span>
              ) : (
                <button
                  type="button"
                  className="conv-join-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRequestJoin?.(room);
                  }}
                >
                  Join
                </button>
              )
            ) : unread > 0 && !isActive ? (
              <span className="conv-badge count unread-badge">{unread > 99 ? '99+' : unread}</span>
            ) : (
              <span className="conv-badge count">
                {room.membersCount || 1}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="room-list-container">
      <div className="room-list-header">
        <h2>Conversations</h2>
        <button
          className="create-room-btn"
          onClick={onOpenCreate}
          title="New Channel"
        >
          +
        </button>
      </div>

      <AnimatedList
        items={rooms}
        renderItem={renderRoom}
        onItemSelect={(room) => onSelect?.(room)}
        showGradients={false}
        enableArrowNavigation
        displayScrollbar
      />
    </div>
  );
}

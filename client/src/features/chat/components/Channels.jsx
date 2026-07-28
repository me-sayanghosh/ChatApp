import { useState, useEffect, useRef } from 'react';
import { formatBadgeCount, formatCardTime } from '../../../shared/utils/dateUtils.js';

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
    color: '#29410f',
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

const DEFAULT_LISTS = ['General', 'Work', 'Projects', 'Development', 'Random'];

export default function Channels({
  rooms, current, onSelect, onLeave, onRequestJoin,
  memberRooms, pendingRooms, onOpenCreate, unreadCounts, mentionAlerts,
  onMarkAsRead, onClearChat,
}) {
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [activeMenuRoomId, setActiveMenuRoomId] = useState(null);
  const [showAddToListRoomId, setShowAddToListRoomId] = useState(null);
  const menuRef = useRef(null);

  // Persistent States in localStorage
  const [pinnedRoomIds, setPinnedRoomIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('droptalk_pinned_rooms') || '[]'); } catch { return []; }
  });

  const [favouriteRoomIds, setFavouriteRoomIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('droptalk_favourite_rooms') || '[]'); } catch { return []; }
  });

  const [mutedRoomIds, setMutedRoomIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('droptalk_muted_rooms') || '[]'); } catch { return []; }
  });

  const [archivedRoomIds, setArchivedRoomIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('droptalk_archived_rooms') || '[]'); } catch { return []; }
  });

  const [customRoomCategories, setCustomRoomCategories] = useState(() => {
    try { return JSON.parse(localStorage.getItem('droptalk_custom_categories') || '{}'); } catch { return {}; }
  });

  // Sync to localStorage
  useEffect(() => { localStorage.setItem('droptalk_pinned_rooms', JSON.stringify(pinnedRoomIds)); }, [pinnedRoomIds]);
  useEffect(() => { localStorage.setItem('droptalk_favourite_rooms', JSON.stringify(favouriteRoomIds)); }, [favouriteRoomIds]);
  useEffect(() => { localStorage.setItem('droptalk_muted_rooms', JSON.stringify(mutedRoomIds)); }, [mutedRoomIds]);
  useEffect(() => { localStorage.setItem('droptalk_archived_rooms', JSON.stringify(archivedRoomIds)); }, [archivedRoomIds]);
  useEffect(() => { localStorage.setItem('droptalk_custom_categories', JSON.stringify(customRoomCategories)); }, [customRoomCategories]);

  // Global click & esc listener to dismiss context menu
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuRoomId(null);
        setShowAddToListRoomId(null);
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') {
        setActiveMenuRoomId(null);
        setShowAddToListRoomId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  function toggleCategory(cat) {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  // Toggle Handlers
  function togglePin(roomId, e) {
    e?.stopPropagation();
    setPinnedRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
    setActiveMenuRoomId(null);
  }

  function toggleFavourite(roomId, e) {
    e?.stopPropagation();
    setFavouriteRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
    setActiveMenuRoomId(null);
  }

  function toggleMute(roomId, e) {
    e?.stopPropagation();
    setMutedRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
    setActiveMenuRoomId(null);
  }

  function toggleArchive(roomId, e) {
    e?.stopPropagation();
    setArchivedRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
    setActiveMenuRoomId(null);
  }

  function handleAssignCategory(roomId, categoryName, e) {
    e?.stopPropagation();
    setCustomRoomCategories((prev) => ({ ...prev, [roomId]: categoryName }));
    setShowAddToListRoomId(null);
    setActiveMenuRoomId(null);
  }

  function handleMarkAsRead(roomId, e) {
    e?.stopPropagation();
    onMarkAsRead?.(roomId);
    setActiveMenuRoomId(null);
  }

  function handleClearChat(roomId, e) {
    e?.stopPropagation();
    onClearChat?.(roomId);
    setActiveMenuRoomId(null);
  }

  function handleExitGroup(roomId, e) {
    e?.stopPropagation();
    onLeave?.(roomId);
    setActiveMenuRoomId(null);
  }

  // Group rooms into categories
  const categoriesMap = {};

  rooms.forEach((r) => {
    const isArchived = archivedRoomIds.includes(r.id);
    const isPinned = pinnedRoomIds.includes(r.id);
    const isFav = favouriteRoomIds.includes(r.id);

    let cat;
    if (isArchived) {
      cat = '📥 Archived';
    } else if (isPinned) {
      cat = '📌 Pinned';
    } else if (isFav) {
      cat = '❤️ Favourites';
    } else {
      cat = customRoomCategories[r.id] || r.category || 'General';
    }

    if (!categoriesMap[cat]) categoriesMap[cat] = [];
    categoriesMap[cat].push(r);
  });

  const categories = Object.keys(categoriesMap);

  function renderRoom(room) {
    const typeObj = ROOM_TYPES.find((t) => t.id === (room.type || 'public')) || ROOM_TYPES[0];
    const isMember = memberRooms?.has(room.id);
    const isPending = pendingRooms?.has(room.id);
    const isPrivateNotMember = room.type === 'private' && !isMember;
    const isActive = current?.id === room.id;
    const unread = unreadCounts?.[room.id] || 0;
    const hasUnread = unread > 0 && !isActive;
    const hasMention = mentionAlerts?.some((a) => a.roomId === room.id);
    const isMenuOpen = activeMenuRoomId === room.id;
    const isPinned = pinnedRoomIds.includes(room.id);
    const isFav = favouriteRoomIds.includes(room.id);
    const isMuted = mutedRoomIds.includes(room.id);
    const isArchived = archivedRoomIds.includes(room.id);
    const showAddToList = showAddToListRoomId === room.id;

    // Snippet & Time formatting (WhatsApp style)
    const lastMsg = room.lastMessage;
    const previewText = lastMsg?.text
      ? `${lastMsg.senderUsername ? `${lastMsg.senderUsername}: ` : ''}${lastMsg.text}`
      : room.topic || (room.type === 'private' ? 'Encrypted channel' : 'General discussion');
    const timeStr = formatCardTime(lastMsg?.createdAt);

    return (
      <div
        key={room.id}
        className={`conv-card ${isActive ? 'active' : ''} ${isPrivateNotMember ? 'private-locked' : ''} ${hasUnread ? 'has-unread' : ''}`}
        onClick={() => onSelect?.(room)}
      >
        {/* Circular Avatar */}
        <div className="conv-card-left">
          <div className="conv-avatar" style={{ color: typeObj.color }}>
            {typeObj.icon}
          </div>
        </div>

        <div className="conv-card-body">
          {/* Header Row: Title & Timestamp */}
          <div className="conv-card-header">
            <span className={`conv-title ${hasUnread ? 'conv-title-unread' : ''}`}>
              {hasMention && !isActive && <span className="conv-mention-dot">@</span>}
              {room.name}
              {(isPinned || isFav || isMuted) && (
                <span className="channel-status-badges">
                  {isPinned && <span title="Pinned">📌</span>}
                  {isFav && <span title="Favourite">❤️</span>}
                  {isMuted && <span title="Muted">🔕</span>}
                </span>
              )}
            </span>

            {timeStr && (
              <span className={`conv-time ${hasUnread ? 'conv-time-unread' : ''}`}>
                {timeStr}
              </span>
            )}
          </div>

          {/* Footer Row: Last message preview & Unread badge */}
          <div className="conv-card-footer">
            <span className="conv-snippet" title={previewText}>
              {previewText.length > 38 ? previewText.substring(0, 38) + '…' : previewText}
            </span>

            <div className="conv-card-actions">
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
              ) : hasUnread ? (
                <span className="conv-badge count unread-badge">{formatBadgeCount(unread)}</span>
              ) : null}

              {/* 3-Dot Options Trigger Button */}
              <button
                className={`conv-menu-trigger ${isMenuOpen ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuRoomId(isMenuOpen ? null : room.id);
                  setShowAddToListRoomId(null);
                }}
                title="Channel Options"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 8-Option Contextual Dropdown */}
        {isMenuOpen && (
          <div className="channel-ctx-menu" ref={menuRef} onClick={(e) => e.stopPropagation()}>
            <button className="channel-ctx-item" onClick={(e) => toggleArchive(room.id, e)}>
              <span className="channel-ctx-item-left">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" />
                </svg>
                {isArchived ? 'Unarchive chat' : 'Archive chat'}
              </span>
            </button>

            <button className="channel-ctx-item" onClick={(e) => toggleMute(room.id, e)}>
              <span className="channel-ctx-item-left">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" /><path d="M18.63 13A17.89 17.89 0 0 1 18 8" /><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" /><line x1="1" y1="1" x2="23" y2="23" />
                </svg>
                {isMuted ? 'Unmute notifications' : 'Mute notifications'}
              </span>
              <span className="channel-ctx-arrow">▶</span>
            </button>

            <button className="channel-ctx-item" onClick={(e) => togglePin(room.id, e)}>
              <span className="channel-ctx-item-left">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14l-1.5-6H6.5L5 17z" /><path d="M9 11V5a3 3 0 0 1 6 0v6" />
                </svg>
                {isPinned ? 'Unpin chat' : 'Pin chat'}
              </span>
            </button>

            <button className="channel-ctx-item" onClick={(e) => handleMarkAsRead(room.id, e)}>
              <span className="channel-ctx-item-left">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <polyline points="8 10 11 13 16 8" />
                </svg>
                Mark as read
              </span>
            </button>

            <button className="channel-ctx-item" onClick={(e) => toggleFavourite(room.id, e)}>
              <span className="channel-ctx-item-left">
                <svg width="15" height="15" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {isFav ? 'Remove from favourites' : 'Add to favourites'}
              </span>
            </button>

            <div style={{ position: 'relative' }}>
              <button
                className="channel-ctx-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddToListRoomId(showAddToList ? null : room.id);
                }}
              >
                <span className="channel-ctx-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    <line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" />
                  </svg>
                  Add to list
                </span>
                <span className="channel-ctx-arrow">▶</span>
              </button>

              {showAddToList && (
                <div className="channel-ctx-sub-menu">
                  {DEFAULT_LISTS.map((listName) => (
                    <button
                      key={listName}
                      className="channel-ctx-item"
                      onClick={(e) => handleAssignCategory(room.id, listName, e)}
                    >
                      {listName}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="channel-ctx-divider" />

            <button className="channel-ctx-item danger" onClick={(e) => handleClearChat(room.id, e)}>
              <span className="channel-ctx-item-left">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                Clear chat
              </span>
            </button>

            <button className="channel-ctx-item danger" onClick={(e) => handleExitGroup(room.id, e)}>
              <span className="channel-ctx-item-left">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Exit group
              </span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="room-list-container">
      <div className="room-list-header">
        <h2>Channels</h2>
        <button
          className="create-room-btn"
          onClick={onOpenCreate}
          title="New Channel"
        >
          +
        </button>
      </div>

      <div className="category-accordion-list">
        {categories.map((cat) => {
          const isCollapsed = collapsedCategories[cat];
          const catRooms = categoriesMap[cat];

          return (
            <div key={cat} className="category-group">
              <div className="category-header" onClick={() => toggleCategory(cat)}>
                <span className={`category-arrow-svg ${isCollapsed ? 'collapsed' : ''}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
                <span className="category-title">{cat}</span>
                <span className="category-count">{catRooms.length}</span>
              </div>
              {!isCollapsed && (
                <div className="category-rooms-list">
                  {catRooms.map(renderRoom)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

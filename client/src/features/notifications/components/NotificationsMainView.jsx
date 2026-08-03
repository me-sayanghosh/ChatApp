import { useState } from 'react';
import { formatCardTime } from '../../../shared/utils/dateUtils.js';

export function NotificationsMainView({
  notifications = [],
  filter = 'all',
  onMarkRead,
  onDeleteNotif,
  onMarkAllRead,
  onClearAll,
  onNavigateToRoom,
}) {
  const [search, setSearch] = useState('');

  const filtered = notifications.filter((n) => {
    if (filter === 'unread' && n.read) return false;
    if (filter === 'mention' && n.type !== 'mention') return false;
    if (filter === 'dm' && n.type !== 'dm') return false;
    if (filter === 'system' && (n.type !== 'system' && n.type !== 'info')) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      n.title?.toLowerCase().includes(q) ||
      n.message?.toLowerCase().includes(q)
    );
  });

  function getTypeIcon(type) {
    switch (type) {
      case 'mention':
        return (
          <span className="notif-icon-badge mention">
            @
          </span>
        );
      case 'dm':
        return (
          <span className="notif-icon-badge dm">
            💬
          </span>
        );
      case 'call':
        return (
          <span className="notif-icon-badge call">
            📞
          </span>
        );
      default:
        return (
          <span className="notif-icon-badge info">
            📢
          </span>
        );
    }
  }

  return (
    <div className="notif-main-view">
      {/* Header */}
      <div className="notif-main-header">
        <div className="notif-main-title">
          <h3>
            {filter === 'all' && 'All Notifications'}
            {filter === 'unread' && 'Unread Notifications'}
            {filter === 'mention' && 'Mentions & Replies'}
            {filter === 'dm' && 'Direct Message Activity'}
            {filter === 'system' && 'System Announcements'}
          </h3>
          <span className="notif-main-count">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="notif-search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="notif-search-clear" onClick={() => setSearch('')}>&times;</button>
          )}
        </div>
      </div>

      {/* Main List Body */}
      <div className="notif-feed-list">
        {filtered.length === 0 ? (
          <div className="notif-empty-card">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <h4>No Notifications Found</h4>
            <p>You're all caught up! New mentions, direct messages, and call alerts will appear here.</p>
          </div>
        ) : (
          filtered.map((item) => {
            const timeStr = formatCardTime(item.createdAt);

            return (
              <div
                key={item.id}
                className={`notif-card-item ${!item.read ? 'unread' : ''}`}
                onClick={() => {
                  if (!item.read) onMarkRead?.(item.id);
                  if (item.roomId) onNavigateToRoom?.(item.roomId);
                }}
              >
                <div className="notif-card-left">
                  {getTypeIcon(item.type)}
                </div>

                <div className="notif-card-content">
                  <div className="notif-card-header">
                    <span className="notif-item-title">{item.title}</span>
                    <span className="notif-item-time">{timeStr}</span>
                  </div>

                  <p className="notif-item-body">{item.message}</p>

                  <div className="notif-card-footer">
                    {!item.read && (
                      <span className="notif-unread-dot">● New</span>
                    )}

                    <div className="notif-card-actions">
                      {!item.read && (
                        <button
                          className="notif-btn-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkRead?.(item.id);
                          }}
                        >
                          Mark as read
                        </button>
                      )}
                      <button
                        className="notif-btn-action delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNotif?.(item.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

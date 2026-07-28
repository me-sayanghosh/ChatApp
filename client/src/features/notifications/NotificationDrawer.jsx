import { useState } from 'react';
import { requestNotificationPermission } from '../../shared/utils/webNotifications.js';

export default function NotificationDrawer({
  isOpen,
  onClose,
  notifications = [],
  unreadCount = 0,
  onMarkRead,
  onMarkAllRead,
  onSelectNotification,
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [permStatus, setPermStatus] = useState(() => (typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'));

  if (!isOpen) return null;

  async function handleEnableBrowserPush() {
    const res = await requestNotificationPermission();
    setPermStatus(res);
  }

  const filtered = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  function getIcon(type) {
    switch (type) {
      case 'mention':
        return (
          <span className="notif-icon mention">
            @
          </span>
        );
      case 'dm':
        return (
          <span className="notif-icon dm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
        );
      case 'reaction':
        return (
          <span className="notif-icon reaction">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </span>
        );
      default:
        return (
          <span className="notif-icon system">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </span>
        );
    }
  }

  function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  }

  return (
    <div className="notif-drawer-backdrop" onClick={onClose}>
      <div className="notif-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="notif-header">
          <div className="notif-title-row">
            <h3>Notifications</h3>
            {unreadCount > 0 && <span className="notif-count-badge">{unreadCount > 5 ? '5+' : unreadCount} new</span>}
          </div>
          <div className="notif-header-actions">
            {unreadCount > 0 && (
              <button className="notif-action-btn" onClick={onMarkAllRead}>
                Mark all read
              </button>
            )}
            <button className="notif-close-btn" onClick={onClose} title="Close">
              &times;
            </button>
          </div>
        </div>

        {/* Browser Push Banner */}
        {permStatus === 'default' && (
          <div className="notif-push-banner">
            <span>Enable desktop notifications for new DMs & mentions</span>
            <button className="notif-enable-btn" onClick={handleEnableBrowserPush}>
              Enable
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="notif-tabs">
          <button
            className={`notif-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </button>
          <button
            className={`notif-tab ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* List */}
        <div className="notif-list">
          {filtered.length === 0 ? (
            <div className="notif-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <p>No {filter === 'unread' ? 'unread' : ''} notifications</p>
            </div>
          ) : (
            filtered.map((n) => (
              <div
                key={n.id}
                className={`notif-item ${!n.read ? 'unread' : ''}`}
                onClick={() => {
                  if (!n.read) onMarkRead(n.id);
                  onSelectNotification(n);
                  onClose();
                }}
              >
                <div className="notif-item-left">
                  {n.actor?.profileImage ? (
                    <img src={n.actor.profileImage} alt={n.actor.username} className="notif-avatar" />
                  ) : (
                    <div className="notif-avatar-fallback">
                      {(n.actor?.username || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  {getIcon(n.type)}
                </div>

                <div className="notif-item-body">
                  <div className="notif-item-title-row">
                    <span className="notif-item-title">{n.title}</span>
                    <span className="notif-item-time">{formatTime(n.createdAt)}</span>
                  </div>
                  {n.message && <p className="notif-item-msg">{n.message}</p>}
                </div>

                {!n.read && <span className="notif-unread-dot" title="Unread" />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

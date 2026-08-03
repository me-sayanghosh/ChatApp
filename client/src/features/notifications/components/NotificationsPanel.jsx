import { useState } from 'react';

export function NotificationsPanel({
  notifications = [],
  unreadCount = 0,
  activeFilter = 'all',
  onSelectFilter,
  onMarkAllRead,
  onClearAll,
}) {
  const [search, setSearch] = useState('');

  const filterCounts = {
    all: notifications.length,
    unread: notifications.filter((n) => !n.read).length,
    mention: notifications.filter((n) => n.type === 'mention').length,
    dm: notifications.filter((n) => n.type === 'dm').length,
    system: notifications.filter((n) => n.type === 'system' || n.type === 'info').length,
  };

  return (
    <div className="notif-panel">
      <div className="notif-panel-header">
        <div className="notif-header-title">
          <h2>Notifications</h2>
          {unreadCount > 0 && <span className="notif-unread-badge">{unreadCount}</span>}
        </div>
        <div className="notif-header-actions">
          {unreadCount > 0 && (
            <button className="notif-action-btn" onClick={onMarkAllRead} title="Mark all as read">
              Check Read
            </button>
          )}
          {notifications.length > 0 && (
            <button className="notif-action-btn danger" onClick={onClearAll} title="Clear all notifications">
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="notif-filter-list">
        <button
          className={`notif-filter-item ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => onSelectFilter('all')}
        >
          <span className="filter-label">All Activity</span>
          <span className="filter-count">{filterCounts.all}</span>
        </button>

        <button
          className={`notif-filter-item ${activeFilter === 'unread' ? 'active' : ''}`}
          onClick={() => onSelectFilter('unread')}
        >
          <span className="filter-label">Unread</span>
          <span className={`filter-count ${unreadCount > 0 ? 'unread' : ''}`}>{filterCounts.unread}</span>
        </button>

        <button
          className={`notif-filter-item ${activeFilter === 'mention' ? 'active' : ''}`}
          onClick={() => onSelectFilter('mention')}
        >
          <span className="filter-label">Mentions (@)</span>
          <span className="filter-count">{filterCounts.mention}</span>
        </button>

        <button
          className={`notif-filter-item ${activeFilter === 'dm' ? 'active' : ''}`}
          onClick={() => onSelectFilter('dm')}
        >
          <span className="filter-label">Direct Messages</span>
          <span className="filter-count">{filterCounts.dm}</span>
        </button>

        <button
          className={`notif-filter-item ${activeFilter === 'system' ? 'active' : ''}`}
          onClick={() => onSelectFilter('system')}
        >
          <span className="filter-label">System & Alerts</span>
          <span className="filter-count">{filterCounts.system}</span>
        </button>
      </div>
    </div>
  );
}

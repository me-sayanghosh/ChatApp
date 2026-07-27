import { useState } from 'react';

export default function DMPanel({ conversations, currentDM, onOpen, onSendRequest, userId }) {
  const [search, setSearch] = useState('');

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    return c.partner?.username?.toLowerCase().includes(search.toLowerCase());
  });

  function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  const pending = filtered.filter(
    (c) => c.dmStatus === 'pending' && c.dmInitiator !== userId
  );
  const accepted = filtered.filter(
    (c) => c.dmStatus === 'accepted' || c.dmInitiator === userId
  );

  function renderItem(convo) {
    const isActive = currentDM?.id === convo.id;
    const isPending = convo.dmStatus === 'pending';
    const isRecipient = convo.dmInitiator !== userId;
    const avatar = convo.partner?.profileImage;
    const initial = (convo.partner?.username || '?')[0].toUpperCase();
    const preview = convo.lastMessage?.text || '...';

    return (
      <div
        key={convo.id}
        className={`dm-item ${isActive ? 'active' : ''} ${isPending && isRecipient ? 'dm-item--pending' : ''}`}
        onClick={() => onOpen(convo)}
        role="button"
        tabIndex={0}
      >
        <div className="dm-avatar">
          {avatar ? (
            <img src={avatar} alt={convo.partner?.username} />
          ) : (
            <span>{initial}</span>
          )}
          {isPending && isRecipient && <span className="dm-avatar-badge" />}
        </div>
        <div className="dm-item-body">
          <div className="dm-item-header">
            <span className="dm-item-name">{convo.partner?.username || 'Unknown'}</span>
            <span className="dm-item-time">{formatTime(convo.lastMessage?.createdAt)}</span>
          </div>
          <div className="dm-item-preview">
            {isPending && isRecipient ? (
              <span className="dm-pending-label">📨 DM Request</span>
            ) : isPending && !isRecipient ? (
              <span className="dm-waiting-label">⏳ Waiting for acceptance...</span>
            ) : (
              <span className="dm-preview-text">
                {preview.length > 48 ? preview.substring(0, 48) + '…' : preview}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dm-panel">
      <div className="dm-panel-header">
        <h2>Direct Messages</h2>
      </div>

      <div className="dm-search-bar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          placeholder="Search DMs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {pending.length > 0 && (
        <div className="dm-section">
          <div className="dm-section-label">Requests ({pending.length})</div>
          {pending.map(renderItem)}
        </div>
      )}

      {accepted.length > 0 && (
        <div className="dm-section">
          <div className="dm-section-label">Messages</div>
          {accepted.map(renderItem)}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="dm-empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p>No direct messages yet.</p>
          <span>Click "Message Privately" on any message to start one.</span>
        </div>
      )}
    </div>
  );
}

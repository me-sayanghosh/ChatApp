export default function UserProfileCard({ user, isOnline, onClose, onStartDM, onMention }) {
  if (!user) return null;

  const initial = (user.username || 'U')[0].toUpperCase();
  const name = user.name || user.username;

  return (
    <div className="user-card-backdrop" onClick={onClose}>
      <div className="user-card-modal" onClick={(e) => e.stopPropagation()}>
        {/* Banner header */}
        <div className="user-card-banner">
          <button className="user-card-close-btn" onClick={onClose} title="Close">&times;</button>
        </div>

        {/* Avatar badge */}
        <div className="user-card-avatar-wrap">
          {user.profileImage ? (
            <img src={user.profileImage} alt={user.username} className="user-card-avatar" />
          ) : (
            <div className="user-card-avatar-fallback">{initial}</div>
          )}
          <span className={`user-card-status-dot ${isOnline ? 'online' : 'offline'}`} />
        </div>

        {/* Details */}
        <div className="user-card-details">
          <h2 className="user-card-name">{name}</h2>
          <span className="user-card-handle">@{user.username}</span>

          {/* Custom Status Chip */}
          {user.customStatus?.text && (
            <div className="user-card-custom-status">
              <span className="status-emoji">{user.customStatus.emoji || '💬'}</span>
              <span className="status-text">{user.customStatus.text}</span>
            </div>
          )}

          <div className="user-card-meta">
            <span className="meta-badge">
              <span className={`dot ${isOnline ? 'online' : 'offline'}`} />
              {isOnline ? 'Active Now' : 'Offline'}
            </span>
            <span className="meta-badge e2ee">E2EE Ready 🔒</span>
          </div>

          {/* Action buttons */}
          <div className="user-card-actions">
            {onStartDM && (
              <button
                className="user-card-btn primary"
                onClick={() => {
                  onStartDM(user.id || user._id);
                  onClose();
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Direct Message
              </button>
            )}

            {onMention && (
              <button
                className="user-card-btn secondary"
                onClick={() => {
                  onMention(user.username);
                  onClose();
                }}
              >
                @ Mention
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

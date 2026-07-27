export default function PinnedMessagesModal({ isOpen, onClose, pinnedMessages = [], allMessages = [], onUnpin, onJumpToMessage }) {
  if (!isOpen) return null;

  // Resolve pinned message objects
  const pinnedDocs = pinnedMessages
    .map((id) => allMessages.find((m) => m.id === id || m._id === id))
    .filter(Boolean);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card pinned-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📌 Pinned Messages ({pinnedDocs.length})</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="pinned-list">
          {pinnedDocs.length === 0 ? (
            <div className="pinned-empty">No pinned messages in this channel yet.</div>
          ) : (
            pinnedDocs.map((msg) => (
              <div key={msg.id} className="pinned-item">
                <div className="pinned-item-body" onClick={() => { onJumpToMessage(msg.id); onClose(); }}>
                  <div className="pinned-item-header">
                    <span className="pinned-sender">@{msg.sender?.username || 'User'}</span>
                    <span className="pinned-time">{new Date(msg.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="pinned-text">{msg.text || '[Attachment]'}</p>
                </div>
                <button
                  className="pinned-unpin-btn"
                  onClick={() => onUnpin(msg.id)}
                  title="Unpin message"
                >
                  Unpin
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';

export default function ForwardModal({ message, rooms = [], conversations = [], onClose, onForward }) {
  const [selectedTarget, setSelectedTarget] = useState(null); // { id, type: 'channel'|'dm', name }
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);

  if (!message) return null;

  const filteredChannels = rooms.filter((r) => !r.isDM && r.name.toLowerCase().includes(search.toLowerCase()));
  const filteredDMs = conversations.filter((c) => c.partner?.username?.toLowerCase().includes(search.toLowerCase()));

  async function handleSendForward() {
    if (!selectedTarget) return;
    setSending(true);
    try {
      await onForward(selectedTarget, message);
      onClose();
    } catch (err) {
      console.error('Forward failed:', err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card forward-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Forward Message</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {/* Message preview snippet */}
        <div className="forward-preview-box">
          <span className="forward-preview-label">Message to forward:</span>
          <p className="forward-preview-text">"{message.text || 'Attachment'}"</p>
        </div>

        {/* Search destination */}
        <div className="forward-search-bar">
          <input
            type="text"
            placeholder="Search channels or DMs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* Destination List */}
        <div className="forward-targets-list">
          {filteredChannels.length > 0 && (
            <div className="forward-section">
              <span className="forward-section-label">Group Channels</span>
              {filteredChannels.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  className={`forward-target-item ${selectedTarget?.id === room.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTarget({ id: room.id, type: 'channel', name: `#${room.name}` })}
                >
                  <span className="target-icon">#</span>
                  <span className="target-name">{room.name}</span>
                  {selectedTarget?.id === room.id && <span className="target-check">✓</span>}
                </button>
              ))}
            </div>
          )}

          {filteredDMs.length > 0 && (
            <div className="forward-section">
              <span className="forward-section-label">Direct Messages</span>
              {filteredDMs.map((convo) => (
                <button
                  key={convo.id}
                  type="button"
                  className={`forward-target-item ${selectedTarget?.id === convo.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTarget({ id: convo.id, type: 'dm', name: `@${convo.partner?.username}` })}
                >
                  <span className="target-avatar">{convo.partner?.username?.[0]?.toUpperCase()}</span>
                  <span className="target-name">@{convo.partner?.username}</span>
                  {selectedTarget?.id === convo.id && <span className="target-check">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button className="button-secondary-pill" onClick={onClose}>Cancel</button>
          <button
            className="button-primary-pill"
            disabled={!selectedTarget || sending}
            onClick={handleSendForward}
          >
            {sending ? 'Forwarding...' : selectedTarget ? `Send to ${selectedTarget.name}` : 'Select destination'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { api } from '../../../shared/utils/api.js';

export default function ChannelSettingsModal({ room, onClose, onUpdated }) {
  const [name, setName] = useState(room?.name || '');
  const [topic, setTopic] = useState(room?.topic || '');
  const [category, setCategory] = useState(room?.category || 'General');
  const [slowMode, setSlowMode] = useState(room?.slowMode || 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!room) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await api.put(`/rooms/${room.id}/settings`, {
        name,
        topic,
        category,
        slowMode: Number(slowMode),
      });
      onUpdated?.(res.data.room);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card channel-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Channel Settings — #{room.name}
          </h3>
          <button className="modal-close" onClick={onClose} title="Close">&times;</button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Channel Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. general, announcements"
              required
            />
          </div>

          <div className="form-group">
            <label>Channel Topic / Description</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What is this channel about? (displayed in header)"
              maxLength={250}
            />
          </div>

          <div className="form-group">
            <label>Category / Group</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. General, Projects, Off-Topic"
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label>Slow Mode Delay</label>
            <select value={slowMode} onChange={(e) => setSlowMode(e.target.value)}>
              <option value={0}>Off (No delay)</option>
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={120}>2 minutes</option>
            </select>
            <small className="form-help">Members will have to wait this long between sending messages.</small>
          </div>

          <div className="modal-actions">
            <button type="button" className="button-secondary-pill" onClick={onClose}>Cancel</button>
            <button type="submit" className="button-primary-pill" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

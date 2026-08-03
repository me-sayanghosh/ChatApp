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
    <div className="cc-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cc-modal">
        {/* Header */}
        <div className="cc-modal-header">
          <div className="cc-modal-title-area">
            <div className="cc-modal-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0052FF" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <div>
              <h2 className="cc-modal-title">Channel Settings</h2>
              <p className="cc-modal-subtitle">Manage preferences and rules for #{room.name}</p>
            </div>
          </div>
          <button className="cc-close-btn" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form className="cc-modal-body" onSubmit={handleSubmit}>
          {error && (
            <div className="cc-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Channel Name */}
          <div className="cc-field">
            <label className="cc-label">Channel Name</label>
            <div className="cc-input-wrap">
              <span className="cc-input-prefix">#</span>
              <input
                type="text"
                className="cc-input"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, ''))}
                placeholder="e.g. general, announcements"
                maxLength={80}
                required
              />
            </div>
          </div>

          {/* Channel Topic */}
          <div className="cc-field">
            <label className="cc-label">Channel Topic / Description</label>
            <div className="cc-input-wrap" style={{ padding: '0 14px' }}>
              <input
                type="text"
                className="cc-input"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What is this channel about? (displayed in header)"
                maxLength={250}
              />
            </div>
          </div>

          {/* Category */}
          <div className="cc-field">
            <label className="cc-label">Category / Group</label>
            <div className="cc-input-wrap" style={{ padding: '0 14px' }}>
              <input
                type="text"
                className="cc-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. General, Projects, Off-Topic"
                maxLength={50}
              />
            </div>
          </div>

          {/* Slow Mode */}
          <div className="cc-field">
            <label className="cc-label">Slow Mode Delay</label>
            <div className="cc-input-wrap" style={{ padding: '0 14px' }}>
              <select
                className="cc-input cc-select"
                value={slowMode}
                onChange={(e) => setSlowMode(e.target.value)}
              >
                <option value={0}>Off (No delay)</option>
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={120}>2 minutes</option>
              </select>
            </div>
            <p className="cc-field-hint">Members will have to wait this duration between sending messages.</p>
          </div>

          {/* Footer */}
          <div className="cc-modal-footer">
            <button type="button" className="cc-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="cc-btn-submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

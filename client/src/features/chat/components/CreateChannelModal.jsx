import { useState, useEffect, useRef } from 'react';

const ROOM_TYPES = [
  {
    id: 'public',
    label: 'Public',
    desc: 'Anyone in the workspace can join and view messages.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    color: '#0052FF',
    bg: '#EEF3FF',
  },
  {
    id: 'private',
    label: 'Private (E2EE)',
    desc: 'End-to-end encrypted. Only invited members can join.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    color: '#F59E0B',
    bg: '#FFFBEB',
  },
  {
    id: 'ephemeral',
    label: 'Ephemeral',
    desc: 'Messages disappear automatically after a set time.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    color: '#8B5CF6',
    bg: '#F5F3FF',
  },
];

export default function CreateChannelModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('public');
  const [duration, setDuration] = useState(60); // minutes, only for ephemeral
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const DURATIONS = [
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '6 hours', value: 360 },
    { label: '24 hours', value: 1440 },
  ];

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    const trimmed = name.trim();
    if (!trimmed) {
      setErr('Please enter a channel name.');
      return;
    }
    if (trimmed.length < 2) {
      setErr('Channel name must be at least 2 characters.');
      return;
    }
    setLoading(true);
    try {
      await onCreate(trimmed, type, type === 'ephemeral' ? duration : undefined);
      onClose();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message || 'Failed to create channel.');
    } finally {
      setLoading(false);
    }
  }

  const selected = ROOM_TYPES.find((t) => t.id === type);

  return (
    <div className="cc-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cc-modal">
        {/* Header */}
        <div className="cc-modal-header">
          <div className="cc-modal-title-area">
            <div className="cc-modal-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0052FF" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <div>
              <h2 className="cc-modal-title">Create a Channel</h2>
              <p className="cc-modal-subtitle">Set up a new space for your team to collaborate</p>
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
        <form className="cc-modal-body" onSubmit={submit}>
          {/* Channel Name */}
          <div className="cc-field">
            <label className="cc-label">Channel Name</label>
            <div className="cc-input-wrap">
              <span className="cc-input-prefix">#</span>
              <input
                ref={inputRef}
                className="cc-input"
                placeholder="e.g. marketing, dev-team, announcements"
                value={name}
                maxLength={80}
                onChange={(e) => {
                  setName(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, ''));
                  setErr('');
                }}
              />
              <span className="cc-char-count">{name.length}/80</span>
            </div>
            <p className="cc-field-hint">Use lowercase letters, numbers, hyphens, and underscores only.</p>
          </div>

          {/* Channel Type */}
          <div className="cc-field">
            <label className="cc-label">Channel Type</label>
            <div className="cc-type-grid">
              {ROOM_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`cc-type-card ${type === t.id ? 'selected' : ''}`}
                  onClick={() => setType(t.id)}
                >
                  <div className="cc-type-icon" style={{ background: t.bg, color: t.color }}>
                    {t.icon}
                  </div>
                  <div className="cc-type-info">
                    <span className="cc-type-label">{t.label}</span>
                    <span className="cc-type-desc">{t.desc}</span>
                  </div>
                  <div className={`cc-type-radio ${type === t.id ? 'checked' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Ephemeral duration picker */}
          {type === 'ephemeral' && (
            <div className="cc-field">
              <label className="cc-label">Auto-Expire After</label>
              <div className="cc-duration-grid">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    className={`cc-duration-pill ${duration === d.value ? 'selected' : ''}`}
                    onClick={() => setDuration(d.value)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected type preview badge */}
          <div className="cc-preview-strip" style={{ background: selected.bg, borderColor: selected.color + '33' }}>
            <span style={{ color: selected.color }}>{selected.icon}</span>
            <span className="cc-preview-text" style={{ color: selected.color }}>
              {type === 'public' && 'This channel will be visible to everyone in your workspace.'}
              {type === 'private' && 'Only invited members can see and join this channel.'}
              {type === 'ephemeral' && 'Messages in this channel will automatically expire.'}
            </span>
          </div>

          {/* Error */}
          {err && (
            <div className="cc-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {err}
            </div>
          )}

          {/* Footer Actions */}
          <div className="cc-modal-footer">
            <button type="button" className="cc-btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="cc-btn-create" disabled={loading || !name.trim()}>
              {loading ? (
                <span className="cc-spinner" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              )}
              {loading ? 'Creating…' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

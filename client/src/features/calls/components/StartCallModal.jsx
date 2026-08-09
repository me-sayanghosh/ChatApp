import { useState, useEffect } from 'react';
import { api } from '../../../shared/utils/api.js';

export default function StartCallModal({ isOpen, onClose, onStartCall }) {
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    async function fetchContacts() {
      try {
        setLoading(true);
        // Fetch users/conversations from API
        const res = await api.get('/dm/conversations');
        const convos = res.data.conversations || [];
        const partners = convos
          .map((c) => c.partner)
          .filter(Boolean);
        setContacts(partners);
      } catch (err) {
        console.warn('Failed to load call contacts:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchContacts();
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = contacts.filter((c) => {
    const name = c.name || c.username || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="cc-modal-backdrop" onClick={onClose}>
      <div className="cc-modal call-start-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cc-modal-header">
          <div className="cc-modal-title-area">
            <div className="cc-modal-icon call-modal-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div>
              <h3 className="cc-modal-title">Start a New Call</h3>
              <p className="cc-modal-subtitle">Select a contact to initiate a voice or video call</p>
            </div>
          </div>
          <button className="cc-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="cc-modal-body">
          <div className="call-search-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="call-search-input"
              autoFocus
            />
          </div>

          <div className="call-contact-list">
            {loading ? (
              <div className="call-contact-loading">Loading contacts...</div>
            ) : filtered.length === 0 ? (
              <div className="call-contact-empty">
                <p>No contacts found.</p>
                <span>Start a conversation with a user first to place a call.</span>
              </div>
            ) : (
              filtered.map((contact) => {
                const partnerName = contact.name || contact.username || 'User';
                const initial = (contact.username || 'U')[0].toUpperCase();
                return (
                  <div key={contact.id} className="call-contact-row">
                    <div className="call-contact-left">
                      <div className="call-contact-avatar">
                        {contact.profileImage ? (
                          <img src={contact.profileImage} alt={partnerName} />
                        ) : (
                          <span>{initial}</span>
                        )}
                      </div>
                      <div className="call-contact-details">
                        <span className="call-contact-name">{partnerName}</span>
                        <span className="call-contact-user">@{contact.username}</span>
                      </div>
                    </div>
                    <div className="call-contact-actions">
                      <button
                        className="call-dial-btn voice"
                        onClick={() => {
                          onStartCall?.(contact.id, null, false, contact);
                          onClose();
                        }}
                        title="Voice Call"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        Voice
                      </button>
                      <button
                        className="call-dial-btn video"
                        onClick={() => {
                          onStartCall?.(contact.id, null, true, contact);
                          onClose();
                        }}
                        title="Video Call"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <polygon points="23 7 16 12 23 17 23 7" />
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                        Video
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

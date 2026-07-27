import { useState, useEffect, useRef } from 'react';
import { api } from '../../../shared/utils/api.js';

export default function MessageSearchModal({ roomId, isOpen, onClose, onJumpToMessage }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !roomId) return;

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/rooms/${roomId}/messages/search?q=${encodeURIComponent(query.trim())}`);
        setResults(res.data.messages || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query, roomId, isOpen]);

  if (!isOpen) return null;

  function highlightQuery(text, q) {
    if (!text || !q) return text;
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className="search-highlight">{part}</mark>
      ) : (
        part
      )
    );
  }

  function formatTime(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Search Messages</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="search-input-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Type keywords to search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button className="search-clear-btn" onClick={() => setQuery('')}>&times;</button>
          )}
        </div>

        <div className="search-results-list">
          {loading && <div className="search-loading">Searching channel history...</div>}

          {!loading && query.trim() && results.length === 0 && (
            <div className="search-empty">No messages found matching "{query}"</div>
          )}

          {!loading && results.map((msg) => (
            <div
              key={msg.id}
              className="search-result-item"
              onClick={() => {
                onJumpToMessage(msg.id);
                onClose();
              }}
            >
              <div className="result-header">
                <span className="result-sender">@{msg.sender?.username || 'User'}</span>
                <span className="result-time">{formatTime(msg.createdAt)}</span>
              </div>
              <p className="result-text">{highlightQuery(msg.text, query.trim())}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

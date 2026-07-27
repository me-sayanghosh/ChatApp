import { useState } from 'react';
import { api } from '../../../shared/utils/index.js';

export default function SuggestionsBar({ roomId, currentInput, onSuggestionClick }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  async function fetchSuggestions() {
    if (!currentInput?.trim()) return;
    setLoading(true);
    try {
      const res = await api.post(`/rooms/${roomId}/suggest`, { message: currentInput });
      setSuggestions(res.data.suggestions || []);
      setVisible(true);
    } catch {
      setSuggestions([]);
    }
    setLoading(false);
  }

  function handleClick(suggestion) {
    onSuggestionClick?.(suggestion);
    setVisible(false);
    setSuggestions([]);
  }

  function dismiss() {
    setVisible(false);
    setSuggestions([]);
  }

  return (
    <div className="suggestions-container">
      {!visible && (
        <button
          className="suggestions-trigger"
          onClick={fetchSuggestions}
          disabled={loading || !currentInput?.trim()}
          title="AI Suggest Reply"
        >
          {loading ? (
            <span className="suggestions-spinner" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a5 5 0 0 1 5 5c0 1.1-.4 2.1-1 2.9.6.8 1 1.8 1 2.9a5 5 0 0 1-10 0c0-1.1.4-2.1 1-2.9-.6-.8-1-1.8-1-2.9a5 5 0 0 1 5-5z" />
              <path d="M9 17v2" /><path d="M15 17v2" />
            </svg>
          )}
          <span>AI Suggest</span>
        </button>
      )}
      {visible && suggestions.length > 0 && (
        <div className="suggestions-chips">
          <span className="suggestions-label">Suggestions:</span>
          {suggestions.map((s, i) => (
            <button key={i} className="suggestion-chip" onClick={() => handleClick(s)}>
              {s}
            </button>
          ))}
          <button className="suggestions-dismiss" onClick={dismiss} title="Dismiss">
            &times;
          </button>
        </div>
      )}
    </div>
  );
}

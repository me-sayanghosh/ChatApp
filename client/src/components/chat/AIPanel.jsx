import { useState } from 'react';
import { api } from '../../utils/api.js';

export default function AIPanel({ roomId, currentInput }) {
  const [summary, setSummary] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  async function handleSummarize() {
    setLoading(true);
    setSummary(null);
    try {
      const res = await api.post(`/rooms/${roomId}/summarize`);
      setSummary(res.data.summary);
    } catch (err) {
      setSummary('Error: ' + (err.response?.data?.error || err.message));
    }
    setLoading(false);
  }

  async function handleSuggest() {
    if (!currentInput?.trim()) return;
    setLoading(true);
    setSuggestions([]);
    try {
      const res = await api.post(`/rooms/${roomId}/suggest`, { message: currentInput });
      setSuggestions(res.data.suggestions || []);
    } catch (err) {
      setSuggestions(['Error: ' + (err.response?.data?.error || err.message)]);
    }
    setLoading(false);
  }

  return (
    <div className="ai-panel-container">
      <button
        className="ai-toggle"
        onClick={() => setShowPanel(!showPanel)}
        title="AI Assistant"
      >
        {showPanel ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/></svg>
        )} AI
      </button>
      {showPanel && (
        <div className="ai-panel">
          <h4>AI Assistant</h4>
          <div className="ai-actions">
            <button onClick={handleSummarize} disabled={loading} className="ai-btn">
              {loading ? 'Working...' : 'Summarize Chat'}
            </button>
            <button onClick={handleSuggest} disabled={loading || !currentInput?.trim()} className="ai-btn">
              {loading ? 'Working...' : 'Suggest Reply'}
            </button>
          </div>
          {summary && (
            <div className="ai-summary">
              <strong>Summary:</strong>
              <p>{summary}</p>
            </div>
          )}
          {suggestions.length > 0 && (
            <div className="ai-suggestions">
              <strong>Suggestions:</strong>
              <ul>
                {suggestions.map((s, i) => (
                  <li key={i} className="ai-suggestion">{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Bot, Zap, X, Loader2, Copy, Check, MessageSquare, FileText } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

export default function AIPanel({ roomId, onClose, onUseSuggestion }) {
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [copied, setCopied] = useState(false);

  const [partialMessage, setPartialMessage] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState('');

  const handleSummarize = useCallback(async () => {
    if (!roomId) return;
    setLoadingSummary(true);
    setSummaryError('');
    setSummary('');
    
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API}/rooms/${roomId}/summarize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to summarize');
      
      setSummary(data.summary);
    } catch (err) {
      setSummaryError(err.message);
    } finally {
      setLoadingSummary(false);
    }
  }, [roomId]);

  const handleSuggest = useCallback(async () => {
    if (!roomId) return;
    setLoadingSuggestions(true);
    setSuggestionsError('');
    setSuggestions([]);
    
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API}/rooms/${roomId}/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: partialMessage })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get suggestions');
      
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setSuggestionsError(err.message);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [roomId, partialMessage]);

  const copySummary = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.aside 
      className="ai-panel"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      <div className="ai-panel-header">
        <div className="ai-panel-title">
          <Sparkles size={20} className="ai-icon" />
          <h3>AI Copilot</h3>
        </div>
        <button className="ai-close-btn" onClick={onClose} title="Close">
          <X size={18} />
        </button>
      </div>

      <div className="ai-panel-content">
        {/* Summarize Section */}
        <div className="ai-section">
          <div className="ai-section-header">
            <FileText size={16} />
            <h4>Summarize Conversation</h4>
          </div>
          <button 
            className="ai-action-btn" 
            onClick={handleSummarize} 
            disabled={loadingSummary}
          >
            {loadingSummary ? <Loader2 size={16} className="spin" /> : <Bot size={16} />}
            {loadingSummary ? 'Summarizing...' : 'Generate Summary'}
          </button>
          
          {summaryError && <div className="ai-error">{summaryError}</div>}
          
          {summary && (
            <div className="ai-result-card">
              <div className="ai-result-header">
                <span className="ai-result-label">Summary</span>
                <button className="ai-copy-btn" onClick={copySummary} title="Copy to clipboard">
                  {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                </button>
              </div>
              <div className="ai-result-body markdown-body">
                {summary.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Smart Reply Section */}
        <div className="ai-section">
          <div className="ai-section-header">
            <MessageSquare size={16} />
            <h4>Smart Reply</h4>
          </div>
          <p className="ai-helper-text">Type a partial message or just get ideas on how to reply based on recent context.</p>
          
          <input 
            type="text" 
            className="ai-input" 
            placeholder="E.g., I think we should..." 
            value={partialMessage}
            onChange={(e) => setPartialMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSuggest();
              }
            }}
          />
          
          <button 
            className="ai-action-btn" 
            onClick={handleSuggest} 
            disabled={loadingSuggestions}
          >
            {loadingSuggestions ? <Loader2 size={16} className="spin" /> : <Zap size={16} />}
            {loadingSuggestions ? 'Thinking...' : 'Get Suggestions'}
          </button>
          
          {suggestionsError && <div className="ai-error">{suggestionsError}</div>}
          
          {suggestions.length > 0 && (
            <div className="ai-suggestions-list">
              {suggestions.map((sug, i) => (
                <button 
                  key={i} 
                  className="ai-suggestion-chip"
                  onClick={() => onUseSuggestion(sug)}
                >
                  {sug}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

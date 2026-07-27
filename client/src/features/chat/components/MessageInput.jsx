import { useState, useRef, useEffect } from 'react';

export default function MessageInput({ onSend, onTyping, onTextChange, helperText = true, replyTo, onClearReply, membersMap }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (replyTo) {
      inputRef.current?.focus();
    }
  }, [replyTo]);

  function submit(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
    onTextChange?.('');
  }

  function handleChange(e) {
    setText(e.target.value);
    onTyping?.();
    onTextChange?.(e.target.value);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(e);
    }
  }

  return (
    <div className="composer-wrapper">
      {replyTo && (
        <div className="composer-reply-quote">
          <div className="composer-reply-info">
            <span className="composer-reply-label">Replying to</span>
            <span className="composer-reply-name">{membersMap?.[replyTo.senderId] || replyTo.sender?.username || 'unknown'}</span>
          </div>
          <span className="composer-reply-text">{replyTo.text?.substring(0, 80) || '...'}</span>
          <button type="button" className="composer-reply-close" onClick={onClearReply} title="Cancel reply">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <form className="composer-card" onSubmit={submit}>
        <div className="composer-top-row">
          <span className="mic-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </span>
          <input
            ref={inputRef}
            placeholder="Send your message..."
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button type="submit" disabled={!text.trim()} className="send-navy-btn" title="Send message">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 10L4 15l5 5" /><path d="M20 4v7a4 4 0 0 1-4 4H4" />
            </svg>
          </button>
        </div>

        <div className="composer-bottom-actions">
          <div className="attach-group">
            <button type="button" className="attach-btn" title="Upload File">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </button>
            <button type="button" className="attach-btn" title="Attach Image">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </button>
            <button type="button" className="attach-btn" title="Take Photo">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
          </div>
          {helperText && (
            <div className="composer-helper-inline">
              Press <kbd>Enter</kbd> to send
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

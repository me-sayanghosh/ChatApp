import { useState, useRef, useEffect } from 'react';

export default function MessageInput({ onSend, onTyping, onTextChange, helperText = true }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
      <form className="composer" onSubmit={submit}>
        <div className="composer-input-row">
          <input
            ref={inputRef}
            placeholder="Type a message..."
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button type="submit" disabled={!text.trim()} className="send-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </div>
      </form>
      {helperText && (
        <div className="composer-helper">
          Press <kbd>Enter</kbd> to send, <kbd>Shift+Enter</kbd> for new line
        </div>
      )}
    </div>
  );
}

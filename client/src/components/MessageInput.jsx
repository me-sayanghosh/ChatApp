import { useState } from 'react';

export default function MessageInput({ onSend, onTyping, onTextChange }) {
  const [text, setText] = useState('');

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

  return (
    <form className="composer" onSubmit={submit}>
      <input
        placeholder="Type a message..."
        value={text}
        onChange={handleChange}
        autoFocus
      />
      <button type="submit">Send</button>
    </form>
  );
}

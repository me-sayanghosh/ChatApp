import { useState } from 'react';

export default function MessageInput({ onSend }) {
  const [text, setText] = useState('');

  function submit(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
  }

  return (
    <form className="composer" onSubmit={submit}>
      <input
        placeholder="Type a message…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      <button type="submit">Send</button>
    </form>
  );
}

import { useEffect, useRef } from 'react';

export default function MessageList({ messages, meId }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages]);

  return (
    <div className="messages" ref={ref}>
      {messages.length === 0 && <div className="empty">No messages yet. Say hi!</div>}
      {messages.map((m) => {
        const mine = m.senderId === meId || m.sender?.id === meId;
        const who = m.sender?.username || 'unknown';
        return (
          <div key={m.id} className={`msg ${mine ? 'me' : ''}`}>
            <div className="who">
              {who}
              <span className="when">{new Date(m.createdAt).toLocaleTimeString()}</span>
            </div>
            <div>{m.text}</div>
          </div>
        );
      })}
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';

export default function DMChat({ room, messages, userId, onAccept, onRemove, onSend, loading, onStartCall }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const isPending = room?.dmStatus === 'pending';
  const isInitiator = room?.dmInitiator === userId;
  const isRecipient = !isInitiator;
  const canChat = !isPending || !room;

  useEffect(() => {
    if (canChat) inputRef.current?.focus();
  }, [canChat, room?.id]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  function submit(e) {
    e.preventDefault();
    if (!text.trim() || !canChat) return;
    onSend(text.trim());
    setText('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(e);
    }
  }

  function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + String(m).padStart(2, '0') + ' ' + ampm;
  }

  if (!room) {
    return (
      <div className="dm-chat-empty">
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <h3>Select a conversation</h3>
        <p>Choose a DM from the sidebar or message someone privately from any group chat.</p>
      </div>
    );
  }

  const partnerName = messages.find((m) => m.senderId !== userId)?.sender?.username
    || room.partner?.username
    || 'User';

  return (
    <div className="dm-chat">
      {/* DM Chat Header */}
      <header className="dm-chat-header">
        <div className="dm-chat-header-left">
          <div className="dm-chat-avatar">
            {room.partner?.profileImage ? (
              <img src={room.partner.profileImage} alt={partnerName} />
            ) : (
              <span>{partnerName[0]?.toUpperCase()}</span>
            )}
          </div>
          <div className="dm-chat-info">
            <h2>{partnerName}</h2>
            <span className={`dm-status-pill ${isPending ? 'pending' : 'accepted'}`}>
              {isPending ? (isInitiator ? 'Pending' : 'Request') : 'Direct Message'}
            </span>
          </div>
        </div>

        {!isPending && (
          <div className="dm-chat-header-actions">
            <button
              className="header-icon-btn"
              onClick={() => onStartCall?.(room.partner?.id || room.partner?._id, room.id, false)}
              title="Voice Call"
            >
              📞
            </button>
            <button
              className="header-icon-btn"
              onClick={() => onStartCall?.(room.partner?.id || room.partner?._id, room.id, true)}
              title="Video Call"
            >
              📹
            </button>
          </div>
        )}
      </header>

      {/* Pending DM Banner */}
      {isPending && isRecipient && (
        <div className="dm-request-banner">
          <div className="dm-request-banner-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="dm-request-banner-body">
            <strong>{partnerName}</strong> wants to message you privately.
            <span>You can accept or remove this request.</span>
          </div>
          <div className="dm-request-banner-actions">
            <button className="dm-accept-btn" onClick={() => onAccept(room.id)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Accept
            </button>
            <button className="dm-remove-btn" onClick={() => onRemove(room.id)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              Remove
            </button>
          </div>
        </div>
      )}

      {isPending && isInitiator && (
        <div className="dm-waiting-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <span>Waiting for <strong>{partnerName}</strong> to accept your request.</span>
        </div>
      )}

      {/* Messages */}
      <div className="dm-messages-container" ref={containerRef}>
        {loading && <div className="dm-loading">Loading messages...</div>}
        {!loading && messages.length === 0 && (
          <div className="dm-messages-empty">
            {isPending && isInitiator
              ? 'Your message has been sent. Waiting for acceptance.'
              : 'Start the conversation.'}
          </div>
        )}
        {messages.map((m) => {
          const mine = m.senderId === userId;
          return (
            <div key={m.id} className={`dm-msg ${mine ? 'mine' : 'theirs'}`}>
              <div className="dm-msg-bubble">
                {m.deleted ? (
                  <span className="dm-msg-deleted">This message was deleted.</span>
                ) : (
                  <>
                    {m.text && <span className="dm-msg-text">{m.text}</span>}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="msg-attachments">
                        {m.attachments.map((att, idx) => (
                          att.fileType === 'image' ? (
                            <img key={idx} src={att.url} alt={att.filename} className="dm-att-img" />
                          ) : (
                            <a key={idx} href={att.url} download={att.filename} target="_blank" rel="noopener noreferrer" className="dm-att-doc">
                              📄 {att.filename}
                            </a>
                          )
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <span className="dm-msg-time">{formatTime(m.createdAt)}</span>
            </div>
          );
        })}
      </div>

      {/* Composer — only if accepted */}
      {canChat ? (
        <form className="dm-composer" onSubmit={submit}>
          <input
            ref={inputRef}
            placeholder={`Message ${partnerName}...`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button type="submit" disabled={!text.trim()} className="dm-send-btn" title="Send">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 10L4 15l5 5" /><path d="M20 4v7a4 4 0 0 1-4 4H4" />
            </svg>
          </button>
        </form>
      ) : (
        <div className="dm-composer-locked">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Waiting for acceptance before you can reply.
        </div>
      )}
    </div>
  );
}

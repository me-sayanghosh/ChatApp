import { useEffect, useRef, useState } from 'react';

export default function MessageList({
  messages, meId, onDelete, onDeleteForMe, members, onRead, readReceipts,
  onlineUserIds, onOpenThread, onReact, threadCounts, onReply, replyToData, membersMap
}) {
  const lastReadRef = useRef(null);
  const [contextMenuFor, setContextMenuFor] = useState(null);
  const [toast, setToast] = useState(null);
  const ctxMenuRef = useRef(null);
  const toastTimerRef = useRef(null);

  const menuPosition = { position: 'fixed' };

  function showToast(text) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(text);
    toastTimerRef.current = setTimeout(() => setToast(null), 2000);
  }

  useEffect(() => {
    if (messages.length > 0 && onRead) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.senderId !== meId) {
        if (lastReadRef.current !== lastMsg.id) {
          lastReadRef.current = lastMsg.id;
          onRead(lastMsg.id);
        }
      }
    }
  }, [messages, meId, onRead]);

  useEffect(() => {
    if (!contextMenuFor) return;
    function handleGlobalClick(e) {
      if (ctxMenuRef.current && !ctxMenuRef.current.contains(e.target)) {
        setContextMenuFor(null);
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setContextMenuFor(null);
    }
    document.addEventListener('mousedown', handleGlobalClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenuFor]);

  function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + String(m).padStart(2, '0') + ' ' + ampm;
  }

  function getMemberRole(userId) {
    if (!members) return null;
    const m = members.find((mem) => mem.user === userId);
    return m?.role || null;
  }

  function getReadStatus(msg) {
    if (msg.senderId !== meId) return null;
    if (!readReceipts || !onlineUserIds) return null;
    const onlineOthers = onlineUserIds.filter((id) => id !== meId);
    if (onlineOthers.length === 0) return null;
    let readCount = 0;
    for (const userId of onlineOthers) {
      const lastRead = readReceipts[userId];
      if (lastRead) {
        const readIdx = messages.findIndex((m) => m.id === lastRead);
        const msgIdx = messages.findIndex((m) => m.id === msg.id);
        if (readIdx >= msgIdx) readCount++;
      }
    }
    if (readCount === onlineOthers.length) return 'read';
    if (readCount > 0) return 'delivered';
    return 'sent';
  }

  function getSenderName(msg) {
    if (membersMap && msg.senderId && membersMap[msg.senderId]) {
      return membersMap[msg.senderId];
    }
    return msg.sender?.username || 'Unknown';
  }

  function getReplyToSender(msg) {
    if (!msg.replyTo) return '';
    const data = replyToData?.[msg.replyTo];
    return data?.senderUsername || 'Unknown';
  }

  function getReplyToText(msg) {
    if (!msg.replyTo) return '';
    const data = replyToData?.[msg.replyTo];
    if (!data) return 'Original message unavailable';
    const text = data.text;
    if (!text) return 'Original message unavailable';
    return text.length > 80 ? text.substring(0, 80) + '…' : text;
  }

  function openContextMenu(e, msg) {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 320);
    setContextMenuFor(msg.id);
    menuPosition.left = x + 'px';
    menuPosition.top = y + 'px';
  }

  const topLevel = messages.filter((m) => !m.parentMessage);

  return (
    <div className="messages">
      {toast && <div className="msg-toast">{toast}</div>}
      {topLevel.length === 0 && <div className="empty">No messages yet. Say hi!</div>}
      {topLevel.map((m) => {
        const mine = m.senderId === meId || m.sender?.id === meId;
        const who = getSenderName(m);
        const senderRole = getMemberRole(m.senderId);
        const readStatus = getReadStatus(m);
        const replyCount = threadCounts?.[m.id] || 0;
        const isMod = senderRole === 'owner' || senderRole === 'moderator';

        function handleQuickReact(emoji) {
          onReact?.(m.id, emoji);
          setContextMenuFor(null);
        }

        function handleReply() {
          onReply?.(m);
          setContextMenuFor(null);
        }

        function handleForward() {
          showToast('Coming soon');
          setContextMenuFor(null);
        }

        function handleCopy() {
          if (m.text) {
            navigator.clipboard.writeText(m.text).catch(() => {});
          }
          showToast('Copied');
          setContextMenuFor(null);
        }

        function handleDeleteForMe() {
          onDeleteForMe?.(m.id);
          setContextMenuFor(null);
        }

        function handleDeleteForEveryone() {
          onDelete?.(m.id);
          setContextMenuFor(null);
        }

        return (
          <div
            key={m.id}
            className={`msg ${mine ? 'me' : ''} ${m.deleted ? 'deleted' : ''}`}
            onContextMenu={!m.deleted ? (e) => openContextMenu(e, m) : undefined}
          >
            {m.replyTo && (
              <div className="reply-quote">
                <span className="reply-quote-name">
                  {getReplyToSender(m)}
                </span>
                <span className="reply-quote-text">
                  {getReplyToText(m)}
                </span>
              </div>
            )}

            {!mine && !m.deleted && (
              <div className="msg-sender">
                <span className="msg-sender-name">{who}</span>
                {senderRole === 'owner' && <span className="role-badge owner">Owner</span>}
                {senderRole === 'moderator' && <span className="role-badge mod">Mod</span>}
              </div>
            )}

            {m.deleted ? (
              <div className="msg-text deleted-text">This message was deleted.</div>
            ) : (
              <div className="msg-text">{m.text}</div>
            )}

            {m.reactions && m.reactions.length > 0 && (
              <div className="msg-reactions">
                {m.reactions.map((r) => (
                  <button
                    key={r.emoji}
                    className={`reaction-badge ${r.users.includes(meId) ? 'reacted' : ''}`}
                    onClick={() => onReact?.(m.id, r.emoji)}
                    title={r.users.length + ' reaction' + (r.users.length > 1 ? 's' : '')}
                  >
                    {r.emoji} {r.users.length}
                  </button>
                ))}
              </div>
            )}

            <div className="msg-footer">
              <span className="msg-time">{formatTime(m.createdAt)}</span>
              {m.reported && <span className="msg-reported">{'\u26A0'} reported</span>}
              {mine && readStatus && (
                <span className={`read-receipt ${readStatus}`} title={readStatus}>
                  {readStatus === 'sent' && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {readStatus === 'delivered' && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M1 8l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 8l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {readStatus === 'read' && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M1 8l3 3 7-7" stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 8l3 3 7-7" stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
              )}
            </div>

            {!m.deleted && (
              <div className="msg-hover-actions">
                <button
                  className="msg-hover-btn"
                  onClick={() => onReact?.(m.id, '👍')}
                  title="React"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4.5 7.5V14h1.6c.5 0 1-.3 1.2-.7l2.5-5.5c.2-.4.1-.8-.1-1.1-.2-.3-.5-.5-.9-.5H4.5zM9 2.5c0-.3.2-.5.5-.5s.5.2.5.5v3h1.5c.4 0 .8.3.9.7.1.3 0 .6-.2.9l-2 4H12V14h-3.5c-.5 0-1-.3-1.2-.7l-2.3-5.2V7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2.5 7.5H1.5c-.3 0-.5.2-.5.5v5c0 .3.2.5.5.5h1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button
                  className="msg-hover-btn"
                  onClick={() => onReply?.(m)}
                  title="Reply"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 5L3 8l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 8h7c2.2 0 3 1.5 3 3v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button
                  className="msg-hover-btn"
                  onClick={(e) => openContextMenu(e, m)}
                  title="More"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="8" cy="3" r="1.5"/>
                    <circle cx="8" cy="8" r="1.5"/>
                    <circle cx="8" cy="13" r="1.5"/>
                  </svg>
                </button>
              </div>
            )}

            {contextMenuFor === m.id && (
              <div className="msg-context-menu" ref={ctxMenuRef} style={menuPosition}>
                <div className="ctx-emoji-strip">
                  {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                    <button key={emoji} className="ctx-emoji-btn" onClick={() => handleQuickReact(emoji)}>
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="ctx-divider" />
                <button className="ctx-menu-item" onClick={handleReply}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 5L3 8l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 8h7c2.2 0 3 1.5 3 3v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Reply
                </button>
                <button className="ctx-menu-item" onClick={handleForward}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M10 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M13 8H6c-2.2 0-3 1.5-3 3v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Forward
                </button>
                <button className="ctx-menu-item" onClick={handleCopy}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="5" y="5" width="8" height="9" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M3 11V3a1 1 0 011-1h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  Copy
                </button>
                {(mine || isMod) && <div className="ctx-divider" />}
                {mine && (
                  <button className="ctx-menu-item ctx-danger" onClick={handleDeleteForMe}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v8.5a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 7v4M9 7v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                    Delete for me
                  </button>
                )}
                {(mine || isMod) && (
                  <button className="ctx-menu-item ctx-danger" onClick={handleDeleteForEveryone}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v8.5a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 7v4M9 7v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                    Delete for everyone
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

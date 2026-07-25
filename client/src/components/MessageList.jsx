import { useEffect, useRef, useState } from 'react';
import ReactionPicker from './ReactionPicker.jsx';

export default function MessageList({ messages, meId, onDelete, members, onRead, readReceipts, onlineUserIds, onOpenThread, onReact, threadCounts }) {
  const lastReadRef = useRef(null);
  const [reactionPickerFor, setReactionPickerFor] = useState(null);

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

  function getMemberRole(userId) {
    if (!members) return null;
    const m = members.find((mem) => mem.user === userId);
    return m?.role || null;
  }

  function canDelete(msg) {
    if (msg.deleted) return false;
    const isMine = msg.senderId === meId;
    const role = getMemberRole(meId);
    return isMine || role === 'owner' || role === 'moderator';
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

  const topLevel = messages.filter((m) => !m.parentMessage);

  return (
    <div className="messages">
      {topLevel.length === 0 && <div className="empty">No messages yet. Say hi!</div>}
      {topLevel.map((m) => {
        const mine = m.senderId === meId || m.sender?.id === meId;
        const who = m.sender?.username || 'unknown';
        const senderRole = getMemberRole(m.senderId);
        const readStatus = getReadStatus(m);
        const replyCount = threadCounts?.[m.id] || 0;

        if (m.deleted) {
          return (
            <div key={m.id} className="msg deleted">
              <div className="msg-text deleted-text">This message was deleted.</div>
            </div>
          );
        }

        return (
          <div key={m.id} className={`msg ${mine ? 'me' : ''}`}>
            <div className="who">
              {senderRole === 'owner' && <span className="role-badge owner" title="Owner">{'\u265B'}</span>}
              {senderRole === 'moderator' && <span className="role-badge mod" title="Moderator">{'\u2694'}</span>}
              {who}
              <span className="when">{new Date(m.createdAt).toLocaleTimeString()}</span>
            </div>
            <div className="msg-text">{m.text}</div>
            <div className="msg-footer">
              {m.reported && <span className="msg-reported">{'\u26A0'} reported</span>}
              {mine && readStatus && (
                <span className={`read-receipt ${readStatus}`} title={readStatus}>
                  {readStatus === 'sent' && '\u2713'}
                  {readStatus === 'delivered' && '\u2713\u2713'}
                  {readStatus === 'read' && '\u2713\u2713'}
                </span>
              )}
            </div>
            {m.reactions && m.reactions.length > 0 && (
              <div className="msg-reactions">
                {m.reactions.map((r) => {
                  const hasReacted = r.users.includes(meId);
                  return (
                    <button
                      key={r.emoji}
                      className={`reaction-badge ${hasReacted ? 'reacted' : ''}`}
                      onClick={() => onReact?.(m.id, r.emoji)}
                      title={r.users.length + ' reaction' + (r.users.length > 1 ? 's' : '')}
                    >
                      {r.emoji} {r.users.length}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="msg-actions">
              <button
                className="msg-action-btn"
                onClick={() => setReactionPickerFor(reactionPickerFor === m.id ? null : m.id)}
                title="Add reaction"
              >
                {'\u{1F60A}'}
              </button>
              <button
                className="msg-action-btn"
                onClick={() => onOpenThread?.(m)}
                title="Reply in thread"
              >
                {'\u{1F4AC}'} {replyCount > 0 && <span className="thread-count">{replyCount}</span>}
              </button>
              {canDelete(m) && (
                <button className="msg-action-btn delete" onClick={() => onDelete?.(m.id)} title="Delete message">
                  {'\u2716'}
                </button>
              )}
            </div>
            {reactionPickerFor === m.id && (
              <ReactionPicker
                onReact={(emoji) => { onReact?.(m.id, emoji); setReactionPickerFor(null); }}
                onClose={() => setReactionPickerFor(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import { getSocket } from '../socket.js';
import { getRoomKey, encryptText, decryptText } from '../crypto.js';

export default function ThreadPanel({ parentMessage, roomId, meId, isPrivate, onClose }) {
  const [replies, setReplies] = useState([]);
  const [text, setText] = useState('');
  const ref = useRef(null);
  const [decryptedReplies, setDecryptedReplies] = useState({});

  async function maybeDecryptReply(msg) {
    if (!isPrivate || !msg.text || msg.deleted) return;
    const aesKey = getRoomKey(roomId);
    if (!aesKey) return;
    try {
      const plain = await decryptText(aesKey, msg.text);
      setDecryptedReplies((prev) => ({ ...prev, [msg.id]: plain }));
    } catch {
      setDecryptedReplies((prev) => ({ ...prev, [msg.id]: '[decryption failed]' }));
    }
  }

  useEffect(() => {
    if (!parentMessage) return;
    api.get(`/rooms/${roomId}/messages/${parentMessage.id}/replies`)
      .then((r) => {
        const fetched = r.data.replies || [];
        setReplies(fetched);
        for (const msg of fetched) maybeDecryptReply(msg);
      })
      .catch(() => {});
  }, [parentMessage, roomId]);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [replies]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function onThreadReply({ parentMessageId, reply }) {
      if (parentMessageId === parentMessage?.id) {
        setReplies((prev) => [...prev, reply]);
        maybeDecryptReply(reply);
      }
    }
    function onMessageDeleted({ messageId }) {
      setReplies((prev) => prev.map((m) =>
        m.id === messageId ? { ...m, deleted: true, text: '' } : m
      ));
    }

    socket.on('message:thread-reply', onThreadReply);
    socket.on('message:deleted', onMessageDeleted);
    return () => {
      socket.off('message:thread-reply', onThreadReply);
      socket.off('message:deleted', onMessageDeleted);
    };
  }, [parentMessage]);

  async function sendReply(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t || !parentMessage) return;
    const socket = getSocket();
    if (!socket) return;

    let textToSend = t;
    if (isPrivate && getRoomKey(roomId)) {
      try {
        textToSend = await encryptText(getRoomKey(roomId), t);
      } catch (err) {
        console.error('thread encrypt failed:', err);
        return;
      }
    }

    socket.emit('message:thread-reply', {
      roomId,
      parentMessageId: parentMessage.id,
      text: textToSend,
    });
    setText('');
  }

  if (!parentMessage) return null;

  return (
    <aside className="thread-panel">
      <div className="thread-header">
        <h3>Thread</h3>
        <button className="thread-close" onClick={onClose}>&times;</button>
      </div>
      <div className="thread-parent">
        <div className="thread-parent-who">
          {parentMessage.sender?.username || 'unknown'}
          <span className="when">{new Date(parentMessage.createdAt).toLocaleTimeString()}</span>
        </div>
        <div className="thread-parent-text">{parentMessage.text}</div>
      </div>
      <div className="thread-replies" ref={ref}>
        {replies.length === 0 && <div className="empty">No replies yet.</div>}
        {replies.map((m) => {
          const mine = m.senderId === meId;
          const who = m.sender?.username || 'unknown';
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
                {who}
                <span className="when">{new Date(m.createdAt).toLocaleTimeString()}</span>
              </div>
              <div className="msg-text">{decryptedReplies[m.id] || m.text}</div>
            </div>
          );
        })}
      </div>
      <form className="thread-composer" onSubmit={sendReply}>
        <input
          placeholder="Reply in thread..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <button type="submit">Reply</button>
      </form>
    </aside>
  );
}

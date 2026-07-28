import { useEffect, useRef, useState } from 'react';
import { formatDateSeparator } from '../../../shared/utils/dateUtils.js';
import { getMediaUrl } from '../../../shared/utils/index.js';

/**
 * Parse message text and highlight @username mentions.
 * @param {string} text - raw message text
 * @param {string} myUsername - the current user's username (for self-highlight)
 * @param {Object} membersMap - { id: username } lookup
 */
function renderMentions(text, myUsername, membersMap) {
  if (!text) return null;
  // Build a reverse map: username -> id
  const byUsername = {};
  for (const [id, uname] of Object.entries(membersMap || {})) {
    byUsername[uname.toLowerCase()] = id;
  }

  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const uname = part.slice(1).toLowerCase();
      if (byUsername[uname] !== undefined || uname === myUsername?.toLowerCase()) {
        const isSelf = uname === myUsername?.toLowerCase();
        return (
          <span key={i} className={`mention-chip ${isSelf ? 'self' : ''}`}>
            {part}
          </span>
        );
      }
    }
    return part;
  });
}

/**
 * Render message media attachments (images, video, audio, documents).
 */
function renderAttachments(attachments, setLightboxData) {
  if (!attachments || attachments.length === 0) return null;

  function formatSize(bytes) {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function getDocExtension(filename) {
    if (!filename) return 'FILE';
    const ext = filename.split('.').pop().toUpperCase();
    return ext.length <= 4 ? ext : 'FILE';
  }

  return (
    <div className="msg-attachments">
      {attachments.map((att, i) => {
        const fullUrl = getMediaUrl(att.url);
        const fileName = att.filename || 'attachment';

        if (att.fileType === 'image') {
          return (
            <div
              key={i}
              className="msg-att-image-card"
              onClick={() => setLightboxData({ url: fullUrl, filename: fileName })}
            >
              <img src={fullUrl} alt={fileName} loading="lazy" />
              <div className="img-hover-overlay">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </div>
            </div>
          );
        }
        if (att.fileType === 'video') {
          return (
            <div key={i} className="msg-att-video-card">
              <video controls src={fullUrl} preload="metadata" />
            </div>
          );
        }
        if (att.fileType === 'audio') {
          return (
            <div key={i} className="msg-att-audio-card">
              <div className="audio-card-icon">🎵</div>
              <div className="audio-card-body">
                <audio controls src={fullUrl} />
                <span className="audio-filename">{fileName}</span>
              </div>
            </div>
          );
        }

        // Document / File Card
        const extTag = getDocExtension(fileName);
        return (
          <a
            key={i}
            href={fullUrl}
            download={fileName}
            target="_blank"
            rel="noopener noreferrer"
            className="msg-att-doc-card"
          >
            <div className={`doc-badge ext-${extTag.toLowerCase()}`}>{extTag}</div>
            <div className="doc-info">
              <span className="doc-name" title={fileName}>{fileName}</span>
              <span className="doc-size">{formatSize(att.size)}</span>
            </div>
            <div className="doc-download-icon" title="Download File">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
          </a>
        );
      })}
    </div>
  );
}

export default function MessageList({
  messages, meId, onDelete, onDeleteForMe, members, onRead, readReceipts,
  onlineUserIds, onOpenThread, onReact, threadCounts, onReply, replyToData, membersMap, onDMUser,
  onEdit, onPin, onUnpin, onOpenForward, pinnedMessages = []
}) {
  const lastReadRef = useRef(null);
  const [contextMenuFor, setContextMenuFor] = useState(null);
  const [toast, setToast] = useState(null);
  const [lightboxData, setLightboxData] = useState(null); // { url, filename }
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
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
  let lastDateLabel = null;

  return (
    <div className="messages">
      {toast && <div className="msg-toast">{toast}</div>}
      {topLevel.length === 0 && <div className="empty">No messages yet. Say hi!</div>}
      {topLevel.map((m) => {
        const dateLabel = formatDateSeparator(m.createdAt);
        let showDateSep = false;
        if (dateLabel !== lastDateLabel) {
          lastDateLabel = dateLabel;
          showDateSep = true;
        }

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
          <div key={m.id} style={{ display: 'contents' }}>
            {showDateSep && (
              <div className="date-separator">
                <span>{dateLabel}</span>
              </div>
            )}
            <div
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

            {m.forwardedFrom && (
              <div className="msg-forwarded-header">
                <span>↩ Forwarded from @{m.forwardedFrom.senderUsername}</span>
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
            ) : editingId === m.id ? (
              <div className="msg-inline-edit-box">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onEdit?.(m.id, editText);
                      setEditingId(null);
                    } else if (e.key === 'Escape') {
                      setEditingId(null);
                    }
                  }}
                  autoFocus
                />
                <div className="edit-box-actions">
                  <button
                    className="edit-save-btn"
                    onClick={() => {
                      onEdit?.(m.id, editText);
                      setEditingId(null);
                    }}
                  >
                    Save
                  </button>
                  <button className="edit-cancel-btn" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {m.text && (
                  <div className="msg-text">
                    {renderMentions(m.text, members?.find?.(mb => mb.user === meId)?.username, membersMap)}
                    {m.edited && <span className="edited-tag">(edited)</span>}
                  </div>
                )}
                {renderAttachments(m.attachments, setLightboxData)}
              </>
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
                {!mine && onDMUser && (
                  <button
                    className="msg-hover-btn msg-hover-btn--dm"
                    onClick={() => onDMUser(m.senderId, getSenderName(m))}
                    title="Message privately"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                      <path d="M19 8l2 2-2 2" /><path d="M21 10h-4" />
                    </svg>
                  </button>
                )}
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
            {/* Thread Reply Badge */}
            {replyCount > 0 && (
              <button
                className="msg-thread-badge"
                onClick={() => onOpenThread?.(m)}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
              </button>
            )}

            {/* Context Menu Popup */}
            {contextMenuFor === m.id && (
              <div
                className="msg-context-menu"
                ref={ctxMenuRef}
                style={menuPosition}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="ctx-quick-reactions">
                  {['👍', '❤️', '🔥', '😂', '🎉', '🚀'].map((emoji) => (
                    <button
                      key={emoji}
                      className="ctx-react-btn"
                      onClick={() => handleQuickReact(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="ctx-divider" />
                <button className="ctx-menu-item" onClick={handleReply}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 3L2 7l4 4M2 7h9a3 3 0 013 3v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Reply
                </button>
                <button
                  className="ctx-menu-item"
                  onClick={() => {
                    onOpenThread?.(m);
                    setContextMenuFor(null);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M14 10a2 2 0 01-2 2H4l-2 2V4a2 2 0 012-2h8a2 2 0 012 2v6z" stroke="currentColor" strokeWidth="1.3"/>
                  </svg>
                  Reply in Thread
                </button>
                <button className="ctx-menu-item" onClick={handleForward}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M10 3l4 4-4 4M14 7H5a3 3 0 00-3 3v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Forward Message
                </button>
                {mine && !m.deleted && (
                  <button
                    className="ctx-menu-item"
                    onClick={() => {
                      setEditingId(m.id);
                      setEditText(m.text || '');
                      setContextMenuFor(null);
                    }}
                  >
                    ✏️ Edit message
                  </button>
                )}
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
        </div>
        );
      })}

      {/* Lightbox Fullscreen Image Preview Modal */}
      {lightboxData && (
        <div className="lightbox-backdrop" onClick={() => setLightboxData(null)}>
          <div className="lightbox-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-modal-header">
              <span className="lightbox-modal-title">{lightboxData.filename}</span>
              <div className="lightbox-modal-actions">
                <a
                  href={lightboxData.url}
                  download={lightboxData.filename}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lightbox-download-link"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download
                </a>
                <button className="lightbox-modal-close" onClick={() => setLightboxData(null)} title="Close (Esc)">
                  &times;
                </button>
              </div>
            </div>

            <div className="lightbox-modal-body">
              <img src={lightboxData.url} alt={lightboxData.filename} className="lightbox-img" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

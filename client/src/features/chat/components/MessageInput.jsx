import { useState, useRef, useEffect } from 'react';
import { api } from '../../../shared/utils/api.js';

export default function MessageInput({ onSend, onTyping, onTextChange, replyTo, onClearReply, membersMap, slowMode = 0 }) {
  const [text, setText] = useState('');
  const [mentionQuery, setMentionQuery] = useState(null); // string after @ or null
  const [mentionIndex, setMentionIndex] = useState(0);
  const [attachments, setAttachments] = useState([]); // [{ url, filename, fileType, mimeType, size }]
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [coolDown, setCoolDown] = useState(0);

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const timerRef = useRef(null);

  // Build members list from membersMap: { id: username }
  const membersList = Object.entries(membersMap || {}).map(([id, username]) => ({ id, username }));

  // Filtered members matching the current @query
  const mentionMatches = mentionQuery !== null
    ? membersList.filter((m) => m.username.toLowerCase().startsWith(mentionQuery.toLowerCase())).slice(0, 8)
    : [];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  function detectMention(value) {
    const cursor = inputRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  }

  function insertMention(username) {
    const cursor = inputRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, cursor);
    const after = text.slice(cursor);
    const replaced = before.replace(/@(\w*)$/, `@${username} `);
    const newText = replaced + after;
    setText(newText);
    setMentionQuery(null);
    onTextChange?.(newText);
    setTimeout(() => {
      inputRef.current?.focus();
      const pos = replaced.length;
      inputRef.current?.setSelectionRange(pos, pos);
    }, 0);
  }

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setUploadErr('');

    try {
      const formData = new FormData();
      if (files.length === 1) {
        formData.append('file', files[0]);
        const res = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data?.attachment) {
          setAttachments((prev) => [...prev, res.data.attachment]);
        }
      } else {
        files.forEach((f) => formData.append('files', f));
        const res = await api.post('/upload/multiple', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data?.attachments) {
          setAttachments((prev) => [...prev, ...res.data.attachments]);
        }
      }
    } catch (err) {
      setUploadErr(err.response?.data?.error || err.message || 'File upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }

  function removeAttachment(index) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function submit(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t && attachments.length === 0) return;
    if (uploading) return;

    onSend(t, attachments);
    setText('');
    setAttachments([]);
    onTextChange?.('');
    setMentionQuery(null);
  }

  function handleChange(e) {
    const val = e.target.value;
    setText(val);
    detectMention(val);
    onTyping?.();
    onTextChange?.(val);
  }

  function handleKeyDown(e) {
    if (mentionQuery !== null && mentionMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionMatches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + mentionMatches.length) % mentionMatches.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionMatches[mentionIndex].username);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(e);
    }
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  const canSubmit = (text.trim().length > 0 || attachments.length > 0) && !uploading;

  return (
    <div className="composer-wrapper">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        onChange={handleFileSelect}
        multiple
        style={{ display: 'none' }}
      />

      {/* Slow Mode Indicator */}
      {coolDown > 0 && (
        <div className="slowmode-active-bar">
          ⏳ Slow mode active: please wait <strong>{coolDown}s</strong> before sending another message.
        </div>
      )}

      {/* Reply quote bar */}
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

      {/* Attachments Preview Bar */}
      {attachments.length > 0 && (
        <div className="composer-attachments-bar">
          {attachments.map((att, i) => (
            <div key={i} className="attachment-preview-chip">
              {att.fileType === 'image' ? (
                <img src={att.url} alt={att.filename} className="att-thumb" />
              ) : (
                <div className="att-file-icon">
                  {att.fileType === 'video' ? '🎬' : att.fileType === 'audio' ? '🎵' : '📄'}
                </div>
              )}
              <div className="att-info">
                <span className="att-filename">{att.filename}</span>
                <span className="att-size">{formatBytes(att.size)}</span>
              </div>
              <button
                type="button"
                className="att-remove-btn"
                onClick={() => removeAttachment(i)}
                title="Remove attachment"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Uploading indicator */}
      {uploading && (
        <div className="composer-uploading-bar">
          <span className="spinner" />
          <span>Uploading attachment(s)...</span>
        </div>
      )}

      {uploadErr && <div className="composer-upload-error">{uploadErr}</div>}

      {/* @Mention autocomplete dropdown */}
      {mentionQuery !== null && mentionMatches.length > 0 && (
        <div className="mention-dropdown">
          <div className="mention-dropdown-header">
            <span>@Mentions</span>
          </div>
          {mentionMatches.map((m, i) => (
            <button
              key={m.id}
              type="button"
              className={`mention-dropdown-item ${i === mentionIndex ? 'active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); insertMention(m.username); }}
            >
              <span className="mention-avatar">{m.username[0]?.toUpperCase()}</span>
              <span className="mention-username">@{m.username}</span>
            </button>
          ))}
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
            placeholder="Send a message... (@ to mention)"
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button type="submit" disabled={!canSubmit} className="send-navy-btn" title="Send message">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 10L4 15l5 5" /><path d="M20 4v7a4 4 0 0 1-4 4H4" />
            </svg>
          </button>
        </div>

        <div className="composer-bottom-actions">
          <div className="attach-group">
            <button
              type="button"
              className="attach-btn"
              title="Upload File"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </button>
            <button
              type="button"
              className="attach-btn"
              title="Attach Image"
              onClick={() => imageInputRef.current?.click()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </button>
            <button
              type="button"
              className="attach-btn"
              title="Take Photo"
              onClick={() => imageInputRef.current?.click()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
          </div>
          <div className="at-hint">
            <span>@ mention</span>
          </div>
        </div>
      </form>
    </div>
  );
}

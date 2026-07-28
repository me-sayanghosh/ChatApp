import { useState, useEffect, useRef } from 'react';
import { api } from '../../../shared/utils/api.js';
import { formatBadgeCount, formatCardTime } from '../../../shared/utils/dateUtils.js';

export default function DMPanel({ conversations, currentDM, onOpen, onSendRequest, userId }) {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    const query = search.trim().replace(/^@/, '');

    if (!query) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/auth/users/search?q=${encodeURIComponent(query)}`);
        setSearchResults(res.data.users || []);
      } catch (err) {
        console.error('User search error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search]);

  const filteredConversations = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().replace(/^@/, '');
    return c.partner?.username?.toLowerCase().includes(q) || c.partner?.name?.toLowerCase().includes(q);
  });

  const pending = filteredConversations.filter(
    (c) => c.dmStatus === 'pending' && c.dmInitiator !== userId
  );
  const accepted = filteredConversations.filter(
    (c) => c.dmStatus === 'accepted' || c.dmInitiator === userId
  );

  function renderConvoItem(convo) {
    const isActive = currentDM?.id === convo.id;
    const isPending = convo.dmStatus === 'pending';
    const isRecipient = convo.dmInitiator !== userId;
    const avatar = convo.partner?.profileImage;
    const initial = (convo.partner?.username || '?')[0].toUpperCase();
    const preview = convo.lastMessage?.text || 'No messages yet';
    const timeStr = formatCardTime(convo.lastMessage?.createdAt);
    const unreadCount = convo.unreadCount || (isPending && isRecipient ? 1 : 0);
    const hasUnread = unreadCount > 0 && !isActive;

    return (
      <div
        key={convo.id}
        className={`dm-item ${isActive ? 'active' : ''} ${hasUnread ? 'has-unread' : ''}`}
        onClick={() => onOpen(convo)}
        role="button"
        tabIndex={0}
      >
        <div className="dm-avatar">
          {avatar ? (
            <img src={avatar} alt={convo.partner?.username} />
          ) : (
            <span>{initial}</span>
          )}
          {isPending && isRecipient && <span className="dm-avatar-badge" />}
        </div>

        <div className="dm-item-body">
          <div className="dm-item-header">
            <span className={`dm-item-name ${hasUnread ? 'dm-name-unread' : ''}`}>
              {convo.partner?.username || 'Unknown'}
            </span>
            {timeStr && (
              <span className={`dm-item-time ${hasUnread ? 'dm-time-unread' : ''}`}>
                {timeStr}
              </span>
            )}
          </div>

          <div className="dm-item-footer">
            <span className="dm-preview-text" title={preview}>
              {isPending && isRecipient
                ? '📨 DM Request'
                : isPending && !isRecipient
                ? '⏳ Waiting for acceptance...'
                : preview.length > 42
                ? preview.substring(0, 42) + '…'
                : preview}
            </span>

            {hasUnread && (
              <span className="conv-badge count unread-badge">
                {formatBadgeCount(unreadCount) || '1'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dm-panel">
      <div className="dm-panel-header">
        <h2>Direct Messages</h2>
      </div>

      <div className="dm-search-bar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          placeholder="Search members or start DM..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="dm-search-clear" onClick={() => setSearch('')}>&times;</button>
        )}
      </div>

      {/* Global User Discovery Section when searching */}
      {search.trim().length > 0 && (
        <div className="dm-section dm-discovery-section">
          <div className="dm-section-label">
            User Discovery {searching && '🔍 Searching...'}
          </div>
          {searchResults.length > 0 ? (
            searchResults.map((user) => {
              const existingConvo = conversations.find(
                (c) => c.partner?.id === user.id
              );

              return (
                <div key={user.id} className="dm-discovery-item">
                  <div className="dm-avatar">
                    {user.profileImage ? (
                      <img src={user.profileImage} alt={user.username} />
                    ) : (
                      <span>{(user.username || 'U')[0].toUpperCase()}</span>
                    )}
                  </div>
                  <div className="dm-item-body">
                    <div className="dm-item-name">
                      {user.name ? `${user.name} (@${user.username})` : `@${user.username}`}
                    </div>
                    {user.customStatus?.text && (
                      <span className="dm-custom-status">
                        {user.customStatus.emoji} {user.customStatus.text}
                      </span>
                    )}
                  </div>
                  <button
                    className="dm-start-btn"
                    onClick={() => {
                      if (existingConvo) {
                        onOpen(existingConvo);
                      } else {
                        onSendRequest?.(user.id);
                      }
                      setSearch('');
                    }}
                  >
                    {existingConvo ? 'Chat' : 'Message'}
                  </button>
                </div>
              );
            })
          ) : !searching ? (
            <div className="dm-discovery-none">No user matching "{search}"</div>
          ) : null}
        </div>
      )}

      {/* Pending DM requests */}
      {pending.length > 0 && (
        <div className="dm-section">
          <div className="dm-section-label">Requests ({pending.length})</div>
          {pending.map(renderConvoItem)}
        </div>
      )}

      {/* Active DM conversations */}
      {accepted.length > 0 && (
        <div className="dm-section">
          <div className="dm-section-label">Conversations</div>
          {accepted.map(renderConvoItem)}
        </div>
      )}

      {filteredConversations.length === 0 && searchResults.length === 0 && (
        <div className="dm-empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p>No direct messages yet.</p>
          <span>Search a username above to start a private conversation.</span>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useChat from '../hooks/useChat.js';
import { Channels, MemberList, TypingIndicator, PresenceMap, ThreadPanel, AIPanel, PendingRequests, ScrollToBottom, SuggestionsBar, MessageList, MessageInput } from '../components/index.js';

export default function Chat() {
  const {
    user, logout, rooms, currentRoom, displayMessages, online, members,
    showMembers, setShowMembers, showPresence, setShowPresence,
    typingUsers, presenceMap, readReceipts, threadMessage, setThreadMessage,
    threadCounts, keyStatus, currentInput, setCurrentInput,
    memberRooms, pendingRooms, replyTo, setReplyTo, replyToData, membersMap,
    messagesContainerRef, isPrivate, hasKey,
    selectRoom, leaveRoom, handleRequestJoin, createRoom,
    send, handleTyping, deleteMessage, deleteForMe, handleReadReceipt, handleReact, refreshMembers,
  } = useChat();

  const nav = useNavigate();
  const [activeCategory, setActiveCategory] = useState('current');
  const [activeModel, setActiveModel] = useState('GPT-6');
  const [navRailTab, setNavRailTab] = useState('chat');

  return (
    <div className="chat-app-shell">
      {/* 1. Left-most Royal Blue Nav Rail */}
      <nav className="nav-rail">
        <div className="rail-top">
          <button className="rail-btn action-plus" title="New Action">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        <div className="rail-middle">
          <button
            className={`rail-btn ${navRailTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setNavRailTab('analytics')}
            title="Analytics"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </button>

          <button
            className={`rail-btn ${navRailTab === 'bookmark' ? 'active' : ''}`}
            onClick={() => setNavRailTab('bookmark')}
            title="Bookmarks"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          <button
            className={`rail-btn ${navRailTab === 'chat' ? 'active' : ''}`}
            onClick={() => setNavRailTab('chat')}
            title="Conversations"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </button>

          <button
            className={`rail-btn ${navRailTab === 'settings' ? 'active' : ''}`}
            onClick={() => setNavRailTab('settings')}
            title="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>

        <div className="rail-bottom">
          <button className="rail-btn user-avatar-btn" onClick={() => nav('/profile')} title="Profile Settings">
            {user?.profileImage ? (
              <img src={user.profileImage} alt="Profile" />
            ) : (
              <span>{(user?.username || 'U')[0].toUpperCase()}</span>
            )}
          </button>
          <button className="rail-btn logout-btn" onClick={logout} title="Log Out">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </nav>

      {/* 2. Second Panel - Inbox / Categories Sidebar */}
      <aside className="nav-category-panel">
        <div className="panel-header">
          <h2>Inbox</h2>
          <button className="icon-search-btn" title="Search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>

        <div className="category-section">
          <div className="section-label">Conversations</div>
          <ul className="category-list">
            <li className={activeCategory === 'current' ? 'active' : ''} onClick={() => setActiveCategory('current')}>
              <span className="cat-icon">💬</span>
              <span className="cat-name">Current</span>
              <span className="cat-count">157</span>
            </li>
            <li className={activeCategory === 'active' ? 'active' : ''} onClick={() => setActiveCategory('active')}>
              <span className="cat-icon">⭐</span>
              <span className="cat-name">Active</span>
              <span className="cat-count">48</span>
            </li>
            <li className={activeCategory === 'inactive' ? 'active' : ''} onClick={() => setActiveCategory('inactive')}>
              <span className="cat-icon warning">⚠️</span>
              <span className="cat-name">Inactive</span>
              <span className="cat-count highlight">8</span>
            </li>
            <li className={activeCategory === 'archived' ? 'active' : ''} onClick={() => setActiveCategory('archived')}>
              <span className="cat-icon">📁</span>
              <span className="cat-name">Archived</span>
              <span className="cat-count">7</span>
            </li>
            <li className={activeCategory === 'deleted' ? 'active' : ''} onClick={() => setActiveCategory('deleted')}>
              <span className="cat-icon">🗑️</span>
              <span className="cat-name">Deleted</span>
              <span className="cat-count">55</span>
            </li>
            <li className={activeCategory === 'upgrade' ? 'active' : ''} onClick={() => setActiveCategory('upgrade')}>
              <span className="cat-icon">📥</span>
              <span className="cat-name">Upgrade</span>
              <span className="cat-count">12</span>
            </li>
            <li className={activeCategory === 'support' ? 'active' : ''} onClick={() => setActiveCategory('support')}>
              <span className="cat-icon">❓</span>
              <span className="cat-name">Support</span>
              <span className="cat-count">964</span>
            </li>
          </ul>
        </div>

        <div className="category-section models-section">
          <div className="section-label">AI LLM Models*</div>
          <ul className="models-list">
            <li className={activeModel === 'GPT-6' ? 'active' : ''} onClick={() => setActiveModel('GPT-6')}>
              <span className="model-name">GPT-6 <span className="beta-badge">BETA</span></span>
              <span className="model-stat">8tb</span>
            </li>
            <li className={activeModel === 'LLama8' ? 'active' : ''} onClick={() => setActiveModel('LLama8')}>
              <span className="model-name">LLama8</span>
              <span className="model-stat">1.5tb</span>
            </li>
            <li className={activeModel === 'Anthropic' ? 'active' : ''} onClick={() => setActiveModel('Anthropic')}>
              <span className="model-name">Anthropic <span className="beta-badge">BETA</span></span>
              <span className="model-stat">9tb</span>
            </li>
            <li className={activeModel === 'SenpaiLLM' ? 'active' : ''} onClick={() => setActiveModel('SenpaiLLM')}>
              <span className="model-name">SenpaiLLM <span className="beta-badge">BETA</span></span>
              <span className="model-stat">1tb</span>
            </li>
          </ul>
        </div>

        <button className="go-pro-btn">
          Go Pro ★
        </button>
      </aside>

      {/* 3. Third Panel - Conversations / Channels List */}
      <aside className="sidebar">
        <Channels
          rooms={rooms}
          current={currentRoom}
          onSelect={selectRoom}
          onCreate={createRoom}
          onLeave={leaveRoom}
          onRequestJoin={handleRequestJoin}
          memberRooms={memberRooms}
          pendingRooms={pendingRooms}
        />
      </aside>

      {/* 4. Main Chat Area */}
      <main className="main">
        <header className="chat-header">
          {currentRoom ? (
            <>
              <div className="header-left">
                <div className="header-avatar-badge">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
                  </svg>
                </div>
                <div className="header-room-info">
                  <h2 className="header-room-name">
                    {currentRoom.name} <span className="verified-badge">✓</span>
                  </h2>
                  <div className="header-room-meta">
                    <span className="meta-pill">{activeModel}</span>
                    <span className="header-sep">&middot;</span>
                    <span className="dot online"></span>
                    <span>{online.length} online</span>
                    <span className="header-sep">&middot;</span>
                    <span>{members.length} members</span>
                    {currentRoom.type === 'private' && keyStatus === 'waiting' && (
                      <span className="key-status waiting"> &middot; key exchange...</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="header-right">
                <button className="header-icon-btn" title="Search messages">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>
                <button
                  className={`header-icon-btn ${showPresence ? 'active' : ''}`}
                  onClick={() => { setShowPresence(!showPresence); setShowMembers(false); }}
                  title="Presence Map"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </button>
                <button
                  className={`header-icon-btn ${showMembers ? 'active' : ''}`}
                  onClick={() => { setShowMembers(!showMembers); setShowPresence(false); }}
                  title="Members"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </button>
                <AIPanel roomId={currentRoom.id} currentInput={currentInput} />
              </div>
            </>
          ) : (
            <h2>Welcome to DropTalk AI</h2>
          )}
        </header>

        <div className="main-content">
          {currentRoom ? (
            <>
              <div className="chat-area">
                {isPrivate && keyStatus !== 'ready' && keyStatus !== null && (
                  <div className="encryption-notice">
                    {keyStatus === 'waiting' ? 'Exchanging E2EE keys...' : 'Encryption key error'}
                  </div>
                )}
                <div className="messages-container" ref={messagesContainerRef}>
                  <div className="date-separator"><span>Today</span></div>
                  <MessageList
                    messages={displayMessages}
                    meId={user?.id}
                    onDelete={deleteMessage}
                    onDeleteForMe={deleteForMe}
                    members={members}
                    onRead={handleReadReceipt}
                    readReceipts={readReceipts}
                    onlineUserIds={online.map((u) => u.id)}
                    onOpenThread={setThreadMessage}
                    onReact={handleReact}
                    threadCounts={threadCounts}
                    onReply={setReplyTo}
                    replyToData={replyToData}
                    membersMap={membersMap}
                  />
                  <ScrollToBottom containerRef={messagesContainerRef} />
                </div>
                <TypingIndicator typingUsers={typingUsers} />
                <SuggestionsBar
                  roomId={currentRoom.id}
                  currentInput={currentInput}
                  onSuggestionClick={(s) => setCurrentInput(s)}
                />
                <MessageInput
                  onSend={send}
                  onTyping={handleTyping}
                  onTextChange={setCurrentInput}
                  replyTo={replyTo}
                  onClearReply={() => setReplyTo(null)}
                  membersMap={membersMap}
                />
              </div>
              {showMembers && (
                <aside className="members-panel">
                  <MemberList
                    members={members}
                    online={online}
                    roomId={currentRoom.id}
                    currentUserId={user?.id}
                    onMemberUpdate={refreshMembers}
                  />
                  <PendingRequests
                    roomId={currentRoom.id}
                    isAdmin={members.some((m) => m.user === user?.id && (m.role === 'owner' || m.role === 'moderator'))}
                    onRequestHandled={refreshMembers}
                  />
                </aside>
              )}
              {showPresence && (
                <aside className="members-panel">
                  <PresenceMap presenceMap={presenceMap} currentUserId={user?.id} rooms={rooms} />
                </aside>
              )}
              {threadMessage && (
                <ThreadPanel
                  parentMessage={threadMessage}
                  roomId={currentRoom.id}
                  meId={user?.id}
                  isPrivate={isPrivate}
                  onClose={() => setThreadMessage(null)}
                />
              )}
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3>No conversation selected</h3>
              <p>Select a conversation from the sidebar or start a new thread to collaborate.</p>
              {rooms.length > 0 && (
                <button className="primary-action-btn" onClick={() => selectRoom(rooms[0])}>
                  Join #{rooms[0].name}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

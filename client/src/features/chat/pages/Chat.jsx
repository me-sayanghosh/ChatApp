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

  return (
    <div className="chat">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-title">DropTalk</span>
          <button className="sidebar-avatar" onClick={() => nav('/profile')} title="Profile Settings">
            {user?.profileImage ? (
              <img src={user.profileImage} alt="Profile" />
            ) : (
              <span>{(user?.username || 'U')[0].toUpperCase()}</span>
            )}
          </button>
        </div>

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

        <button className="logout" onClick={logout}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Log out
        </button>
      </aside>

      <main className="main">
        <header className="chat-header">
          {currentRoom ? (
            <>
              <div className="header-left">
                <div className="header-room-icon" style={{ color: currentRoom.type === 'private' ? '#f59e0b' : currentRoom.type === 'ephemeral' ? '#a855f7' : '#38bdf8' }}>
                  {currentRoom.type === 'private' ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  ) : currentRoom.type === 'ephemeral' ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
                    </svg>
                  )}
                </div>
                <div className="header-room-info">
                  <h2 className="header-room-name">{currentRoom.name}</h2>
                  <div className="header-room-meta">
                    <span className="dot online"></span>
                    <span>{online.length} online</span>
                    <span className="header-sep">&middot;</span>
                    <span>{members.length} members</span>
                    {currentRoom.type === 'private' && keyStatus === 'waiting' && (
                      <span className="key-status waiting"> &middot; exchanging keys...</span>
                    )}
                    {currentRoom.type === 'private' && keyStatus === 'error' && (
                      <span className="key-status error"> &middot; key error</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="header-right">
                <button
                  className={`header-action ${showPresence ? 'active' : ''}`}
                  onClick={() => { setShowPresence(!showPresence); setShowMembers(false); }}
                  title="Presence"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </button>
                <button
                  className={`header-action ${showMembers ? 'active' : ''}`}
                  onClick={() => { setShowMembers(!showMembers); setShowPresence(false); }}
                  title="Members"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span className="header-action-count">{members.length}</span>
                </button>
                <AIPanel roomId={currentRoom.id} currentInput={currentInput} />
              </div>
            </>
          ) : (
            <h2>Welcome to DropTalk</h2>
          )}
        </header>
        <div className="main-content">
          {currentRoom ? (
            <>
              <div className="chat-area">
                {isPrivate && keyStatus !== 'ready' && keyStatus !== null && (
                  <div className="encryption-notice">
                    {keyStatus === 'waiting' ? 'Waiting for encryption keys...' : 'Encryption key error'}
                  </div>
                )}
                <div className="messages-container" ref={messagesContainerRef}>
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
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3>No channel selected</h3>
              <p>Select a channel from the left sidebar or create a new one to start real-time messaging.</p>
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

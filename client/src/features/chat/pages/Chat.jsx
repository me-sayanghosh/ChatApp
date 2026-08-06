import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useChat from '../hooks/useChat.js';
import useDM from '../hooks/useDM.js';
import {
  Channels, MemberList, TypingIndicator, PresenceMap, ThreadPanel,
  PendingRequests, ScrollToBottom, MessageList, MessageInput,
  DMPanel, DMChat, CreateChannelModal, UserProfileCard, ForwardModal, MessageSearchModal,
  PinnedMessagesModal, ChannelSettingsModal, CallOverlay, QuickSwitcherModal, KeyboardShortcutsModal,
  CallLogsPanel, CallLogsMainView, AIPanel,
} from '../components/index.js';
import NotificationDrawer from '../../notifications/NotificationDrawer.jsx';
import { useNotifications } from '../../notifications/useNotifications.js';
import { useWebRTC } from '../hooks/useWebRTC.js';
import { useCalls } from '../../calls/hooks/useCalls.js';
import { useTheme } from '../../../shared/hooks/useTheme.js';
import { NotificationsPanel } from '../../notifications/components/NotificationsPanel.jsx';
import { NotificationsMainView } from '../../notifications/components/NotificationsMainView.jsx';
import { formatBadgeCount } from '../../../shared/utils/dateUtils.js';

export default function Chat() {
  const [notifFilter, setNotifFilter] = useState('all');
  const {
    user, logout, rooms, currentRoom, displayMessages, online, members,
    showMembers, setShowMembers, showPresence, setShowPresence,
    typingUsers, presenceMap, readReceipts, threadMessage, setThreadMessage,
    threadCounts, keyStatus, currentInput, setCurrentInput,
    memberRooms, pendingRooms, replyTo, setReplyTo, replyToData, membersMap,
    messagesContainerRef, isPrivate, hasKey, unreadCounts, mentionAlerts,
    selectRoom, leaveRoom, handleRequestJoin, createRoom,
    send, handleTyping, deleteMessage, deleteForMe, handleReadReceipt, handleReact, refreshMembers,
    editMessage, pinMessage, unpinMessage, forwardMessage, loadOlderMessages,
    markRoomAsRead, clearRoomMessages,
  } = useChat();

  const {
    conversations, currentDM, setCurrentDM, dmMessages, loading: dmLoading,
    pendingCount, openDM, sendDMRequest, sendDMMessage, acceptDM, removeDM, fetchConversations,
  } = useDM();

  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    removeNotificationsForRoom,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications(user);
  const {
    callState, callerInfo, localStream, remoteStream, isMuted, isVideoOff, isScreenSharing,
    startCall, acceptCall, rejectCall, endCall, toggleMute, toggleVideo, toggleScreenShare,
  } = useWebRTC(user);

  const { callLogs, loading: callLogsLoading, addCallLog, clearCallHistory } = useCalls(user);
  const [selectedCallLog, setSelectedCallLog] = useState(null);

  const { theme, toggleTheme } = useTheme();

  const nav = useNavigate();
  const location = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [showChannelSettingsModal, setShowChannelSettingsModal] = useState(false);
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [navRailTab, setNavRailTab] = useState('chat');
  const [dmRequestToast, setDmRequestToast] = useState(null);
  const [showAIPanel, setShowAIPanel] = useState(false);

  // Read navigation state when coming from Settings
  useEffect(() => {
    if (location.state?.tab) {
      setNavRailTab(location.state.tab);
    }
    if (location.state?.openCreate) {
      setShowCreateModal(true);
    }
    if (location.state?.openSearch) {
      setShowQuickSwitcher(true);
    }
  }, [location.state]);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowQuickSwitcher((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-remove notifications for active channel room
  useEffect(() => {
    if (currentRoom?.id) {
      removeNotificationsForRoom(currentRoom.id);
    }
  }, [currentRoom?.id, removeNotificationsForRoom]);

  // Auto-remove notifications for active DM conversation
  useEffect(() => {
    if (currentDM?.id) {
      removeNotificationsForRoom(currentDM.id);
    }
  }, [currentDM?.id, removeNotificationsForRoom]);

  // Handle clicking a notification: mark read, auto-remove, and redirect to target chat
  async function handleSelectNotification(notif) {
    if (!notif) return;

    // 1. Mark as read & auto-remove notification from list
    deleteNotification(notif.id);
    if (notif.roomId) {
      removeNotificationsForRoom(notif.roomId);
    }

    // 2. Redirect to chat where the message came from
    const notifRoomId = notif.roomId?.toString();
    const isDM = notif.type === 'dm' || (notifRoomId && notifRoomId.startsWith('dm-'));

    if (isDM) {
      setNavRailTab('dm');
      const freshConvos = await fetchConversations();
      const listToSearch = (freshConvos && freshConvos.length > 0) ? freshConvos : conversations;

      const targetDM = listToSearch.find(
        (c) =>
          c.id?.toString() === notifRoomId ||
          c._id?.toString() === notifRoomId ||
          c.partner?.id?.toString() === notif.actorId?.toString() ||
          c.partner?.id?.toString() === notif.actor?.id?.toString()
      );

      if (targetDM) {
        await openDM(targetDM);
      } else if (notifRoomId) {
        await openDM({ id: notifRoomId, partner: notif.actor || { id: notif.actorId, username: 'User' } });
      }
    } else {
      setNavRailTab('chat');
      const targetRoom = rooms.find(
        (r) => r.id?.toString() === notifRoomId || r._id?.toString() === notifRoomId
      );
      if (targetRoom) {
        selectRoom(targetRoom);
      }
    }
    setShowNotifDrawer(false);
  }

  // Handle "Message Privately" clicked on a group message
  async function handleDMUser(toUserId, toUsername) {
    try {
      const dmText = `Hi! I want to message you privately.`;
      const room = await sendDMRequest(toUserId, dmText);
      // Switch to DM tab and open the conversation
      setNavRailTab('dm');
      openDM({ ...room, partner: { id: toUserId, username: toUsername } });
      setDmRequestToast(`DM request sent to ${toUsername}`);
      setTimeout(() => setDmRequestToast(null), 3000);
    } catch (err) {
      setDmRequestToast(`Failed: ${err.message}`);
      setTimeout(() => setDmRequestToast(null), 3000);
    }
  }

  const handleStartCall = (toUserId, roomId, isVideo = false) => {
    addCallLog({ receiverId: toUserId, roomId, type: isVideo ? 'video' : 'voice', status: 'completed' });
    startCall(toUserId, roomId, isVideo);
  };

  return (
    <div className="chat-app-shell">
      {/* Toast */}
      {dmRequestToast && (
        <div className="dm-toast">{dmRequestToast}</div>
      )}

      {/* 1. Left-most Nav Rail */}
      <nav className="nav-rail">
        <div className="rail-top">
          <button
            className="rail-btn action-plus"
            onClick={() => { setShowCreateModal(true); setNavRailTab('chat'); }}
            title="Create New Channel"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* Notification Icon Below + Icon */}
          <button
            className={`rail-btn rail-btn--notif ${navRailTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setNavRailTab('notifications')}
            title="Notifications"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="rail-dm-badge rail-notif-badge">{unreadCount}</span>
            )}
          </button>
        </div>

        <div className="rail-middle">
          <button
            className={`rail-btn ${showAIPanel ? 'active' : ''}`}
            onClick={() => setShowAIPanel(!showAIPanel)}
            title="AI Copilot"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
          </button>

          <button
            className={`rail-btn ${navRailTab === 'calls' ? 'active' : ''}`}
            onClick={() => setNavRailTab('calls')}
            title="Calls & Call Logs"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </button>

          <button
            className={`rail-btn ${navRailTab === 'chat' ? 'active' : ''}`}
            onClick={() => setNavRailTab('chat')}
            title="Group Channels"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </button>

          {/* DM Icon */}
          <button
            className={`rail-btn rail-btn--dm ${navRailTab === 'dm' ? 'active' : ''}`}
            onClick={() => setNavRailTab('dm')}
            title="Direct Messages"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {pendingCount > 0 && (
              <span className="rail-dm-badge">{formatBadgeCount(pendingCount)}</span>
            )}
          </button>
        </div>

        <div className="rail-bottom">
          <button
            className="rail-btn"
            onClick={() => setShowQuickSwitcher(true)}
            title="Quick Switcher (Ctrl + K)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          <button className="rail-btn settings-btn" onClick={() => nav('/settings/profile')} title="Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <button className="rail-btn logout-btn" onClick={logout} title="Log Out">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </nav>

      {/* 2. Sidebar — Channels, DM panel, Notifications, or Calls panel */}
      <aside className="sidebar">
        {navRailTab === 'notifications' ? (
          <NotificationsPanel
            notifications={notifications}
            unreadCount={unreadCount}
            activeFilter={notifFilter}
            onSelectFilter={(f) => setNotifFilter(f)}
            onMarkAllRead={markAllRead}
            onClearAll={clearAllNotifications}
          />
        ) : navRailTab === 'calls' ? (
          <CallLogsPanel
            logs={callLogs}
            loading={callLogsLoading}
            onSelectLog={(log) => setSelectedCallLog(log)}
            onStartCall={handleStartCall}
            onClearHistory={clearCallHistory}
          />
        ) : navRailTab === 'dm' ? (
          <DMPanel
            conversations={conversations}
            currentDM={currentDM}
            onOpen={openDM}
            onSendRequest={(toUserId) => handleDMUser(toUserId)}
            userId={user?.id}
            loading={dmLoading}
          />
        ) : (
          <Channels
            rooms={rooms}
            current={currentRoom}
            onSelect={selectRoom}
            onLeave={leaveRoom}
            onRequestJoin={handleRequestJoin}
            memberRooms={memberRooms}
            pendingRooms={pendingRooms}
            onOpenCreate={() => setShowCreateModal(true)}
            unreadCounts={unreadCounts}
            mentionAlerts={mentionAlerts}
            onMarkAsRead={markRoomAsRead}
            onClearChat={clearRoomMessages}
          />
        )}
      </aside>

      {/* 3. Main Chat Area */}
      <main className="main">
        {navRailTab === 'notifications' ? (
          /* Notifications Main View */
          <NotificationsMainView
            notifications={notifications}
            filter={notifFilter}
            onMarkRead={markRead}
            onDeleteNotif={deleteNotification}
            onMarkAllRead={markAllRead}
            onClearAll={clearAllNotifications}
            onNavigateToRoom={(roomId) => {
              const r = rooms.find((rm) => rm.id === roomId);
              if (r) {
                selectRoom(r);
                setNavRailTab('chat');
              }
            }}
          />
        ) : navRailTab === 'calls' ? (
          /* Call Logs Main View */
          <CallLogsMainView
            logs={callLogs}
            selectedLog={selectedCallLog}
            onStartCall={handleStartCall}
            onClearHistory={clearCallHistory}
          />
        ) : navRailTab === 'dm' ? (
          /* DM Main View */
          <DMChat
            room={currentDM}
            messages={dmMessages}
            userId={user?.id}
            loading={dmLoading}
            onAccept={acceptDM}
            onRemove={removeDM}
            onSend={sendDMMessage}
            onStartCall={handleStartCall}
          />
        ) : (
          /* Group Chat View */
          <>
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
                        {currentRoom.name}{' '}
                        <svg className="verified-badge-svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      </h2>
                      <div className="header-room-meta">
                        {currentRoom.topic && (
                          <span className="header-topic-tag" title={currentRoom.topic}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="12" y1="17" x2="12" y2="22"/>
                              <path d="M5 17h14l-1.5-6H6.5L5 17z"/>
                              <path d="M9 11V5a3 3 0 0 1 6 0v6"/>
                            </svg>{' '}
                            {currentRoom.topic}
                          </span>
                        )}
                        <span className="meta-pill">{currentRoom.category || 'General'}</span>
                        <span className="header-sep">&middot;</span>
                        <span className="dot online"></span>
                        <span>{online.length} online</span>
                        <span className="header-sep">&middot;</span>
                        <span>{members.length} members</span>
                        {currentRoom.slowMode > 0 && (
                          <span className="slowmode-tag">
                            &middot;{' '}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                            </svg>{' '}
                            {currentRoom.slowMode}s slow mode
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="header-right">
                    <button
                      className="header-icon-btn"
                      onClick={() => handleStartCall(null, currentRoom.id, false)}
                      title="Voice Call Channel"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                    </button>
                    <button
                      className="header-icon-btn"
                      onClick={() => handleStartCall(null, currentRoom.id, true)}
                      title="Video Call Channel"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7"/>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                      </svg>
                    </button>
                    {members.some((m) => m.user === user?.id && (m.role === 'owner' || m.role === 'moderator')) && (
                      <button
                        className="header-icon-btn"
                        onClick={() => setShowChannelSettingsModal(true)}
                        title="Channel settings"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                      </button>
                    )}
                    <button
                      className="header-icon-btn"
                      onClick={() => setShowPinnedModal(true)}
                      title="Pinned messages"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="17" x2="12" y2="22"/>
                        <path d="M5 17h14l-1.5-6H6.5L5 17z"/>
                        <path d="M9 11V5a3 3 0 0 1 6 0v6"/>
                      </svg>
                      {(currentRoom.pinnedMessages?.length || 0) > 0 && (
                        <span className="notif-badge">{formatBadgeCount(currentRoom.pinnedMessages.length)}</span>
                      )}
                    </button>
                    <button
                      className="header-icon-btn"
                      onClick={() => setShowSearchModal(true)}
                      title="Search messages"
                    >
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
                        {keyStatus === 'waiting' ? 'Exchanging E2EE keys...' : 'Encryption key error'}
                      </div>
                    )}
                    <div
                      className="messages-container"
                      ref={messagesContainerRef}
                      onScroll={(e) => {
                        if (e.target.scrollTop < 40) {
                          loadOlderMessages();
                        }
                      }}
                    >
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
                        onDMUser={handleDMUser}
                        onEdit={editMessage}
                        onPin={pinMessage}
                        onUnpin={unpinMessage}
                        onOpenForward={setForwardMsg}
                        pinnedMessages={currentRoom.pinnedMessages || []}
                      />
                      <ScrollToBottom containerRef={messagesContainerRef} />
                    </div>
                    <TypingIndicator typingUsers={typingUsers} />
                    <MessageInput
                      onSend={send}
                      onTyping={handleTyping}
                      onTextChange={setCurrentInput}
                      replyTo={replyTo}
                      onClearReply={() => setReplyTo(null)}
                      membersMap={membersMap}
                      slowMode={currentRoom.slowMode || 0}
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
                        onOpenProfile={setSelectedProfileUser}
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
                  {showAIPanel && (
                    <AIPanel
                      roomId={currentRoom.id}
                      onClose={() => setShowAIPanel(false)}
                      onUseSuggestion={(text) => setCurrentInput(text)}
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
          </>
        )}
      </main>

      {/* Notification Drawer Modal */}
      <NotificationDrawer
        isOpen={showNotifDrawer}
        onClose={() => setShowNotifDrawer(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onClearAll={clearAllNotifications}
        onSelectNotification={handleSelectNotification}
      />

      {/* Create Channel Modal */}
      {showCreateModal && (
        <CreateChannelModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createRoom}
        />
      )}

      {/* User Profile Card Popover */}
      {selectedProfileUser && (
        <UserProfileCard
          user={selectedProfileUser}
          isOnline={online.some((o) => o.id === selectedProfileUser.id || o.id === selectedProfileUser._id)}
          onClose={() => setSelectedProfileUser(null)}
          onStartDM={(toUserId) => handleDMUser(toUserId)}
          onMention={(username) => {
            setCurrentInput((prev) => (prev ? `${prev} @${username} ` : `@${username} `));
          }}
        />
      )}

      {/* Message Search Modal */}
      {showSearchModal && currentRoom && (
        <MessageSearchModal
          roomId={currentRoom.id}
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onJumpToMessage={(msgId) => {
            const el = document.getElementById(`msg-${msgId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        />
      )}

      {/* Pinned Messages Modal */}
      {showPinnedModal && currentRoom && (
        <PinnedMessagesModal
          isOpen={showPinnedModal}
          onClose={() => setShowPinnedModal(false)}
          pinnedMessages={currentRoom.pinnedMessages || []}
          allMessages={displayMessages}
          onUnpin={unpinMessage}
          onJumpToMessage={(msgId) => {
            const el = document.getElementById(`msg-${msgId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        />
      )}

      {/* Forward Message Modal */}
      {forwardMsg && (
        <ForwardModal
          message={forwardMsg}
          rooms={rooms}
          conversations={conversations}
          onClose={() => setForwardMsg(null)}
          onForward={forwardMessage}
        />
      )}

      {/* Channel Settings Modal */}
      {showChannelSettingsModal && currentRoom && (
        <ChannelSettingsModal
          room={currentRoom}
          onClose={() => setShowChannelSettingsModal(false)}
          onUpdated={(updatedRoom) => {
            selectRoom(updatedRoom);
          }}
        />
      )}

      {/* WebRTC Call Overlay UI */}
      <CallOverlay
        callState={callState}
        callerInfo={callerInfo}
        localStream={localStream}
        remoteStream={remoteStream}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        onAccept={acceptCall}
        onReject={rejectCall}
        onEndCall={endCall}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
      />

      {/* Quick Switcher Modal (Ctrl + K) */}
      <QuickSwitcherModal
        isOpen={showQuickSwitcher}
        onClose={() => setShowQuickSwitcher(false)}
        rooms={rooms}
        conversations={conversations}
        onSelectChannel={(room) => { setNavRailTab('chat'); selectRoom(room); }}
        onSelectDM={(convo) => { setNavRailTab('dm'); openDM(convo); }}
      />

      {/* Keyboard Shortcuts Modal (Ctrl + /) */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
}

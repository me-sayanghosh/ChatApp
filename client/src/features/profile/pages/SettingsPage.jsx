import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext.jsx';
import { useTheme } from '../../../shared/hooks/useTheme.js';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

export default function SettingsPage() {
  const { user, setUser, logout } = useAuth();
  const { theme, setTheme, toggleTheme } = useTheme();
  const nav = useNavigate();
  const { section } = useParams();

  const activeSection = ['profile', 'appearance', 'privacy', 'notifications', 'shortcuts', 'help'].includes(section)
    ? section
    : 'profile';

  // State for Profile
  const fileInputRef = useRef(null);
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [imagePreview, setImagePreview] = useState(user?.profileImage || '');
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const [usernameMsg, setUsernameMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);
  const checkTimeoutRef = useRef(null);

  // State for Privacy
  const [showOnlineStatus, setShowOnlineStatus] = useState(() => {
    return localStorage.getItem('settings_showOnline') !== 'false';
  });
  const [showProfilePicture, setShowProfilePicture] = useState(() => {
    return localStorage.getItem('settings_showDP') !== 'false';
  });
  const [blockedUsers, setBlockedUsers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('settings_blocked') || '[]');
    } catch {
      return [];
    }
  });
  const [blockInput, setBlockInput] = useState('');
  const [privacySuccess, setPrivacySuccess] = useState('');

  // State for Notifications
  const [groupNotifications, setGroupNotifications] = useState(() => {
    return localStorage.getItem('settings_groupNotif') !== 'false';
  });
  const [dmNotifications, setDmNotifications] = useState(() => {
    return localStorage.getItem('settings_dmNotif') !== 'false';
  });
  const [backgroundSync, setBackgroundSync] = useState(() => {
    return localStorage.getItem('settings_bgSync') !== 'false';
  });
  const [notifSuccess, setNotifSuccess] = useState('');

  // State for Help & Feedback
  const [feedbackCategory, setFeedbackCategory] = useState('General Feedback');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Sync state with user prop updates
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUsername(user.username || '');
      setProfileImage(user.profileImage || '');
      setImagePreview(user.profileImage || '');
    }
  }, [user]);

  // Username validation check
  const checkUsername = useCallback(async (value) => {
    if (value === user?.username) {
      setUsernameStatus('idle');
      setUsernameMsg('');
      return;
    }
    if (value.length < 3) {
      setUsernameStatus('idle');
      setUsernameMsg('');
      return;
    }
    setUsernameStatus('checking');
    try {
      const res = await fetch(`${API}/auth/check-username/${encodeURIComponent(value)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const data = await res.json();
      if (data.available) {
        setUsernameStatus('available');
        setUsernameMsg('Username is available');
      } else {
        setUsernameStatus('taken');
        setUsernameMsg('Username already taken, try another one');
      }
    } catch {
      setUsernameStatus('idle');
      setUsernameMsg('');
    }
  }, [user?.username]);

  useEffect(() => {
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    if (username.trim() && username !== user?.username) {
      checkTimeoutRef.current = setTimeout(() => checkUsername(username.trim()), 400);
    } else {
      setUsernameStatus('idle');
      setUsernameMsg('');
    }
    return () => { if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current); };
  }, [username, user?.username, checkUsername]);

  // Handlers for Profile
  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setProfileErr('Image must be under 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfileImage(reader.result);
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setProfileImage('');
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileErr('');
    setProfileSuccess('');

    if (username.trim() && usernameStatus === 'taken') {
      setProfileErr('Please choose a different username');
      return;
    }

    setProfileBusy(true);
    try {
      const body = {};
      if (name !== (user?.name || '')) body.name = name;
      if (username.trim() && username !== user?.username) body.username = username.trim();
      if (profileImage !== (user?.profileImage || '')) body.profileImage = profileImage;

      if (Object.keys(body).length === 0) {
        setProfileSuccess('No changes to save');
        setProfileBusy(false);
        return;
      }

      const res = await fetch(`${API}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      setUser(data.user);
      setProfileSuccess('Profile updated successfully!');
    } catch (e) {
      setProfileErr(e.message);
    } finally {
      setProfileBusy(false);
    }
  }

  // Handlers for Privacy
  function handleToggleOnlineStatus() {
    const next = !showOnlineStatus;
    setShowOnlineStatus(next);
    localStorage.setItem('settings_showOnline', String(next));
    setPrivacySuccess('Privacy settings saved');
    setTimeout(() => setPrivacySuccess(''), 3000);
  }

  function handleToggleDP() {
    const next = !showProfilePicture;
    setShowProfilePicture(next);
    localStorage.setItem('settings_showDP', String(next));
    setPrivacySuccess('Privacy settings saved');
    setTimeout(() => setPrivacySuccess(''), 3000);
  }

  function handleAddBlocked(e) {
    e.preventDefault();
    const target = blockInput.trim().replace(/^@/, '');
    if (!target) return;
    if (blockedUsers.includes(target)) {
      setBlockInput('');
      return;
    }
    const updated = [...blockedUsers, target];
    setBlockedUsers(updated);
    localStorage.setItem('settings_blocked', JSON.stringify(updated));
    setBlockInput('');
    setPrivacySuccess(`Blocked @${target}`);
    setTimeout(() => setPrivacySuccess(''), 3000);
  }

  function handleUnblock(target) {
    const updated = blockedUsers.filter((u) => u !== target);
    setBlockedUsers(updated);
    localStorage.setItem('settings_blocked', JSON.stringify(updated));
    setPrivacySuccess(`Unblocked @${target}`);
    setTimeout(() => setPrivacySuccess(''), 3000);
  }

  // Handlers for Notifications
  async function updateNotifSettings(payload) {
    try {
      const res = await fetch(`${API}/notifications/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok && data.user) {
        setUser(data.user);
      }
    } catch (e) {
      console.error('Failed to update notification settings API:', e);
    }
  }

  function handleToggleGroupNotif() {
    const next = !groupNotifications;
    setGroupNotifications(next);
    localStorage.setItem('settings_groupNotif', String(next));
    updateNotifSettings({ groupNotifications: next });
    setNotifSuccess('Notification preferences saved');
    setTimeout(() => setNotifSuccess(''), 3000);
  }

  function handleToggleDmNotif() {
    const next = !dmNotifications;
    setDmNotifications(next);
    localStorage.setItem('settings_dmNotif', String(next));
    updateNotifSettings({ directNotifications: next });
    setNotifSuccess('Notification preferences saved');
    setTimeout(() => setNotifSuccess(''), 3000);
  }

  function handleToggleBgSync() {
    const next = !backgroundSync;
    setBackgroundSync(next);
    localStorage.setItem('settings_bgSync', String(next));
    updateNotifSettings({ backgroundSync: next });
    setNotifSuccess('Background sync setting updated');
    setTimeout(() => setNotifSuccess(''), 3000);
  }

  // Handlers for Feedback
  function handleSendFeedback(e) {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setFeedbackSuccess('Thank you! Your feedback has been submitted.');
    setFeedbackText('');
    setTimeout(() => setFeedbackSuccess(''), 4000);
  }

  const avatarInitial = (username || user?.username || 'U')[0].toUpperCase();

  const sectionTitles = {
    profile: 'Profile Settings',
    appearance: 'Appearance & Theme',
    privacy: 'Privacy & Security',
    notifications: 'Notification Preferences',
    shortcuts: 'Keyboard Shortcuts',
    help: 'Help & Feedback',
  };

  return (
    <div className="chat-app-shell">
      {/* 1. Left-most Nav Rail */}
      <nav className="nav-rail">
        <div className="rail-top">
          <button className="rail-btn action-plus" onClick={() => nav('/chat')} title="Return to Chat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        <div className="rail-middle">
          <button className="rail-btn" onClick={() => nav('/chat')} title="Analytics">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </button>
          <button className="rail-btn" onClick={() => nav('/chat')} title="Group Channels">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </button>
          <button className="rail-btn rail-btn--dm" onClick={() => nav('/chat')} title="Direct Messages">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>

        <div className="rail-bottom">
          <button className="rail-btn settings-btn active" title="Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <button className="rail-btn logout-btn" onClick={logout} title="Log Out">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="9" />
            </svg>
          </button>
        </div>
      </nav>

      {/* 2. Settings Sidebar Navigation (Panel 2 - Replaces Conversations) */}
      <aside className="sidebar settings-sidebar">
        <div className="settings-sidebar-header">
          <h2>Settings</h2>
          <span className="settings-user-badge">@{user?.username || 'user'}</span>
        </div>

        <nav className="settings-nav-list">
          <button
            className={`settings-nav-item ${activeSection === 'profile' ? 'active' : ''}`}
            onClick={() => nav('/settings/profile')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            <span>Profile</span>
          </button>

          <button
            className={`settings-nav-item ${activeSection === 'appearance' ? 'active' : ''}`}
            onClick={() => nav('/settings/appearance')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <span>Appearance & Theme</span>
          </button>

          <button
            className={`settings-nav-item ${activeSection === 'privacy' ? 'active' : ''}`}
            onClick={() => nav('/settings/privacy')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Privacy</span>
          </button>

          <button
            className={`settings-nav-item ${activeSection === 'notifications' ? 'active' : ''}`}
            onClick={() => nav('/settings/notifications')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span>Notifications</span>
          </button>

          <button
            className={`settings-nav-item ${activeSection === 'shortcuts' ? 'active' : ''}`}
            onClick={() => nav('/settings/shortcuts')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" /><line x1="6" y1="8" x2="6" y2="8" /><line x1="10" y1="8" x2="10" y2="8" /><line x1="14" y1="8" x2="14" y2="8" /><line x1="18" y1="8" x2="18" y2="8" /><line x1="6" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="18" y2="12" /><line x1="8" y1="16" x2="16" y2="16" />
            </svg>
            <span>Keyboard Shortcuts</span>
          </button>

          <button
            className={`settings-nav-item ${activeSection === 'help' ? 'active' : ''}`}
            onClick={() => nav('/settings/help')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>Help & Feedback</span>
          </button>
        </nav>
      </aside>

      {/* 3. Main Content Panel */}
      <main className="main" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <header className="chat-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
          <div className="header-left">
            <div className="header-avatar-badge" style={{ background: '#0052FF', color: '#ffffff' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <div className="header-room-info">
              <h2 className="header-room-name">
                Settings &middot; {sectionTitles[activeSection]}
              </h2>
              <div className="header-room-meta">
                <span className="meta-pill">DropTalk</span>
                <span className="header-sep">&middot;</span>
                <span className="dot online"></span>
                <span>Active Workspace</span>
              </div>
            </div>
          </div>

          <div className="header-right">
            <button className="button-secondary-pill" onClick={() => nav('/chat')} style={{ padding: '6px 16px', fontSize: '13px' }}>
              &larr; Return to Chat
            </button>
          </div>
        </header>

        {/* Section Content Panel */}
        <div className="settings-content-panel">
          <div className="settings-container-inner">

            {/* SECTION 1: PROFILE */}
            {activeSection === 'profile' && (
              <div className="profile-enhanced-wrapper">
                {/* Hero Profile Banner Header */}
                <div className="profile-hero-card">
                  <div className="profile-banner-bg" />
                  <div className="profile-hero-content">
                    <div
                      className="profile-avatar-large"
                      onClick={() => fileInputRef.current?.click()}
                      title="Click to change profile picture"
                    >
                      {imagePreview ? (
                        <img src={imagePreview} alt="Profile" />
                      ) : (
                        <span>{avatarInitial}</span>
                      )}
                      <div className="avatar-overlay">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                      </div>
                      <span className="avatar-online-dot" />
                    </div>

                    <div className="profile-hero-info">
                      <div className="profile-hero-names">
                        <h2>{name || user?.username || 'User Name'}</h2>
                        <span className="profile-handle">@{username || 'username'}</span>
                      </div>
                    </div>

                    <div className="profile-hero-actions">
                      <button type="button" className="button-secondary-pill" onClick={() => fileInputRef.current?.click()}>
                        Change Photo
                      </button>
                      {imagePreview && (
                        <button type="button" onClick={removeImage} className="button-danger-pill">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />

                <form onSubmit={handleSaveProfile} className="settings-form">
                  {/* Card 1: Public Identity */}
                  <div className="profile-card">
                    <h3 className="profile-card-title">Public Identity</h3>
                    <p className="profile-card-desc">How your profile appears to teammates across DropTalk channels.</p>

                    <div className="settings-field">
                      <label>DISPLAY NAME</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Sayan Ghosh"
                        maxLength={50}
                      />
                      <span className="field-hint">Your full name or display alias.</span>
                    </div>

                    <div className="settings-field">
                      <label>USERNAME HANDLE</label>
                      <div className="input-prefix-wrapper">
                        <span className="prefix">@</span>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="username"
                          minLength={3}
                          maxLength={24}
                          pattern="[a-zA-Z0-9_-]+"
                          required
                        />
                        {usernameStatus === 'checking' && <span className="status-badge">checking...</span>}
                        {usernameStatus === 'available' && <span className="status-badge available">&check;</span>}
                        {usernameStatus === 'taken' && <span className="status-badge taken">&times;</span>}
                      </div>
                      {usernameMsg && (
                        <span className={`status-msg ${usernameStatus === 'available' ? 'available' : 'taken'}`}>
                          {usernameMsg}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card 2: Account Details & Verification */}
                  <div className="profile-card">
                    <h3 className="profile-card-title">Account Credentials</h3>
                    <p className="profile-card-desc">Your authentication details tied to the workspace.</p>

                    <div className="settings-field">
                      <label>WORK EMAIL</label>
                      <div className="email-verified-wrapper">
                        <input
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="disabled-input"
                        />
                        <span className="verified-tag">&check; Verified</span>
                      </div>
                      <span className="field-hint">Tied to your DropTalk workspace organization account.</span>
                    </div>
                  </div>

                  {profileErr && <div className="settings-alert error">{profileErr}</div>}

                  <div className="profile-submit-row">
                    <button
                      type="submit"
                      className="button-primary-pill profile-save-btn"
                      disabled={profileBusy || usernameStatus === 'taken'}
                    >
                      {profileBusy ? 'Saving Changes...' : 'Save Profile Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SECTION 2: APPEARANCE & THEME */}
            {activeSection === 'appearance' && (
              <div>
                <h2 className="settings-section-title">Appearance & Theme</h2>
                <p className="settings-section-desc">
                  Customize the visual theme and appearance of your DropTalk workspace.
                </p>

                <div className="theme-selection-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '20px' }}>
                  {/* Light Theme Card */}
                  <div
                    className={`theme-card ${theme === 'light' ? 'selected' : ''}`}
                    onClick={() => setTheme('light')}
                    style={{
                      border: theme === 'light' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      borderRadius: '16px',
                      padding: '16px',
                      cursor: 'pointer',
                      background: '#FFFFFF',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ height: '100px', borderRadius: '10px', background: '#E4E9F2', padding: '10px', display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ width: '20px', background: '#29410f', borderRadius: '6px' }} />
                      <div style={{ width: '50px', background: '#FFFFFF', borderRadius: '6px' }} />
                      <div style={{ flex: 1, background: '#FFFFFF', borderRadius: '6px', padding: '6px' }}>
                        <div style={{ height: '8px', width: '60%', background: '#29410f', borderRadius: '4px', marginBottom: '6px' }} />
                        <div style={{ height: '6px', width: '90%', background: '#E2E8F0', borderRadius: '3px' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>☀️ Light Mode</h4>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>Clean & high contrast</span>
                      </div>
                      {theme === 'light' && (
                        <span style={{ background: 'var(--primary)', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>✓</span>
                      )}
                    </div>
                  </div>

                  {/* Dark Theme Card */}
                  <div
                    className={`theme-card ${theme === 'dark' ? 'selected' : ''}`}
                    onClick={() => setTheme('dark')}
                    style={{
                      border: theme === 'dark' ? '2px solid var(--primary-mid)' : '1px solid var(--border-color)',
                      borderRadius: '16px',
                      padding: '16px',
                      cursor: 'pointer',
                      background: '#0F172A',
                      color: '#F8FAFC',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ height: '100px', borderRadius: '10px', background: '#1E293B', padding: '10px', display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ width: '20px', background: '#29410f', borderRadius: '6px' }} />
                      <div style={{ width: '50px', background: '#0F172A', borderRadius: '6px' }} />
                      <div style={{ flex: 1, background: '#0F172A', borderRadius: '6px', padding: '6px' }}>
                        <div style={{ height: '8px', width: '60%', background: '#4a7c2f', borderRadius: '4px', marginBottom: '6px' }} />
                        <div style={{ height: '6px', width: '90%', background: '#334155', borderRadius: '3px' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#F8FAFC' }}>🌙 Dark Mode</h4>
                        <span style={{ fontSize: '12px', color: '#94A3B8' }}>Sleek & easy on eyes</span>
                      </div>
                      {theme === 'dark' && (
                        <span style={{ background: 'var(--primary-mid)', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>✓</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: PRIVACY */}
            {activeSection === 'privacy' && (
              <div>
                <h2 className="settings-section-title">Privacy & Visibility</h2>
                <p className="settings-section-desc">
                  Control who sees your presence status, display picture, and manage blocked users.
                </p>

                <div className="settings-toggle-group">
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <h3>Show Online Status</h3>
                      <p>Allow teammates to see when you are active in the workspace.</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={showOnlineStatus}
                        onChange={handleToggleOnlineStatus}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  <div className="toggle-item">
                    <div className="toggle-info">
                      <h3>Show Display Picture</h3>
                      <p>Display your custom profile picture in channels and direct messages.</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={showProfilePicture}
                        onChange={handleToggleDP}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>

                <div className="blocked-section">
                  <h3 className="sub-heading">Blocked Accounts</h3>
                  <p className="sub-desc">Blocked users cannot send you direct messages or see your presence.</p>

                  <form onSubmit={handleAddBlocked} className="block-form">
                    <div className="input-prefix-wrapper">
                      <span className="prefix">@</span>
                      <input
                        type="text"
                        placeholder="username to block..."
                        value={blockInput}
                        onChange={(e) => setBlockInput(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="button-secondary-pill" disabled={!blockInput.trim()}>
                      Block User
                    </button>
                  </form>

                  {blockedUsers.length > 0 ? (
                    <div className="blocked-list">
                      {blockedUsers.map((u) => (
                        <div key={u} className="blocked-user-row">
                          <div className="user-info">
                            <span className="blocked-avatar">{u[0].toUpperCase()}</span>
                            <span className="blocked-name">@{u}</span>
                          </div>
                          <button
                            type="button"
                            className="button-danger-pill"
                            onClick={() => handleUnblock(u)}
                          >
                            Unblock
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="settings-empty-state">
                      <p>No blocked accounts.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 3: NOTIFICATIONS */}
            {activeSection === 'notifications' && (
              <div>
                <h2 className="settings-section-title">Notification Preferences</h2>
                <p className="settings-section-desc">
                  Manage sound alerts, channel message notifications, and performance sync options.
                </p>

                <div className="settings-toggle-group">
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <h3>Group Conversation Notifications</h3>
                      <p>Receive notifications for new messages in public and private channels.</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={groupNotifications}
                        onChange={handleToggleGroupNotif}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  <div className="toggle-item">
                    <div className="toggle-info">
                      <h3>Direct Message Notifications</h3>
                      <p>Receive alerts for incoming 1-on-1 direct messages and requests.</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={dmNotifications}
                        onChange={handleToggleDmNotif}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  <div className="toggle-item">
                    <div className="toggle-info">
                      <h3>Background Message Sync</h3>
                      <p>Sync messages automatically in the background for faster chat load performance.</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={backgroundSync}
                        onChange={handleToggleBgSync}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 4: KEYBOARD SHORTCUTS */}
            {activeSection === 'shortcuts' && (
              <div>
                <h2 className="settings-section-title">Keyboard Shortcuts</h2>
                <p className="settings-section-desc">
                  Boost your productivity with these built-in DropTalk keyboard shortcuts.
                </p>

                <div className="shortcuts-grid">
                  <div className="shortcut-category">
                    <h3>Messaging & Chat</h3>
                    <div className="shortcut-row">
                      <span>Send message</span>
                      <kbd>Enter</kbd>
                    </div>
                    <div className="shortcut-row">
                      <span>New line in message input</span>
                      <div className="kbd-group"><kbd>Shift</kbd> + <kbd>Enter</kbd></div>
                    </div>
                    <div className="shortcut-row">
                      <span>Clear reply quote / cancel edit</span>
                      <kbd>Esc</kbd>
                    </div>
                  </div>

                  <div className="shortcut-category">
                    <h3>Navigation</h3>
                    <div className="shortcut-row">
                      <span>Quick Channel Search</span>
                      <div className="kbd-group"><kbd>Ctrl</kbd> + <kbd>K</kbd></div>
                    </div>
                    <div className="shortcut-row">
                      <span>Switch Next / Previous Channel</span>
                      <div className="kbd-group"><kbd>Alt</kbd> + <kbd>&uarr; / &darr;</kbd></div>
                    </div>
                  </div>

                  <div className="shortcut-category">
                    <h3>General</h3>
                    <div className="shortcut-row">
                      <span>View Keyboard Shortcuts</span>
                      <div className="kbd-group"><kbd>Ctrl</kbd> + <kbd>/</kbd></div>
                    </div>
                    <div className="shortcut-row">
                      <span>Toggle Presence Status</span>
                      <div className="kbd-group"><kbd>Ctrl</kbd> + <kbd>P</kbd></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 5: HELP & FEEDBACK */}
            {activeSection === 'help' && (
              <div>
                <h2 className="settings-section-title">Help & Support Center</h2>
                <p className="settings-section-desc">
                  Find guides, contact the DropTalk team, send feature requests, and view policy details.
                </p>

                <div className="help-cards-grid">
                  <div className="help-card">
                    <div className="help-card-icon">📚</div>
                    <h3>Help Center</h3>
                    <p>Browse tutorials, FAQs, and guides on workspace setup and E2EE encryption.</p>
                    <a href="#help-faq" onClick={(e) => { e.preventDefault(); alert('Help Center: Visit https://droptalk.ai/help'); }}>
                      Visit Help Center &rarr;
                    </a>
                  </div>

                  <div className="help-card">
                    <div className="help-card-icon">💬</div>
                    <h3>Contact Us</h3>
                    <p>Need urgent assistance? Reach our support team 24/7 at support@droptalk.ai.</p>
                    <a href="mailto:support@droptalk.ai">Email Support &rarr;</a>
                  </div>
                </div>

                <div className="feedback-form-card">
                  <h3>Send Feedback</h3>
                  <p>Have suggestions or encountered a bug? Let us know!</p>

                  <form onSubmit={handleSendFeedback}>
                    <div className="settings-field">
                      <label>CATEGORY</label>
                      <select
                        value={feedbackCategory}
                        onChange={(e) => setFeedbackCategory(e.target.value)}
                      >
                        <option value="General Feedback">General Feedback</option>
                        <option value="Bug Report">Bug Report</option>
                        <option value="Feature Request">Feature Request</option>
                        <option value="UI / UX Improvement">UI / UX Improvement</option>
                      </select>
                    </div>

                    <div className="settings-field">
                      <label>YOUR FEEDBACK</label>
                      <textarea
                        rows={4}
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Tell us what you think or describe the issue..."
                        required
                      />
                    </div>

                    <button type="submit" className="button-primary-pill" disabled={!feedbackText.trim()}>
                      Submit Feedback
                    </button>
                  </form>
                </div>

                <div className="legal-footer">
                  <button type="button" className="text-link" onClick={() => setShowTermsModal(true)}>
                    Terms of Service &amp; Privacy Policy
                  </button>
                </div>

                {showTermsModal && (
                  <div className="settings-modal-overlay" onClick={() => setShowTermsModal(false)}>
                    <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
                      <div className="modal-header">
                        <h3>Terms of Service &amp; Privacy Policy</h3>
                        <button type="button" onClick={() => setShowTermsModal(false)}>&times;</button>
                      </div>
                      <div className="modal-body">
                        <h4>1. User Privacy</h4>
                        <p>DropTalk respects your data privacy. All messages sent within private channels are end-to-end encrypted using AES-256 and RSA-2048 keys stored locally.</p>
                        <h4>2. Direct Messaging</h4>
                        <p>1-on-1 direct messages require recipient acceptance to prevent spam and unauthorized contact.</p>
                        <h4>3. Data Protection</h4>
                        <p>Your user profile credentials and email address are never shared with third parties.</p>
                      </div>
                      <div className="modal-footer">
                        <button type="button" className="button-secondary-pill" onClick={() => setShowTermsModal(false)}>
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext.jsx';
import useChat from '../../chat/hooks/useChat.js';
import { Channels } from '../../chat/components/index.js';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const nav = useNavigate();
  const fileInputRef = useRef(null);

  const {
    rooms, currentRoom, selectRoom, createRoom, leaveRoom, handleRequestJoin,
    memberRooms, pendingRooms,
  } = useChat();

  const [activeCategory, setActiveCategory] = useState('current');
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [imagePreview, setImagePreview] = useState(user?.profileImage || '');

  const [usernameStatus, setUsernameStatus] = useState('idle');
  const [usernameMsg, setUsernameMsg] = useState('');
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const checkTimeoutRef = useRef(null);

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

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErr('Image must be under 2 MB');
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

  async function handleSave(e) {
    e.preventDefault();
    setErr('');
    setSuccess('');

    if (username.trim() && usernameStatus === 'taken') {
      setErr('Please choose a different username');
      return;
    }

    setBusy(true);
    try {
      const body = {};
      if (name !== (user?.name || '')) body.name = name;
      if (username.trim() && username !== user?.username) body.username = username.trim();
      if (profileImage !== (user?.profileImage || '')) body.profileImage = profileImage;

      if (Object.keys(body).length === 0) {
        setSuccess('No changes to save');
        setBusy(false);
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
      setSuccess('Profile updated successfully');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const avatarInitial = (username || user?.username || 'U')[0].toUpperCase();

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
          <button className="rail-btn" onClick={() => nav('/chat')} title="Analytics">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </button>
          <button className="rail-btn" onClick={() => nav('/chat')} title="Bookmarks">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button className="rail-btn" onClick={() => nav('/chat')} title="Conversations">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </button>
          <button className="rail-btn active" title="Profile Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>

        <div className="rail-bottom">
          <button className="rail-btn user-avatar-btn active" title="Profile">
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



      {/* 3. Third Panel - Conversations / Channels List */}
      <aside className="sidebar">
        <Channels
          rooms={rooms}
          current={currentRoom}
          onSelect={(room) => { selectRoom(room); nav('/chat'); }}
          onCreate={createRoom}
          onLeave={leaveRoom}
          onRequestJoin={handleRequestJoin}
          memberRooms={memberRooms}
          pendingRooms={pendingRooms}
        />
      </aside>

      {/* 4. Fourth Panel - Profile Form Integrated in Main Canvas */}
      <main className="main" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <header className="chat-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
          <div className="header-left">
            <div className="header-avatar-badge" style={{ background: '#4a154b', color: '#ffffff' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="header-room-info">
              <h2 className="header-room-name">
                Profile Settings <span className="verified-badge">✓</span>
              </h2>
              <div className="header-room-meta">
                <span className="meta-pill">DropTalk</span>
                <span className="header-sep">&middot;</span>
                <span className="dot online"></span>
                <span>Active Account</span>
              </div>
            </div>
          </div>

          <div className="header-right">
            <button className="button-secondary-pill" onClick={() => nav('/chat')} style={{ padding: '6px 16px', fontSize: '13px' }}>
              ← Return to Chat
            </button>
          </div>
        </header>

        {/* Profile Settings Content Panel */}
        <div style={{ flex: 1, padding: '28px 40px', overflowY: 'auto', background: '#ffffff' }}>
          <div style={{ maxWidth: '600px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#4a154b', margin: '0 0 4px' }}>
              Account Identity
            </h2>
            <p style={{ fontSize: '14px', color: '#696969', margin: '0 0 28px' }}>
              Update your display picture, username handle, and workspace details.
            </p>

            {/* Avatar Section */}
            <div className="profile-avatar-section" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
              <div className="profile-avatar-large" onClick={() => fileInputRef.current?.click()} style={{ width: 84, height: 84, borderRadius: 16, background: '#4a154b', color: '#ffffff', fontSize: 32, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span>{avatarInitial}</span>
                )}
                <div className="avatar-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s ease' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="button-secondary-pill" onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 18px', fontSize: '13px' }}>
                  Change Photo
                </button>
                {imagePreview && (
                  <button type="button" onClick={removeImage} style={{ background: 'none', border: '1px solid #e6e6e6', color: '#cc4117', padding: '8px 16px', borderRadius: '90px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="profile-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#696969', letterSpacing: '0.5px' }}>DISPLAY NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                  maxLength={50}
                  style={{ padding: '10px 14px', border: '1px solid #e6e6e6', borderRadius: '8px', fontSize: '15px', outline: 'none' }}
                />
                <span style={{ fontSize: '12px', color: '#696969' }}>This name will appear on your channel messages.</span>
              </div>

              <div className="profile-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#696969', letterSpacing: '0.5px' }}>USERNAME HANDLE</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e6e6e6', borderRadius: '8px', overflow: 'hidden', background: '#ffffff' }}>
                  <span style={{ padding: '0 12px', color: '#696969', fontWeight: 700 }}>@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    minLength={3}
                    maxLength={24}
                    pattern="[a-zA-Z0-9_-]+"
                    required
                    style={{ flex: 1, border: 'none', padding: '10px 10px 10px 0', fontSize: '15px', outline: 'none' }}
                  />
                  {usernameStatus === 'checking' && <span style={{ padding: '0 12px', color: '#696969', fontSize: '13px' }}>checking...</span>}
                  {usernameStatus === 'available' && <span style={{ padding: '0 12px', color: '#007a5a', fontWeight: 700 }}>✓</span>}
                  {usernameStatus === 'taken' && <span style={{ padding: '0 12px', color: '#cc4117', fontWeight: 700 }}>✕</span>}
                </div>
                {usernameMsg && (
                  <span style={{ fontSize: '13px', fontWeight: 600, color: usernameStatus === 'available' ? '#007a5a' : '#cc4117' }}>
                    {usernameMsg}
                  </span>
                )}
              </div>

              <div className="profile-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#696969', letterSpacing: '0.5px' }}>WORK EMAIL</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  style={{ padding: '10px 14px', border: '1px solid #e6e6e6', borderRadius: '8px', fontSize: '15px', background: '#f8fafc', color: '#696969', cursor: 'not-allowed' }}
                />
                <span style={{ fontSize: '12px', color: '#696969' }}>Email is tied to your DropTalk workspace account.</span>
              </div>

              {err && <div className="error" style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px 14px', borderRadius: '8px', fontSize: '14px' }}>{err}</div>}
              {success && <div className="success-msg" style={{ background: '#D1FAE5', border: '1px solid #6EE7B7', color: '#065F46', padding: '10px 14px', borderRadius: '8px', fontSize: '14px' }}>{success}</div>}

              <div>
                <button
                  type="submit"
                  className="button-primary-pill"
                  style={{ padding: '12px 28px', backgroundColor: '#4a154b', color: '#ffffff', border: 'none', borderRadius: '90px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}
                  disabled={busy || usernameStatus === 'taken'}
                >
                  {busy ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

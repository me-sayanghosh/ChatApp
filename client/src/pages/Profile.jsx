import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

export default function Profile() {
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const fileInputRef = useRef(null);

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
      if (!res.ok) throw new Error(data.error || 'failed to update profile');
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
    <div className="profile-page">
      <div className="profile-card">
        <button className="profile-back" onClick={() => nav('/chat')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Chat
        </button>

        <h1>Profile Settings</h1>
        <p className="muted">Manage your account details and profile image.</p>

        <div className="profile-avatar-section">
          <div className="profile-avatar-large" onClick={() => fileInputRef.current?.click()}>
            {imagePreview ? (
              <img src={imagePreview} alt="Profile" />
            ) : (
              <span>{avatarInitial}</span>
            )}
            <div className="avatar-overlay">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          <div className="profile-avatar-actions">
            <button type="button" className="profile-btn-secondary" onClick={() => fileInputRef.current?.click()}>
              Change Photo
            </button>
            {imagePreview && (
              <button type="button" className="profile-btn-danger" onClick={removeImage}>
                Remove
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="profile-field">
            <label>Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your display name"
              maxLength={50}
            />
            <span className="field-hint">This is how others see you. You can change it anytime.</span>
          </div>

          <div className="profile-field">
            <label>Username</label>
            <div className={`username-input-wrap ${usernameStatus}`}>
              <span className="username-at">@</span>
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
              {usernameStatus === 'checking' && <span className="username-status checking" />}
              {usernameStatus === 'available' && <span className="username-status available">&#10003;</span>}
              {usernameStatus === 'taken' && <span className="username-status taken">&#10007;</span>}
            </div>
            {usernameMsg && (
              <span className={`field-msg ${usernameStatus === 'available' ? 'success' : 'error'}`}>
                {usernameMsg}
              </span>
            )}
          </div>

          <div className="profile-field">
            <label>Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="disabled"
            />
            <span className="field-hint">Email cannot be changed.</span>
          </div>

          {err && <div className="error">{err}</div>}
          {success && <div className="success-msg">{success}</div>}

          <button type="submit" className="profile-btn-primary" disabled={busy || usernameStatus === 'taken'}>
            {busy ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

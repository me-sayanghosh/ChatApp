import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext.jsx';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

export default function SetUsername() {
  const [username, setUsername] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { setUser } = useAuth();
  const nav = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/username`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed to set username');
      setUser(data.user);
      nav('/chat');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <h1>Pick a username</h1>
        <p className="muted">This is how others will see you in chats. You can skip and set it later.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username (3-24 chars)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            minLength={3}
            maxLength={24}
            pattern="[a-zA-Z0-9_\-]+"
            required
            autoComplete="username"
          />
          {err && <div className="error">{err}</div>}
          <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save & continue'}</button>
        </form>
        <p className="muted" style={{ marginTop: '1.25rem', textAlign: 'center' }}>
          <Link to="/chat" className="link">Skip for now</Link>
        </p>
      </div>
    </div>
  );
}

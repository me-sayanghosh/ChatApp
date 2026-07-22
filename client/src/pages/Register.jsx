import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:4000/api'}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'registration failed');
      login(data);
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
        <h1>Create account</h1>
        <p className="muted">Pick a username and you're in.</p>
        <form onSubmit={submit}>
          <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Password (6+ chars)" value={password} onChange={(e) => setPassword(e.target.value)} />
          {err && <div className="error">{err}</div>}
          <button disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        </form>
        <p className="muted" style={{ marginTop: '1rem' }}>
          Already have one? <Link to="/login" className="link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

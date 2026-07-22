import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
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
      const res = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:4000/api'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'login failed');
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
        <h1>Welcome back</h1>
        <p className="muted">Sign in to keep chatting.</p>
        <form onSubmit={submit}>
          <input placeholder="Username or email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {err && <div className="error">{err}</div>}
          <button disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="muted" style={{ marginTop: '1rem' }}>
          New here? <Link to="/register" className="link">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

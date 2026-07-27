import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../../shared/context/AuthContext.jsx';
import PostRegisterStepper from '../../../shared/components/ui/PostRegisterStepper.jsx';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  async function handleGoogleSuccess(credentialResponse) {
    setErr('');
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google registration failed');
      login({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
      setRegistered(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');

    if (password !== confirmPassword) {
      setErr('Passwords do not match');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      login({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
      setRegistered(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (registered) {
    return <PostRegisterStepper onComplete={() => nav('/chat')} />;
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span className="pill-cap-shade" style={{ marginBottom: '0.5rem' }}>CREATE YOUR WORKSPACE</span>
          <h1 style={{ color: '#4a154b', marginTop: '0.5rem' }}>Sign up for DropTalk</h1>
          <p className="muted">Join your team on DropTalk workspace messaging.</p>
        </div>

        {/* Google OAuth Button */}
        <div className="google-btn-wrapper" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setErr('Google Sign-In failed')}
            shape="pill"
            theme="outline"
            size="large"
            text="signup_with"
            width="340"
          />
        </div>

        <div className="auth-divider" style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', color: '#696969', fontSize: '13px' }}>
          <div style={{ flex: 1, height: '1px', background: '#e6e6e6' }} />
          <span style={{ padding: '0 12px', fontWeight: 600 }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: '#e6e6e6' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="profile-field" style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', marginBottom: '6px' }}>Full Name</label>
            <input
              type="text"
              placeholder="e.g. Alex Morgan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              autoComplete="name"
              style={{ width: '100%' }}
            />
          </div>

          <div className="profile-field" style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', marginBottom: '6px' }}>Work Email</label>
            <input
              type="email"
              placeholder="name@work-email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{ width: '100%' }}
            />
          </div>

          <div className="profile-field" style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', marginBottom: '6px' }}>Password</label>
            <input
              type="password"
              placeholder="Password (6+ chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              style={{ width: '100%' }}
            />
          </div>

          <div className="profile-field" style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', marginBottom: '6px' }}>Confirm Password</label>
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              style={{ width: '100%' }}
            />
          </div>

          {err && <div className="error">{err}</div>}

          <button
            type="submit"
            disabled={busy}
            className="button-primary-pill"
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px', padding: '12px 24px', backgroundColor: '#4a154b', color: '#ffffff' }}
          >
            {busy ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="muted" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          Already using DropTalk? <Link to="/login" className="link" style={{ color: '#1264a3', fontWeight: 700 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

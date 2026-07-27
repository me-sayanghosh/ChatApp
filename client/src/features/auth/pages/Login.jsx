import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../../shared/context/AuthContext.jsx';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
const rawGoogleId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const isRealGoogleId = rawGoogleId && !rawGoogleId.includes('YOUR_GOOGLE_CLIENT_ID') && !rawGoogleId.includes('dummy') && !rawGoogleId.includes('example');

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
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
      if (!res.ok) throw new Error(data.error || 'Google sign-in failed');
      login({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
      if (data.user.needsUsername) {
        nav('/set-username');
      } else {
        nav('/chat');
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span className="pill-cap-shade" style={{ marginBottom: '0.5rem' }}>WORKPLACE MESSAGING</span>
          <h1 style={{ color: '#4a154b', marginTop: '0.5rem' }}>Sign in to DropTalk</h1>
          <p className="muted">We suggest using the email address you use at work.</p>
        </div>

        {/* Google OAuth Button */}
        <div className="google-btn-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.25rem' }}>
          {isRealGoogleId ? (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setErr('Google Sign-In failed or was cancelled')}
              shape="pill"
              theme="outline"
              size="large"
              width="340"
            />
          ) : (
            <div
              onClick={() => setErr('Please paste your real Google Client ID into client/.env file and restart dev server')}
              style={{ cursor: 'pointer', border: '1px solid #cbd5e1', borderRadius: '90px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px', background: '#ffffff', width: '340px', justifyContent: 'center' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1d' }}>Sign in with Google</span>
            </div>
          )}
        </div>

        <div className="auth-divider" style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', color: '#696969', fontSize: '13px' }}>
          <div style={{ flex: 1, height: '1px', background: '#e6e6e6' }} />
          <span style={{ padding: '0 12px', fontWeight: 600 }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: '#e6e6e6' }} />
        </div>

        <form onSubmit={async (e) => {
          e.preventDefault();
          setErr('');
          setBusy(true);
          try {
            const res = await fetch(`${API}/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ identifier, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');
            login({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
            if (data.user.needsUsername) {
              nav('/set-username');
            } else {
              nav('/chat');
            }
          } catch (e) {
            setErr(e.message);
          } finally {
            setBusy(false);
          }
        }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="profile-field" style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', marginBottom: '6px' }}>Email or Username</label>
            <input
              placeholder="name@work-email.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoFocus
              style={{ width: '100%' }}
            />
          </div>

          <div className="profile-field" style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', marginBottom: '6px' }}>Password</label>
            <input
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          {err && <div className="error">{err}</div>}

          <button
            disabled={busy}
            type="submit"
            className="button-primary-pill"
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px', padding: '12px 24px', backgroundColor: '#4a154b', color: '#ffffff' }}
          >
            {busy ? 'Signing in…' : 'Sign In with Email'}
          </button>
        </form>

        <p className="muted" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          New to DropTalk? <Link to="/register" className="link" style={{ color: '#1264a3', fontWeight: 700 }}>Create an account</Link>
        </p>
      </div>
    </div>
  );
}

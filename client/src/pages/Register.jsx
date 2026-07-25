import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Stepper, { Step } from '../components/Stepper.jsx';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(1);
  const { login, setUser } = useAuth();
  const nav = useNavigate();

  async function handleAccount(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'registration failed');
      login({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
      setStep(2);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUsername(e) {
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
      <div className="auth-card stepper-no-footer">
        <Stepper
          key={step}
          initialStep={step}
          nextButtonText={step === 1 ? 'Continue' : 'Complete'}
          backButtonText="Back"
          disableStepIndicators
        >
          <Step>
            <h1>Create account</h1>
            <p className="muted">Enter your email and password to get started.</p>
            <form onSubmit={handleAccount}>
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required autoComplete="email" />
              <input type="password" placeholder="Password (6+ chars)" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
              {err && <div className="error">{err}</div>}
              <button disabled={busy}>{busy ? 'Creating…' : 'Continue'}</button>
            </form>
            <p className="muted" style={{ marginTop: '1rem' }}>
              Already have one? <Link to="/login" className="link">Sign in</Link>
            </p>
          </Step>
          <Step>
            <h1>Pick a username</h1>
            <p className="muted">This is how others will see you. You can change it later.</p>
            <form onSubmit={handleUsername}>
              <input placeholder="Username (3-24 chars)" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus minLength={3} maxLength={24} pattern="[a-zA-Z0-9_-]+" required autoComplete="username" />
              {err && <div className="error">{err}</div>}
              <button disabled={busy}>{busy ? 'Saving…' : 'Save & start chatting'}</button>
            </form>
            <button className="skip-username" onClick={() => nav('/chat')}>Skip for now</button>
          </Step>
        </Stepper>
      </div>
    </div>
  );
}

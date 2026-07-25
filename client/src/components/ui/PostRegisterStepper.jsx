import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import Stepper, { Step } from './Stepper.jsx';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

export default function PostRegisterStepper({ onComplete }) {
  const [username, setUsername] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { setUser } = useAuth();

  async function handleSetUsername(e) {
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
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="post-register-overlay">
      <div className="post-register-modal">
        <Stepper
          initialStep={1}
          backButtonText="Back"
          nextButtonText="Next"
          onFinalStepCompleted={onComplete}
        >
          <Step>
            <h2>Welcome aboard!</h2>
            <p>Your account has been created successfully.</p>
            <p className="muted">Let's set up your profile so others can find you.</p>
          </Step>
          <Step>
            <h2>Pick a username</h2>
            <p>This is how others will see you in chats. You can skip and set it later.</p>
            <form onSubmit={handleSetUsername}>
              <input
                placeholder="Username (3-24 chars)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                maxLength={24}
                pattern="[a-zA-Z0-9_-]+"
                autoComplete="username"
              />
              {err && <div className="error">{err}</div>}
              <button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save username'}
              </button>
            </form>
          </Step>
          <Step>
            <h2>You're all set!</h2>
            <p>Your profile is ready. Start chatting!</p>
          </Step>
        </Stepper>
      </div>
    </div>
  );
}

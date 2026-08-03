import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, ShieldCheck, Sparkles, KeyRound, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext.jsx';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
const rawGoogleId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const isRealGoogleId = rawGoogleId && !rawGoogleId.includes('YOUR_GOOGLE_CLIENT_ID') && !rawGoogleId.includes('dummy') && !rawGoogleId.includes('example');

export default function JoinNow() {
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { login } = useAuth();
  const nav = useNavigate();
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle Google OAuth Sign-In
  async function handleGoogleSuccess(credentialResponse) {
    setErr('');
    setInfo('');
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

  // Handle Request OTP
  async function handleSendOtp(e) {
    if (e) e.preventDefault();
    setErr('');
    setInfo('');

    if (!email || !email.includes('@')) {
      setErr('Please enter a valid email address.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');

      setStep('otp');
      setResendCooldown(30);
      setInfo(`Verification code sent to ${email}`);
      setTimeout(() => inputRefs[0].current?.focus(), 150);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Handle OTP digit changes with auto-advance
  function handleDigitChange(index, val) {
    if (val.length > 1) {
      // Pasted full OTP code
      const cleaned = val.replace(/\D/g, '').slice(0, 6);
      if (cleaned.length > 0) {
        const nextDigits = [...otpDigits];
        for (let i = 0; i < 6; i++) {
          nextDigits[i] = cleaned[i] || '';
        }
        setOtpDigits(nextDigits);
        const nextFocus = Math.min(cleaned.length, 5);
        inputRefs[nextFocus].current?.focus();
        if (cleaned.length === 6) {
          verifyOtpCode(cleaned);
        }
      }
      return;
    }

    const nextDigits = [...otpDigits];
    nextDigits[index] = val;
    setOtpDigits(nextDigits);

    // Auto-advance to next input
    if (val && index < 5) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto-submit when all 6 digits are entered
    const fullCode = nextDigits.join('');
    if (fullCode.length === 6) {
      verifyOtpCode(fullCode);
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  }

  // Handle Verify OTP
  async function verifyOtpCode(codeToVerify) {
    const code = codeToVerify || otpDigits.join('');
    if (code.length < 6) {
      setErr('Please enter all 6 digits of the verification code.');
      return;
    }

    setErr('');
    setInfo('');
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

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
    <div className="auth" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B0F19', padding: '1.5rem' }}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="auth-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '2.25rem',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 82, 255, 0.15)',
          color: '#F8FAFC',
        }}
      >
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '54px',
              height: '54px',
              background: 'linear-gradient(135deg, #0052FF, #7C3AED)',
              borderRadius: '16px',
              color: '#fff',
              marginBottom: '1rem',
              boxShadow: '0 8px 24px rgba(0, 82, 255, 0.4)',
            }}
          >
            <Sparkles size={28} />
          </motion.div>
          <h1 style={{ color: '#F8FAFC', fontSize: '1.85rem', fontWeight: 800, tracking: '-0.02em', margin: 0 }}>
            Join DropTalk
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.4rem', lineHeight: 1.4 }}>
            Secure real-time workspace messaging. Choose your preferred sign-in method.
          </p>
        </div>

        {/* ── Method 1: Google OAuth Login ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
          {isRealGoogleId ? (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setErr('Google Sign-In was cancelled or failed')}
              shape="pill"
              theme="outline"
              size="large"
              width="360"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setErr('Real Google Client ID not detected in environment. Using Email OTP authentication below.');
              }}
              style={{
                cursor: 'pointer',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '90px',
                padding: '12px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                width: '100%',
                justifyContent: 'center',
                color: '#F8FAFC',
                fontWeight: 600,
                fontSize: '0.95rem',
                transition: 'all 0.2s ease',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          )}
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', color: '#64748B', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
          <span style={{ padding: '0 14px' }}>OR CONTINUE WITH EMAIL OTP</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
        </div>

        {/* Status Messages */}
        {err && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#FCA5A5',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ShieldCheck size={16} style={{ flexShrink: 0 }} />
            <span>{err}</span>
          </motion.div>
        )}

        {info && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#6EE7B7',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{info}</span>
          </motion.div>
        )}

        {/* ── Method 2: Email OTP Flow ── */}
        <AnimatePresence mode="wait">
          {step === 'email' ? (
            <motion.form
              key="step-email"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleSendOtp}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '8px' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={18}
                    style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}
                  />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      borderRadius: '14px',
                      background: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#F8FAFC',
                      fontSize: '0.95rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={busy}
                type="submit"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '13px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #0052FF, #2563EB)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  border: 'none',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 20px rgba(0, 82, 255, 0.3)',
                  marginTop: '6px',
                }}
              >
                {busy ? (
                  'Sending Code…'
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </motion.button>
            </motion.form>
          ) : (
            <motion.div
              key="step-otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.88rem', color: '#94A3B8', margin: 0 }}>
                  Enter the 6-digit code sent to <br />
                  <strong style={{ color: '#F8FAFC' }}>{email}</strong>
                </p>
              </div>

              {/* 6 Digit OTP Inputs */}
              <div style={{ display: 'flex', justifyContent: 'spaceBetween', gap: '8px', margin: '8px 0' }}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={inputRefs[idx]}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    style={{
                      width: '100%',
                      height: '52px',
                      textAlign: 'center',
                      fontSize: '1.4rem',
                      fontWeight: 800,
                      borderRadius: '12px',
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: digit ? '2px solid #0052FF' : '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#F8FAFC',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={busy}
                onClick={() => verifyOtpCode()}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '13px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #0052FF, #2563EB)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  border: 'none',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 20px rgba(0, 82, 255, 0.3)',
                }}
              >
                {busy ? (
                  'Verifying…'
                ) : (
                  <>
                    <KeyRound size={18} />
                    <span>Verify & Continue</span>
                  </>
                )}
              </motion.button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.85rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setErr('');
                    setInfo('');
                  }}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                >
                  Change email
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || busy}
                  onClick={handleSendOtp}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: resendCooldown > 0 ? '#64748B' : '#60A5FA',
                    cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0,
                    fontWeight: 600,
                  }}
                >
                  <RotateCcw size={14} />
                  <span>{resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

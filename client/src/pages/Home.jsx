import { Link } from 'react-router-dom';
import Aurora from '../components/Aurora.jsx';

export default function Home() {
  return (
    <div className="home">
      <div className="home-aurora">
        <Aurora
          colorStops={['#FFB627', '#F5871F', '#FFF8E7']}
          blend={0.4}
          amplitude={0.8}
          speed={0.5}
        />
      </div>

      <div className="home-overlay" />

      <div className="home-content">
        <nav className="home-nav">
          <span className="home-brand">ChatApp</span>
          <div className="home-nav-links">
            <Link to="/login" className="home-btn-ghost">Sign in</Link>
            <Link to="/register" className="home-btn-primary">Get Started</Link>
          </div>
        </nav>

        <main className="home-hero">
          <span className="home-badge" style={{ animation: 'fadeIn 0.6s ease both' }}>
            Real-time encrypted messaging
          </span>
          <h1 style={{ animation: 'fadeSlideUp 0.6s ease 0.1s both' }}>
            Chat without
            <br />
            <span className="home-accent">boundaries.</span>
          </h1>
          <p
            className="home-subtitle"
            style={{ animation: 'fadeSlideUp 0.6s ease 0.2s both' }}
          >
            End-to-end encrypted rooms, real-time presence, thread replies,
            AI-powered suggestions &mdash; all in one place.
          </p>
          <div
            className="home-actions"
            style={{ animation: 'fadeSlideUp 0.6s ease 0.3s both' }}
          >
            <Link to="/register" className="home-btn-primary large">
              Start chatting free
            </Link>
            <Link to="/login" className="home-btn-ghost large">
              I have an account
            </Link>
          </div>
        </main>

        <div className="home-features">
          <div
            className="home-feature"
            style={{ animation: 'scrollFadeUp 0.5s ease 0.1s both' }}
          >
            <div className="home-feature-icon">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#F5871F"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3>E2EE Rooms</h3>
            <p>Private rooms with end-to-end encryption. Only members can read messages.</p>
          </div>

          <div
            className="home-feature"
            style={{ animation: 'scrollFadeUp 0.5s ease 0.2s both' }}
          >
            <div className="home-feature-icon">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#F5871F"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <h3>Real-time</h3>
            <p>Instant delivery with typing indicators, read receipts, and live presence.</p>
          </div>

          <div
            className="home-feature"
            style={{ animation: 'scrollFadeUp 0.5s ease 0.3s both' }}
          >
            <div className="home-feature-icon">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#F5871F"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M12 8v4" />
                <path d="M10 10h4" />
              </svg>
            </div>
            <h3>AI Assistant</h3>
            <p>Summarize conversations and get smart reply suggestions powered by Gemini.</p>
          </div>
        </div>

        <footer className="home-footer">
          Built with React, Socket.IO &amp; MongoDB
        </footer>
      </div>
    </div>
  );
}

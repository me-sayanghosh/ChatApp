import { Link } from 'react-router-dom';
import Aurora from '../components/Aurora.jsx';

export default function Home() {
  return (
    <div className="home">
      <div className="home-aurora">
        <Aurora
          colorStops={['#3A29FF', '#FF94B4', '#FF3232']}
          blend={0.5}
          amplitude={1.0}
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
          <span className="home-badge">Real-time encrypted messaging</span>
          <h1>
            Chat without
            <br />
            <span className="home-gradient">boundaries.</span>
          </h1>
          <p className="home-subtitle">
            End-to-end encrypted rooms, real-time presence, thread replies,
            AI-powered suggestions &mdash; all in one place.
          </p>
          <div className="home-actions">
            <Link to="/register" className="home-btn-primary large">Start chatting free</Link>
            <Link to="/login" className="home-btn-ghost large">I have an account</Link>
          </div>
        </main>

        <div className="home-features">
          <div className="home-feature">
            <div className="home-feature-icon">🔒</div>
            <h3>E2EE Rooms</h3>
            <p>Private rooms with end-to-end encryption. Only members can read messages.</p>
          </div>
          <div className="home-feature">
            <div className="home-feature-icon">⚡</div>
            <h3>Real-time</h3>
            <p>Instant delivery with typing indicators, read receipts, and live presence.</p>
          </div>
          <div className="home-feature">
            <div className="home-feature-icon">🤖</div>
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

import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Lock, MessageSquare, Sparkles, GitBranch, SmilePlus,
  Shield, Eye, RefreshCw, KeyRound,
} from 'lucide-react';
import Aurora from '../components/Aurora.jsx';
import RotatingText from '../components/RotatingText.jsx';
import ScrollFloat from '../components/ScrollFloat.jsx';
import {
  E2EEIllustration, RealTimeIllustration, AIAssistantIllustration,
  ThreadRepliesIllustration, ReactionsIllustration, ModerationIllustration,
  PresenceIllustration, OfflineSyncIllustration, AccessControlIllustration,
  SecurityShieldIllustration,
} from '../components/Illustrations.jsx';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: 'easeOut', delay: i * 0.1 },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const FEATURES = [
  { icon: Lock, illustration: E2EEIllustration, title: 'End-to-End Encryption', desc: 'RSA-OAEP and AES-GCM keep your private room messages sealed from the server.' },
  { icon: MessageSquare, illustration: RealTimeIllustration, title: 'Real-Time Messaging', desc: 'Messages delivered instantly over WebSockets with automatic offline queue and backfill.' },
  { icon: Sparkles, illustration: AIAssistantIllustration, title: 'AI Assistant', desc: 'Gemini-powered chat summarization and smart reply suggestions at your fingertips.' },
  { icon: GitBranch, illustration: ThreadRepliesIllustration, title: 'Thread Replies', desc: 'Keep conversations organized with side-panel threaded discussions on any message.' },
  { icon: SmilePlus, illustration: ReactionsIllustration, title: 'Message Reactions', desc: 'React with emoji to any message. Toggle reactions with a single click.' },
  { icon: Shield, illustration: ModerationIllustration, title: 'Role-Based Moderation', desc: 'Owner and moderator roles with kick, ban, mute, and promote controls.' },
  { icon: Eye, illustration: PresenceIllustration, title: 'Presence & Typing', desc: 'See who is online, where they are, and when they are typing in real time.' },
  { icon: RefreshCw, illustration: OfflineSyncIllustration, title: 'Offline Sync', desc: 'Messages queued offline are sent automatically on reconnect with instant backfill.' },
  { icon: KeyRound, illustration: AccessControlIllustration, title: 'Access Control', desc: 'Private rooms with join requests, approval workflows, and banned-user enforcement.' },
];

const STEPS = [
  { num: '01', title: 'Create an account', desc: 'Sign up with your email. Pick a username that represents you.' },
  { num: '02', title: 'Join or create a room', desc: 'Browse public channels, request access to private rooms, or start your own.' },
  { num: '03', title: 'Chat in real time', desc: 'Send messages instantly. Private rooms are end-to-end encrypted by default.' },
  { num: '04', title: 'Catch up with AI', desc: 'Use the AI assistant to summarize long conversations and get reply suggestions.' },
];

const MOCK_MESSAGES = [
  { id: 1, sender: 'Alice', text: 'Hey everyone! Just deployed the new feature.', mine: false },
  { id: 2, sender: 'Bob', text: 'Looks great. The encryption flow is smooth now.', mine: false },
  { id: 3, sender: 'You', text: 'Thanks! Took a while to get the key exchange right.', mine: true },
  { id: 4, sender: 'Alice', text: 'The real-time presence is super responsive too.', mine: false },
  { id: 5, sender: 'Bob', text: 'Agreed. Ship it!', mine: false, reaction: { emoji: '\u{1F44D}', count: 3 } },
];

const SECURITY_ITEMS = [
  'JWT access tokens with refresh token rotation and reuse detection',
  'Bcrypt password hashing with salt rounds',
  'RSA-OAEP key exchange + AES-GCM encryption for private rooms',
  'Banned-user enforcement at the server and socket level',
  'Per-socket heartbeat presence with automatic stale-session cleanup',
];

function AnimatedSection({ children, className = '', ...props }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={staggerContainer}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

function FeatureCard({ feature, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const Icon = feature.icon;
  const Illustration = feature.illustration;

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={fadeUp}
      custom={index % 3}
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="home-feature-card"
    >
      <motion.div className="home-feature-illustration" whileHover={{ rotate: 5 }} transition={{ duration: 0.3 }}>
        <Illustration />
      </motion.div>
      <div className="home-feature-icon-wrap">
        <motion.div
          className="home-feature-icon"
          whileHover={{ y: [0, -3, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon size={22} strokeWidth={2} />
        </motion.div>
      </div>
      <h3>{feature.title}</h3>
      <p>{feature.desc}</p>
    </motion.div>
  );
}

function MockChatDemo() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
      className="mock-chat"
    >
      <div className="mock-chat-chrome">
        <div className="mock-chrome-dots">
          <span /><span /><span />
        </div>
        <div className="mock-chrome-title">DropTalk</div>
        <div style={{ width: 48 }} />
      </div>
      <div className="mock-chat-header">
        <div className="mock-chat-header-icon">#</div>
        <div className="mock-chat-header-info">
          <span className="mock-chat-header-name">general</span>
          <span className="mock-chat-header-meta">3 online</span>
        </div>
      </div>
      <div className="mock-chat-messages">
        {MOCK_MESSAGES.map((msg, i) => (
          <motion.div
            key={msg.id}
            className={`mock-msg ${msg.mine ? 'mock-msg-mine' : ''}`}
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.4 + i * 0.35 }}
          >
            {!msg.mine && <span className="mock-msg-sender">{msg.sender}</span>}
            <div className="mock-msg-bubble">{msg.text}</div>
            {msg.reaction && (
              <motion.div
                className="mock-msg-reaction"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.4 + i * 0.35 + 0.5 }}
              >
                {msg.reaction.emoji} {msg.reaction.count}
              </motion.div>
            )}
          </motion.div>
        ))}
        <motion.div
          className="mock-typing"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.3, delay: 2.5 }}
        >
          <span className="mock-typing-dots"><span /><span /><span /></span>
          <span className="mock-typing-text">Alice is typing</span>
        </motion.div>
      </div>
      <div className="mock-chat-input">
        <div className="mock-chat-input-field">Type a message...</div>
        <div className="mock-chat-send-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  return (
    <div className="home">
      <div className="home-aurora">
        <Aurora colorStops={['#FFB627', '#F5871F', '#FFF8E7']} blend={0.4} amplitude={0.8} speed={0.5} />
      </div>
      <div className="home-overlay" />

      <div className="home-content">
        {/* ── Nav ── */}
        <nav className="home-nav">
          <span className="home-brand">DropTalk</span>
          <div className="home-nav-links">
            <Link to="/login" className="home-btn-ghost">Sign in</Link>
            <Link to="/register" className="home-btn-primary">Get Started</Link>
          </div>
        </nav>

        {/* ── 1. Hero ── */}
        <section className="home-hero">
          <motion.span
            className="home-badge"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            Real-time encrypted messaging
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          >
            Chat without<br />
            <span className="home-accent rotating-text-wrap">
              <RotatingText
                texts={['boundaries.', 'limits.', 'borders.', 'delays.']}
                splitBy="characters"
                rotationInterval={2700}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '-120%', opacity: 0 }}
              />
            </span>
          </motion.h1>
          <motion.p
            className="home-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          >
            End-to-end encrypted rooms, real-time presence, thread replies,
            AI-powered suggestions &mdash; all in one place.
          </motion.p>
          <motion.div
            className="home-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
          >
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link to="/register" className="home-btn-primary large">Start chatting free</Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link to="/login" className="home-btn-ghost large">I have an account</Link>
            </motion.div>
          </motion.div>
        </section>

        {/* ── 2. Feature Grid ── */}
        <section className="home-section">
          <AnimatedSection>
            <h2 className="home-section-title"><ScrollFloat containerClassName="scroll-float-title">Everything you need to communicate</ScrollFloat></h2>
            <motion.p className="home-section-sub" variants={fadeUp}>Nine features designed for secure, real-time collaboration.</motion.p>
          </AnimatedSection>
          <div className="home-feature-grid">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} feature={f} index={i} />
            ))}
          </div>
        </section>

        {/* ── 3. How It Works ── */}
        <section className="home-section home-section-alt">
          <AnimatedSection>
            <h2 className="home-section-title"><ScrollFloat containerClassName="scroll-float-title">How it works</ScrollFloat></h2>
            <motion.p className="home-section-sub" variants={fadeUp}>From sign-up to your first message in under a minute.</motion.p>
          </AnimatedSection>
          <div className="home-steps">
            {STEPS.map((s, i) => (
              <StepItem key={s.num} step={s} index={i} isLast={i === STEPS.length - 1} />
            ))}
          </div>
        </section>

        {/* ── 4. Security / Trust ── */}
        <section className="home-section">
          <div className="home-security">
            <motion.div
              className="home-security-text"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={staggerContainer}
            >
              <motion.span className="home-badge" variants={fadeUp}>Security first</motion.span>
              <motion.h2 className="home-section-title" style={{ textAlign: 'left' }} variants={fadeUp}>
                Built to keep your conversations private
              </motion.h2>
              <motion.ul className="home-security-list" variants={staggerContainer}>
                {SECURITY_ITEMS.map((item, i) => (
                  <motion.li key={i} variants={fadeUp} custom={i}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                    <span>{item}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
            <motion.div
              className="home-security-visual"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
            >
              <motion.div
                className="home-security-illust"
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <SecurityShieldIllustration />
                <div className="home-security-label">E2EE Protected</div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── 5. Product Preview ── */}
        <section className="home-section home-section-alt">
          <AnimatedSection>
            <motion.h2 className="home-section-title" variants={fadeUp}>See it in action</motion.h2>
            <motion.p className="home-section-sub" variants={fadeUp}>Real-time messaging with reactions, typing indicators, and read receipts.</motion.p>
          </AnimatedSection>
          <MockChatDemo />
        </section>

        {/* ── 6. CTA Band ── */}
        <section className="home-cta-band">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <h2 className="home-cta-title"><ScrollFloat containerClassName="scroll-float-title scroll-float-cta">Ready to start chatting?</ScrollFloat></h2>
            <p className="home-cta-sub">Join for free. No credit card required.</p>
            <div className="home-cta-actions">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link to="/register" className="home-btn-primary large">Create your account</Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link to="/login" className="home-btn-ghost large">Sign in instead</Link>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* ── 7. Footer ── */}
        <footer className="home-footer">
          <div className="home-footer-links">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="home-footer-link">GitHub</a>
            <span className="home-footer-sep">&middot;</span>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="home-footer-link">Documentation</a>
          </div>
        </footer>
      </div>
    </div>
  );
}

function StepItem({ step, index, isLast }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  return (
    <motion.div
      ref={ref}
      className="home-step"
      initial={{ opacity: 0, x: -20 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.15 }}
    >
      <motion.div
        className="home-step-num"
        initial={{ scale: 0.8 }}
        animate={inView ? { scale: 1 } : {}}
        transition={{ duration: 0.4, ease: 'easeOut', delay: index * 0.15 }}
      >
        {step.num}
      </motion.div>
      <div className="home-step-content">
        <h3>{step.title}</h3>
        <p>{step.desc}</p>
      </div>
      {!isLast && (
        <motion.div
          className="home-step-connector"
          initial={{ scaleY: 0 }}
          animate={inView ? { scaleY: 1 } : {}}
          transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.15 + 0.2 }}
          style={{ transformOrigin: 'top' }}
        />
      )}
    </motion.div>
  );
}

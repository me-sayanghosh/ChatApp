import { useState } from 'react';
import { formatCardTime } from '../../../shared/utils/dateUtils.js';
import StartCallModal from './StartCallModal.jsx';

export default function CallLogsMainView({ logs = [], selectedLog, onStartCall, onClearHistory, onBack }) {
  const [showModal, setShowModal] = useState(false);

  const totalCalls = logs.length;
  const missedCount = logs.filter((l) => l.status === 'missed' || l.status === 'rejected').length;
  const voiceCount = logs.filter((l) => l.type === 'voice').length;
  const videoCount = logs.filter((l) => l.type === 'video').length;

  function formatDuration(sec) {
    if (!sec || sec <= 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function formatFullDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="call-main-container">
      <StartCallModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onStartCall={onStartCall}
      />

      {/* Header Bar */}
      <header className="chat-header">
        <div className="header-left">
          {onBack && (
            <button
              className="mobile-back-btn"
              onClick={onBack}
              title="Back to Call List"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
          )}
          <div className="header-avatar-badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
          <div className="header-room-info">
            <h2 className="header-room-name">Calls &amp; Activity</h2>
            <div className="header-room-meta">
              <span className="meta-pill">DropTalk</span>
              <span className="header-sep">&middot;</span>
              <span className="dot online"></span>
              <span>Voice &amp; Video Center</span>
            </div>
          </div>
        </div>

        <div className="header-right">
          <button
            className="button-primary-pill"
            onClick={() => setShowModal(true)}
            title="Start New Call"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Start a Call</span>
          </button>
          {logs.length > 0 && (
            <button className="button-secondary-pill" onClick={onClearHistory} title="Clear call logs">
              Clear History
            </button>
          )}
        </div>
      </header>

      {/* Metrics Ribbon */}
      <div className="call-metrics-ribbon">
        <div className="call-metric-item">
          <span className="metric-num">{totalCalls}</span>
          <span className="metric-lbl">Total Calls</span>
        </div>
        <div className="call-metric-divider" />
        <div className="call-metric-item missed">
          <span className="metric-num">{missedCount}</span>
          <span className="metric-lbl">Missed</span>
        </div>
        <div className="call-metric-divider" />
        <div className="call-metric-item voice">
          <span className="metric-num">{voiceCount}</span>
          <span className="metric-lbl">Voice</span>
        </div>
        <div className="call-metric-divider" />
        <div className="call-metric-item video">
          <span className="metric-num">{videoCount}</span>
          <span className="metric-lbl">Video</span>
        </div>
      </div>

      {/* Main Call Activity Content Area */}
      <div className="call-content-canvas">
        {logs.length === 0 ? (
          <div className="call-main-empty">
            <div className="call-empty-icon-wrap">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <h3>No Call History Yet</h3>
            <p>Connect instantly with teammates using high-definition voice and video calls.</p>
            <button className="button-primary-pill" onClick={() => setShowModal(true)} style={{ marginTop: '12px' }}>
              Start Your First Call
            </button>
          </div>
        ) : (
          <div className="call-table-wrapper">
            <div className="call-table-title-row">
              <h3>Recent Activity</h3>
              <span className="call-count-tag">{logs.length} logged</span>
            </div>
            <table className="call-table">
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Date &amp; Time</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const partnerName = log.partner?.name || log.partner?.username || 'Unknown User';
                  const avatar = log.partner?.profileImage;
                  const initial = (log.partner?.username || 'U')[0].toUpperCase();
                  const isMissed = log.status === 'missed' || log.status === 'rejected';

                  return (
                    <tr key={log.id} className={isMissed ? 'tr-missed' : ''}>
                      <td>
                        <div className="contact-cell">
                          <div className="contact-avatar">
                            {avatar ? <img src={avatar} alt={partnerName} /> : <span>{initial}</span>}
                          </div>
                          <div className="contact-info">
                            <span className="contact-name">{partnerName}</span>
                            {log.partner?.username && <span className="contact-user">@{log.partner.username}</span>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`call-type-tag ${log.type}`}>
                          {log.type === 'video' ? '📹 Video' : '📞 Voice'}
                        </span>
                      </td>
                      <td>
                        <span className={`call-status-tag ${log.direction} ${isMissed ? 'missed' : ''}`}>
                          {isMissed
                            ? '❌ Missed'
                            : log.direction === 'outgoing'
                            ? '↗ Outgoing'
                            : '↙ Incoming'}
                        </span>
                      </td>
                      <td className="duration-cell">
                        {isMissed ? '-' : formatDuration(log.durationSeconds)}
                      </td>
                      <td className="time-cell">{formatFullDate(log.createdAt)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {log.partner?.id && (
                          <div className="call-table-actions">
                            <button
                              className="call-btn-voice"
                              onClick={() => onStartCall?.(log.partner.id, null, false)}
                              title={`Voice Call ${partnerName}`}
                            >
                              📞 Voice
                            </button>
                            <button
                              className="call-btn-video"
                              onClick={() => onStartCall?.(log.partner.id, null, true)}
                              title={`Video Call ${partnerName}`}
                            >
                              📹 Video
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

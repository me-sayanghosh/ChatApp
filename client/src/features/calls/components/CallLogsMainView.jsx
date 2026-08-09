import { useState } from 'react';
import { formatCardTime } from '../../../shared/utils/dateUtils.js';
import StartCallModal from './StartCallModal.jsx';

export default function CallLogsMainView({ logs = [], selectedLog, onStartCall, onClearHistory, onBack }) {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'missed' | 'voice' | 'video'

  const totalCalls = logs.length;
  const missedCount = logs.filter((l) => l.status === 'missed' || l.status === 'rejected').length;
  const voiceCount = logs.filter((l) => l.type === 'voice').length;
  const videoCount = logs.filter((l) => l.type === 'video').length;

  const filteredLogs = logs.filter((log) => {
    const partnerName = log.partner?.name || log.partner?.username || 'Unknown User';
    const matchesSearch = partnerName.toLowerCase().includes(search.toLowerCase().replace(/^@/, ''));
    if (!matchesSearch) return false;

    if (filter === 'missed') return log.status === 'missed' || log.status === 'rejected';
    if (filter === 'voice') return log.type === 'voice';
    if (filter === 'video') return log.type === 'video';
    return true;
  });

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

  function renderDirectionIcon(direction, status) {
    if (status === 'missed' || status === 'rejected') {
      return (
        <span className="call-dir-icon missed" title="Missed Call">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 7 17 17 17" />
          </svg>
        </span>
      );
    }
    if (direction === 'incoming') {
      return (
        <span className="call-dir-icon incoming" title="Incoming Call">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 7 17 17 17" />
          </svg>
        </span>
      );
    }
    return (
      <span className="call-dir-icon outgoing" title="Outgoing Call">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="7" y1="7" x2="17" y2="17" />
          <polyline points="17 7 17 17 7 17" />
        </svg>
      </span>
    );
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
              title="Back to Channels"
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
              <span className="meta-pill">Voice &amp; Video Center</span>
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

      {/* Analytics Cards Bar */}
      <div className="call-analytics-grid">
        <div className="call-analytics-card">
          <div className="analytics-icon-badge total">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
          <div className="analytics-info">
            <span className="analytics-num">{totalCalls}</span>
            <span className="analytics-label">Total Calls</span>
          </div>
        </div>

        <div className="call-analytics-card missed">
          <div className="analytics-icon-badge missed">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.5 16.5A19.79 19.79 0 0 1 13.37 18.9 19.5 19.5 0 0 1 7.37 12.9a19.79 19.79 0 0 1 2.4-3.13" />
            </svg>
          </div>
          <div className="analytics-info">
            <span className="analytics-num missed-text">{missedCount}</span>
            <span className="analytics-label">Missed</span>
          </div>
        </div>

        <div className="call-analytics-card voice">
          <div className="analytics-icon-badge voice">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          </div>
          <div className="analytics-info">
            <span className="analytics-num voice-text">{voiceCount}</span>
            <span className="analytics-label">Voice</span>
          </div>
        </div>

        <div className="call-analytics-card video">
          <div className="analytics-icon-badge video">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <div className="analytics-info">
            <span className="analytics-num video-text">{videoCount}</span>
            <span className="analytics-label">Video</span>
          </div>
        </div>
      </div>

      {/* Embedded Search Bar & Filter Tabs */}
      <div className="call-controls-wrapper">
        <div className="call-search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            placeholder="Search calls or contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="call-search-clear" onClick={() => setSearch('')}>&times;</button>
          )}
        </div>

        <div className="call-tabs">
          <button className={`call-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            All
          </button>
          <button className={`call-tab ${filter === 'missed' ? 'active' : ''}`} onClick={() => setFilter('missed')}>
            Missed
          </button>
          <button className={`call-tab ${filter === 'voice' ? 'active' : ''}`} onClick={() => setFilter('voice')}>
            Voice
          </button>
          <button className={`call-tab ${filter === 'video' ? 'active' : ''}`} onClick={() => setFilter('video')}>
            Video
          </button>
        </div>
      </div>

      {/* Main Call Activity Content Area */}
      <div className="call-content-canvas">
        {filteredLogs.length === 0 ? (
          <div className="call-main-empty">
            <div className="call-empty-icon-wrap">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <h3>{logs.length === 0 ? 'No Call History Yet' : 'No Call Logs Found'}</h3>
            <p>{logs.length === 0 ? 'Connect instantly with teammates using high-definition voice and video calls.' : 'No calls matched your current search or filter criteria.'}</p>
            {logs.length === 0 && (
              <button className="button-primary-pill" onClick={() => setShowModal(true)} style={{ marginTop: '12px' }}>
                Start Your First Call
              </button>
            )}
          </div>
        ) : (
          <div className="call-history-list-wrap">
            {/* Desktop Table View */}
            <div className="call-table-wrapper desktop-only-table">
              <div className="call-table-title-row">
                <h3>Recent Activity</h3>
                <span className="call-count-tag">{filteredLogs.length} logged</span>
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
                  {filteredLogs.map((log) => {
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
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Touch-Friendly Call List View */}
            <div className="call-mobile-list mobile-only-list">
              {filteredLogs.map((log) => {
                const partnerName = log.partner?.name || log.partner?.username || 'Unknown User';
                const avatar = log.partner?.profileImage;
                const initial = (log.partner?.username || 'U')[0].toUpperCase();
                const timeStr = formatCardTime(log.createdAt);
                const durationStr = formatDuration(log.durationSeconds);
                const isMissed = log.status === 'missed' || log.status === 'rejected';

                return (
                  <div key={log.id} className={`call-item ${isMissed ? 'call-item--missed' : ''}`}>
                    <div className="call-avatar">
                      {avatar ? <img src={avatar} alt={partnerName} /> : <span>{initial}</span>}
                      <span className={`call-type-badge ${log.type}`}>
                        {log.type === 'video' ? '📹' : '📞'}
                      </span>
                    </div>

                    <div className="call-item-body">
                      <div className="call-item-header">
                        <span className={`call-partner-name ${isMissed ? 'name-missed' : ''}`}>
                          {partnerName}
                        </span>
                        <span className="call-item-time">{timeStr}</span>
                      </div>

                      <div className="call-item-footer">
                        <div className="call-status-row">
                          {renderDirectionIcon(log.direction, log.status)}
                          <span className="call-status-text">
                            {isMissed
                              ? 'Missed Call'
                              : `${log.direction === 'outgoing' ? 'Outgoing' : 'Incoming'}${durationStr ? ` (${durationStr})` : ''}`}
                          </span>
                        </div>

                        {log.partner?.id && (
                          <div className="call-item-actions">
                            <button
                              className="call-action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                onStartCall?.(log.partner.id, null, false);
                              }}
                              title={`Voice call ${partnerName}`}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                              </svg>
                            </button>
                            <button
                              className="call-action-btn video-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                onStartCall?.(log.partner.id, null, true);
                              }}
                              title={`Video call ${partnerName}`}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <polygon points="23 7 16 12 23 17 23 7" />
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

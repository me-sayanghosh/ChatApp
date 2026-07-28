import { formatCardTime } from '../../../shared/utils/dateUtils.js';

export default function CallLogsMainView({ logs = [], selectedLog, onStartCall, onClearHistory }) {
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
      {/* Top Overview Banner */}
      <div className="call-main-header">
        <div className="call-main-header-info">
          <h1>Calls & Activity</h1>
          <p>View your recent voice and video call logs, missed calls, and start new calls.</p>
        </div>
        {logs.length > 0 && (
          <button className="call-main-clear-btn" onClick={onClearHistory}>
            Clear History
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="call-stats-grid">
        <div className="call-stat-card">
          <span className="stat-value">{totalCalls}</span>
          <span className="stat-label">Total Calls</span>
        </div>
        <div className="call-stat-card missed-stat">
          <span className="stat-value">{missedCount}</span>
          <span className="stat-label">Missed Calls</span>
        </div>
        <div className="call-stat-card voice-stat">
          <span className="stat-value">{voiceCount}</span>
          <span className="stat-label">Voice Calls</span>
        </div>
        <div className="call-stat-card video-stat">
          <span className="stat-value">{videoCount}</span>
          <span className="stat-label">Video Calls</span>
        </div>
      </div>

      {/* Main Call History Table / List */}
      <div className="call-history-section">
        <h3>Recent Call Activity</h3>

        {logs.length === 0 ? (
          <div className="call-main-empty">
            <div className="call-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <h2>No Call History Yet</h2>
            <p>Calls initiated or received with your contacts will be logged here.</p>
          </div>
        ) : (
          <div className="call-table-wrapper">
            <table className="call-table">
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Type</th>
                  <th>Direction & Status</th>
                  <th>Duration</th>
                  <th>Date & Time</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
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
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                              </svg>
                              Voice
                            </button>
                            <button
                              className="call-btn-video"
                              onClick={() => onStartCall?.(log.partner.id, null, true)}
                              title={`Video Call ${partnerName}`}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <polygon points="23 7 16 12 23 17 23 7" />
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                              </svg>
                              Video
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
        )}
      </div>
    </div>
  );
}

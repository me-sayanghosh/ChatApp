import { useState } from 'react';
import { formatCardTime } from '../../../shared/utils/dateUtils.js';
import { CallLogSkeleton } from '../../../shared/components/ui/SkeletonLoaders.jsx';

export default function CallLogsPanel({ logs = [], loading, onSelectLog, onStartCall, onClearHistory }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'missed' | 'voice' | 'video'

  const filteredLogs = logs.filter((log) => {
    const partnerName = log.partner?.name || log.partner?.username || 'Unknown User';
    const matchesSearch = partnerName.toLowerCase().includes(search.toLowerCase().replace(/^@/, ''));
    if (!matchesSearch) return false;

    if (filter === 'missed') return log.status === 'missed' || log.status === 'rejected';
    if (filter === 'voice') return log.type === 'voice';
    if (filter === 'video') return log.type === 'video';
    return true;
  });

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

  function formatDuration(sec) {
    if (!sec || sec <= 0) return '';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  return (
    <div className="call-panel">
      <div className="call-panel-header">
        <h2>Calls</h2>
        {logs.length > 0 && (
          <button className="call-clear-btn" onClick={onClearHistory} title="Clear call history">
            Clear
          </button>
        )}
      </div>

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

      {/* Filter Tabs */}
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

      {/* Call List */}
      <div className="call-list">
        {loading && <CallLogSkeleton count={5} />}

        {!loading && filteredLogs.length === 0 && (
          <div className="call-empty">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <p>No call logs found.</p>
            <span>Calls you make or receive will appear here.</span>
          </div>
        )}

        {!loading &&
          filteredLogs.map((log) => {
            const partnerName = log.partner?.name || log.partner?.username || 'Unknown User';
            const avatar = log.partner?.profileImage;
            const initial = (log.partner?.username || 'U')[0].toUpperCase();
            const timeStr = formatCardTime(log.createdAt);
            const durationStr = formatDuration(log.durationSeconds);
            const isMissed = log.status === 'missed' || log.status === 'rejected';

            return (
              <div
                key={log.id}
                className={`call-item ${isMissed ? 'call-item--missed' : ''}`}
                onClick={() => onSelectLog?.(log)}
              >
                <div className="call-avatar">
                  {avatar ? (
                    <img src={avatar} alt={partnerName} />
                  ) : (
                    <span>{initial}</span>
                  )}
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

                    {/* Quick Call Back Buttons */}
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
  );
}

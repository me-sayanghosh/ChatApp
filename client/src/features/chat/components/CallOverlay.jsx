import { useEffect, useRef } from 'react';

export default function CallOverlay({
  callState,
  callerInfo,
  localStream,
  remoteStream,
  isMuted,
  isVideoOff,
  isScreenSharing,
  onAccept,
  onReject,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (callState === 'idle') return null;

  return (
    <div className="call-overlay-container">
      {/* 1. Incoming Call Popup Card */}
      {callState === 'incoming' && (
        <div className="call-incoming-card">
          <div className="incoming-avatar-wrap">
            <div className="incoming-avatar-fallback">
              {callerInfo?.fromUsername?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="incoming-pulse-ring" />
          </div>
          <div className="incoming-info">
            <h4>Incoming {callerInfo?.isVideo ? 'Video' : 'Audio'} Call</h4>
            <p>@{callerInfo?.fromUsername || 'User'} is calling you...</p>
          </div>
          <div className="incoming-actions">
            <button className="call-btn decline" onClick={onReject} title="Decline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
              Decline
            </button>
            <button className="call-btn accept" onClick={onAccept} title="Accept">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Accept Call
            </button>
          </div>
        </div>
      )}

      {/* 2. Outgoing Call Spinner Modal */}
      {callState === 'calling' && (
        <div className="call-outgoing-card">
          <div className="outgoing-spinner" />
          <h4>Calling @{callerInfo?.fromUsername || 'User'}...</h4>
          <p>Ringing peer connection...</p>
          <button className="call-btn decline" onClick={onEndCall}>
            Cancel Call
          </button>
        </div>
      )}

      {/* 3. Connected WebRTC Active Call Grid */}
      {callState === 'connected' && (
        <div className="call-active-grid">
          {/* Main Remote View */}
          <div className="remote-video-container">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="remote-video-el"
              />
            ) : (
              <div className="audio-avatar-card">
                <div className="audio-avatar-circle">
                  {callerInfo?.fromUsername?.[0]?.toUpperCase() || 'U'}
                </div>
                <p>@{callerInfo?.fromUsername || 'User'} (Connected)</p>
              </div>
            )}

            {/* Local PIP Video View */}
            <div className="local-pip-container">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`local-pip-el ${isVideoOff ? 'video-off' : ''}`}
              />
              {isVideoOff && (
                <div className="pip-avatar-fallback">Cam Off</div>
              )}
            </div>
          </div>

          {/* Floating Call Controls Bar */}
          <div className="call-controls-bar">
            <button
              className={`control-btn ${isMuted ? 'active-red' : ''}`}
              onClick={onToggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                {isMuted && <line x1="1" y1="1" x2="23" y2="23" />}
              </svg>
              {isMuted ? 'Muted' : 'Mic'}
            </button>

            <button
              className={`control-btn ${isVideoOff ? 'active-red' : ''}`}
              onClick={onToggleVideo}
              title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                {isVideoOff && <line x1="1" y1="1" x2="23" y2="23" />}
              </svg>
              {isVideoOff ? 'Cam Off' : 'Camera'}
            </button>

            <button
              className={`control-btn ${isScreenSharing ? 'active-blue' : ''}`}
              onClick={onToggleScreenShare}
              title="Share Screen"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              {isScreenSharing ? 'Stop Share' : 'Screen'}
            </button>

            <button
              className="control-btn end-call"
              onClick={onEndCall}
              title="End Call"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
              </svg>
              End Call
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

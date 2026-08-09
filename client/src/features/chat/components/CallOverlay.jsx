import { useState, useEffect, useRef } from 'react';

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
  const containerRef = useRef(null);

  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);

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

  // Call duration timer
  useEffect(() => {
    if (callState !== 'connected') {
      setCallDuration(0);
      return;
    }
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [callState]);

  // Format seconds to MM:SS
  function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Toggle Fullscreen
  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.warn('Fullscreen error:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }

  // Toggle Remote Audio (Speaker Mute)
  function toggleSpeaker() {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !isSpeakerMuted;
      setIsSpeakerMuted(!isSpeakerMuted);
    }
  }

  if (callState === 'idle') return null;

  return (
    <div className="call-overlay-container" ref={containerRef}>
      {/* 1. Incoming Call Banner */}
      {callState === 'incoming' && (
        <div className="call-incoming-card">
          <div className="incoming-avatar-wrap">
            {callerInfo?.profileImage ? (
              <img
                src={callerInfo.profileImage}
                alt={callerInfo.fromUsername || 'User'}
                className="incoming-avatar-img"
              />
            ) : (
              <div className="incoming-avatar-fallback">
                {(callerInfo?.fromUsername || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="incoming-pulse-ring" />
          </div>
          <div className="incoming-info">
            <h4>Incoming {callerInfo?.isVideo ? 'Video' : 'Audio'} Call</h4>
            <p>{callerInfo?.fromUsername || 'User'} is calling you...</p>
          </div>
          <div className="incoming-actions">
            <button className="call-btn decline" onClick={onReject} title="Decline Call">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
              Decline
            </button>
            <button className="call-btn accept" onClick={onAccept} title="Accept Call">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Accept
            </button>
          </div>
        </div>
      )}

      {/* 2. Outgoing Call Ringing Banner */}
      {callState === 'calling' && (
        <div className="call-outgoing-card">
          <div className="outgoing-avatar-wrap">
            {callerInfo?.profileImage ? (
              <img
                src={callerInfo.profileImage}
                alt={callerInfo.fromUsername || 'User'}
                className="outgoing-avatar-img"
              />
            ) : (
              <div className="outgoing-avatar-fallback">
                {(callerInfo?.fromUsername || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="outgoing-pulse-ring" />
          </div>
          <h4>Calling {callerInfo?.fromUsername || 'User'}...</h4>
          <button className="call-btn decline big-cancel-btn" onClick={onEndCall} title="Cancel Call">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>Cancel Call</span>
          </button>
        </div>
      )}

      {/* 3. Connected Active Call Screen */}
      {callState === 'connected' && (
        !callerInfo?.isVideo ? (
          /* COMPACT CONNECTED AUDIO CALL CARD (Same size as incoming/outgoing card) */
          <div className="call-audio-connected-card">
            <audio ref={remoteVideoRef} autoPlay playsInline style={{ display: 'none' }} />

            <div className="outgoing-avatar-wrap">
              {callerInfo?.profileImage ? (
                <img
                  src={callerInfo.profileImage}
                  alt={callerInfo.fromUsername || 'User'}
                  className="outgoing-avatar-img"
                />
              ) : (
                <div className="outgoing-avatar-fallback">
                  {(callerInfo?.fromUsername || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="outgoing-pulse-ring" />
            </div>

            <h4 className="audio-card-name">{callerInfo?.fromUsername || 'User'}</h4>

            <div className="audio-card-timer-row">
              <span className="audio-live-dot" />
              <span className="audio-timer-text">{formatTime(callDuration)}</span>
            </div>

            <div className="audio-card-actions-row">
              <button
                className={`audio-card-btn ${isMuted ? 'active-red' : ''}`}
                onClick={onToggleMute}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  {isMuted && <line x1="1" y1="1" x2="23" y2="23" />}
                </svg>
              </button>

              <button
                className={`audio-card-btn ${isSpeakerMuted ? 'active-red' : ''}`}
                onClick={toggleSpeaker}
                title={isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  {isSpeakerMuted ? (
                    <line x1="23" y1="9" x2="17" y2="15" />
                  ) : (
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  )}
                </svg>
              </button>

              <button
                className="audio-card-btn end-call-btn"
                onClick={onEndCall}
                title="End Call"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          /* FULLSCREEN VIDEO CALL SCREEN */
          <div className="call-active-grid">
            {/* Top Bar Header Overlay */}
            <div className="call-top-bar">
              <div className="call-top-user">
                <div className="call-status-dot" />
                <span className="call-username">{callerInfo?.fromUsername || 'Peer'}</span>
                <span className="call-hd-tag">HD 1080p</span>
              </div>
              <div className="call-timer-badge">
                <span className="timer-icon">⏱</span>
                <span>{formatTime(callDuration)}</span>
              </div>
            </div>

            {/* Main Remote Video Container */}
            <div className="remote-video-container">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="remote-video-el"
              />

              {/* PIP Local Camera Preview */}
              <div className="local-pip-container">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`local-pip-el ${isVideoOff ? 'video-off' : ''}`}
                />
                {isVideoOff && (
                  <div className="pip-avatar-fallback">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9.5" />
                    </svg>
                    <span>Camera Off</span>
                  </div>
                )}
                <div className="pip-user-label">You</div>
              </div>
            </div>

            {/* Bottom Floating Control Dock */}
            <div className="call-controls-bar">
              {/* Microphone Toggle */}
              <button
                className={`control-btn ${isMuted ? 'active-red' : ''}`}
                onClick={onToggleMute}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  {isMuted && <line x1="1" y1="1" x2="23" y2="23" />}
                </svg>
                <span>{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              {/* Camera Toggle */}
              <button
                className={`control-btn ${isVideoOff ? 'active-red' : ''}`}
                onClick={onToggleVideo}
                title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  {isVideoOff && <line x1="1" y1="1" x2="23" y2="23" />}
                </svg>
                <span>{isVideoOff ? 'Cam On' : 'Cam Off'}</span>
              </button>

              {/* Screen Share Toggle */}
              <button
                className={`control-btn ${isScreenSharing ? 'active-blue' : ''}`}
                onClick={onToggleScreenShare}
                title={isScreenSharing ? 'Stop Sharing Screen' : 'Share Screen'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                <span>{isScreenSharing ? 'Stop Share' : 'Share'}</span>
              </button>

              {/* Speaker Mute Toggle */}
              <button
                className={`control-btn ${isSpeakerMuted ? 'active-red' : ''}`}
                onClick={toggleSpeaker}
                title={isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  {isSpeakerMuted ? (
                    <line x1="23" y1="9" x2="17" y2="15" />
                  ) : (
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  )}
                </svg>
                <span>{isSpeakerMuted ? 'Unmute Audio' : 'Audio'}</span>
              </button>

              {/* Fullscreen Toggle */}
              <button
                className={`control-btn ${isFullscreen ? 'active-blue' : ''}`}
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  {isFullscreen ? (
                    <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
                  ) : (
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  )}
                </svg>
                <span>{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
              </button>

              {/* Prominent Red END CALL Button */}
              <button
                className="control-btn end-call-main"
                onClick={onEndCall}
                title="End Call Now"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                </svg>
                <span>End Call</span>
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}

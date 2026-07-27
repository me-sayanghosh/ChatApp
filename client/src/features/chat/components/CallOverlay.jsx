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
              📞 Decline
            </button>
            <button className="call-btn accept" onClick={onAccept} title="Accept">
              📞 Accept Call
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
              {isMuted ? '🎙️ Muted' : '🎙️ Mic'}
            </button>

            <button
              className={`control-btn ${isVideoOff ? 'active-red' : ''}`}
              onClick={onToggleVideo}
              title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isVideoOff ? '📹 Cam Off' : '📹 Camera'}
            </button>

            <button
              className={`control-btn ${isScreenSharing ? 'active-blue' : ''}`}
              onClick={onToggleScreenShare}
              title="Share Screen"
            >
              🖥️ {isScreenSharing ? 'Stop Share' : 'Screen'}
            </button>

            <button
              className="control-btn end-call"
              onClick={onEndCall}
              title="End Call"
            >
              📞 End Call
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

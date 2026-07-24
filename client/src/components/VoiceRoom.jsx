import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { api } from '../api.js';

export default function VoiceRoom({ roomId, roomName, currentUser }) {
  const [room, setRoom] = useState(null);
  const [connected, setConnected] = useState(false);
  const [speaking, setSpeaking] = useState(new Set());
  const [participants, setParticipants] = useState([]);
  const [muted, setMuted] = useState(false);
  const containerRef = useRef(null);

  async function join() {
    try {
      const res = await api.post(`/rooms/${roomId}/voice-token`);
      const { token, url } = res.data;

      const lkRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      lkRoom.on(RoomEvent.Connected, () => {
        setConnected(true);
        setParticipants(Array.from(lkRoom.participants.values()));
      });

      lkRoom.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        setParticipants([]);
        setRoom(null);
      });

      lkRoom.on(RoomEvent.TrackSubscribed, (track, participant) => {
        if (track.kind === Track.Kind.Audio) {
          const el = document.createElement('audio');
          el.id = `audio-${participant.identity}`;
          el.autoplay = true;
          containerRef.current?.appendChild(el);
          track.attach(el);
        }
      });

      lkRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el) => el.remove());
      });

      lkRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const ids = new Set(speakers.map((s) => s.identity));
        setSpeaking(ids);
      });

      lkRoom.on(RoomEvent.ParticipantConnected, () => {
        setParticipants(Array.from(lkRoom.participants.values()));
      });

      lkRoom.on(RoomEvent.ParticipantDisconnected, () => {
        setParticipants(Array.from(lkRoom.participants.values()));
      });

      await lkRoom.connect(url, token);
      await lkRoom.localParticipant.setMicrophoneEnabled(true);
      setRoom(lkRoom);
    } catch (err) {
      console.error('voice join failed:', err);
    }
  }

  async function leave() {
    if (room) {
      try {
        await room.disconnect();
      } catch {}
      setRoom(null);
      setConnected(false);
      setParticipants([]);
    }
  }

  async function toggleMute() {
    if (!room) return;
    try {
      const enabled = !muted;
      await room.localParticipant.setMicrophoneEnabled(enabled);
      setMuted(!enabled);
    } catch {}
  }

  useEffect(() => {
    return () => {
      if (room) room.disconnect();
    };
  }, [room]);

  if (!connected) {
    return (
      <div className="voice-bar">
        <button className="voice-join-btn" onClick={join}>
          {'\u{1F3A4}'} Join Voice
        </button>
      </div>
    );
  }

  return (
    <div className="voice-bar connected">
      <div ref={containerRef} style={{ display: 'none' }} />
      <div className="voice-info">
        <span className="voice-icon">{'\u{1F3A4}'}</span>
        <span className="voice-status">Live ({participants.length + 1})</span>
        <div className="voice-participants">
          {participants.map((p) => (
            <span key={p.identity} className={`voice-user ${speaking.has(p.identity) ? 'speaking' : ''}`}>
              {p.name || p.identity.slice(0, 8)}
            </span>
          ))}
          <span className="voice-user speaking">{currentUser?.username} (you)</span>
        </div>
      </div>
      <div className="voice-controls">
        <button onClick={toggleMute} className={`voice-btn ${muted ? 'muted' : ''}`}>
          {muted ? '\u{1F507}' : '\u{1F3A4}'}
        </button>
        <button onClick={leave} className="voice-btn leave">
          {'\u{1F6AA}'} Leave
        </button>
      </div>
    </div>
  );
}

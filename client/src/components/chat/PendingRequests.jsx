import { useState, useEffect } from 'react';
import { api } from '../../utils/api.js';
import { getSocket } from '../../utils/socket.js';

export default function PendingRequests({ roomId, isAdmin, onRequestHandled }) {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!isAdmin || !roomId) return;
    api.get(`/rooms/${roomId}/pending-requests`)
      .then((r) => setRequests(r.data.requests || []))
      .catch(() => {});
  }, [roomId, isAdmin]);

  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();
    if (!socket) return;

    function onNewRequest({ roomId: rid, user, requestedAt }) {
      if (rid === roomId) {
        setRequests((prev) => {
          if (prev.some((r) => r.user === user.id)) return prev;
          return [...prev, { user: user.id, username: user.username, requestedAt }];
        });
      }
    }

    socket.on('room:new-request', onNewRequest);
    return () => { socket.off('room:new-request', onNewRequest); };
  }, [roomId]);

  function grant(userId) {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('room:grant-join', { roomId, userId }, (resp) => {
      if (resp?.ok) {
        setRequests((prev) => prev.filter((r) => r.user !== userId));
        onRequestHandled?.();
      }
    });
  }

  function deny(userId) {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('room:deny-join', { roomId, userId }, (resp) => {
      if (resp?.ok) {
        setRequests((prev) => prev.filter((r) => r.user !== userId));
      }
    });
  }

  if (!isAdmin || requests.length === 0) return null;

  return (
    <div className="pending-requests">
      <div className="pending-header">
        <span className="pending-title">Join Requests ({requests.length})</span>
      </div>
      <ul className="pending-list">
        {requests.map((r) => (
          <li key={r.user} className="pending-item">
            <span className="pending-user">{r.username}</span>
            <span className="pending-time">{new Date(r.requestedAt).toLocaleTimeString()}</span>
            <div className="pending-actions">
              <button className="grant-btn" onClick={() => grant(r.user)} title="Grant access">
                Grant
              </button>
              <button className="deny-btn" onClick={() => deny(r.user)} title="Deny access">
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

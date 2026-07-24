import { io } from 'socket.io-client';
import { API_BASE, getAccessToken, getRefreshToken, setTokens } from './api.js';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';
const OFFLINE_QUEUE_KEY = 'chatapp:offlineQueue';

let socket = null;

function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function setOfflineQueue(queue) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

function enqueueOffline(event, data) {
  const queue = getOfflineQueue();
  queue.push({ event, data, timestamp: Date.now() });
  setOfflineQueue(queue);
}

function flushOfflineQueue() {
  if (!socket || !socket.connected) return;
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  const sorted = queue.sort((a, b) => a.timestamp - b.timestamp);
  for (const item of sorted) {
    socket.emit(item.event, item.data, (resp) => {
      if (!resp?.ok) console.warn('offline queue send failed:', item.event, resp?.error);
    });
  }
  setOfflineQueue([]);
}

export function sendOffline(event, data) {
  if (socket && socket.connected) {
    socket.emit(event, data, (resp) => {
      if (!resp?.ok) {
        console.warn('send failed, queuing offline:', event, resp?.error);
        enqueueOffline(event, data);
      }
    });
  } else {
    enqueueOffline(event, data);
  }
}

export function connectSocket(accessToken) {
  if (socket && socket.auth?.token === accessToken) {
    if (socket.connected || socket.connecting) return socket;
  }
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = io(SERVER_URL, {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    flushOfflineQueue();
  });

  socket.on('connect_error', async (err) => {
    if (err.message === 'unauthorized' || err.message === 'user not found') {
      socket.disconnect();
      const refreshToken = getRefreshToken();
      if (!refreshToken) return;
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) throw new Error('refresh failed');
        const data = await res.json();
        setTokens(data.accessToken, data.refreshToken);
        socket.auth.token = data.accessToken;
        socket.connect();
      } catch {
        socket.disconnect();
      }
    }
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

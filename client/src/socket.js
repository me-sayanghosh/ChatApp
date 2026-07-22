import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

let socket = null;

export function connectSocket(token) {
  if (socket && socket.connected) return socket;
  if (socket) socket.disconnect();
  socket = io(SERVER_URL, { auth: { token }, transports: ['websocket', 'polling'] });
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

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  OFFLINE_QUEUE: 'chatapp:offlineQueue',
  LAST_SEEN: 'chatapp:lastSeen',
  RSA_KEYS: 'chatapp:userRsaKeys',
  ROOM_KEYS: 'chatapp:roomKeys',
};

export const ROOM_TYPES = ['public', 'private', 'ephemeral'];

export const TYPING_TIMEOUT_MS = 3000;

export const MESSAGE_LIMITS = {
  default: 100,
  max: 500,
};

export const ROTATING_WORDS = ['boundaries.', 'limits.', 'borders.', 'delays.'];

export const ROLE_HIERARCHY = { owner: 3, moderator: 2, member: 1 };
export const ROOM_TYPES = ['public', 'private', 'ephemeral'];
export const ROLES = ['owner', 'moderator', 'member'];
export const DEFAULT_ROOMS = [
  { name: 'general', type: 'public' },
  { name: 'random', type: 'public' },
  { name: 'lounge', type: 'public' },
];

export const RATE_LIMITS = {
  message: { windowMs: 60000, max: 30 },
  auth: { windowMs: 900000, max: 20 },
};

export const CORS_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

export const TOKEN_EXPIRY = {
  access: process.env.ACCESS_TOKEN_EXPIRY || '15m',
  refresh: process.env.REFRESH_TOKEN_EXPIRY || '7d',
};

export const PRESENCE = {
  HEARTBEAT_TTL_MS: 60000,
  HEARTBEAT_REFRESH_MS: 30000,
  RECONCILE_INTERVAL_MS: 90000,
};

export const TYPING_TTL_MS = 3000;

export const MESSAGE_LIMITS = {
  default: 100,
  max: 500,
  backfillMax: 20,
  threadMax: 100,
};

export const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;

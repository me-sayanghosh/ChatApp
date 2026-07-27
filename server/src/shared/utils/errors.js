export function parseExpiry(str) {
  const match = str.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return val * multipliers[unit];
}

export function escapeRegex(str) {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export function generateKeyId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function generateAutoUsername() {
  return `user_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

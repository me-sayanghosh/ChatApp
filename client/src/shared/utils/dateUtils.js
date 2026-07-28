/**
 * Format badge counts according to app rules:
 * - If count <= 0 or all seen: return null (don't show any badge)
 * - If count > 5: return '5+'
 * - Otherwise: return exact count (1 to 5)
 */
export function formatBadgeCount(count) {
  if (!count || count <= 0) return null;
  return count > 5 ? '5+' : count;
}

/**
 * Format date for message separators:
 * - Today
 * - Yesterday
 * - Full date for older messages (e.g. "July 26, 2026")
 */
export function formatDateSeparator(dateInput) {
  if (!dateInput) return 'Today';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Today';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (msgDate.getTime() === today.getTime()) {
    return 'Today';
  }
  if (msgDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }
  return d.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

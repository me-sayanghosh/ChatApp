import redis from '../../shared/config/redis.js';

export async function setLastRead(roomId, userId, messageId) {
  const key = `readreceipt:${roomId}:${userId}`;
  const data = JSON.stringify({ messageId, timestamp: Date.now() });
  await redis.set(key, data);
}

export async function getLastRead(roomId, userId) {
  const key = `readreceipt:${roomId}:${userId}`;
  const raw = await redis.get(key);
  return raw ? JSON.parse(raw) : null;
}

export async function getReadReceiptsForRoom(roomId) {
  const pattern = `readreceipt:${roomId}:*`;
  const keys = [];
  let cursor = '0';
  do {
    const [nextCursor, found] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    keys.push(...found);
  } while (cursor !== '0');

  const result = {};
  for (const key of keys) {
    const userId = key.split(':').pop();
    const raw = await redis.get(key);
    if (raw) {
      result[userId] = JSON.parse(raw);
    }
  }
  return result;
}

export async function removeReadReceiptsForRoom(roomId) {
  const pattern = `readreceipt:${roomId}:*`;
  const keys = [];
  let cursor = '0';
  do {
    const [nextCursor, found] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    keys.push(...found);
  } while (cursor !== '0');

  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

import redis from '../config/redis.js';

const PRESENCE_KEY = 'presence';
const ONLINE_SET = 'presence:online';
const CONN_COUNT_KEY = 'presence:connCount';
const HEARTBEAT_TTL_MS = 60000;
const HEARTBEAT_REFRESH_MS = 30000;

export async function setPresence(userId, { status = 'online', currentRoom = null }) {
  const data = { status, currentRoom, lastSeen: Date.now() };
  await redis.hset(PRESENCE_KEY, userId, JSON.stringify(data));
  if (status === 'online') {
    await redis.sadd(ONLINE_SET, userId);
  } else {
    await redis.srem(ONLINE_SET, userId);
  }
}

export async function incrementPresence(userId, socketId) {
  const hbKey = `presence:heartbeat:${userId}:${socketId}`;
  await redis.set(hbKey, '1', 'PX', HEARTBEAT_TTL_MS);

  const count = await redis.incr(`${CONN_COUNT_KEY}:${userId}`);
  if (count === 1) {
    const data = { status: 'online', currentRoom: null, lastSeen: Date.now() };
    await redis.hset(PRESENCE_KEY, userId, JSON.stringify(data));
    await redis.sadd(ONLINE_SET, userId);
  }
  return count;
}

export function startHeartbeat(userId, socketId) {
  const hbKey = `presence:heartbeat:${userId}:${socketId}`;
  const interval = setInterval(async () => {
    try {
      await redis.set(hbKey, '1', 'PX', HEARTBEAT_TTL_MS);
    } catch {
      // ignore heartbeat errors
    }
  }, HEARTBEAT_REFRESH_MS);
  return interval;
}

export async function decrementPresence(userId, socketId) {
  if (socketId) {
    const hbKey = `presence:heartbeat:${userId}:${socketId}`;
    await redis.del(hbKey);
  }

  const count = await redis.decr(`${CONN_COUNT_KEY}:${userId}`);
  if (count <= 0) {
    await redis.del(`${CONN_COUNT_KEY}:${userId}`);
    const raw = await redis.hget(PRESENCE_KEY, userId);
    if (raw) {
      const data = JSON.parse(raw);
      data.status = 'offline';
      data.lastSeen = Date.now();
      data.currentRoom = null;
      await redis.hset(PRESENCE_KEY, userId, JSON.stringify(data));
    }
    await redis.srem(ONLINE_SET, userId);
    return 0;
  }
  return count;
}

export async function reconcilePresence() {
  const onlineIds = await redis.smembers(ONLINE_SET);
  if (onlineIds.length === 0) return;

  for (const userId of onlineIds) {
    const pattern = `presence:heartbeat:${userId}:*`;
    let cursor = '0';
    let hasLiveHeartbeat = false;

    do {
      const [nextCursor, found] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 50);
      cursor = nextCursor;
      if (found.length > 0) {
        hasLiveHeartbeat = true;
        break;
      }
    } while (cursor !== '0');

    if (!hasLiveHeartbeat) {
      const data = await getPresence(userId);
      if (data && data.status === 'online') {
        data.status = 'offline';
        data.lastSeen = Date.now();
        data.currentRoom = null;
        await redis.hset(PRESENCE_KEY, userId, JSON.stringify(data));
        await redis.srem(ONLINE_SET, userId);
        await redis.del(`${CONN_COUNT_KEY}:${userId}`);
      }
    }
  }
}

export async function getPresence(userId) {
  const raw = await redis.hget(PRESENCE_KEY, userId);
  return raw ? JSON.parse(raw) : null;
}

export async function removePresence(userId) {
  await redis.del(`${CONN_COUNT_KEY}:${userId}`);
  const data = await getPresence(userId);
  if (data) {
    data.status = 'offline';
    data.lastSeen = Date.now();
    await redis.hset(PRESENCE_KEY, userId, JSON.stringify(data));
  }
  await redis.srem(ONLINE_SET, userId);
}

export async function getOnlineUserIds() {
  return redis.smembers(ONLINE_SET);
}

export async function getPresenceMap() {
  const onlineIds = await redis.smembers(ONLINE_SET);
  if (onlineIds.length === 0) return {};

  const raw = await redis.hmget(PRESENCE_KEY, ...onlineIds);
  const map = {};
  for (let i = 0; i < onlineIds.length; i++) {
    if (raw[i]) {
      map[onlineIds[i]] = JSON.parse(raw[i]);
    }
  }
  return map;
}

export async function setUserCurrentRoom(userId, roomId) {
  const data = await getPresence(userId);
  if (data) {
    data.currentRoom = roomId;
    data.lastSeen = Date.now();
    await redis.hset(PRESENCE_KEY, userId, JSON.stringify(data));
  }
}

export async function clearUserCurrentRoom(userId) {
  const data = await getPresence(userId);
  if (data) {
    data.currentRoom = null;
    data.lastSeen = Date.now();
    await redis.hset(PRESENCE_KEY, userId, JSON.stringify(data));
  }
}

export async function setTyping(roomId, userId, ttlMs = 3000) {
  const key = `typing:${roomId}:${userId}`;
  await redis.set(key, '1', 'PX', ttlMs);
}

export async function getTypingUsers(roomId) {
  const pattern = `typing:${roomId}:*`;
  const keys = [];
  let cursor = '0';
  do {
    const [nextCursor, found] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    keys.push(...found);
  } while (cursor !== '0');

  return keys.map((k) => k.split(':').pop());
}

export async function removeTyping(roomId, userId) {
  await redis.del(`typing:${roomId}:${userId}`);
}

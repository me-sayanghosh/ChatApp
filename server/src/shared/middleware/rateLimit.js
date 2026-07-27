import redis from '../config/redis.js';

export function rateLimit({ windowMs = 60000, max = 30, action = 'default' } = {}) {
  return async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) return next();

    const key = `ratelimit:${action}:${userId}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      const multi = redis.multi();
      multi.zremrangebyscore(key, 0, windowStart);
      multi.zadd(key, now, `${now}:${Math.random()}`);
      multi.zcard(key);
      multi.pexpire(key, windowMs);
      const results = await multi.exec();
      const count = results[2][1];

      res.set('X-RateLimit-Limit', String(max));
      res.set('X-RateLimit-Remaining', String(Math.max(0, max - count)));
      res.set('X-RateLimit-Reset', String(Math.ceil((now + windowMs) / 1000)));

      if (count > max) {
        const retryAfter = Math.ceil(windowMs / 1000);
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({ error: 'too many requests, try again later' });
      }
    } catch (err) {
      console.error('[ratelimit] redis error:', err.message);
    }

    next();
  };
}

export async function checkSocketRateLimit(userId, action, { windowMs = 60000, max = 30 } = {}) {
  const key = `ratelimit:socket:${action}:${userId}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    const multi = redis.multi();
    multi.zremrangebyscore(key, 0, windowStart);
    multi.zadd(key, now, `${now}:${Math.random()}`);
    multi.zcard(key);
    multi.pexpire(key, windowMs);
    const results = await multi.exec();
    const count = results[2][1];
    return count <= max;
  } catch (err) {
    console.error('[ratelimit] redis error:', err.message);
    return true;
  }
}

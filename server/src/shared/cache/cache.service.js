/**
 * High-performance Server-Side In-Memory Cache with TTL & Invalidation
 */
class CacheService {
  constructor() {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0, keys: 0 };
  }

  /**
   * Set a key in cache with TTL in seconds (default 5 minutes)
   */
  set(key, value, ttlSeconds = 300) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
    this.stats.keys = this.cache.size;
  }

  /**
   * Get a key from cache, returns null if expired or missing
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.keys = this.cache.size;
      return null;
    }

    this.stats.hits++;
    return item.value;
  }

  /**
   * Delete a key or pattern from cache
   */
  delete(keyPattern) {
    if (typeof keyPattern === 'string' && !keyPattern.includes('*')) {
      this.cache.delete(keyPattern);
    } else if (typeof keyPattern === 'string') {
      const regex = new RegExp('^' + keyPattern.replace(/\*/g, '.*') + '$');
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    }
    this.stats.keys = this.cache.size;
  }

  /**
   * Clear all cached items
   */
  clear() {
    this.cache.clear();
    this.stats.keys = 0;
  }

  /**
   * Return current cache status summary
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
    };
  }
}

export const cacheService = new CacheService();

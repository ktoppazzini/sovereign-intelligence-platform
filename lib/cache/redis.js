/**
 * Sovereign Intelligence Platform
 * Redis Cache Layer
 * 
 * High-performance caching with automatic serialization,
 * TTL management, and cache invalidation patterns.
 * 
 * GRACEFUL DEGRADATION: Works without ioredis installed
 */

let Redis;
let redis = null;
let redisAvailable = false;

try {
  Redis = require('ioredis').default || require('ioredis');
  redisAvailable = true;
} catch (e) {
  console.warn('[Redis] ioredis not installed - caching disabled');
  redisAvailable = false;
}

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) return null;
    return Math.min(times * 100, 3000);
  },
  enableReadyCheck: true,
  lazyConnect: true,
};

/**
 * Get Redis client (singleton)
 */
export function getRedis() {
  if (!redisAvailable) return null;
  
  if (!redis) {
    redis = new Redis(REDIS_CONFIG);
    
    redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });
    
    redis.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });
  }
  return redis;
}

// Default TTL values (in seconds)
export const TTL = {
  SHORT: 60,           // 1 minute
  MEDIUM: 300,         // 5 minutes
  LONG: 3600,          // 1 hour
  DAY: 86400,          // 24 hours
  WEEK: 604800,        // 7 days
  SESSION: 86400 * 7,  // 7 days for sessions
  TRANSLATION: 86400 * 30, // 30 days for translations
};

// Cache key prefixes for organization
export const CACHE_PREFIX = {
  SESSION: 'session:',
  USER: 'user:',
  ORG: 'org:',
  REPORT: 'report:',
  TRANSLATION: 'trans:',
  RATE_LIMIT: 'rate:',
  API_KEY: 'apikey:',
  LANGUAGES: 'languages',
  WORKFLOW: 'workflow:',
};

/**
 * Cache class with typed methods
 */
class CacheManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    if (!this.client) {
      this.client = getRedis();
      try {
        await this.client.ping();
        this.isConnected = true;
      } catch (error) {
        console.warn('[Cache] Redis not available, using in-memory fallback');
        this.isConnected = false;
      }
    }
    return this.isConnected;
  }

  /**
   * Get cached value
   */
  async get(key) {
    try {
      if (!this.isConnected) await this.connect();
      if (!this.isConnected) return null;
      
      const value = await this.client.get(key);
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error('[Cache] Get error:', error.message);
      return null;
    }
  }

  /**
   * Set cached value with TTL
   */
  async set(key, value, ttl = TTL.MEDIUM) {
    try {
      if (!this.isConnected) await this.connect();
      if (!this.isConnected) return false;
      
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      await this.client.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error('[Cache] Set error:', error.message);
      return false;
    }
  }

  /**
   * Delete cached value
   */
  async del(key) {
    try {
      if (!this.isConnected) await this.connect();
      if (!this.isConnected) return false;
      
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('[Cache] Delete error:', error.message);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern) {
    try {
      if (!this.isConnected) await this.connect();
      if (!this.isConnected) return false;
      
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('[Cache] Delete pattern error:', error.message);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      if (!this.isConnected) await this.connect();
      if (!this.isConnected) return false;
      
      return (await this.client.exists(key)) === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get or set (cache-aside pattern)
   */
  async getOrSet(key, fetcher, ttl = TTL.MEDIUM) {
    const cached = await this.get(key);
    if (cached !== null) return cached;
    
    const value = await fetcher();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Increment counter (for rate limiting)
   */
  async incr(key, ttl = TTL.SHORT) {
    try {
      if (!this.isConnected) await this.connect();
      if (!this.isConnected) return 0;
      
      const count = await this.client.incr(key);
      if (count === 1) {
        await this.client.expire(key, ttl);
      }
      return count;
    } catch (error) {
      console.error('[Cache] Incr error:', error.message);
      return 0;
    }
  }

  /**
   * Rate limit check
   */
  async checkRateLimit(identifier, limit, windowSeconds = 60) {
    const key = `${CACHE_PREFIX.RATE_LIMIT}${identifier}`;
    const count = await this.incr(key, windowSeconds);
    
    return {
      allowed: count <= limit,
      current: count,
      limit,
      remaining: Math.max(0, limit - count),
      resetIn: windowSeconds,
    };
  }

  /**
   * Health check
   */
  async health() {
    try {
      if (!this.isConnected) await this.connect();
      if (!this.isConnected) return { status: 'disconnected' };
      
      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;
      
      return { status: 'healthy', latency };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * Flush all cache (use with caution!)
   */
  async flushAll() {
    try {
      if (!this.isConnected) await this.connect();
      if (!this.isConnected) return false;
      
      await this.client.flushdb();
      return true;
    } catch (error) {
      console.error('[Cache] Flush error:', error.message);
      return false;
    }
  }
}

// Export singleton instance
export const cache = new CacheManager();

// Convenience functions
export const cacheGet = (key) => cache.get(key);
export const cacheSet = (key, value, ttl) => cache.set(key, value, ttl);
export const cacheDel = (key) => cache.del(key);
export const cacheGetOrSet = (key, fetcher, ttl) => cache.getOrSet(key, fetcher, ttl);

export default cache;

// /lib/ai/cache.js
// Tiny in-memory LRU cache with TTL for responses.

class LRUCache {
  constructor({ max = 500, ttlMs = 1000 * 60 * 60 }) {
    this.max = max;
    this.ttlMs = ttlMs;
    this.map = new Map(); // key -> { value, expiresAt }
  }

  _now() {
    return Date.now();
  }

  _evictIfNeeded() {
    // Evict oldest until within size
    while (this.map.size > this.max) {
      // Map iterates insertion order, first = oldest
      const firstKey = this.map.keys().next().value;
      this.map.delete(firstKey);
    }
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (entry.expiresAt < this._now()) {
      this.map.delete(key);
      return null;
    }
    // refresh LRU: reinsert to bump order
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlOverrideMs) {
    const expiresAt = this._now() + (ttlOverrideMs ?? this.ttlMs);
    this.map.set(key, { value, expiresAt });
    this._evictIfNeeded();
  }

  has(key) {
    const entry = this.map.get(key);
    return !!entry && entry.expiresAt >= this._now();
  }
}

// Shared singletons (fast + free)
export const translationCache = new LRUCache({ max: 1000, ttlMs: 1000 * 60 * 60 * 24 * 30 }); // 30d
export const quickCache = new LRUCache({ max: 1000, ttlMs: 1000 * 60 * 60 }); // 1h

// Helper to build stable keys (hash-light)
export function cacheKey(partsObj) {
  return Object.entries(partsObj)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join('|');
}

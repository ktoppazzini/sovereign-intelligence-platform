// lib/enterprise/rateLimiter.js
// [KT:RATE-LIMITER-v1.0] Enterprise Rate Limiting & Quota Management
// Token bucket + sliding window algorithms for precise rate control
// Supports per-user, per-organization, per-endpoint, and per-API-key limits

const TAG = '[ENTERPRISE:RATE-LIMITER]';

// ============================================================================
// In-Memory Store (Replace with Redis in production)
// ============================================================================
const store = new Map();

// ============================================================================
// Rate Limit Configurations
// ============================================================================
export const RATE_LIMIT_PRESETS = {
  // Authentication endpoints - strict limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    blockDuration: 30 * 60 * 1000, // 30 minutes
    message: 'Too many authentication attempts. Please try again later.',
  },
  
  // Password reset - very strict
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    blockDuration: 24 * 60 * 60 * 1000, // 24 hours
    message: 'Too many password reset requests. Please wait 24 hours.',
  },
  
  // Standard API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    blockDuration: 60 * 1000, // 1 minute
    message: 'Rate limit exceeded. Please slow down your requests.',
  },
  
  // AI/Report generation - expensive operations
  aiGeneration: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    blockDuration: 60 * 1000, // 1 minute
    message: 'AI generation rate limit exceeded. Please wait a moment.',
  },
  
  // Bulk operations
  bulk: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    blockDuration: 60 * 60 * 1000, // 1 hour
    message: 'Bulk operation limit exceeded. Please try again later.',
  },
  
  // Export operations
  export: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    blockDuration: 60 * 1000, // 1 minute
    message: 'Export rate limit exceeded. Please wait before exporting again.',
  },
  
  // Webhooks - generous limits
  webhook: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    blockDuration: 60 * 1000,
    message: 'Webhook rate limit exceeded.',
  },
};

// ============================================================================
// Tier-based Rate Multipliers
// ============================================================================
export const TIER_MULTIPLIERS = {
  free: 1,
  starter: 2,
  professional: 5,
  enterprise: 20,
  government: 50,
};

// ============================================================================
// Token Bucket Implementation
// ============================================================================

/**
 * Token bucket rate limiter
 * Allows burst traffic while maintaining average rate
 */
class TokenBucket {
  constructor(capacity, refillRate, refillInterval) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;
    this.refillInterval = refillInterval;
    this.lastRefill = Date.now();
  }
  
  refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = Math.floor(elapsed / this.refillInterval) * this.refillRate;
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
  
  consume(tokens = 1) {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return {
        allowed: true,
        remaining: this.tokens,
        resetAt: this.lastRefill + this.refillInterval,
      };
    }
    
    return {
      allowed: false,
      remaining: 0,
      resetAt: this.lastRefill + this.refillInterval,
      retryAfter: Math.ceil((tokens - this.tokens) / this.refillRate * this.refillInterval / 1000),
    };
  }
}

// ============================================================================
// Sliding Window Rate Limiter
// ============================================================================

/**
 * Sliding window log rate limiter
 * More accurate than fixed window, prevents burst at window boundaries
 */
class SlidingWindowLimiter {
  constructor(windowMs, maxRequests) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = [];
  }
  
  isAllowed() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Remove old requests outside window
    this.requests = this.requests.filter(timestamp => timestamp > windowStart);
    
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return {
        allowed: true,
        remaining: this.maxRequests - this.requests.length,
        resetAt: this.requests[0] + this.windowMs,
      };
    }
    
    return {
      allowed: false,
      remaining: 0,
      resetAt: this.requests[0] + this.windowMs,
      retryAfter: Math.ceil((this.requests[0] + this.windowMs - now) / 1000),
    };
  }
}

// ============================================================================
// Rate Limiter Factory
// ============================================================================

/**
 * Get or create rate limiter for a key
 */
function getRateLimiter(key, config) {
  if (!store.has(key)) {
    store.set(key, new SlidingWindowLimiter(config.windowMs, config.maxRequests));
  }
  return store.get(key);
}

/**
 * Get blocked status for a key
 */
function getBlockedStatus(key) {
  const blockKey = `blocked:${key}`;
  const blocked = store.get(blockKey);
  
  if (blocked && blocked.until > Date.now()) {
    return blocked;
  }
  
  if (blocked) {
    store.delete(blockKey);
  }
  
  return null;
}

/**
 * Block a key
 */
function blockKey(key, duration, reason) {
  const blockKey = `blocked:${key}`;
  store.set(blockKey, {
    until: Date.now() + duration,
    reason,
    blockedAt: Date.now(),
  });
}

// ============================================================================
// Main Rate Limiting Functions
// ============================================================================

/**
 * Check rate limit for a request
 */
export async function checkRateLimit({
  identifier, // user ID, IP, API key, etc.
  endpoint,
  preset = 'api',
  tier = 'free',
  cost = 1, // Some operations cost more tokens
}) {
  const config = RATE_LIMIT_PRESETS[preset] || RATE_LIMIT_PRESETS.api;
  const multiplier = TIER_MULTIPLIERS[tier] || 1;
  
  const effectiveLimit = Math.floor(config.maxRequests * multiplier);
  const effectiveConfig = { ...config, maxRequests: effectiveLimit };
  
  // Generate unique key
  const key = `${identifier}:${endpoint}:${preset}`;
  
  // Check if blocked
  const blocked = getBlockedStatus(key);
  if (blocked) {
    console.warn(TAG, 'request.blocked', { key, until: new Date(blocked.until).toISOString() });
    return {
      allowed: false,
      blocked: true,
      reason: blocked.reason,
      retryAfter: Math.ceil((blocked.until - Date.now()) / 1000),
      headers: {
        'X-RateLimit-Limit': effectiveLimit,
        'X-RateLimit-Remaining': 0,
        'X-RateLimit-Reset': Math.ceil(blocked.until / 1000),
        'Retry-After': Math.ceil((blocked.until - Date.now()) / 1000),
      },
    };
  }
  
  // Get rate limiter
  const limiter = getRateLimiter(key, effectiveConfig);
  const result = limiter.isAllowed();
  
  // Track consecutive violations for blocking
  if (!result.allowed) {
    const violationKey = `violations:${key}`;
    const violations = (store.get(violationKey) || 0) + 1;
    store.set(violationKey, violations);
    
    // Block after 5 consecutive violations
    if (violations >= 5) {
      blockKey(key, effectiveConfig.blockDuration, 'Repeated rate limit violations');
      store.delete(violationKey);
      console.warn(TAG, 'key.blocked', { key, violations });
    }
  } else {
    // Reset violations on successful request
    store.delete(`violations:${key}`);
  }
  
  return {
    allowed: result.allowed,
    blocked: false,
    remaining: result.remaining,
    resetAt: result.resetAt,
    retryAfter: result.retryAfter,
    limit: effectiveLimit,
    headers: {
      'X-RateLimit-Limit': effectiveLimit,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000),
      ...(result.retryAfter ? { 'Retry-After': result.retryAfter } : {}),
    },
    message: result.allowed ? null : effectiveConfig.message,
  };
}

/**
 * Create rate limit middleware for Next.js API routes
 */
export function createRateLimitMiddleware(options = {}) {
  const {
    preset = 'api',
    identifierFn = (req) => req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anonymous',
    tierFn = () => 'free',
    onLimit = null,
  } = options;
  
  return async function rateLimitMiddleware(req) {
    const identifier = typeof identifierFn === 'function' ? identifierFn(req) : identifierFn;
    const tier = typeof tierFn === 'function' ? await tierFn(req) : tierFn;
    const endpoint = req.url || 'unknown';
    
    const result = await checkRateLimit({
      identifier,
      endpoint,
      preset,
      tier,
    });
    
    if (!result.allowed && onLimit) {
      await onLimit(req, result);
    }
    
    return result;
  };
}

// ============================================================================
// Quota Management
// ============================================================================

export const QUOTA_TYPES = {
  reports_monthly: { name: 'Monthly Reports', resetPeriod: 'monthly' },
  api_calls_monthly: { name: 'Monthly API Calls', resetPeriod: 'monthly' },
  storage_bytes: { name: 'Storage', resetPeriod: 'never' },
  ai_tokens_monthly: { name: 'AI Tokens', resetPeriod: 'monthly' },
  exports_daily: { name: 'Daily Exports', resetPeriod: 'daily' },
  team_members: { name: 'Team Members', resetPeriod: 'never' },
  teams: { name: 'Teams', resetPeriod: 'never' },
  integrations: { name: 'Integrations', resetPeriod: 'never' },
};

/**
 * Check quota for an organization
 */
export async function checkQuota({
  organizationId,
  quotaType,
  currentUsage,
  limit,
  increment = 1,
}) {
  const quota = QUOTA_TYPES[quotaType];
  if (!quota) {
    return { allowed: true, reason: 'Unknown quota type' };
  }
  
  // Unlimited (-1)
  if (limit === -1) {
    return {
      allowed: true,
      unlimited: true,
      usage: currentUsage,
      limit: -1,
      percentage: 0,
    };
  }
  
  const newUsage = currentUsage + increment;
  const allowed = newUsage <= limit;
  const percentage = Math.round((currentUsage / limit) * 100);
  
  // Warning thresholds
  const warnings = [];
  if (percentage >= 90) {
    warnings.push({ level: 'critical', message: `${quota.name} quota at ${percentage}%` });
  } else if (percentage >= 75) {
    warnings.push({ level: 'warning', message: `${quota.name} quota at ${percentage}%` });
  } else if (percentage >= 50) {
    warnings.push({ level: 'info', message: `${quota.name} quota at ${percentage}%` });
  }
  
  return {
    allowed,
    quotaType,
    quotaName: quota.name,
    usage: currentUsage,
    limit,
    remaining: Math.max(0, limit - currentUsage),
    percentage,
    warnings,
    wouldExceed: newUsage,
    message: allowed ? null : `${quota.name} limit exceeded (${currentUsage}/${limit})`,
  };
}

/**
 * Track quota usage
 */
export async function trackQuotaUsage({
  organizationId,
  quotaType,
  amount = 1,
  metadata = {},
}) {
  const key = `quota:${organizationId}:${quotaType}`;
  const current = store.get(key) || { usage: 0, periodStart: Date.now() };
  
  // Check if period should reset
  const quota = QUOTA_TYPES[quotaType];
  if (quota?.resetPeriod !== 'never') {
    const now = new Date();
    const periodStart = new Date(current.periodStart);
    
    let shouldReset = false;
    if (quota.resetPeriod === 'daily' && now.getDate() !== periodStart.getDate()) {
      shouldReset = true;
    } else if (quota.resetPeriod === 'monthly' && now.getMonth() !== periodStart.getMonth()) {
      shouldReset = true;
    }
    
    if (shouldReset) {
      current.usage = 0;
      current.periodStart = Date.now();
    }
  }
  
  current.usage += amount;
  current.lastUpdated = Date.now();
  
  store.set(key, current);
  
  return {
    quotaType,
    usage: current.usage,
    periodStart: current.periodStart,
    tracked: amount,
  };
}

/**
 * Get current quota usage
 */
export function getQuotaUsage(organizationId, quotaType) {
  const key = `quota:${organizationId}:${quotaType}`;
  return store.get(key) || { usage: 0, periodStart: Date.now() };
}

// ============================================================================
// IP-based Protection
// ============================================================================

const suspiciousIPs = new Map();

/**
 * Track suspicious IP activity
 */
export function trackSuspiciousActivity(ip, reason) {
  const current = suspiciousIPs.get(ip) || { score: 0, incidents: [] };
  
  current.score += 1;
  current.incidents.push({
    reason,
    timestamp: Date.now(),
  });
  
  // Keep only last 100 incidents
  if (current.incidents.length > 100) {
    current.incidents = current.incidents.slice(-100);
  }
  
  suspiciousIPs.set(ip, current);
  
  // Auto-block if score too high
  if (current.score >= 10) {
    blockKey(`ip:${ip}`, 24 * 60 * 60 * 1000, 'Suspicious activity detected');
    return { blocked: true, score: current.score };
  }
  
  return { blocked: false, score: current.score };
}

/**
 * Check if IP is suspicious
 */
export function isIPSuspicious(ip) {
  const current = suspiciousIPs.get(ip);
  if (!current) return { suspicious: false, score: 0 };
  
  return {
    suspicious: current.score >= 5,
    score: current.score,
    incidents: current.incidents.slice(-10),
  };
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Clean up expired entries (run periodically)
 */
export function cleanup() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, value] of store.entries()) {
    // Clean up blocked entries
    if (key.startsWith('blocked:') && value.until < now) {
      store.delete(key);
      cleaned++;
    }
    
    // Clean up old violation counts
    if (key.startsWith('violations:')) {
      store.delete(key);
      cleaned++;
    }
  }
  
  // Clean up old suspicious IP entries
  for (const [ip, data] of suspiciousIPs.entries()) {
    // Decay score over time
    const oldestIncident = data.incidents[0]?.timestamp || 0;
    if (now - oldestIncident > 24 * 60 * 60 * 1000) {
      data.score = Math.max(0, data.score - 1);
      data.incidents = data.incidents.filter(i => now - i.timestamp < 24 * 60 * 60 * 1000);
      
      if (data.score === 0) {
        suspiciousIPs.delete(ip);
        cleaned++;
      }
    }
  }
  
  console.log(TAG, 'cleanup.complete', { cleaned });
  return { cleaned };
}

// Run cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanup, 60 * 60 * 1000);
}

export default {
  RATE_LIMIT_PRESETS,
  TIER_MULTIPLIERS,
  QUOTA_TYPES,
  checkRateLimit,
  createRateLimitMiddleware,
  checkQuota,
  trackQuotaUsage,
  getQuotaUsage,
  trackSuspiciousActivity,
  isIPSuspicious,
  cleanup,
};

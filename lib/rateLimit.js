/**
 * Enterprise Rate Limiting System for Sovereign Intelligence
 * Supports tiered limits by user plan, IP-based limits, and API key limits
 * Created: December 25, 2025
 */

// In-memory store (use Redis in production for distributed rate limiting)
const rateLimitStore = new Map();

// Rate limit configurations by tier
export const RATE_LIMITS = {
  // Anonymous/Free users
  free: {
    requests: 20,
    windowMs: 60 * 1000, // 1 minute
    reportGeneration: 3,
    reportWindowMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  // Starter plan
  starter: {
    requests: 100,
    windowMs: 60 * 1000,
    reportGeneration: 25,
    reportWindowMs: 24 * 60 * 60 * 1000,
  },
  // Professional plan
  professional: {
    requests: 500,
    windowMs: 60 * 1000,
    reportGeneration: 100,
    reportWindowMs: 24 * 60 * 60 * 1000,
  },
  // Enterprise plan
  enterprise: {
    requests: 2000,
    windowMs: 60 * 1000,
    reportGeneration: 500,
    reportWindowMs: 24 * 60 * 60 * 1000,
  },
  // Government/unlimited
  government: {
    requests: 10000,
    windowMs: 60 * 1000,
    reportGeneration: 10000,
    reportWindowMs: 24 * 60 * 60 * 1000,
  },
};

// Endpoint-specific limits (overrides tier limits)
export const ENDPOINT_LIMITS = {
  '/api/reform/generate': { requests: 10, windowMs: 60 * 1000 },
  '/api/enterprise/generate-full-report': { requests: 5, windowMs: 60 * 1000 },
  '/api/clinical/generate': { requests: 10, windowMs: 60 * 1000 },
  '/api/defense/generate': { requests: 10, windowMs: 60 * 1000 },
  '/api/translate': { requests: 50, windowMs: 60 * 1000 },
  '/api/auth/login': { requests: 5, windowMs: 60 * 1000 },
  '/api/auth/register': { requests: 3, windowMs: 60 * 1000 },
};

/**
 * Clean up expired entries from the store
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.windowStart + data.windowMs < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Get rate limit key from request
 */
export function getRateLimitKey(request, type = 'general') {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip') 
    || 'unknown';
  const apiKey = request.headers.get('x-api-key');
  const userId = request.headers.get('x-user-id');
  
  if (apiKey) return `api:${apiKey}:${type}`;
  if (userId) return `user:${userId}:${type}`;
  return `ip:${ip}:${type}`;
}

/**
 * Check rate limit for a request
 * @returns {{ allowed: boolean, remaining: number, resetAt: number, limit: number }}
 */
export function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const data = rateLimitStore.get(key);
  
  if (!data || data.windowStart + data.windowMs < now) {
    // Start new window
    rateLimitStore.set(key, {
      count: 1,
      windowStart: now,
      windowMs,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: now + windowMs,
      limit,
    };
  }
  
  if (data.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: data.windowStart + data.windowMs,
      limit,
    };
  }
  
  data.count++;
  return {
    allowed: true,
    remaining: limit - data.count,
    resetAt: data.windowStart + data.windowMs,
    limit,
  };
}

/**
 * Rate limit middleware for API routes
 * Usage: const result = await rateLimit(request, 'professional');
 */
export async function rateLimit(request, userTier = 'free', endpointOverride = null) {
  const pathname = new URL(request.url).pathname;
  
  // Check for endpoint-specific limits first
  const endpointConfig = endpointOverride || ENDPOINT_LIMITS[pathname];
  const tierConfig = RATE_LIMITS[userTier] || RATE_LIMITS.free;
  
  // Use endpoint limit if more restrictive
  const limit = endpointConfig?.requests || tierConfig.requests;
  const windowMs = endpointConfig?.windowMs || tierConfig.windowMs;
  
  const key = getRateLimitKey(request, pathname);
  return checkRateLimit(key, limit, windowMs);
}

/**
 * Create rate limit headers for response
 */
export function getRateLimitHeaders(result) {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
  };
}

/**
 * Helper to create a rate-limited response
 */
export function createRateLimitResponse(result) {
  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
        ...getRateLimitHeaders(result),
      },
    }
  );
}

/**
 * Wrapper for API route handlers with built-in rate limiting
 * Usage: export const POST = withRateLimit(handler, 'professional');
 */
export function withRateLimit(handler, defaultTier = 'free') {
  return async function rateLimitedHandler(request, context) {
    // Get user tier from header or session (customize as needed)
    const userTier = request.headers.get('x-user-tier') || defaultTier;
    
    const result = await rateLimit(request, userTier);
    
    if (!result.allowed) {
      return createRateLimitResponse(result);
    }
    
    // Call the actual handler
    const response = await handler(request, context);
    
    // Add rate limit headers to response
    const headers = getRateLimitHeaders(result);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  };
}

export default {
  checkRateLimit,
  rateLimit,
  withRateLimit,
  getRateLimitHeaders,
  createRateLimitResponse,
  RATE_LIMITS,
  ENDPOINT_LIMITS,
};

/**
 * Sovereign Intelligence Platform
 * Rate Limiter Middleware
 * 
 * Token bucket + sliding window rate limiting
 */

import { cache, CACHE_PREFIX, TTL } from '../cache/redis';

// Rate limit configurations by plan
export const RATE_LIMITS = {
  FREE: {
    requests: 100,
    window: 3600,        // 100 requests per hour
    ai: 10,              // 10 AI requests per hour
    aiWindow: 3600,
  },
  STARTER: {
    requests: 1000,
    window: 3600,        // 1000 requests per hour
    ai: 100,
    aiWindow: 3600,
  },
  PROFESSIONAL: {
    requests: 5000,
    window: 3600,        // 5000 requests per hour
    ai: 500,
    aiWindow: 3600,
  },
  ENTERPRISE: {
    requests: 50000,
    window: 3600,        // 50000 requests per hour
    ai: 5000,
    aiWindow: 3600,
  },
  GOVERNMENT: {
    requests: 100000,
    window: 3600,        // 100000 requests per hour
    ai: 10000,
    aiWindow: 3600,
  },
};

/**
 * Check rate limit for a given identifier
 */
export async function checkRateLimit(identifier, type = 'requests', plan = 'FREE') {
  const limits = RATE_LIMITS[plan] || RATE_LIMITS.FREE;
  const limit = type === 'ai' ? limits.ai : limits.requests;
  const window = type === 'ai' ? limits.aiWindow : limits.window;
  
  const key = `${CACHE_PREFIX.RATE_LIMIT}${type}:${identifier}`;
  
  const result = await cache.checkRateLimit(key, limit, window);
  
  return {
    ...result,
    type,
    plan,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.floor(Date.now() / 1000 + result.resetIn).toString(),
    },
  };
}

/**
 * Rate limit middleware for API routes
 */
export function withRateLimit(handler, options = {}) {
  const { type = 'requests', getIdentifier, getPlan } = options;
  
  return async (request, context) => {
    // Get identifier (API key, user ID, or IP)
    const identifier = getIdentifier 
      ? await getIdentifier(request) 
      : request.headers.get('x-api-key') || 
        request.headers.get('x-forwarded-for')?.split(',')[0] || 
        'anonymous';
    
    // Get plan
    const plan = getPlan ? await getPlan(request) : 'FREE';
    
    // Check rate limit
    const result = await checkRateLimit(identifier, type, plan);
    
    if (!result.allowed) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${result.resetIn} seconds.`,
        limit: result.limit,
        current: result.current,
        resetIn: result.resetIn,
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...result.headers,
          'Retry-After': result.resetIn.toString(),
        },
      });
    }
    
    // Call original handler
    const response = await handler(request, context);
    
    // Add rate limit headers to response
    const headers = new Headers(response.headers);
    Object.entries(result.headers).forEach(([key, value]) => {
      headers.set(key, value);
    });
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

/**
 * API Key rate limit check
 */
export async function checkApiKeyRateLimit(apiKeyId, plan) {
  return checkRateLimit(`apikey:${apiKeyId}`, 'requests', plan);
}

/**
 * AI request rate limit check
 */
export async function checkAIRateLimit(orgId, plan) {
  return checkRateLimit(`ai:${orgId}`, 'ai', plan);
}

export default { checkRateLimit, withRateLimit, checkApiKeyRateLimit, checkAIRateLimit };

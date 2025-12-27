// middleware.js
// [KT:MIDDLEWARE-v2.0] Next.js Middleware with Enterprise Features
// Admin guard, rate limiting, security headers, and request tracking

import { NextResponse } from 'next/server';

const TAG = '[MIDDLEWARE]';

// ============================================================================
// Configuration
// ============================================================================
const GUARD_ON = (process.env.ADMIN_GUARD ?? 'on').toLowerCase() !== 'off';
const RATE_LIMIT_ON = (process.env.RATE_LIMIT ?? 'on').toLowerCase() !== 'off';

// ============================================================================
// Rate Limiting Configuration
// ============================================================================
const RATE_LIMITS = {
  '/api/stripe/': { windowMs: 60000, maxRequests: 30 },
  '/api/enterprise/': { windowMs: 60000, maxRequests: 100 },
  '/api/auth/': { windowMs: 900000, maxRequests: 10 }, // 15 min window
  '/api/ai/': { windowMs: 60000, maxRequests: 20 },
  '/api/': { windowMs: 60000, maxRequests: 60 }, // Default for other API routes
};

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map();

// ============================================================================
// Rate Limiter Function
// ============================================================================
function checkRateLimit(ip, path) {
  // Find matching rate limit config (most specific first)
  let config = RATE_LIMITS['/api/'];
  for (const [prefix, conf] of Object.entries(RATE_LIMITS)) {
    if (path.startsWith(prefix) && prefix !== '/api/') {
      config = conf;
      break;
    }
  }
  
  const key = `${ip}:${path.split('/').slice(0, 3).join('/')}`;
  const now = Date.now();
  
  let record = rateLimitStore.get(key);
  if (!record || now - record.windowStart > config.windowMs) {
    record = { windowStart: now, count: 0 };
  }
  
  record.count++;
  rateLimitStore.set(key, record);
  
  // Cleanup old entries periodically
  if (rateLimitStore.size > 10000) {
    const cutoff = now - 3600000; // 1 hour
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.windowStart < cutoff) rateLimitStore.delete(k);
    }
  }
  
  const remaining = Math.max(0, config.maxRequests - record.count);
  const resetAt = record.windowStart + config.windowMs;
  
  return {
    allowed: record.count <= config.maxRequests,
    remaining,
    resetAt,
    limit: config.maxRequests,
  };
}

// ============================================================================
// Request ID Generator
// ============================================================================
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Main Middleware Function
// ============================================================================
export function middleware(req) {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const requestId = generateRequestId();
  
  // Get client IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || req.headers.get('x-real-ip') 
    || 'unknown';
  
  // ----------------------------------------
  // API Route Handling with Rate Limiting
  // ----------------------------------------
  if (pathname.startsWith('/api/')) {
    // Check rate limit for API routes
    if (RATE_LIMIT_ON) {
      const rateLimit = checkRateLimit(ip, pathname);
      
      // Block if rate limited
      if (!rateLimit.allowed) {
        console.warn(TAG, 'rate.limited', { ip, path: pathname, requestId });
        
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please slow down.',
            retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-RateLimit-Limit': rateLimit.limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': Math.ceil(rateLimit.resetAt / 1000).toString(),
              'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
            },
          }
        );
      }
      
      // Add rate limit headers to successful responses
      const response = NextResponse.next();
      response.headers.set('X-Request-ID', requestId);
      response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
      response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimit.resetAt / 1000).toString());
      
      // Security headers
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      
      return response;
    }
    
    return NextResponse.next();
  }
  
  // ----------------------------------------
  // 2FA Routes - Allow through
  // ----------------------------------------
  if (pathname.startsWith('/2FA')) {
    return NextResponse.next();
  }
  
  // ----------------------------------------
  // Admin Guard Protection
  // ----------------------------------------
  if (GUARD_ON && pathname.startsWith('/admin')) {
    const lang = url.searchParams.get('lang') || '';
    const fromLogin = url.searchParams.has('redirect');

    if (!lang || !fromLogin) {
      // Redirect to 2FA login with a redirect back to /admin
      const redirect = `/2FA/login?lang=${encodeURIComponent(
        lang || 'English',
      )}&redirect=${encodeURIComponent(`${pathname}${url.search}`)}`;
      return NextResponse.redirect(new URL(redirect, req.url));
    }
  }
  
  // ----------------------------------------
  // Add security headers to all responses
  // ----------------------------------------
  const response = NextResponse.next();
  
  // Add request ID for tracing
  response.headers.set('X-Request-ID', requestId);
  
  // Security headers for all routes
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

// ============================================================================
// Middleware Config
// ============================================================================
export const config = {
  matcher: ['/((?!_next|favicon.ico|images|public).*)'],
};

/**
 * Security Headers Middleware
 * Implements OWASP recommended security headers
 * SOC2 CC6.7, CC6.8 compliant
 * Created: December 25, 2025
 */

/**
 * Security headers configuration
 */
export const SECURITY_HEADERS = {
  // Prevent XSS attacks
  'X-XSS-Protection': '1; mode=block',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Prevent clickjacking
  'X-Frame-Options': 'SAMEORIGIN',
  
  // Enforce HTTPS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions policy (formerly Feature-Policy)
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
  
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.openai.com https://api.airtable.com https://api.stripe.com wss:",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join('; '),
  
  // Cross-Origin policies
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response) {
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    response.headers.set(header, value);
  });
  
  return response;
}

/**
 * Security headers middleware for API routes
 */
export function withSecurityHeaders(handler) {
  return async (request, context) => {
    try {
      const response = await handler(request, context);
      return applySecurityHeaders(response);
    } catch (error) {
      console.error('[SECURITY] Handler error:', error);
      const errorResponse = new Response(
        JSON.stringify({ error: 'Internal Server Error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
      return applySecurityHeaders(errorResponse);
    }
  };
}

/**
 * CORS configuration for API routes
 */
export function getCorsHeaders(request) {
  const origin = request.headers.get('Origin');
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'https://sovereign-intelligence.com',
    'https://www.sovereign-intelligence.com',
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean);
  
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-API-Key',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Access-Control-Allow-Credentials': 'true',
  };
  
  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else if (process.env.NODE_ENV === 'development') {
    headers['Access-Control-Allow-Origin'] = origin || '*';
  }
  
  return headers;
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflightRequest(request) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

/**
 * Rate limit response headers
 */
export function getRateLimitHeaders(limits) {
  return {
    'X-RateLimit-Limit': String(limits.limit),
    'X-RateLimit-Remaining': String(limits.remaining),
    'X-RateLimit-Reset': String(limits.reset),
    'Retry-After': limits.remaining <= 0 ? String(Math.ceil((limits.reset - Date.now()) / 1000)) : undefined,
  };
}

/**
 * Cache control headers
 */
export function getCacheHeaders(options = {}) {
  const {
    isPublic = false,
    maxAge = 0,
    sMaxAge = 0,
    staleWhileRevalidate = 0,
    noStore = false,
    noCache = false,
    mustRevalidate = false,
  } = options;
  
  const directives = [];
  
  if (noStore) {
    directives.push('no-store');
  } else if (noCache) {
    directives.push('no-cache');
  } else {
    directives.push(isPublic ? 'public' : 'private');
    
    if (maxAge > 0) {
      directives.push(`max-age=${maxAge}`);
    }
    
    if (sMaxAge > 0) {
      directives.push(`s-maxage=${sMaxAge}`);
    }
    
    if (staleWhileRevalidate > 0) {
      directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
    }
  }
  
  if (mustRevalidate) {
    directives.push('must-revalidate');
  }
  
  return {
    'Cache-Control': directives.join(', '),
  };
}

/**
 * Content disposition header for downloads
 */
export function getDownloadHeaders(filename, contentType = 'application/octet-stream') {
  return {
    'Content-Type': contentType,
    'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    'X-Content-Type-Options': 'nosniff',
  };
}

/**
 * Sanitize filename for Content-Disposition
 */
export function sanitizeFilename(filename) {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\.\.+/g, '.')
    .slice(0, 255);
}

export default {
  SECURITY_HEADERS,
  applySecurityHeaders,
  withSecurityHeaders,
  getCorsHeaders,
  handleCorsPreflightRequest,
  getRateLimitHeaders,
  getCacheHeaders,
  getDownloadHeaders,
  sanitizeFilename,
};

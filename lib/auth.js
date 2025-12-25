// lib/auth.js
// Centralized authentication utilities for Sovereign Intelligence
// Supports: API Key auth, Session auth, JWT tokens

import { cookies } from 'next/headers';

// Environment variables (set in .env.local)
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'sovereign-default-secret-change-me';

/**
 * Verify API key from request headers
 * @param {Request} request - The incoming request
 * @returns {Object} - { valid: boolean, error?: string, user?: object }
 */
export async function verifyApiKey(request) {
  const authHeader = request.headers.get('authorization');
  const apiKey = request.headers.get('x-api-key');
  
  // Check for Bearer token or X-API-Key header
  const token = apiKey || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
  
  if (!token) {
    return { valid: false, error: 'No API key provided' };
  }
  
  // TODO: Validate against database of API keys
  // For now, check against environment variable
  const validKeys = (process.env.VALID_API_KEYS || '').split(',').filter(Boolean);
  
  if (validKeys.length > 0 && !validKeys.includes(token)) {
    return { valid: false, error: 'Invalid API key' };
  }
  
  return { 
    valid: true, 
    user: { 
      id: 'api-user',
      type: 'api',
      keyPrefix: token.slice(0, 8) 
    } 
  };
}

/**
 * Get current session from cookies (for UI auth)
 * @returns {Object|null} - Session object or null
 */
export async function getSession() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session-token')?.value;
    
    if (!sessionToken) {
      return null;
    }
    
    // TODO: Validate session token against database
    // For now, decode basic session
    try {
      const decoded = JSON.parse(Buffer.from(sessionToken, 'base64').toString());
      if (decoded.exp && decoded.exp < Date.now()) {
        return null; // Expired
      }
      return decoded;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * Create a session token
 * @param {Object} user - User object
 * @param {number} expiresInMs - Token expiry in milliseconds (default 7 days)
 * @returns {string} - Session token
 */
export function createSessionToken(user, expiresInMs = 7 * 24 * 60 * 60 * 1000) {
  const session = {
    ...user,
    iat: Date.now(),
    exp: Date.now() + expiresInMs,
  };
  return Buffer.from(JSON.stringify(session)).toString('base64');
}

/**
 * Hash a password (simple implementation - use bcrypt in production)
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
export async function hashPassword(password) {
  // In production, use bcrypt:
  // const bcrypt = require('bcrypt');
  // return bcrypt.hash(password, 10);
  
  const encoder = new TextEncoder();
  const data = encoder.encode(password + JWT_SECRET);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Stored hash
 * @returns {Promise<boolean>} - Match result
 */
export async function verifyPassword(password, hash) {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

/**
 * Generate a secure random API key
 * @param {string} prefix - Key prefix (e.g., 'sk_live_')
 * @returns {string} - API key
 */
export function generateApiKey(prefix = 'sk_') {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const key = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}${key}`;
}

/**
 * Middleware helper to require authentication
 * @param {Request} request - The incoming request
 * @param {Object} options - { requireSession?: boolean, requireApiKey?: boolean }
 * @returns {Object} - { authenticated: boolean, user?: object, error?: string }
 */
export async function requireAuth(request, options = {}) {
  const { requireSession = false, requireApiKey = false } = options;
  
  // Try API key first
  const apiAuth = await verifyApiKey(request);
  if (apiAuth.valid) {
    return { authenticated: true, user: apiAuth.user, method: 'api-key' };
  }
  
  // Try session
  const session = await getSession();
  if (session) {
    return { authenticated: true, user: session, method: 'session' };
  }
  
  // Determine error based on requirements
  if (requireApiKey) {
    return { authenticated: false, error: 'Valid API key required' };
  }
  if (requireSession) {
    return { authenticated: false, error: 'Login required' };
  }
  
  return { authenticated: false, error: 'Authentication required' };
}

/**
 * Rate limiting helper (simple in-memory implementation)
 * In production, use Redis or similar
 */
const rateLimitStore = new Map();

export function checkRateLimit(identifier, maxRequests = 100, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Get existing requests for this identifier
  let requests = rateLimitStore.get(identifier) || [];
  
  // Filter to only requests within the window
  requests = requests.filter(timestamp => timestamp > windowStart);
  
  if (requests.length >= maxRequests) {
    return { 
      allowed: false, 
      remaining: 0,
      resetAt: Math.min(...requests) + windowMs 
    };
  }
  
  // Add current request
  requests.push(now);
  rateLimitStore.set(identifier, requests);
  
  return { 
    allowed: true, 
    remaining: maxRequests - requests.length,
    resetAt: now + windowMs 
  };
}

// Export default object for convenience
export default {
  verifyApiKey,
  getSession,
  createSessionToken,
  hashPassword,
  verifyPassword,
  generateApiKey,
  requireAuth,
  checkRateLimit,
};

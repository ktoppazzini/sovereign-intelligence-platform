/**
 * Error Response Utilities for Sovereign Intelligence
 * Consistent error handling across all API routes
 * Created: December 25, 2025
 */

import { NextResponse } from 'next/server';

/**
 * Standard error codes
 */
export const ERROR_CODES = {
  // Client errors (4xx)
  BAD_REQUEST: { status: 400, code: 'BAD_REQUEST' },
  UNAUTHORIZED: { status: 401, code: 'UNAUTHORIZED' },
  FORBIDDEN: { status: 403, code: 'FORBIDDEN' },
  NOT_FOUND: { status: 404, code: 'NOT_FOUND' },
  METHOD_NOT_ALLOWED: { status: 405, code: 'METHOD_NOT_ALLOWED' },
  CONFLICT: { status: 409, code: 'CONFLICT' },
  VALIDATION_ERROR: { status: 422, code: 'VALIDATION_ERROR' },
  RATE_LIMITED: { status: 429, code: 'RATE_LIMITED' },
  
  // Server errors (5xx)
  INTERNAL_ERROR: { status: 500, code: 'INTERNAL_ERROR' },
  NOT_IMPLEMENTED: { status: 501, code: 'NOT_IMPLEMENTED' },
  SERVICE_UNAVAILABLE: { status: 503, code: 'SERVICE_UNAVAILABLE' },
  GATEWAY_TIMEOUT: { status: 504, code: 'GATEWAY_TIMEOUT' },
  
  // Custom application errors
  AI_ERROR: { status: 503, code: 'AI_SERVICE_ERROR' },
  DATABASE_ERROR: { status: 503, code: 'DATABASE_ERROR' },
  TRANSLATION_ERROR: { status: 503, code: 'TRANSLATION_ERROR' },
  PAYMENT_ERROR: { status: 402, code: 'PAYMENT_ERROR' },
  QUOTA_EXCEEDED: { status: 402, code: 'QUOTA_EXCEEDED' },
};

/**
 * Create standardized error response
 */
export function errorResponse(errorType, message, details = null) {
  const error = ERROR_CODES[errorType] || ERROR_CODES.INTERNAL_ERROR;
  
  const body = {
    error: error.code,
    message: message || getDefaultMessage(errorType),
    timestamp: new Date().toISOString(),
  };
  
  if (details) {
    body.details = details;
  }
  
  // Add request ID for tracking
  body.requestId = generateRequestId();
  
  return NextResponse.json(body, { 
    status: error.status,
    headers: {
      'X-Request-ID': body.requestId,
    },
  });
}

/**
 * Get default error message
 */
function getDefaultMessage(errorType) {
  const messages = {
    BAD_REQUEST: 'The request was invalid or malformed',
    UNAUTHORIZED: 'Authentication required',
    FORBIDDEN: 'You do not have permission to access this resource',
    NOT_FOUND: 'The requested resource was not found',
    METHOD_NOT_ALLOWED: 'This HTTP method is not allowed for this endpoint',
    CONFLICT: 'The request conflicts with the current state',
    VALIDATION_ERROR: 'The request data failed validation',
    RATE_LIMITED: 'Too many requests. Please try again later',
    INTERNAL_ERROR: 'An unexpected error occurred',
    NOT_IMPLEMENTED: 'This feature is not yet implemented',
    SERVICE_UNAVAILABLE: 'The service is temporarily unavailable',
    GATEWAY_TIMEOUT: 'The request timed out',
    AI_ERROR: 'AI service is temporarily unavailable',
    DATABASE_ERROR: 'Database service is temporarily unavailable',
    TRANSLATION_ERROR: 'Translation service encountered an error',
    PAYMENT_ERROR: 'Payment processing failed',
    QUOTA_EXCEEDED: 'Your usage quota has been exceeded',
  };
  
  return messages[errorType] || 'An error occurred';
}

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Wrap async handler with error boundary
 * Usage: export const POST = withErrorHandler(handler);
 */
export function withErrorHandler(handler) {
  return async function errorBoundaryHandler(request, context) {
    const startTime = Date.now();
    const requestId = generateRequestId();
    
    try {
      // Add request ID to headers for logging
      request.headers.set?.('x-request-id', requestId) || (request._requestId = requestId);
      
      const response = await handler(request, context);
      
      // Add timing header
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
      response.headers.set('X-Request-ID', requestId);
      
      return response;
    } catch (error) {
      // Log error for debugging
      console.error(`[ERROR] ${requestId}:`, {
        message: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
      });
      
      // Determine error type based on error properties
      let errorType = 'INTERNAL_ERROR';
      let message = 'An unexpected error occurred';
      let details = null;
      
      if (error.name === 'ValidationError') {
        errorType = 'VALIDATION_ERROR';
        message = error.message;
        details = error.errors;
      } else if (error.code === 'ECONNREFUSED') {
        errorType = 'SERVICE_UNAVAILABLE';
        message = 'A required service is unavailable';
      } else if (error.code === 'ETIMEDOUT') {
        errorType = 'GATEWAY_TIMEOUT';
        message = 'The request timed out';
      } else if (error.status) {
        // Custom error with status
        const code = Object.keys(ERROR_CODES).find(k => ERROR_CODES[k].status === error.status);
        if (code) errorType = code;
        message = error.message;
      }
      
      // In development, include stack trace
      if (process.env.NODE_ENV === 'development') {
        details = { 
          ...details, 
          stack: error.stack?.split('\n').slice(0, 5),
        };
      }
      
      return errorResponse(errorType, message, details);
    }
  };
}

/**
 * Create success response with standard format
 */
export function successResponse(data, message = null) {
  const body = {
    success: true,
    timestamp: new Date().toISOString(),
    data,
  };
  
  if (message) {
    body.message = message;
  }
  
  return NextResponse.json(body);
}

/**
 * Create paginated response
 */
export function paginatedResponse(items, { page = 1, limit = 20, total }) {
  const totalPages = Math.ceil(total / limit);
  
  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    },
  });
}

export default {
  errorResponse,
  successResponse,
  paginatedResponse,
  withErrorHandler,
  ERROR_CODES,
};

/**
 * Request Validation Middleware for Sovereign Intelligence
 * Validates API request payloads against schemas
 * Created: December 25, 2025
 */

/**
 * Common validation schemas
 */
export const SCHEMAS = {
  // Report generation request
  reportGeneration: {
    required: ['lang'],
    optional: ['verticalId', 'reportType', 'organizationName', 'preparedBy', 'context', 'selectedCategories'],
    types: {
      lang: 'string',
      verticalId: 'string',
      reportType: 'string',
      organizationName: 'string',
      preparedBy: 'string',
      context: 'string',
      selectedCategories: 'array',
      minWords: 'number',
    },
    constraints: {
      lang: { minLength: 2, maxLength: 50 },
      organizationName: { maxLength: 200 },
      preparedBy: { maxLength: 100 },
      context: { maxLength: 10000 },
      minWords: { min: 100, max: 50000 },
    },
  },
  
  // Translation request
  translation: {
    required: ['text', 'targetLang'],
    optional: ['sourceLang', 'context'],
    types: {
      text: 'string',
      targetLang: 'string',
      sourceLang: 'string',
      context: 'string',
    },
    constraints: {
      text: { maxLength: 100000 },
      targetLang: { minLength: 2, maxLength: 50 },
    },
  },
  
  // Authentication request
  login: {
    required: ['email', 'password'],
    optional: ['rememberMe'],
    types: {
      email: 'string',
      password: 'string',
      rememberMe: 'boolean',
    },
    constraints: {
      email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      password: { minLength: 8, maxLength: 128 },
    },
  },
  
  // Registration request
  register: {
    required: ['email', 'password', 'name'],
    optional: ['organization', 'role', 'phone'],
    types: {
      email: 'string',
      password: 'string',
      name: 'string',
      organization: 'string',
      role: 'string',
      phone: 'string',
    },
    constraints: {
      email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      password: { minLength: 8, maxLength: 128 },
      name: { minLength: 2, maxLength: 100 },
    },
  },
  
  // Finalize report request
  finalize: {
    required: ['html'],
    optional: ['verticalId', 'organizationName', 'preparedBy', 'lang', 'reportType'],
    types: {
      html: 'string',
      verticalId: 'string',
      organizationName: 'string',
      preparedBy: 'string',
      lang: 'string',
      reportType: 'string',
    },
    constraints: {
      html: { minLength: 100 },
    },
  },
};

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(field, message, code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.code = code;
    this.status = 400;
  }
  
  toJSON() {
    return {
      error: this.name,
      field: this.field,
      message: this.message,
      code: this.code,
    };
  }
}

/**
 * Validate a value against type
 */
function validateType(value, expectedType) {
  if (expectedType === 'array') {
    return Array.isArray(value);
  }
  return typeof value === expectedType;
}

/**
 * Validate a value against constraints
 */
function validateConstraints(value, constraints, field) {
  const errors = [];
  
  if (constraints.minLength !== undefined && value.length < constraints.minLength) {
    errors.push(`${field} must be at least ${constraints.minLength} characters`);
  }
  
  if (constraints.maxLength !== undefined && value.length > constraints.maxLength) {
    errors.push(`${field} must not exceed ${constraints.maxLength} characters`);
  }
  
  if (constraints.min !== undefined && value < constraints.min) {
    errors.push(`${field} must be at least ${constraints.min}`);
  }
  
  if (constraints.max !== undefined && value > constraints.max) {
    errors.push(`${field} must not exceed ${constraints.max}`);
  }
  
  if (constraints.pattern && !constraints.pattern.test(value)) {
    errors.push(`${field} has invalid format`);
  }
  
  if (constraints.enum && !constraints.enum.includes(value)) {
    errors.push(`${field} must be one of: ${constraints.enum.join(', ')}`);
  }
  
  return errors;
}

/**
 * Validate request body against schema
 * @returns {{ valid: boolean, errors: Array, data: object }}
 */
export function validateRequest(body, schemaName) {
  const schema = typeof schemaName === 'string' ? SCHEMAS[schemaName] : schemaName;
  
  if (!schema) {
    return { valid: false, errors: [{ field: '_schema', message: 'Unknown schema' }], data: null };
  }
  
  const errors = [];
  const cleanData = {};
  
  // Check required fields
  for (const field of schema.required || []) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      errors.push({ field, message: `${field} is required` });
    }
  }
  
  // Validate all provided fields
  const allFields = [...(schema.required || []), ...(schema.optional || [])];
  
  for (const field of allFields) {
    const value = body[field];
    
    if (value === undefined || value === null) {
      continue;
    }
    
    // Type validation
    const expectedType = schema.types?.[field];
    if (expectedType && !validateType(value, expectedType)) {
      errors.push({ field, message: `${field} must be of type ${expectedType}` });
      continue;
    }
    
    // Constraint validation
    const constraints = schema.constraints?.[field];
    if (constraints) {
      const constraintErrors = validateConstraints(value, constraints, field);
      errors.push(...constraintErrors.map(msg => ({ field, message: msg })));
    }
    
    // Add to clean data
    cleanData[field] = value;
  }
  
  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? cleanData : null,
  };
}

/**
 * Middleware wrapper for validation
 * Usage: export const POST = withValidation('reportGeneration', handler);
 */
export function withValidation(schemaName, handler) {
  return async function validatedHandler(request, context) {
    let body;
    
    try {
      body = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON', message: 'Request body must be valid JSON' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const validation = validateRequest(body, schemaName);
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ 
          error: 'Validation Error', 
          errors: validation.errors,
          message: validation.errors.map(e => e.message).join(', '),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Attach validated data to request
    request.validatedBody = validation.data;
    
    return handler(request, context);
  };
}

/**
 * Sanitize string input (prevent XSS)
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj) {
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj && typeof obj === 'object') {
    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      clean[sanitizeString(key)] = sanitizeObject(value);
    }
    return clean;
  }
  return obj;
}

export default {
  validateRequest,
  withValidation,
  sanitizeString,
  sanitizeObject,
  SCHEMAS,
  ValidationError,
};

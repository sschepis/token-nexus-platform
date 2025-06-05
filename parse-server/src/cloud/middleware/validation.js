/**
 * Validation Middleware for Parse Cloud Functions
 * Provides input validation, sanitization, and schema validation
 */

/**
 * Schema validation middleware - validates request parameters against a schema
 * @param {Object} schema - Validation schema
 * @returns {Function} - Middleware function
 */
function withValidation(schema) {
  return function(handler) {
    return async (request) => {
      const { params, functionName } = request;
      
      try {
        const validatedParams = await validateParams(params, schema, functionName);
        request.params = validatedParams;
        
        console.log(`[Validation] Parameters validated for ${functionName}`);
        return await handler(request);
      } catch (error) {
        console.error(`[Validation] Validation failed for ${functionName}:`, error.message);
        throw error;
      }
    };
  };
}

/**
 * Validate parameters against schema
 * @param {Object} params - Parameters to validate
 * @param {Object} schema - Validation schema
 * @param {string} functionName - Function name for logging
 * @returns {Object} - Validated and sanitized parameters
 */
async function validateParams(params, schema, functionName) {
  const validatedParams = {};
  const errors = [];
  
  // Check required fields
  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    const value = params[fieldName];
    
    // Check if required field is missing
    if (fieldSchema.required && (value === undefined || value === null)) {
      errors.push(`${fieldName} is required`);
      continue;
    }
    
    // Skip validation if field is optional and not provided
    if (!fieldSchema.required && (value === undefined || value === null)) {
      continue;
    }
    
    // Validate field type and constraints
    try {
      validatedParams[fieldName] = await validateField(fieldName, value, fieldSchema);
    } catch (error) {
      errors.push(`${fieldName}: ${error.message}`);
    }
  }
  
  // Check for unexpected fields
  const allowedFields = Object.keys(schema);
  const providedFields = Object.keys(params);
  const unexpectedFields = providedFields.filter(field => !allowedFields.includes(field));
  
  if (unexpectedFields.length > 0) {
    errors.push(`Unexpected fields: ${unexpectedFields.join(', ')}`);
  }
  
  if (errors.length > 0) {
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      `Validation failed: ${errors.join('; ')}`
    );
  }
  
  return validatedParams;
}

/**
 * Validate individual field
 * @param {string} fieldName - Field name
 * @param {*} value - Field value
 * @param {Object} fieldSchema - Field validation schema
 * @returns {*} - Validated and sanitized value
 */
async function validateField(fieldName, value, fieldSchema) {
  const { type, min, max, minLength, maxLength, pattern, enum: enumValues, custom } = fieldSchema;
  
  // Type validation
  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        throw new Error('must be a string');
      }
      value = sanitizeString(value);
      break;
      
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        throw new Error('must be a valid number');
      }
      break;
      
    case 'integer':
      if (!Number.isInteger(value)) {
        throw new Error('must be an integer');
      }
      break;
      
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new Error('must be a boolean');
      }
      break;
      
    case 'array':
      if (!Array.isArray(value)) {
        throw new Error('must be an array');
      }
      break;
      
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value) || value === null) {
        throw new Error('must be an object');
      }
      break;
      
    case 'email':
      if (typeof value !== 'string' || !isValidEmail(value)) {
        throw new Error('must be a valid email address');
      }
      value = value.toLowerCase().trim();
      break;
      
    case 'url':
      if (typeof value !== 'string' || !isValidUrl(value)) {
        throw new Error('must be a valid URL');
      }
      break;
      
    case 'date':
      if (!(value instanceof Date) && typeof value !== 'string') {
        throw new Error('must be a valid date');
      }
      if (typeof value === 'string') {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error('must be a valid date string');
        }
        value = date;
      }
      break;
  }
  
  // Length validation for strings and arrays
  if (type === 'string' || type === 'array') {
    const length = value.length;
    if (minLength !== undefined && length < minLength) {
      throw new Error(`must be at least ${minLength} characters/items long`);
    }
    if (maxLength !== undefined && length > maxLength) {
      throw new Error(`must be at most ${maxLength} characters/items long`);
    }
  }
  
  // Range validation for numbers
  if (type === 'number' || type === 'integer') {
    if (min !== undefined && value < min) {
      throw new Error(`must be at least ${min}`);
    }
    if (max !== undefined && value > max) {
      throw new Error(`must be at most ${max}`);
    }
  }
  
  // Pattern validation for strings
  if (type === 'string' && pattern) {
    const regex = new RegExp(pattern);
    if (!regex.test(value)) {
      throw new Error(`must match pattern ${pattern}`);
    }
  }
  
  // Enum validation
  if (enumValues && !enumValues.includes(value)) {
    throw new Error(`must be one of: ${enumValues.join(', ')}`);
  }
  
  // Custom validation
  if (custom && typeof custom === 'function') {
    const customResult = await custom(value);
    if (customResult !== true) {
      throw new Error(customResult || 'failed custom validation');
    }
  }
  
  return value;
}

/**
 * Sanitize string input
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  // Trim whitespace
  str = str.trim();
  
  // Remove null bytes
  str = str.replace(/\0/g, '');
  
  // Basic XSS prevention - remove script tags and javascript: protocols
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  str = str.replace(/javascript:/gi, '');
  
  return str;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid URL
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Rate limiting middleware
 * @param {Object} options - Rate limiting options
 * @returns {Function} - Middleware function
 */
function withRateLimit(options = {}) {
  const {
    maxRequests = 100,
    windowMs = 60000, // 1 minute
    keyGenerator = (request) => request.user?.id || request.ip || 'anonymous'
  } = options;
  
  const requestCounts = new Map();
  
  return function(handler) {
    return async (request) => {
      const key = keyGenerator(request);
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Clean up old entries
      for (const [k, data] of requestCounts.entries()) {
        if (data.timestamp < windowStart) {
          requestCounts.delete(k);
        }
      }
      
      // Check current request count
      const currentData = requestCounts.get(key) || { count: 0, timestamp: now };
      
      if (currentData.timestamp < windowStart) {
        // Reset count for new window
        currentData.count = 1;
        currentData.timestamp = now;
      } else {
        currentData.count++;
      }
      
      requestCounts.set(key, currentData);
      
      if (currentData.count > maxRequests) {
        throw new Parse.Error(
          Parse.Error.EXCEEDED_QUOTA,
          `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000} seconds.`
        );
      }
      
      console.log(`[RateLimit] Request ${currentData.count}/${maxRequests} for key: ${key}`);
      return await handler(request);
    };
  };
}

/**
 * Common validation schemas
 */
const commonSchemas = {
  pagination: {
    limit: { type: 'integer', min: 1, max: 1000 },
    skip: { type: 'integer', min: 0 }
  },
  
  organizationId: {
    organizationId: { type: 'string', required: true, minLength: 10 }
  },
  
  userEmail: {
    email: { type: 'email', required: true }
  },
  
  dateRange: {
    startDate: { type: 'date' },
    endDate: { type: 'date' }
  }
};

module.exports = {
  withValidation,
  withRateLimit,
  validateParams,
  validateField,
  sanitizeString,
  isValidEmail,
  isValidUrl,
  commonSchemas
};
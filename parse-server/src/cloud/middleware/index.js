/**
 * Cloud Function Middleware Index
 * Central export point for all middleware functions
 */

// Import all middleware modules
const auth = require('./auth');
const validation = require('./validation');
const errorHandler = require('./errorHandler');
const organizationContext = require('./organizationContextMiddleware');
const compose = require('./compose');

// Re-export all middleware functions
module.exports = {
  // Authentication middleware
  ...auth,
  
  // Validation middleware
  ...validation,
  
  // Error handling middleware
  ...errorHandler,
  
  // Organization context middleware
  ...organizationContext,
  
  // Composition utilities
  ...compose,
  
  // Convenience exports for common patterns
  middleware: {
    auth,
    validation,
    errorHandler,
    organizationContext,
    compose
  },
  
  // Pre-configured middleware stacks
  stacks: {
    // Standard authenticated function
    standard: compose.compose(
      errorHandler.withErrorHandler,
      auth.withAuth,
      organizationContext.withOrganizationContext
    ),
    
    // System admin only function
    systemAdmin: compose.compose(
      errorHandler.withErrorHandler,
      auth.withSystemAdmin
    ),
    
    // Organization admin function
    orgAdmin: compose.compose(
      errorHandler.withErrorHandler,
      auth.withOrgAdmin,
      organizationContext.withOrganizationContext
    ),
    
    // Public function (no auth)
    public: compose.compose(
      errorHandler.withErrorHandler
    ),
    
    // Master key function
    masterKey: compose.compose(
      errorHandler.withErrorHandler,
      auth.withMasterKey
    ),
    
    // Validated function with standard auth
    validated: (schema) => compose.compose(
      errorHandler.withErrorHandler,
      validation.withValidation(schema),
      auth.withAuth,
      organizationContext.withOrganizationContext
    ),
    
    // Rate limited function
    rateLimited: (options) => compose.compose(
      errorHandler.withErrorHandler,
      validation.withRateLimit(options),
      auth.withAuth,
      organizationContext.withOrganizationContext
    ),
    
    // Cached function
    cached: (cacheOptions) => compose.compose(
      errorHandler.withErrorHandler,
      compose.withCache(cacheOptions),
      auth.withAuth,
      organizationContext.withOrganizationContext
    ),
    
    // Heavy operation with retry and timeout
    heavy: (timeoutMs = 60000, retryOptions = {}) => compose.compose(
      errorHandler.withErrorHandler,
      compose.withTimeout(timeoutMs),
      compose.withRetry(retryOptions),
      auth.withAuth,
      organizationContext.withOrganizationContext
    ),
    
    // Audited function
    audited: (auditOptions) => compose.compose(
      errorHandler.withErrorHandler,
      errorHandler.withAuditLog(auditOptions),
      auth.withAuth,
      organizationContext.withOrganizationContext
    ),
    
    // Performance monitored function
    monitored: (perfOptions) => compose.compose(
      errorHandler.withErrorHandler,
      errorHandler.withPerformanceMonitoring(perfOptions),
      auth.withAuth,
      organizationContext.withOrganizationContext
    )
  }
};

/**
 * Helper function to create a cloud function with middleware
 * @param {string} name - Function name
 * @param {Function|Function[]} middleware - Middleware function(s) or stack
 * @param {Function} handler - Function handler
 * @returns {void}
 */
function defineFunction(name, middleware, handler) {
  // If middleware is an array, compose them
  if (Array.isArray(middleware)) {
    middleware = compose.compose(...middleware);
  }
  
  // Apply middleware to handler
  const wrappedHandler = middleware(handler);
  
  // Define the Parse Cloud Function
  Parse.Cloud.define(name, wrappedHandler);
  
  console.log(`[Middleware] Defined cloud function: ${name}`);
}

/**
 * Helper function to create multiple functions with the same middleware
 * @param {Function|Function[]} middleware - Middleware function(s) or stack
 * @param {Object} functions - Object with function names as keys and handlers as values
 * @returns {void}
 */
function defineFunctions(middleware, functions) {
  for (const [name, handler] of Object.entries(functions)) {
    defineFunction(name, middleware, handler);
  }
}

/**
 * Helper function to create a function with validation schema
 * @param {string} name - Function name
 * @param {Object} schema - Validation schema
 * @param {Function} handler - Function handler
 * @param {Function} [additionalMiddleware] - Additional middleware to apply
 * @returns {void}
 */
function defineValidatedFunction(name, schema, handler, additionalMiddleware) {
  let middleware = module.exports.stacks.validated(schema);
  
  if (additionalMiddleware) {
    middleware = compose.compose(additionalMiddleware, middleware);
  }
  
  defineFunction(name, middleware, handler);
}

/**
 * Helper function to create a rate-limited function
 * @param {string} name - Function name
 * @param {Object} rateLimitOptions - Rate limit options
 * @param {Function} handler - Function handler
 * @param {Function} [additionalMiddleware] - Additional middleware to apply
 * @returns {void}
 */
function defineRateLimitedFunction(name, rateLimitOptions, handler, additionalMiddleware) {
  let middleware = module.exports.stacks.rateLimited(rateLimitOptions);
  
  if (additionalMiddleware) {
    middleware = compose.compose(additionalMiddleware, middleware);
  }
  
  defineFunction(name, middleware, handler);
}

// Add helper functions to exports
module.exports.defineFunction = defineFunction;
module.exports.defineFunctions = defineFunctions;
module.exports.defineValidatedFunction = defineValidatedFunction;
module.exports.defineRateLimitedFunction = defineRateLimitedFunction;

// Export common validation schemas for convenience
module.exports.schemas = validation.commonSchemas;

/**
 * Example usage:
 * 
 * const { stacks, defineFunction, defineValidatedFunction } = require('./middleware');
 * 
 * // Simple authenticated function
 * defineFunction('getUserProfile', stacks.standard, async (request) => {
 *   // Function implementation
 * });
 * 
 * // Validated function
 * defineValidatedFunction('createUser', {
 *   email: { type: 'email', required: true },
 *   name: { type: 'string', required: true, minLength: 2 }
 * }, async (request) => {
 *   // Function implementation
 * });
 * 
 * // System admin function
 * defineFunction('deleteOrganization', stacks.systemAdmin, async (request) => {
 *   // Function implementation
 * });
 * 
 * // Custom middleware composition
 * const customMiddleware = compose(
 *   withErrorHandler,
 *   withValidation({ id: { type: 'string', required: true } }),
 *   withAuth,
 *   withOrganizationContext,
 *   withAuditLog({ logParams: true })
 * );
 * 
 * defineFunction('sensitiveOperation', customMiddleware, async (request) => {
 *   // Function implementation
 * });
 */
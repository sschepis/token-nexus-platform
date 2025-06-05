/**
 * Middleware Composition Utility for Parse Cloud Functions
 * Provides utilities for composing and chaining middleware functions
 */

/**
 * Compose multiple middleware functions into a single middleware
 * @param {...Function} middlewares - Middleware functions to compose
 * @returns {Function} - Composed middleware function
 */
function compose(...middlewares) {
  return function(handler) {
    // Apply middleware in reverse order (right to left)
    return middlewares.reduceRight((wrappedHandler, middleware) => {
      return middleware(wrappedHandler);
    }, handler);
  };
}

/**
 * Create a middleware pipeline that applies middleware in order (left to right)
 * @param {...Function} middlewares - Middleware functions to apply in order
 * @returns {Function} - Pipeline middleware function
 */
function pipeline(...middlewares) {
  return function(handler) {
    // Apply middleware in forward order (left to right)
    return middlewares.reduce((wrappedHandler, middleware) => {
      return middleware(wrappedHandler);
    }, handler);
  };
}

/**
 * Conditional middleware - only applies middleware if condition is met
 * @param {Function|boolean} condition - Condition function or boolean
 * @param {Function} middleware - Middleware to apply conditionally
 * @returns {Function} - Conditional middleware function
 */
function when(condition, middleware) {
  return function(handler) {
    return async (request) => {
      const shouldApply = typeof condition === 'function' 
        ? await condition(request) 
        : condition;
        
      if (shouldApply) {
        return await middleware(handler)(request);
      } else {
        return await handler(request);
      }
    };
  };
}

/**
 * Skip middleware for specific functions
 * @param {string|string[]} functionNames - Function names to skip
 * @param {Function} middleware - Middleware to skip
 * @returns {Function} - Conditional middleware function
 */
function skipFor(functionNames, middleware) {
  const skipList = Array.isArray(functionNames) ? functionNames : [functionNames];
  
  return when(
    (request) => !skipList.includes(request.functionName),
    middleware
  );
}

/**
 * Apply middleware only for specific functions
 * @param {string|string[]} functionNames - Function names to apply to
 * @param {Function} middleware - Middleware to apply
 * @returns {Function} - Conditional middleware function
 */
function onlyFor(functionNames, middleware) {
  const includeList = Array.isArray(functionNames) ? functionNames : [functionNames];
  
  return when(
    (request) => includeList.includes(request.functionName),
    middleware
  );
}

/**
 * Retry middleware - retries failed operations
 * @param {Object} options - Retry options
 * @returns {Function} - Retry middleware function
 */
function withRetry(options = {}) {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = 'exponential', // 'exponential' or 'linear'
    retryCondition = (error) => error.code === Parse.Error.CONNECTION_FAILED
  } = options;
  
  return function(handler) {
    return async (request) => {
      let lastError;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await handler(request);
        } catch (error) {
          lastError = error;
          
          // Check if we should retry
          if (attempt === maxRetries || !retryCondition(error)) {
            throw error;
          }
          
          // Calculate delay
          const currentDelay = backoff === 'exponential' 
            ? delay * Math.pow(2, attempt)
            : delay * (attempt + 1);
          
          console.log(`[Retry] Attempt ${attempt + 1} failed for ${request.functionName}, retrying in ${currentDelay}ms`);
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, currentDelay));
        }
      }
      
      throw lastError;
    };
  };
}

/**
 * Timeout middleware - adds timeout to function execution
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Function} - Timeout middleware function
 */
function withTimeout(timeoutMs = 30000) {
  return function(handler) {
    return async (request) => {
      return Promise.race([
        handler(request),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Parse.Error(
              Parse.Error.TIMEOUT,
              `Function ${request.functionName} timed out after ${timeoutMs}ms`
            ));
          }, timeoutMs);
        })
      ]);
    };
  };
}

/**
 * Cache middleware - caches function results
 * @param {Object} options - Cache options
 * @returns {Function} - Cache middleware function
 */
function withCache(options = {}) {
  const {
    ttl = 300000, // 5 minutes
    keyGenerator = (request) => `${request.functionName}:${JSON.stringify(request.params)}`,
    skipCache = (request) => request.params.skipCache === true
  } = options;
  
  const cache = new Map();
  
  return function(handler) {
    return async (request) => {
      // Skip cache if requested
      if (skipCache(request)) {
        return await handler(request);
      }
      
      const cacheKey = keyGenerator(request);
      const now = Date.now();
      
      // Check cache
      const cached = cache.get(cacheKey);
      if (cached && (now - cached.timestamp) < ttl) {
        console.log(`[Cache] Cache hit for ${request.functionName}`);
        return cached.result;
      }
      
      // Execute function
      const result = await handler(request);
      
      // Store in cache
      cache.set(cacheKey, {
        result,
        timestamp: now
      });
      
      // Clean up expired entries periodically
      if (Math.random() < 0.01) { // 1% chance
        cleanupCache(cache, ttl);
      }
      
      console.log(`[Cache] Cached result for ${request.functionName}`);
      return result;
    };
  };
}

/**
 * Clean up expired cache entries
 * @param {Map} cache - Cache map
 * @param {number} ttl - Time to live
 */
function cleanupCache(cache, ttl) {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if ((now - value.timestamp) >= ttl) {
      cache.delete(key);
    }
  }
}

/**
 * Middleware for adding request context
 * @param {Function} contextProvider - Function that provides additional context
 * @returns {Function} - Context middleware function
 */
function withContext(contextProvider) {
  return function(handler) {
    return async (request) => {
      const additionalContext = await contextProvider(request);
      
      // Merge additional context into request
      Object.assign(request, additionalContext);
      
      return await handler(request);
    };
  };
}

/**
 * Common middleware combinations for different use cases
 */
const commonMiddleware = {
  /**
   * Standard middleware for most cloud functions
   */
  standard: compose(
    require('./errorHandler').withErrorHandler,
    require('./auth').withAuth,
    require('./organizationContextMiddleware').withOrganizationContext
  ),
  
  /**
   * Admin-only middleware
   */
  adminOnly: compose(
    require('./errorHandler').withErrorHandler,
    require('./auth').withSystemAdmin
  ),
  
  /**
   * Public middleware (no auth required)
   */
  public: compose(
    require('./errorHandler').withErrorHandler
  ),
  
  /**
   * High-performance middleware with caching
   */
  cached: compose(
    require('./errorHandler').withErrorHandler,
    require('./auth').withAuth,
    withCache({ ttl: 600000 }), // 10 minutes
    require('./organizationContextMiddleware').withOrganizationContext
  ),
  
  /**
   * Heavy operation middleware with retry and timeout
   */
  heavy: compose(
    require('./errorHandler').withErrorHandler,
    withTimeout(60000), // 1 minute
    withRetry({ maxRetries: 2 }),
    require('./auth').withAuth,
    require('./organizationContextMiddleware').withOrganizationContext
  )
};

module.exports = {
  compose,
  pipeline,
  when,
  skipFor,
  onlyFor,
  withRetry,
  withTimeout,
  withCache,
  withContext,
  commonMiddleware,
  cleanupCache
};
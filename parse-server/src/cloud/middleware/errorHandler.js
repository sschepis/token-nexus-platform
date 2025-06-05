/**
 * Error Handling Middleware for Parse Cloud Functions
 * Provides consistent error handling, logging, and response formatting
 */

/**
 * Error handling middleware - wraps handlers with consistent error handling
 * @param {Function} handler - The cloud function handler to wrap
 * @returns {Function} - Wrapped handler with error handling
 */
function withErrorHandler(handler) {
  return async (request) => {
    const { functionName } = request;
    const startTime = Date.now();
    
    try {
      console.log(`[ErrorHandler] Starting ${functionName}`);
      const result = await handler(request);
      
      const duration = Date.now() - startTime;
      console.log(`[ErrorHandler] Completed ${functionName} in ${duration}ms`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[ErrorHandler] Error in ${functionName} after ${duration}ms:`, error);
      
      // Handle different types of errors
      if (error instanceof Parse.Error) {
        // Already a Parse.Error, just re-throw
        throw error;
      } else if (error.name === 'ValidationError') {
        // Mongoose/validation errors
        throw new Parse.Error(
          Parse.Error.INVALID_QUERY,
          `Validation failed: ${error.message}`
        );
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        // Database connection errors
        throw new Parse.Error(
          Parse.Error.CONNECTION_FAILED,
          'Database connection failed. Please try again later.'
        );
      } else if (error.code === 11000) {
        // MongoDB duplicate key error
        throw new Parse.Error(
          Parse.Error.DUPLICATE_VALUE,
          'A record with this value already exists.'
        );
      } else {
        // Generic error - don't expose internal details
        console.error(`[ErrorHandler] Unexpected error in ${functionName}:`, error);
        throw new Parse.Error(
          Parse.Error.INTERNAL_SERVER_ERROR,
          'An unexpected error occurred. Please try again later.'
        );
      }
    }
  };
}

/**
 * Audit logging middleware - logs function calls for audit purposes
 * @param {Object} options - Audit options
 * @returns {Function} - Middleware function
 */
function withAuditLog(options = {}) {
  const {
    logParams = false,
    logResult = false,
    sensitiveFields = ['password', 'token', 'secret', 'key']
  } = options;
  
  return function(handler) {
    return async (request) => {
      const { user, params, functionName, ip } = request;
      const startTime = Date.now();
      
      // Create audit log entry
      const auditData = {
        functionName,
        userId: user?.id,
        userEmail: user?.get('email'),
        organizationId: request.organizationId,
        ipAddress: ip,
        timestamp: new Date(),
        params: logParams ? sanitizeParams(params, sensitiveFields) : undefined
      };
      
      try {
        const result = await handler(request);
        
        // Log successful execution
        auditData.status = 'success';
        auditData.duration = Date.now() - startTime;
        auditData.result = logResult ? sanitizeParams(result, sensitiveFields) : undefined;
        
        await logAuditEvent(auditData);
        
        return result;
      } catch (error) {
        // Log error execution
        auditData.status = 'error';
        auditData.duration = Date.now() - startTime;
        auditData.error = {
          code: error.code,
          message: error.message
        };
        
        await logAuditEvent(auditData);
        
        throw error;
      }
    };
  };
}

/**
 * Performance monitoring middleware
 * @param {Object} options - Monitoring options
 * @returns {Function} - Middleware function
 */
function withPerformanceMonitoring(options = {}) {
  const {
    slowThreshold = 5000, // 5 seconds
    logSlowQueries = true
  } = options;
  
  return function(handler) {
    return async (request) => {
      const { functionName } = request;
      const startTime = Date.now();
      const startMemory = process.memoryUsage();
      
      try {
        const result = await handler(request);
        
        const duration = Date.now() - startTime;
        const endMemory = process.memoryUsage();
        const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
        
        // Log performance metrics
        const perfData = {
          functionName,
          duration,
          memoryDelta,
          timestamp: new Date()
        };
        
        if (duration > slowThreshold && logSlowQueries) {
          console.warn(`[Performance] Slow function detected: ${functionName} took ${duration}ms`);
        }
        
        console.log(`[Performance] ${functionName}: ${duration}ms, memory: ${formatBytes(memoryDelta)}`);
        
        // Store performance metrics (could be sent to monitoring service)
        await logPerformanceMetrics(perfData);
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.log(`[Performance] ${functionName} failed after ${duration}ms`);
        throw error;
      }
    };
  };
}

/**
 * Sanitize parameters by removing sensitive fields
 * @param {Object} obj - Object to sanitize
 * @param {string[]} sensitiveFields - Fields to remove
 * @returns {Object} - Sanitized object
 */
function sanitizeParams(obj, sensitiveFields) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = { ...obj };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Log audit event to database
 * @param {Object} auditData - Audit data to log
 */
async function logAuditEvent(auditData) {
  try {
    const AuditLog = Parse.Object.extend('AuditLog');
    const auditLog = new AuditLog();
    
    auditLog.set('eventType', 'cloud_function');
    auditLog.set('description', `Cloud function ${auditData.functionName} executed`);
    auditLog.set('userId', auditData.userId);
    auditLog.set('userEmail', auditData.userEmail);
    auditLog.set('organizationId', auditData.organizationId);
    auditLog.set('ipAddress', auditData.ipAddress);
    auditLog.set('severity', auditData.status === 'error' ? 'medium' : 'low');
    auditLog.set('metadata', {
      functionName: auditData.functionName,
      status: auditData.status,
      duration: auditData.duration,
      params: auditData.params,
      result: auditData.result,
      error: auditData.error
    });
    
    await auditLog.save(null, { useMasterKey: true });
  } catch (error) {
    console.error('[ErrorHandler] Failed to log audit event:', error);
    // Don't throw - audit logging failure shouldn't break the main function
  }
}

/**
 * Log performance metrics
 * @param {Object} perfData - Performance data to log
 */
async function logPerformanceMetrics(perfData) {
  try {
    // This could be sent to a monitoring service like DataDog, New Relic, etc.
    // For now, just log to console and optionally store in database
    
    if (perfData.duration > 1000) { // Only store metrics for functions taking > 1 second
      const PerformanceMetric = Parse.Object.extend('PerformanceMetric');
      const metric = new PerformanceMetric();
      
      metric.set('functionName', perfData.functionName);
      metric.set('duration', perfData.duration);
      metric.set('memoryDelta', perfData.memoryDelta);
      metric.set('timestamp', perfData.timestamp);
      
      await metric.save(null, { useMasterKey: true });
    }
  } catch (error) {
    console.error('[ErrorHandler] Failed to log performance metrics:', error);
    // Don't throw - metrics logging failure shouldn't break the main function
  }
}

/**
 * Format bytes to human readable string
 * @param {number} bytes - Bytes to format
 * @returns {string} - Formatted string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Create standardized error response
 * @param {Error} error - Error to format
 * @param {string} functionName - Function name
 * @returns {Object} - Formatted error response
 */
function formatErrorResponse(error, functionName) {
  const response = {
    success: false,
    error: {
      code: error.code || Parse.Error.INTERNAL_SERVER_ERROR,
      message: error.message || 'An unexpected error occurred'
    },
    functionName,
    timestamp: new Date().toISOString()
  };
  
  // Add additional error details in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
  }
  
  return response;
}

/**
 * Create standardized success response
 * @param {*} data - Response data
 * @param {string} functionName - Function name
 * @returns {Object} - Formatted success response
 */
function formatSuccessResponse(data, functionName) {
  return {
    success: true,
    data,
    functionName,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  withErrorHandler,
  withAuditLog,
  withPerformanceMonitoring,
  sanitizeParams,
  logAuditEvent,
  logPerformanceMetrics,
  formatErrorResponse,
  formatSuccessResponse,
  formatBytes
};
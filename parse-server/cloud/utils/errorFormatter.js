/**
 * Utility function to format Parse errors for nicer display
 * @param {Error} error - The error object from Parse
 * @returns {string} Formatted error message
 */
function formatError(error) {
  if (!error) return 'Unknown error occurred';
  
  // Check if it's a Parse error with a code
  if (error.code) {
    switch (error.code) {
      case 103:
        return `Class already exists: ${error.message}`;
      case 102:
        return `Index already exists: ${error.message}`;
      case 101:
        return `Object not found: ${error.message}`;
      case 141:
        return `Duplicate value detected: ${error.message}`;
      case 202:
        return `Username taken: ${error.message}`;
      case 203:
        return `Email taken: ${error.message}`;
      default:
        return `${error.message} (Code: ${error.code})`;
    }
  }
  
  // For other errors, just return the message or stringified error
  return error.message || String(error);
}

/**
 * Parse server error response wrapper
 * Formats errors and logs them consistently
 * @param {Error} error - The error to format
 * @param {string} context - Where the error occurred for logging
 * @returns {Object} Formatted error response
 */
function errorResponse(error, context = 'Parse Server') {
  const formattedMessage = formatError(error);
  console.error(`[Error in ${context}]: ${formattedMessage}`, error);
  
  return {
    success: false,
    error: formattedMessage,
    // Avoid returning internal stack traces to clients
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };
}

/**
 * Creates a progress logger for tracking schema initialization
 * @param {number} total - Total number of items to track
 * @returns {Object} Progress logger with progress method
 */
function createProgressLogger(total) {
  let completed = 0;
  let startTime = null;
  
  return {
    start: function() {
      startTime = Date.now();
      console.log(`[Schema Progress] Starting initialization of ${total} schemas...`);
    },
    
    progress: function(itemName, status = 'completed') {
      completed++;
      const percentage = Math.round((completed / total) * 100);
      console.log(`[Schema Progress] ${itemName}: ${status} (${completed}/${total} - ${percentage}%)`);
    },
    
    complete: function(successCount, skippedCount, failedCount) {
      const endTime = Date.now();
      const duration = startTime ? Math.round((endTime - startTime) / 1000) : 0;
      
      console.log(`[Schema Progress] Completed in ${duration}s:`);
      console.log(`  ✅ Success: ${successCount}`);
      console.log(`  ⏭️  Skipped: ${skippedCount}`);
      console.log(`  ❌ Failed: ${failedCount}`);
    }
  };
}

/**
 * Formats schema-specific errors with additional context
 * @param {Error} error - The schema error
 * @param {string} className - The class name where error occurred
 * @returns {string} Formatted error message
 */
function formatSchemaError(error, className) {
  const baseMessage = formatError(error);
  return `Schema error in ${className}: ${baseMessage}`;
}

/**
 * Logs errors with optional verbose mode and prefix
 * @param {string} message - The error message to log
 * @param {Object} options - Logging options
 * @param {boolean} options.verbose - Whether to log in verbose mode
 * @param {string} options.prefix - Prefix for the log message
 */
function logError(message, options = {}) {
  const { verbose = false, prefix = '[Error]' } = options;
  
  if (verbose) {
    console.error(`${prefix} ${message}`);
  }
}

module.exports = {
  formatError,
  errorResponse,
  createProgressLogger,
  formatSchemaError,
  logError
};
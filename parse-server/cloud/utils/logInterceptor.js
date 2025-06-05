/**
 * Log interceptor to clean up Parse Server's verbose error logging
 */

class LogInterceptor {
  constructor() {
    this.originalConsoleError = console.error;
    this.originalConsoleLog = console.log;
    this.originalConsoleWarn = console.warn;
    this.isIntercepting = false;
  }

  /**
   * Start intercepting console logs
   */
  start() {
    if (this.isIntercepting) return;
    
    this.isIntercepting = true;
    
    // Intercept console.error
    console.error = (...args) => {
      const message = args.join(' ');
      
      // Skip Parse Server's verbose error stack traces for benign errors
      if (this.shouldSkipError(message)) {
        return;
      }
      
      this.originalConsoleError.apply(console, args);
    };
    
    // Intercept console.log
    console.log = (...args) => {
      const message = args.join(' ');
      
      // Skip Parse Server's HTTP logs for schema operations that result in errors
      if (this.shouldSkipLog(message)) {
        return;
      }
      
      this.originalConsoleLog.apply(console, args);
    };
    
    // Intercept console.warn
    console.warn = (...args) => {
      const message = args.join(' ');
      
      // Skip verbose warnings
      if (this.shouldSkipWarn(message)) {
        return;
      }
      
      this.originalConsoleWarn.apply(console, args);
    };
  }

  /**
   * Stop intercepting console logs
   */
  stop() {
    if (!this.isIntercepting) return;
    
    console.error = this.originalConsoleError;
    console.log = this.originalConsoleLog;
    console.warn = this.originalConsoleWarn;
    this.isIntercepting = false;
  }

  /**
   * Check if an error message should be skipped
   */
  shouldSkipError(message) {
    const skipPatterns = [
      // Skip "Class already exists" errors
      /error: Class \w+ already exists\./,
      // Skip "Index already exists" errors
      /error: Index \w+ exists, cannot update\./,
      // Skip stack traces for these errors
      /Error: Class \w+ already exists\.\n\s+at/,
      /Error: Index \w+ exists, cannot update\.\n\s+at/,
      // Skip SchemaController errors
      /at SchemaController\./,
      /at internalCreateSchema/,
      /at internalUpdateSchema/,
    ];
    
    return skipPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Check if a log message should be skipped
   */
  shouldSkipLog(message) {
    const skipPatterns = [
      // Skip HTTP logs for failed schema operations
      /http: (POST|PUT) \/schemas\/\w+ 400/,
      // Skip verbose schema operation logs
      /Class \w+ already exists\. Attempting to update\.\.\./,
      /Warning during schema update for \w+: Index already exists/,
    ];
    
    return skipPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Check if a warning message should be skipped
   */
  shouldSkipWarn(message) {
    const skipPatterns = [
      // Skip index-related warnings during schema updates
      /Warning during schema update.*Index already exists/,
    ];
    
    return skipPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Run a function with log interception
   */
  async withInterception(fn) {
    this.start();
    try {
      const result = await fn();
      return result;
    } finally {
      this.stop();
    }
  }
}

// Export a singleton instance
module.exports = new LogInterceptor();
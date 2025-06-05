/**
 * Logger Utility
 * Provides consistent logging across the application
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  startup: 2, // Same level as info
  shutdown: 2, // Same level as info
  init: 2, // Same level as info
  cloud: 2, // Same level as info
};

// Define level colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
  startup: 'cyan',
  shutdown: 'cyan',
  init: 'cyan',
  cloud: 'blue',
};

// Add colors to Winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  // Add timestamp
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  // Add error stack traces
  winston.format.errors({ stack: true }),
  // Add colorization for console
  winston.format.colorize({ all: true }),
  // Define the format
  winston.format.printf(
    info =>
      `${info.timestamp} ${info.level}: ${info.message}${
        info.metadata ? ' ' + JSON.stringify(info.metadata) : ''
      }${info.stack ? '\n' + info.stack : ''}`
  )
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(
          info =>
            `${info.timestamp} ${info.level}: ${info.message}${
              info.metadata ? ' ' + JSON.stringify(info.metadata) : ''
            }${info.stack ? '\n' + info.stack : ''}`
        )
      ),
    }),
    // Error log file transport
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(winston.format.uncolorize(), winston.format.json()),
    }),
    // Combined log file transport
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(winston.format.uncolorize(), winston.format.json()),
    }),
    // Server startup log file transport
    new winston.transports.File({
      filename: path.join(logsDir, 'startup.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(winston.format.uncolorize(), winston.format.json()),
    }),
  ],
  // Handle uncaught exceptions and unhandled rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(winston.format.uncolorize(), winston.format.json()),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(winston.format.uncolorize(), winston.format.json()),
    }),
  ],
});

// Add request logger middleware
logger.requestLogger = (req, res, next) => {
  // Don't log health check requests
  if (req.path === '/health') {
    return next();
  }

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.http(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`, {
      metadata: {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    });
  });
  next();
};

// Add error logger middleware
logger.errorLogger = (err, req, res, next) => {
  logger.error('Request error', {
    metadata: {
      error: err.message,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
    stack: err.stack,
  });
  next(err);
};

// Add performance logger
logger.performance = (label, duration, metadata = {}) => {
  logger.info(`Performance: ${label} took ${duration}ms`, {
    metadata: {
      ...metadata,
      label,
      duration,
      timestamp: new Date().toISOString(),
    },
  });
};

// Add audit logger
logger.audit = (action, user, details = {}) => {
  logger.info(`Audit: ${action}`, {
    metadata: {
      action,
      userId: user?.id || 'anonymous',
      username: user?.get('username'),
      ...details,
      timestamp: new Date().toISOString(),
    },
  });
};

// Add security logger
logger.security = (event, details = {}) => {
  logger.warn(`Security: ${event}`, {
    metadata: {
      event,
      ...details,
      timestamp: new Date().toISOString(),
    },
  });
};

// Development helper for debugging objects
logger.debug = (message, obj = null) => {
  if (process.env.NODE_ENV === 'development') {
    if (obj) {
      console.log('\n' + message + ':', obj, '\n');
    } else {
      console.log('\n' + message + '\n');
    }
  }
};

// Add startup logging
logger.startup = (phase, message, metadata = {}) => {
  logger.info(`Startup [${phase}]: ${message}`, {
    metadata: {
      phase,
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  });
};

// Add initialization logging
logger.init = (component, message, metadata = {}) => {
  logger.info(`Init [${component}]: ${message}`, {
    metadata: {
      component,
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  });
};

// Add cloud logging
logger.cloud = (phase, message, metadata = {}) => {
  logger.info(`Cloud [${phase}]: ${message}`, {
    metadata: {
      phase,
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  });
};

// Add shutdown logging
logger.shutdown = (component, message, metadata = {}) => {
  logger.info(`Shutdown [${component}]: ${message}`, {
    metadata: {
      component,
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  });
};

// Add timing functionality
logger.time = label => {
  const start = process.hrtime();

  return {
    end: () => {
      const diff = process.hrtime(start);
      const duration = (diff[0] * 1e9 + diff[1]) / 1e6; // Convert to milliseconds

      logger.performance(label, duration);

      return duration;
    },
  };
};

// Export logger instance
module.exports = logger;

/**
 * Logging Service
 * Handles centralized logging, error tracking, and monitoring
 */

const winston = require('winston');
const { format } = winston;
const config = require('../config');

class LoggingService {
  constructor() {
    // Default configuration if none provided
    const defaultConfig = {
      enabled: true,
      errorTracking: {
        enabled: false,
      },
      monitoring: {
        enabled: false,
        cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
        retention: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
      categories: {
        system: { level: 'info' },
        analytics: { level: 'info' },
        security: { level: 'warn' },
        performance: { level: 'info' },
      },
    };

    this.config = config.logging || defaultConfig;
    this.initialized = false;
    this.loggers = new Map();
    this.metrics = new Map();
  }

  /**
   * Initialize the logging service
   */
  async initialize() {
    try {
      // Initialize loggers for different components
      Object.keys(this.config.categories || {}).forEach(category => {
        this._initializeLogger(category, {
          level: this.config.categories[category].level || 'info',
          format: this._getLogFormat(category),
          transports: this._getTransports(category),
        });
      });

      // Initialize error tracking if enabled
      if (this.config.errorTracking?.enabled) {
        this._initializeErrorTracking();
      }

      // Initialize metrics collection if enabled
      if (this.config.monitoring?.enabled) {
        this._initializeMetrics();
      }

      this.initialized = true;
      this.log('system', 'info', 'Logging service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize logging service:', error);
      // Don't throw error, just mark as not initialized
      this.initialized = false;
    }
  }

  /**
   * Log message
   * @param {string} category Log category
   * @param {string} level Log level
   * @param {string} message Log message
   * @param {Object} meta Additional metadata
   */
  log(category, level, message, meta = {}) {
    // If not initialized, fall back to console
    if (!this.initialized) {
      console[level](`[${category}] ${message}`, meta);
      return;
    }

    const logger = this.loggers.get(category);
    if (!logger) {
      console[level](`[${category}] ${message}`, meta);
      return;
    }

    logger.log(level, message, {
      timestamp: new Date(),
      category,
      ...meta,
    });
  }

  /**
   * Track error
   * @param {Error} error Error object
   * @param {Object} context Error context
   */
  trackError(error, context = {}) {
    // If not initialized, fall back to console
    if (!this.initialized) {
      console.error(error, context);
      return;
    }

    const errorLog = {
      timestamp: new Date(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: {
        ...context,
        environment: process.env.NODE_ENV,
      },
    };

    // Log error
    this.log('system', 'error', error.message, errorLog);

    // Track in error monitoring service if configured
    if (this.config.errorTracking?.enabled) {
      this._sendToErrorTracker(errorLog);
    }
  }

  /**
   * Record metric
   * @param {string} name Metric name
   * @param {number} value Metric value
   * @param {Object} tags Metric tags
   */
  recordMetric(name, value, tags = {}) {
    // If not initialized, fall back to console
    if (!this.initialized) {
      console.log('Metric:', { name, value, tags });
      return;
    }

    const metric = {
      timestamp: Date.now(),
      name,
      value,
      tags,
    };

    // Store metric
    const metrics = this.metrics.get(name) || [];
    metrics.push(metric);
    this.metrics.set(name, metrics);

    // Log metric
    this.log('performance', 'info', `Metric recorded: ${name}`, metric);

    // Send to monitoring service if configured
    if (this.config.monitoring?.enabled) {
      this._sendToMonitoring(metric);
    }
  }

  /**
   * Get metrics for time range
   * @param {string} name Metric name
   * @param {number} start Start timestamp
   * @param {number} end End timestamp
   * @returns {Array} Metrics in time range
   */
  getMetrics(name, start, end) {
    const metrics = this.metrics.get(name) || [];
    return metrics.filter(m => m.timestamp >= start && m.timestamp <= end);
  }

  /**
   * Initialize logger
   * @param {string} category Logger category
   * @param {Object} options Logger options
   * @private
   */
  _initializeLogger(category, options) {
    const logger = winston.createLogger({
      level: options.level,
      format: options.format,
      transports: options.transports,
      exitOnError: false,
    });

    this.loggers.set(category, logger);
  }

  /**
   * Get log format for category
   * @param {string} category Logger category
   * @returns {Object} Winston format
   * @private
   */
  _getLogFormat(category) {
    return format.combine(
      format.timestamp(),
      format.json(),
      format.metadata(),
      format.label({ label: category }),
      format.printf(({ timestamp, level, message, label, metadata }) => {
        return JSON.stringify({
          timestamp,
          level,
          label,
          message,
          ...metadata,
        });
      })
    );
  }

  /**
   * Get transports for category
   * @param {string} category Logger category
   * @returns {Array} Winston transports
   * @private
   */
  _getTransports(category) {
    const transports = [
      new winston.transports.File({
        filename: `logs/${category}-error.log`,
        level: 'error',
      }),
      new winston.transports.File({
        filename: `logs/${category}-combined.log`,
      }),
    ];

    // Add console transport in development
    if (process.env.NODE_ENV !== 'production') {
      transports.push(
        new winston.transports.Console({
          format: format.combine(format.colorize(), format.simple()),
        })
      );
    }

    return transports;
  }

  /**
   * Initialize error tracking
   * @private
   */
  _initializeErrorTracking() {
    // Initialize error tracking service (e.g., Sentry)
    // This is a placeholder for actual implementation
    this._errorTracker = {
      captureError: error => {
        console.log('Error tracked:', error);
      },
    };
  }

  /**
   * Initialize metrics collection
   * @private
   */
  _initializeMetrics() {
    // Initialize metrics collection service (e.g., StatsD)
    // This is a placeholder for actual implementation
    this._monitoring = {
      recordMetric: metric => {
        console.log('Metric recorded:', metric);
      },
    };

    // Start metrics cleanup interval
    const cleanupInterval = this.config.monitoring?.cleanupInterval || 24 * 60 * 60 * 1000;
    setInterval(() => {
      this._cleanupOldMetrics();
    }, cleanupInterval);
  }

  /**
   * Send error to error tracking service
   * @param {Object} errorLog Error log
   * @private
   */
  _sendToErrorTracker(errorLog) {
    if (this._errorTracker) {
      this._errorTracker.captureError(errorLog);
    }
  }

  /**
   * Send metric to monitoring service
   * @param {Object} metric Metric data
   * @private
   */
  _sendToMonitoring(metric) {
    if (this._monitoring) {
      this._monitoring.recordMetric(metric);
    }
  }

  /**
   * Clean up old metrics
   * @private
   */
  _cleanupOldMetrics() {
    const retention = this.config.monitoring?.retention || 7 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - retention;

    for (const [name, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp > cutoff);
      this.metrics.set(name, filtered);
    }
  }

  /**
   * Stop logging service
   */
  stop() {
    for (const logger of this.loggers.values()) {
      logger.close();
    }
    this.initialized = false;
  }
}

module.exports = new LoggingService();

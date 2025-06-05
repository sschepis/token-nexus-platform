/**
 * Base Service Class
 * Provides common functionality for all services
 */

const { createHash } = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

class BaseService {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.config = config[serviceName.toLowerCase()];
    this.initialized = false;
    this.dependencies = new Map();
    this._cleanupHandlers = new Set();
  }

  /**
   * Register a service dependency
   * @param {string} name Dependency name
   * @param {Object} service Service instance
   */
  registerDependency(name, service) {
    this.dependencies.set(name, service);
  }

  /**
   * Get a registered dependency
   * @param {string} name Dependency name
   * @returns {Object} Service instance
   */
  getDependency(name) {
    const service = this.dependencies.get(name);
    if (!service) {
      throw new Error(`Dependency ${name} not registered for ${this.serviceName}`);
    }
    return service;
  }

  /**
   * Register a cleanup handler
   * @param {Function} handler Cleanup function
   */
  registerCleanup(handler) {
    this._cleanupHandlers.add(handler);
  }

  /**
   * Initialize the service
   * @param {Object} options Initialization options
   */
  async initialize(options = {}) {
    if (!this.config?.enabled) {
      logger.info(`${this.serviceName} service is disabled`);
      return;
    }

    try {
      await this._initializeService(options);
      this.initialized = true;
      logger.info(`${this.serviceName} service initialized successfully`);
    } catch (error) {
      logger.error(`Failed to initialize ${this.serviceName} service:`, {
        metadata: {
          service: this.serviceName,
          error: error.message,
        },
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Shutdown the service
   */
  async shutdown() {
    try {
      for (const handler of this._cleanupHandlers) {
        await handler();
      }
      this.initialized = false;
      logger.info(`${this.serviceName} service shut down successfully`);
    } catch (error) {
      logger.error(`Error during ${this.serviceName} service shutdown:`, {
        metadata: {
          service: this.serviceName,
          error: error.message,
        },
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Execute a function with error handling, logging, and performance tracking
   * @param {Function} fn Function to execute
   * @param {string} operation Name of the operation for logging
   * @param {Object} context Additional context for logging
   * @returns {Promise<any>} Result of the function
   * @throws {Error} Standardized error
   */
  async executeOperation(fn, operation, context = {}) {
    this.validateInitialization();
    const startTime = Date.now();

    try {
      const result = await fn();

      // Log successful operation with performance metrics
      logger.info(`${this.serviceName} ${operation} completed`, {
        metadata: {
          service: this.serviceName,
          operation,
          duration: Date.now() - startTime,
          ...context,
        },
      });

      return result;
    } catch (error) {
      // Log error with details
      logger.error(`${this.serviceName} ${operation} failed`, {
        metadata: {
          service: this.serviceName,
          operation,
          error: error.message,
          code: error.code,
          duration: Date.now() - startTime,
          ...context,
        },
        stack: error.stack,
      });

      throw error;
    }
  }

  /**
   * Generate cache key
   * @param {string} operation Operation name
   * @param {Object|string} params Operation parameters
   * @returns {string} Cache key
   */
  generateCacheKey(operation, params) {
    const hash = createHash('md5')
      .update(typeof params === 'string' ? params : JSON.stringify(params))
      .digest('hex');
    return `${this.serviceName.toLowerCase()}:${operation}:${hash}`;
  }

  /**
   * Handle service error
   * @param {Error} error Error object
   * @param {string} operation Operation name
   * @returns {Error} Processed error
   */
  handleError(error, operation) {
    logger.error(`${this.serviceName} ${operation} failed:`, {
      metadata: {
        service: this.serviceName,
        operation,
        error: error.message,
        status: error.response?.status,
      },
      stack: error.stack,
    });

    if (error.response?.status === 429) {
      return new Error(`${this.serviceName} service rate limit exceeded. Please try again later.`);
    }
    if (error.response?.status === 500) {
      return new Error(
        `${this.serviceName} service is temporarily unavailable. Please try again later.`
      );
    }

    return error;
  }

  /**
   * Validate service initialization
   */
  validateInitialization() {
    if (!this.initialized) {
      throw new Error(`${this.serviceName} service is not initialized`);
    }
  }

  /**
   * Service-specific initialization logic
   * @param {Object} options Initialization options
   */
  async _initializeService(options) {
    throw new Error('_initializeService must be implemented by derived class');
  }
}

module.exports = BaseService;

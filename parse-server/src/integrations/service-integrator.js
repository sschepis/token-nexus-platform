const axios = require('axios');
const { logger } = require('../utils/logger');
const { validateService } = require('../utils/validation');
const { ServiceError } = require('../utils/errors');

/**
 * Manages integration with third-party services
 */
class ServiceIntegrator {
  constructor() {
    this.services = new Map();
    this.adapters = new Map();
    this.eventHandlers = new Map();
  }

  /**
   * Register a new service integration
   * @param {Object} options Service configuration
   * @param {string} options.name Service identifier
   * @param {string} options.type Service type (e.g., 'storage', 'analytics')
   * @param {Object} options.config Service configuration
   * @param {Object} options.adapter Service adapter implementation
   * @return {Promise<void>}
   */
  async registerService(options) {
    const { name, type, config, adapter } = options;

    if (this.services.has(name)) {
      throw new ServiceError('SERVICE_EXISTS', `Service ${name} is already registered`);
    }

    try {
      // Validate service configuration
      const validationResult = await validateService(config, type);

      if (!validationResult.isValid) {
        throw new Error(`Invalid service configuration: ${validationResult.errors.join(', ')}`);
      }

      // Initialize service adapter
      const serviceAdapter = await this.initializeAdapter(adapter, config);

      // Register service
      this.services.set(name, {
        name,
        type,
        config,
        adapter: serviceAdapter,
        status: 'active',
        registeredAt: new Date().toISOString(),
      });

      // Set up event handlers
      this.setupEventHandlers(name, adapter.events || {});

      logger.info('Service registered successfully', {
        service: name,
        type,
      });
    } catch (error) {
      logger.error('Service registration failed', {
        service: name,
        error: error.message,
      });
      throw new ServiceError('SERVICE_REGISTRATION_FAILED', error.message);
    }
  }

  /**
   * Initialize service adapter
   * @param {Object} adapter Adapter implementation
   * @param {Object} config Service configuration
   * @return {Promise<Object>} Initialized adapter
   */
  async initializeAdapter(adapter, config) {
    // Create HTTP client if needed
    if (adapter.useHttp) {
      adapter.client = axios.create({
        baseURL: config.baseUrl,
        headers: this.buildHeaders(config.auth),
      });
    }

    // Initialize adapter
    if (adapter.initialize) {
      await adapter.initialize(config);
    }

    return adapter;
  }

  /**
   * Set up event handlers for service
   * @param {string} serviceName Service identifier
   * @param {Object} handlers Event handlers
   */
  setupEventHandlers(serviceName, handlers) {
    if (!this.eventHandlers.has(serviceName)) {
      this.eventHandlers.set(serviceName, new Map());
    }

    const serviceHandlers = this.eventHandlers.get(serviceName);

    for (const [event, handler] of Object.entries(handlers)) {
      serviceHandlers.set(event, handler);
    }
  }

  /**
   * Execute service operation
   * @param {Object} options Operation options
   * @param {string} options.service Service identifier
   * @param {string} options.operation Operation name
   * @param {Object} options.params Operation parameters
   * @param {Object} options.context Execution context
   * @return {Promise<any>} Operation result
   */
  async executeOperation(options) {
    const { service, operation, params = {}, context = {} } = options;
    const serviceInstance = this.getService(service);

    try {
      // Validate operation parameters
      await this.validateOperationParams(serviceInstance, operation, params);

      // Execute operation
      const result = await serviceInstance.adapter[operation](params, context);

      // Log operation
      await this.logOperation({
        service,
        operation,
        params,
        context,
        result,
        status: 'success',
      });

      return result;
    } catch (error) {
      // Log error
      await this.logOperation({
        service,
        operation,
        params,
        context,
        error: error.message,
        status: 'error',
      });

      throw new ServiceError('OPERATION_FAILED', error.message);
    }
  }

  /**
   * Handle service event
   * @param {Object} options Event options
   * @param {string} options.service Service identifier
   * @param {string} options.event Event name
   * @param {Object} options.data Event data
   * @param {Object} options.context Event context
   * @return {Promise<void>}
   */
  async handleEvent(options) {
    const { service, event, data, context = {} } = options;

    const handlers = this.eventHandlers.get(service);

    if (!handlers || !handlers.has(event)) {
      logger.warn('No handler registered for event', {
        service,
        event,
      });

      return;
    }

    try {
      const handler = handlers.get(event);

      await handler(data, context);

      logger.info('Event handled successfully', {
        service,
        event,
      });
    } catch (error) {
      logger.error('Event handler failed', {
        service,
        event,
        error: error.message,
      });
      throw new ServiceError('EVENT_HANDLER_FAILED', error.message);
    }
  }

  /**
   * Get service instance
   * @param {string} name Service identifier
   * @return {Object} Service instance
   */
  getService(name) {
    const service = this.services.get(name);

    if (!service) {
      throw new ServiceError('SERVICE_NOT_FOUND', `Service ${name} not found`);
    }

    return service;
  }

  /**
   * Validate operation parameters
   * @param {Object} service Service instance
   * @param {string} operation Operation name
   * @param {Object} params Operation parameters
   * @return {Promise<void>}
   */
  async validateOperationParams(service, operation, params) {
    const schema = service.adapter.schemas?.[operation];

    if (!schema) return;

    const validationResult = await validateService(params, schema);

    if (!validationResult.isValid) {
      throw new Error(`Invalid parameters: ${validationResult.errors.join(', ')}`);
    }
  }

  /**
   * Build HTTP headers
   * @param {Object} auth Authentication configuration
   * @return {Object} Headers object
   */
  buildHeaders(auth) {
    const headers = {};

    if (!auth) return headers;

    switch (auth.type) {
      case 'bearer':
        headers.Authorization = `Bearer ${auth.token}`;
        break;
      case 'apiKey':
        headers[auth.header || 'X-API-Key'] = auth.key;
        break;
      case 'basic':
        headers.Authorization = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString(
          'base64'
        )}`;
        break;
    }

    return headers;
  }

  /**
   * Log service operation
   * @param {Object} options Log options
   * @return {Promise<void>}
   */
  logOperation(options) {
    const { service, operation, params, context, result, error, status } = options;

    logger.info('Service operation', {
      service,
      operation,
      params,
      context: this.sanitizeContext(context),
      result: status === 'success' ? result : undefined,
      error: status === 'error' ? error : undefined,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Sanitize context for logging
   * @param {Object} context Operation context
   * @return {Object} Sanitized context
   */
  sanitizeContext(context) {
    const { ...safeContext } = context;

    return safeContext;
  }

  /**
   * Get service status
   * @param {string} name Service identifier
   * @return {Promise<Object>} Service status
   */
  async getServiceStatus(name) {
    const service = this.getService(name);

    try {
      const status = (await service.adapter.checkStatus?.()) || 'unknown';

      return {
        name: service.name,
        type: service.type,
        status,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        name: service.name,
        type: service.type,
        status: 'error',
        error: error.message,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Get all registered services
   * @return {Object[]} List of services
   */
  listServices() {
    return Array.from(this.services.values()).map(service => ({
      name: service.name,
      type: service.type,
      status: service.status,
      registeredAt: service.registeredAt,
    }));
  }
}

module.exports = new ServiceIntegrator();

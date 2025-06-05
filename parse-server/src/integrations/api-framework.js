const axios = require('axios');
const { logger } = require('../utils/logger');
const { APIError } = require('../utils/errors');
const { validateSchema } = require('../utils/validation');

/**
 * Framework for integrating with external APIs
 */
class APIFramework {
  constructor() {
    this.integrations = new Map();
    this.schemas = new Map();
    this.clients = new Map();
    this.middlewares = new Map();
  }

  /**
   * Register an API integration
   * @param {Object} options Integration configuration
   * @param {string} options.name Integration identifier
   * @param {Object} options.config API configuration
   * @param {Object} options.schema API schema definition
   * @param {Object} options.middleware Request/response middleware
   * @return {Promise<void>}
   */
  async registerAPI(options) {
    const { name, config, schema, middleware = {} } = options;

    if (this.integrations.has(name)) {
      throw new APIError('API_EXISTS', `API ${name} is already registered`);
    }

    try {
      // Validate schema
      await validateSchema(schema);

      // Create HTTP client
      const client = this.createClient(config);

      // Store integration
      this.integrations.set(name, {
        name,
        config,
        status: 'active',
        registeredAt: new Date().toISOString(),
      });

      this.schemas.set(name, schema);
      this.clients.set(name, client);
      this.middlewares.set(name, middleware);

      logger.info('API integration registered', { api: name });
    } catch (error) {
      logger.error('API registration failed', {
        api: name,
        error: error.message,
      });
      throw new APIError('REGISTRATION_FAILED', error.message);
    }
  }

  /**
   * Create configured HTTP client
   * @param {Object} config API configuration
   * @return {Object} Axios instance
   */
  createClient(config) {
    const { baseURL, headers = {}, timeout = 30000, auth, ...rest } = config;

    return axios.create({
      baseURL,
      headers: this.buildHeaders(headers, auth),
      timeout,
      ...rest,
    });
  }

  /**
   * Build request headers
   * @param {Object} headers Base headers
   * @param {Object} auth Authentication config
   * @return {Object} Combined headers
   */
  buildHeaders(headers, auth) {
    const authHeaders = {};

    if (auth) {
      switch (auth.type) {
        case 'bearer':
          authHeaders.Authorization = `Bearer ${auth.token}`;
          break;
        case 'basic':
          authHeaders.Authorization = `Basic ${Buffer.from(
            `${auth.username}:${auth.password}`
          ).toString('base64')}`;
          break;
        case 'apiKey':
          authHeaders[auth.header || 'X-API-Key'] = auth.key;
          break;
      }
    }

    return { ...headers, ...authHeaders };
  }

  /**
   * Execute API operation
   * @param {Object} options Operation options
   * @param {string} options.api API identifier
   * @param {string} options.operation Operation name
   * @param {Object} options.params Operation parameters
   * @param {Object} options.context Execution context
   * @return {Promise<any>} Operation result
   */
  async execute(options) {
    const { api, operation, params = {}, context = {} } = options;

    const schema = this.schemas.get(api);
    const client = this.clients.get(api);
    const middleware = this.middlewares.get(api);

    try {
      // Validate operation
      const operationSchema = schema.operations[operation];

      if (!operationSchema) {
        throw new Error(`Unknown operation: ${operation}`);
      }

      // Validate parameters
      await this.validateParams(params, operationSchema.parameters);

      // Apply request middleware
      const processedParams = await this.applyMiddleware(middleware.beforeRequest, params, context);

      // Execute request
      const config = this.buildRequestConfig(operationSchema, processedParams);
      const response = await client.request(config);

      // Apply response middleware
      const result = await this.applyMiddleware(middleware.afterResponse, response.data, context);

      // Validate response
      await this.validateResponse(result, operationSchema.responses);

      return result;
    } catch (error) {
      logger.error('API operation failed', {
        api,
        operation,
        error: error.message,
      });

      // Apply error middleware
      if (middleware.onError) {
        await middleware.onError(error, context);
      }

      throw new APIError('OPERATION_FAILED', error.message);
    }
  }

  /**
   * Get API integration
   * @param {string} name API identifier
   * @return {Object} API integration
   */
  getIntegration(name) {
    const integration = this.integrations.get(name);

    if (!integration) {
      throw new APIError('API_NOT_FOUND', `API ${name} not found`);
    }

    return integration;
  }

  /**
   * Validate operation parameters
   * @param {Object} params Operation parameters
   * @param {Object} schema Parameter schema
   * @return {Promise<void>}
   */
  async validateParams(params, schema) {
    const result = await validateSchema(params, schema);

    if (!result.isValid) {
      throw new Error(`Invalid parameters: ${result.errors.join(', ')}`);
    }
  }

  /**
   * Validate operation response
   * @param {Object} response Operation response
   * @param {Object} schema Response schema
   * @return {Promise<void>}
   */
  async validateResponse(response, schema) {
    const result = await validateSchema(response, schema);

    if (!result.isValid) {
      throw new Error(`Invalid response: ${result.errors.join(', ')}`);
    }
  }

  /**
   * Apply middleware to request/response
   * @param {Function} middleware Middleware function
   * @param {any} data Data to process
   * @param {Object} context Execution context
   * @return {Promise<any>} Processed data
   */
  applyMiddleware(middleware, data, context) {
    if (!middleware) return data;

    return middleware(data, context);
  }

  /**
   * Build Axios request configuration
   * @param {Object} operation Operation schema
   * @param {Object} params Operation parameters
   * @return {Object} Request configuration
   */
  buildRequestConfig(operation, params) {
    const config = {
      method: operation.method,
      url: this.buildUrl(operation.path, params),
      ...this.extractRequestConfig(operation, params),
    };

    // Add query parameters
    if (operation.query) {
      config.params = this.extractParams(params, operation.query);
    }

    // Add request body
    if (operation.body) {
      config.data = this.extractParams(params, operation.body);
    }

    return config;
  }

  /**
   * Build URL with path parameters
   * @param {string} path URL path template
   * @param {Object} params Operation parameters
   * @return {string} Resolved URL
   */
  buildUrl(path, params) {
    return path.replace(/\{([^}]+)\}/g, (_, param) => {
      if (!params[param]) {
        throw new Error(`Missing required path parameter: ${param}`);
      }

      return encodeURIComponent(params[param]);
    });
  }

  /**
   * Extract request configuration from parameters
   * @param {Object} operation Operation schema
   * @param {Object} params Operation parameters
   * @return {Object} Request configuration
   */
  extractRequestConfig(operation, params) {
    const config = {};

    // Extract headers
    if (operation.headers) {
      config.headers = this.extractParams(params, operation.headers);
    }

    // Extract other configurations
    if (operation.config) {
      Object.assign(config, this.extractParams(params, operation.config));
    }

    return config;
  }

  /**
   * Extract parameters based on schema
   * @param {Object} params Source parameters
   * @param {Object} schema Parameter schema
   * @return {Object} Extracted parameters
   */
  extractParams(params, schema) {
    const result = {};

    for (const [key, def] of Object.entries(schema)) {
      if (params[key] !== undefined) {
        result[key] = params[key];
      } else if (def.default !== undefined) {
        result[key] = def.default;
      } else if (def.required) {
        throw new Error(`Missing required parameter: ${key}`);
      }
    }

    return result;
  }

  /**
   * List registered API integrations
   * @return {Object[]} List of integrations
   */
  listIntegrations() {
    return Array.from(this.integrations.values());
  }

  /**
   * Remove API integration
   * @param {string} name API identifier
   * @return {boolean} Whether integration was removed
   */
  removeIntegration(name) {
    if (!this.integrations.has(name)) {
      return false;
    }

    this.integrations.delete(name);
    this.schemas.delete(name);
    this.clients.delete(name);
    this.middlewares.delete(name);

    logger.info('API integration removed', { api: name });

    return true;
  }

  /**
   * Update API integration
   * @param {Object} options Updated configuration
   * @return {Promise<void>}
   */
  async updateIntegration(options) {
    const { name } = options;

    // Remove existing integration
    this.removeIntegration(name);

    // Register with new configuration
    await this.registerAPI(options);
  }
}

module.exports = new APIFramework();

/**
 * CMS Cloud Function Class
 * Manages cloud functions that can be stored in the database and loaded dynamically
 */

const { Schema } = require('../schema');

class CMSCloudFunction extends Schema {
  static className = 'CMSCloudFunction';

  static schema = {
    // Basic Info
    name: { type: 'String', required: true },
    description: { type: 'String' },
    status: {
      type: 'String',
      enum: ['active', 'inactive', 'error'],
      default: 'active',
    },

    // Function Code
    code: {
      type: 'String',
      required: true,
    },

    // Relationships
    application: { type: 'Pointer', targetClass: 'CMSApplication', required: true },
    createdBy: { type: 'Pointer', targetClass: '_User', required: true },

    // Function Configuration
    config: {
      type: 'Object',
      required: true,
      default: {
        timeout: 30, // seconds
        memory: 128, // MB
        async: true,
        requireMaster: false,
        requireUser: false,
        requiredRoles: [], // Array of role names required to execute
        rateLimit: {
          requests: 1000,
          period: 3600, // seconds
        },
      },
    },

    // Monitoring
    monitoring: {
      type: 'Object',
      default: {
        enabled: true,
        metrics: ['executions', 'failures', 'latency'],
        retention: 30, // days
      },
    },

    // Statistics
    stats: {
      type: 'Object',
      default: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        lastExecution: null,
        averageLatency: 0,
      },
    },

    // Metadata
    createdAt: { type: 'Date', required: true },
    updatedAt: { type: 'Date', required: true },
    lastExecuted: { type: 'Date' },
  };

  /**
   * Initialize cloud function
   */
  static async initialize(params) {
    const { name, description, code, application, createdBy, config = {} } = params;

    const cloudFunction = new CMSCloudFunction();
    cloudFunction.set('name', name);
    cloudFunction.set('description', description);
    cloudFunction.set('code', code);
    cloudFunction.set('application', application);
    cloudFunction.set('createdBy', createdBy);
    cloudFunction.set('config', {
      ...cloudFunction.get('config'),
      ...config,
    });

    return cloudFunction.save(null, { useMasterKey: true });
  }

  /**
   * Execute cloud function
   */
  async execute(params = {}, options = {}) {
    const startTime = Date.now();

    try {
      // Validate permissions
      await this.validatePermissions(options);

      // Check rate limit
      await this.checkRateLimit(options);

      // Create execution context
      const context = {
        params,
        user: options.user,
        master: options.useMasterKey,
        application: this.get('application'),
        function: this,
      };

      // Execute function code
      const func = new Function('Parse', 'context', this.get('code'));
      const result = await func(Parse, context);

      // Update statistics
      await this.updateStats({
        success: true,
        latency: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      // Update statistics
      await this.updateStats({
        success: false,
        latency: Date.now() - startTime,
      });

      // Log error
      await this.logError(error, params, options);

      throw error;
    }
  }

  /**
   * Validate execution permissions
   */
  async validatePermissions(options) {
    const config = this.get('config');

    // Check master key requirement
    if (config.requireMaster && !options.useMasterKey) {
      throw new Parse.Error(
        Parse.Error.OPERATION_FORBIDDEN,
        'Master key is required to execute this function'
      );
    }

    // Check user requirement
    if (config.requireUser && !options.user) {
      throw new Parse.Error(
        Parse.Error.OPERATION_FORBIDDEN,
        'User authentication is required to execute this function'
      );
    }

    // Check role requirements
    if (config.requiredRoles.length > 0 && options.user) {
      const roles = await options.user.getRoles();
      const hasRequiredRole = roles.some(role => config.requiredRoles.includes(role.getName()));

      if (!hasRequiredRole) {
        throw new Parse.Error(
          Parse.Error.OPERATION_FORBIDDEN,
          'User does not have required roles to execute this function'
        );
      }
    }
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(options) {
    const config = this.get('config');
    const { requests, period } = config.rateLimit;

    if (!requests || !period) return;

    const key = `rate_limit:${this.id}:${options.user?.id || 'anonymous'}`;
    const count = await Parse.Cloud.getRateLimit(key);

    if (count >= requests) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Rate limit exceeded');
    }

    await Parse.Cloud.setRateLimit(key, period);
  }

  /**
   * Update function statistics
   */
  async updateStats({ success, latency }) {
    const stats = this.get('stats');

    stats.totalExecutions++;
    if (success) {
      stats.successfulExecutions++;
    } else {
      stats.failedExecutions++;
    }

    stats.lastExecution = new Date();
    stats.averageLatency =
      (stats.averageLatency * (stats.totalExecutions - 1) + latency) / stats.totalExecutions;

    this.set('stats', stats);
    this.set('lastExecuted', new Date());

    await this.save(null, { useMasterKey: true });
  }

  /**
   * Log function error
   */
  async logError(error, params, options) {
    const log = new Parse.Object('CMSCloudFunctionLog');
    log.set('function', this);
    log.set('error', error.message);
    log.set('stack', error.stack);
    log.set('params', params);
    log.set('user', options.user);
    await log.save(null, { useMasterKey: true });
  }

  /**
   * Before save trigger
   */
  static beforeSave(request) {
    const func = request.object;

    // Set timestamps
    if (!func.get('createdAt')) {
      func.set('createdAt', new Date());
    }
    func.set('updatedAt', new Date());

    // Validate function code
    try {
      new Function('Parse', 'context', func.get('code'));
    } catch (error) {
      throw new Parse.Error(Parse.Error.SCRIPT_FAILED, `Invalid function code: ${error.message}`);
    }
  }
}

module.exports = CMSCloudFunction;

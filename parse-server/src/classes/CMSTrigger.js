/**
 * CMS Trigger Class
 * Manages event-based actions and automations for applications
 */

const Parse = require('parse/node');

class CMSTrigger extends Parse.Object {
  constructor() {
    super('CMSTrigger');
  }

  static get className() {
    return 'CMSTrigger';
  }

  static get schema() {
    return {
      // Basic Info
      name: { type: 'String', required: true },
      description: { type: 'String' },
      type: {
        type: 'String',
        enum: ['event', 'schedule', 'webhook', 'condition'],
        required: true,
      },
      status: {
        type: 'String',
        enum: ['active', 'inactive', 'error'],
        default: 'active',
      },

      // Relationships
      application: { type: 'Pointer', targetClass: 'CMSApplication', required: true },
      createdBy: { type: 'Pointer', targetClass: '_User', required: true },

      // Trigger Configuration
      config: {
        type: 'Object',
        required: true,
        default: {
          // Event trigger config
          event: {
            type: null, // database.create, database.update, user.login, etc.
            class: null, // Target Parse class name
            query: null, // Query conditions for event matching
          },

          // Schedule trigger config
          schedule: {
            expression: null, // Cron expression
            timezone: 'UTC',
          },

          // Webhook trigger config
          webhook: {
            method: 'POST',
            headers: {},
            authentication: {
              type: 'none', // none, basic, bearer
              credentials: {},
            },
          },

          // Condition trigger config
          condition: {
            type: 'query', // query, function
            query: null, // Parse query conditions
            interval: 300, // Check interval in seconds
          },
        },
      },

      // Action Configuration
      actions: {
        type: 'Array',
        required: true,
        default: [],
      },

      // Error Handling
      errorHandling: {
        type: 'Object',
        default: {
          retryCount: 3,
          retryDelay: 300, // seconds
          failureAction: 'stop', // stop, continue, rollback
          notifyOnError: true,
          errorWebhook: null,
        },
      },

      // Execution Context
      context: {
        type: 'Object',
        default: {
          timeout: 30, // seconds
          async: true,
          variables: {}, // Shared variables between actions
          permissions: 'masterKey', // masterKey, user, role
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
  }

  /**
   * Initialize trigger
   */
  static async initialize(params) {
    const {
      name,
      description,
      type,
      application,
      createdBy,
      config,
      actions,
      context = {},
    } = params;

    const trigger = new CMSTrigger();
    trigger.set('name', name);
    trigger.set('description', description);
    trigger.set('type', type);
    trigger.set('application', application);
    trigger.set('createdBy', createdBy);
    trigger.set('config', {
      ...trigger.get('config'),
      [type]: config,
    });
    trigger.set('actions', actions);
    trigger.set('context', {
      ...trigger.get('context'),
      ...context,
    });

    return trigger.save(null, { useMasterKey: true });
  }

  /**
   * Execute trigger
   */
  async execute(payload = {}, options = {}) {
    const startTime = Date.now();
    const context = {
      ...this.get('context'),
      trigger: this,
      payload,
      variables: {},
      results: [],
    };

    try {
      // Validate trigger conditions
      await this.validateConditions(payload, context);

      // Execute actions
      const actions = this.get('actions').sort((a, b) => a.order - b.order);

      for (const action of actions) {
        try {
          // Check action condition
          if (action.condition && !(await this.evaluateCondition(action.condition, context))) {
            continue;
          }

          // Execute action
          const result = await this.executeAction(action, context);
          context.results.push(result);
          context.variables[action.id] = result;
        } catch (error) {
          if (action.retryPolicy) {
            await this.handleActionRetry(action, error, context);
          } else {
            throw error;
          }
        }
      }

      // Update statistics
      await this.updateStats({
        success: true,
        latency: Date.now() - startTime,
      });

      return context.results;
    } catch (error) {
      // Handle error based on configuration
      await this.handleError(error, context);

      // Update statistics
      await this.updateStats({
        success: false,
        latency: Date.now() - startTime,
      });

      throw error;
    }
  }

  /**
   * Execute single action
   */
  async executeAction(action, context) {
    switch (action.type) {
      case 'function':
        return this.executeFunctionAction(action, context);

      case 'webhook':
        return this.executeWebhookAction(action, context);

      case 'email':
        return this.executeEmailAction(action, context);

      case 'notification':
        return this.executeNotificationAction(action, context);

      case 'database':
        return this.executeDatabaseAction(action, context);

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Validate trigger conditions
   */
  async validateConditions(payload, context) {
    const config = this.get('config')[this.get('type')];

    switch (this.get('type')) {
      case 'event':
        return this.validateEventConditions(config, payload);

      case 'schedule':
        return this.validateScheduleConditions(config, payload);

      case 'webhook':
        return this.validateWebhookConditions(config, payload);

      case 'condition':
        return this.validateCustomConditions(config, payload);

      default:
        throw new Error(`Unknown trigger type: ${this.get('type')}`);
    }
  }

  /**
   * Handle action retry
   */
  async handleActionRetry(action, error, context) {
    const { retryCount, retryDelay } = action.retryPolicy;
    let attempts = 0;

    while (attempts < retryCount) {
      attempts++;

      try {
        // Wait for delay
        await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));

        // Retry action
        const result = await this.executeAction(action, context);
        context.results.push(result);
        context.variables[action.id] = result;

        return;
      } catch (retryError) {
        if (attempts === retryCount) {
          throw retryError;
        }
      }
    }
  }

  /**
   * Handle trigger error
   */
  async handleError(error, context) {
    const errorHandling = this.get('errorHandling');

    // Log error
    const log = new Parse.Object('CMSTriggerLog');
    log.set('trigger', this);
    log.set('error', error.message);
    log.set('stack', error.stack);
    log.set('context', context);
    await log.save(null, { useMasterKey: true });

    // Send notification if configured
    if (errorHandling.notifyOnError) {
      await this.sendErrorNotification(error, context);
    }

    // Call error webhook if configured
    if (errorHandling.errorWebhook) {
      await this.callErrorWebhook(error, context);
    }
  }

  /**
   * Update trigger statistics
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
   * Before save trigger
   */
  static async beforeSave(request) {
    const trigger = request.object;

    // Set timestamps
    if (!trigger.get('createdAt')) {
      trigger.set('createdAt', new Date());
    }
    trigger.set('updatedAt', new Date());
  }
}

Parse.Object.registerSubclass('CMSTrigger', CMSTrigger);
module.exports = CMSTrigger;

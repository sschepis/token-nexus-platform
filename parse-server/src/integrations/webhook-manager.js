const Parse = require('parse/node');
const { logger } = require('../utils/logger');
const { WebhookError } = require('../utils/errors');

/**
 * Extends Parse Server's webhook functionality with additional features
 */
class WebhookManager {
  constructor() {
    this.customTriggers = new Map();
    this.retryConfig = {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 60000,
    };
  }

  /**
   * Register a custom webhook trigger
   * @param {Object} options Trigger configuration
   * @param {string} options.className Parse class name
   * @param {string} options.triggerName Trigger name (beforeSave, afterSave, etc.)
   * @param {string} options.url Webhook endpoint URL
   * @param {Object} options.filter Event filter conditions
   * @param {Object} options.fields Fields to include in payload
   * @return {Promise<void>}
   */
  registerTrigger(options) {
    const { className, triggerName, url, filter = {}, fields = [] } = options;

    const triggerId = `${className}_${triggerName}`;

    try {
      // Register Parse trigger
      Parse.Cloud[triggerName](className, async request => {
        if (!this.shouldTriggerWebhook(request, filter)) {
          return;
        }

        try {
          await this.deliverWebhook(url, this.buildPayload(request, fields));
        } catch (error) {
          logger.error('Webhook delivery failed', {
            trigger: triggerId,
            url,
            error: error.message,
          });
        }
      });

      // Store custom trigger config
      this.customTriggers.set(triggerId, {
        className,
        triggerName,
        url,
        filter,
        fields,
        createdAt: new Date().toISOString(),
      });

      logger.info('Webhook trigger registered', {
        trigger: triggerId,
        url,
      });
    } catch (error) {
      logger.error('Failed to register webhook trigger', {
        trigger: triggerId,
        error: error.message,
      });
      throw new WebhookError('TRIGGER_REGISTRATION_FAILED', error.message);
    }
  }

  /**
   * Check if webhook should be triggered based on filter conditions
   * @param {Object} request Parse trigger request
   * @param {Object} filter Filter conditions
   * @return {boolean} Whether webhook should be triggered
   */
  shouldTriggerWebhook(request, filter) {
    // Check user roles if specified
    if (filter.roles && request.user) {
      const userRoles = request.user.getRoles();

      if (!filter.roles.some(role => userRoles.includes(role))) {
        return false;
      }
    }

    // Check object conditions if specified
    if (filter.query) {
      const object = request.object;

      for (const [key, value] of Object.entries(filter.query)) {
        if (object.get(key) !== value) {
          return false;
        }
      }
    }

    // Check change conditions for beforeSave/afterSave
    if (filter.changes && request.original) {
      const hasChanges = filter.changes.some(
        field => request.object.get(field) !== request.original.get(field)
      );

      if (!hasChanges) {
        return false;
      }
    }

    return true;
  }

  /**
   * Build webhook payload from Parse request
   * @param {Object} request Parse trigger request
   * @param {string[]} fields Fields to include
   * @return {Object} Webhook payload
   */
  buildPayload(request, fields) {
    const payload = {
      triggerName: request.triggerName,
      object: this.serializeObject(request.object, fields),
      user: request.user ? this.serializeUser(request.user) : null,
      master: request.master,
      timestamp: new Date().toISOString(),
    };

    // Include original object for save triggers
    if (request.original) {
      payload.original = this.serializeObject(request.original, fields);
    }

    // Include installation for push triggers
    if (request.installation) {
      payload.installation = {
        deviceType: request.installation.get('deviceType') || 'web',
        installationId: request.installation.get('installationId') ||
                       request.installation.id ||
                       'unknown',
      };
    }

    return payload;
  }

  /**
   * Serialize Parse object for webhook payload
   * @param {Parse.Object} object Parse object
   * @param {string[]} fields Fields to include
   * @return {Object} Serialized object
   */
  serializeObject(object, fields) {
    const serialized = {
      id: object.id,
      className: object.className,
      createdAt: object.createdAt,
      updatedAt: object.updatedAt,
    };

    // Include specified fields
    if (fields && fields.length > 0) {
      fields.forEach(field => {
        if (object.has(field)) {
          serialized[field] = object.get(field);
        }
      });
    } else {
      // Include all fields if none specified
      object.toJSON().forEach((value, key) => {
        serialized[key] = value;
      });
    }

    return serialized;
  }

  /**
   * Serialize Parse user for webhook payload
   * @param {Parse.User} user Parse user
   * @return {Object} Serialized user
   */
  serializeUser(user) {
    return {
      id: user.id,
      username: user.getUsername(),
      email: user.getEmail(),
      roles: user.getRoles(),
    };
  }

  /**
   * Deliver webhook with retry logic
   * @param {string} url Webhook endpoint URL
   * @param {Object} payload Webhook payload
   * @return {Promise<void>}
   */
  async deliverWebhook(url, payload) {
    let attempt = 0;
    let lastError;

    while (attempt < this.retryConfig.maxAttempts) {
      try {
        await Parse.Cloud.httpRequest({
          method: 'POST',
          url,
          headers: {
            'Content-Type': 'application/json',
            'X-Parse-Webhook-Key': process.env.PARSE_WEBHOOK_KEY,
          },
          body: payload,
        });

        return;
      } catch (error) {
        lastError = error;
        attempt++;

        if (attempt < this.retryConfig.maxAttempts) {
          const delay = Math.min(
            this.retryConfig.initialDelay * Math.pow(2, attempt - 1),
            this.retryConfig.maxDelay
          );

          await new Promise(resolve => {
            setTimeout(resolve, delay);
          });
        }
      }
    }

    throw new WebhookError('DELIVERY_FAILED', lastError.message);
  }

  /**
   * List registered webhook triggers
   * @return {Object[]} List of triggers
   */
  listTriggers() {
    return Array.from(this.customTriggers.values());
  }

  /**
   * Remove webhook trigger
   * @param {string} className Parse class name
   * @param {string} triggerName Trigger name
   * @return {boolean} Whether trigger was removed
   */
  removeTrigger(className, triggerName) {
    const triggerId = `${className}_${triggerName}`;
    const trigger = this.customTriggers.get(triggerId);

    if (!trigger) {
      return false;
    }

    // Remove Parse trigger
    Parse.Cloud.removeTrigger(triggerName, className);

    // Remove from custom triggers
    this.customTriggers.delete(triggerId);

    logger.info('Webhook trigger removed', {
      trigger: triggerId,
    });

    return true;
  }

  /**
   * Update webhook trigger configuration
   * @param {Object} options Updated trigger configuration
   * @return {Promise<void>}
   */
  async updateTrigger(options) {
    const { className, triggerName } = options;

    // Remove existing trigger
    this.removeTrigger(className, triggerName);

    // Register with new configuration
    await this.registerTrigger(options);
  }
}

module.exports = new WebhookManager();

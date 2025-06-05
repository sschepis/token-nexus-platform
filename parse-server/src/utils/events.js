/**
 * Event Manager Utility
 * Handles event emission and webhook notifications
 */

const axios = require('axios');
const config = require('../config');
const logger = require('./logger');
const cache = require('./cache');

class EventManager {
  constructor() {
    this.webhooks = new Map();
    this.listeners = new Map();
    this.initialized = false;
  }

  /**
   * Initialize event manager
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      if (config.get('webhooks.enabled')) {
        await this.loadWebhooks();
      }
      this.initialized = true;
      logger.info('Event manager initialized');
    } catch (error) {
      logger.error(error, { context: 'event manager initialization' });
      throw error;
    }
  }

  /**
   * Load webhooks from database
   * @returns {Promise<void>}
   */
  async loadWebhooks() {
    try {
      const query = new Parse.Query('CMSWebhook');
      query.equalTo('isActive', true);

      const webhooks = await query.find({ useMasterKey: true });
      webhooks.forEach(webhook => {
        const events = webhook.get('events') || [];
        events.forEach(event => {
          if (!this.webhooks.has(event)) {
            this.webhooks.set(event, new Set());
          }
          this.webhooks.get(event).add(webhook);
        });
      });

      logger.info(`Loaded ${webhooks.length} webhooks`);
    } catch (error) {
      logger.error(error, { context: 'load webhooks' });
      throw error;
    }
  }

  /**
   * Register event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener
   * @param {Object} options - Listener options
   */
  on(event, listener, options = {}) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add({ fn: listener, options });
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener
   */
  off(event, listener) {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      for (const item of listeners) {
        if (item.fn === listener) {
          listeners.delete(item);
          break;
        }
      }
    }
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @param {Object} options - Event options
   * @returns {Promise<void>}
   */
  async emit(event, data, options = {}) {
    try {
      // Handle local listeners
      if (this.listeners.has(event)) {
        const listeners = this.listeners.get(event);
        const promises = [];

        for (const { fn, options: listenerOptions } of listeners) {
          if (listenerOptions.async) {
            promises.push(fn(data));
          } else {
            try {
              fn(data);
            } catch (error) {
              logger.error(error, { context: 'event listener', event });
            }
          }
        }

        if (promises.length > 0) {
          await Promise.all(promises);
        }
      }

      // Handle webhooks
      if (config.get('webhooks.enabled') && this.webhooks.has(event)) {
        await this.notifyWebhooks(event, data, options);
      }

      logger.debug(`Event emitted: ${event}`, { metadata: { event, data } });
    } catch (error) {
      logger.error(error, { context: 'emit event', event });
      throw error;
    }
  }

  /**
   * Notify webhooks
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @param {Object} options - Event options
   * @returns {Promise<void>}
   */
  async notifyWebhooks(event, data, options = {}) {
    const webhooks = this.webhooks.get(event);
    if (!webhooks) return;

    const promises = [];
    for (const webhook of webhooks) {
      promises.push(this.callWebhook(webhook, event, data, options));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Call webhook
   * @param {Parse.Object} webhook - Webhook object
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @param {Object} options - Event options
   * @returns {Promise<void>}
   */
  async callWebhook(webhook, event, data, options = {}) {
    const url = webhook.get('url');
    const secret = webhook.get('secret');
    const timeout = webhook.get('timeout') || 10000;

    try {
      const payload = {
        id: webhook.id,
        event,
        data,
        timestamp: new Date().toISOString(),
      };

      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': event,
        'X-Webhook-ID': webhook.id,
        'X-Webhook-Signature': this.generateSignature(payload, secret),
      };

      const response = await axios({
        method: 'POST',
        url,
        headers,
        data: payload,
        timeout,
      });

      // Update webhook stats
      webhook.increment('successCount');
      webhook.set('lastSuccess', new Date());
      webhook.set('lastResponse', {
        status: response.status,
        data: response.data,
      });

      await webhook.save(null, { useMasterKey: true });
    } catch (error) {
      logger.error(error, { context: 'webhook call', webhook: webhook.id });

      // Update webhook stats
      webhook.increment('failureCount');
      webhook.set('lastFailure', new Date());
      webhook.set('lastError', {
        message: error.message,
        code: error.code,
      });

      // Disable webhook if too many failures
      const maxFailures = config.get('webhooks.maxFailures', 5);
      if (webhook.get('failureCount') >= maxFailures) {
        webhook.set('isActive', false);
        logger.warn(`Webhook ${webhook.id} disabled due to too many failures`);
      }

      await webhook.save(null, { useMasterKey: true });
    }
  }

  /**
   * Generate webhook signature
   * @param {Object} payload - Webhook payload
   * @param {string} secret - Webhook secret
   * @returns {string} Signature
   */
  generateSignature(payload, secret) {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  /**
   * Register webhook
   * @param {string} url - Webhook URL
   * @param {Array} events - Events to listen for
   * @param {Object} options - Webhook options
   * @returns {Promise<Parse.Object>} Webhook object
   */
  async registerWebhook(url, events, options = {}) {
    try {
      const webhook = new Parse.Object('CMSWebhook');
      webhook.set({
        url,
        events,
        isActive: true,
        secret: options.secret || this.generateSecret(),
        timeout: options.timeout || 10000,
        successCount: 0,
        failureCount: 0,
        ...options,
      });

      await webhook.save(null, { useMasterKey: true });

      // Add to local cache
      events.forEach(event => {
        if (!this.webhooks.has(event)) {
          this.webhooks.set(event, new Set());
        }
        this.webhooks.get(event).add(webhook);
      });

      return webhook;
    } catch (error) {
      logger.error(error, { context: 'register webhook' });
      throw error;
    }
  }

  /**
   * Generate webhook secret
   * @returns {string} Secret
   */
  generateSecret() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  /**
   * Get registered webhooks
   * @param {string} event - Optional event filter
   * @returns {Promise<Array>} Webhooks
   */
  async getWebhooks(event = null) {
    try {
      const query = new Parse.Query('CMSWebhook');
      if (event) {
        query.equalTo('events', event);
      }
      return await query.find({ useMasterKey: true });
    } catch (error) {
      logger.error(error, { context: 'get webhooks' });
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new EventManager();

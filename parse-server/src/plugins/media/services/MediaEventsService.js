/**
 * Media Events Service
 * Manages media-related events and webhooks
 */

const axios = require('axios');
const EventEmitter = require('events');
const BaseService = require('../../../services/BaseService');

class MediaEventsService extends BaseService {
  constructor() {
    super('MediaEvents');
    this.events = new EventEmitter();
    this.webhooks = new Map();
  }

  /**
   * Service-specific initialization
   * @param {Object} options Initialization options
   */
  async _initializeService(options = {}) {
    // Set up event handlers
    this.setupEventHandlers();

    // Register cleanup handler
    this.registerCleanup(async () => {
      this.events.removeAllListeners();
      this.webhooks.clear();
    });
  }

  /**
   * Set up event handlers
   */
  setupEventHandlers() {
    // Media upload events
    this.events.on('media.uploaded', this.handleMediaUploaded.bind(this));
    this.events.on('media.processed', this.handleMediaProcessed.bind(this));
    this.events.on('media.deleted', this.handleMediaDeleted.bind(this));
    this.events.on('media.accessed', this.handleMediaAccessed.bind(this));

    // Error events
    this.events.on('media.error', this.handleMediaError.bind(this));

    // Usage events
    this.events.on('media.usage.tracked', this.handleMediaUsage.bind(this));
    this.events.on('media.quota.exceeded', this.handleQuotaExceeded.bind(this));

    // CDN events
    this.events.on('cdn.cache.invalidated', this.handleCacheInvalidated.bind(this));
    this.events.on('cdn.error', this.handleCDNError.bind(this));
  }

  /**
   * Register webhook
   * @param {string} event Event name
   * @param {string} url Webhook URL
   * @param {Object} options Webhook options
   */
  registerWebhook(event, url, options = {}) {
    return this.executeOperation(
      () => {
        if (!this.webhooks.has(event)) {
          this.webhooks.set(event, new Map());
        }
        this.webhooks.get(event).set(url, {
          url,
          secret: options.secret,
          retries: options.retries || this.config.webhooks.retries,
          timeout: options.timeout || this.config.webhooks.timeout,
        });

        this.logger.info('Webhook registered', {
          metadata: { event, url },
        });
      },
      'registerWebhook',
      { event, url, options }
    );
  }

  /**
   * Unregister webhook
   * @param {string} event Event name
   * @param {string} url Webhook URL
   */
  unregisterWebhook(event, url) {
    return this.executeOperation(
      () => {
        if (this.webhooks.has(event)) {
          this.webhooks.get(event).delete(url);
          this.logger.info('Webhook unregistered', {
            metadata: { event, url },
          });
        }
      },
      'unregisterWebhook',
      { event, url }
    );
  }

  /**
   * Trigger webhooks for event
   * @param {string} event Event name
   * @param {Object} data Event data
   */
  async triggerWebhooks(event, data) {
    return this.executeOperation(
      async () => {
        if (!this.webhooks.has(event)) return;

        const webhooks = this.webhooks.get(event);
        const timestamp = Date.now();

        await Promise.all(
          Array.from(webhooks).map(async ([url, options]) => {
            try {
              await this.sendWebhook(
                url,
                {
                  event,
                  timestamp,
                  data,
                },
                options
              );
            } catch (error) {
              this.logger.error(`Webhook error for ${event} to ${url}:`, {
                metadata: { event, url, data },
                stack: error.stack,
              });
            }
          })
        );
      },
      'triggerWebhooks',
      { event }
    );
  }

  /**
   * Send webhook request
   * @param {string} url Webhook URL
   * @param {Object} payload Webhook payload
   * @param {Object} options Webhook options
   */
  async sendWebhook(url, payload, options) {
    return this.executeOperation(
      async () => {
        const signature = this.generateSignature(payload, options.secret);
        let retries = options.retries;

        while (retries >= 0) {
          try {
            await axios.post(url, payload, {
              headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature,
              },
              timeout: options.timeout,
            });
            return;
          } catch (error) {
            if (retries === 0) throw error;
            retries--;
            await new Promise(resolve => setTimeout(resolve, 1000 * (options.retries - retries)));
          }
        }
      },
      'sendWebhook',
      { url }
    );
  }

  /**
   * Generate webhook signature
   * @param {Object} payload Webhook payload
   * @param {string} secret Webhook secret
   * @returns {string} Signature
   */
  generateSignature(payload, secret) {
    if (!secret) return '';
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  /**
   * Handle media uploaded event
   * @param {Object} data Event data
   */
  async handleMediaUploaded(data) {
    return this.executeOperation(
      async () => {
        await this.triggerWebhooks('media.uploaded', data);

        // Update usage statistics
        await Parse.Cloud.run('updateMediaUsage', {
          type: 'upload',
          size: data.fileSize,
          userId: data.userId,
        });

        // Check quotas
        const quota = await Parse.Cloud.run('checkMediaQuota', {
          userId: data.userId,
        });

        if (quota.exceeded) {
          this.events.emit('media.quota.exceeded', {
            userId: data.userId,
            quota: quota,
          });
        }
      },
      'handleMediaUploaded',
      { data }
    );
  }

  /**
   * Handle media processed event
   * @param {Object} data Event data
   */
  async handleMediaProcessed(data) {
    return this.executeOperation(
      async () => {
        await this.triggerWebhooks('media.processed', data);

        // Update media status
        const media = await new Parse.Query('CMSMedia').get(data.mediaId, { useMasterKey: true });

        media.set('status', 'processed');
        media.set('processedAt', new Date());
        media.set('variants', data.variants);

        await media.save(null, { useMasterKey: true });
      },
      'handleMediaProcessed',
      { data }
    );
  }

  /**
   * Handle media deleted event
   * @param {Object} data Event data
   */
  async handleMediaDeleted(data) {
    return this.executeOperation(
      async () => {
        await this.triggerWebhooks('media.deleted', data);

        // Update usage statistics
        await Parse.Cloud.run('updateMediaUsage', {
          type: 'delete',
          size: data.fileSize,
          userId: data.userId,
        });

        // Clean up CDN cache if needed
        if (data.cdnUrl) {
          try {
            await Parse.Cloud.run('invalidateCDNCache', {
              url: data.cdnUrl,
            });
            this.events.emit('cdn.cache.invalidated', { url: data.cdnUrl });
          } catch (error) {
            this.events.emit('cdn.error', { error, url: data.cdnUrl });
          }
        }
      },
      'handleMediaDeleted',
      { data }
    );
  }

  /**
   * Handle media accessed event
   * @param {Object} data Event data
   */
  async handleMediaAccessed(data) {
    return this.executeOperation(
      async () => {
        await this.triggerWebhooks('media.accessed', data);

        // Track media usage
        await Parse.Cloud.run('trackMediaUsage', {
          mediaId: data.mediaId,
          userId: data.userId,
          type: data.accessType,
        });
      },
      'handleMediaAccessed',
      { data }
    );
  }

  /**
   * Handle media error event
   * @param {Object} data Event data
   */
  async handleMediaError(data) {
    return this.executeOperation(
      async () => {
        await this.triggerWebhooks('media.error', data);

        this.logger.error('Media error:', {
          metadata: data,
        });

        // Update media status if needed
        if (data.mediaId) {
          const media = await new Parse.Query('CMSMedia').get(data.mediaId, { useMasterKey: true });

          media.set('status', 'error');
          media.set('error', data.error);

          await media.save(null, { useMasterKey: true });
        }
      },
      'handleMediaError',
      { data }
    );
  }

  /**
   * Handle media usage event
   * @param {Object} data Event data
   */
  async handleMediaUsage(data) {
    return this.executeOperation(
      async () => {
        await this.triggerWebhooks('media.usage.tracked', data);

        // Update analytics
        await Parse.Cloud.run('updateMediaAnalytics', {
          mediaId: data.mediaId,
          type: data.type,
          context: data.context,
        });
      },
      'handleMediaUsage',
      { data }
    );
  }

  /**
   * Handle quota exceeded event
   * @param {Object} data Event data
   */
  async handleQuotaExceeded(data) {
    return this.executeOperation(
      async () => {
        await this.triggerWebhooks('media.quota.exceeded', data);

        // Send notification to user
        await Parse.Cloud.run('sendQuotaNotification', {
          userId: data.userId,
          quota: data.quota,
        });
      },
      'handleQuotaExceeded',
      { data }
    );
  }

  /**
   * Handle cache invalidated event
   * @param {Object} data Event data
   */
  async handleCacheInvalidated(data) {
    return this.executeOperation(
      async () => {
        await this.triggerWebhooks('cdn.cache.invalidated', data);
      },
      'handleCacheInvalidated',
      { data }
    );
  }

  /**
   * Handle CDN error event
   * @param {Object} data Event data
   */
  async handleCDNError(data) {
    return this.executeOperation(
      async () => {
        await this.triggerWebhooks('cdn.error', data);
        this.logger.error('CDN error:', {
          metadata: data,
        });
      },
      'handleCDNError',
      { data }
    );
  }

  /**
   * Emit event
   * @param {string} event Event name
   * @param {Object} data Event data
   */
  emit(event, data) {
    this.events.emit(event, data);
  }

  /**
   * Add event listener
   * @param {string} event Event name
   * @param {Function} listener Event listener
   */
  on(event, listener) {
    this.events.on(event, listener);
  }

  /**
   * Remove event listener
   * @param {string} event Event name
   * @param {Function} listener Event listener
   */
  off(event, listener) {
    this.events.off(event, listener);
  }
}

module.exports = new MediaEventsService();

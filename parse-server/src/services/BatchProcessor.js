/**
 * Batch Processor Service
 * Handles batch processing of events and operations
 */

const config = require('../config').defaultConfig;
const { EventEmitter } = require('events');

class BatchProcessor extends EventEmitter {
  constructor() {
    super();
    this.config = config.batch;
    this.initialized = false;
    this.queues = new Map();
    this.processors = new Map();
    this.intervals = new Map();
  }

  /**
   * Initialize the batch processor
   */
  async initialize() {
    try {
      // Initialize default queues
      this._initializeQueue('analytics', {
        maxSize: 1000,
        maxAge: 1000 * 60, // 1 minute
        processor: this._processAnalyticsBatch.bind(this),
      });

      this._initializeQueue('search', {
        maxSize: 500,
        maxAge: 1000 * 30, // 30 seconds
        processor: this._processSearchBatch.bind(this),
      });

      this._initializeQueue('notifications', {
        maxSize: 200,
        maxAge: 1000 * 15, // 15 seconds
        processor: this._processNotificationsBatch.bind(this),
      });

      this.initialized = true;
      console.log('Batch processor initialized successfully');
    } catch (error) {
      console.error('Failed to initialize batch processor:', error);
      throw error;
    }
  }

  /**
   * Add item to batch queue
   * @param {string} queueName Queue name
   * @param {any} item Item to add
   * @returns {Promise<void>}
   */
  async add(queueName, item) {
    if (!this.initialized) {
      throw new Error('Batch processor is not initialized');
    }

    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    queue.items.push({
      data: item,
      timestamp: Date.now(),
    });

    // Process immediately if queue is full
    if (queue.items.length >= queue.maxSize) {
      await this._processBatch(queueName);
    }

    this.emit('itemAdded', { queueName, item });
  }

  /**
   * Add multiple items to batch queue
   * @param {string} queueName Queue name
   * @param {Array} items Items to add
   * @returns {Promise<void>}
   */
  async addMany(queueName, items) {
    if (!this.initialized) {
      throw new Error('Batch processor is not initialized');
    }

    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const timestamp = Date.now();
    const batchItems = items.map(item => ({
      data: item,
      timestamp,
    }));

    queue.items.push(...batchItems);

    // Process immediately if queue is full
    if (queue.items.length >= queue.maxSize) {
      await this._processBatch(queueName);
    }

    this.emit('itemsAdded', { queueName, count: items.length });
  }

  /**
   * Force process batch for queue
   * @param {string} queueName Queue name
   * @returns {Promise<void>}
   */
  async processNow(queueName) {
    if (!this.initialized) {
      throw new Error('Batch processor is not initialized');
    }

    await this._processBatch(queueName);
  }

  /**
   * Initialize queue
   * @param {string} name Queue name
   * @param {Object} options Queue options
   * @private
   */
  _initializeQueue(name, options) {
    this.queues.set(name, {
      items: [],
      maxSize: options.maxSize,
      maxAge: options.maxAge,
    });

    this.processors.set(name, options.processor);

    // Set up interval for age-based processing
    const interval = setInterval(async () => {
      const queue = this.queues.get(name);
      if (!queue || queue.items.length === 0) return;

      const now = Date.now();
      const oldestItem = queue.items[0];

      if (now - oldestItem.timestamp >= queue.maxAge) {
        await this._processBatch(name);
      }
    }, Math.min(options.maxAge / 2, 1000));

    this.intervals.set(name, interval);
  }

  /**
   * Process batch for queue
   * @param {string} queueName Queue name
   * @returns {Promise<void>}
   * @private
   */
  async _processBatch(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue || queue.items.length === 0) return;

    const processor = this.processors.get(queueName);
    if (!processor) {
      throw new Error(`Processor not found for queue: ${queueName}`);
    }

    const items = queue.items.splice(0, queue.maxSize);

    try {
      await processor(items);
      this.emit('batchProcessed', { queueName, count: items.length });
    } catch (error) {
      console.error(`Batch processing failed for ${queueName}:`, error);
      // Re-queue failed items
      queue.items.unshift(...items);
      this.emit('batchError', { queueName, error });
    }
  }

  /**
   * Process analytics batch
   * @param {Array} items Batch items
   * @returns {Promise<void>}
   * @private
   */
  async _processAnalyticsBatch(items) {
    const AnalyticsEvent = Parse.Object.extend('AnalyticsEvent');
    const events = items.map(item => {
      const event = new AnalyticsEvent();
      return event.save(item.data, { useMasterKey: true });
    });

    await Promise.all(events);
  }

  /**
   * Process search batch
   * @param {Array} items Batch items
   * @returns {Promise<void>}
   * @private
   */
  async _processSearchBatch(items) {
    const operations = items.flatMap(item => [
      { index: { _index: item.data.index } },
      item.data.document,
    ]);

    await this.searchClient.bulk({ operations });
  }

  /**
   * Process notifications batch
   * @param {Array} items Batch items
   * @returns {Promise<void>}
   * @private
   */
  async _processNotificationsBatch(items) {
    const Notification = Parse.Object.extend('Notification');
    const notifications = items.map(item => {
      const notification = new Notification();
      return notification.save(item.data, { useMasterKey: true });
    });

    await Promise.all(notifications);
  }

  /**
   * Stop batch processor
   */
  stop() {
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
    this.initialized = false;
  }
}

module.exports = new BatchProcessor();

const amqp = require('amqplib');
const { logger } = require('../utils/logger');
const { QueueError } = require('../utils/errors');
const { validateMessage } = require('../utils/validation');

/**
 * Manages message queue integration and message processing
 */
class MessageQueue {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.queues = new Map();
    this.consumers = new Map();
    this.retryConfig = {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 60000,
    };
  }

  /**
   * Initialize message queue connection
   * @param {Object} config Connection configuration
   * @return {Promise<void>}
   */
  async initialize(config) {
    const { url, options = {}, queues = [] } = config;

    try {
      // Connect to RabbitMQ
      this.connection = await amqp.connect(url, options);
      this.channel = await this.connection.createChannel();

      // Set up error handlers
      this.connection.on('error', this.handleConnectionError.bind(this));
      this.connection.on('close', this.handleConnectionClose.bind(this));

      // Set up queues
      for (const queue of queues) {
        await this.setupQueue(queue);
      }

      logger.info('Message queue initialized', { url });
    } catch (error) {
      logger.error('Failed to initialize message queue', {
        error: error.message,
      });
      throw new QueueError('INITIALIZATION_FAILED', error.message);
    }
  }

  /**
   * Set up queue with configuration
   * @param {Object} config Queue configuration
   * @return {Promise<void>}
   */
  async setupQueue(config) {
    const { name, options = {}, deadLetter = true, retry = true } = config;

    try {
      // Set up dead letter exchange if enabled
      if (deadLetter) {
        await this.setupDeadLetterExchange(name);
      }

      // Assert queue
      await this.channel.assertQueue(name, {
        durable: true,
        ...options,
        ...(deadLetter && {
          deadLetterExchange: `${name}.dlx`,
          deadLetterRoutingKey: `${name}.dlq`,
        }),
      });

      // Set up retry queue if enabled
      if (retry) {
        await this.setupRetryQueue(name);
      }

      // Store queue configuration
      this.queues.set(name, {
        name,
        options,
        deadLetter,
        retry,
        metrics: {
          published: 0,
          consumed: 0,
          failed: 0,
          retried: 0,
        },
      });

      logger.info('Queue setup complete', { queue: name });
    } catch (error) {
      logger.error('Failed to set up queue', {
        queue: name,
        error: error.message,
      });
      throw new QueueError('QUEUE_SETUP_FAILED', error.message);
    }
  }

  /**
   * Set up dead letter exchange and queue
   * @param {string} queueName Original queue name
   * @return {Promise<void>}
   */
  async setupDeadLetterExchange(queueName) {
    const dlxName = `${queueName}.dlx`;
    const dlqName = `${queueName}.dlq`;

    await this.channel.assertExchange(dlxName, 'direct', { durable: true });
    await this.channel.assertQueue(dlqName, { durable: true });
    await this.channel.bindQueue(dlqName, dlxName, dlqName);
  }

  /**
   * Set up retry queue and exchange
   * @param {string} queueName Original queue name
   * @return {Promise<void>}
   */
  async setupRetryQueue(queueName) {
    const retryExchange = `${queueName}.retry`;
    const retryQueue = `${queueName}.retry.queue`;

    await this.channel.assertExchange(retryExchange, 'direct', { durable: true });
    await this.channel.assertQueue(retryQueue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': queueName,
        'x-message-ttl': this.retryConfig.initialDelay,
      },
    });
    await this.channel.bindQueue(retryQueue, retryExchange, retryQueue);
  }

  /**
   * Publish message to queue
   * @param {Object} options Publish options
   * @param {string} options.queue Queue name
   * @param {Object} options.message Message content
   * @param {Object} options.options Publishing options
   * @return {Promise<void>}
   */
  async publish(options) {
    const { queue, message, options: publishOptions = {} } = options;

    const queueConfig = this.getQueueConfig(queue);

    try {
      // Validate message
      await validateMessage(message);

      // Add metadata
      const messageWithMeta = {
        ...message,
        metadata: {
          ...message.metadata,
          timestamp: new Date().toISOString(),
          attempts: 0,
        },
      };

      // Publish message
      await this.channel.publish('', queue, Buffer.from(JSON.stringify(messageWithMeta)), {
        persistent: true,
        ...publishOptions,
      });

      // Update metrics
      queueConfig.metrics.published++;

      logger.debug('Message published', {
        queue,
        messageId: message.id,
      });
    } catch (error) {
      logger.error('Failed to publish message', {
        queue,
        error: error.message,
      });
      throw new QueueError('PUBLISH_FAILED', error.message);
    }
  }

  /**
   * Consume messages from queue
   * @param {Object} options Consumer options
   * @param {string} options.queue Queue name
   * @param {Function} options.handler Message handler function
   * @param {Object} options.options Consumer options
   * @return {Promise<void>}
   */
  async consume(options) {
    const { queue, handler, options: consumeOptions = {} } = options;

    const queueConfig = this.getQueueConfig(queue);

    try {
      // Create consumer
      const consumer = async msg => {
        if (!msg) return;

        try {
          const message = JSON.parse(msg.content.toString());

          // Process message
          await handler(message);

          // Acknowledge message
          this.channel.ack(msg);

          // Update metrics
          queueConfig.metrics.consumed++;
        } catch (error) {
          // Handle processing error
          await this.handleProcessingError(queue, msg, error);
        }
      };

      // Start consuming
      const { consumerTag } = await this.channel.consume(queue, consumer, {
        noAck: false,
        ...consumeOptions,
      });

      // Store consumer
      this.consumers.set(queue, consumerTag);

      logger.info('Consumer started', { queue });
    } catch (error) {
      logger.error('Failed to start consumer', {
        queue,
        error: error.message,
      });
      throw new QueueError('CONSUMER_FAILED', error.message);
    }
  }

  /**
   * Handle message processing error
   * @param {string} queue Queue name
   * @param {Object} msg Raw message object
   * @param {Error} error Processing error
   * @return {Promise<void>}
   */
  async handleProcessingError(queue, msg, error) {
    const queueConfig = this.getQueueConfig(queue);
    const message = JSON.parse(msg.content.toString());
    const attempts = (message.metadata?.attempts || 0) + 1;

    // Update metrics
    queueConfig.metrics.failed++;

    if (queueConfig.retry && attempts < this.retryConfig.maxAttempts) {
      // Retry message
      await this.retryMessage(queue, message, attempts);
      this.channel.ack(msg);
      queueConfig.metrics.retried++;
    } else {
      // Send to dead letter queue
      this.channel.nack(msg, false, false);
      logger.error('Message processing failed', {
        queue,
        messageId: message.id,
        attempts,
        error: error.message,
      });
    }
  }

  /**
   * Retry failed message
   * @param {string} queue Queue name
   * @param {Object} message Message content
   * @param {number} attempts Number of attempts
   * @return {Promise<void>}
   */
  async retryMessage(queue, message, attempts) {
    const retryQueue = `${queue}.retry.queue`;
    const delay = Math.min(
      this.retryConfig.initialDelay * Math.pow(2, attempts - 1),
      this.retryConfig.maxDelay
    );

    // Update message metadata
    const retryMessage = {
      ...message,
      metadata: {
        ...message.metadata,
        attempts,
        retryCount: attempts,
        lastRetry: new Date().toISOString(),
      },
    };

    // Publish to retry queue
    await this.channel.publish('', retryQueue, Buffer.from(JSON.stringify(retryMessage)), {
      persistent: true,
      expiration: delay.toString(),
    });

    logger.info('Message scheduled for retry', {
      queue,
      messageId: message.id,
      attempts,
      delay,
    });
  }

  /**
   * Get queue configuration
   * @param {string} name Queue name
   * @return {Object} Queue configuration
   */
  getQueueConfig(name) {
    const config = this.queues.get(name);

    if (!config) {
      throw new QueueError('QUEUE_NOT_FOUND', `Queue ${name} not found`);
    }

    return config;
  }

  /**
   * Handle connection error
   * @param {Error} error Connection error
   */
  handleConnectionError(error) {
    logger.error('Queue connection error', {
      error: error.message,
    });
  }

  /**
   * Handle connection close
   */
  handleConnectionClose() {
    logger.warn('Queue connection closed');
    // Implement reconnection logic if needed
  }

  /**
   * Get queue metrics
   * @param {string} name Queue name
   * @return {Object} Queue metrics
   */
  getMetrics(name) {
    return this.getQueueConfig(name).metrics;
  }

  /**
   * List all queues
   * @return {Object[]} List of queues
   */
  listQueues() {
    return Array.from(this.queues.values()).map(queue => ({
      name: queue.name,
      deadLetter: queue.deadLetter,
      retry: queue.retry,
      metrics: queue.metrics,
    }));
  }

  /**
   * Close connection
   * @return {Promise<void>}
   */
  async close() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
    logger.info('Queue connection closed');
  }
}

module.exports = new MessageQueue();

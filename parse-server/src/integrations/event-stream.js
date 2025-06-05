const EventEmitter = require('events');
const { logger } = require('../utils/logger');
const { EventError } = require('../utils/errors');
const { validateEvent } = require('../utils/validation');

/**
 * Manages event streaming and real-time event processing
 */
class EventStream extends EventEmitter {
  constructor() {
    super();
    this.streams = new Map();
    this.handlers = new Map();
    this.filters = new Map();
    this.metrics = new Map();

    // Configure max listeners
    this.setMaxListeners(100);
  }

  /**
   * Create a new event stream
   * @param {Object} options Stream configuration
   * @param {string} options.name Stream identifier
   * @param {string} options.type Stream type (e.g., 'user', 'system')
   * @param {Object} options.config Stream configuration
   * @param {Function} options.handler Event handler function
   * @return {Promise<void>}
   */
  createStream(options) {
    const { name, type, config = {}, handler } = options;

    if (this.streams.has(name)) {
      throw new EventError('STREAM_EXISTS', `Stream ${name} already exists`);
    }

    try {
      // Initialize stream
      const stream = {
        name,
        type,
        config,
        status: 'active',
        createdAt: new Date().toISOString(),
        metrics: {
          processed: 0,
          errors: 0,
          lastEvent: null,
        },
      };

      // Set up event handler
      if (handler) {
        this.handlers.set(name, handler);
        this.on(name, this.wrapHandler(name, handler));
      }

      // Store stream configuration
      this.streams.set(name, stream);
      this.metrics.set(name, new Map());

      logger.info('Event stream created', {
        stream: name,
        type,
      });
    } catch (error) {
      logger.error('Failed to create event stream', {
        stream: name,
        error: error.message,
      });
      throw new EventError('STREAM_CREATION_FAILED', error.message);
    }
  }

  /**
   * Add event filter to stream
   * @param {Object} options Filter configuration
   * @param {string} options.stream Stream identifier
   * @param {Function} options.filter Filter function
   * @param {string} options.name Filter name
   * @return {void}
   */
  addFilter(options) {
    const { stream, filter, name } = options;

    if (!this.streams.has(stream)) {
      throw new EventError('STREAM_NOT_FOUND', `Stream ${stream} not found`);
    }

    if (!this.filters.has(stream)) {
      this.filters.set(stream, new Map());
    }

    const streamFilters = this.filters.get(stream);

    streamFilters.set(name, filter);

    logger.info('Event filter added', {
      stream,
      filter: name,
    });
  }

  /**
   * Remove event filter from stream
   * @param {string} stream Stream identifier
   * @param {string} name Filter name
   * @return {boolean} Whether filter was removed
   */
  removeFilter(stream, name) {
    const streamFilters = this.filters.get(stream);

    if (!streamFilters || !streamFilters.has(name)) {
      return false;
    }

    streamFilters.delete(name);

    return true;
  }

  /**
   * Emit event to stream
   * @param {Object} options Event options
   * @param {string} options.stream Stream identifier
   * @param {string} options.type Event type
   * @param {Object} options.data Event data
   * @param {Object} options.metadata Event metadata
   * @return {Promise<void>}
   */
  async emit(options) {
    const { stream, type, data, metadata = {} } = options;

    if (!this.streams.has(stream)) {
      throw new EventError('STREAM_NOT_FOUND', `Stream ${stream} not found`);
    }

    try {
      // Build event object
      const event = {
        id: this.generateEventId(),
        stream,
        type,
        data,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      };

      // Validate event
      await this.validateEvent(event);

      // Apply filters
      if (!this.applyFilters(stream, event)) {
        return;
      }

      // Update metrics
      this.updateMetrics(stream, event);

      // Emit event
      super.emit(stream, event);

      logger.debug('Event emitted', {
        stream,
        type,
        id: event.id,
      });
    } catch (error) {
      logger.error('Failed to emit event', {
        stream,
        type,
        error: error.message,
      });
      throw new EventError('EVENT_EMISSION_FAILED', error.message);
    }
  }

  /**
   * Subscribe to stream events
   * @param {Object} options Subscription options
   * @param {string} options.stream Stream identifier
   * @param {Function} options.handler Event handler function
   * @param {Object} options.filter Filter conditions
   * @return {Function} Unsubscribe function
   */
  subscribe(options) {
    const { stream, handler, filter = {} } = options;

    if (!this.streams.has(stream)) {
      throw new EventError('STREAM_NOT_FOUND', `Stream ${stream} not found`);
    }

    // Create handler with filter
    const wrappedHandler = event => {
      if (this.matchesFilter(event, filter)) {
        handler(event);
      }
    };

    // Add listener
    this.on(stream, wrappedHandler);

    // Return unsubscribe function
    return () => {
      this.removeListener(stream, wrappedHandler);
    };
  }

  /**
   * Validate event object
   * @param {Object} event Event object
   * @return {Promise<void>}
   */
  async validateEvent(event) {
    const result = await validateEvent(event);

    if (!result.isValid) {
      throw new Error(`Invalid event: ${result.errors.join(', ')}`);
    }
  }

  /**
   * Apply stream filters to event
   * @param {string} stream Stream identifier
   * @param {Object} event Event object
   * @return {boolean} Whether event passes filters
   */
  applyFilters(stream, event) {
    const streamFilters = this.filters.get(stream);

    if (!streamFilters) return true;

    return Array.from(streamFilters.values()).every(filter => filter(event));
  }

  /**
   * Check if event matches filter conditions
   * @param {Object} event Event object
   * @param {Object} filter Filter conditions
   * @return {boolean} Whether event matches filter
   */
  matchesFilter(event, filter) {
    return Object.entries(filter).every(([key, value]) => {
      const eventValue = key.split('.').reduce((obj, k) => obj?.[k], event);

      return this.compareValues(eventValue, value);
    });
  }

  /**
   * Compare values for filtering
   * @param {any} value Event value
   * @param {any} filterValue Filter value
   * @return {boolean} Whether values match
   */
  compareValues(value, filterValue) {
    if (typeof filterValue === 'function') {
      return filterValue(value);
    }
    if (filterValue instanceof RegExp) {
      return filterValue.test(value);
    }

    return value === filterValue;
  }

  /**
   * Update stream metrics
   * @param {string} stream Stream identifier
   * @param {Object} event Event object
   */
  updateMetrics(stream, event) {
    const streamConfig = this.streams.get(stream);
    const streamMetrics = this.metrics.get(stream);

    // Update stream metrics
    streamConfig.metrics.processed++;
    streamConfig.metrics.lastEvent = event.metadata.timestamp;

    // Update event type metrics
    if (!streamMetrics.has(event.type)) {
      streamMetrics.set(event.type, 0);
    }
    streamMetrics.set(event.type, streamMetrics.get(event.type) + 1);
  }

  /**
   * Wrap event handler with error handling and metrics
   * @param {string} stream Stream identifier
   * @param {Function} handler Handler function
   * @return {Function} Wrapped handler
   */
  wrapHandler(stream, handler) {
    return async event => {
      const streamConfig = this.streams.get(stream);

      try {
        await handler(event);
      } catch (error) {
        streamConfig.metrics.errors++;
        logger.error('Event handler failed', {
          stream,
          event: event.id,
          error: error.message,
        });
      }
    };
  }

  /**
   * Generate unique event ID
   * @return {string} Event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get stream metrics
   * @param {string} stream Stream identifier
   * @return {Object} Stream metrics
   */
  getMetrics(stream) {
    const streamConfig = this.streams.get(stream);

    if (!streamConfig) {
      throw new EventError('STREAM_NOT_FOUND', `Stream ${stream} not found`);
    }

    const eventTypeMetrics = Object.fromEntries(this.metrics.get(stream));

    return {
      ...streamConfig.metrics,
      eventTypes: eventTypeMetrics,
    };
  }

  /**
   * List all streams
   * @return {Object[]} List of streams
   */
  listStreams() {
    return Array.from(this.streams.values()).map(stream => ({
      name: stream.name,
      type: stream.type,
      status: stream.status,
      metrics: this.getMetrics(stream.name),
    }));
  }

  /**
   * Remove stream
   * @param {string} name Stream identifier
   * @return {boolean} Whether stream was removed
   */
  removeStream(name) {
    const stream = this.streams.get(name);

    if (!stream) {
      return false;
    }

    // Remove all listeners
    this.removeAllListeners(name);

    // Clean up stream data
    this.streams.delete(name);
    this.handlers.delete(name);
    this.filters.delete(name);
    this.metrics.delete(name);

    logger.info('Event stream removed', { stream: name });

    return true;
  }
}

module.exports = new EventStream();

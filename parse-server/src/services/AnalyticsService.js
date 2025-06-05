/* eslint-disable no-unused-vars */
/* eslint-disable no-underscore-dangle */
/**
 * Analytics Service
 * Handles collection, processing, and storage of analytics data
 */

const Parse = require('parse/node');
const BaseService = require('./BaseService');
const config = require('../config');
const CacheService = require('./CacheService');

class AnalyticsService extends BaseService {
  constructor() {
    super('Analytics');
    this.eventQueue = [];
    this.processingInterval = null;
    this.batchSize = 100; // Process events in batches
  }

  /**
   * Service-specific initialization
   * @param {Object} options Initialization options
   */
  async _initializeService(options = {}) {
    this.registerDependency('cache', CacheService);

    // Initialize cache first
    await this._initializeCache();

    // Initialize storage after Parse Server is ready
    try {
      await this._initializeStorage();
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      // Continue even if storage initialization fails
      // This allows the service to work with reduced functionality
    }

    // Initialize real-time if enabled
    if (this.config.realtime.enabled) {
      try {
        await this._initializeRealtime();
      } catch (error) {
        console.error('Failed to initialize real-time:', error);
        // Continue without real-time functionality
      }
    }

    // Start event processing and register cleanup
    this._startEventProcessing();
    this.registerCleanup(async () => {
      clearInterval(this.processingInterval);
      await this._processEventBatch(); // Process remaining events
      if (this._subscription) {
        await this._subscription.unsubscribe();
      }
    });
  }

  /**
   * Track a page view event
   * @param {Object} data Page view data
   */
  async trackPageView(data) {
    this.validateInitialization();
    if (!this.config.collection.pageViews) return;

    const event = {
      type: 'pageView',
      timestamp: new Date(),
      data: {
        url: data.url,
        title: data.title,
        referrer: data.referrer,
        userAgent: data.userAgent,
        sessionId: data.sessionId,
        userId: data.userId,
        organizationId: data.organizationId,
        path: new URL(data.url).pathname,
      },
    };

    await this._queueEvent(event);
  }

  /**
   * Track a custom event
   * @param {Object} data Event data
   */
  async trackEvent(data) {
    this.validateInitialization();
    if (!this.config.collection.events) return;

    const event = {
      type: 'custom',
      timestamp: new Date(),
      data: {
        name: data.name,
        properties: data.properties,
        sessionId: data.sessionId,
        userId: data.userId,
        organizationId: data.organizationId,
        category: data.category || 'general',
      },
    };

    await this._queueEvent(event);
  }

  /**
   * Get analytics data for a specific timeframe
   * @param {Object} params Query parameters
   * @return {Promise<Object>} Analytics data
   */
  /**
   * Generate a cache key for analytics data
   * @param {string} type Analytics type
   * @param {Object} params Query parameters
   * @returns {string} Cache key
   */
  generateCacheKey(type, params) {
    const key = `analytics:${type}:${JSON.stringify(params)}`;
    return key;
  }

  async getAnalytics(params) {
    this.validateInitialization();
    const cache = this.getDependency('cache');
    const cacheKey = this.generateCacheKey('data', params);

    try {
      return await cache.getOrCompute(
        cacheKey,
        async () => {
          const query = this._buildAnalyticsQuery(params);
          const results = await query.find({ useMasterKey: true });
          // Aggregate results by metric type
          const aggregated = {
            pageViews: [],
            events: [],
            resourceUsage: [],
            errorRates: [],
          };

          const metrics = params.metrics || ['pageViews', 'events', 'resourceUsage', 'errorRates'];
          
          // Only process requested metrics
          if (metrics.includes('pageViews')) {
            aggregated.pageViews = results
              .filter(result => result.get('type') === 'pageView')
              .map(result => ({
                timestamp: result.get('timestamp'),
                ...result.get('data'),
              }));
          }

          if (metrics.includes('events')) {
            aggregated.events = results
              .filter(result => result.get('type') === 'custom')
              .map(result => ({
                timestamp: result.get('timestamp'),
                ...result.get('data'),
              }));
          }

          if (metrics.includes('resourceUsage')) {
            aggregated.resourceUsage = results
              .filter(result => result.get('type') === 'resource')
              .map(result => ({
                timestamp: result.get('timestamp'),
                ...result.get('data'),
              }));
          }

          if (metrics.includes('errorRates')) {
            aggregated.errorRates = results
              .filter(result => result.get('type') === 'error')
              .map(result => ({
                timestamp: result.get('timestamp'),
                ...result.get('data'),
              }));
          }

          return {
            data: aggregated,
            timestamp: Date.now(),
          };
        },
        this._getCacheTTL(params)
      );
    } catch (error) {
      throw this.handleError(error, 'analytics retrieval');
    }
  }

  /**
   * Get real-time analytics data
   * @param {string} channel Real-time data channel
   * @return {Promise<Object>} Real-time analytics data
   */
  async getRealTimeAnalytics(channel) {
    this.validateInitialization();
    if (!this.config.realtime.enabled) {
      throw new Error('Real-time analytics is not enabled');
    }

    const cache = this.getDependency('cache');
    const cacheKey = this.generateCacheKey('realtime', { channel });

    try {
      return await cache.getOrCompute(
        cacheKey,
        async () => {
          const query = new Parse.Query('AnalyticsEvent').descending('timestamp').limit(100);

          const results = await query.find({ useMasterKey: true });
          // Process real-time data based on channel
          let channelData;

          switch (channel) {
            case 'system_load':
              channelData = results
                .filter(result => result.get('type') === 'resource')
                .map(result => ({
                  timestamp: result.get('timestamp'),
                  ...result.get('data'),
                }));
              break;
            case 'api_usage':
              channelData = results
                .filter(result => result.get('type') === 'api')
                .map(result => ({
                  timestamp: result.get('timestamp'),
                  ...result.get('data'),
                }));
              break;
            case 'error_rates':
              channelData = results
                .filter(result => result.get('type') === 'error')
                .map(result => ({
                  timestamp: result.get('timestamp'),
                  ...result.get('data'),
                }));
              break;
            default:
              channelData = [];
          }

          return {
            data: channelData,
            timestamp: Date.now(),
          };
        },
        30
      ); // Cache for 30 seconds
    } catch (error) {
      throw this.handleError(error, 'real-time analytics retrieval');
    }
  }

  /**
   * Initialize cache for analytics
   * @private
   */
  async _initializeCache() {
    const cache = this.getDependency('cache');

    await cache.initialize({
      ttl: 300, // 5 minutes default TTL
      maxSize: 100 * 1024 * 1024, // 100MB max cache size
    });
  }

  /**
   * Initialize storage for analytics data
   * @private
   */
  async _initializeStorage() {
    try {
      // Wait for Parse Server to be ready and Parse SDK to be initialized
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Initialize Parse SDK if not already initialized
      if (!Parse.applicationId) {
        Parse.initialize(config.parseServer.appId, undefined, config.parseServer.masterKey);
        Parse.serverURL = config.parseServer.serverURL;
      }

      const schema = new Parse.Schema('AnalyticsEvent');
      try {
        await schema.get({ useMasterKey: true });
        console.log('AnalyticsEvent schema already exists');
      } catch (error) {
        // Only create schema if it doesn't exist (error code 103)
        if (error.code === Parse.Error.INVALID_CLASS_NAME) {
          console.log('Creating AnalyticsEvent schema...');
          await schema
            .addString('type')
            .addDate('timestamp')
            .addObject('data')
            .addString('sessionId')
            .addString('userId')
            .addString('organizationId')
            .addIndex('timestamp_type', { timestamp: 1, type: 1 })
            .addIndex('userId_type', { userId: 1, type: 1 })
            .addIndex('organizationId', { organizationId: 1 })
            .save({ useMasterKey: true });
          console.log('AnalyticsEvent schema created successfully');
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      throw error;
    }
  }

  /**
   * Initialize real-time capabilities
   * @private
   */
  async _initializeRealtime() {
    const query = new Parse.Query('AnalyticsEvent').ascending('timestamp');

    this._subscription = await query.subscribe();
    this._subscription.on('create', this._handleRealtimeEvent.bind(this));
  }

  /**
   * Queue an event for processing
   * @param {Object} event Event data
   * @private
   */
  async _queueEvent(event) {
    this.eventQueue.push(event);

    // Process immediately if queue exceeds batch size
    if (this.eventQueue.length >= this.batchSize) {
      await this._processEventBatch();
    }
  }

  /**
   * Start event processing loop
   * @private
   */
  _startEventProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(
      () => this._processEventBatch(),
      5000 // Process every 5 seconds
    );
  }

  /**
   * Process a batch of events
   * @private
   */
  async _processEventBatch() {
    if (this.eventQueue.length === 0) return;

    const batch = this.eventQueue.splice(0, this.batchSize);
    const AnalyticsEvent = Parse.Object.extend('AnalyticsEvent');

    try {
      const objects = batch.map(event => {
        const analyticsEvent = new AnalyticsEvent();

        return analyticsEvent.setACL(new Parse.ACL({ '*': { read: true } })).set({
          type: event.type,
          timestamp: event.timestamp,
          data: event.data,
          sessionId: event.data.sessionId,
          userId: event.data.userId,
          organizationId: event.data.organizationId,
        });
      });

      await Parse.Object.saveAll(objects, { useMasterKey: true });

      // Handle real-time updates
      if (this.config.realtime.enabled) {
        objects.forEach(this._handleRealtimeEvent.bind(this));
      }

      // Invalidate relevant caches
      await this._invalidateAffectedCaches(batch);
    } catch (error) {
      console.error('Failed to process event batch:', error);
      // Re-queue failed events
      this.eventQueue.unshift(...batch);
    }
  }

  /**
   * Build analytics query based on parameters
   * @param {Object} params Query parameters
   * @return {Parse.Query} Built query
   * @private
   */
  _buildAnalyticsQuery(params) {
    const { timeframe, filters } = params;
    const query = new Parse.Query('AnalyticsEvent');

    if (timeframe) {
      const startDate = new Date();

      startDate.setDate(startDate.getDate() - parseInt(timeframe));
      query.greaterThan('timestamp', startDate);
    }

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query.containedIn(`data.${key}`, value);
        } else {
          query.equalTo(`data.${key}`, value);
        }
      });
    }

    return query;
  }

  /**
   * Get cache TTL based on parameters
   * @param {Object} params Operation parameters
   * @return {number} Cache TTL in seconds
   * @private
   */
  _getCacheTTL(params) {
    if (params.timeframe === '1h') return 300; // 5 minutes
    if (params.timeframe === '1d') return 1800; // 30 minutes
    if (params.timeframe === '7d') return 3600; // 1 hour
    if (params.timeframe === '30d') return 7200; // 2 hours

    return 300; // Default 5 minutes
  }

  /**
   * Handle real-time event updates
   * @param {Parse.Object} event Analytics event
   * @private
   */
  _handleRealtimeEvent(event) {
    Parse.LiveQuery.emit('analytics', {
      type: event.get('type'),
      timestamp: event.get('timestamp'),
      data: event.get('data'),
    });
  }

  /**
   * Invalidate affected caches after event processing
   * @param {Array} events Processed events
   * @private
   */
  async _invalidateAffectedCaches(events) {
    const cache = this.getDependency('cache');
    const patterns = new Set(events.map(event => `analytics:*:${event.data.organizationId}`));

    for (const pattern of patterns) {
      await cache.delete(pattern);
    }
  }
}

module.exports = new AnalyticsService();

/**
 * Media Analytics Service
 * Tracks and analyzes media usage patterns
 */

const BaseService = require('../../../services/BaseService');

class MediaAnalyticsService extends BaseService {
  constructor() {
    super('MediaAnalytics');
    this.cache = new Map();
    this.aggregationJobs = new Map();
  }

  /**
   * Service-specific initialization
   * @param {Object} options Initialization options
   */
  async _initializeService(options = {}) {
    // Register cleanup handler
    this.registerCleanup(async () => {
      // Clear any pending aggregation jobs
      for (const [_, timeout] of this.aggregationJobs) {
        clearTimeout(timeout);
      }
      this.aggregationJobs.clear();
      this.cache.clear();
    });
  }

  /**
   * Track media access
   * @param {Object} data Access data
   * @returns {Promise<void>}
   */
  async trackAccess(data) {
    return this.executeOperation(
      async () => {
        const { mediaId, userId, type, context, metadata = {} } = data;

        const accessLog = new Parse.Object('MediaAccessLog');
        accessLog.set({
          media: Parse.Object.createWithoutData('CMSMedia', mediaId),
          user: userId ? Parse.Object.createWithoutData('_User', userId) : null,
          type,
          context,
          metadata,
          timestamp: new Date(),
        });

        await accessLog.save(null, { useMasterKey: true });

        // Update real-time counters
        await this.updateCounters(mediaId, type);

        // Queue analytics aggregation
        this.queueAggregation(mediaId);
      },
      'trackAccess',
      { data }
    );
  }

  /**
   * Update access counters
   * @param {string} mediaId Media ID
   * @param {string} type Access type
   * @returns {Promise<void>}
   */
  async updateCounters(mediaId, type) {
    return this.executeOperation(
      async () => {
        const media = await new Parse.Query('CMSMedia').get(mediaId, { useMasterKey: true });

        const counters = media.get('counters') || {};
        counters[type] = (counters[type] || 0) + 1;
        counters.total = (counters.total || 0) + 1;

        media.set('counters', counters);
        await media.save(null, { useMasterKey: true });
      },
      'updateCounters',
      { mediaId, type }
    );
  }

  /**
   * Queue analytics aggregation
   * @param {string} mediaId Media ID
   */
  queueAggregation(mediaId) {
    if (this.aggregationJobs.has(mediaId)) {
      clearTimeout(this.aggregationJobs.get(mediaId));
    }

    const interval = this.config.performance.queue.interval || 1000;
    this.aggregationJobs.set(
      mediaId,
      setTimeout(async () => {
        try {
          await this.aggregateAnalytics(mediaId);
        } catch (error) {
          this.logger.error('Analytics aggregation failed:', {
            metadata: {
              mediaId,
              error: error.message,
            },
            stack: error.stack,
          });
        } finally {
          this.aggregationJobs.delete(mediaId);
        }
      }, interval)
    );
  }

  /**
   * Aggregate analytics data
   * @param {string} mediaId Media ID
   * @returns {Promise<Object>} Aggregated analytics
   */
  async aggregateAnalytics(mediaId) {
    return this.executeOperation(
      async () => {
        const query = new Parse.Query('MediaAccessLog');
        query.equalTo('media', Parse.Object.createWithoutData('CMSMedia', mediaId));
        query.descending('timestamp');
        query.limit(1000);

        const logs = await query.find({ useMasterKey: true });
        const analytics = {
          views: 0,
          downloads: 0,
          uniqueUsers: new Set(),
          contexts: {},
          timeRanges: {
            hourly: new Array(24).fill(0),
            daily: new Array(7).fill(0),
            monthly: new Array(12).fill(0),
          },
          devices: {},
          locations: {},
          referrers: {},
        };

        logs.forEach(log => {
          const type = log.get('type');
          const context = log.get('context');
          const userId = log.get('user')?.id;
          const metadata = log.get('metadata');
          const timestamp = log.get('timestamp');

          // Update basic counters
          if (type === 'view') analytics.views++;
          if (type === 'download') analytics.downloads++;
          if (userId) analytics.uniqueUsers.add(userId);

          // Update context stats
          analytics.contexts[context] = (analytics.contexts[context] || 0) + 1;

          // Update time ranges
          const hour = timestamp.getHours();
          const day = timestamp.getDay();
          const month = timestamp.getMonth();
          analytics.timeRanges.hourly[hour]++;
          analytics.timeRanges.daily[day]++;
          analytics.timeRanges.monthly[month]++;

          // Update device stats
          if (metadata.device) {
            analytics.devices[metadata.device] = (analytics.devices[metadata.device] || 0) + 1;
          }

          // Update location stats
          if (metadata.location) {
            analytics.locations[metadata.location] =
              (analytics.locations[metadata.location] || 0) + 1;
          }

          // Update referrer stats
          if (metadata.referrer) {
            analytics.referrers[metadata.referrer] =
              (analytics.referrers[metadata.referrer] || 0) + 1;
          }
        });

        // Convert unique users set to count
        analytics.uniqueUsers = analytics.uniqueUsers.size;

        // Save aggregated analytics
        const media = await new Parse.Query('CMSMedia').get(mediaId, { useMasterKey: true });

        media.set('analytics', analytics);
        await media.save(null, { useMasterKey: true });

        return analytics;
      },
      'aggregateAnalytics',
      { mediaId }
    );
  }

  /**
   * Get media analytics
   * @param {string} mediaId Media ID
   * @param {Object} options Query options
   * @returns {Promise<Object>} Media analytics
   */
  async getAnalytics(mediaId, options = {}) {
    return this.executeOperation(
      async () => {
        const media = await new Parse.Query('CMSMedia').get(mediaId, { useMasterKey: true });

        let analytics = media.get('analytics');

        // Check if we need to reaggregate
        if (!analytics || options.refresh) {
          analytics = await this.aggregateAnalytics(mediaId);
        }

        return analytics;
      },
      'getAnalytics',
      { mediaId, options }
    );
  }

  /**
   * Get trending media
   * @param {Object} options Query options
   * @returns {Promise<Array>} Trending media items
   */
  async getTrendingMedia(options = {}) {
    return this.executeOperation(
      async () => {
        const { limit = 10, timeRange = '24h', context = null } = options;

        const query = new Parse.Query('MediaAccessLog');
        const timestamp = new Date();

        switch (timeRange) {
          case '24h':
            timestamp.setHours(timestamp.getHours() - 24);
            break;
          case '7d':
            timestamp.setDate(timestamp.getDate() - 7);
            break;
          case '30d':
            timestamp.setDate(timestamp.getDate() - 30);
            break;
          default:
            throw new Error('Invalid time range');
        }

        query.greaterThan('timestamp', timestamp);
        if (context) query.equalTo('context', context);

        const pipeline = [
          { group: { objectId: '$media', count: { $sum: 1 } } },
          { sort: { count: -1 } },
          { limit },
        ];

        const results = await query.aggregate(pipeline, { useMasterKey: true });

        // Fetch full media objects
        const mediaIds = results.map(r => r.objectId);
        const mediaQuery = new Parse.Query('CMSMedia');
        mediaQuery.containedIn('objectId', mediaIds);

        const media = await mediaQuery.find({ useMasterKey: true });

        // Combine media objects with their counts
        return media.map(m => ({
          media: m,
          count: results.find(r => r.objectId === m.id).count,
        }));
      },
      'getTrendingMedia',
      { options }
    );
  }

  /**
   * Generate analytics report
   * @param {Object} options Report options
   * @returns {Promise<Object>} Analytics report
   */
  async generateReport(options = {}) {
    return this.executeOperation(
      async () => {
        const {
          startDate,
          endDate = new Date(),
          groupBy = 'day',
          metrics = ['views', 'downloads'],
          filters = {},
        } = options;

        const query = new Parse.Query('MediaAccessLog');
        query.greaterThanOrEqualTo('timestamp', startDate);
        query.lessThanOrEqualTo('timestamp', endDate);

        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
          query.equalTo(key, value);
        });

        const pipeline = [
          {
            group: {
              objectId: {
                $dateToString: {
                  format: groupBy === 'day' ? '%Y-%m-%d' : '%Y-%m',
                  date: '$timestamp',
                },
              },
              ...metrics.reduce(
                (acc, metric) => ({
                  ...acc,
                  [metric]: {
                    $sum: { $cond: [{ $eq: ['$type', metric] }, 1, 0] },
                  },
                }),
                {}
              ),
            },
          },
          { sort: { objectId: 1 } },
        ];

        const results = await query.aggregate(pipeline, { useMasterKey: true });

        return {
          startDate,
          endDate,
          groupBy,
          metrics,
          data: results,
        };
      },
      'generateReport',
      { options }
    );
  }
}

module.exports = new MediaAnalyticsService();

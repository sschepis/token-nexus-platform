/**
 * Analytics Cloud Functions
 * Exposes analytics functionality through Parse Cloud Functions
 */

const AnalyticsService = require('../services/AnalyticsService');

/**
 * Initialize analytics cloud functions
 */
function initialize() {
  // Track page view
  Parse.Cloud.define('trackPageView', async request => {
    try {
      const { user, params } = request;

      // Ensure required parameters are present
      if (!params.url || !params.title) {
        throw new Error('Missing required parameters: url and title are required');
      }

      // Add user and session information
      const data = {
        ...params,
        userId: user ? user.id : undefined,
        sessionId: params.sessionId,
        organizationId: params.organizationId,
        userAgent: params.userAgent,
        referrer: params.referrer,
      };

      await AnalyticsService.trackPageView(data);
      return { success: true };
    } catch (error) {
      console.error('Error tracking page view:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to track page view');
    }
  });

  // Track custom event
  Parse.Cloud.define('trackEvent', async request => {
    try {
      const { user, params } = request;

      // Ensure required parameters are present
      if (!params.name) {
        throw new Error('Missing required parameter: name');
      }

      // Add user and session information
      const data = {
        name: params.name,
        properties: params.properties || {},
        userId: user ? user.id : undefined,
        sessionId: params.sessionId,
        organizationId: params.organizationId,
      };

      await AnalyticsService.trackEvent(data);
      return { success: true };
    } catch (error) {
      console.error('Error tracking event:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to track event');
    }
  });

  // Get analytics data
  Parse.Cloud.define('getAnalytics', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate parameters
      if (!params.timeframe || !params.metrics) {
        throw new Error('Missing required parameters: timeframe and metrics are required');
      }

      // Add organization filter if applicable
      const filters = params.filters || {};
      if (params.organizationId) {
        filters.organizationId = params.organizationId;
      }

      const analytics = await AnalyticsService.getAnalytics({
        timeframe: params.timeframe,
        metrics: params.metrics,
        filters: filters,
      });

      return analytics;
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to get analytics');
    }
  });

  // Get real-time analytics
  Parse.Cloud.define('getRealTimeAnalytics', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate parameters
      if (!params.channel) {
        throw new Error('Missing required parameter: channel');
      }

      const realTimeData = await AnalyticsService.getRealTimeAnalytics(params.channel);
      return realTimeData;
    } catch (error) {
      console.error('Error getting real-time analytics:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to get real-time analytics');
    }
  });

  // Before save trigger for AnalyticsEvent
  Parse.Cloud.beforeSave('AnalyticsEvent', async request => {
    const event = request.object;

    // Ensure required fields are present
    if (!event.get('type') || !event.get('timestamp') || !event.get('data')) {
      throw new Error('Missing required fields');
    }

    // Add metadata
    event.set('_metadata', {
      createdAt: new Date(),
      source: 'cloud',
    });
  });

  // After save trigger for AnalyticsEvent
  Parse.Cloud.afterSave('AnalyticsEvent', async request => {
    const event = request.object;

    // Emit real-time update if enabled
    if (AnalyticsService.config.realtime.enabled) {
      Parse.LiveQuery.emit('analytics', event);
    }

    // Perform any necessary aggregations
    try {
      await performAggregations(event);
    } catch (error) {
      console.error('Error performing aggregations:', error);
    }
  });
}

/**
 * Perform necessary aggregations on analytics events
 * @param {Parse.Object} event The analytics event
 */
async function performAggregations(event) {
  const type = event.get('type');
  const timestamp = event.get('timestamp');
  const data = event.get('data');

  // Get the hour bucket for this event
  const hourBucket = new Date(timestamp);
  hourBucket.setMinutes(0, 0, 0);

  // Update hourly aggregations
  const HourlyStats = Parse.Object.extend('HourlyAnalytics');
  const query = new Parse.Query(HourlyStats);
  query.equalTo('hour', hourBucket);
  query.equalTo('type', type);

  try {
    let stats = await query.first({ useMasterKey: true });

    if (!stats) {
      stats = new HourlyStats();
      stats.set('hour', hourBucket);
      stats.set('type', type);
      stats.set('count', 0);
      stats.set('data', {});
    }

    // Increment count
    stats.increment('count');

    // Update aggregated data based on event type
    const aggregatedData = stats.get('data') || {};
    switch (type) {
      case 'pageView':
        aggregatedData.urls = aggregatedData.urls || {};
        aggregatedData.urls[data.url] = (aggregatedData.urls[data.url] || 0) + 1;
        break;
      case 'custom':
        aggregatedData.events = aggregatedData.events || {};
        aggregatedData.events[data.name] = (aggregatedData.events[data.name] || 0) + 1;
        break;
    }

    stats.set('data', aggregatedData);
    await stats.save(null, { useMasterKey: true });
  } catch (error) {
    console.error('Error updating hourly stats:', error);
    throw error;
  }
}

module.exports = {
  initialize,
};

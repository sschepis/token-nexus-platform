/* global Parse */

const AnalyticsService = require('../../../src/services/AnalyticsService');
const CacheService = require('../../../src/services/CacheService');
const config = require('../../../src/config');

/**
 * Get system-wide analytics data
 * @param {Object} request Parse Cloud request object
 * @return {Promise<Object>} Analytics data
 */
async function getSystemAnalytics(request) {
  if (!request.user) {
    throw new Error('User must be authenticated');
  }

  console.log('Checking system admin access for user:', request.user.id);

  // Check if user is system admin
  if (
    request.user.get('username') === config.dashboard.users[0].user ||
    request.user.get('isAdmin') === true
  ) {
    console.log('User is system admin via username or isAdmin flag');
    // User is system admin, proceed with analytics
  } else {
    console.log('Checking admin role as fallback');
    // Check admin role as fallback
    const adminRole = await new Parse.Query(Parse.Role)
      .equalTo('name', 'admin')
      .first({ useMasterKey: true });

    if (!adminRole) {
      console.log('Admin role not found');
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Admin role not found');
    }

    // Check if user is in admin role
    const userQuery = adminRole.getUsers().query();

    userQuery.equalTo('objectId', request.user.id);
    const isAdmin = await userQuery.first({ useMasterKey: true });

    if (!isAdmin) {
      console.log('User is not in admin role');
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User must be a system administrator');
    }

    console.log('User is system admin via admin role');
  }

  const { timeframe = '24h', filters = {} } = request.params;

  try {
    console.log('Fetching analytics data with params:', { timeframe, filters });

    // Initialize services if needed
    if (!CacheService.initialized) {
      console.log('Cache service not initialized, initializing now...');
      await CacheService.initialize(config.cache);
      console.log('Cache service initialized');
    }

    if (!AnalyticsService.initialized) {
      console.log('Analytics service not initialized, initializing now...');
      await AnalyticsService.initialize(config.analytics);
      console.log('Analytics service initialized');
    }

    // Get analytics data from service
    const analyticsData = await AnalyticsService.getAnalytics({
      timeframe,
      filters,
      metrics: ['pageViews', 'events', 'resourceUsage', 'errorRates'],
    });

    // Get real-time system metrics
    const systemMetrics = await Promise.all([
      AnalyticsService.getRealTimeAnalytics('system_load'),
      AnalyticsService.getRealTimeAnalytics('api_usage'),
      AnalyticsService.getRealTimeAnalytics('error_rates'),
    ]);

    // Format the response
    return {
      pageViews: analyticsData.data.pageViews || [],
      events: analyticsData.data.events || [],
      resourceUsage: analyticsData.data.resourceUsage || [],
      errorRates: analyticsData.data.errorRates || [],
      realtimeMetrics: {
        systemLoad: systemMetrics[0].data,
        apiUsage: systemMetrics[1].data,
        errorRates: systemMetrics[2].data,
      },
      timestamp: analyticsData.timestamp,
    };
  } catch (error) {
    console.error('Error fetching system analytics:', error);
    throw new Error('Failed to fetch system analytics data');
  }
}

module.exports = getSystemAnalytics;

// Dashboard Metrics & Analytics
// Handles dashboard metrics, performance data, and analytics

const {
  withOrganizationContext,
  createOrgPointer,
  calculateGrowthPercentage,
  handleDashboardError,
  createSuccessResponse
} = require('./utils');

/**
 * Get dashboard metrics
 */
Parse.Cloud.define('getDashboardMetrics', async (request) => {
  // Apply organization context middleware
  request = await withOrganizationContext(request);
  
  const { user, organizationId } = request;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    // Get user metrics
    const OrgRole = Parse.Object.extend('OrgRole');
    const userQuery = new Parse.Query(OrgRole);
    userQuery.equalTo('organization', createOrgPointer(organizationId));
    userQuery.equalTo('isActive', true);
    const totalUsers = await userQuery.count({ useMasterKey: true });

    // Get active users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUserQuery = new Parse.Query(Parse.User);
    activeUserQuery.greaterThan('lastLogin', thirtyDaysAgo);
    activeUserQuery.matchesQuery('id', new Parse.Query(OrgRole)
      .equalTo('organization', createOrgPointer(organizationId))
      .equalTo('isActive', true)
      .select('user')
    );
    const activeUsers = await activeUserQuery.count({ useMasterKey: true });

    // Get token metrics
    const Token = Parse.Object.extend('Token');
    const tokenQuery = new Parse.Query(Token);
    tokenQuery.equalTo('organization', createOrgPointer(organizationId));
    const totalTokens = await tokenQuery.count({ useMasterKey: true });

    // Get active tokens
    const activeTokenQuery = new Parse.Query(Token);
    activeTokenQuery.equalTo('organization', createOrgPointer(organizationId));
    activeTokenQuery.equalTo('status', 'active');
    const activeTokens = await activeTokenQuery.count({ useMasterKey: true });

    // Get app metrics
    const OrgAppInstallation = Parse.Object.extend('OrgAppInstallation');
    const appQuery = new Parse.Query(OrgAppInstallation);
    appQuery.equalTo('organization', createOrgPointer(organizationId));
    appQuery.equalTo('isActive', true);
    const installedApps = await appQuery.count({ useMasterKey: true });

    // Get recent activity count
    const recentActivityQuery = new Parse.Query('AuditLog');
    recentActivityQuery.equalTo('organizationId', organizationId);
    recentActivityQuery.greaterThan('createdAt', thirtyDaysAgo);
    const recentActivityCount = await recentActivityQuery.count({ useMasterKey: true });

    return createSuccessResponse({
      metrics: {
        users: {
          total: totalUsers,
          active: activeUsers,
          growth: calculateGrowthPercentage(totalUsers, activeUsers)
        },
        tokens: {
          total: totalTokens,
          active: activeTokens,
          utilizationRate: totalTokens > 0 ? (activeTokens / totalTokens) * 100 : 0
        },
        apps: {
          installed: installedApps
        },
        activity: {
          recentCount: recentActivityCount,
          dailyAverage: Math.round(recentActivityCount / 30)
        }
      }
    });

  } catch (error) {
    throw handleDashboardError(error, 'getDashboardMetrics');
  }
});

/**
 * Get performance metrics
 */
Parse.Cloud.define('getPerformanceMetrics', async (request) => {
  // Apply organization context middleware
  request = await withOrganizationContext(request);
  
  const { user } = request;
  // Fix: Access params from request.params, with proper fallback
  const params = request.params || {};
  const { timeRange = '24h', metricType } = params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    // Mock performance metrics - in a real implementation,
    // this would gather actual system metrics
    const metrics = {
      apiRequests: {
        total: Math.floor(Math.random() * 20000) + 10000,
        successful: Math.floor(Math.random() * 19500) + 9500,
        failed: Math.floor(Math.random() * 500) + 50,
        averageResponseTime: Math.floor(Math.random() * 200) + 100
      },
      databaseQueries: {
        total: Math.floor(Math.random() * 10000) + 5000,
        averageTime: Math.floor(Math.random() * 100) + 30,
        slowQueries: Math.floor(Math.random() * 50) + 5
      },
      memoryUsage: {
        current: `${(Math.random() * 2 + 1).toFixed(1)}GB`,
        peak: `${(Math.random() * 1 + 2.5).toFixed(1)}GB`,
        average: `${(Math.random() * 0.5 + 2).toFixed(1)}GB`
      },
      cpuUsage: {
        current: `${Math.floor(Math.random() * 30 + 10)}%`,
        peak: `${Math.floor(Math.random() * 20 + 40)}%`,
        average: `${Math.floor(Math.random() * 10 + 20)}%`
      },
      timestamp: new Date().toISOString()
    };

    return createSuccessResponse({
      metrics: metricType ? metrics[metricType] : metrics
    });

  } catch (error) {
    return handleDashboardError(error, 'getPerformanceMetrics', { metrics: {} });
  }
});

/**
 * Get chart data for dashboard
 */
Parse.Cloud.define('getDashboardChartData', async (request) => {
  // Apply organization context middleware
  request = await withOrganizationContext(request);
  
  const { user, organizationId } = request;
  // Fix: Access params from request.params, with proper fallback
  const params = request.params || {};
  const { chartType = 'userGrowth', period = '30d' } = params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    let chartData = [];

    switch (chartType) {
      case 'userGrowth':
        chartData = await getUserGrowthData(organizationId, period);
        break;
      case 'tokenActivity':
        chartData = await getTokenActivityData(organizationId, period);
        break;
      case 'appUsage':
        chartData = await getAppUsageData(organizationId, period);
        break;
      default:
        throw new Error('Invalid chart type');
    }

    return createSuccessResponse({
      chartType,
      period,
      data: chartData
    });

  } catch (error) {
    throw handleDashboardError(error, 'getDashboardChartData');
  }
});

/**
 * Helper function to get user growth data
 */
async function getUserGrowthData(organizationId, period) {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const data = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const OrgRole = Parse.Object.extend('OrgRole');
    const query = new Parse.Query(OrgRole);
    query.equalTo('organization', createOrgPointer(organizationId));
    query.lessThan('createdAt', nextDate);
    
    const count = await query.count({ useMasterKey: true });
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: count
    });
  }
  
  return data;
}

/**
 * Helper function to get token activity data
 */
async function getTokenActivityData(organizationId, period) {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const data = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const Token = Parse.Object.extend('Token');
    const query = new Parse.Query(Token);
    query.equalTo('organization', createOrgPointer(organizationId));
    query.greaterThanOrEqualTo('createdAt', date);
    query.lessThan('createdAt', nextDate);
    
    const count = await query.count({ useMasterKey: true });
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: count
    });
  }
  
  return data;
}

/**
 * Helper function to get app usage data
 */
async function getAppUsageData(organizationId, period) {
  // TODO: Implement actual app usage tracking
  throw new Error('App usage tracking not yet implemented. Please implement actual usage data collection.');
}


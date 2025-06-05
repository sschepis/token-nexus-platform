// Cloud functions for Dashboard Management

const { withOrganizationContext } = require('../../middleware/organizationContextMiddleware');

// Get dashboard configuration for a user
Parse.Cloud.define('getDashboardConfig', async (request) => {
  // Apply organization context middleware
  request = await withOrganizationContext(request);
  
  const { user } = request;
  const { organizationId } = request.params; // Now guaranteed to exist

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    const DashboardConfig = Parse.Object.extend('DashboardConfig');
    const query = new Parse.Query(DashboardConfig);
    
    query.equalTo('user', user);
    query.equalTo('organization', {
      __type: 'Pointer',
      className: 'Organization',
      objectId: organizationId
    });
    
    let config = await query.first({ useMasterKey: true });
    
    if (!config) {
      // Create default configuration
      config = new DashboardConfig();
      config.set('user', user);
      config.set('organization', {
        __type: 'Pointer',
        className: 'Organization',
        objectId: organizationId
      });
      config.set('layouts', {
        lg: [],
        md: [],
        sm: [],
        xs: []
      });
      config.set('widgets', []);
      config.set('isDefault', true);
      
      // Set ACL
      const acl = new Parse.ACL(user);
      acl.setPublicReadAccess(false);
      acl.setPublicWriteAccess(false);
      config.setACL(acl);
      
      await config.save(null, { useMasterKey: true });
    }

    return {
      success: true,
      config: {
        id: config.id,
        layouts: config.get('layouts'),
        widgets: config.get('widgets'),
        isDefault: config.get('isDefault'),
        updatedAt: config.get('updatedAt')
      }
    };

  } catch (error) {
    console.error('Get dashboard config error:', error);
    throw error;
  }
});

// Save dashboard configuration
Parse.Cloud.define('saveDashboardConfig', async (request) => {
  // Apply organization context middleware
  request = await withOrganizationContext(request);
  
  const { user } = request;
  const { organizationId, layouts, widgets } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!organizationId || !layouts || !widgets) {
    throw new Error('Organization ID, layouts, and widgets are required');
  }

  try {
    const DashboardConfig = Parse.Object.extend('DashboardConfig');
    const query = new Parse.Query(DashboardConfig);
    
    query.equalTo('user', user);
    query.equalTo('organization', {
      __type: 'Pointer',
      className: 'Organization',
      objectId: organizationId
    });
    
    let config = await query.first({ useMasterKey: true });
    
    if (!config) {
      config = new DashboardConfig();
      config.set('user', user);
      config.set('organization', {
        __type: 'Pointer',
        className: 'Organization',
        objectId: organizationId
      });
      
      // Set ACL
      const acl = new Parse.ACL(user);
      acl.setPublicReadAccess(false);
      acl.setPublicWriteAccess(false);
      config.setACL(acl);
    }

    config.set('layouts', layouts);
    config.set('widgets', widgets);
    config.set('isDefault', false);
    
    await config.save(null, { useMasterKey: true });

    return {
      success: true,
      message: 'Dashboard configuration saved successfully',
      configId: config.id
    };

  } catch (error) {
    console.error('Save dashboard config error:', error);
    throw error;
  }
});

// Get dashboard activity feed
Parse.Cloud.define('getDashboardActivity', async (request) => {
  // Apply organization context middleware
  request = await withOrganizationContext(request);
  
  const { user } = request;
  const { organizationId, limit = 20 } = request.params; // organizationId now guaranteed to exist

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    // Organization access is already validated by middleware

    const AuditLog = Parse.Object.extend('AuditLog');
    const query = new Parse.Query(AuditLog);
    
    query.equalTo('organizationId', organizationId);
    query.descending('createdAt');
    query.limit(limit);
    query.include('actor');
    
    const activities = await query.find({ useMasterKey: true });
    
    const activityData = activities.map(activity => ({
      id: activity.id,
      action: activity.get('action'),
      targetType: activity.get('targetType'),
      targetId: activity.get('targetId'),
      actor: activity.get('actor') ? {
        id: activity.get('actor').id,
        email: activity.get('actor').get('email'),
        name: `${activity.get('actor').get('firstName')} ${activity.get('actor').get('lastName')}`
      } : null,
      details: activity.get('details'),
      timestamp: activity.get('createdAt')
    }));

    return {
      success: true,
      activities: activityData
    };

  } catch (error) {
    console.error('Get dashboard activity error:', error);
    throw error;
  }
});

// Get dashboard metrics
Parse.Cloud.define('getDashboardMetrics', async (request) => {
  // Apply organization context middleware
  request = await withOrganizationContext(request);
  
  const { user } = request;
  const { organizationId } = request.params; // Now guaranteed to exist

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    // Organization access is already validated by middleware
    
    // Get user metrics
    const OrgRole = Parse.Object.extend('OrgRole');
    const userQuery = new Parse.Query(OrgRole);
    userQuery.equalTo('organization', {
      __type: 'Pointer',
      className: 'Organization',
      objectId: organizationId
    });
    userQuery.equalTo('isActive', true);
    const totalUsers = await userQuery.count({ useMasterKey: true });

    // Get active users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUserQuery = new Parse.Query(Parse.User);
    activeUserQuery.greaterThan('lastLogin', thirtyDaysAgo);
    activeUserQuery.matchesQuery('id', new Parse.Query(OrgRole)
      .equalTo('organization', {
        __type: 'Pointer',
        className: 'Organization',
        objectId: organizationId
      })
      .equalTo('isActive', true)
      .select('user')
    );
    const activeUsers = await activeUserQuery.count({ useMasterKey: true });

    // Get token metrics
    const Token = Parse.Object.extend('Token');
    const tokenQuery = new Parse.Query(Token);
    tokenQuery.equalTo('organization', {
      __type: 'Pointer',
      className: 'Organization',
      objectId: organizationId
    });
    const totalTokens = await tokenQuery.count({ useMasterKey: true });

    // Get active tokens
    const activeTokenQuery = new Parse.Query(Token);
    activeTokenQuery.equalTo('organization', {
      __type: 'Pointer',
      className: 'Organization',
      objectId: organizationId
    });
    activeTokenQuery.equalTo('status', 'active');
    const activeTokens = await activeTokenQuery.count({ useMasterKey: true });

    // Get app metrics
    const OrgAppInstallation = Parse.Object.extend('OrgAppInstallation');
    const appQuery = new Parse.Query(OrgAppInstallation);
    appQuery.equalTo('organization', {
      __type: 'Pointer',
      className: 'Organization',
      objectId: organizationId
    });
    appQuery.equalTo('isActive', true);
    const installedApps = await appQuery.count({ useMasterKey: true });

    // Get recent activity count
    const recentActivityQuery = new Parse.Query('AuditLog');
    recentActivityQuery.equalTo('organizationId', organizationId);
    recentActivityQuery.greaterThan('createdAt', thirtyDaysAgo);
    const recentActivityCount = await recentActivityQuery.count({ useMasterKey: true });

    return {
      success: true,
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
    };

  } catch (error) {
    console.error('Get dashboard metrics error:', error);
    throw error;
  }
});

// Get chart data for dashboard
Parse.Cloud.define('getDashboardChartData', async (request) => {
  // Apply organization context middleware
  request = await withOrganizationContext(request);
  
  const { user } = request;
  const { organizationId, chartType = 'userGrowth', period = '30d' } = request.params; // organizationId now guaranteed

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    // Organization access is already validated by middleware

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

    return {
      success: true,
      chartType,
      period,
      data: chartData
    };

  } catch (error) {
    console.error('Get dashboard chart data error:', error);
    throw error;
  }
});

// Get recent tokens for dashboard widget
Parse.Cloud.define('getRecentTokens', async (request) => {
  // Apply organization context middleware
  request = await withOrganizationContext(request);
  
  const { user } = request;
  const { organizationId, limit = 5 } = request.params; // organizationId now guaranteed

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    // Organization access is already validated by middleware
    
    const Token = Parse.Object.extend('Token');
    const query = new Parse.Query(Token);
    
    query.equalTo('organization', {
      __type: 'Pointer',
      className: 'Organization',
      objectId: organizationId
    });
    query.descending('createdAt');
    query.limit(limit);
    query.include('createdBy');
    
    const tokens = await query.find({ useMasterKey: true });
    
    const tokenData = tokens.map(token => ({
      id: token.id,
      name: token.get('name'),
      symbol: token.get('symbol'),
      totalSupply: token.get('totalSupply'),
      status: token.get('status'),
      deploymentNetwork: token.get('deploymentNetwork'),
      contractAddress: token.get('contractAddress'),
      createdAt: token.get('createdAt'),
      createdBy: token.get('createdBy') ? {
        id: token.get('createdBy').id,
        email: token.get('createdBy').get('email'),
        name: `${token.get('createdBy').get('firstName')} ${token.get('createdBy').get('lastName')}`
      } : null
    }));

    return {
      success: true,
      tokens: tokenData
    };

  } catch (error) {
    console.error('Get recent tokens error:', error);
    throw error;
  }
});

// Helper function to check user org access
async function checkUserOrgAccess(user, organizationId) {
  if (user.get('isSystemAdmin')) {
    return true;
  }

  const OrgRole = Parse.Object.extend('OrgRole');
  const query = new Parse.Query(OrgRole);
  query.equalTo('user', user);
  query.equalTo('organization', {
    __type: 'Pointer',
    className: 'Organization',
    objectId: organizationId
  });
  query.equalTo('isActive', true);
  
  const role = await query.first({ useMasterKey: true });
  return !!role;
}

// Helper function to calculate growth percentage
function calculateGrowthPercentage(total, active) {
  if (total === 0) return 0;
  return Math.round((active / total) * 100);
}

// Helper function to get user growth data
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
    query.equalTo('organization', {
      __type: 'Pointer',
      className: 'Organization',
      objectId: organizationId
    });
    query.lessThan('createdAt', nextDate);
    
    const count = await query.count({ useMasterKey: true });
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: count
    });
  }
  
  return data;
}

// Helper function to get token activity data
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
    query.equalTo('organization', {
      __type: 'Pointer',
      className: 'Organization',
      objectId: organizationId
    });
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

// Helper function to get app usage data
async function getAppUsageData(organizationId, period) {
  // TODO: Implement actual app usage tracking
  throw new Error('App usage tracking not yet implemented. Please implement actual usage data collection.');
}

// Get dashboard layout (for compatibility with existing frontend)
Parse.Cloud.define('getDashboardLayout', async (request) => {
  const { user } = request;
  const { userId, orgId } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    // For now, return a simple default layout
    // This can be expanded to return actual saved layouts
    return {
      success: true,
      layouts: [],
      widgets: [],
      message: 'Default dashboard layout'
    };

  } catch (error) {
    console.error('Error retrieving dashboard layout:', error);
    if (error instanceof Parse.Error) {
      throw error;
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to retrieve dashboard layout.');
  }
});

module.exports = {};
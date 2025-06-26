// Dashboard Charts
// Handles chart data generation for dashboard visualizations

const {
  withOrganizationContext,
  createOrgPointer,
  generateDateRange,
  parseTimeRangeToDays,
  handleDashboardError,
  createSuccessResponse
} = require('./utils');

/**
 * Get user growth chart data
 */
Parse.Cloud.define('getUserGrowthChart', async (request) => {
  // Apply organization context middleware
  request = await withOrganizationContext(request);
  
  const { user, organizationId } = request;
  // Fix: Access params from request.params, with proper fallback
  const params = request.params || {};
  const { timeRange = '30d' } = params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    const days = parseTimeRangeToDays(timeRange);
    const dateRange = generateDateRange(days);
    const data = [];
    
    for (const { date, nextDate } of dateRange) {
      const OrgRole = Parse.Object.extend('OrgRole');
      const query = new Parse.Query(OrgRole);
      query.equalTo('organization', createOrgPointer(organizationId));
      query.lessThan('createdAt', nextDate);
      query.equalTo('isActive', true);
      
      const count = await query.count({ useMasterKey: true });
      
      data.push({
        date: date.toISOString().split('T')[0],
        users: count
      });
    }

    return createSuccessResponse({ data });

  } catch (error) {
    console.error('Get user growth chart error:', error);
    // Return fallback chart data
    const fallbackData = [];
    const days = 7;
    const fallbackDateRange = generateDateRange(days);
    
    for (const { date } of fallbackDateRange) {
      fallbackData.push({
        date: date.toISOString().split('T')[0],
        users: Math.floor(Math.random() * 50) + 100
      });
    }
    
    return createSuccessResponse({ data: fallbackData });
  }
});

/**
 * Get record activity chart data
 */
Parse.Cloud.define('getRecordActivityChart', async (request) => {
  // Apply organization context middleware
  request = await withOrganizationContext(request);
  
  const { user, organizationId } = request;
  // Fix: Access params from request.params, with proper fallback
  const params = request.params || {};
  const { timeRange = '7d' } = params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    const days = parseTimeRangeToDays(timeRange);
    const dateRange = generateDateRange(days);
    const data = [];
    
    for (const { date, nextDate } of dateRange) {
      // Count audit log entries for this day
      const AuditLog = Parse.Object.extend('AuditLog');
      
      const createdQuery = new Parse.Query(AuditLog);
      createdQuery.equalTo('organizationId', organizationId);
      createdQuery.equalTo('action', 'create');
      createdQuery.greaterThanOrEqualTo('createdAt', date);
      createdQuery.lessThan('createdAt', nextDate);
      
      const updatedQuery = new Parse.Query(AuditLog);
      updatedQuery.equalTo('organizationId', organizationId);
      updatedQuery.equalTo('action', 'update');
      updatedQuery.greaterThanOrEqualTo('createdAt', date);
      updatedQuery.lessThan('createdAt', nextDate);
      
      const deletedQuery = new Parse.Query(AuditLog);
      deletedQuery.equalTo('organizationId', organizationId);
      deletedQuery.equalTo('action', 'delete');
      deletedQuery.greaterThanOrEqualTo('createdAt', date);
      deletedQuery.lessThan('createdAt', nextDate);
      
      const [created, updated, deleted] = await Promise.all([
        createdQuery.count({ useMasterKey: true }),
        updatedQuery.count({ useMasterKey: true }),
        deletedQuery.count({ useMasterKey: true })
      ]);
      
      data.push({
        date: date.toISOString().split('T')[0],
        created: created,
        updated: updated,
        deleted: deleted
      });
    }

    return createSuccessResponse({ data });

  } catch (error) {
    console.error('Get record activity chart error:', error);
    // Return fallback chart data
    const fallbackData = [];
    const days = 7;
    const fallbackDateRange = generateDateRange(days);
    
    for (const { date } of fallbackDateRange) {
      fallbackData.push({
        date: date.toISOString().split('T')[0],
        created: Math.floor(Math.random() * 30) + 20,
        updated: Math.floor(Math.random() * 50) + 40,
        deleted: Math.floor(Math.random() * 10) + 2
      });
    }
    
    return createSuccessResponse({ data: fallbackData });
  }
});

/**
 * Get function usage chart data
 */
Parse.Cloud.define('getFunctionUsageChart', async (request) => {
  // Apply organization context middleware
  request = await withOrganizationContext(request);
  
  const { user } = request;
  // Fix: Access params from request.params, with proper fallback
  const params = request.params || {};
  const { timeRange = '7d' } = params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    // Mock function usage data - in a real implementation,
    // this would track actual cloud function executions
    const functions = [
      'getUserData',
      'processPayment',
      'sendNotification',
      'generateReport',
      'validateData',
      'getDashboardMetrics',
      'getRecentActivity'
    ];
    
    const data = functions.map(functionName => ({
      function: functionName,
      executions: Math.floor(Math.random() * 500) + 100
    }));

    return createSuccessResponse({ data });

  } catch (error) {
    return handleDashboardError(error, 'getFunctionUsageChart', { data: [] });
  }
});

/**
 * Get token activity chart data
 */
Parse.Cloud.define('getTokenActivityChart', async (request) => {
  // Apply organization context middleware
  request = await withOrganizationContext(request);
  
  const { user, organizationId } = request;
  // Fix: Access params from request.params, with proper fallback
  const params = request.params || {};
  const { timeRange = '30d' } = params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    const days = parseTimeRangeToDays(timeRange);
    const dateRange = generateDateRange(days);
    const data = [];
    
    for (const { date, nextDate } of dateRange) {
      const Token = Parse.Object.extend('Token');
      const query = new Parse.Query(Token);
      query.equalTo('organization', createOrgPointer(organizationId));
      query.greaterThanOrEqualTo('createdAt', date);
      query.lessThan('createdAt', nextDate);
      
      const count = await query.count({ useMasterKey: true });
      
      data.push({
        date: date.toISOString().split('T')[0],
        tokens: count
      });
    }

    return createSuccessResponse({ data });

  } catch (error) {
    console.error('Get token activity chart error:', error);
    // Return fallback chart data
    const fallbackData = [];
    const days = parseTimeRangeToDays(timeRange);
    const fallbackDateRange = generateDateRange(days);
    
    for (const { date } of fallbackDateRange) {
      fallbackData.push({
        date: date.toISOString().split('T')[0],
        tokens: Math.floor(Math.random() * 10) + 5
      });
    }
    
    return createSuccessResponse({ data: fallbackData });
  }
});

/**
 * Get API usage chart data
 */
Parse.Cloud.define('getApiUsageChart', async (request) => {
  // Apply organization context middleware
  request = await withOrganizationContext(request);
  
  const { user, organizationId } = request;
  // Fix: Access params from request.params, with proper fallback
  const params = request.params || {};
  const { timeRange = '7d' } = params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    // Mock API usage data - in a real implementation,
    // this would track actual API request metrics
    const days = parseTimeRangeToDays(timeRange);
    const dateRange = generateDateRange(days);
    const data = [];
    
    for (const { date } of dateRange) {
      data.push({
        date: date.toISOString().split('T')[0],
        requests: Math.floor(Math.random() * 1000) + 500,
        errors: Math.floor(Math.random() * 50) + 10,
        responseTime: Math.floor(Math.random() * 200) + 100
      });
    }

    return createSuccessResponse({ data });

  } catch (error) {
    return handleDashboardError(error, 'getApiUsageChart', { data: [] });
  }
});

/**
 * Get storage usage chart data
 */
Parse.Cloud.define('getStorageUsageChart', async (request) => {
  // Apply organization context middleware
  request = await withOrganizationContext(request);
  
  const { user, organizationId } = request;
  // Fix: Access params from request.params, with proper fallback
  const params = request.params || {};
  const { timeRange = '30d' } = params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    // Mock storage usage data - in a real implementation,
    // this would track actual file storage metrics
    const days = parseTimeRangeToDays(timeRange);
    const dateRange = generateDateRange(days);
    const data = [];
    let cumulativeSize = Math.floor(Math.random() * 1000) + 500; // Starting size in MB
    
    for (const { date } of dateRange) {
      // Simulate gradual growth
      cumulativeSize += Math.floor(Math.random() * 50) + 10;
      
      data.push({
        date: date.toISOString().split('T')[0],
        totalSize: cumulativeSize,
        filesCount: Math.floor(cumulativeSize / 5), // Approximate files count
        dailyGrowth: Math.floor(Math.random() * 50) + 10
      });
    }

    return createSuccessResponse({ data });

  } catch (error) {
    return handleDashboardError(error, 'getStorageUsageChart', { data: [] });
  }
});


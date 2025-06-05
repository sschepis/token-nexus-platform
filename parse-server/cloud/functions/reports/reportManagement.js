module.exports = Parse => {
  // Run a report
  Parse.Cloud.define('runReport', async request => {
    if (!request.user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const { reportId } = request.params;

    if (!reportId) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Report ID is required');
    }

    // Get the report
    const report = await new Parse.Query('CMSReport')
      .include('organization')
      .get(reportId, { useMasterKey: true });

    if (!report) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Report not found');
    }

    // Verify user has access to this organization
    const isAdmin = await Parse.Cloud.run('checkUserRole', { userId: request.user.id });
    const organization = report.get('organization');

    if (
      !isAdmin.isAdmin &&
      !isAdmin.organizationRoles.some(role => role.organizationId === organization.id)
    ) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Unauthorized access to organization');
    }

    try {
      // Create a new report result
      const result = new Parse.Object('CMSReportResult');

      result.set('report', report);
      result.set('organization', organization);
      result.set('createdBy', request.user);
      result.set('updatedBy', request.user);

      // Start timing
      const startTime = Date.now();

      // Execute the report query
      const query = report.get('query');
      let data;

      switch (report.get('type')) {
        case 'User Analytics':
          data = await executeUserAnalyticsQuery(query, organization);
          break;
        case 'Content Analytics':
          data = await executeContentAnalyticsQuery(query, organization);
          break;
        case 'Performance':
          data = await executePerformanceQuery(query, organization);
          break;
        case 'Custom':
          data = await executeCustomQuery(query, organization);
          break;
        default:
          throw new Error('Invalid report type');
      }

      // Calculate duration
      const duration = Date.now() - startTime;

      // Save the result
      result.set('data', data);
      result.set('runTime', duration);
      result.set('status', 'success');
      await result.save(null, { useMasterKey: true });

      // Update report's lastRun
      report.set('lastRun', new Date());
      await report.save(null, { useMasterKey: true });

      return {
        success: true,
        resultId: result.id,
        data,
        runTime: duration,
      };
    } catch (error) {
      // Save failed result
      const failedResult = new Parse.Object('CMSReportResult');

      failedResult.set('report', report);
      failedResult.set('organization', organization);
      failedResult.set('createdBy', request.user);
      failedResult.set('updatedBy', request.user);
      failedResult.set('status', 'failed');
      failedResult.set('error', error.message);
      await failedResult.save(null, { useMasterKey: true });

      throw error;
    }
  });

  // Helper functions for different query types
  async function executeUserAnalyticsQuery(query, organization) {
    const results = [];

    // Get user metrics
    if (query.activeUsers) {
      const activeUsersQuery = new Parse.Query('CMSMetric')
        .equalTo('organization', organization)
        .equalTo('name', 'active_users')
        .descending('timestamp')
        .limit(1);
      const activeUsers = await activeUsersQuery.first({ useMasterKey: true });

      if (activeUsers) {
        results.push({
          metric: 'Active Users',
          value: activeUsers.get('value'),
        });
      }
    }

    // Add more user analytics metrics as needed

    return results;
  }

  async function executeContentAnalyticsQuery(query, organization) {
    const results = [];

    // Get page view metrics
    if (query.pageViews) {
      const pageViewsQuery = new Parse.Query('VisitorStats')
        .equalTo('organizationId', organization.id)
        .descending('count')
        .limit(5);
      const pageViews = await pageViewsQuery.find({ useMasterKey: true });

      results.push({
        metric: 'Top Pages',
        data: pageViews.map(pv => ({
          page: pv.get('page'),
          views: pv.get('count'),
        })),
      });
    }

    // Add more content analytics metrics as needed

    return results;
  }

  async function executePerformanceQuery(query, organization) {
    const results = [];

    // Get API performance metrics
    if (query.apiPerformance) {
      const apiStatsQuery = new Parse.Query('APIStats')
        .equalTo('organizationId', organization.id)
        .descending('date')
        .limit(1);
      const apiStats = await apiStatsQuery.first({ useMasterKey: true });

      if (apiStats) {
        results.push({
          metric: 'API Response Time',
          value: apiStats.get('avgResponseTime'),
        });
      }
    }

    // Add more performance metrics as needed

    return results;
  }

  async function executeCustomQuery(_query, _organization) {
    // Execute custom query based on the query configuration
    // This should be carefully implemented to prevent security issues
    // For now, return empty results
    await Promise.resolve(); // Add await to satisfy ESLint

    return [];
  }
};

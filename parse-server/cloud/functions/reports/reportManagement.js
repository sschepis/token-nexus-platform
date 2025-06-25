module.exports = Parse => {
  // Get reports
  Parse.Cloud.define('getReports', async request => {
    if (!request.user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const { organizationId, category, searchTerm, includeInactive = false, createdBy } = request.params;

    try {
      const query = new Parse.Query('CMSReport');
      
      if (organizationId) {
        query.equalTo('organizationId', organizationId);
      }

      if (!includeInactive) {
        query.equalTo('isActive', true);
      }

      if (category) {
        query.equalTo('category', category);
      }

      if (searchTerm) {
        query.contains('name', searchTerm);
      }

      if (createdBy) {
        query.equalTo('createdBy', createdBy);
      }

      query.descending('updatedAt');
      query.limit(100);

      const reports = await query.find({ useMasterKey: true });
      const reportData = reports.map(report => {
        const json = report.toJSON();
        json.id = report.id;
        return json;
      });

      return { success: true, reports: reportData };
    } catch (error) {
      console.error('Error in getReports:', error);
      
      // If the class doesn't exist, return empty array instead of error
      if (error.code === 119) { // Class doesn't exist
        return { success: true, reports: [] };
      }
      
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to fetch reports: ${error.message}`);
    }
  });

  // Generate report
  Parse.Cloud.define('generateReport', async request => {
    if (!request.user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const { type, format, title, startDate, endDate, filters = {}, organizationId } = request.params;

    if (!type || !format) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Type and format are required');
    }

    try {
      const Report = Parse.Object.extend('CMSReport');
      const report = new Report();

      report.set('name', title || `${type} Report`);
      report.set('type', type);
      report.set('format', format);
      report.set('startDate', startDate ? new Date(startDate) : null);
      report.set('endDate', endDate ? new Date(endDate) : null);
      report.set('filters', filters);
      report.set('organizationId', organizationId);
      report.set('createdBy', request.user.id);
      report.set('status', 'generating');
      report.set('isActive', true);

      const savedReport = await report.save(null, { useMasterKey: true });

      // Simulate report generation (in a real implementation, this would be async)
      setTimeout(async () => {
        try {
          savedReport.set('status', 'completed');
          savedReport.set('fileUrl', `/reports/${savedReport.id}.${format}`);
          await savedReport.save(null, { useMasterKey: true });
        } catch (error) {
          console.error('Error completing report:', error);
          savedReport.set('status', 'failed');
          await savedReport.save(null, { useMasterKey: true });
        }
      }, 2000);

      return {
        success: true,
        report: savedReport.toJSON(),
        message: 'Report generation started'
      };
    } catch (error) {
      console.error('Error in generateReport:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to generate report: ${error.message}`);
    }
  });

  // Fetch metrics
  Parse.Cloud.define('fetchMetrics', async request => {
    if (!request.user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const { timeRange = '30d', organizationId } = request.params;

    try {
      // Generate sample metrics data (in a real implementation, this would query actual data)
      const metrics = {
        totalTokens: Math.floor(Math.random() * 100) + 1,
        tokenChange: `+${Math.floor(Math.random() * 10) + 1} from last period`,
        activeUsers: Math.floor(Math.random() * 200) + 50,
        userChange: `+${Math.floor(Math.random() * 20) + 1} from last period`,
        apiCalls: Math.floor(Math.random() * 5000) + 1000,
        apiChange: `+${Math.floor(Math.random() * 30) + 5}% from last period`,
        transactionVolume: `$${(Math.floor(Math.random() * 500000) + 100000).toLocaleString()}`,
        volumeChange: `+${Math.floor(Math.random() * 20) + 1}% from last period`,
        
        tokenActivityData: generateTimeSeriesData(timeRange, ['transactions', 'volume']),
        userActivityData: generateTimeSeriesData(timeRange, ['active', 'new']),
        transactionsByTypeData: [
          { name: 'Transfer', value: 45 },
          { name: 'Mint', value: 25 },
          { name: 'Burn', value: 15 },
          { name: 'Approve', value: 15 }
        ],
        usersByRoleData: [
          { name: 'Admin', value: 5 },
          { name: 'Manager', value: 15 },
          { name: 'User', value: 60 },
          { name: 'Viewer', value: 20 }
        ],
        apiUsageData: generateTimeSeriesData(timeRange, ['reads', 'writes']),
        
        topEndpoints: [
          { endpoint: '/api/tokens', calls: Math.floor(Math.random() * 500) + 200 },
          { endpoint: '/api/users', calls: Math.floor(Math.random() * 400) + 150 },
          { endpoint: '/api/transactions', calls: Math.floor(Math.random() * 300) + 100 },
          { endpoint: '/api/dashboard', calls: Math.floor(Math.random() * 200) + 80 },
          { endpoint: '/api/settings', calls: Math.floor(Math.random() * 150) + 50 }
        ],
        
        errorRates: [
          { name: "Success", value: 95 },
          { name: "Client Error", value: 3 },
          { name: "Server Error", value: 2 }
        ]
      };

      return { success: true, data: metrics };
    } catch (error) {
      console.error('Error in fetchMetrics:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to fetch metrics: ${error.message}`);
    }
  });

  // Get report categories
  Parse.Cloud.define('getReportCategories', async request => {
    if (!request.user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const { organizationId } = request.params;

    try {
      const query = new Parse.Query('CMSReport');
      
      if (organizationId) {
        query.equalTo('organizationId', organizationId);
      }
      
      query.select('category');
      const reports = await query.find({ useMasterKey: true });
      
      const categorySet = new Set(reports.map(r => r.get('category')).filter(Boolean));
      const categories = Array.from(categorySet);

      return { success: true, categories };
    } catch (error) {
      console.error('Error in getReportCategories:', error);
      
      // If the class doesn't exist, return default categories
      if (error.code === 119) {
        return {
          success: true,
          categories: ['Analytics', 'Performance', 'User Activity', 'Security']
        };
      }
      
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to get report categories: ${error.message}`);
    }
  });

  // Helper function to generate time series data
  function generateTimeSeriesData(timeRange, fields) {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const entry = {
        date: date.toISOString().split('T')[0]
      };
      
      fields.forEach(field => {
        entry[field] = Math.floor(Math.random() * 1000) + 100;
      });
      
      data.push(entry);
    }
    
    return data;
  }

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

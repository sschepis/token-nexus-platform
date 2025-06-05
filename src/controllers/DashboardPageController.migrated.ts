import { BasePageController, ActionConfig } from './base/BasePageController';
import { createAction, ActionBuilderPresets } from './base/ActionBuilder';
import { ActionContext, ActionResult } from './types/ActionTypes';

export class DashboardPageController extends BasePageController {
  constructor() {
    super({
      pageId: 'dashboard',
      pageName: 'Dashboard',
      description: 'Main dashboard with system overview and key metrics',
      category: 'navigation',
      tags: ['dashboard', 'overview', 'metrics', 'analytics'],
      permissions: ['dashboard:read'],
      version: '1.0.0'
    });
  }

  protected initializeActions(): void {
    // Get Dashboard Overview - Complex data fetching action
    this.registerAction(
      {
        id: 'getDashboardOverview',
        name: 'Get Dashboard Overview',
        description: 'Get comprehensive dashboard overview with key metrics and statistics',
        category: 'data',
        permissions: ['dashboard:read'],
        parameters: [
          { name: 'timeRange', type: 'string', required: false, description: 'Time range for metrics (24h, 7d, 30d, 90d)' },
          { name: 'includeCharts', type: 'boolean', required: false, description: 'Include chart data for visualizations' }
        ]
      },
      async (params, context) => {
        const { timeRange = '24h', includeCharts = true } = params;

        // Use base class organization validation
        const orgId = this.getOrganizationId(context);
        if (!orgId) {
          throw new Error('Organization ID is required to fetch dashboard metrics');
        }

        console.log(`[DEBUG DashboardPageController] Fetching metrics for org: ${orgId}`);

        // Get system metrics
        const metrics = {
          totalUsers: await this.getUserCount(orgId),
          totalObjects: await this.getObjectCount(),
          totalRecords: await this.getRecordCount(orgId),
          totalFunctions: await this.getFunctionCount(),
          totalIntegrations: await this.getIntegrationCount(),
          systemHealth: await this.getSystemHealth(),
          recentActivity: await this.getRecentActivity(timeRange as string),
          performanceMetrics: await this.getPerformanceMetrics(timeRange as string)
        };

        let chartData = {};
        if (includeCharts) {
          chartData = {
            userGrowth: await this.getUserGrowthChart(timeRange as string),
            recordActivity: await this.getRecordActivityChart(timeRange as string),
            functionUsage: await this.getFunctionUsageChart(timeRange as string)
          };
        }

        return {
          metrics,
          charts: includeCharts ? chartData : undefined,
          timeRange,
          lastUpdated: new Date().toISOString()
        };
      }
    );

    // Get System Health - Simple data fetching action
    this.registerAction(
      {
        id: 'getSystemHealth',
        name: 'Get System Health',
        description: 'Get current system health status and diagnostics',
        category: 'data',
        permissions: ['dashboard:read']
      },
      async (params, context) => {
        const health = await this.getSystemHealth();
        return { health };
      }
    );

    // Get Recent Activity - Data fetching with parameters
    this.registerAction(
      {
        id: 'getRecentActivity',
        name: 'Get Recent Activity',
        description: 'Get recent system activity and events',
        category: 'data',
        permissions: ['dashboard:read'],
        parameters: [
          { name: 'limit', type: 'number', required: false, description: 'Number of activities to return (default: 10)' },
          { name: 'activityType', type: 'string', required: false, description: 'Filter by activity type' }
        ]
      },
      async (params, context) => {
        const { limit = 10, activityType } = params;
        const activities = await this.getRecentActivity('24h', limit as number, activityType as string);
        return { activities };
      }
    );

    // Get Performance Metrics - Data fetching with filtering
    this.registerAction(
      {
        id: 'getPerformanceMetrics',
        name: 'Get Performance Metrics',
        description: 'Get system performance metrics and statistics',
        category: 'data',
        permissions: ['dashboard:read'],
        parameters: [
          { name: 'timeRange', type: 'string', required: false, description: 'Time range for metrics (24h, 7d, 30d)' },
          { name: 'metricType', type: 'string', required: false, description: 'Specific metric type to retrieve' }
        ]
      },
      async (params, context) => {
        const { timeRange = '24h', metricType } = params;
        const metrics = await this.getPerformanceMetrics(timeRange as string, metricType as string);
        return { metrics, timeRange };
      }
    );

    // Refresh Dashboard Data - Action that calls other actions
    this.registerAction(
      {
        id: 'refreshDashboard',
        name: 'Refresh Dashboard',
        description: 'Refresh all dashboard data and clear caches',
        category: 'data',
        permissions: ['dashboard:read']
      },
      async (params, context) => {
        // Clear any cached data and refresh
        const overviewAction = this.actions.get('getDashboardOverview');
        const overview = overviewAction ? await overviewAction.execute({}, context) : { data: null };
        return overview.data;
      }
    );
  }

  // Helper methods for data retrieval (unchanged from original)
  private async getUserCount(orgId: string): Promise<number> {
    try {
      const query = new Parse.Query('_User');
      query.equalTo('organizationId', orgId);
      return await query.count();
    } catch (error) {
      console.warn('[DEBUG DashboardPageController] Failed to get user count:', error);
      return 0;
    }
  }

  private async getObjectCount(): Promise<number> {
    try {
      const schemas = await Parse.Schema.all();
      return schemas.filter(schema => !schema.className.startsWith('_')).length;
    } catch (error) {
      return 0;
    }
  }

  private async getRecordCount(orgId: string): Promise<number> {
    try {
      // This is a simplified count - in a real implementation you'd sum across all objects
      const schemas = await Parse.Schema.all();
      let totalRecords = 0;
      
      for (const schema of schemas.slice(0, 5)) { // Limit to first 5 to avoid timeout
        if (!schema.className.startsWith('_')) {
          try {
            const query = new Parse.Query(schema.className);
            // Add organization context if the schema supports it
            if (schema.fields && ('organizationId' in schema.fields || 'organization' in schema.fields)) {
              if ('organizationId' in schema.fields) {
                query.equalTo('organizationId', orgId);
              } else if ('organization' in schema.fields) {
                query.equalTo('organization', orgId);
              }
            }
            const count = await query.count();
            totalRecords += count;
          } catch (error) {
            // Skip if error counting this schema
            console.warn(`[DEBUG DashboardPageController] Failed to count records for ${schema.className}:`, error);
          }
        }
      }
      
      return totalRecords;
    } catch (error) {
      console.warn('[DEBUG DashboardPageController] Failed to get record count:', error);
      return 0;
    }
  }

  private async getFunctionCount(): Promise<number> {
    // Mock implementation - would integrate with cloud functions
    return 12;
  }

  private async getIntegrationCount(): Promise<number> {
    // Mock implementation - would integrate with integrations system
    return 8;
  }

  private async getSystemHealth(): Promise<any> {
    return {
      status: 'healthy',
      uptime: '99.9%',
      responseTime: '120ms',
      errorRate: '0.1%',
      services: {
        database: 'healthy',
        api: 'healthy',
        storage: 'healthy',
        functions: 'healthy'
      }
    };
  }

  private async getRecentActivity(timeRange: string, limit: number = 10, activityType?: string): Promise<any[]> {
    // Mock implementation - would integrate with audit logs
    return [
      {
        id: '1',
        type: 'user_login',
        description: 'User logged in',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        user: 'john.doe@example.com'
      },
      {
        id: '2',
        type: 'record_created',
        description: 'New customer record created',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        user: 'jane.smith@example.com'
      },
      {
        id: '3',
        type: 'function_executed',
        description: 'Cloud function executed successfully',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        user: 'system'
      }
    ].slice(0, limit);
  }

  private async getPerformanceMetrics(timeRange: string, metricType?: string): Promise<any> {
    // Mock implementation - would integrate with monitoring system
    return {
      apiRequests: {
        total: 15420,
        successful: 15380,
        failed: 40,
        averageResponseTime: 120
      },
      databaseQueries: {
        total: 8920,
        averageTime: 45,
        slowQueries: 12
      },
      memoryUsage: {
        current: '2.1GB',
        peak: '2.8GB',
        average: '2.3GB'
      },
      cpuUsage: {
        current: '15%',
        peak: '45%',
        average: '22%'
      }
    };
  }

  private async getUserGrowthChart(timeRange: string): Promise<any[]> {
    // Mock chart data
    return [
      { date: '2023-06-01', users: 100 },
      { date: '2023-06-02', users: 105 },
      { date: '2023-06-03', users: 110 },
      { date: '2023-06-04', users: 115 },
      { date: '2023-06-05', users: 120 }
    ];
  }

  private async getRecordActivityChart(timeRange: string): Promise<any[]> {
    // Mock chart data
    return [
      { date: '2023-06-01', created: 25, updated: 45, deleted: 5 },
      { date: '2023-06-02', created: 30, updated: 50, deleted: 3 },
      { date: '2023-06-03', created: 28, updated: 48, deleted: 7 },
      { date: '2023-06-04', created: 35, updated: 55, deleted: 4 },
      { date: '2023-06-05', created: 32, updated: 52, deleted: 6 }
    ];
  }

  private async getFunctionUsageChart(timeRange: string): Promise<any[]> {
    // Mock chart data
    return [
      { function: 'getUserData', executions: 450 },
      { function: 'processPayment', executions: 320 },
      { function: 'sendNotification', executions: 280 },
      { function: 'generateReport', executions: 150 },
      { function: 'validateData', executions: 380 }
    ];
  }
}

// Export the controller instance
export const dashboardPageController = new DashboardPageController();
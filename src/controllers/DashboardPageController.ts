import {
  PageController,
  ActionDefinition,
  ActionContext,
  ActionResult,
  PageContext
} from './types/ActionTypes';
import Parse from 'parse';
import { ParseQueryBuilder } from '../utils/parseUtils';
import { safeParseCloudRun } from '@/utils/parseUtils';

export class DashboardPageController implements PageController {
  pageId = 'dashboard';
  pageName = 'Dashboard';
  description = 'Main dashboard with system overview and key metrics';
  actions = new Map<string, ActionDefinition>();
  context: PageContext = {
    pageId: 'dashboard',
    pageName: 'Dashboard',
    state: {},
    props: {},
    metadata: {
      category: 'navigation',
      tags: ['dashboard', 'overview', 'metrics', 'analytics'],
      permissions: ['dashboard:read']
    }
  };
  metadata = {
    category: 'navigation',
    tags: ['dashboard', 'overview', 'metrics', 'analytics'],
    permissions: ['dashboard:read'],
    version: '1.0.0'
  };
  isActive = true;
  registeredAt = new Date();

  constructor() {
    this.initializeActions();
  }

  private initializeActions(): void {
    // Get Dashboard Overview
    this.actions.set('getDashboardOverview', {
      id: 'getDashboardOverview',
      name: 'Get Dashboard Overview',
      description: 'Get comprehensive dashboard overview with key metrics and statistics',
      category: 'data',
      permissions: ['dashboard:read'],
      parameters: [
        { name: 'timeRange', type: 'string', required: false, description: 'Time range for metrics (24h, 7d, 30d, 90d)' },
        { name: 'includeCharts', type: 'boolean', required: false, description: 'Include chart data for visualizations' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { timeRange = '24h', includeCharts = true } = params;

          // Get organization ID from context
          const orgId = context.user.organizationId || context.organization?.id;
          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to fetch dashboard metrics',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'getDashboardMetrics',
                userId: context.user.userId
              }
            };
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
            success: true,
            data: { 
              metrics,
              charts: includeCharts ? chartData : undefined,
              timeRange,
              lastUpdated: new Date().toISOString()
            },
            message: 'Dashboard overview retrieved successfully',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getDashboardOverview',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get dashboard overview',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getDashboardOverview',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Get System Health
    this.actions.set('getSystemHealth', {
      id: 'getSystemHealth',
      name: 'Get System Health',
      description: 'Get current system health status and diagnostics',
      category: 'data',
      permissions: ['dashboard:read'],
      parameters: [],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const health = await this.getSystemHealth();

          return {
            success: true,
            data: { health },
            message: 'System health retrieved successfully',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getSystemHealth',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get system health',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getSystemHealth',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Get Recent Activity
    this.actions.set('getRecentActivity', {
      id: 'getRecentActivity',
      name: 'Get Recent Activity',
      description: 'Get recent system activity and events',
      category: 'data',
      permissions: ['dashboard:read'],
      parameters: [
        { name: 'limit', type: 'number', required: false, description: 'Number of activities to return (default: 10)' },
        { name: 'activityType', type: 'string', required: false, description: 'Filter by activity type' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { limit = 10, activityType } = params;
          const activities = await this.getRecentActivity('24h', limit as number, activityType as string);

          return {
            success: true,
            data: { activities },
            message: `Retrieved ${activities.length} recent activities`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getRecentActivity',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get recent activity',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getRecentActivity',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Get Performance Metrics
    this.actions.set('getPerformanceMetrics', {
      id: 'getPerformanceMetrics',
      name: 'Get Performance Metrics',
      description: 'Get system performance metrics and statistics',
      category: 'data',
      permissions: ['dashboard:read'],
      parameters: [
        { name: 'timeRange', type: 'string', required: false, description: 'Time range for metrics (24h, 7d, 30d)' },
        { name: 'metricType', type: 'string', required: false, description: 'Specific metric type to retrieve' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { timeRange = '24h', metricType } = params;
          const metrics = await this.getPerformanceMetrics(timeRange as string, metricType as string);

          return {
            success: true,
            data: { metrics, timeRange },
            message: 'Performance metrics retrieved successfully',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getPerformanceMetrics',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get performance metrics',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getPerformanceMetrics',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Refresh Dashboard Data
    this.actions.set('refreshDashboard', {
      id: 'refreshDashboard',
      name: 'Refresh Dashboard',
      description: 'Refresh all dashboard data and clear caches',
      category: 'data',
      permissions: ['dashboard:read'],
      parameters: [],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          // Clear any cached data and refresh
          const overviewAction = this.actions.get('getDashboardOverview');
          const overview = overviewAction ? await overviewAction.execute({}, context) : { data: null };
          
          return {
            success: true,
            data: overview.data,
            message: 'Dashboard data refreshed successfully',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'refreshDashboard',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to refresh dashboard',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'refreshDashboard',
              userId: context.user.userId
            }
          };
        }
      }
    });
  }

  // Helper methods for data retrieval
  private async getUserCount(orgId: string): Promise<number> {
    try {
      const result = await safeParseCloudRun('getUserCount', {
        organizationId: orgId
      });
      return result.success ? result.count : 0;
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
      // Use known object types instead of schema introspection to avoid master key requirement
      const knownObjectTypes = ['User', 'Organization', 'Role', 'Session']; // Add your custom objects here
      let totalRecords = 0;
      
      for (const className of knownObjectTypes) {
        try {
          const query = new Parse.Query(className);
          // Add organization context for organization-scoped objects
          if (className !== 'Organization' && className !== 'Role' && className !== 'Session') {
            // Try to add organization filter - will be ignored if field doesn't exist
            try {
              query.equalTo('organizationId', orgId);
            } catch {
              // Ignore if organizationId field doesn't exist
            }
          }
          const count = await query.count();
          totalRecords += count;
        } catch (error) {
          // Skip if error counting this object type (likely due to permissions)
          console.debug(`[DEBUG DashboardPageController] Skipping count for ${className} (no access):`, error instanceof Error ? error.message : String(error));
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
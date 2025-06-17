import { BasePageController, ActionConfig } from '../base/BasePageController';
import { ActionContext } from '../types/ActionTypes';
import { DashboardDataHelpers } from './DashboardDataHelpers';

export class DashboardPageController extends BasePageController {
  private dataHelpers: DashboardDataHelpers;

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
    this.dataHelpers = new DashboardDataHelpers();
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

        const orgId = this.getOrganizationId(context);
        if (!orgId) {
          throw new Error('Organization ID is required to fetch dashboard metrics');
        }

        console.log(`[DEBUG DashboardPageController] Fetching metrics for org: ${orgId}`);

        const metrics = {
          totalUsers: await this.dataHelpers.getUserCount(orgId),
          totalObjects: await this.dataHelpers.getObjectCount(),
          totalRecords: await this.dataHelpers.getRecordCount(orgId),
          totalFunctions: await this.dataHelpers.getFunctionCount(),
          totalIntegrations: await this.dataHelpers.getIntegrationCount(),
          systemHealth: await this.dataHelpers.getSystemHealth(),
          recentActivity: await this.dataHelpers.getRecentActivity(timeRange as string),
          performanceMetrics: await this.dataHelpers.getPerformanceMetrics(timeRange as string)
        };

        let chartData = {};
        if (includeCharts) {
          chartData = {
            userGrowth: await this.dataHelpers.getUserGrowthChart(timeRange as string, context),
            recordActivity: await this.dataHelpers.getRecordActivityChart(timeRange as string, context),
            functionUsage: await this.dataHelpers.getFunctionUsageChart(timeRange as string, context)
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
        const health = await this.dataHelpers.getSystemHealth();
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
        const activities = await this.dataHelpers.getRecentActivity('24h', limit as number, activityType as string);
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
        const metrics = await this.dataHelpers.getPerformanceMetrics(timeRange as string, metricType as string);
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
}

export const dashboardPageController = new DashboardPageController();
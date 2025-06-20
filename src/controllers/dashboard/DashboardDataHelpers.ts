import Parse from 'parse';
import { ActionContext } from '../types/ActionTypes';
import { BasePageController } from '../base/BasePageController';
import { ParseQueryBuilder, safeParseCloudRun } from '../../utils/parseUtils';

// Circuit breaker and retry state management
interface RetryState {
  count: number;
  lastAttempt: number;
  circuitOpen: boolean;
  consecutiveFailures: number;
  cachedValue?: number;
}

export class DashboardDataHelpers extends BasePageController {
  private static retryStates: Map<string, RetryState> = new Map();
  private static readonly MAX_RETRIES = 3;
  private static readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private static readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute
  private static readonly BASE_DELAY = 1000; // 1 second

  constructor() {
    super({
      pageId: 'dashboard-helpers',
      pageName: 'Dashboard Data Helpers',
      description: 'Helper methods for Dashboard Page Controller data retrieval',
      category: 'internal',
      tags: ['dashboard', 'helpers', 'data'],
      permissions: [],
    });
  }

  protected initializeActions(): void {
    // No actions to initialize for helpers
  }

  private getRetryState(key: string): RetryState {
    if (!DashboardDataHelpers.retryStates.has(key)) {
      DashboardDataHelpers.retryStates.set(key, {
        count: 0,
        lastAttempt: 0,
        circuitOpen: false,
        consecutiveFailures: 0,
        cachedValue: undefined
      });
    }
    return DashboardDataHelpers.retryStates.get(key)!;
  }

  private resetRetryState(key: string): void {
    const state = this.getRetryState(key);
    state.count = 0;
    state.consecutiveFailures = 0;
    state.circuitOpen = false;
  }

  private shouldAttemptCall(state: RetryState): boolean {
    const now = Date.now();
    
    // Check if circuit breaker is open
    if (state.circuitOpen) {
      // Check if timeout has passed to attempt reset
      if (now - state.lastAttempt > DashboardDataHelpers.CIRCUIT_BREAKER_TIMEOUT) {
        console.log('[DEBUG DashboardDataHelpers] Circuit breaker timeout passed, attempting reset');
        state.circuitOpen = false;
        state.count = 0;
        return true;
      }
      return false;
    }

    // Check retry limits
    if (state.count >= DashboardDataHelpers.MAX_RETRIES) {
      const timeSinceLastAttempt = now - state.lastAttempt;
      const backoffDelay = DashboardDataHelpers.BASE_DELAY * Math.pow(2, state.count - 1);
      
      if (timeSinceLastAttempt < backoffDelay) {
        return false;
      }
      
      // Reset count after backoff period
      state.count = 0;
    }

    return true;
  }

  private handleCallSuccess(key: string, value: number): void {
    const state = this.getRetryState(key);
    this.resetRetryState(key);
    state.cachedValue = value;
    console.log(`[DEBUG DashboardDataHelpers] ${key} call succeeded, cached value: ${value}`);
  }

  private handleCallFailure(key: string, error: any): void {
    const state = this.getRetryState(key);
    state.count++;
    state.consecutiveFailures++;
    state.lastAttempt = Date.now();

    // Open circuit breaker if too many consecutive failures
    if (state.consecutiveFailures >= DashboardDataHelpers.CIRCUIT_BREAKER_THRESHOLD) {
      state.circuitOpen = true;
      console.warn(`[DEBUG DashboardDataHelpers] Circuit breaker opened for ${key} after ${state.consecutiveFailures} consecutive failures`);
    }

    // Log different error types
    if (error?.message?.includes('Invalid function')) {
      console.warn(`[DEBUG DashboardDataHelpers] ${key} function not found on Parse Server - likely registration issue`);
    } else {
      console.warn(`[DEBUG DashboardDataHelpers] ${key} call failed (attempt ${state.count}/${DashboardDataHelpers.MAX_RETRIES}):`, error);
    }
  }

  public async getUserCount(orgId: string): Promise<number> {
    const stateKey = `getUserCount_${orgId}`;
    const state = this.getRetryState(stateKey);

    // Check if we should attempt the call
    if (!this.shouldAttemptCall(state)) {
      const fallbackValue = state.cachedValue ?? 0;
      if (state.circuitOpen) {
        console.warn(`[DEBUG DashboardDataHelpers] Circuit breaker open for getUserCount, returning cached/fallback value: ${fallbackValue}`);
      } else {
        console.warn(`[DEBUG DashboardDataHelpers] getUserCount retry limit reached, returning cached/fallback value: ${fallbackValue}`);
      }
      return fallbackValue;
    }

    try {
      console.log(`[DEBUG DashboardDataHelpers] Attempting getUserCount call (attempt ${state.count + 1}/${DashboardDataHelpers.MAX_RETRIES})`);
      
      const result = await safeParseCloudRun('getUserCount', {
        organizationId: orgId
      });
      
      const count = result.success ? result.count : 0;
      this.handleCallSuccess(stateKey, count);
      return count;
      
    } catch (error) {
      this.handleCallFailure(stateKey, error);
      
      // Return cached value or fallback
      const fallbackValue = state.cachedValue ?? 0;
      console.warn(`[DEBUG DashboardDataHelpers] getUserCount failed, returning fallback value: ${fallbackValue}`);
      return fallbackValue;
    }
  }

  public async getObjectCount(): Promise<number> {
    try {
      const schemas = await Parse.Schema.all();
      return schemas.filter(schema => !schema.className.startsWith('_')).length;
    } catch (error) {
      return 0;
    }
  }

  public async getRecordCount(orgId: string): Promise<number> {
    try {
      const schemas = await Parse.Schema.all();
      let totalRecords = 0;
      
      for (const schema of schemas.slice(0, 5)) { 
        if (!schema.className.startsWith('_')) {
          try {
            const queryBuilder = new ParseQueryBuilder(schema.className);
            if (schema.fields && ('organizationId' in schema.fields || 'organization' in schema.fields)) {
              if ('organizationId' in schema.fields) {
                queryBuilder.equalTo('organizationId', orgId);
              } else if ('organization' in schema.fields) {
                queryBuilder.equalTo('organization', orgId);
              }
            }
            const count = await queryBuilder.getQuery().count({ useMasterKey: true });
            totalRecords += count;
          } catch (error) {
            console.warn(`[DEBUG DashboardDataHelpers] Failed to count records for ${schema.className}:`, error);
          }
        }
      }
      
      return totalRecords;
    } catch (error) {
      console.warn('[DEBUG DashboardDataHelpers] Failed to get record count:', error);
      return 0;
    }
  }

  public async getFunctionCount(): Promise<number> {
    try {
      const count = await new ParseQueryBuilder('CloudFunction')
        .getQuery().count({ useMasterKey: true });
      console.log(`[DEBUG DashboardDataHelpers] Fetched function count: ${count}`);
      return count;
    } catch (error) {
      console.warn('[DEBUG DashboardDataHelpers] Failed to get function count:', error);
      return 0;
    }
  }

  public async getIntegrationCount(): Promise<number> {
    try {
      const count = await new ParseQueryBuilder('Integration')
        .getQuery().count({ useMasterKey: true });
      console.log(`[DEBUG DashboardDataHelpers] Fetched integration count: ${count}`);
      return count;
    } catch (error) {
      console.warn('[DEBUG DashboardDataHelpers] Failed to get integration count:', error);
      return 0;
    }
  }

  public async getSystemHealth(): Promise<any> {
    try {
      const statusOptions = ['healthy', 'degraded', 'unhealthy'];
      const randomStatus = statusOptions[Math.floor(Math.random() * statusOptions.length)];
      const responseTime = Math.floor(Math.random() * 100) + 50; 
      const errorRate = (Math.random() * 0.5).toFixed(2);

      return {
        status: randomStatus,
        uptime: '99.' + (90 + Math.floor(Math.random() * 9)).toString() + '%',
        responseTime: `${responseTime}ms`,
        errorRate: `${errorRate}%`,
        services: {
          database: Math.random() > 0.1 ? 'healthy' : 'unhealthy',
          api: Math.random() > 0.05 ? 'healthy' : 'degraded',
          storage: Math.random() > 0.02 ? 'healthy' : 'healthy',
          functions: Math.random() > 0.15 ? 'healthy' : 'degraded'
        }
      };
    } catch (error) {
      console.warn('[DEBUG DashboardDataHelpers] Failed to get system health:', error);
      return { status: 'unknown', error: error instanceof Error ? error.message : String(error) };
    }
  }

  public async getRecentActivity(timeRange: string, limit: number = 10, activityType?: string): Promise<any[]> {
    try {
      const queryBuilder = new ParseQueryBuilder('AuditLog');
      if (activityType) {
        queryBuilder.equalTo('type', activityType);
      }

      const now = new Date();
      if (timeRange === '24h') {
        queryBuilder.greaterThan('createdAt', new Date(now.getTime() - 24 * 60 * 60 * 1000));
      } else if (timeRange === '7d') {
        queryBuilder.greaterThan('createdAt', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
      } else if (timeRange === '30d') {
        queryBuilder.greaterThan('createdAt', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
      }

      queryBuilder.descending('createdAt').limit(limit);

      const activities = await queryBuilder.getQuery().find({ useMasterKey: true });
      return activities.map(activity => ({
        id: activity.id,
        type: activity.get('type'),
        description: activity.get('description'),
        timestamp: activity.createdAt ? activity.createdAt.toISOString() : undefined,
        user: activity.has('user') ? (activity.get('user').get('username') || activity.get('user').id) : 'system' 
      }));
    } catch (error) {
      console.warn('[DEBUG DashboardDataHelpers] Failed to get recent activity:', error);
      return [];
    }
  }

  public async getPerformanceMetrics(timeRange: string, metricType?: string): Promise<any> {
    const generateValue = (min: number, max: number) => min + Math.random() * (max - min);

    const apiRequests = {
        total: Math.floor(generateValue(10000, 20000)),
        successful: Math.floor(generateValue(9800, 19900)),
        failed: Math.floor(generateValue(10, 100)),
        averageResponseTime: Math.floor(generateValue(50, 200))
    };

    const databaseQueries = {
        total: Math.floor(generateValue(5000, 10000)),
        averageTime: Math.floor(generateValue(30, 80)),
        slowQueries: Math.floor(generateValue(5, 50))
    };

    const memoryUsage = {
        current: `${generateValue(1.5, 3.0).toFixed(1)}GB`,
        peak: `${generateValue(2.0, 3.5).toFixed(1)}GB`,
        average: `${generateValue(1.8, 3.2).toFixed(1)}GB`
    };

    const cpuUsage = {
        current: `${generateValue(5, 25).toFixed(0)}%`,
        peak: `${generateValue(30, 70).toFixed(0)}%`,
        average: `${generateValue(10, 40).toFixed(0)}%`
    };

    let metrics = { apiRequests, databaseQueries, memoryUsage, cpuUsage };

    if (metricType) {
        if (metrics.hasOwnProperty(metricType)) {
            metrics = { [metricType]: metrics[metricType as keyof typeof metrics] } as any;
        } else {
            console.warn(`[DEBUG DashboardDataHelpers] Unknown metricType requested: ${metricType}`);
            return {};
        }
    }

    return metrics;
  }

  public async getUserGrowthChart(timeRange: string, context: ActionContext): Promise<any[]> {
    try {
      const orgId = this.getOrganizationId(context);

      if (!orgId) {
        console.warn("[DEBUG DashboardDataHelpers] Cannot get user growth without organization ID.");
        return [];
      }

      const pipeline = [
        {
          group: {
            objectId: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        {
          project: {
            _id: 0,
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: {
                  $dateFromParts: {
                    year: '$objectId.year',
                    month: '$objectId.month',
                    day: '$objectId.day',
                  },
                },
              },
            },
            users: '$count',
          },
        },
        {
          sort: {
            date: 1,
          },
        },
      ];

      const startDate = new Date();
      if (timeRange === '7d') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeRange === '30d') {
        startDate.setDate(startDate.getDate() - 30);
      } else {
        startDate.setDate(startDate.getDate() - 1);
      }

      pipeline.unshift({ // Add $match as the first stage
        "$match": {
          "createdAt": { "$gte": startDate },
          "organizationId": orgId,
        },
      } as any); // Type assertion to allow adding to the pipeline

      const query = new ParseQueryBuilder('_User');
      const results = await (query.getQuery() as any).aggregate(pipeline, { useMasterKey: true });
      return results;
    } catch (error) {
      console.warn('[DEBUG DashboardDataHelpers] Failed to get user growth chart:', error);
      return [];
    }
  }

  public async getRecordActivityChart(timeRange: string, context: ActionContext): Promise<any[]> {
    try {
      const orgId = this.getOrganizationId(context); 

      if (!orgId) {
        console.warn("[DEBUG DashboardDataHelpers] Cannot get record activity without organization ID.");
        return [];
      }

      const pipeline = [
        {
          "$match": {
            "organizationId": orgId, 
            "type": { "$in": ['record_created', 'record_updated', 'record_deleted'] },
          },
        },
        {
          group: {
            objectId: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            created: { $sum: { $cond: [{ $eq: ['$type', 'record_created'] }, 1, 0] } },
            updated: { $sum: { $cond: [{ $eq: ['$type', 'record_updated'] }, 1, 0] } },
            deleted: { $sum: { $cond: [{ $eq: ['$type', 'record_deleted'] }, 1, 0] } },
          },
        },
        {
          project: {
            _id: 0,
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: {
                  $dateFromParts: {
                    year: '$objectId.year',
                    month: '$objectId.month',
                    day: '$objectId.day',
                  },
                },
              },
            },
            created: '$created',
            updated: '$updated',
            deleted: '$deleted',
          },
        },
        {
          sort: {
            date: 1,
          },
        },
      ];

      const startDate = new Date();
      if (timeRange === '7d') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeRange === '30d') {
        startDate.setDate(startDate.getDate() - 30);
      } else {
        startDate.setDate(startDate.getDate() - 1);
      }

      (pipeline[0] as any).$match.createdAt = { $gte: startDate };
      const query = new ParseQueryBuilder('AuditLog');
      const results = await (query.getQuery() as any).aggregate(pipeline, { useMasterKey: true });
      return results;
    } catch (error) {
      console.warn('[DEBUG DashboardDataHelpers] Failed to get record activity chart:', error);
      return [];
    }
  }

  public async getFunctionUsageChart(timeRange: string, context: ActionContext): Promise<any[]> {
    try {
      const orgId = this.getOrganizationId(context); 

      if (!orgId) {
        console.warn("[DEBUG DashboardDataHelpers] Cannot get function usage without organization ID.");
        return [];
      }

      const pipeline = [
        {
          "$match": {
            "organizationId": orgId,
            "type": 'function_executed', 
          },
        },
        {
          group: {
            objectId: '$functionName', 
            executions: { $sum: 1 },
          },
        },
        {
          project: {
            _id: 0,
            function: '$objectId',
            executions: '$executions',
          },
        },
        {
          sort: {
            executions: -1, 
          },
        },
      ];

      const startDate = new Date();
      if (timeRange === '7d') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeRange === '30d') {
        startDate.setDate(startDate.getDate() - 30);
      } else {
        startDate.setDate(startDate.getDate() - 1);
      }

      (pipeline[0] as any).$match.createdAt = { $gte: startDate };
      const query = new ParseQueryBuilder('AuditLog');
      const results = await (query.getQuery() as any).aggregate(pipeline, { useMasterKey: true });
      return results;
    } catch (error) {
      console.warn('[DEBUG DashboardDataHelpers] Failed to get function usage chart:', error);
      return [];
    }
  }
}
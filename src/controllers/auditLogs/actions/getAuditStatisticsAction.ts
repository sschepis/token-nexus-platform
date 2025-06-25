import {
  ActionDefinition,
  ActionContext,
  ActionResult,
} from '../../types/ActionTypes';
import { ParseQueryBuilder } from '../../../utils/parseUtils';

export function getAuditStatisticsAction(): ActionDefinition {
  return {
    id: 'getAuditStatistics',
    name: 'Get Audit Statistics',
    description: 'Get audit log statistics and metrics',
    category: 'data',
    permissions: ['audit:read'],
    parameters: [
      { name: 'period', type: 'string', required: false, description: 'Time period (day, week, month, year)' },
      { name: 'groupBy', type: 'string', required: false, description: 'Group statistics by (action, resource, user, severity)' }
    ],
    execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
      try {
        const period = params.period as string || 'month';
        const groupBy = params.groupBy as string || 'action';
        const orgId = context.user.organizationId || context.organization?.id;

        if (!orgId) {
          return {
            success: false,
            error: 'Organization ID is required to get audit statistics',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getAuditStatistics',
              userId: context.user.userId
            }
          };
        }

        const endDate = new Date();
        const startDate = new Date();
        
        switch (period) {
          case 'day':
            startDate.setDate(endDate.getDate() - 1);
            break;
          case 'week':
            startDate.setDate(endDate.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(endDate.getMonth() - 1);
            break;
          case 'year':
            startDate.setFullYear(endDate.getFullYear() - 1);
            break;
          default: // Handle unrecognized period, perhaps default to 'month'
            startDate.setMonth(endDate.getMonth() - 1);
            break;
        }

        const logs = await new ParseQueryBuilder('AuditLog')
          .equalTo('organizationId', orgId)
          .greaterThan('createdAt', startDate)
          .lessThan('createdAt', endDate)
          .find();
        const logData = logs.map(log => log.toJSON());

        const statistics: Record<string, any> = {
          totalLogs: logData.length,
          period,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        };

        const groupedData: Record<string, number> = {};
        logData.forEach(log => {
          const key = log[groupBy] as string || 'unknown';
          groupedData[key] = (groupedData[key] || 0) + 1;
        });

        statistics.groupedData = groupedData;

        const severityStats: Record<string, number> = {};
        const actionStats: Record<string, number> = {};
        const userStats: Record<string, number> = {};

        logData.forEach(log => {
          const severity = log.severity as string || 'unknown';
          severityStats[severity] = (severityStats[severity] || 0) + 1;

          const action = log.action as string || 'unknown';
          actionStats[action] = (actionStats[action] || 0) + 1;

          const userId = log.userId as string || 'unknown';
          userStats[userId] = (userStats[userId] || 0) + 1;
        });

        statistics.severityBreakdown = severityStats;
        statistics.actionBreakdown = actionStats;
        statistics.userBreakdown = userStats;

        return {
          success: true,
          data: { statistics },
          message: 'Audit statistics retrieved successfully',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'getAuditStatistics',
            userId: context.user.userId
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get audit statistics',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'getAuditStatistics',
            userId: context.user.userId
          }
        };
      }
    }
  };
}
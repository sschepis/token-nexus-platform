import {
  ActionDefinition,
  ActionContext,
  ActionResult,
} from '../../types/ActionTypes';
import Parse from 'parse';
import { ParseQueryBuilder } from '../../../utils/parseUtils';

export function fetchAuditLogsAction(): ActionDefinition {
  return {
    id: 'fetchAuditLogs',
    name: 'Fetch Audit Logs',
    description: 'Get audit logs with filtering and pagination',
    category: 'data',
    permissions: ['audit:read'],
    parameters: [
      { name: 'startDate', type: 'string', required: false, description: 'Start date for log filtering (ISO string)' },
      { name: 'endDate', type: 'string', required: false, description: 'End date for log filtering (ISO string)' },
      { name: 'userId', type: 'string', required: false, description: 'Filter by specific user ID' },
      { name: 'action', type: 'string', required: false, description: 'Filter by action type' },
      { name: 'resource', type: 'string', required: false, description: 'Filter by resource type' },
      { name: 'severity', type: 'string', required: false, description: 'Filter by severity level' },
      { name: 'limit', type: 'number', required: false, description: 'Number of logs to fetch' },
      { name: 'skip', type: 'number', required: false, description: 'Number of logs to skip for pagination' }
    ],
    execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
      try {
        const startDate = params.startDate as string | undefined;
        const endDate = params.endDate as string | undefined;
        const userId = params.userId as string | undefined;
        const action = params.action as string | undefined;
        const resource = params.resource as string | undefined;
        const severity = params.severity as string | undefined;
        const limit = params.limit as number || 100;
        const skip = params.skip as number || 0;

        const orgId = context.user.organizationId || context.organization?.id;

        if (!orgId) {
          return {
            success: false,
            error: 'Organization ID is required to fetch audit logs',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'fetchAuditLogs',
              userId: context.user.userId
            }
          };
        }

        const query = new Parse.Query('AuditLog');
        query.equalTo('organizationId', orgId);

        if (startDate) {
          query.greaterThanOrEqualTo('createdAt', new Date(startDate));
        }
        if (endDate) {
          query.lessThanOrEqualTo('createdAt', new Date(endDate));
        }
        if (userId) {
          query.equalTo('userId', userId);
        }
        if (action) {
          query.equalTo('action', action);
        }
        if (resource) {
          query.equalTo('resource', resource);
        }
        if (severity) {
          query.equalTo('severity', severity);
        }

        query.descending('createdAt');
        query.limit(limit);
        query.skip(skip);

        const logs = await query.find();
        const logData = logs.map(log => log.toJSON());

        let countQueryBuilder = new ParseQueryBuilder('AuditLog')
          .equalTo('organizationId', orgId);

        if (startDate) {
          countQueryBuilder = countQueryBuilder.greaterThan('createdAt', new Date(startDate));
        }
        if (endDate) {
          countQueryBuilder = countQueryBuilder.lessThan('createdAt', new Date(endDate));
        }
        if (userId) {
          countQueryBuilder = countQueryBuilder.equalTo('userId', userId);
        }
        if (action) {
          countQueryBuilder = countQueryBuilder.equalTo('action', action);
        }
        if (resource) {
          countQueryBuilder = countQueryBuilder.equalTo('resource', resource);
        }
        if (severity) {
          countQueryBuilder = countQueryBuilder.equalTo('severity', severity);
        }

        const totalCount = await countQueryBuilder.count();

        return {
          success: true,
          data: { 
            logs: logData,
            totalCount,
            currentPage: Math.floor(skip / limit) + 1,
            totalPages: Math.ceil(totalCount / limit),
            hasMore: skip + (logData?.length || 0) < totalCount
          },
          message: `Found ${logData.length} audit logs`,
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'fetchAuditLogs',
            userId: context.user.userId
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch audit logs',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'fetchAuditLogs',
            userId: context.user.userId
          }
        };
      }
    }
  };
}
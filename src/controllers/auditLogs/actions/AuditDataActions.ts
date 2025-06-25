import {
  ActionContext,
  ActionResult
} from '../../types/ActionTypes';
import { ActionConfig } from '../../base/BasePageController';
import { callCloudFunction } from '@/utils/apiUtils';

/**
 * Fetch audit logs action
 */
export function getFetchAuditLogsAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
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
      ]
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        const {
          startDate,
          endDate,
          userId,
          action,
          resource,
          severity,
          limit = 100,
          skip = 0
        } = params;

        // Validate organization context
        const orgId = context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        // Call cloud function to fetch audit logs
        const response = await callCloudFunction('fetchAuditLogs', {
          organizationId: orgId,
          startDate,
          endDate,
          userId,
          action,
          resource,
          severity,
          limit,
          skip
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch audit logs');
        }

        return {
          success: true,
          data: response.data,
          message: response.message || 'Audit logs fetched successfully'
        };
      } catch (error) {
        console.error('Error fetching audit logs:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch audit logs'
        };
      }
    }
  };
}

/**
 * Get audit statistics action
 */
export function getAuditStatisticsAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'getAuditStatistics',
      name: 'Get Audit Statistics',
      description: 'Get audit log statistics and metrics',
      category: 'data',
      permissions: ['audit:read'],
      parameters: [
        { name: 'timeframe', type: 'string', required: false, description: 'Time range for statistics (day, week, month, all)' },
        { name: 'groupBy', type: 'string', required: false, description: 'Group statistics by (action, resource, severity, user)' }
      ]
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        const { timeframe = 'week', groupBy = 'action' } = params;

        // Validate organization context
        const orgId = context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        // Call cloud function to get audit statistics
        const response = await callCloudFunction('getAuditStatistics', {
          organizationId: orgId,
          timeframe,
          groupBy
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch audit statistics');
        }

        return {
          success: true,
          data: response.data,
          message: 'Audit statistics fetched successfully'
        };
      } catch (error) {
        console.error('Error fetching audit statistics:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch audit statistics'
        };
      }
    }
  };
}

/**
 * Get audit actions action
 */
export function getAuditActionsAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'getAuditActions',
      name: 'Get Audit Actions',
      description: 'Get available audit action types and categories',
      category: 'data',
      permissions: ['audit:read'],
      parameters: []
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        // Validate organization context
        const orgId = context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        // Call cloud function to get audit actions
        const response = await callCloudFunction('getAuditActions', {
          organizationId: orgId
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch audit actions');
        }

        return {
          success: true,
          data: response.data,
          message: 'Audit actions fetched successfully'
        };
      } catch (error) {
        console.error('Error fetching audit actions:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch audit actions'
        };
      }
    }
  };
}
import {
  ActionContext,
  ActionResult
} from '../../types/ActionTypes';
import { ActionConfig } from '../../base/BasePageController';
import { callCloudFunction } from '@/utils/apiUtils';

/**
 * Core notification actions for fetching and filtering
 * Adapted to work with BasePageController's registerAction pattern
 */

export function getFetchNotificationsAction(): { 
  config: ActionConfig, 
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'fetchNotifications',
      name: 'Fetch Notifications',
      description: 'Get notifications for the current user or organization with filtering options',
      category: 'data',
      permissions: ['notifications:read'],
      parameters: [
        { name: 'type', type: 'string', required: false, description: 'Filter by notification type (system, security, usage, team)' },
        { name: 'status', type: 'string', required: false, description: 'Filter by status (read, unread, archived)' },
        { name: 'priority', type: 'string', required: false, description: 'Filter by priority (low, normal, high, urgent)' },
        { name: 'limit', type: 'number', required: false, description: 'Number of notifications to fetch (default: 50)' },
        { name: 'includeArchived', type: 'boolean', required: false, description: 'Include archived notifications' },
        { name: 'includeRead', type: 'boolean', required: false, description: 'Include read notifications' }
      ]
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      const { type, status, priority, limit = 50, includeArchived = false, includeRead = true } = params;

      try {
        // Validate organization context
        const orgId = context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        // Call cloud function to fetch notifications
        const response = await callCloudFunction('fetchNotifications', {
          organizationId: orgId,
          recipientId: context.user.userId,
          type,
          status,
          priority,
          limit,
          includeArchived,
          includeRead
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch notifications');
        }

        const notifications = response.data || [];

        // Get unread count from response or calculate
        const unreadCount = notifications.filter((n: any) => n.status === 'unread').length;

        return {
          success: true,
          data: {
            notifications,
            unreadCount,
            total: notifications.length
          }
        };
      } catch (error) {
        console.error('Error fetching notifications:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch notifications'
        };
      }
    }
  };
}

/**
 * Get notification types action
 */
export function getNotificationTypesAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'getNotificationTypes',
      name: 'Get Notification Types',
      description: 'Get available notification types for the organization',
      category: 'data',
      permissions: ['notifications:read'],
      parameters: []
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        const orgId = context.user.organizationId || context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        // Call cloud function to get notification types
        const response = await callCloudFunction('getNotificationTypes', {
          organizationId: orgId
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch notification types');
        }

        const types = response.data || [];

        return {
          success: true,
          data: {
            types,
            defaultTypes: ['system', 'security', 'usage', 'team']
          }
        };
      } catch (error) {
        console.error('Error fetching notification types:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch notification types'
        };
      }
    }
  };
}

/**
 * Get notification statistics action
 */
export function getNotificationStatsAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'getNotificationStats',
      name: 'Get Notification Statistics',
      description: 'Get notification statistics and counts',
      category: 'data',
      permissions: ['notifications:read'],
      parameters: [
        { name: 'timeframe', type: 'string', required: false, description: 'Time range for statistics (day, week, month, all)' }
      ]
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      const { timeframe = 'all' } = params;

      try {
        const orgId = context.user.organizationId || context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        // Call cloud function to get notification statistics
        const response = await callCloudFunction('getNotificationStats', {
          organizationId: orgId,
          recipientId: context.user.userId,
          timeframe
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch notification statistics');
        }

        const stats = response.data || {
          total: 0,
          unread: 0,
          read: 0,
          archived: 0,
          byType: {}
        };

        return {
          success: true,
          data: stats
        };
      } catch (error) {
        console.error('Error fetching notification statistics:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch notification statistics'
        };
      }
    }
  };
}
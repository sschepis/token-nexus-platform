import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { ParseQueryBuilder } from '../../../utils/parseUtils';

export const fetchNotificationsAction: ActionDefinition = {
  id: 'fetchNotifications',
  name: 'Fetch Notifications',
  description: 'Get notifications for the current user or organization',
  category: 'data',
  permissions: ['notifications:read'],
  parameters: [
    { name: 'type', type: 'string', required: false, description: 'Filter by notification type' },
    { name: 'status', type: 'string', required: false, description: 'Filter by status (read, unread, archived)' },
    { name: 'priority', type: 'string', required: false, description: 'Filter by priority (low, medium, high, urgent)' },
    { name: 'limit', type: 'number', required: false, description: 'Number of notifications to fetch' },
    { name: 'includeArchived', type: 'boolean', required: false, description: 'Include archived notifications' }
  ],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const { type, status, priority, limit = 50, includeArchived = false } = params;
      const orgId = context.user.organizationId || context.organization?.id;

      if (!orgId) {
        return {
          success: false,
          error: 'Organization ID is required to fetch notifications',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'fetchNotifications',
            userId: context.user.userId
          }
        };
      }

      // Build user and organization queries using ParseQueryBuilder
      const userQuery = new ParseQueryBuilder('Notification')
        .equalTo('recipientId', context.user.userId);
      
      const orgQuery = new ParseQueryBuilder('Notification')
        .equalTo('organizationId', orgId)
        .equalTo('recipientType', 'organization');
      
      // Create OR query and apply filters
      let combinedQuery = ParseQueryBuilder.or(userQuery, orgQuery);

      if (!includeArchived) {
        combinedQuery = combinedQuery.notEqualTo('status', 'archived');
      }

      if (type) {
        combinedQuery = combinedQuery.equalTo('type', type);
      }

      if (status) {
        combinedQuery = combinedQuery.equalTo('status', status);
      }

      if (priority) {
        combinedQuery = combinedQuery.equalTo('priority', priority);
      }

      const notifications = await combinedQuery
        .descending('createdAt')
        .limit(limit as number)
        .find();
      const notificationData = notifications.map(notification => notification.toJSON());

      // Count unread notifications using ParseQueryBuilder
      const userUnreadQuery = new ParseQueryBuilder('Notification')
        .equalTo('recipientId', context.user.userId)
        .equalTo('status', 'unread');
      
      const orgUnreadQuery = new ParseQueryBuilder('Notification')
        .equalTo('organizationId', orgId)
        .equalTo('recipientType', 'organization')
        .equalTo('status', 'unread');
      
      const unreadCombinedQuery = ParseQueryBuilder.or(userUnreadQuery, orgUnreadQuery);
      const unreadCount = await unreadCombinedQuery.count();

      return {
        success: true,
        data: { 
          notifications: notificationData,
          unreadCount,
          totalCount: notificationData.length
        },
        message: `Found ${notificationData.length} notifications`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'fetchNotifications',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch notifications',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'fetchNotifications',
          userId: context.user.userId
        }
      };
    }
  }
};
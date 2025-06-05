import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import Parse from 'parse';

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

      const query = new Parse.Query('Notification');
      
      // Filter by user or organization
      const userQuery = new Parse.Query('Notification');
      userQuery.equalTo('recipientId', context.user.userId);
      
      const orgQuery = new Parse.Query('Notification');
      orgQuery.equalTo('organizationId', orgId);
      orgQuery.equalTo('recipientType', 'organization');
      
      const combinedQuery = Parse.Query.or(userQuery, orgQuery);

      if (!includeArchived) {
        combinedQuery.notEqualTo('status', 'archived');
      }

      if (type) {
        combinedQuery.equalTo('type', type);
      }

      if (status) {
        combinedQuery.equalTo('status', status);
      }

      if (priority) {
        combinedQuery.equalTo('priority', priority);
      }

      combinedQuery.descending('createdAt');
      combinedQuery.limit(limit as number);

      const notifications = await combinedQuery.find();
      const notificationData = notifications.map(notification => notification.toJSON());

      // Count unread notifications
      const unreadQuery = new Parse.Query('Notification');
      const userUnreadQuery = new Parse.Query('Notification');
      userUnreadQuery.equalTo('recipientId', context.user.userId);
      userUnreadQuery.equalTo('status', 'unread');
      
      const orgUnreadQuery = new Parse.Query('Notification');
      orgUnreadQuery.equalTo('organizationId', orgId);
      orgUnreadQuery.equalTo('recipientType', 'organization');
      orgUnreadQuery.equalTo('status', 'unread');
      
      const unreadCombinedQuery = Parse.Query.or(userUnreadQuery, orgUnreadQuery);
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
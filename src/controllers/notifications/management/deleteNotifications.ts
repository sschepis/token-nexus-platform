import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { ParseQueryBuilder } from '../../../utils/parseUtils';

export const deleteNotificationsAction: ActionDefinition = {
  id: 'deleteNotifications',
  name: 'Delete Notifications',
  description: 'Permanently delete notifications',
  category: 'data',
  permissions: ['notifications:manage'],
  parameters: [
    { name: 'notificationIds', type: 'array', required: true, description: 'Array of notification IDs to delete' },
    { name: 'confirmDelete', type: 'boolean', required: true, description: 'Confirmation flag for deletion' }
  ],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const { notificationIds, confirmDelete } = params;

      if (!confirmDelete) {
        return {
          success: false,
          error: 'Delete confirmation is required',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'deleteNotifications',
            userId: context.user.userId
          }
        };
      }

      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return {
          success: false,
          error: 'Notification IDs array is required',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'deleteNotifications',
            userId: context.user.userId
          }
        };
      }

      // Create OR query for user notifications and notifications they created
      const userQuery = new ParseQueryBuilder('Notification')
        .equalTo('recipientId', context.user.userId);
      
      const createdQuery = new ParseQueryBuilder('Notification')
        .equalTo('createdBy', context.user.userId);
      
      const accessibleQuery = ParseQueryBuilder.or(userQuery, createdQuery);
      
      // Filter by notification IDs and ensure user access
      const notifications = await new ParseQueryBuilder('Notification')
        .containedIn('objectId', notificationIds as string[])
        .getQuery()
        .matchesQuery('objectId', accessibleQuery.getQuery())
        .find();
      
      // Delete notifications
      const deletePromises = notifications.map(notification => notification.destroy());
      await Promise.all(deletePromises);

      return {
        success: true,
        data: { 
          deletedCount: notifications.length,
          notificationIds: notifications.map(n => n.id)
        },
        message: `Deleted ${notifications.length} notifications`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'deleteNotifications',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete notifications',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'deleteNotifications',
          userId: context.user.userId
        }
      };
    }
  }
};
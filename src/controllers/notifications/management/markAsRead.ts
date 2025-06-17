import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { ParseQueryBuilder } from '../../../utils/parseUtils';

export const markAsReadAction: ActionDefinition = {
  id: 'markAsRead',
  name: 'Mark as Read',
  description: 'Mark one or more notifications as read',
  category: 'data',
  permissions: ['notifications:read'],
  parameters: [
    { name: 'notificationIds', type: 'array', required: true, description: 'Array of notification IDs to mark as read' }
  ],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const { notificationIds } = params;

      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return {
          success: false,
          error: 'Notification IDs array is required',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'markAsRead',
            userId: context.user.userId
          }
        };
      }

      // Create OR query for user and organization notifications
      const userQuery = new ParseQueryBuilder('Notification')
        .equalTo('recipientId', context.user.userId);
      
      const orgQuery = new ParseQueryBuilder('Notification')
        .equalTo('organizationId', context.user.organizationId)
        .equalTo('recipientType', 'organization');
      
      const accessibleQuery = ParseQueryBuilder.or(userQuery, orgQuery);
      
      // Filter by notification IDs and ensure user access
      const notifications = await new ParseQueryBuilder('Notification')
        .containedIn('objectId', notificationIds as string[])
        .getQuery()
        .matchesQuery('objectId', accessibleQuery.getQuery())
        .find();
      
      // Update status to read
      const updatePromises = notifications.map(notification => {
        notification.set('status', 'read');
        notification.set('readAt', new Date());
        notification.set('readBy', context.user.userId);
        return notification.save();
      });

      await Promise.all(updatePromises);

      return {
        success: true,
        data: { 
          updatedCount: notifications.length,
          notificationIds: notifications.map(n => n.id)
        },
        message: `Marked ${notifications.length} notifications as read`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'markAsRead',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark notifications as read',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'markAsRead',
          userId: context.user.userId
        }
      };
    }
  }
};
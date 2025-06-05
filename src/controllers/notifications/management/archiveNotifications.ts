import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import Parse from 'parse';

export const archiveNotificationsAction: ActionDefinition = {
  id: 'archiveNotifications',
  name: 'Archive Notifications',
  description: 'Archive one or more notifications',
  category: 'data',
  permissions: ['notifications:write'],
  parameters: [
    { name: 'notificationIds', type: 'array', required: true, description: 'Array of notification IDs to archive' }
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
            actionId: 'archiveNotifications',
            userId: context.user.userId
          }
        };
      }

      const query = new Parse.Query('Notification');
      query.containedIn('objectId', notificationIds as string[]);
      
      // Ensure user can only archive their own notifications
      const userQuery = new Parse.Query('Notification');
      userQuery.equalTo('recipientId', context.user.userId);
      
      const orgQuery = new Parse.Query('Notification');
      orgQuery.equalTo('organizationId', context.user.organizationId);
      orgQuery.equalTo('recipientType', 'organization');
      
      const combinedQuery = Parse.Query.or(userQuery, orgQuery);
      query.matchesQuery('objectId', combinedQuery);

      const notifications = await query.find();
      
      // Update status to archived
      const updatePromises = notifications.map(notification => {
        notification.set('status', 'archived');
        notification.set('archivedAt', new Date());
        notification.set('archivedBy', context.user.userId);
        return notification.save();
      });

      await Promise.all(updatePromises);

      return {
        success: true,
        data: { 
          archivedCount: notifications.length,
          notificationIds: notifications.map(n => n.id)
        },
        message: `Archived ${notifications.length} notifications`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'archiveNotifications',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to archive notifications',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'archiveNotifications',
          userId: context.user.userId
        }
      };
    }
  }
};
import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { createParseObject } from '../../../utils/parseUtils';

export const createNotificationAction: ActionDefinition = {
  id: 'createNotification',
  name: 'Create Notification',
  description: 'Create a new notification for users or organization',
  category: 'data',
  permissions: ['notifications:write'],
  parameters: [
    { name: 'title', type: 'string', required: true, description: 'Notification title' },
    { name: 'message', type: 'string', required: true, description: 'Notification message' },
    { name: 'type', type: 'string', required: true, description: 'Notification type' },
    { name: 'priority', type: 'string', required: false, description: 'Priority level (low, medium, high, urgent)' },
    { name: 'recipientType', type: 'string', required: true, description: 'Recipient type (user, organization, role)' },
    { name: 'recipientId', type: 'string', required: false, description: 'Specific recipient ID' },
    { name: 'actionUrl', type: 'string', required: false, description: 'URL for notification action' },
    { name: 'metadata', type: 'object', required: false, description: 'Additional notification metadata' },
    { name: 'expiresAt', type: 'string', required: false, description: 'Notification expiration date' }
  ],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const { 
        title, 
        message, 
        type, 
        priority = 'medium', 
        recipientType, 
        recipientId,
        actionUrl,
        metadata = {},
        expiresAt
      } = params;
      const orgId = context.user.organizationId || context.organization?.id;

      if (!orgId) {
        return {
          success: false,
          error: 'Organization ID is required to create notification',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'createNotification',
            userId: context.user.userId
          }
        };
      }

      // Create notification using utility function
      const notificationData: Record<string, any> = {
        title,
        message,
        type,
        priority,
        recipientType,
        recipientId: recipientId || null,
        actionUrl: actionUrl || '',
        metadata,
        organizationId: orgId,
        createdBy: context.user.userId,
        status: 'unread',
        isActive: true
      };

      if (expiresAt) {
        notificationData.expiresAt = new Date(expiresAt as string);
      }

      const savedNotification = await createParseObject('Notification', notificationData);

      return {
        success: true,
        data: { notification: savedNotification.toJSON() },
        message: 'Notification created successfully',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'createNotification',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create notification',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'createNotification',
          userId: context.user.userId
        }
      };
    }
  }
};
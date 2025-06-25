import { ActionContext } from '../../types/ActionTypes';
import { ActionConfig } from '../../base/BasePageController';
import { callCloudFunction } from '@/utils/apiUtils';

/**
 * Mark notification as read action
 */
export function getMarkAsReadAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'markAsRead',
      name: 'Mark As Read',
      description: 'Mark a notification as read',
      category: 'data',
      permissions: ['notifications:read'],
      parameters: [
        { name: 'notificationId', type: 'string', required: true, description: 'ID of the notification to mark as read' }
      ]
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        const { notificationId } = params;

        // Validate organization context
        const orgId = context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        // Call cloud function to mark notification as read
        const response = await callCloudFunction('markNotificationAsRead', {
          notificationId: notificationId as string,
          organizationId: orgId,
          userId: context.user.userId
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to mark notification as read');
        }

        return {
          success: true,
          message: 'Notification marked as read',
          data: response.data
        };
      } catch (error) {
        console.error('Error marking notification as read:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to mark notification as read'
        };
      }
    }
  };
}

/**
 * Mark all notifications as read action
 */
export function getMarkAllAsReadAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'markAllAsRead',
      name: 'Mark All As Read',
      description: 'Mark all notifications as read for the current user',
      category: 'data',
      permissions: ['notifications:read'],
      parameters: [
        { name: 'type', type: 'string', required: false, description: 'Optional notification type filter' }
      ]
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        const { type } = params;

        // Validate organization context
        const orgId = context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        // Call cloud function to mark all notifications as read
        const response = await callCloudFunction('markAllNotificationsAsRead', {
          organizationId: orgId,
          userId: context.user.userId,
          type: type as string
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to mark notifications as read');
        }

        return {
          success: true,
          message: response.message || 'All notifications marked as read',
          data: response.data
        };
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to mark notifications as read'
        };
      }
    }
  };
}

/**
 * Archive notification action
 */
export function getArchiveNotificationAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'archiveNotification',
      name: 'Archive Notification',
      description: 'Archive a notification',
      category: 'data',
      permissions: ['notifications:manage'],
      parameters: [
        { name: 'notificationId', type: 'string', required: true, description: 'ID of the notification to archive' }
      ]
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        const { notificationId } = params;

        // Validate organization context
        const orgId = context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        // Call cloud function to archive notification
        const response = await callCloudFunction('archiveNotification', {
          notificationId: notificationId as string,
          organizationId: orgId,
          userId: context.user.userId
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to archive notification');
        }

        return {
          success: true,
          message: 'Notification archived',
          data: response.data
        };
      } catch (error) {
        console.error('Error archiving notification:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to archive notification'
        };
      }
    }
  };
}

/**
 * Delete notification action
 */
export function getDeleteNotificationAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'deleteNotification',
      name: 'Delete Notification',
      description: 'Delete a notification permanently',
      category: 'data',
      permissions: ['notifications:manage'],
      parameters: [
        { name: 'notificationId', type: 'string', required: true, description: 'ID of the notification to delete' }
      ]
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        const { notificationId } = params;

        // Validate organization context
        const orgId = context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        // Call cloud function to delete notification
        const response = await callCloudFunction('deleteNotification', {
          notificationId: notificationId as string,
          organizationId: orgId,
          userId: context.user.userId
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to delete notification');
        }

        return {
          success: true,
          message: 'Notification deleted',
          data: response.data
        };
      } catch (error) {
        console.error('Error deleting notification:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete notification'
        };
      }
    }
  };
}

/**
 * Bulk archive notifications action
 */
export function getBulkArchiveAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'bulkArchive',
      name: 'Bulk Archive',
      description: 'Archive multiple notifications',
      category: 'data',
      permissions: ['notifications:manage'],
      parameters: [
        { name: 'notificationIds', type: 'array', required: true, description: 'Array of notification IDs to archive' }
      ]
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        const { notificationIds } = params;

        if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
          throw new Error('Invalid notification IDs array');
        }

        // Validate organization context
        const orgId = context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        // Call cloud function to bulk archive notifications
        const response = await callCloudFunction('bulkArchiveNotifications', {
          notificationIds: notificationIds as string[],
          organizationId: orgId,
          userId: context.user.userId
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to archive notifications');
        }

        return {
          success: true,
          message: response.message || 'Notifications archived',
          data: response.data
        };
      } catch (error) {
        console.error('Error bulk archiving notifications:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to archive notifications'
        };
      }
    }
  };
}

/**
 * Clear all archived notifications action
 */
export function getClearArchivedAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'clearArchived',
      name: 'Clear Archived',
      description: 'Delete all archived notifications for the current user',
      category: 'data',
      permissions: ['notifications:manage'],
      parameters: []
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        // Validate organization context
        const orgId = context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        // Call cloud function to clear archived notifications
        const response = await callCloudFunction('clearArchivedNotifications', {
          organizationId: orgId,
          userId: context.user.userId
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to clear archived notifications');
        }

        return {
          success: true,
          message: response.message || 'Archived notifications cleared',
          data: response.data
        };
      } catch (error) {
        console.error('Error clearing archived notifications:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to clear archived notifications'
        };
      }
    }
  };
}
import { callCloudFunction, callCloudFunctionForArray } from '../../utils/apiUtils';

/**
 * Refactored notifications API using the new utility functions
 * This eliminates all the repetitive error handling and Parse.Cloud.run patterns
 */

export interface NotificationParams {
  type?: string;
  status?: string;
  priority?: string;
  limit?: number;
  includeArchived?: boolean;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  types: string[];
}

export const notificationsApi = {
  /**
   * Fetch notifications with filters
   */
  async getNotifications(params: NotificationParams = {}) {
    return callCloudFunctionForArray('getNotifications', params as Record<string, unknown>, {
      errorMessage: 'Failed to fetch notifications'
    });
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string) {
    return callCloudFunction('markNotificationAsRead', { notificationId }, {
      errorMessage: 'Failed to mark notification as read'
    });
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(type?: string) {
    return callCloudFunction('markAllNotificationsAsRead', { type }, {
      errorMessage: 'Failed to mark all notifications as read'
    });
  },

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string) {
    return callCloudFunction('deleteNotification', { notificationId }, {
      errorMessage: 'Failed to delete notification'
    });
  },

  /**
   * Batch delete notifications
   */
  async deleteNotifications(notificationIds: string[]) {
    return callCloudFunction('deleteNotifications', { notificationIds }, {
      errorMessage: 'Failed to delete notifications'
    });
  },

  /**
   * Archive notifications
   */
  async archiveNotifications(notificationIds: string[]) {
    return callCloudFunction('archiveNotifications', { notificationIds }, {
      errorMessage: 'Failed to archive notifications'
    });
  },

  /**
   * Get notification preferences
   */
  async getPreferences() {
    return callCloudFunction<NotificationPreferences>('getNotificationPreferences', {}, {
      errorMessage: 'Failed to fetch notification preferences'
    });
  },

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: NotificationPreferences) {
    return callCloudFunction('updateNotificationPreferences', { preferences }, {
      errorMessage: 'Failed to update notification preferences'
    });
  },

  /**
   * Get notification types
   */
  async getNotificationTypes() {
    return callCloudFunctionForArray('getNotificationTypes', {}, {
      errorMessage: 'Failed to fetch notification types'
    });
  },

  /**
   * Create notification (admin/system use)
   */
  async createNotification(notificationData: {
    type: string;
    title: string;
    message: string;
    recipientId?: string;
    organizationId?: string;
    priority?: string;
    data?: Record<string, any>;
  }) {
    return callCloudFunction('createNotification', notificationData, {
      errorMessage: 'Failed to create notification'
    });
  }
};

// Export individual functions for backward compatibility
export const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteNotifications,
  archiveNotifications,
  getPreferences,
  updatePreferences,
  getNotificationTypes,
  createNotification
} = notificationsApi;
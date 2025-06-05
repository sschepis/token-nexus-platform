/* eslint-disable @typescript-eslint/no-explicit-any */
import Parse from 'parse';
import { apiService, mockResponse } from './base'; // Import apiService and mockResponse
import { Notification, NotificationPriority } from '../../store/slices/notificationSlice';

/**
 * @file Notification API services.
 * Handles operations related to user notifications via Parse Cloud Functions.
 */
const notificationApi = {
  /**
   * Fetches a list of notifications for the current user.
   * @param {object} [params] - Optional parameters for filtering and pagination.
   * @param {string} [params.type] - Filter notifications by type (e.g., 'system', 'security').
   * @param {boolean} [params.unreadOnly] - If true, only return unread notifications.
   * @param {number} [params.limit] - Maximum number of notifications to return.
   * @param {number} [params.skip] - Number of notifications to skip for pagination.
   * @returns {Promise<{ data: { notifications: any[]; unreadCount: number } }>} A promise that resolves with an object containing the list of notifications and unread count.
   * @throws {Error} Throws an error if fetching notifications fails.
   */
  getNotifications: async (params?: {
    type?: string;
    unreadOnly?: boolean;
    limit?: number;
    skip?: number;
  }): Promise<{ data: { notifications: any[]; unreadCount: number } }> => {
    try {
      const result = await Parse.Cloud.run('getNotifications', params || {});
      
      return {
        data: {
          notifications: result.notifications || [],
          unreadCount: result.unreadCount || 0
        }
      };
    } catch (error: any) {
      console.debug('[Notification API] Error calling getNotifications cloud function:', error);
      throw new Error(error.message || 'Failed to fetch notifications');
    }
  },

  /**
   * Marks a specific notification as read.
   * @param {string} notificationId - The ID of the notification to mark as read.
   * @returns {Promise<{ data: { success: boolean; unreadCount: number } }>} A promise that resolves with a success status and updated unread count.
   * @throws {Error} Throws an error if marking notification as read fails.
   */
  markNotificationAsRead: async (notificationId: string): Promise<{ data: { success: boolean; unreadCount: number } }> => {
    try {
      const result = await Parse.Cloud.run('markNotificationAsRead', { notificationId });
      
      return {
        data: {
          success: result.success,
          unreadCount: result.unreadCount
        }
      };
    } catch (error: any) {
      console.debug('[Notification API] Error calling markNotificationAsRead cloud function:', error);
      throw new Error(error.message || 'Failed to mark notification as read');
    }
  },

  /**
   * Marks all notifications as read for the current user, optionally filtering by type.
   * @param {string} [type] - Optional type to filter notifications (e.g., 'system', 'security').
   * @returns {Promise<{ data: { success: boolean; markedCount: number; unreadCount: number } }>} A promise that resolves with a success status, count of marked notifications, and updated unread count.
   * @throws {Error} Throws an error if marking all notifications as read fails.
   */
  markAllNotificationsAsRead: async (type?: string): Promise<{ data: { success: boolean; markedCount: number; unreadCount: number } }> => {
    try {
      const result = await Parse.Cloud.run('markAllNotificationsAsRead', { type });
      
      return {
        data: {
          success: result.success,
          markedCount: result.markedCount,
          unreadCount: result.unreadCount
        }
      };
    } catch (error: any) {
      console.debug('[Notification API] Error calling markAllNotificationsAsRead cloud function:', error);
      throw new Error(error.message || 'Failed to mark all notifications as read');
    }
  },

  /**
   * Deletes a specific notification.
   * @param {string} notificationId - The ID of the notification to delete.
   * @returns {Promise<{ data: { success: boolean; unreadCount: number } }>} A promise that resolves with a success status and updated unread count.
   * @throws {Error} Throws an error if deleting notification fails.
   */
  deleteNotification: async (notificationId: string): Promise<{ data: { success: boolean; unreadCount: number } }> => {
    try {
      const result = await Parse.Cloud.run('deleteNotification', { notificationId });
      
      return {
        data: {
          success: result.success,
          unreadCount: result.unreadCount
        }
      };
    } catch (error: any) {
      console.debug('[Notification API] Error calling deleteNotification cloud function:', error);
      throw new Error(error.message || 'Failed to delete notification');
    }
  },

  /**
   * Updates notification preferences for the current user.
   * @param {object} preferences - An object containing the notification preferences to update.
   * @param {boolean} [preferences.emailNotifications] - Whether email notifications are enabled.
   * @param {boolean} [preferences.pushNotifications] - Whether push notifications are enabled.
   * @param {boolean} [preferences.smsNotifications] - Whether SMS notifications are enabled.
   * @param {object} [preferences.types] - Object to enable/disable specific notification types.
   * @param {boolean} [preferences.types.system] - System notification preference.
   * @param {boolean} [preferences.types.security] - Security notification preference.
   * @param {boolean} [preferences.types.usage] - Usage notification preference.
   * @param {boolean} [preferences.types.team] - Team notification preference.
   * @param {string} [preferences.quietHoursStart] - Start time for quiet hours (e.g., "22:00").
   * @param {string} [preferences.quietHoursEnd] - End time for quiet hours (e.g., "08:00").
   * @param {string} [preferences.timezone] - User's timezone (e.g., "America/Los_Angeles").
   * @returns {Promise<{ data: { preferences: any } }>} A promise that resolves with an object containing the updated preferences.
   * @throws {Error} Throws an error if updating preferences fails.
   */
  updateNotificationPreferences: async (preferences: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    smsNotifications?: boolean;
    types?: {
      system?: boolean;
      security?: boolean;
      usage?: boolean;
      team?: boolean;
    };
    quietHoursStart?: string;
    quietHoursEnd?: string;
    timezone?: string;
  }): Promise<{ data: { preferences: any } }> => {
    try {
      const result = await Parse.Cloud.run('updateNotificationPreferences', { preferences });
      
      return {
        data: {
          preferences: result.preferences
        }
      };
    } catch (error: any) {
      console.debug('[Notification API] Error calling updateNotificationPreferences cloud function:', error);
      throw new Error(error.message || 'Failed to update notification preferences');
    }
  },
};

const mockNotificationApis = {
  getNotifications: () => {
    return mockResponse({
      notifications: [
        {
          id: "notif-1",
          type: "system",
          title: "System Maintenance",
          message: "Scheduled maintenance will occur tomorrow at 2:00 AM UTC.",
          createdAt: new Date(Date.now() + 86400000).toISOString(),
          isRead: false,
          priority: "normal" as NotificationPriority,
          userId: "user-123",
        },
        {
          id: "notif-2",
          type: "security",
          title: "New Login Detected",
          message: "A new login was detected from Chicago, USA.",
          createdAt: new Date().toISOString(),
          isRead: false,
          priority: "high" as NotificationPriority,
          userId: "user-123",
          actionUrl: "/settings/security",
          actionLabel: "Review Activity",
        },
      ] as Notification[],
      unreadCount: 0,
    });
  },

  markNotificationAsRead: (id: string) => {
    return mockResponse({ success: true, unreadCount: 0 });
  },

  markAllNotificationsAsRead: () => {
    return mockResponse({ success: true, markedCount: 2, unreadCount: 0 });
  },

  deleteNotification: (id: string) => {
    return mockResponse({ success: true, unreadCount: 0 });
  },

  updateNotificationPreferences: (preferences: any) => {
    return mockResponse({ preferences });
  },
};

// Merge Notification APIs into the global apiService
Object.assign(apiService, process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' ? mockNotificationApis : notificationApi);
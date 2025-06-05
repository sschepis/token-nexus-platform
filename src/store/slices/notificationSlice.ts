import { createCRUDSlice } from '../utils/createCRUDSlice';
import { apiService } from '@/services/api';
import { createAsyncThunk } from '@reduxjs/toolkit';

export type NotificationType = 'system' | 'security' | 'usage' | 'team' | 'integration';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  priority: NotificationPriority;
  actionUrl?: string;
  actionLabel?: string;
  userId: string;
  data?: Record<string, any>;
}

export interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  actionUrl?: string;
  actionLabel?: string;
  data?: Record<string, any>;
}

export interface UpdateNotificationParams {
  isRead?: boolean;
  data?: Record<string, any>;
}

// Custom API adapter for notifications
const notificationApiAdapter = {
  getAll: (params?: any) => apiService.getNotifications(params),
  getById: (id: string) => {
    // Notifications don't typically have a getById, so we'll simulate it
    return apiService.getNotifications({ notificationId: id }).then(response => ({
      data: {
        notification: response.data.notifications?.[0] || null
      }
    }));
  },
  create: (params: CreateNotificationParams) => {
    // Notifications are typically created by the system, not by users
    // This is a placeholder implementation
    throw new Error('Creating notifications directly is not supported');
  },
  update: (id: string, params: UpdateNotificationParams) => {
    if (params.isRead !== undefined) {
      return apiService.markNotificationAsRead(id);
    }
    throw new Error('General notification updates not supported');
  },
  delete: (id: string) => apiService.deleteNotification(id),
};

// Create the CRUD slice using our factory
const notificationCRUD = createCRUDSlice<Notification, CreateNotificationParams, UpdateNotificationParams>({
  name: 'notification',
  apiService: notificationApiAdapter,
  initialState: {
    unreadCount: 0,
  },
  responseMapping: {
    items: 'notifications',
    item: 'notification',
  },
  errorMessages: {
    fetch: 'Failed to fetch notifications',
    create: 'Failed to create notification',
    update: 'Failed to update notification',
    delete: 'Failed to delete notification',
    getById: 'Failed to fetch notification details',
  },
});

// Export the slice
export const notificationSlice = notificationCRUD.slice;

// Export actions with backward-compatible names
export const fetchNotifications = notificationCRUD.actions.fetchItems;
export const markNotificationAsReadAsync = notificationCRUD.actions.updateItem;
export const deleteNotificationAsync = notificationCRUD.actions.deleteItem;

// Export standard CRUD actions
export const {
  clearError: clearNotificationErrors,
  setFilters,
  resetFilters,
  clearSelectedItem,
} = notificationCRUD.actions;

// Create custom thunks for notification-specific operations
export const markAllNotificationsAsReadAsync = createAsyncThunk(
  'notifications/markAllAsRead',
  async (type?: string) => {
    const response = await apiService.markAllNotificationsAsRead(type);
    return response.data;
  }
);

// Simple action creators for backward compatibility
export const addNotification = notificationSlice.actions.clearError; // Placeholder
export const updateUnreadCount = notificationSlice.actions.clearError; // Placeholder
export const markAsRead = markNotificationAsReadAsync;
export const markAllAsRead = markAllNotificationsAsReadAsync;
export const deleteNotification = deleteNotificationAsync;

// Export selectors with notification-specific names
export const notificationSelectors = {
  selectNotifications: notificationCRUD.selectors.selectItems,
  selectSelectedNotification: notificationCRUD.selectors.selectSelectedItem,
  selectIsLoading: notificationCRUD.selectors.selectIsLoading,
  selectIsCreating: notificationCRUD.selectors.selectIsCreating,
  selectIsUpdating: notificationCRUD.selectors.selectIsUpdating,
  selectIsDeleting: notificationCRUD.selectors.selectIsDeleting,
  selectNotificationError: notificationCRUD.selectors.selectError,
  selectNotificationTotalCount: notificationCRUD.selectors.selectTotalCount,
  selectNotificationHasMore: notificationCRUD.selectors.selectHasMore,
  selectNotificationFilters: notificationCRUD.selectors.selectFilters,
  // Custom selectors
  selectUnreadCount: (state: any) => state.notification.unreadCount,
};

export default notificationSlice.reducer;

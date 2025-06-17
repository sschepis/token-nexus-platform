import { createSlice } from '@reduxjs/toolkit';
import { 
  AsyncThunkFactory, 
  AsyncReducerBuilder, 
  createAsyncInitialState,
  ExtendedAsyncState 
} from '../utils/createAsyncSliceUtils';

/**
 * Refactored notification slice using the new utility functions
 * This eliminates all the repetitive async thunk boilerplate
 */

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  status: 'unread' | 'read' | 'archived';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  recipientId?: string;
  organizationId?: string;
  data?: Record<string, any>;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  types: string[];
}

interface NotificationState extends ExtendedAsyncState {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences | null;
  types: string[];
  selectedNotifications: string[];
}

// Create async thunks using the factory
const notificationThunks = {
  // CRUD operations
  ...AsyncThunkFactory.createCRUD<Notification>('notifications'),
  
  // Additional specific operations
  markAsRead: AsyncThunkFactory.create<{ notificationIds: string[] }, void>({
    name: 'notifications/markAsRead',
    cloudFunction: 'markNotificationAsRead'
  }),

  markAllAsRead: AsyncThunkFactory.create<{ type?: string }, void>({
    name: 'notifications/markAllAsRead',
    cloudFunction: 'markAllNotificationsAsRead'
  }),

  archiveNotifications: AsyncThunkFactory.create<{ notificationIds: string[] }, void>({
    name: 'notifications/archiveNotifications',
    cloudFunction: 'archiveNotifications'
  }),

  fetchPreferences: AsyncThunkFactory.create<void, NotificationPreferences>({
    name: 'notifications/fetchPreferences',
    cloudFunction: 'getNotificationPreferences'
  }),

  updatePreferences: AsyncThunkFactory.create<NotificationPreferences, NotificationPreferences>({
    name: 'notifications/updatePreferences',
    cloudFunction: 'updateNotificationPreferences',
    transformParams: (preferences) => ({ preferences })
  }),

  fetchTypes: AsyncThunkFactory.create<void, string[]>({
    name: 'notifications/fetchTypes',
    cloudFunction: 'getNotificationTypes'
  })
};

// Initial state using the utility
const initialState: NotificationState = createAsyncInitialState({
  notifications: [],
  unreadCount: 0,
  preferences: null,
  types: [],
  selectedNotifications: []
}, { includeExtended: true });

// Create the slice
const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // Synchronous reducers
    selectNotification: (state, action) => {
      const notificationId = action.payload;
      if (!state.selectedNotifications.includes(notificationId)) {
        state.selectedNotifications.push(notificationId);
      }
    },
    
    deselectNotification: (state, action) => {
      const notificationId = action.payload;
      state.selectedNotifications = state.selectedNotifications.filter(id => id !== notificationId);
    },
    
    selectAllNotifications: (state) => {
      state.selectedNotifications = state.notifications.map(n => n.id);
    },
    
    clearSelection: (state) => {
      state.selectedNotifications = [];
    },
    
    updateUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    }
  },
  extraReducers: (builder) => {
    // Add CRUD cases manually due to type complexity
    AsyncReducerBuilder.addAsyncCase(builder, notificationThunks.fetch, {
      loadingFlag: 'isFetching',
      onFulfilled: (state, action) => {
        state.notifications = action.payload;
        state.unreadCount = action.payload.filter((n: Notification) => n.status === 'unread').length;
      }
    });

    AsyncReducerBuilder.addAsyncCase(builder, notificationThunks.create, {
      loadingFlag: 'isCreating',
      onFulfilled: (state, action) => {
        state.notifications.unshift(action.payload);
        if (action.payload.status === 'unread') {
          state.unreadCount++;
        }
      }
    });

    AsyncReducerBuilder.addAsyncCase(builder, notificationThunks.update, {
      loadingFlag: 'isUpdating',
      onFulfilled: (state, action) => {
        const index = state.notifications.findIndex(n => n.id === action.payload.id);
        if (index !== -1) {
          const oldNotification = state.notifications[index];
          state.notifications[index] = action.payload;
          
          // Update unread count if status changed
          if (oldNotification.status === 'unread' && action.payload.status === 'read') {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          } else if (oldNotification.status === 'read' && action.payload.status === 'unread') {
            state.unreadCount++;
          }
        }
      }
    });

    AsyncReducerBuilder.addAsyncCase(builder, notificationThunks.delete, {
      loadingFlag: 'isDeleting',
      onFulfilled: (state, action) => {
        const deletedId = action.payload.id;
        const notification = state.notifications.find(n => n.id === deletedId);
        if (notification?.status === 'unread') {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications = state.notifications.filter(n => n.id !== deletedId);
        state.selectedNotifications = state.selectedNotifications.filter(id => id !== deletedId);
      }
    });

    // Add specific async cases using the utility
    AsyncReducerBuilder.addAsyncCase(builder, notificationThunks.markAsRead, {
      loadingFlag: 'isUpdating',
      onFulfilled: (state, action) => {
        // Access the original arguments from the thunk
        const notificationIds = (action as any).meta?.arg?.notificationIds || [];
        notificationIds.forEach((id: string) => {
          const notification = state.notifications.find(n => n.id === id);
          if (notification && notification.status === 'unread') {
            notification.status = 'read';
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        });
      }
    });

    AsyncReducerBuilder.addAsyncCase(builder, notificationThunks.markAllAsRead, {
      loadingFlag: 'isUpdating',
      onFulfilled: (state) => {
        state.notifications.forEach(notification => {
          if (notification.status === 'unread') {
            notification.status = 'read';
          }
        });
        state.unreadCount = 0;
      }
    });

    AsyncReducerBuilder.addAsyncCase(builder, notificationThunks.archiveNotifications, {
      loadingFlag: 'isUpdating',
      onFulfilled: (state, action) => {
        // Access the original arguments from the thunk
        const notificationIds = (action as any).meta?.arg?.notificationIds || [];
        notificationIds.forEach((id: string) => {
          const notification = state.notifications.find(n => n.id === id);
          if (notification) {
            notification.status = 'archived';
            if (notification.status === 'unread') {
              state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
          }
        });
      }
    });

    AsyncReducerBuilder.addAsyncCase(builder, notificationThunks.fetchPreferences, {
      onFulfilled: (state, action) => {
        state.preferences = action.payload;
      }
    });

    AsyncReducerBuilder.addAsyncCase(builder, notificationThunks.updatePreferences, {
      loadingFlag: 'isUpdating',
      onFulfilled: (state, action) => {
        state.preferences = action.payload;
      }
    });

    AsyncReducerBuilder.addAsyncCase(builder, notificationThunks.fetchTypes, {
      onFulfilled: (state, action) => {
        state.types = action.payload;
      }
    });
  }
});

// Export actions and thunks
export const {
  selectNotification,
  deselectNotification,
  selectAllNotifications,
  clearSelection,
  updateUnreadCount
} = notificationSlice.actions;

export const {
  fetch: fetchNotifications,
  create: createNotification,
  update: updateNotification,
  delete: deleteNotification,
  markAsRead,
  markAllAsRead,
  archiveNotifications,
  fetchPreferences,
  updatePreferences,
  fetchTypes
} = notificationThunks;

export default notificationSlice.reducer;

// Selectors
export const selectNotifications = (state: any) => state.notifications.notifications;
export const selectUnreadCount = (state: any) => state.notifications.unreadCount;
export const selectPreferences = (state: any) => state.notifications.preferences;
export const selectNotificationTypes = (state: any) => state.notifications.types;
export const selectSelectedNotifications = (state: any) => state.notifications.selectedNotifications;
export const selectIsLoading = (state: any) => state.notifications.isLoading;
export const selectError = (state: any) => state.notifications.error;
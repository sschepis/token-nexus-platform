import {
  PageController,
  ActionDefinition,
  ActionContext,
  ActionResult,
  PageContext
} from './types/ActionTypes';

export class NotificationsPageController implements PageController {
  pageId = 'notifications';
  pageName = 'Notifications';
  description = 'Manage system notifications, alerts, and messaging';
  actions = new Map<string, ActionDefinition>();
  context: PageContext = {
    pageId: 'notifications',
    pageName: 'Notifications',
    state: {},
    props: {},
    metadata: {
      category: 'communication',
      tags: ['notifications', 'alerts', 'messaging', 'communication'],
      permissions: ['notifications:read', 'notifications:write', 'notifications:manage']
    }
  };
  metadata = {
    category: 'communication',
    tags: ['notifications', 'alerts', 'messaging', 'communication'],
    permissions: ['notifications:read', 'notifications:write', 'notifications:manage'],
    version: '1.0.0'
  };
  isActive = true;
  registeredAt = new Date();

  constructor() {
    this.initializeActions();
  }

  private initializeActions(): void {
    // Fetch Notifications Action
    this.actions.set('fetchNotifications', {
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
    });

    // Create Notification Action
    this.actions.set('createNotification', {
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

          const Notification = Parse.Object.extend('Notification');
          const notification = new Notification();

          notification.set('title', title);
          notification.set('message', message);
          notification.set('type', type);
          notification.set('priority', priority);
          notification.set('recipientType', recipientType);
          notification.set('recipientId', recipientId || null);
          notification.set('actionUrl', actionUrl || '');
          notification.set('metadata', metadata);
          notification.set('organizationId', orgId);
          notification.set('createdBy', context.user.userId);
          notification.set('status', 'unread');
          notification.set('isActive', true);

          if (expiresAt) {
            notification.set('expiresAt', new Date(expiresAt as string));
          }

          const savedNotification = await notification.save();

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
    });

    // Mark Notification as Read Action
    this.actions.set('markAsRead', {
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

          const query = new Parse.Query('Notification');
          query.containedIn('objectId', notificationIds as string[]);
          
          // Ensure user can only mark their own notifications as read
          const userQuery = new Parse.Query('Notification');
          userQuery.equalTo('recipientId', context.user.userId);
          
          const orgQuery = new Parse.Query('Notification');
          orgQuery.equalTo('organizationId', context.user.organizationId);
          orgQuery.equalTo('recipientType', 'organization');
          
          const combinedQuery = Parse.Query.or(userQuery, orgQuery);
          query.matchesQuery('objectId', combinedQuery);

          const notifications = await query.find();
          
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
    });

    // Archive Notifications Action
    this.actions.set('archiveNotifications', {
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
    });

    // Delete Notifications Action
    this.actions.set('deleteNotifications', {
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

          const query = new Parse.Query('Notification');
          query.containedIn('objectId', notificationIds as string[]);
          
          // Ensure user can only delete their own notifications or org notifications they created
          const userQuery = new Parse.Query('Notification');
          userQuery.equalTo('recipientId', context.user.userId);
          
          const createdQuery = new Parse.Query('Notification');
          createdQuery.equalTo('createdBy', context.user.userId);
          
          const combinedQuery = Parse.Query.or(userQuery, createdQuery);
          query.matchesQuery('objectId', combinedQuery);

          const notifications = await query.find();
          
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
    });

    // Get Notification Types Action
    this.actions.set('getNotificationTypes', {
      id: 'getNotificationTypes',
      name: 'Get Notification Types',
      description: 'Get all available notification types',
      category: 'data',
      permissions: ['notifications:read'],
      parameters: [],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const types = [
            'system',
            'security',
            'user_action',
            'integration',
            'workflow',
            'reminder',
            'alert',
            'announcement',
            'update',
            'error'
          ];

          return {
            success: true,
            data: { types },
            message: `Found ${types.length} notification types`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getNotificationTypes',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get notification types',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getNotificationTypes',
              userId: context.user.userId
            }
          };
        }
      }
    });
  }
}

// Export singleton instance
export const notificationsPageController = new NotificationsPageController();
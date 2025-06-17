import { BasePageController } from '../base/BasePageController';
import { createQuery, CommonQueries, ParseBatchUtils } from '../../utils/parseUtils';
import { ActionContext, ActionResult } from '../base/types';

/**
 * Refactored notifications controller using the new Parse utilities
 * This eliminates all the repetitive Parse query patterns
 */
export class NotificationsController extends BasePageController {
  constructor() {
    super({
      pageId: 'notifications',
      name: 'Notifications Controller',
      description: 'Manages notification operations'
    });

    this.registerActions();
  }

  private registerActions() {
    // Fetch notifications with filters
    this.registerAction({
      id: 'fetchNotifications',
      name: 'Fetch Notifications',
      description: 'Fetch notifications with optional filters',
      category: 'data',
      permissions: ['notifications:read'],
      parameters: [
        { name: 'type', type: 'string', required: false, description: 'Filter by notification type' },
        { name: 'status', type: 'string', required: false, description: 'Filter by status' },
        { name: 'priority', type: 'string', required: false, description: 'Filter by priority' },
        { name: 'limit', type: 'number', required: false, description: 'Limit results', defaultValue: 50 },
        { name: 'includeArchived', type: 'boolean', required: false, description: 'Include archived notifications' }
      ]
    }, this.fetchNotifications.bind(this));

    // Mark notifications as read
    this.registerAction({
      id: 'markAsRead',
      name: 'Mark As Read',
      description: 'Mark notifications as read',
      category: 'action',
      permissions: ['notifications:write'],
      parameters: [
        { name: 'notificationIds', type: 'array', required: true, description: 'Array of notification IDs' }
      ]
    }, this.markAsRead.bind(this));

    // Archive notifications
    this.registerAction({
      id: 'archiveNotifications',
      name: 'Archive Notifications',
      description: 'Archive multiple notifications',
      category: 'action',
      permissions: ['notifications:write'],
      parameters: [
        { name: 'notificationIds', type: 'array', required: true, description: 'Array of notification IDs' }
      ]
    }, this.archiveNotifications.bind(this));

    // Delete notifications
    this.registerAction({
      id: 'deleteNotifications',
      name: 'Delete Notifications',
      description: 'Delete multiple notifications',
      category: 'action',
      permissions: ['notifications:delete'],
      parameters: [
        { name: 'notificationIds', type: 'array', required: true, description: 'Array of notification IDs' },
        { name: 'confirmDelete', type: 'boolean', required: true, description: 'Confirmation flag' }
      ]
    }, this.deleteNotifications.bind(this));

    // Create notification
    this.registerAction({
      id: 'createNotification',
      name: 'Create Notification',
      description: 'Create a new notification',
      category: 'action',
      permissions: ['notifications:create'],
      parameters: [
        { name: 'type', type: 'string', required: true, description: 'Notification type' },
        { name: 'title', type: 'string', required: true, description: 'Notification title' },
        { name: 'message', type: 'string', required: true, description: 'Notification message' },
        { name: 'priority', type: 'string', required: false, description: 'Priority level' },
        { name: 'recipientId', type: 'string', required: false, description: 'Specific recipient ID' },
        { name: 'data', type: 'object', required: false, description: 'Additional data' }
      ]
    }, this.createNotification.bind(this));
  }

  /**
   * Fetch notifications using the new query builder
   */
  private async fetchNotifications(params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> {
    const { type, status, priority, limit = 50, includeArchived = false } = params;
    const orgId = this.getOrganizationId(context);

    try {
      // Use the common user/org query pattern
      const combinedQuery = CommonQueries.createUserOrgQuery('Notification', context.user.userId, orgId);

      // Apply additional filters using the query builder
      const builder = createQuery('Notification');
      
      if (type) {
        builder.withType(type as string);
      }
      if (status) {
        builder.withStatus(status as string);
      }
      if (!includeArchived) {
        builder.withStatuses(['unread', 'read']); // Exclude archived
      }
      if (priority) {
        combinedQuery.equalTo('priority', priority);
      }

      // Apply pagination and sorting
      combinedQuery.limit(limit as number);
      combinedQuery.descending('createdAt');

      // Execute the query
      const notifications = await combinedQuery.find();
      const notificationData = notifications.map(notification => notification.toJSON());

      // Get unread count using the query builder
      const unreadCount = await createQuery('Notification')
        .forOrganization(orgId)
        .forRecipient(context.user.userId)
        .withStatus('unread')
        .count();

      return this.createSuccessResult('fetchNotifications', context.user.userId, {
        notifications: notificationData,
        unreadCount,
        total: notificationData.length
      });

    } catch (error: any) {
      return this.createErrorResult('fetchNotifications', context.user.userId, error.message);
    }
  }

  /**
   * Mark notifications as read using batch utilities
   */
  private async markAsRead(params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> {
    const { notificationIds } = params;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return this.createErrorResult('markAsRead', context.user.userId, 'No notification IDs provided');
    }

    try {
      // Fetch notifications using query builder with security check
      const notifications = await createQuery('Notification')
        .withIds(notificationIds as string[])
        .getQuery()
        .find();

      // Filter to only notifications the user can modify
      const userNotifications = notifications.filter(notification => 
        notification.get('recipientId') === context.user.userId ||
        notification.get('organizationId') === this.getOrganizationId(context)
      );

      if (userNotifications.length === 0) {
        return this.createErrorResult('markAsRead', context.user.userId, 'No accessible notifications found');
      }

      // Use batch update utility
      const result = await ParseBatchUtils.batchUpdate(userNotifications, {
        status: 'read',
        readAt: new Date(),
        readBy: context.user.userId
      });

      return this.createSuccessResult('markAsRead', context.user.userId, {
        updated: result.updated.length,
        errors: result.errors.length,
        message: `Marked ${result.updated.length} notifications as read`
      });

    } catch (error: any) {
      return this.createErrorResult('markAsRead', context.user.userId, error.message);
    }
  }

  /**
   * Archive notifications using batch utilities
   */
  private async archiveNotifications(params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> {
    const { notificationIds } = params;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return this.createErrorResult('archiveNotifications', context.user.userId, 'No notification IDs provided');
    }

    try {
      // Use the common user/org query pattern with ID filter
      const query = CommonQueries.createUserOrgQuery('Notification', context.user.userId, this.getOrganizationId(context));
      query.containedIn('objectId', notificationIds as string[]);

      const notifications = await query.find();

      if (notifications.length === 0) {
        return this.createErrorResult('archiveNotifications', context.user.userId, 'No accessible notifications found');
      }

      // Use batch update utility
      const result = await ParseBatchUtils.batchUpdate(notifications, {
        status: 'archived',
        archivedAt: new Date(),
        archivedBy: context.user.userId
      });

      return this.createSuccessResult('archiveNotifications', context.user.userId, {
        archived: result.updated.length,
        errors: result.errors.length,
        message: `Archived ${result.updated.length} notifications`
      });

    } catch (error: any) {
      return this.createErrorResult('archiveNotifications', context.user.userId, error.message);
    }
  }

  /**
   * Delete notifications using batch utilities
   */
  private async deleteNotifications(params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> {
    const { notificationIds, confirmDelete } = params;

    if (!confirmDelete) {
      return this.createErrorResult('deleteNotifications', context.user.userId, 'Delete confirmation required');
    }

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return this.createErrorResult('deleteNotifications', context.user.userId, 'No notification IDs provided');
    }

    try {
      // Use the common user/created query pattern for deletions
      const query = CommonQueries.createUserCreatedQuery('Notification', context.user.userId);
      query.containedIn('objectId', notificationIds as string[]);

      const notifications = await query.find();

      if (notifications.length === 0) {
        return this.createErrorResult('deleteNotifications', context.user.userId, 'No accessible notifications found');
      }

      // Use batch destroy utility
      const result = await ParseBatchUtils.batchDestroy(notifications);

      return this.createSuccessResult('deleteNotifications', context.user.userId, {
        deleted: result.destroyed.length,
        errors: result.errors.length,
        message: `Deleted ${result.destroyed.length} notifications`
      });

    } catch (error: any) {
      return this.createErrorResult('deleteNotifications', context.user.userId, error.message);
    }
  }

  /**
   * Create notification using Parse utilities
   */
  private async createNotification(params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> {
    const { type, title, message, priority = 'medium', recipientId, data } = params;

    try {
      // Create notification object
      const Notification = Parse.Object.extend('Notification');
      const notification = new Notification();

      // Set notification properties
      notification.set('type', type);
      notification.set('title', title);
      notification.set('message', message);
      notification.set('priority', priority);
      notification.set('status', 'unread');
      notification.set('organizationId', this.getOrganizationId(context));
      notification.set('createdBy', context.user.userId);

      if (recipientId) {
        notification.set('recipientId', recipientId);
      }

      if (data) {
        notification.set('data', data);
      }

      // Save using batch utility (even for single item for consistency)
      const result = await ParseBatchUtils.batchSave([notification]);

      if (result.errors.length > 0) {
        return this.createErrorResult('createNotification', context.user.userId, result.errors[0].error.message);
      }

      return this.createSuccessResult('createNotification', context.user.userId, {
        notification: result.saved[0].toJSON(),
        message: 'Notification created successfully'
      });

    } catch (error: any) {
      return this.createErrorResult('createNotification', context.user.userId, error.message);
    }
  }
}

// Export singleton instance
export const notificationsController = new NotificationsController();
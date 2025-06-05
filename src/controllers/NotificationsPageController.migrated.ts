import { BasePageController } from './base/BasePageController';
import {
  // Data Actions
  fetchNotificationsAction,
  getNotificationTypesAction,
  // Management Actions
  createNotificationAction,
  markAsReadAction,
  archiveNotificationsAction,
  deleteNotificationsAction
} from './notifications';

/**
 * Notifications Page Controller - Migrated Version
 * 
 * Manage system notifications, alerts, and messaging using modular actions.
 * This controller has been migrated from a 547-line monolithic implementation
 * to use the BasePageController pattern with 6 focused action modules.
 * 
 * Features:
 * - Notification CRUD operations (fetch, create, mark as read, archive, delete)
 * - User and organization-scoped notifications
 * - Priority-based filtering (low, medium, high, urgent)
 * - Status management (unread, read, archived)
 * - Type-based categorization (system, security, alerts, etc.)
 * - Permission-based access control
 * - Real-time notification counts
 * 
 * Migration Benefits:
 * - ~90% code reduction in main controller (547 → ~55 lines)
 * - 6 focused, testable action modules
 * - Improved maintainability and reusability
 * - 100% API compatibility maintained
 */
export class NotificationsPageController extends BasePageController {
  constructor() {
    super({
      pageId: 'notifications',
      pageName: 'Notifications',
      description: 'Manage system notifications, alerts, and messaging',
      category: 'communication',
      tags: ['notifications', 'alerts', 'messaging', 'communication'],
      permissions: ['notifications:read', 'notifications:write', 'notifications:manage'],
      version: '2.0.0'
    });
  }

  protected initializeActions(): void {
    // Data Actions (2 actions)
    this.registerActionDefinition(fetchNotificationsAction);
    this.registerActionDefinition(getNotificationTypesAction);

    // Management Actions (4 actions)
    this.registerActionDefinition(createNotificationAction);
    this.registerActionDefinition(markAsReadAction);
    this.registerActionDefinition(archiveNotificationsAction);
    this.registerActionDefinition(deleteNotificationsAction);
  }
}

// Export singleton instance
export const notificationsPageController = new NotificationsPageController();
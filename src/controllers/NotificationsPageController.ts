import { NotificationsBaseController } from './notifications/NotificationsBaseController';
import { getFetchNotificationsAction, getNotificationTypesAction, getNotificationStatsAction } from './notifications/actions/NotificationActions';
import { 
  getMarkAsReadAction, 
  getMarkAllAsReadAction, 
  getArchiveNotificationAction, 
  getDeleteNotificationAction, 
  getBulkArchiveAction, 
  getClearArchivedAction 
} from './notifications/actions/ManagementActions';

/**
 * Notifications Page Controller
 * Extends NotificationsBaseController and registers all notification-related actions
 * Follows PAGES.md standards with proper action registration pattern
 */
export class NotificationsPageController extends NotificationsBaseController {
  constructor() {
    super();
  }

  /**
   * Initialize all notification actions (required by BasePageController)
   */
  protected initializeActions(): void {
    this.registerNotificationActions();
  }

  /**
   * Register all notification-related actions
   */
  private registerNotificationActions(): void {
    // Core notification data actions
    const fetchNotificationsAction = getFetchNotificationsAction();
    this.registerAction(fetchNotificationsAction.config, fetchNotificationsAction.executor);

    const notificationTypesAction = getNotificationTypesAction();
    this.registerAction(notificationTypesAction.config, notificationTypesAction.executor);

    const notificationStatsAction = getNotificationStatsAction();
    this.registerAction(notificationStatsAction.config, notificationStatsAction.executor);

    // Notification management actions
    const markAsReadAction = getMarkAsReadAction();
    this.registerAction(markAsReadAction.config, markAsReadAction.executor);

    const markAllAsReadAction = getMarkAllAsReadAction();
    this.registerAction(markAllAsReadAction.config, markAllAsReadAction.executor);

    const archiveNotificationAction = getArchiveNotificationAction();
    this.registerAction(archiveNotificationAction.config, archiveNotificationAction.executor);

    const deleteNotificationAction = getDeleteNotificationAction();
    this.registerAction(deleteNotificationAction.config, deleteNotificationAction.executor);

    const bulkArchiveAction = getBulkArchiveAction();
    this.registerAction(bulkArchiveAction.config, bulkArchiveAction.executor);

    const clearArchivedAction = getClearArchivedAction();
    this.registerAction(clearArchivedAction.config, clearArchivedAction.executor);
  }
}

// Export singleton instance
export const notificationsPageController = new NotificationsPageController();
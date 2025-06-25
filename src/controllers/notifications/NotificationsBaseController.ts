import { BasePageController, PageControllerConfig } from '../base/BasePageController';

/**
 * Base controller class for Notifications functionality
 * Extends the standardized BasePageController for consistency
 */
export abstract class NotificationsBaseController extends BasePageController {
  constructor() {
    const config: PageControllerConfig = {
      pageId: 'notifications',
      pageName: 'Notifications',
      description: 'Manage system notifications, alerts, and messaging',
      category: 'communication',
      tags: ['notifications', 'alerts', 'messaging', 'communication', 'system'],
      permissions: ['notifications:read', 'notifications:write', 'notifications:manage'],
      version: '2.0.0'
    };
    
    super(config);
  }
}
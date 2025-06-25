import { BasePageController, PageControllerConfig } from '../base/BasePageController';

/**
 * Base controller for Audit Logs page
 * Extends BasePageController to provide standardized functionality
 * with audit logs-specific configuration
 */
export abstract class AuditLogsBaseController extends BasePageController {
  constructor() {
    const config: PageControllerConfig = {
      pageId: 'audit-logs',
      pageName: 'Audit Logs',
      description: 'View and manage system audit logs and activity tracking',
      category: 'security',
      permissions: ['audit:read', 'audit:export', 'security:read'],
      tags: ['audit', 'logs', 'security', 'tracking', 'compliance'],
      version: '1.0.0'
    };

    super(config);
  }

  /**
   * Abstract method that must be implemented by concrete controllers
   * to register their specific actions
   */
  protected abstract initializeActions(): void;
}
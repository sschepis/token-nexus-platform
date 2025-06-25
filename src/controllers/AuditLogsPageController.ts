import { AuditLogsBaseController } from './auditLogs/AuditLogsBaseController';
import { 
  getFetchAuditLogsAction, 
  getAuditStatisticsAction, 
  getAuditActionsAction 
} from './auditLogs/actions/AuditDataActions';
import { 
  getCreateAuditLogAction, 
  getExportAuditLogsAction, 
  getDeleteAuditLogAction, 
  getBulkExportAuditLogsAction 
} from './auditLogs/actions/AuditManagementActions';

/**
 * Audit Logs Page Controller
 * Extends AuditLogsBaseController and registers all audit log-related actions
 * Follows PAGES.md standards with proper action registration pattern
 */
export class AuditLogsPageController extends AuditLogsBaseController {
  constructor() {
    super();
  }

  /**
   * Initialize all audit log actions (required by BasePageController)
   */
  protected initializeActions(): void {
    this.registerAuditLogActions();
  }

  /**
   * Register all audit log-related actions
   */
  private registerAuditLogActions(): void {
    // Core audit data actions
    const fetchAuditLogsAction = getFetchAuditLogsAction();
    this.registerAction(fetchAuditLogsAction.config, fetchAuditLogsAction.executor);

    const auditStatisticsAction = getAuditStatisticsAction();
    this.registerAction(auditStatisticsAction.config, auditStatisticsAction.executor);

    const auditActionsAction = getAuditActionsAction();
    this.registerAction(auditActionsAction.config, auditActionsAction.executor);

    // Audit management actions
    const createAuditLogAction = getCreateAuditLogAction();
    this.registerAction(createAuditLogAction.config, createAuditLogAction.executor);

    const exportAuditLogsAction = getExportAuditLogsAction();
    this.registerAction(exportAuditLogsAction.config, exportAuditLogsAction.executor);

    const deleteAuditLogAction = getDeleteAuditLogAction();
    this.registerAction(deleteAuditLogAction.config, deleteAuditLogAction.executor);

    const bulkExportAuditLogsAction = getBulkExportAuditLogsAction();
    this.registerAction(bulkExportAuditLogsAction.config, bulkExportAuditLogsAction.executor);
  }
}

// Export singleton instance
export const auditLogsPageController = new AuditLogsPageController();
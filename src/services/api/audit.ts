import { callCloudFunction, callCloudFunctionForArray } from '../../utils/apiUtils';
import { AuditEvent } from '../../store/slices/auditSlice';

/**
 * Refactored audit API using the new utility functions
 * This eliminates all the repetitive error handling and Parse.Cloud.run patterns
 */

export interface AuditLogFilters {
  startDate?: string;
  endDate?: string;
  actions?: string[];
  userIds?: string[];
  resourceType?: string;
  severity?: string | string[];
  limit?: number;
  skip?: number;
}

export interface MetricsParams {
  timeRange?: string;
  startDate?: string;
  endDate?: string;
  organizationId?: string;
}

export interface ExportParams {
  format: 'csv' | 'json' | 'pdf';
  filters?: {
    startDate?: string;
    endDate?: string;
    actions?: string[];
    userIds?: string[];
    resourceType?: string;
  };
  maxRecords?: number;
}

export interface UserRoleMetricsParams {
  organizationId?: string;
}

export const auditApi = {
  /**
   * Fetches audit logs based on various filters
   */
  async getAuditLogs(params: AuditLogFilters = {}) {
    return callCloudFunction('getAuditLogs', params as Record<string, unknown>, {
      errorMessage: 'Failed to fetch audit logs'
    });
  },

  /**
   * Deletes a specific audit log entry
   */
  async deleteAuditLog(auditLogId: string, reason: string) {
    return callCloudFunction('deleteAuditLog', { auditLogId, reason }, {
      errorMessage: 'Failed to delete audit log'
    });
  },

  /**
   * Performs a bulk deletion of audit logs
   */
  async bulkDeleteAuditLogs(auditLogIds: string[], reason: string, confirmationCode: string) {
    return callCloudFunction('bulkDeleteAuditLogs', { auditLogIds, reason, confirmationCode }, {
      errorMessage: 'Failed to bulk delete audit logs'
    });
  },

  /**
   * Exports audit logs in a specified format
   */
  async exportAuditLogs(params: ExportParams) {
    return callCloudFunction('exportAuditLogs', params as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to export audit logs'
    });
  },

  /**
   * Retrieves statistics related to audit log exports
   */
  async getExportStatistics() {
    return callCloudFunction('getExportStatistics', {}, {
      errorMessage: 'Failed to fetch export statistics'
    });
  },

  /**
   * Fetches token activity metrics based on time range and organization
   */
  async fetchTokenActivityMetrics(params: MetricsParams) {
    return callCloudFunctionForArray('fetchTokenActivityMetrics', params as Record<string, unknown>, {
      errorMessage: 'Failed to fetch token activity metrics'
    });
  },

  /**
   * Fetches user activity metrics based on time range and organization
   */
  async fetchUserActivityMetrics(params: MetricsParams) {
    return callCloudFunctionForArray('fetchUserActivityMetrics', params as Record<string, unknown>, {
      errorMessage: 'Failed to fetch user activity metrics'
    });
  },

  /**
   * Fetches transaction type metrics
   */
  async fetchTransactionTypeMetrics(params: MetricsParams) {
    return callCloudFunctionForArray('fetchTransactionTypeMetrics', params as Record<string, unknown>, {
      errorMessage: 'Failed to fetch transaction type metrics'
    });
  },

  /**
   * Fetches user role metrics
   */
  async fetchUserRoleMetrics(params: UserRoleMetricsParams) {
    return callCloudFunctionForArray('fetchUserRoleMetrics', params as Record<string, unknown>, {
      errorMessage: 'Failed to fetch user role metrics'
    });
  },

  /**
   * Fetches API usage metrics based on time range and organization
   */
  async fetchAPIMetrics(params: MetricsParams) {
    return callCloudFunctionForArray('fetchAPIMetrics', params as Record<string, unknown>, {
      errorMessage: 'Failed to fetch API metrics'
    });
  },

  /**
   * Batch delete multiple audit logs with retry mechanism
   */
  async batchDeleteAuditLogs(deletions: Array<{ auditLogId: string; reason: string }>) {
    const operations = deletions.map(({ auditLogId, reason }) => 
      () => this.deleteAuditLog(auditLogId, reason)
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  }
};

// Default export
export default auditApi;
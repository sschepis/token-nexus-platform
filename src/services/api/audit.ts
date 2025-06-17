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

// Mock data for development/testing
const mockAuditApis = {
  getAuditLogs: (filters?: AuditLogFilters) => {
    const auditEvents: AuditEvent[] = [
      {
        id: "audit-1",
        eventType: "user_activity",
        description: "User login successful",
        userId: "user-123",
        userEmail: "john.doe@example.com",
        createdAt: new Date().toISOString(),
        severity: "low",
        ipAddress: "192.168.1.1",
      },
      {
        id: "audit-2",
        eventType: "security",
        description: "Failed login attempt",
        userId: "unknown",
        userEmail: "anonymous@example.com",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        severity: "medium",
        ipAddress: "203.0.113.1",
      },
      {
        id: "audit-3",
        eventType: "token_usage",
        description: "API token used for access",
        userId: "user-456",
        userEmail: "jane.smith@example.com",
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        severity: "low",
        metadata: { tokenId: "token-123", endpoint: "/api/data", method: "GET" },
      },
      {
        id: "audit-4",
        eventType: "admin_action",
        description: "User role updated",
        userId: "user-123",
        userEmail: "john.doe@example.com",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        severity: "medium",
        metadata: { action: "role_update", targetUser: "user-789", newRole: "developer" },
      },
      {
        id: "audit-5",
        eventType: "security",
        description: "Password changed",
        userId: "user-456",
        userEmail: "jane.smith@example.com",
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        severity: "medium",
        ipAddress: "198.51.100.1",
      },
      {
        id: "audit-6",
        eventType: "admin_action",
        description: "New user invited",
        userId: "user-123",
        userEmail: "john.doe@example.com",
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        severity: "low",
        metadata: { invitedUser: "mike.johnson@example.com" },
      },
    ];

    let filteredEvents = auditEvents;

    if (filters) {
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        filteredEvents = filteredEvents.filter(e => new Date(e.createdAt) >= start);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        filteredEvents = filteredEvents.filter(e => new Date(e.createdAt) <= end);
      }
      if (filters.actions && filters.actions.length > 0) {
        filteredEvents = filteredEvents.filter(e => filters.actions!.includes(e.eventType));
      }
      if (filters.severity && filters.severity.length > 0) {
        const severities = Array.isArray(filters.severity) ? filters.severity : [filters.severity];
        filteredEvents = filteredEvents.filter(e => severities.includes(e.severity));
      }
    }

    return Promise.resolve({
      success: true,
      data: {
        auditLogs: filteredEvents,
        totalCount: filteredEvents.length,
        hasMore: false,
      }
    });
  },

  deleteAuditLog: (auditLogId: string, reason: string) => {
    return Promise.resolve({
      success: true,
      data: { success: true, deletedAuditLog: { id: auditLogId, reason } }
    });
  },

  bulkDeleteAuditLogs: (auditLogIds: string[], reason: string, confirmationCode: string) => {
    return Promise.resolve({
      success: true,
      data: { success: true, results: auditLogIds.map(id => ({ id, status: 'deleted' })) }
    });
  },

  exportAuditLogs: (params: ExportParams) => {
    return Promise.resolve({
      success: true,
      data: { data: 'mock_export_data', metadata: { format: params.format, count: 10 } }
    });
  },

  getExportStatistics: () => {
    return Promise.resolve({
      success: true,
      data: { statistics: { totalExports: 5, lastExport: new Date().toISOString() } }
    });
  },

  fetchTokenActivityMetrics: (params: MetricsParams) => {
    return Promise.resolve({
      success: true,
      data: [
        { date: '2024-01-01', count: 10, value: 1000 },
        { date: '2024-01-02', count: 15, value: 1500 }
      ]
    });
  },

  fetchUserActivityMetrics: (params: MetricsParams) => {
    return Promise.resolve({
      success: true,
      data: [
        { date: '2024-01-01', activeUsers: 25, newUsers: 5 },
        { date: '2024-01-02', activeUsers: 30, newUsers: 3 }
      ]
    });
  },

  fetchTransactionTypeMetrics: (params: MetricsParams) => {
    return Promise.resolve({
      success: true,
      data: [
        { type: 'transfer', count: 100 },
        { type: 'mint', count: 50 },
        { type: 'burn', count: 25 }
      ]
    });
  },

  fetchUserRoleMetrics: (params: UserRoleMetricsParams) => {
    return Promise.resolve({
      success: true,
      data: [
        { role: 'admin', count: 5 },
        { role: 'developer', count: 15 },
        { role: 'user', count: 100 }
      ]
    });
  },

  fetchAPIMetrics: (params: MetricsParams) => {
    return Promise.resolve({
      success: true,
      data: [
        { endpoint: '/api/tokens', calls: 1000, errors: 10 },
        { endpoint: '/api/users', calls: 500, errors: 5 }
      ]
    });
  },

  batchDeleteAuditLogs: (deletions: Array<{ auditLogId: string; reason: string }>) => {
    return Promise.resolve({
      results: deletions.map(() => ({ success: true })),
      successCount: deletions.length,
      errorCount: 0
    });
  }
};

// Export individual functions for backward compatibility
export const {
  getAuditLogs,
  deleteAuditLog,
  bulkDeleteAuditLogs,
  exportAuditLogs,
  getExportStatistics,
  fetchTokenActivityMetrics,
  fetchUserActivityMetrics,
  fetchTransactionTypeMetrics,
  fetchUserRoleMetrics,
  fetchAPIMetrics,
  batchDeleteAuditLogs
} = auditApi;

// Use mock or real API based on environment
const finalAuditApi = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' ? mockAuditApis : auditApi;

// Default export
export default finalAuditApi;
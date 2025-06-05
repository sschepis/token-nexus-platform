/* eslint-disable @typescript-eslint/no-explicit-any */
import Parse from 'parse';
import { apiService, mockResponse } from './base';
import { AuditEvent } from '../../store/slices/auditSlice';

/**
 * @file Audit API services.
 * Handles operations related to audit logs via Parse Cloud Functions.
 */
const auditApi = {
  /**
   * Fetches audit logs based on various filters.
   * @param {object} [params] - Optional parameters for filtering and pagination.
   * @param {string} [params.startDate] - Start date for logs (ISO string).
   * @param {string} [params.endDate] - End date for logs (ISO string).
   * @param {string[]} [params.actions] - Filter by specific action types.
   * @param {string[]} [params.userIds] - Filter by user IDs.
   * @param {string} [params.resourceType] - Filter by resource type affected (e.g., 'Token', 'User').
   * @param {string | string[]} [params.severity] - Filter by severity level ('low', 'medium', 'high', 'critical').
   * @param {number} [params.limit] - Maximum number of logs to return.
   * @param {number} [params.skip] - Number of logs to skip for pagination.
   * @returns {Promise<{ data: { auditLogs: any[]; totalCount: number; hasMore: boolean } }>} A promise that resolves with audit logs, total count, and hasMore flag.
   * @throws {Error} Throws an error if fetching audit logs fails.
   */
  getAuditLogs: async (params?: {
    startDate?: string;
    endDate?: string;
    actions?: string[];
    userIds?: string[];
    resourceType?: string;
    severity?: string | string[];
    limit?: number;
    skip?: number;
  }): Promise<{ data: { auditLogs: any[]; totalCount: number; hasMore: boolean } }> => {
    try {
      const result = await Parse.Cloud.run('getAuditLogs', params || {});
      
      return {
        data: {
          auditLogs: result.auditLogs || [],
          totalCount: result.totalCount || 0,
          hasMore: result.hasMore || false
        }
      };
    } catch (error: any) {
      console.debug('[Audit API] Error calling getAuditLogs cloud function:', error);
      throw new Error(error.message || 'Failed to fetch audit logs');
    }
  },

  /**
   * Deletes a specific audit log entry.
   * @param {string} auditLogId - The ID of the audit log to delete.
   * @param {string} reason - The reason for deleting the audit log.
   * @returns {Promise<{ data: { success: boolean; deletedAuditLog: any } }>} A promise that resolves with success status and the deleted log.
   * @throws {Error} Throws an error if deleting the audit log fails.
   */
  deleteAuditLog: async (auditLogId: string, reason: string): Promise<{ data: { success: boolean; deletedAuditLog: any } }> => {
    try {
      const result = await Parse.Cloud.run('deleteAuditLog', { auditLogId, reason });
      
      return {
        data: {
          success: result.success,
          deletedAuditLog: result.deletedAuditLog
        }
      };
    } catch (error: any) {
      console.debug('[Audit API] Error calling deleteAuditLog cloud function:', error);
      throw new Error(error.message || 'Failed to delete audit log');
    }
  },

  /**
   * Performs a bulk deletion of audit logs.
   * @param {string[]} auditLogIds - An array of audit log IDs to delete.
   * @param {string} reason - The reason for the bulk deletion.
   * @param {string} confirmationCode - A confirmation code to authorize the bulk deletion.
   * @returns {Promise<{ data: { success: boolean; results: any } }>} A promise that resolves with success status and deletion results.
   * @throws {Error} Throws an error if bulk deleting audit logs fails.
   */
  bulkDeleteAuditLogs: async (auditLogIds: string[], reason: string, confirmationCode: string): Promise<{ data: { success: boolean; results: any } }> => {
    try {
      const result = await Parse.Cloud.run('bulkDeleteAuditLogs', { auditLogIds, reason, confirmationCode });
      
      return {
        data: {
          success: result.success,
          results: result.results
        }
      };
    } catch (error: any) {
      console.debug('[Audit API] Error calling bulkDeleteAuditLogs cloud function:', error);
      throw new Error(error.message || 'Failed to bulk delete audit logs');
    }
  },

  /**
   * Exports audit logs in a specified format.
   * @param {object} params - Parameters for the export operation.
   * @param {'csv' | 'json' | 'pdf'} params.format - The desired export format.
   * @param {object} [params.filters] - Optional filters to apply before exporting.
   * @param {string} [params.filters.startDate] - Start date for logs (ISO string).
   * @param {string} [params.filters.endDate] - End date for logs (ISO string).
   * @param {string[]} [params.filters.actions] - Filter by specific action types.
   * @param {string[]} [params.filters.userIds] - Filter by user IDs.
   * @param {string} [params.filters.resourceType] - Filter by resource type.
   * @param {number} [params.maxRecords] - Maximum number of records to export.
   * @returns {Promise<{ data: { data: any; metadata: any } }>} A promise that resolves with the exported data and metadata.
   * @throws {Error} Throws an error if exporting audit logs fails.
   */
  exportAuditLogs: async (params: {
    format: 'csv' | 'json' | 'pdf';
    filters?: {
      startDate?: string;
      endDate?: string;
      actions?: string[];
      userIds?: string[];
      resourceType?: string;
    };
    maxRecords?: number;
  }): Promise<{ data: { data: any; metadata: any } }> => {
    try {
      const result = await Parse.Cloud.run('exportAuditLogs', params);
      
      return {
        data: {
          data: result.data,
          metadata: result.metadata
        }
      };
    } catch (error: any) {
      console.debug('[Audit API] Error calling exportAuditLogs cloud function:', error);
      throw new Error(error.message || 'Failed to export audit logs');
    }
  },

  /**
   * Retrieves statistics related to audit log exports.
   * @returns {Promise<{ data: { statistics: any } }>} A promise that resolves with export statistics.
   * @throws {Error} Throws an error if fetching export statistics fails.
   */
  getExportStatistics: async (): Promise<{ data: { statistics: any } }> => {
    try {
      const result = await Parse.Cloud.run('getExportStatistics');
      
      return {
        data: {
          statistics: result.statistics
        }
      };
    } catch (error: any) {
      console.debug('[Audit API] Error calling getExportStatistics cloud function:', error);
      throw new Error(error.message || 'Failed to fetch export statistics');
    }
  },

  /**
   * Fetches token activity metrics based on time range and organization.
   * @param {object} params - Parameters for fetching metrics.
   * @param {string} [params.timeRange] - Predefined time range (e.g., '7d', '30d').
   * @param {string} [params.startDate] - Custom start date (ISO string).
   * @param {string} [params.endDate] - Custom end date (ISO string).
   * @param {string} [params.organizationId] - Optional: Filter by organization ID.
   * @returns {Promise<{ data: any[] }>} A promise that resolves with an array of token activity data.
   * @throws {Error} Throws an error if fetching metrics fails.
   */
  fetchTokenActivityMetrics: async (params: {
    timeRange?: string;
    startDate?: string;
    endDate?: string;
    organizationId?: string;
  }): Promise<{ data: any[] }> => {
    try {
      const result = await Parse.Cloud.run('fetchTokenActivityMetrics', params);
      return { data: result.data || [] };
    } catch (error: any) {
      console.debug('[Audit API] Error calling fetchTokenActivityMetrics cloud function:', error);
      throw new Error(error.message || 'Failed to fetch token activity metrics');
    }
  },

  /**
   * Fetches user activity metrics based on time range and organization.
   * @param {object} params - Parameters for fetching user activity metrics.
   * @param {string} [params.timeRange] - Predefined time range (e.g., '7d', '30d').
   * @param {string} [params.startDate] - Custom start date (ISO string).
   * @param {string} [params.endDate] - Custom end date (ISO string).
   * @param {string} [params.organizationId] - Optional: Filter by organization ID.
   * @returns {Promise<{ data: any[] }>} A promise that resolves with an array of user activity data.
   * @throws {Error} Throws an error if fetching user activity metrics fails.
   */
  fetchUserActivityMetrics: async (params: {
    timeRange?: string;
    startDate?: string;
    endDate?: string;
    organizationId?: string;
  }): Promise<{ data: any[] }> => {
    try {
      const result = await Parse.Cloud.run('fetchUserActivityMetrics', params);
      return { data: result.data || [] };
    } catch (error: any) {
      console.debug('[Audit API] Error calling fetchUserActivityMetrics cloud function:', error);
      throw new Error(error.message || 'Failed to fetch user activity metrics');
    }
  },

  /**
   * Fetches transaction type metrics.
   * @param {object} params - Parameters for fetching transaction type metrics.
   * @param {string} [params.timeRange] - Predefined time range (e.g., '7d', '30d').
   * @param {string} [params.startDate] - Custom start date (ISO string).
   * @param {string} [params.endDate] - Custom end date (ISO string).
   * @param {string} [params.organizationId] - Optional: Filter by organization ID.
   * @returns {Promise<{ data: any[] }>} A promise that resolves with an array of transaction type data.
   * @throws {Error} Throws an error if fetching transaction type metrics fails.
   */
  fetchTransactionTypeMetrics: async (params: {
    timeRange?: string;
    startDate?: string;
    endDate?: string;
    organizationId?: string;
  }): Promise<{ data: any[] }> => {
    try {
      const result = await Parse.Cloud.run('fetchTransactionTypeMetrics', params);
      return { data: result.data || [] };
    } catch (error: any) {
      console.debug('[Audit API] Error calling fetchTransactionTypeMetrics cloud function:', error);
      throw new Error(error.message || 'Failed to fetch transaction type metrics');
    }
  },

  /**
   * Fetches user role metrics.
   * @param {object} params - Parameters for fetching user role metrics.
   * @param {string} [params.organizationId] - Optional: Filter by organization ID.
   * @returns {Promise<{ data: any[] }>} A promise that resolves with an array of user role data.
   * @throws {Error} Throws an error if fetching user role metrics fails.
   */
  fetchUserRoleMetrics: async (params: {
    organizationId?: string;
  }): Promise<{ data: any[] }> => {
    try {
      const result = await Parse.Cloud.run('fetchUserRoleMetrics', params);
      return { data: result.data || [] };
    } catch (error: any) {
      console.debug('[Audit API] Error calling fetchUserRoleMetrics cloud function:', error);
      throw new Error(error.message || 'Failed to fetch user role metrics');
    }
  },

  /**
   * Fetches API usage metrics based on time range and organization.
   * @param {object} params - Parameters for fetching API usage metrics.
   * @param {string} [params.timeRange] - Predefined time range (e.g., '7d', '30d').
   * @param {string} [params.startDate] - Custom start date (ISO string).
   * @param {string} [params.endDate] - Custom end date (ISO string).
   * @param {string} [params.organizationId] - Optional: Filter by organization ID.
   * @returns {Promise<{ data: any[] }>} A promise that resolves with an array of API usage data.
   * @throws {Error} Throws an error if fetching API usage metrics fails.
   */
  fetchAPIMetrics: async (params: {
    timeRange?: string;
    startDate?: string;
    endDate?: string;
    organizationId?: string;
  }): Promise<{ data: any[] }> => {
    try {
      const result = await Parse.Cloud.run('fetchAPIMetrics', params);
      return { data: result.data || [] };
    } catch (error: any) {
      console.debug('[Audit API] Error calling fetchAPIMetrics cloud function:', error);
      throw new Error(error.message || 'Failed to fetch API metrics');
    }
  },
};

const mockAuditApis = {
  getAuditLogs: (filters?: any) => {
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
        filteredEvents = filteredEvents.filter(e => filters.actions.includes(e.eventType));
      }
      if (filters.severity && filters.severity.length > 0) {
        const severities = Array.isArray(filters.severity) ? filters.severity : [filters.severity];
        filteredEvents = filteredEvents.filter(e => severities.includes(e.severity));
      }
      // Implement other filters as needed for userId, resourceType etc.
    }

    return mockResponse({
      auditLogs: filteredEvents,
      totalCount: filteredEvents.length,
      hasMore: false,
    });
  },

  deleteAuditLog: (auditLogId: string, reason: string) => {
    return mockResponse({ success: true, deletedAuditLog: { id: auditLogId, reason } });
  },

  bulkDeleteAuditLogs: (auditLogIds: string[], reason: string, confirmationCode: string) => {
    return mockResponse({ success: true, results: auditLogIds.map(id => ({ id, status: 'deleted' })) });
  },

  exportAuditLogs: (params: any) => {
    return mockResponse({ data: 'mock_export_data', metadata: { format: params.format, count: 10 } });
  },

  getExportStatistics: () => {
    return mockResponse({ statistics: { totalExports: 5, lastExport: new Date().toISOString() } });
  },
};

// Merge Audit APIs into the global apiService
Object.assign(apiService, process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' ? mockAuditApis : auditApi);
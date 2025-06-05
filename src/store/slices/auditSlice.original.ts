import { createCRUDSlice } from '../utils/createCRUDSlice';
import { apiService } from '../../services/api';
import { createAsyncThunk } from '@reduxjs/toolkit';

export type AuditEventType = 'user_activity' | 'security' | 'token_usage' | 'admin_action' | 'organization_summary';
export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  description: string;
  userId: string;
  userEmail?: string;
  createdAt: string;
  severity: AuditSeverity;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export interface Report {
  id: string;
  type: string;
  title: string;
  createdAt: string;
  createdBy: string;
  status: 'generating' | 'completed' | 'failed';
  format: 'json' | 'csv' | 'pdf';
  data?: any;
  fileUrl?: string;
}

export interface CreateAuditEventParams {
  eventType: AuditEventType;
  description: string;
  severity?: AuditSeverity;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export interface UpdateAuditEventParams {
  description?: string;
  severity?: AuditSeverity;
  metadata?: Record<string, any>;
}

// Custom API adapter for audit events
const auditApiAdapter = {
  getAll: (params?: any) => apiService.getAuditLogs(params),
  getById: (id: string) => {
    // Audit events don't typically have a getById, so we'll simulate it
    return apiService.getAuditLogs({ auditLogId: id }).then(response => ({
      data: {
        auditEvent: response.data.auditLogs?.[0] || null
      }
    }));
  },
  create: (params: CreateAuditEventParams) => {
    // Audit events are typically created by the system, not by users
    throw new Error('Creating audit events directly is not supported');
  },
  update: (id: string, params: UpdateAuditEventParams) => {
    // Audit events are typically immutable
    throw new Error('Updating audit events is not supported');
  },
  delete: (id: string) => apiService.deleteAuditLog(id, 'Manual deletion'),
};

// Create the CRUD slice using our factory
const auditCRUD = createCRUDSlice<AuditEvent, CreateAuditEventParams, UpdateAuditEventParams>({
  name: 'audit',
  apiService: auditApiAdapter,
  initialState: {
    reports: [] as Report[],
    metrics: null as any,
    isLoadingMetrics: false,
    isLoadingReports: false,
    isGeneratingReport: false,
    isExporting: false,
    reportError: null as string | null,
    exportError: null as string | null,
    metricsError: null as string | null,
    filters: {
      eventType: null as AuditEventType[] | null,
      severity: null as AuditSeverity[] | null,
      dateRange: {
        start: null as string | null,
        end: null as string | null,
      },
      userId: null as string | null,
    },
  },
  responseMapping: {
    items: 'auditLogs',
    item: 'auditEvent',
    totalCount: 'totalCount',
    hasMore: 'hasMore',
  },
  errorMessages: {
    fetch: 'Failed to fetch audit logs',
    create: 'Failed to create audit event',
    update: 'Failed to update audit event',
    delete: 'Failed to delete audit log',
    getById: 'Failed to fetch audit event details',
  },
});

// Export the slice
export const auditSlice = auditCRUD.slice;

// Export actions with backward-compatible names
export const fetchAuditLogs = auditCRUD.actions.fetchItems;
export const deleteAuditLog = auditCRUD.actions.deleteItem;

// Export standard CRUD actions
export const {
  clearError: clearErrors,
  setFilters,
  resetFilters,
  clearSelectedItem,
} = auditCRUD.actions;

// Create custom thunks for audit-specific operations
export const generateReport = createAsyncThunk(
  'audit/generateReport',
  async (params: {
    type: 'user_activity' | 'token_usage' | 'security_events' | 'organization_summary';
    startDate?: string;
    endDate?: string;
    filters?: any;
    format?: 'json' | 'csv' | 'pdf';
  }) => {
    // This would need to be implemented in the API service
    throw new Error('Report generation not yet implemented');
  }
);

export const fetchReports = createAsyncThunk(
  'audit/fetchReports',
  async (params?: {
    type?: string;
    limit?: number;
    skip?: number;
  }) => {
    // This would need to be implemented in the API service
    throw new Error('Report fetching not yet implemented');
  }
);

export const exportAuditLogs = createAsyncThunk(
  'audit/exportAuditLogs',
  async (params: {
    format: 'csv' | 'json' | 'pdf';
    filters?: {
      startDate?: string;
      endDate?: string;
      actions?: string[];
      userIds?: string[];
      resourceType?: string;
    };
    maxRecords?: number;
  }) => {
    const response = await apiService.exportAuditLogs(params);
    return response.data;
  }
);

export const fetchMetrics = createAsyncThunk(
  'audit/fetchMetrics',
  async (params: {
    timeRange?: string;
    startDate?: string;
    endDate?: string;
    organizationId?: string;
  }) => {
    // Fetch all metrics data concurrently
    const [
      tokenActivityRes,
      userActivityRes,
      transactionsByTypeRes,
      usersByRoleRes,
      apiUsageRes
    ] = await Promise.all([
      apiService.fetchTokenActivityMetrics(params),
      apiService.fetchUserActivityMetrics(params),
      apiService.fetchTransactionTypeMetrics(params),
      apiService.fetchUserRoleMetrics(params),
      apiService.fetchAPIMetrics(params)
    ]);

    return {
      tokenActivityData: tokenActivityRes.data || [],
      userActivityData: userActivityRes.data || [],
      transactionsByTypeData: transactionsByTypeRes.data || [],
      usersByRoleData: usersByRoleRes.data || [],
      apiUsageData: apiUsageRes.data || [],
    };
  }
);

// Export selectors with audit-specific names
export const auditSelectors = {
  selectEvents: auditCRUD.selectors.selectItems,
  selectSelectedEvent: auditCRUD.selectors.selectSelectedItem,
  selectIsLoading: auditCRUD.selectors.selectIsLoading,
  selectIsCreating: auditCRUD.selectors.selectIsCreating,
  selectIsUpdating: auditCRUD.selectors.selectIsUpdating,
  selectIsDeleting: auditCRUD.selectors.selectIsDeleting,
  selectAuditError: auditCRUD.selectors.selectError,
  selectTotalCount: auditCRUD.selectors.selectTotalCount,
  selectHasMore: auditCRUD.selectors.selectHasMore,
  selectFilters: auditCRUD.selectors.selectFilters,
  // Custom selectors
  selectReports: (state: any) => state.audit.reports,
  selectMetrics: (state: any) => state.audit.metrics,
  selectIsLoadingMetrics: (state: any) => state.audit.isLoadingMetrics,
  selectIsLoadingReports: (state: any) => state.audit.isLoadingReports,
  selectIsGeneratingReport: (state: any) => state.audit.isGeneratingReport,
  selectIsExporting: (state: any) => state.audit.isExporting,
  selectReportError: (state: any) => state.audit.reportError,
  selectExportError: (state: any) => state.audit.exportError,
  selectMetricsError: (state: any) => state.audit.metricsError,
};

// Simple action creators for backward compatibility
export const setEventTypeFilter = auditSlice.actions.setFilters;
export const setSeverityFilter = auditSlice.actions.setFilters;
export const setDateRangeFilter = auditSlice.actions.setFilters;
export const setUserFilter = auditSlice.actions.setFilters;

export default auditSlice.reducer;

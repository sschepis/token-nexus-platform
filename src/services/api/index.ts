// This file re-exports all API services
export * from './base';
export * from './auth';
export * from './tokens';
export * from './notifications';

// Export audit with explicit re-exports to avoid conflicts
export {
  auditApi,
  type AuditLogFilters,
  type MetricsParams as AuditMetricsParams,
  type ExportParams,
  type UserRoleMetricsParams
} from './audit';

export * from './reports';
export * from './integrations';
export * from './webhooks';
export * from './oauthApps';
export * from './apiKeys';

// Export dashboard with explicit re-exports to avoid conflicts
export {
  dashboardApi,
  type DashboardLayout,
  type SaveDashboardParams,
  type DashboardLayoutData,
  type SaveDashboardResponse,
  type ChartDataParams,
  type MetricsParams as DashboardMetricsParams,
  type ActivityParams
} from './dashboard';

export * from './aiAssistant';
export * from './aiDesignAssistant'; // Added AI design assistant export
export * from './appMarketplace';
export * from './pageBuilder'; // Added new export
export * from './componentLibrary'; // Added component library export
export * from './workflows';
export * from './objectManager';
export * from './security'; // Added security API export
export * from './communication'; // Added communication API export
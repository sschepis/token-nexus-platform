import { PageContext } from '../../types/ActionTypes';

export interface AuditLogsPageContext extends PageContext {
  state: {};
  props: {};
  metadata: {
    category: string;
    tags: string[];
    permissions: string[];
  };
}

export interface FetchAuditLogsParams {
  startDate?: string;
  endDate?: string;
  userId?: string;
  action?: string;
  resource?: string;
  severity?: string;
  limit?: number;
  skip?: number;
}

export interface CreateAuditLogParams {
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  severity?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ExportAuditLogsParams {
  format: string;
  startDate?: string;
  endDate?: string;
  filters?: Record<string, unknown>;
}

export interface AuditStatisticsParams {
  period?: string;
  groupBy?: string;
}
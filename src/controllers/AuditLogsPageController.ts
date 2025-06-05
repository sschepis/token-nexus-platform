import {
  PageController,
  ActionDefinition,
  ActionContext,
  ActionResult,
  PageContext
} from './types/ActionTypes';

export class AuditLogsPageController implements PageController {
  pageId = 'audit-logs';
  pageName = 'Audit Logs';
  description = 'View and manage system audit logs and activity tracking';
  actions = new Map<string, ActionDefinition>();
  context: PageContext = {
    pageId: 'audit-logs',
    pageName: 'Audit Logs',
    state: {},
    props: {},
    metadata: {
      category: 'security',
      tags: ['audit', 'logs', 'security', 'tracking', 'compliance'],
      permissions: ['audit:read', 'audit:export', 'security:read']
    }
  };
  metadata = {
    category: 'security',
    tags: ['audit', 'logs', 'security', 'tracking', 'compliance'],
    permissions: ['audit:read', 'audit:export', 'security:read'],
    version: '1.0.0'
  };
  isActive = true;
  registeredAt = new Date();

  constructor() {
    this.initializeActions();
  }

  private initializeActions(): void {
    // Fetch Audit Logs Action
    this.actions.set('fetchAuditLogs', {
      id: 'fetchAuditLogs',
      name: 'Fetch Audit Logs',
      description: 'Get audit logs with filtering and pagination',
      category: 'data',
      permissions: ['audit:read'],
      parameters: [
        { name: 'startDate', type: 'string', required: false, description: 'Start date for log filtering (ISO string)' },
        { name: 'endDate', type: 'string', required: false, description: 'End date for log filtering (ISO string)' },
        { name: 'userId', type: 'string', required: false, description: 'Filter by specific user ID' },
        { name: 'action', type: 'string', required: false, description: 'Filter by action type' },
        { name: 'resource', type: 'string', required: false, description: 'Filter by resource type' },
        { name: 'severity', type: 'string', required: false, description: 'Filter by severity level' },
        { name: 'limit', type: 'number', required: false, description: 'Number of logs to fetch' },
        { name: 'skip', type: 'number', required: false, description: 'Number of logs to skip for pagination' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { 
            startDate, 
            endDate, 
            userId, 
            action, 
            resource, 
            severity, 
            limit = 100, 
            skip = 0 
          } = params;
          const orgId = context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to fetch audit logs',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'fetchAuditLogs',
                userId: context.user.userId
              }
            };
          }

          const query = new Parse.Query('AuditLog');
          query.equalTo('organizationId', orgId);

          // Apply date filters
          if (startDate) {
            query.greaterThanOrEqualTo('createdAt', new Date(startDate as string));
          }

          if (endDate) {
            query.lessThanOrEqualTo('createdAt', new Date(endDate as string));
          }

          // Apply other filters
          if (userId) {
            query.equalTo('userId', userId);
          }

          if (action) {
            query.equalTo('action', action);
          }

          if (resource) {
            query.equalTo('resource', resource);
          }

          if (severity) {
            query.equalTo('severity', severity);
          }

          // Apply pagination and sorting
          query.descending('createdAt');
          query.limit(limit as number);
          query.skip(skip as number);

          const logs = await query.find();
          const logData = logs.map(log => log.toJSON());

          // Get total count for pagination
          const countQuery = new Parse.Query('AuditLog');
          countQuery.equalTo('organizationId', orgId);
          
          if (startDate) {
            countQuery.greaterThanOrEqualTo('createdAt', new Date(startDate as string));
          }
          if (endDate) {
            countQuery.lessThanOrEqualTo('createdAt', new Date(endDate as string));
          }
          if (userId) {
            countQuery.equalTo('userId', userId);
          }
          if (action) {
            countQuery.equalTo('action', action);
          }
          if (resource) {
            countQuery.equalTo('resource', resource);
          }
          if (severity) {
            countQuery.equalTo('severity', severity);
          }

          const totalCount = await countQuery.count();

          return {
            success: true,
            data: { 
              logs: logData,
              totalCount,
              currentPage: Math.floor((skip as number) / (limit as number)) + 1,
              totalPages: Math.ceil(totalCount / (limit as number)),
              hasMore: (skip as number) + logData.length < totalCount
            },
            message: `Found ${logData.length} audit logs`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'fetchAuditLogs',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch audit logs',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'fetchAuditLogs',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Create Audit Log Action
    this.actions.set('createAuditLog', {
      id: 'createAuditLog',
      name: 'Create Audit Log',
      description: 'Create a new audit log entry',
      category: 'data',
      permissions: ['audit:write'],
      parameters: [
        { name: 'action', type: 'string', required: true, description: 'Action performed' },
        { name: 'resource', type: 'string', required: true, description: 'Resource affected' },
        { name: 'resourceId', type: 'string', required: false, description: 'ID of the affected resource' },
        { name: 'details', type: 'object', required: false, description: 'Additional details about the action' },
        { name: 'severity', type: 'string', required: false, description: 'Severity level (info, warning, error, critical)' },
        { name: 'ipAddress', type: 'string', required: false, description: 'IP address of the user' },
        { name: 'userAgent', type: 'string', required: false, description: 'User agent string' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { 
            action, 
            resource, 
            resourceId, 
            details = {}, 
            severity = 'info',
            ipAddress,
            userAgent
          } = params;
          const orgId = context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to create audit log',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'createAuditLog',
                userId: context.user.userId
              }
            };
          }

          const AuditLog = Parse.Object.extend('AuditLog');
          const auditLog = new AuditLog();

          auditLog.set('action', action);
          auditLog.set('resource', resource);
          auditLog.set('resourceId', resourceId || '');
          auditLog.set('details', details);
          auditLog.set('severity', severity);
          auditLog.set('userId', context.user.userId);
          auditLog.set('userEmail', context.user.email || '');
          auditLog.set('organizationId', orgId);
          auditLog.set('ipAddress', ipAddress || '');
          auditLog.set('userAgent', userAgent || '');
          auditLog.set('timestamp', new Date());

          const savedLog = await auditLog.save();

          return {
            success: true,
            data: { auditLog: savedLog.toJSON() },
            message: 'Audit log created successfully',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'createAuditLog',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create audit log',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'createAuditLog',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Export Audit Logs Action
    this.actions.set('exportAuditLogs', {
      id: 'exportAuditLogs',
      name: 'Export Audit Logs',
      description: 'Export audit logs to various formats',
      category: 'external',
      permissions: ['audit:export'],
      parameters: [
        { name: 'format', type: 'string', required: true, description: 'Export format (csv, json, pdf)' },
        { name: 'startDate', type: 'string', required: false, description: 'Start date for export (ISO string)' },
        { name: 'endDate', type: 'string', required: false, description: 'End date for export (ISO string)' },
        { name: 'filters', type: 'object', required: false, description: 'Additional filters for export' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { format, startDate, endDate, filters = {} } = params;
          const orgId = context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to export audit logs',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'exportAuditLogs',
                userId: context.user.userId
              }
            };
          }

          const query = new Parse.Query('AuditLog');
          query.equalTo('organizationId', orgId);

          // Apply date filters
          if (startDate) {
            query.greaterThanOrEqualTo('createdAt', new Date(startDate as string));
          }

          if (endDate) {
            query.lessThanOrEqualTo('createdAt', new Date(endDate as string));
          }

          // Apply additional filters
          const filterObj = filters as Record<string, any>;
          Object.entries(filterObj).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              query.equalTo(key, value);
            }
          });

          query.descending('createdAt');
          query.limit(10000); // Reasonable limit for exports

          const logs = await query.find();
          const logData = logs.map(log => log.toJSON());

          // Generate export based on format
          let exportData;
          let filename;
          let mimeType;

          switch (format) {
            case 'csv':
              exportData = this.generateCSV(logData);
              filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
              mimeType = 'text/csv';
              break;
            case 'json':
              exportData = JSON.stringify(logData, null, 2);
              filename = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
              mimeType = 'application/json';
              break;
            case 'pdf':
              // For PDF, we would typically use a library like PDFKit
              // For now, return a placeholder
              exportData = 'PDF export not implemented yet';
              filename = `audit-logs-${new Date().toISOString().split('T')[0]}.pdf`;
              mimeType = 'application/pdf';
              break;
            default:
              throw new Error('Unsupported export format');
          }

          return {
            success: true,
            data: { 
              exportData,
              filename,
              mimeType,
              recordCount: logData.length
            },
            message: `Exported ${logData.length} audit logs in ${format} format`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'exportAuditLogs',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to export audit logs',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'exportAuditLogs',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Get Audit Statistics Action
    this.actions.set('getAuditStatistics', {
      id: 'getAuditStatistics',
      name: 'Get Audit Statistics',
      description: 'Get audit log statistics and metrics',
      category: 'data',
      permissions: ['audit:read'],
      parameters: [
        { name: 'period', type: 'string', required: false, description: 'Time period (day, week, month, year)' },
        { name: 'groupBy', type: 'string', required: false, description: 'Group statistics by (action, resource, user, severity)' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { period = 'month', groupBy = 'action' } = params;
          const orgId = context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to get audit statistics',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'getAuditStatistics',
                userId: context.user.userId
              }
            };
          }

          // Calculate date range based on period
          const endDate = new Date();
          const startDate = new Date();
          
          switch (period) {
            case 'day':
              startDate.setDate(endDate.getDate() - 1);
              break;
            case 'week':
              startDate.setDate(endDate.getDate() - 7);
              break;
            case 'month':
              startDate.setMonth(endDate.getMonth() - 1);
              break;
            case 'year':
              startDate.setFullYear(endDate.getFullYear() - 1);
              break;
          }

          const query = new Parse.Query('AuditLog');
          query.equalTo('organizationId', orgId);
          query.greaterThanOrEqualTo('createdAt', startDate);
          query.lessThanOrEqualTo('createdAt', endDate);

          const logs = await query.find();
          const logData = logs.map(log => log.toJSON());

          // Generate statistics based on groupBy parameter
          const statistics: Record<string, any> = {
            totalLogs: logData.length,
            period,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          };

          // Group by specified field
          const groupedData: Record<string, number> = {};
          logData.forEach(log => {
            const key = log[groupBy as string] || 'unknown';
            groupedData[key] = (groupedData[key] || 0) + 1;
          });

          statistics.groupedData = groupedData;

          // Additional statistics
          const severityStats: Record<string, number> = {};
          const actionStats: Record<string, number> = {};
          const userStats: Record<string, number> = {};

          logData.forEach(log => {
            // Severity statistics
            const severity = log.severity || 'unknown';
            severityStats[severity] = (severityStats[severity] || 0) + 1;

            // Action statistics
            const action = log.action || 'unknown';
            actionStats[action] = (actionStats[action] || 0) + 1;

            // User statistics
            const userId = log.userId || 'unknown';
            userStats[userId] = (userStats[userId] || 0) + 1;
          });

          statistics.severityBreakdown = severityStats;
          statistics.actionBreakdown = actionStats;
          statistics.userBreakdown = userStats;

          return {
            success: true,
            data: { statistics },
            message: 'Audit statistics retrieved successfully',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getAuditStatistics',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get audit statistics',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getAuditStatistics',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Get Audit Actions Action
    this.actions.set('getAuditActions', {
      id: 'getAuditActions',
      name: 'Get Audit Actions',
      description: 'Get all available audit action types',
      category: 'data',
      permissions: ['audit:read'],
      parameters: [],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const actions = [
            'user_login',
            'user_logout',
            'user_created',
            'user_updated',
            'user_deleted',
            'password_changed',
            'permission_granted',
            'permission_revoked',
            'data_created',
            'data_updated',
            'data_deleted',
            'data_exported',
            'integration_created',
            'integration_updated',
            'integration_deleted',
            'system_configuration_changed',
            'security_event',
            'api_access',
            'file_uploaded',
            'file_downloaded',
            'report_generated'
          ];

          return {
            success: true,
            data: { actions },
            message: `Found ${actions.length} audit action types`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getAuditActions',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get audit actions',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getAuditActions',
              userId: context.user.userId
            }
          };
        }
      }
    });
  }

  private generateCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'object') {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  }
}

// Export singleton instance
export const auditLogsPageController = new AuditLogsPageController();
import {
  ActionDefinition,
  ActionContext,
  ActionResult,
} from '../../types/ActionTypes';
import Parse from 'parse';
import { generateCSV } from '../utils/AuditLogsUtils';

export function exportAuditLogsAction(): ActionDefinition {
  return {
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
        const format = params.format as string;
        const startDate = params.startDate as string | undefined;
        const endDate = params.endDate as string | undefined;
        const filters = params.filters as Record<string, unknown> || {};

        const orgId = context.user.organizationId || context.organization?.id;

        if (!format) {
          return {
            success: false,
            error: 'Export format is required',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'exportAuditLogs',
              userId: context.user.userId
            }
          };
        }

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

        if (startDate) {
          query.greaterThanOrEqualTo('createdAt', new Date(startDate));
        }

        if (endDate) {
          query.lessThanOrEqualTo('createdAt', new Date(endDate));
        }

        const filterObj = filters as Record<string, any>;
        Object.entries(filterObj).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query.equalTo(key, value);
          }
        });

        query.descending('createdAt');
        query.limit(10000); 

        const logs = await query.find();
        const logData = logs.map(log => log.toJSON());

        let exportData;
        let filename;
        let mimeType;

        switch (format) {
          case 'csv':
            exportData = generateCSV(logData);
            filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
            mimeType = 'text/csv';
            break;
          case 'json':
            exportData = JSON.stringify(logData, null, 2);
            filename = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
            mimeType = 'application/json';
            break;
          case 'pdf':
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
  };
}
import {
  ActionContext,
  ActionResult
} from '../../types/ActionTypes';
import { ActionConfig } from '../../base/BasePageController';
import { callCloudFunction } from '@/utils/apiUtils';

/**
 * Create audit log action
 */
export function getCreateAuditLogAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'createAuditLog',
      name: 'Create Audit Log',
      description: 'Create a new audit log entry',
      category: 'data',
      permissions: ['audit:write'],
      parameters: [
        { name: 'action', type: 'string', required: true, description: 'Action that was performed' },
        { name: 'resource', type: 'string', required: true, description: 'Resource that was affected' },
        { name: 'resourceId', type: 'string', required: false, description: 'ID of the affected resource' },
        { name: 'severity', type: 'string', required: false, description: 'Severity level (low, medium, high, critical)' },
        { name: 'details', type: 'object', required: false, description: 'Additional details about the action' },
        { name: 'ipAddress', type: 'string', required: false, description: 'IP address of the user' },
        { name: 'userAgent', type: 'string', required: false, description: 'User agent string' }
      ]
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        const {
          action,
          resource,
          resourceId,
          severity = 'medium',
          details,
          ipAddress,
          userAgent
        } = params;

        // Validate organization context
        const orgId = context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        // Call cloud function to create audit log
        const response = await callCloudFunction('createAuditLog', {
          organizationId: orgId,
          userId: context.user.userId,
          action,
          resource,
          resourceId,
          severity,
          details,
          ipAddress,
          userAgent
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to create audit log');
        }

        return {
          success: true,
          data: response.data,
          message: 'Audit log created successfully'
        };
      } catch (error) {
        console.error('Error creating audit log:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create audit log'
        };
      }
    }
  };
}

/**
 * Export audit logs action
 */
export function getExportAuditLogsAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'exportAuditLogs',
      name: 'Export Audit Logs',
      description: 'Export audit logs to CSV or JSON format',
      category: 'data',
      permissions: ['audit:export'],
      parameters: [
        { name: 'format', type: 'string', required: false, description: 'Export format (csv, json)' },
        { name: 'startDate', type: 'string', required: false, description: 'Start date for export filtering' },
        { name: 'endDate', type: 'string', required: false, description: 'End date for export filtering' },
        { name: 'filters', type: 'object', required: false, description: 'Additional filters for export' }
      ]
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        const {
          format = 'csv',
          startDate,
          endDate,
          filters
        } = params;

        // Validate organization context
        const orgId = context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        // Call cloud function to export audit logs
        const response = await callCloudFunction('exportAuditLogs', {
          organizationId: orgId,
          format,
          startDate,
          endDate,
          filters
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to export audit logs');
        }

        return {
          success: true,
          data: response.data,
          message: `Audit logs exported successfully as ${(format as string).toUpperCase()}`
        };
      } catch (error) {
        console.error('Error exporting audit logs:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to export audit logs'
        };
      }
    }
  };
}

/**
 * Delete audit log action
 */
export function getDeleteAuditLogAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'deleteAuditLog',
      name: 'Delete Audit Log',
      description: 'Delete an audit log entry (admin only)',
      category: 'data',
      permissions: ['audit:delete', 'admin:manage'],
      parameters: [
        { name: 'logId', type: 'string', required: true, description: 'ID of the audit log to delete' },
        { name: 'reason', type: 'string', required: true, description: 'Reason for deletion' }
      ]
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        const { logId, reason } = params;

        // Validate organization context
        const orgId = context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        // Call cloud function to delete audit log
        const response = await callCloudFunction('deleteAuditLog', {
          organizationId: orgId,
          logId,
          reason,
          deletedBy: context.user.userId
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to delete audit log');
        }

        return {
          success: true,
          data: response.data,
          message: 'Audit log deleted successfully'
        };
      } catch (error) {
        console.error('Error deleting audit log:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete audit log'
        };
      }
    }
  };
}

/**
 * Bulk export audit logs action
 */
export function getBulkExportAuditLogsAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'bulkExportAuditLogs',
      name: 'Bulk Export Audit Logs',
      description: 'Export large volumes of audit logs with advanced filtering',
      category: 'data',
      permissions: ['audit:export', 'audit:bulk'],
      parameters: [
        { name: 'format', type: 'string', required: false, description: 'Export format (csv, json, xlsx)' },
        { name: 'dateRange', type: 'object', required: false, description: 'Date range for export' },
        { name: 'filters', type: 'object', required: false, description: 'Advanced filters for export' },
        { name: 'includeDetails', type: 'boolean', required: false, description: 'Include detailed information' },
        { name: 'compression', type: 'boolean', required: false, description: 'Compress the export file' }
      ]
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        const {
          format = 'csv',
          dateRange,
          filters,
          includeDetails = true,
          compression = false
        } = params;

        // Validate organization context
        const orgId = context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        // Call cloud function to bulk export audit logs
        const response = await callCloudFunction('bulkExportAuditLogs', {
          organizationId: orgId,
          format,
          dateRange,
          filters,
          includeDetails,
          compression
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to bulk export audit logs');
        }

        return {
          success: true,
          data: response.data,
          message: `Bulk export initiated successfully. ${response.data?.estimatedTime ? `Estimated completion: ${response.data.estimatedTime}` : ''}`
        };
      } catch (error) {
        console.error('Error bulk exporting audit logs:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to bulk export audit logs'
        };
      }
    }
  };
}
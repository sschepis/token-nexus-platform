import {
  ActionDefinition,
  ActionContext,
  ActionResult,
} from '../../types/ActionTypes';
import Parse from 'parse';

export function createAuditLogAction(): ActionDefinition {
  return {
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
        const action = params.action as string;
        const resource = params.resource as string;
        const resourceId = params.resourceId as string | undefined;
        const details = params.details as Record<string, unknown> || {};
        const severity = params.severity as string || 'info';
        const ipAddress = params.ipAddress as string | undefined;
        const userAgent = params.userAgent as string | undefined;

        const orgId = context.user.organizationId || context.organization?.id;

        if (!action || !resource) {
          return {
            success: false,
            error: 'Action and resource are required to create audit log',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'createAuditLog',
              userId: context.user.userId
            }
          };
        }

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
  };
}
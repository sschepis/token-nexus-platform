import {
  ActionDefinition,
  ActionContext,
  ActionResult,
} from '../../types/ActionTypes';

export function getAuditActionsAction(): ActionDefinition {
  return {
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
  };
}
import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';

export const getNotificationTypesAction: ActionDefinition = {
  id: 'getNotificationTypes',
  name: 'Get Notification Types',
  description: 'Get all available notification types',
  category: 'data',
  permissions: ['notifications:read'],
  parameters: [],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const types = [
        'system',
        'security',
        'user_action',
        'integration',
        'workflow',
        'reminder',
        'alert',
        'announcement',
        'update',
        'error'
      ];

      return {
        success: true,
        data: { types },
        message: `Found ${types.length} notification types`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'getNotificationTypes',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get notification types',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'getNotificationTypes',
          userId: context.user.userId
        }
      };
    }
  }
};
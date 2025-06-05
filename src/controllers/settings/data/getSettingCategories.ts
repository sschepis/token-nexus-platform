import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';

export const getSettingCategoriesAction: ActionDefinition = {
  id: 'getSettingCategories',
  name: 'Get Setting Categories',
  description: 'Get all available setting categories',
  category: 'data',
  permissions: ['settings:read'],
  parameters: [],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const categories = [
        'general',
        'security',
        'notifications',
        'integrations',
        'appearance',
        'performance',
        'backup',
        'api',
        'email',
        'storage'
      ];

      return {
        success: true,
        data: { categories },
        message: `Found ${categories.length} setting categories`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'getSettingCategories',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get setting categories',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'getSettingCategories',
          userId: context.user.userId
        }
      };
    }
  }
};
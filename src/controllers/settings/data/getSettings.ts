import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import Parse from 'parse';

export const getSettingsAction: ActionDefinition = {
  id: 'getSettings',
  name: 'Get Settings',
  description: 'Get application settings and configurations',
  category: 'data',
  permissions: ['settings:read'],
  parameters: [
    { name: 'category', type: 'string', required: false, description: 'Settings category to filter by' },
    { name: 'includeSystem', type: 'boolean', required: false, description: 'Include system-level settings' }
  ],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const { category, includeSystem = false } = params;
      const orgId = context.user.organizationId || context.organization?.id;

      if (!orgId) {
        return {
          success: false,
          error: 'Organization ID is required to get settings',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'getSettings',
            userId: context.user.userId
          }
        };
      }

      const query = new Parse.Query('Setting');
      query.equalTo('organizationId', orgId);

      if (category) {
        query.equalTo('category', category);
      }

      if (!includeSystem) {
        query.notEqualTo('isSystem', true);
      }

      const settings = await query.find();
      const settingsData = settings.map(setting => {
        const data = setting.toJSON();
        // Mask sensitive values
        if (data.isSensitive) {
          data.value = '***';
        }
        return data;
      });

      // Group settings by category
      const groupedSettings: Record<string, any[]> = {};
      settingsData.forEach(setting => {
        const cat = setting.category || 'general';
        if (!groupedSettings[cat]) {
          groupedSettings[cat] = [];
        }
        groupedSettings[cat].push(setting);
      });

      return {
        success: true,
        data: { 
          settings: settingsData,
          groupedSettings,
          totalCount: settingsData.length
        },
        message: `Found ${settingsData.length} settings`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'getSettings',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get settings',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'getSettings',
          userId: context.user.userId
        }
      };
    }
  }
};
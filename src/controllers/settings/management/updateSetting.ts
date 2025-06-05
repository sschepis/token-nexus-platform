import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import Parse from 'parse';

export const updateSettingAction: ActionDefinition = {
  id: 'updateSetting',
  name: 'Update Setting',
  description: 'Update a specific setting value',
  category: 'data',
  permissions: ['settings:write'],
  parameters: [
    { name: 'key', type: 'string', required: true, description: 'Setting key to update' },
    { name: 'value', type: 'string', required: true, description: 'New setting value' },
    { name: 'category', type: 'string', required: false, description: 'Setting category' }
  ],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const { key, value, category = 'general' } = params;
      const orgId = context.user.organizationId || context.organization?.id;

      if (!orgId) {
        return {
          success: false,
          error: 'Organization ID is required to update setting',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'updateSetting',
            userId: context.user.userId
          }
        };
      }

      // Find existing setting
      const query = new Parse.Query('Setting');
      query.equalTo('organizationId', orgId);
      query.equalTo('key', key);

      let setting = await query.first();

      if (!setting) {
        // Create new setting if it doesn't exist
        const Setting = Parse.Object.extend('Setting');
        setting = new Setting();
        setting.set('key', key);
        setting.set('organizationId', orgId);
        setting.set('category', category);
        setting.set('createdBy', context.user.userId);
      }

      // Validate setting permissions
      if (setting.get('isSystem') && !context.user.permissions?.includes('admin:settings')) {
        return {
          success: false,
          error: 'Insufficient permissions to modify system setting',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'updateSetting',
            userId: context.user.userId
          }
        };
      }

      setting.set('value', value);
      setting.set('updatedBy', context.user.userId);
      setting.set('updatedAt', new Date());

      const savedSetting = await setting.save();

      return {
        success: true,
        data: { setting: savedSetting.toJSON() },
        message: `Setting "${key}" updated successfully`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'updateSetting',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update setting',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'updateSetting',
          userId: context.user.userId
        }
      };
    }
  }
};
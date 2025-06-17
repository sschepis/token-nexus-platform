import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { upsertParseObject } from '../../../utils/parseUtils';

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

      // Upsert setting with permission validation
      const savedSetting = await upsertParseObject(
        'Setting',
        { organizationId: orgId, key },
        {
          category,
          createdBy: context.user.userId
        },
        {
          value,
          updatedBy: context.user.userId,
          updatedAt: new Date()
        }
      );

      // Validate setting permissions after upsert
      if (savedSetting.get('isSystem') && !context.user.permissions?.includes('admin:settings')) {
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
import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import Parse from 'parse';

export const bulkUpdateSettingsAction: ActionDefinition = {
  id: 'bulkUpdateSettings',
  name: 'Bulk Update Settings',
  description: 'Update multiple settings at once',
  category: 'data',
  permissions: ['settings:write'],
  parameters: [
    { name: 'settings', type: 'object', required: true, description: 'Object with key-value pairs of settings to update' },
    { name: 'category', type: 'string', required: false, description: 'Default category for new settings' }
  ],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const { settings, category = 'general' } = params;
      const orgId = context.user.organizationId || context.organization?.id;

      if (!orgId) {
        return {
          success: false,
          error: 'Organization ID is required to update settings',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'bulkUpdateSettings',
            userId: context.user.userId
          }
        };
      }

      const settingsObj = settings as Record<string, any>;
      const updatePromises: Promise<any>[] = [];

      for (const [key, value] of Object.entries(settingsObj)) {
        const promise = (async () => {
          try {
            // Find existing setting
            const query = new Parse.Query('Setting');
            query.equalTo('organizationId', orgId);
            query.equalTo('key', key);

            let setting = await query.first();

            if (!setting) {
              // Create new setting
              const Setting = Parse.Object.extend('Setting');
              setting = new Setting();
              setting.set('key', key);
              setting.set('organizationId', orgId);
              setting.set('category', category);
              setting.set('createdBy', context.user.userId);
            }

            // Check permissions for system settings
            if (setting.get('isSystem') && !context.user.permissions?.includes('admin:settings')) {
              throw new Error(`Insufficient permissions to modify system setting: ${key}`);
            }

            setting.set('value', value);
            setting.set('updatedBy', context.user.userId);
            setting.set('updatedAt', new Date());

            const savedSetting = await setting.save();
            return { key, success: true, setting: savedSetting.toJSON() };
          } catch (error) {
            return { 
              key, 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            };
          }
        })();

        updatePromises.push(promise);
      }

      const updateResults = await Promise.all(updatePromises);
      const successCount = updateResults.filter(r => r.success).length;
      const errorCount = updateResults.filter(r => !r.success).length;

      return {
        success: errorCount === 0,
        data: { 
          results: updateResults,
          successCount,
          errorCount,
          totalCount: updateResults.length
        },
        message: `Updated ${successCount} settings successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'bulkUpdateSettings',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to bulk update settings',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'bulkUpdateSettings',
          userId: context.user.userId
        }
      };
    }
  }
};
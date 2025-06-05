import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import Parse from 'parse';

// Default settings configuration
const getDefaultSettings = (): Record<string, any> => {
  return {
    'app.name': 'Token Nexus Platform',
    'app.description': 'Comprehensive token management platform',
    'security.sessionTimeout': '3600',
    'security.passwordMinLength': '8',
    'security.requireMFA': 'false',
    'notifications.email.enabled': 'true',
    'notifications.push.enabled': 'true',
    'api.rateLimit': '1000',
    'api.timeout': '30000',
    'storage.maxFileSize': '10485760',
    'backup.enabled': 'true',
    'backup.frequency': 'daily'
  };
};

export const resetSettingsAction: ActionDefinition = {
  id: 'resetSettings',
  name: 'Reset Settings',
  description: 'Reset settings to default values',
  category: 'data',
  permissions: ['admin:settings'],
  parameters: [
    { name: 'category', type: 'string', required: false, description: 'Category of settings to reset' },
    { name: 'confirmReset', type: 'boolean', required: true, description: 'Confirmation flag for reset' }
  ],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const { category, confirmReset } = params;
      const orgId = context.user.organizationId || context.organization?.id;

      if (!confirmReset) {
        return {
          success: false,
          error: 'Reset confirmation is required',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'resetSettings',
            userId: context.user.userId
          }
        };
      }

      if (!orgId) {
        return {
          success: false,
          error: 'Organization ID is required to reset settings',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'resetSettings',
            userId: context.user.userId
          }
        };
      }

      const query = new Parse.Query('Setting');
      query.equalTo('organizationId', orgId);
      query.notEqualTo('isSystem', true); // Don't reset system settings

      if (category) {
        query.equalTo('category', category);
      }

      const settings = await query.find();
      
      // Get default values for settings
      const defaultValues = getDefaultSettings();
      
      const resetPromises = settings.map(async (setting) => {
        const key = setting.get('key');
        const defaultValue = defaultValues[key];
        
        if (defaultValue !== undefined) {
          setting.set('value', defaultValue);
          setting.set('updatedBy', context.user.userId);
          setting.set('updatedAt', new Date());
          return setting.save();
        }
        return setting;
      });

      await Promise.all(resetPromises);

      return {
        success: true,
        data: { 
          resetCount: settings.length,
          category: category || 'all'
        },
        message: `Reset ${settings.length} settings to default values`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'resetSettings',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset settings',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'resetSettings',
          userId: context.user.userId
        }
      };
    }
  }
};
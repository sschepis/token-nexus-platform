import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import Parse from 'parse';

// Utility functions for format conversion
const convertToYAML = (data: any[]): string => {
  // Simple YAML conversion
  let yaml = '';
  data.forEach(setting => {
    yaml += `${setting.key}: ${setting.value}\n`;
  });
  return yaml;
};

const convertToEnv = (data: any[]): string => {
  // Convert to environment variables format
  let env = '';
  data.forEach(setting => {
    const envKey = setting.key.toUpperCase().replace(/\./g, '_');
    env += `${envKey}=${setting.value}\n`;
  });
  return env;
};

export const exportSettingsAction: ActionDefinition = {
  id: 'exportSettings',
  name: 'Export Settings',
  description: 'Export settings configuration to a file',
  category: 'external',
  permissions: ['settings:read'],
  parameters: [
    { name: 'format', type: 'string', required: false, description: 'Export format (json, yaml, env)' },
    { name: 'category', type: 'string', required: false, description: 'Category to export' },
    { name: 'includeSensitive', type: 'boolean', required: false, description: 'Include sensitive settings' }
  ],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const { format = 'json', category, includeSensitive = false } = params;
      const orgId = context.user.organizationId || context.organization?.id;

      if (!orgId) {
        return {
          success: false,
          error: 'Organization ID is required to export settings',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'exportSettings',
            userId: context.user.userId
          }
        };
      }

      const query = new Parse.Query('Setting');
      query.equalTo('organizationId', orgId);

      if (category) {
        query.equalTo('category', category);
      }

      if (!includeSensitive) {
        query.notEqualTo('isSensitive', true);
      }

      const settings = await query.find();
      const settingsData = settings.map(setting => setting.toJSON());

      let exportData: string;
      let filename: string;
      let mimeType: string;

      switch (format) {
        case 'json':
          exportData = JSON.stringify(settingsData, null, 2);
          filename = `settings-${new Date().toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
          break;
        case 'yaml':
          // Convert to YAML format (simplified)
          exportData = convertToYAML(settingsData);
          filename = `settings-${new Date().toISOString().split('T')[0]}.yaml`;
          mimeType = 'text/yaml';
          break;
        case 'env':
          // Convert to environment variables format
          exportData = convertToEnv(settingsData);
          filename = `settings-${new Date().toISOString().split('T')[0]}.env`;
          mimeType = 'text/plain';
          break;
        default:
          throw new Error('Unsupported export format');
      }

      return {
        success: true,
        data: { 
          exportData,
          filename,
          mimeType,
          settingsCount: settingsData.length
        },
        message: `Exported ${settingsData.length} settings in ${format} format`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'exportSettings',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export settings',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'exportSettings',
          userId: context.user.userId
        }
      };
    }
  }
};
import {
  PageController,
  ActionDefinition,
  ActionContext,
  ActionResult,
  PageContext
} from './types/ActionTypes';

export class SettingsPageController implements PageController {
  pageId = 'settings';
  pageName = 'Settings';
  description = 'Manage application settings, preferences, and configurations';
  actions = new Map<string, ActionDefinition>();
  context: PageContext = {
    pageId: 'settings',
    pageName: 'Settings',
    state: {},
    props: {},
    metadata: {
      category: 'configuration',
      tags: ['settings', 'configuration', 'preferences', 'admin'],
      permissions: ['settings:read', 'settings:write', 'admin:settings']
    }
  };
  metadata = {
    category: 'configuration',
    tags: ['settings', 'configuration', 'preferences', 'admin'],
    permissions: ['settings:read', 'settings:write', 'admin:settings'],
    version: '1.0.0'
  };
  isActive = true;
  registeredAt = new Date();

  constructor() {
    this.initializeActions();
  }

  private initializeActions(): void {
    // Get Settings Action
    this.actions.set('getSettings', {
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
    });

    // Update Setting Action
    this.actions.set('updateSetting', {
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
    });

    // Bulk Update Settings Action
    this.actions.set('bulkUpdateSettings', {
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
          const results: any[] = [];

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
    });

    // Reset Settings Action
    this.actions.set('resetSettings', {
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
          const defaultValues = this.getDefaultSettings();
          
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
    });

    // Export Settings Action
    this.actions.set('exportSettings', {
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
              exportData = this.convertToYAML(settingsData);
              filename = `settings-${new Date().toISOString().split('T')[0]}.yaml`;
              mimeType = 'text/yaml';
              break;
            case 'env':
              // Convert to environment variables format
              exportData = this.convertToEnv(settingsData);
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
    });

    // Get Setting Categories Action
    this.actions.set('getSettingCategories', {
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
    });
  }

  private getDefaultSettings(): Record<string, any> {
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
  }

  private convertToYAML(data: any[]): string {
    // Simple YAML conversion
    let yaml = '';
    data.forEach(setting => {
      yaml += `${setting.key}: ${setting.value}\n`;
    });
    return yaml;
  }

  private convertToEnv(data: any[]): string {
    // Convert to environment variables format
    let env = '';
    data.forEach(setting => {
      const envKey = setting.key.toUpperCase().replace(/\./g, '_');
      env += `${envKey}=${setting.value}\n`;
    });
    return env;
  }
}

// Export singleton instance
export const settingsPageController = new SettingsPageController();
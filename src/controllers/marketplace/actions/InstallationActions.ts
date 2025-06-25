import {
  ActionContext,
  ActionResult
} from '../../types/ActionTypes';
import { ActionConfig } from '../../base/BasePageController';
import { callCloudFunction } from '@/utils/apiUtils';

/**
 * App installation and management actions
 * Adapted to work with BasePageController's registerAction pattern
 */

export function getInstallAppAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'installApp',
      name: 'Install App',
      description: 'Install a marketplace app to the organization',
      category: 'external',
      permissions: ['marketplace:install'],
      parameters: [
        { name: 'appId', type: 'string', required: true, description: 'Marketplace app ID to install' },
        { name: 'versionId', type: 'string', required: false, description: 'Specific version ID to install (latest if not specified)' },
        { name: 'configuration', type: 'object', required: false, description: 'App configuration settings' },
        { name: 'confirmInstall', type: 'boolean', required: true, description: 'Confirmation flag for installation' }
      ],
      requiresOrganization: true,
      metadata: {
        tags: ['marketplace', 'install', 'apps'],
        examples: [
          {
            params: { appId: 'app123', confirmInstall: true },
            description: 'Install latest version of an app'
          },
          {
            params: { appId: 'app123', versionId: 'v1.2.0', confirmInstall: true, configuration: { apiKey: 'key123' } },
            description: 'Install specific version with configuration'
          }
        ]
      }
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      const { appId, versionId, configuration = {}, confirmInstall } = params;

      if (!confirmInstall) {
        throw new Error('Installation confirmation is required');
      }

      try {
        const result = await callCloudFunction('installApp', {
          appDefinitionId: appId as string,
          versionId: versionId as string,
          appSpecificConfig: configuration
        });

        return {
          installation: result,
          message: `App installed successfully`
        };
      } catch (error) {
        throw new Error(`Failed to install app: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };
}

export function getUninstallAppAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'uninstallApp',
      name: 'Uninstall App',
      description: 'Uninstall an app from the organization',
      category: 'external',
      permissions: ['marketplace:install'],
      parameters: [
        { name: 'appId', type: 'string', required: true, description: 'App ID to uninstall' },
        { name: 'confirmUninstall', type: 'boolean', required: true, description: 'Confirmation flag for uninstallation' },
        { name: 'removeData', type: 'boolean', required: false, description: 'Remove app data during uninstall' }
      ],
      requiresOrganization: true,
      metadata: {
        tags: ['marketplace', 'uninstall', 'apps'],
        examples: [
          {
            params: { appId: 'app123', confirmUninstall: true },
            description: 'Uninstall an app keeping data'
          },
          {
            params: { appId: 'app123', confirmUninstall: true, removeData: true },
            description: 'Uninstall an app and remove all data'
          }
        ]
      }
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      const { appId, confirmUninstall, removeData = false } = params;

      if (!confirmUninstall) {
        throw new Error('Uninstall confirmation is required');
      }

      try {
        const result = await callCloudFunction('uninstallApp', {
          appDefinitionId: appId as string
        });

        return {
          uninstalledAppId: appId,
          removedData: removeData,
          message: 'App uninstalled successfully'
        };
      } catch (error) {
        throw new Error(`Failed to uninstall app: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };
}

export function getInstalledAppsAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'getInstalledApps',
      name: 'Get Installed Apps',
      description: 'Get all apps installed in the organization',
      category: 'data',
      permissions: ['marketplace:read'],
      parameters: [
        { name: 'includeInactive', type: 'boolean', required: false, description: 'Include inactive apps' }
      ],
      requiresOrganization: true,
      metadata: {
        tags: ['marketplace', 'installed', 'apps'],
        examples: [
          {
            params: {},
            description: 'Get all active installed apps'
          },
          {
            params: { includeInactive: true },
            description: 'Get all installed apps including inactive ones'
          }
        ]
      }
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      const { includeInactive = false } = params;
      const orgId = context.user.organizationId || context.organization?.id;

      try {
        const result = await callCloudFunction('fetchOrgAppInstallations', {
          organizationId: orgId
        });

        let installedApps: any[] = [];
        if (Array.isArray(result)) {
          installedApps = result;
        } else if (result && typeof result === 'object' && 'data' in result) {
          installedApps = Array.isArray(result.data) ? result.data : [];
        }

        // Filter inactive apps if not requested
        if (!includeInactive) {
          installedApps = installedApps.filter((app: any) => app.status === 'active');
        }

        return { installedApps };
      } catch (error) {
        throw new Error(`Failed to get installed apps: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };
}

export function getUpdateAppSettingsAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'updateAppSettings',
      name: 'Update App Settings',
      description: 'Update configuration settings for an installed app',
      category: 'external',
      permissions: ['marketplace:install'],
      parameters: [
        { name: 'appId', type: 'string', required: true, description: 'App ID to update settings for' },
        { name: 'settings', type: 'object', required: true, description: 'New configuration settings' }
      ],
      requiresOrganization: true,
      metadata: {
        tags: ['marketplace', 'settings', 'configuration'],
        examples: [
          {
            params: { appId: 'app123', settings: { apiKey: 'newkey123', enabled: true } },
            description: 'Update app configuration settings'
          }
        ]
      }
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      const { appId, settings } = params;

      try {
        const result = await callCloudFunction('updateAppSettings', {
          appDefinitionId: appId as string,
          settings: settings
        });

        return {
          installation: result,
          message: 'App settings updated successfully'
        };
      } catch (error) {
        throw new Error(`Failed to update app settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };
}
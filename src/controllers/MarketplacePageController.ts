import {
  PageController,
  ActionDefinition,
  ActionContext,
  ActionResult,
  PageContext
} from './types/ActionTypes';

export class MarketplacePageController implements PageController {
  pageId = 'marketplace';
  pageName = 'Marketplace';
  description = 'Browse and manage marketplace apps, plugins, and extensions';
  actions = new Map<string, ActionDefinition>();
  context: PageContext = {
    pageId: 'marketplace',
    pageName: 'Marketplace',
    state: {},
    props: {},
    metadata: {
      category: 'marketplace',
      tags: ['marketplace', 'apps', 'plugins', 'extensions', 'store'],
      permissions: ['marketplace:read', 'marketplace:install', 'apps:manage']
    }
  };
  metadata = {
    category: 'marketplace',
    tags: ['marketplace', 'apps', 'plugins', 'extensions', 'store'],
    permissions: ['marketplace:read', 'marketplace:install', 'apps:manage'],
    version: '1.0.0'
  };
  isActive = true;
  registeredAt = new Date();

  constructor() {
    this.initializeActions();
  }

  private initializeActions(): void {
    // Browse Marketplace Action
    this.actions.set('browseMarketplace', {
      id: 'browseMarketplace',
      name: 'Browse Marketplace',
      description: 'Browse available apps and plugins in the marketplace',
      category: 'data',
      permissions: ['marketplace:read'],
      parameters: [
        { name: 'category', type: 'string', required: false, description: 'Filter by app category' },
        { name: 'searchTerm', type: 'string', required: false, description: 'Search term for app names' },
        { name: 'sortBy', type: 'string', required: false, description: 'Sort by (popularity, rating, name, date)' },
        { name: 'featured', type: 'boolean', required: false, description: 'Show only featured apps' },
        { name: 'limit', type: 'number', required: false, description: 'Number of results to return' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { category, searchTerm, sortBy = 'popularity', featured = false, limit = 20 } = params;

          const query = new Parse.Query('MarketplaceApp');
          query.equalTo('isPublished', true);
          query.equalTo('isActive', true);

          if (category) {
            query.equalTo('category', category);
          }

          if (searchTerm) {
            query.contains('name', searchTerm.toString());
          }

          if (featured) {
            query.equalTo('isFeatured', true);
          }

          // Apply sorting
          switch (sortBy) {
            case 'popularity':
              query.descending('installCount');
              break;
            case 'rating':
              query.descending('averageRating');
              break;
            case 'name':
              query.ascending('name');
              break;
            case 'date':
              query.descending('createdAt');
              break;
            default:
              query.descending('installCount');
          }

          query.limit(limit as number);
          const apps = await query.find();
          const appData = apps.map(app => {
            const data = app.toJSON();
            // Add installation status for current organization
            data.isInstalled = false; // This would be checked against installed apps
            return data;
          });

          return {
            success: true,
            data: { apps: appData },
            message: `Found ${appData.length} marketplace apps`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'browseMarketplace',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to browse marketplace',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'browseMarketplace',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Get App Details Action
    this.actions.set('getAppDetails', {
      id: 'getAppDetails',
      name: 'Get App Details',
      description: 'Get detailed information about a marketplace app',
      category: 'data',
      permissions: ['marketplace:read'],
      parameters: [
        { name: 'appId', type: 'string', required: true, description: 'Marketplace app ID' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { appId } = params;
          const orgId = context.user.organizationId || context.organization?.id;

          const query = new Parse.Query('MarketplaceApp');
          query.equalTo('objectId', appId);
          query.equalTo('isPublished', true);

          const app = await query.first();
          if (!app) {
            return {
              success: false,
              error: 'App not found in marketplace',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'getAppDetails',
                userId: context.user.userId
              }
            };
          }

          const appData = app.toJSON();

          // Check if app is installed for current organization
          if (orgId) {
            const installQuery = new Parse.Query('InstalledApp');
            installQuery.equalTo('appId', appId);
            installQuery.equalTo('organizationId', orgId);
            const installation = await installQuery.first();
            appData.isInstalled = !!installation;
            appData.installationData = installation ? installation.toJSON() : null;
          }

          // Get app reviews
          const reviewQuery = new Parse.Query('AppReview');
          reviewQuery.equalTo('appId', appId);
          reviewQuery.descending('createdAt');
          reviewQuery.limit(10);
          const reviews = await reviewQuery.find();
          appData.reviews = reviews.map(review => review.toJSON());

          return {
            success: true,
            data: { app: appData },
            message: 'App details retrieved successfully',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getAppDetails',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get app details',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getAppDetails',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Install App Action
    this.actions.set('installApp', {
      id: 'installApp',
      name: 'Install App',
      description: 'Install a marketplace app to the organization',
      category: 'external',
      permissions: ['marketplace:install'],
      parameters: [
        { name: 'appId', type: 'string', required: true, description: 'Marketplace app ID to install' },
        { name: 'configuration', type: 'object', required: false, description: 'App configuration settings' },
        { name: 'confirmInstall', type: 'boolean', required: true, description: 'Confirmation flag for installation' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { appId, configuration = {}, confirmInstall } = params;
          const orgId = context.user.organizationId || context.organization?.id;

          if (!confirmInstall) {
            return {
              success: false,
              error: 'Installation confirmation is required',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'installApp',
                userId: context.user.userId
              }
            };
          }

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to install app',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'installApp',
                userId: context.user.userId
              }
            };
          }

          // Check if app exists and is published
          const appQuery = new Parse.Query('MarketplaceApp');
          appQuery.equalTo('objectId', appId);
          appQuery.equalTo('isPublished', true);

          const app = await appQuery.first();
          if (!app) {
            return {
              success: false,
              error: 'App not found or not available for installation',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'installApp',
                userId: context.user.userId
              }
            };
          }

          // Check if app is already installed
          const installQuery = new Parse.Query('InstalledApp');
          installQuery.equalTo('appId', appId);
          installQuery.equalTo('organizationId', orgId);
          const existingInstall = await installQuery.first();

          if (existingInstall) {
            return {
              success: false,
              error: 'App is already installed',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'installApp',
                userId: context.user.userId
              }
            };
          }

          // Create installation record
          const InstalledApp = Parse.Object.extend('InstalledApp');
          const installation = new InstalledApp();

          installation.set('appId', appId);
          installation.set('appName', app.get('name'));
          installation.set('appVersion', app.get('version'));
          installation.set('organizationId', orgId);
          installation.set('installedBy', context.user.userId);
          installation.set('configuration', configuration);
          installation.set('status', 'installed');
          installation.set('isActive', true);

          const savedInstallation = await installation.save();

          // Update app install count
          app.increment('installCount');
          await app.save();

          return {
            success: true,
            data: { 
              installation: savedInstallation.toJSON(),
              app: app.toJSON()
            },
            message: `App "${app.get('name')}" installed successfully`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'installApp',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to install app',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'installApp',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Uninstall App Action
    this.actions.set('uninstallApp', {
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
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { appId, confirmUninstall, removeData = false } = params;
          const orgId = context.user.organizationId || context.organization?.id;

          if (!confirmUninstall) {
            return {
              success: false,
              error: 'Uninstall confirmation is required',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'uninstallApp',
                userId: context.user.userId
              }
            };
          }

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to uninstall app',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'uninstallApp',
                userId: context.user.userId
              }
            };
          }

          // Find installation record
          const installQuery = new Parse.Query('InstalledApp');
          installQuery.equalTo('appId', appId);
          installQuery.equalTo('organizationId', orgId);
          const installation = await installQuery.first();

          if (!installation) {
            return {
              success: false,
              error: 'App is not installed',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'uninstallApp',
                userId: context.user.userId
              }
            };
          }

          // Remove installation record
          await installation.destroy();

          // Update app install count
          const appQuery = new Parse.Query('MarketplaceApp');
          appQuery.equalTo('objectId', appId);
          const app = await appQuery.first();
          if (app) {
            app.increment('installCount', -1);
            await app.save();
          }

          return {
            success: true,
            data: { 
              uninstalledAppId: appId,
              removedData: removeData
            },
            message: 'App uninstalled successfully',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'uninstallApp',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to uninstall app',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'uninstallApp',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Get Installed Apps Action
    this.actions.set('getInstalledApps', {
      id: 'getInstalledApps',
      name: 'Get Installed Apps',
      description: 'Get all apps installed in the organization',
      category: 'data',
      permissions: ['marketplace:read'],
      parameters: [
        { name: 'includeInactive', type: 'boolean', required: false, description: 'Include inactive apps' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { includeInactive = false } = params;
          const orgId = context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to get installed apps',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'getInstalledApps',
                userId: context.user.userId
              }
            };
          }

          const query = new Parse.Query('InstalledApp');
          query.equalTo('organizationId', orgId);

          if (!includeInactive) {
            query.equalTo('isActive', true);
          }

          query.descending('createdAt');
          const installations = await query.find();
          const installedApps = installations.map(installation => installation.toJSON());

          return {
            success: true,
            data: { installedApps },
            message: `Found ${installedApps.length} installed apps`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getInstalledApps',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get installed apps',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getInstalledApps',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Get Marketplace Categories Action
    this.actions.set('getMarketplaceCategories', {
      id: 'getMarketplaceCategories',
      name: 'Get Marketplace Categories',
      description: 'Get all available marketplace categories',
      category: 'data',
      permissions: ['marketplace:read'],
      parameters: [],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const categories = [
            'Productivity',
            'Analytics',
            'Communication',
            'CRM',
            'E-commerce',
            'Finance',
            'Marketing',
            'Project Management',
            'Security',
            'Development Tools',
            'Integrations',
            'Utilities',
            'Other'
          ];

          return {
            success: true,
            data: { categories },
            message: `Found ${categories.length} categories`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getMarketplaceCategories',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get marketplace categories',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getMarketplaceCategories',
              userId: context.user.userId
            }
          };
        }
      }
    });
  }
}

// Export singleton instance
export const marketplacePageController = new MarketplacePageController();
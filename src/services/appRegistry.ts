import { RegisteredApp, AppManifest, AppRoute, AppNavigation, AppComponentProps } from '../types/app-framework';
import { OrgAppInstallation } from '../types/app-marketplace';
// No longer needed: import { todoAppManifest } from '../components/app-framework/examples/todo-app-manifest';
// No longer needed: import { TodoAppDashboard, TodoAppSettings } from '../components/app-framework/examples/TodoApp';
import React from 'react';
import { callCloudFunctionForArray } from '../utils/apiUtils'; // For fetching installed apps
import { AppMarketplaceFilters, OrgAppInstallationFilters } from './api/appMarketplace'; // Assuming these types are needed


export class AppRegistryService {
  private static instance: AppRegistryService;
  private registeredApps: Map<string, RegisteredApp> = new Map();

  static getInstance(): AppRegistryService {
    if (!AppRegistryService.instance) {
      AppRegistryService.instance = new AppRegistryService();
    }
    return AppRegistryService.instance;
  }

  /**
   * Register an app with its manifest and components
   */
  registerApp(
    manifest: AppManifest,
    installation: OrgAppInstallation,
    components: Map<string, React.ComponentType<AppComponentProps>>
  ): void {
    const registeredApp: RegisteredApp = {
      manifest,
      installation,
      components,
      isActive: installation.status === 'active'
    };

    this.registeredApps.set(manifest.id, registeredApp);
    console.log(`App registered: ${manifest.name} (${manifest.id})`);
  }

  /**
   * Unregister an app
   */
  unregisterApp(appId: string): void {
    if (this.registeredApps.delete(appId)) {
      console.log(`App unregistered: ${appId}`);
    }
  }

  /**
   * Get a registered app by ID
   */
  getApp(appId: string): RegisteredApp | undefined {
    return this.registeredApps.get(appId);
  }

  /**
   * Get all registered apps
   */
  getAllApps(): Map<string, RegisteredApp> {
    return new Map(this.registeredApps);
  }

  /**
   * Get active apps only
   */
  getActiveApps(): Map<string, RegisteredApp> {
    const activeApps = new Map<string, RegisteredApp>();
    
    this.registeredApps.forEach((app, id) => {
      if (app.isActive) {
        activeApps.set(id, app);
      }
    });
    
    return activeApps;
  }

  /**
   * Update app status
   */
  updateAppStatus(appId: string, isActive: boolean): void {
    const app = this.registeredApps.get(appId);
    if (app) {
      app.isActive = isActive;
      console.log(`App ${appId} status updated: ${isActive ? 'active' : 'inactive'}`);
    }
  }


  /**
   * Get all routes from registered apps
   */
  getAllAppRoutes(): Array<{ appId: string; route: AppRoute; type: 'admin' | 'user' }> {
    const routes: Array<{ appId: string; route: AppRoute; type: 'admin' | 'user' }> = [];

    this.registeredApps.forEach((app, appId) => {
      if (app.isActive) {
        // Admin routes
        if (app.manifest.adminUI?.enabled && app.manifest.adminUI.routes) {
          app.manifest.adminUI.routes.forEach(route => {
            routes.push({ appId, route, type: 'admin' });
          });
        }

        // User routes
        if (app.manifest.userUI?.enabled && app.manifest.userUI.routes) {
          app.manifest.userUI.routes.forEach(route => {
            routes.push({ appId, route, type: 'user' });
          });
        }
      }
    });

    return routes;
  }

  /**
   * Get navigation items from registered apps
   */
  getAllAppNavigation(): Array<{ appId: string; navigation: AppNavigation; type: 'admin' | 'user' }> {
    const navigation: Array<{ appId: string; navigation: AppNavigation; type: 'admin' | 'user' }> = [];

    this.registeredApps.forEach((app, appId) => {
      if (app.isActive) {
        // Admin navigation
        if (app.manifest.adminUI?.enabled && app.manifest.adminUI.navigation) {
          app.manifest.adminUI.navigation.forEach(nav => {
            navigation.push({ appId, navigation: nav, type: 'admin' });
          });
        }

        // User navigation (if enabled)
        if (app.manifest.userUI?.enabled && app.manifest.userUI.routes) {
          // Generate navigation from routes if no explicit navigation defined
          app.manifest.userUI.routes.forEach(route => {
            navigation.push({ 
              appId, 
              navigation: {
                label: route.title,
                path: route.path,
                order: 999 // Default order for user routes
              }, 
              type: 'user' 
            });
          });
        }
      }
    });

    return navigation.sort((a, b) => (a.navigation.order || 999) - (b.navigation.order || 999));
  }

  /**
   * Load apps from organization's installed apps
   */
  async loadAppsForOrganization(orgId: string): Promise<void> {
    try {
      // Fetch installed apps for the organization from the Parse backend
      const installedAppsResponse = await callCloudFunctionForArray<OrgAppInstallation>(
        'fetchOrgAppInstallations',
        { organizationId: orgId } as OrgAppInstallationFilters,
        { errorMessage: 'Failed to fetch installed apps for organization' }
      );

      const installedApps = installedAppsResponse.data || []; // Access the data array

      // Register each fetched app
      installedApps.forEach(installation => {
        // Here, you would dynamically load manifest and components based on installation.appDefinition.id and installation.installedVersion
        // For demonstration, let's assume a generic manifest and no components are loaded for now.
        // This is a placeholder for actual dynamic app loading logic.
        const manifest: AppManifest = {
          id: installation.appDefinition.id,
          name: installation.appDefinition.name,
          description: installation.appDefinition.description || 'No description provided', // Added missing description
          version: installation.installedVersion.versionString,
          publisher: installation.appDefinition.publisherName || 'Unknown',
          framework: { // Provide required framework properties
            version: '1.0.0',
            compatibility: ['1.0.0'] // Assuming a default compatibility
          },
          adminUI: { // Provide required adminUI properties
            enabled: false,
            routes: [],
            navigation: [],
            permissions: []
          },
          userUI: { // Provide required userUI properties
            enabled: false,
            routes: []
          }
        };
        this.registerApp(manifest, installation, new Map()); // No components loaded dynamically yet
      });
      
      console.log(`Successfully loaded and registered ${installedApps.length} apps for organization: ${orgId}`);
    } catch (error) {
      console.error('Failed to load apps for organization:', error);
      throw error; // Re-throw to propagate the error if necessary
    }
  }

  /**
   * Validate app manifest
   */
  validateManifest(manifest: AppManifest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!manifest.id) errors.push('App ID is required');
    if (!manifest.name) errors.push('App name is required');
    if (!manifest.version) errors.push('App version is required');
    if (!manifest.publisher) errors.push('App publisher is required');

    // Framework compatibility
    if (!manifest.framework?.version) {
      errors.push('Framework version is required');
    }

    // At least one UI type should be enabled
    if (!manifest.adminUI?.enabled && !manifest.userUI?.enabled) {
      errors.push('At least one UI type (admin or user) must be enabled');
    }

    // Validate routes if UI is enabled
    if (manifest.adminUI?.enabled && (!manifest.adminUI.routes || manifest.adminUI.routes.length === 0)) {
      errors.push('Admin UI is enabled but no routes are defined');
    }

    if (manifest.userUI?.enabled && (!manifest.userUI.routes || manifest.userUI.routes.length === 0)) {
      errors.push('User UI is enabled but no routes are defined');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const appRegistry = AppRegistryService.getInstance();
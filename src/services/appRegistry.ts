import { RegisteredApp, AppManifest, AppRoute, AppNavigation, AppComponentProps } from '../types/app-framework';
import { OrgAppInstallation } from '../types/app-marketplace';
import { todoAppManifest } from '../components/app-framework/examples/todo-app-manifest';
import { TodoAppDashboard, TodoAppSettings } from '../components/app-framework/examples/TodoApp';
import React from 'react';

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
   * Initialize built-in apps for demonstration
   */
  initializeBuiltInApps(): void {
    // Create a mock installation for the Todo app
    const todoInstallation: OrgAppInstallation = {
      objectId: 'todo-installation-1',
      organization: { objectId: 'org-1', __type: 'Pointer', className: 'Organization' },
      appDefinition: {
        id: todoAppManifest.id,
        objectId: todoAppManifest.id,
        name: todoAppManifest.name,
        description: todoAppManifest.description,
        publisherName: todoAppManifest.publisher,
        category: 'productivity',
        status: 'published'
      },
      installedVersion: {
        id: 'todo-v1.0.0',
        objectId: 'todo-v1.0.0',
        versionString: todoAppManifest.version,
        status: 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      installationDate: new Date().toISOString(),
      status: 'active',
      appSpecificConfig: {
        autoArchive: false,
        maxTodos: 100,
        reminderEnabled: false,
        categories: ['Work', 'Personal', 'Shopping']
      },
      installedBy: { objectId: 'user-1', __type: 'Pointer', className: '_User' }
    };

    // Create component map for Todo app
    const todoComponents = new Map<string, React.ComponentType<AppComponentProps>>();
    todoComponents.set('TodoAppDashboard', TodoAppDashboard);
    todoComponents.set('TodoAppSettings', TodoAppSettings);

    // Register the Todo app
    this.registerApp(todoAppManifest, todoInstallation, todoComponents);
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
      // In a real implementation, this would fetch from Parse Cloud Function
      // const installedApps = await Parse.Cloud.run('getInstalledAppsForOrg', { orgId });
      
      // For now, just initialize built-in apps
      this.initializeBuiltInApps();
      
      console.log(`Loaded apps for organization: ${orgId}`);
    } catch (error) {
      console.error('Failed to load apps for organization:', error);
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
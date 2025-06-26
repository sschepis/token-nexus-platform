// src/controllers/registerControllers.ts

import { ControllerRegistry } from './ControllerRegistry';
// Export a singleton instance of ControllerRegistry
export const controllerRegistry = new ControllerRegistry();

// Track initialization state to prevent duplicate registrations
let isInitialized = false;

// Import all page controllers
import { objectManagerPageController } from './ObjectManagerPageController';
import { dashboardPageController } from './DashboardPageController';
import { cloudFunctionsPageController } from './CloudFunctionsPageController';
import { pageBuilderPageController } from './PageBuilderPageController';
import { reportsPageController } from './ReportsPageController';
import { integrationsPageController } from './IntegrationsPageController';
import { marketplacePageController } from './MarketplacePageController';
import { notificationsPageController } from './NotificationsPageController';
import { auditLogsPageController } from './AuditLogsPageController';
import { tokensPageController } from './TokensPageController';
import { aiAssistantPageController } from './AIAssistantPageController';
import { settingsPageController } from './SettingsPageController';
import { ThemePageController } from './ThemePageController';
import { workflowPageController } from './WorkflowPageController';
import { usersPageController } from './UsersPageController';
import { routesPageController } from './RoutesPageController';
import { orgLifecyclePageController } from './OrgLifecyclePageController';
import { mcpServersPageController } from './MCPServersPageController';

/**
 * Register all page controllers with the controller registry
 */
export function registerAllControllers(): void {
  console.log('[Controller Registration] Starting controller registration...');

  const controllers = [
    { name: 'usersPageController', controller: () => usersPageController },
    { name: 'routesPageController', controller: () => routesPageController },
    { name: 'objectManagerPageController', controller: () => objectManagerPageController },
    { name: 'dashboardPageController', controller: () => dashboardPageController },
    { name: 'cloudFunctionsPageController', controller: () => cloudFunctionsPageController },
    { name: 'pageBuilderPageController', controller: () => pageBuilderPageController },
    { name: 'reportsPageController', controller: () => reportsPageController },
    { name: 'integrationsPageController', controller: () => integrationsPageController },
    { name: 'marketplacePageController', controller: () => marketplacePageController },
    { name: 'notificationsPageController', controller: () => notificationsPageController },
    { name: 'auditLogsPageController', controller: () => auditLogsPageController },
    { name: 'tokensPageController', controller: () => tokensPageController },
    { name: 'aiAssistantPageController', controller: () => aiAssistantPageController },
    { name: 'settingsPageController', controller: () => settingsPageController },
    { name: 'themePageController', controller: () => new ThemePageController() },
    { name: 'workflowPageController', controller: () => workflowPageController },
    { name: 'orgLifecyclePageController', controller: () => orgLifecyclePageController },
    { name: 'mcpServersPageController', controller: () => mcpServersPageController }
  ];

  let registeredCount = 0;
  const failedControllers: string[] = [];

  for (const { name, controller } of controllers) {
    try {
      console.log(`[DEBUG] Registering ${name}...`);
      const controllerInstance = controller();
      console.log(`[DEBUG] ${name} instance:`, controllerInstance);
      console.log(`[DEBUG] ${name} pageId:`, controllerInstance.pageId);
      console.log(`[DEBUG] ${name} actions:`, Array.from(controllerInstance.actions.keys()));
      
      // Special debug for dashboard controller
      if (name === 'dashboardPageController') {
        console.log(`[DEBUG] Dashboard controller details:`, {
          pageId: controllerInstance.pageId,
          actionCount: controllerInstance.actions.size,
          actionKeys: Array.from(controllerInstance.actions.keys()),
          hasGetDashboardOverview: controllerInstance.actions.has('getDashboardOverview')
        });
      }
      
      controllerRegistry.registerPageController(controllerInstance);
      console.log(`[DEBUG] ✓ ${name} registered successfully with ${controllerInstance.actions.size} actions`);
      registeredCount++;
    } catch (error) {
      console.error(`[DEBUG] ❌ Failed to register ${name}:`, error);
      console.error(`[DEBUG] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      failedControllers.push(name);
      // Continue with other controllers instead of failing completely
    }
  }

  console.log(`[Controller Registration] Complete: ${registeredCount}/${controllers.length} successful`);
  
  if (failedControllers.length > 0) {
    console.warn('Failed controllers:', failedControllers);
  }

  // Log registration statistics
  try {
    const stats = controllerRegistry.getStatistics();
    console.log('Controller Registry Statistics:', stats);
  } catch (error) {
    console.error('Error getting controller registry statistics:', error);
  }
}

/**
 * Get the controller registry instance
 */
export function getControllerRegistry() {
  return controllerRegistry;
}

/**
 * Initialize controllers - call this during app startup
 */
export function initializeControllers(): void {
  if (isInitialized) {
    console.warn('[Controller Registration] Controllers already initialized, skipping...');
    return;
  }
  
  registerAllControllers();
  
  // Explicitly initialize routesPageController if needed, after registration
  routesPageController.initialize();
  
  isInitialized = true;
  console.log('[Controller Initialization] Controllers initialized successfully');
}

/**
 * Reset initialization state (useful for testing or hot reload)
 */
export function resetControllerInitialization(): void {
  isInitialized = false;
  console.log('[Controller Registration] Initialization state reset');
}
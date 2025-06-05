// src/controllers/registerControllers.ts

import { controllerRegistry } from './ControllerRegistry';

// Import all page controllers
import { usersPageController } from './UsersPageController';
import { objectManagerPageController } from './ObjectManagerPageController';
import { dashboardPageController } from './DashboardPageController';
import { routesPageController } from './RoutesPageController';
import { cloudFunctionsPageController } from './CloudFunctionsPageController';
import { pageBuilderPageController } from './PageBuilderPageController';
import { componentLibraryPageController } from './ComponentLibraryPageController';
import { reportsPageController } from './ReportsPageController';
import { integrationsPageController } from './IntegrationsPageController';
import { marketplacePageController } from './MarketplacePageController';
import { notificationsPageController } from './NotificationsPageController';
import { auditLogsPageController } from './AuditLogsPageController';
import { tokensPageController } from './TokensPageController';
import { aiAssistantPageController } from './AIAssistantPageController';
import { settingsPageController } from './SettingsPageController';
import { themePageController } from './ThemePageController';
import { workflowPageController } from './WorkflowPageController';

/**
 * Register all page controllers with the controller registry
 */
export function registerAllControllers(): void {
  console.log('Registering all page controllers...');

  const controllers = [
    { name: 'usersPageController', controller: () => usersPageController.getPageController() },
    { name: 'objectManagerPageController', controller: () => objectManagerPageController },
    { name: 'dashboardPageController', controller: () => dashboardPageController },
    { name: 'routesPageController', controller: () => routesPageController },
    { name: 'cloudFunctionsPageController', controller: () => cloudFunctionsPageController },
    { name: 'pageBuilderPageController', controller: () => pageBuilderPageController },
    { name: 'componentLibraryPageController', controller: () => componentLibraryPageController },
    { name: 'reportsPageController', controller: () => reportsPageController },
    { name: 'integrationsPageController', controller: () => integrationsPageController },
    { name: 'marketplacePageController', controller: () => marketplacePageController },
    { name: 'notificationsPageController', controller: () => notificationsPageController },
    { name: 'auditLogsPageController', controller: () => auditLogsPageController },
    { name: 'tokensPageController', controller: () => tokensPageController },
    { name: 'aiAssistantPageController', controller: () => aiAssistantPageController },
    { name: 'settingsPageController', controller: () => settingsPageController },
    { name: 'themePageController', controller: () => themePageController },
    { name: 'workflowPageController', controller: () => workflowPageController }
  ];

  let registeredCount = 0;
  const failedControllers: string[] = [];

  for (const { name, controller } of controllers) {
    try {
      console.log(`Registering ${name}...`);
      const controllerInstance = controller();
      controllerRegistry.registerPageController(controllerInstance);
      console.log(`✓ ${name} registered successfully`);
      registeredCount++;
    } catch (error) {
      console.error(`❌ Failed to register ${name}:`, error);
      failedControllers.push(name);
      // Continue with other controllers instead of failing completely
    }
  }

  console.log(`Controller registration complete: ${registeredCount}/${controllers.length} successful`);
  
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
  registerAllControllers();
  
  // Add any additional initialization logic here
  console.log('Controllers initialized successfully');
}
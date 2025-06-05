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

  try {
    // Register core controllers - note: usersPageController needs .getPageController() call
    controllerRegistry.registerPageController(usersPageController.getPageController());
    controllerRegistry.registerPageController(objectManagerPageController);
    controllerRegistry.registerPageController(dashboardPageController);
    controllerRegistry.registerPageController(routesPageController);
    controllerRegistry.registerPageController(cloudFunctionsPageController);

    // Register new controllers
    controllerRegistry.registerPageController(pageBuilderPageController);
    controllerRegistry.registerPageController(componentLibraryPageController);
    controllerRegistry.registerPageController(reportsPageController);
    controllerRegistry.registerPageController(integrationsPageController);
    controllerRegistry.registerPageController(marketplacePageController);
    controllerRegistry.registerPageController(notificationsPageController);
    controllerRegistry.registerPageController(auditLogsPageController);
    controllerRegistry.registerPageController(tokensPageController);
    controllerRegistry.registerPageController(aiAssistantPageController);
    controllerRegistry.registerPageController(settingsPageController);
    controllerRegistry.registerPageController(themePageController);
    controllerRegistry.registerPageController(workflowPageController);

    console.log('All page controllers registered successfully');

    // Log registration statistics
    const stats = controllerRegistry.getStatistics();
    console.log('Controller Registry Statistics:', stats);

  } catch (error) {
    console.error('Error registering controllers:', error);
    throw error;
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
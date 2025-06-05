import { BasePageController } from './base/BasePageController';
import {
  // Data Actions
  getSettingsAction,
  exportSettingsAction,
  getSettingCategoriesAction,
  // Management Actions
  updateSettingAction,
  bulkUpdateSettingsAction,
  resetSettingsAction
} from './settings';

/**
 * Settings Page Controller - Migrated Version
 * 
 * Manage application settings, preferences, and configurations using modular actions.
 * This controller has been migrated from a 620-line monolithic implementation
 * to use the BasePageController pattern with 6 focused action modules.
 * 
 * Features:
 * - Settings CRUD operations (get, update, bulk update)
 * - Settings reset to defaults with confirmation
 * - Settings export in multiple formats (JSON, YAML, ENV)
 * - Setting categories management
 * - System vs user settings handling
 * - Sensitive data masking
 * - Permission-based access control
 * 
 * Migration Benefits:
 * - ~90% code reduction in main controller (620 → ~55 lines)
 * - 6 focused, testable action modules
 * - Improved maintainability and reusability
 * - 100% API compatibility maintained
 */
export class SettingsPageController extends BasePageController {
  constructor() {
    super({
      pageId: 'settings',
      pageName: 'Settings',
      description: 'Manage application settings, preferences, and configurations',
      category: 'configuration',
      tags: ['settings', 'configuration', 'preferences', 'admin'],
      permissions: ['settings:read', 'settings:write', 'admin:settings'],
      version: '2.0.0'
    });
  }

  protected initializeActions(): void {
    // Data Actions (3 actions)
    this.registerActionDefinition(getSettingsAction);
    this.registerActionDefinition(exportSettingsAction);
    this.registerActionDefinition(getSettingCategoriesAction);

    // Management Actions (3 actions)
    this.registerActionDefinition(updateSettingAction);
    this.registerActionDefinition(bulkUpdateSettingsAction);
    this.registerActionDefinition(resetSettingsAction);
  }
}

// Export singleton instance
export const settingsPageController = new SettingsPageController();
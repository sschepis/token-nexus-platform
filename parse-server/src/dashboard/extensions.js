/**
 * Dashboard Extension Manager
 * Integrates with IntegrationService to provide dashboard-specific extensions
 */

const logger = require('../utils/logger');
const integrationService = require('../services/IntegrationService');

class DashboardExtensionManager {
  constructor() {
    this.scripts = new Map();
    this.infoPanels = new Map();
    this.customRoutes = new Map();
    this.initialized = false;
  }

  /**
   * Initialize dashboard extensions
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Ensure integration service is initialized
      if (!integrationService.initialized) {
        await integrationService.initialize();
      }

      // Load dashboard extensions from integration service
      const extensions = Array.from(integrationService.extensions.values()).filter(
        ext => ext.status === 'active' && ext.type === 'dashboard'
      );

      // Register extensions
      for (const extension of extensions) {
        await this.registerExtension(extension);
      }

      this.initialized = true;
      logger.info('Dashboard extensions initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize dashboard extensions:', error);
      throw error;
    }
  }

  /**
   * Register a dashboard extension
   * @param {Object} extension Extension configuration
   */
  async registerExtension(extension) {
    try {
      await Promise.all([
        // Register scripts
        extension.scripts?.forEach(script => {
          this.scripts.set(script.id, {
            ...script,
            extensionId: extension.id,
          });
        }),

        // Register info panels
        extension.infoPanels?.forEach(panel => {
          this.infoPanels.set(panel.id, {
            ...panel,
            extensionId: extension.id,
          });
        }),

        // Register custom routes
        extension.routes?.forEach(route => {
          this.customRoutes.set(route.path, {
            ...route,
            extensionId: extension.id,
          });
        }),
      ]);

      logger.info(`Dashboard extension ${extension.id} registered successfully`);
    } catch (error) {
      logger.error(`Failed to register dashboard extension ${extension.id}:`, error);
      throw error;
    }
  }

  /**
   * Get all registered scripts
   * @return {Array} Array of script configurations
   */
  getScripts() {
    return Array.from(this.scripts.values()).map(script => ({
      title: script.title,
      classes: script.classes,
      cloudCodeFunction: script.cloudCodeFunction,
      showConfirmationDialog: script.showConfirmationDialog,
      confirmationDialogStyle: script.confirmationDialogStyle,
    }));
  }

  /**
   * Get all registered info panels
   * @return {Array} Array of info panel configurations
   */
  getInfoPanels() {
    return Array.from(this.infoPanels.values()).map(panel => ({
      title: panel.title,
      classes: panel.classes,
      cloudCodeFunction: panel.cloudCodeFunction,
    }));
  }

  /**
   * Get all registered custom routes
   * @return {Array} Array of route configurations
   */
  getCustomRoutes() {
    return Array.from(this.customRoutes.values());
  }

  /**
   * Get dashboard configuration with extensions
   * @param {Object} baseConfig Base dashboard configuration
   * @return {Object} Extended dashboard configuration
   */
  extendDashboardConfig(baseConfig) {
    return {
      ...baseConfig,
      apps: baseConfig.apps.map(app => ({
        ...app,
        scripts: [...this.getScripts(), ...(app.scripts || [])],
        infoPanel: [...this.getInfoPanels(), ...(app.infoPanel || [])],
      })),
    };
  }
}

// Export singleton instance
module.exports = new DashboardExtensionManager();

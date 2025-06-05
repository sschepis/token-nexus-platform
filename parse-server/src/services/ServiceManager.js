/**
 * Service Manager
 * Handles service lifecycle, initialization order, and dependency management
 */

class ServiceManager {
  constructor() {
    this.services = new Map();
    this.initialized = false;
    this.initializationOrder = [
      'Cache', // Base infrastructure
      'Analytics', // Core services
      'AI',
      'Media', // Asset handling
      'Optimization',
      'Content', // Business logic
    ];
  }

  /**
   * Initialize all services in correct order
   * @param {Object} config Service configuration
   */
  async initialize(config = {}) {
    if (this.initialized) {
      console.warn('ServiceManager is already initialized');
      return;
    }

    try {
      // Try to load services
      const services = {
        Cache: this._tryRequire('./CacheService'),
        Content: this._tryRequire('./ContentService'),
        Optimization: this._tryRequire('./OptimizationService'),
        AI: this._tryRequire('./AIService'),
        Analytics: this._tryRequire('./AnalyticsService'),
        Media: this._tryRequire('../media/MediaManager'),
      };

      // Register only services that exist
      Object.entries(services).forEach(([name, service]) => {
        if (service) {
          this.services.set(name, service);
        }
      });

      // Initialize available services in order
      for (const serviceName of this.initializationOrder) {
        const service = this.services.get(serviceName);
        if (service) {
          try {
            console.log(`Initializing ${serviceName} service...`);
            await service.initialize(config[serviceName.toLowerCase()] || {});
            console.log(`${serviceName} service initialized successfully`);
          } catch (error) {
            console.error(`Failed to initialize ${serviceName} service:`, error);
            // Continue with other services even if one fails
          }
        }
      }

      this.initialized = true;
      console.log('Service initialization completed');
    } catch (error) {
      console.error('Service initialization failed:', error);
      // Don't throw error to allow Parse Server to continue running
    }
  }

  /**
   * Try to require a module, return null if not found
   * @private
   */
  _tryRequire(path) {
    try {
      return require(path);
    } catch (error) {
      console.log(`Optional service module not found: ${path}`);
      return null;
    }
  }

  /**
   * Get service instance
   * @param {string} name Service name
   * @returns {Object} Service instance
   */
  getService(name) {
    const service = this.services.get(name);
    if (!service) {
      console.warn(`Service ${name} not found`);
      return null;
    }
    if (!service.initialized) {
      console.warn(`Service ${name} is not initialized`);
      return null;
    }
    return service;
  }

  /**
   * Check service health
   * @returns {Object} Health status for all services
   */
  async checkHealth() {
    const health = {
      status: 'ok',
      services: {},
    };

    for (const [name, service] of this.services.entries()) {
      try {
        health.services[name] = {
          status: service.initialized ? 'healthy' : 'not initialized',
          initialized: service.initialized,
        };
      } catch (error) {
        health.services[name] = {
          status: 'error',
          error: error.message,
        };
      }
    }

    return health;
  }

  /**
   * Shutdown all services in reverse order
   */
  async shutdown() {
    if (!this.initialized) return;

    console.log('Shutting down services...');

    // Shutdown in reverse order
    for (const serviceName of [...this.initializationOrder].reverse()) {
      const service = this.services.get(serviceName);
      if (service?.initialized) {
        try {
          console.log(`Shutting down ${serviceName} service...`);
          await service.shutdown();
        } catch (error) {
          console.error(`Error shutting down ${serviceName} service:`, error);
        }
      }
    }

    this.initialized = false;
    console.log('Service shutdown completed');
  }
}

// Create and export singleton instance
module.exports = new ServiceManager();

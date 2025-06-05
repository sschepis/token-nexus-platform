const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');
const { validateConfig } = require('../utils/validation');

/**
 * Migrates application configurations between different versions and formats
 */
class ConfigurationMigrator {
  /**
   * Migrate configuration from one version to another
   * @param {Object} options Migration options
   * @param {string} options.sourcePath Source configuration file path
   * @param {string} options.targetPath Target configuration file path
   * @param {string} options.sourceVersion Source configuration version
   * @param {string} options.targetVersion Target configuration version
   * @param {Object} options.transforms Custom transformation functions
   * @return {Promise<Object>} Migration result
   */
  async migrate(options) {
    const { sourcePath, targetPath, sourceVersion, targetVersion, transforms = {} } = options;

    try {
      // Read source configuration
      const sourceConfig = await this.readConfig(sourcePath);

      // Migrate configuration
      const migratedConfig = await this.migrateConfig(
        sourceConfig,
        sourceVersion,
        targetVersion,
        transforms
      );

      // Validate migrated configuration
      const validationResult = await validateConfig(migratedConfig, targetVersion);

      if (!validationResult.isValid) {
        throw new Error(`Invalid configuration: ${validationResult.errors.join(', ')}`);
      }

      // Save migrated configuration
      await this.saveConfig(targetPath, migratedConfig);

      return {
        success: true,
        config: migratedConfig,
        validation: validationResult,
      };
    } catch (error) {
      logger.error('Configuration migration failed', {
        error: error.message,
        source: sourcePath,
        sourceVersion,
        targetVersion,
      });
      throw error;
    }
  }

  /**
   * Read configuration from file
   * @param {string} configPath Configuration file path
   * @return {Promise<Object>} Configuration object
   */
  async readConfig(configPath) {
    const content = await fs.readFile(configPath, 'utf8');

    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid configuration JSON: ${error.message}`);
    }
  }

  /**
   * Save configuration to file
   * @param {string} targetPath Target file path
   * @param {Object} config Configuration object
   */
  async saveConfig(targetPath, config) {
    const content = JSON.stringify(config, null, 2);

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content, 'utf8');
  }

  /**
   * Migrate configuration between versions
   * @param {Object} config Source configuration
   * @param {string} sourceVersion Source version
   * @param {string} targetVersion Target version
   * @param {Object} transforms Custom transformations
   * @return {Object} Migrated configuration
   */
  migrateConfig(config, sourceVersion, targetVersion, transforms) {
    // Handle different version migrations
    switch (`${sourceVersion}->${targetVersion}`) {
      case '1.0->2.0':
        return this.migrateV1ToV2(config, transforms);
      case '2.0->3.0':
        return this.migrateV2ToV3(config, transforms);
      default:
        throw new Error(`Unsupported migration: ${sourceVersion} to ${targetVersion}`);
    }
  }

  /**
   * Migrate v1 configuration to v2
   * @param {Object} config V1 configuration
   * @param {Object} transforms Custom transformations
   * @return {Object} V2 configuration
   */
  migrateV1ToV2(config, transforms) {
    const { app, database, storage, services = {}, security = {}, ...rest } = config;

    // Apply custom transforms
    const transformedApp = transforms.app?.(app) || app;
    const transformedDb = transforms.database?.(database) || database;
    const transformedStorage = transforms.storage?.(storage) || storage;

    return {
      version: '2.0',
      metadata: {
        migratedFrom: '1.0',
        migratedAt: new Date().toISOString(),
      },
      application: {
        ...transformedApp,
        settings: this.migrateSettings(app.settings || {}),
      },
      infrastructure: {
        database: {
          ...transformedDb,
          poolSize: database.poolSize || 10,
          ssl: database.ssl || false,
        },
        storage: {
          ...transformedStorage,
          cdn: storage.cdn || { enabled: false },
        },
        cache: this.migrateCacheConfig(rest.cache),
      },
      services: this.migrateServices(services),
      security: this.migrateSecurityConfig(security),
    };
  }

  /**
   * Migrate v2 configuration to v3
   * @param {Object} config V2 configuration
   * @param {Object} transforms Custom transformations
   * @return {Object} V3 configuration
   */
  migrateV2ToV3(config, transforms) {
    const { application, infrastructure, services, security } = config;

    // Apply custom transforms
    const transformedApp = transforms.application?.(application) || application;
    const transformedInfra = transforms.infrastructure?.(infrastructure) || infrastructure;

    return {
      version: '3.0',
      metadata: {
        migratedFrom: '2.0',
        migratedAt: new Date().toISOString(),
        schema: 'https://schema.gemcms.com/config/v3',
      },
      spec: {
        application: {
          ...transformedApp,
          resources: this.migrateResourceLimits(application.resources),
        },
        infrastructure: {
          ...transformedInfra,
          monitoring: this.createMonitoringConfig(infrastructure),
        },
        services: this.migrateServicesV3(services),
        security: this.migrateSecurityV3(security),
      },
      status: {
        phase: 'Pending',
        conditions: [],
      },
    };
  }

  /**
   * Migrate application settings
   * @param {Object} settings Original settings
   * @return {Object} Migrated settings
   */
  migrateSettings(settings) {
    return {
      ...settings,
      features: this.migrateFeatures(settings.features || {}),
      theme: this.migrateTheme(settings.theme || {}),
      localization: settings.localization || { defaultLocale: 'en' },
    };
  }

  /**
   * Migrate feature configurations
   * @param {Object} features Feature settings
   * @return {Object} Migrated features
   */
  migrateFeatures(features) {
    const result = {};

    for (const [key, value] of Object.entries(features)) {
      result[key] = {
        enabled: value.enabled !== false,
        config: value.config || {},
        restrictions: value.restrictions || [],
      };
    }

    return result;
  }

  /**
   * Migrate theme configuration
   * @param {Object} theme Theme settings
   * @return {Object} Migrated theme
   */
  migrateTheme(theme) {
    return {
      name: theme.name || 'default',
      variables: theme.variables || {},
      components: theme.components || {},
      assets: theme.assets || { path: '/assets' },
    };
  }

  /**
   * Migrate cache configuration
   * @param {Object} cache Cache settings
   * @return {Object} Migrated cache config
   */
  migrateCacheConfig(cache = {}) {
    return {
      enabled: cache.enabled !== false,
      provider: cache.provider || 'redis',
      ttl: cache.ttl || 3600,
      prefix: cache.prefix || 'gemcms:',
      cluster: cache.cluster || { enabled: false },
    };
  }

  /**
   * Migrate service configurations
   * @param {Object} services Service settings
   * @return {Object} Migrated services
   */
  migrateServices(services) {
    return {
      email: this.migrateEmailService(services.email),
      storage: this.migrateStorageService(services.storage),
      search: this.migrateSearchService(services.search),
      analytics: services.analytics || { enabled: false },
    };
  }

  /**
   * Migrate email service configuration
   * @param {Object} email Email settings
   * @return {Object} Migrated email config
   */
  migrateEmailService(email = {}) {
    return {
      enabled: email.enabled !== false,
      provider: email.provider || 'smtp',
      from: email.from || 'no-reply@gemcms.com',
      templates: email.templates || { path: '/templates/email' },
    };
  }

  /**
   * Migrate storage service configuration
   * @param {Object} storage Storage settings
   * @return {Object} Migrated storage config
   */
  migrateStorageService(storage = {}) {
    return {
      enabled: storage.enabled !== false,
      provider: storage.provider || 's3',
      bucket: storage.bucket || 'gemcms-files',
      path: storage.path || '/uploads',
      cdn: storage.cdn || { enabled: false },
    };
  }

  /**
   * Migrate search service configuration
   * @param {Object} search Search settings
   * @return {Object} Migrated search config
   */
  migrateSearchService(search = {}) {
    return {
      enabled: search.enabled !== false,
      provider: search.provider || 'elasticsearch',
      index: search.index || 'gemcms',
      settings: search.settings || {},
    };
  }

  /**
   * Migrate security configuration
   * @param {Object} security Security settings
   * @return {Object} Migrated security config
   */
  migrateSecurityConfig(security) {
    return {
      authentication: this.migrateAuthConfig(security.authentication),
      authorization: this.migrateAuthzConfig(security.authorization),
      encryption: security.encryption || { enabled: true },
      headers: security.headers || { enabled: true },
    };
  }

  /**
   * Create monitoring configuration
   * @param {Object} infrastructure Infrastructure settings
   * @return {Object} Monitoring config
   */
  createMonitoringConfig(_infrastructure) {
    return {
      metrics: {
        enabled: true,
        interval: '1m',
        retention: '7d',
      },
      logging: {
        enabled: true,
        level: 'info',
        format: 'json',
      },
      alerts: {
        enabled: true,
        providers: ['email'],
      },
    };
  }

  /**
   * Migrate resource limits
   * @param {Object} resources Resource settings
   * @return {Object} Migrated resource limits
   */
  migrateResourceLimits(resources = {}) {
    return {
      compute: {
        cpu: resources.cpu || '100m',
        memory: resources.memory || '128Mi',
      },
      storage: {
        size: resources.storage || '1Gi',
        files: resources.files || 1000,
      },
    };
  }
}

module.exports = new ConfigurationMigrator();

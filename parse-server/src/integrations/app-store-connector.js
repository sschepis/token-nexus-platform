const axios = require('axios');
const { logger } = require('../utils/logger');
const { validateApp } = require('../utils/validation');
const { AppError } = require('../utils/errors');

/**
 * Handles integration with external app stores and marketplaces
 */
class AppStoreConnector {
  constructor() {
    this.connectors = new Map();
    this.registeredStores = new Set();
  }

  /**
   * Register an external app store
   * @param {Object} options Store configuration
   * @param {string} options.name Store identifier
   * @param {string} options.baseUrl Store API base URL
   * @param {Object} options.auth Authentication details
   * @param {Object} options.mapping Field mapping configuration
   * @return {Promise<void>}
   */
  async registerStore(options) {
    const { name, baseUrl, auth, mapping } = options;

    if (this.registeredStores.has(name)) {
      throw new AppError('STORE_EXISTS', `Store ${name} is already registered`);
    }

    const connector = {
      name,
      baseUrl,
      auth,
      mapping,
      client: axios.create({
        baseURL: baseUrl,
        headers: this.buildAuthHeaders(auth),
      }),
    };

    try {
      // Verify connection
      await this.testConnection(connector);

      this.connectors.set(name, connector);
      this.registeredStores.add(name);

      logger.info('App store registered successfully', {
        store: name,
        baseUrl,
      });
    } catch (error) {
      logger.error('Failed to register app store', {
        store: name,
        error: error.message,
      });
      throw new AppError('STORE_REGISTRATION_FAILED', error.message);
    }
  }

  /**
   * Search for apps in external store
   * @param {Object} options Search options
   * @param {string} options.store Store identifier
   * @param {string} options.query Search query
   * @param {Object} options.filters Search filters
   * @param {number} options.limit Result limit
   * @param {number} options.offset Result offset
   * @return {Promise<Object>} Search results
   */
  async searchApps(options) {
    const { store, query, filters = {}, limit = 10, offset = 0 } = options;

    const connector = this.getConnector(store);

    try {
      const response = await connector.client.get('/apps/search', {
        params: {
          q: query,
          ...filters,
          limit,
          offset,
        },
      });

      return {
        apps: response.data.results.map(app => this.mapAppData(app, connector.mapping)),
        total: response.data.total,
        limit,
        offset,
      };
    } catch (error) {
      logger.error('App search failed', {
        store,
        query,
        error: error.message,
      });
      throw new AppError('SEARCH_FAILED', error.message);
    }
  }

  /**
   * Get app details from external store
   * @param {Object} options Request options
   * @param {string} options.store Store identifier
   * @param {string} options.appId App identifier
   * @return {Promise<Object>} App details
   */
  async getAppDetails(options) {
    const { store, appId } = options;
    const connector = this.getConnector(store);

    try {
      const response = await connector.client.get(`/apps/${appId}`);

      return this.mapAppData(response.data, connector.mapping);
    } catch (error) {
      logger.error('Failed to get app details', {
        store,
        appId,
        error: error.message,
      });
      throw new AppError('APP_FETCH_FAILED', error.message);
    }
  }

  /**
   * Import app from external store
   * @param {Object} options Import options
   * @param {string} options.store Store identifier
   * @param {string} options.appId App identifier
   * @param {string} options.organizationId Target organization
   * @return {Promise<Object>} Imported app
   */
  async importApp(options) {
    const { store, appId, organizationId } = options;
    const connector = this.getConnector(store);

    try {
      // Get app details
      const appDetails = await this.getAppDetails({ store, appId });

      // Download app assets
      const assets = await this.downloadAssets(appDetails.assets, connector);

      // Transform app for import
      const transformedApp = await this.transformForImport(appDetails, {
        assets,
        organizationId,
        store,
      });

      // Validate transformed app
      const validationResult = await validateApp(transformedApp);

      if (!validationResult.isValid) {
        throw new Error(`Invalid app: ${validationResult.errors.join(', ')}`);
      }

      logger.info('App imported successfully', {
        store,
        appId,
        organization: organizationId,
      });

      return transformedApp;
    } catch (error) {
      logger.error('App import failed', {
        store,
        appId,
        error: error.message,
      });
      throw new AppError('IMPORT_FAILED', error.message);
    }
  }

  /**
   * Download app assets
   * @param {Object[]} assets Asset list
   * @param {Object} connector Store connector
   * @return {Promise<Object>} Downloaded assets
   */
  async downloadAssets(assets, connector) {
    const downloaded = {};

    for (const asset of assets) {
      try {
        const response = await connector.client.get(asset.url, {
          responseType: 'arraybuffer',
        });

        downloaded[asset.id] = {
          data: response.data,
          type: asset.type,
          name: asset.name,
        };
      } catch (error) {
        logger.warn('Asset download failed', {
          asset: asset.id,
          error: error.message,
        });
      }
    }

    return downloaded;
  }

  /**
   * Transform app data for import
   * @param {Object} app App data
   * @param {Object} context Import context
   * @return {Promise<Object>} Transformed app
   */
  async transformForImport(app, context) {
    const { assets, organizationId, store } = context;

    return {
      name: app.name,
      description: app.description,
      version: app.version,
      status: 'draft',
      organization: organizationId,
      source: {
        store,
        id: app.id,
        importedAt: new Date().toISOString(),
      },
      settings: this.transformSettings(app.settings),
      components: await this.transformComponents(app.components, assets),
      resources: this.transformResources(app.resources),
      metadata: {
        ...app.metadata,
        imported: true,
        originalId: app.id,
      },
    };
  }

  /**
   * Transform app settings
   * @param {Object} settings Original settings
   * @return {Object} Transformed settings
   */
  transformSettings(settings) {
    return {
      ...settings,
      imported: true,
      requiresConfiguration: true,
    };
  }

  /**
   * Transform app components
   * @param {Object[]} components Component list
   * @param {Object} assets Downloaded assets
   * @return {Promise<Object[]>} Transformed components
   */
  transformComponents(components, assets) {
    return Promise.all(
      components.map(async component => ({
        ...component,
        assets: await this.mapComponentAssets(component.assets, assets),
      }))
    );
  }

  /**
   * Map component assets to downloaded assets
   * @param {Object} componentAssets Component asset references
   * @param {Object} downloadedAssets Downloaded assets
   * @return {Promise<Object>} Mapped assets
   */
  async mapComponentAssets(componentAssets, downloadedAssets) {
    const mapped = {};

    for (const [key, assetId] of Object.entries(componentAssets)) {
      if (downloadedAssets[assetId]) {
        mapped[key] = await this.processAsset(downloadedAssets[assetId]);
      }
    }

    return mapped;
  }

  /**
   * Process downloaded asset
   * @param {Object} asset Asset data
   * @return {Promise<Object>} Processed asset
   */
  processAsset(asset) {
    // Process asset based on type
    switch (asset.type) {
      case 'image':
        return this.processImageAsset(asset);
      case 'script':
        return this.processScriptAsset(asset);
      default:
        return this.processGenericAsset(asset);
    }
  }

  /**
   * Transform app resources
   * @param {Object} resources Resource configuration
   * @return {Object} Transformed resources
   */
  transformResources(resources) {
    return {
      ...resources,
      imported: true,
      managed: true,
    };
  }

  /**
   * Map external app data to internal format
   * @param {Object} app External app data
   * @param {Object} mapping Field mapping
   * @return {Object} Mapped app data
   */
  mapAppData(app, mapping) {
    const result = {};

    for (const [targetField, sourceField] of Object.entries(mapping)) {
      if (typeof sourceField === 'string') {
        result[targetField] = app[sourceField];
      } else if (typeof sourceField === 'function') {
        result[targetField] = sourceField(app);
      }
    }

    return result;
  }

  /**
   * Get store connector
   * @param {string} store Store identifier
   * @return {Object} Store connector
   */
  getConnector(store) {
    const connector = this.connectors.get(store);

    if (!connector) {
      throw new AppError('STORE_NOT_FOUND', `Store ${store} not found`);
    }

    return connector;
  }

  /**
   * Build authentication headers
   * @param {Object} auth Authentication configuration
   * @return {Object} Headers object
   */
  buildAuthHeaders(auth) {
    const headers = {};

    switch (auth.type) {
      case 'bearer':
        headers.Authorization = `Bearer ${auth.token}`;
        break;
      case 'apiKey':
        headers[auth.header || 'X-API-Key'] = auth.key;
        break;
      case 'basic':
        headers.Authorization = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString(
          'base64'
        )}`;
        break;
    }

    return headers;
  }

  /**
   * Test store connection
   * @param {Object} connector Store connector
   * @return {Promise<void>}
   */
  async testConnection(connector) {
    try {
      await connector.client.get('/health');
    } catch (error) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }
}

module.exports = new AppStoreConnector();

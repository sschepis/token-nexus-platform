/**
 * Integration Service
 * Handles extensions, service connections, and webhooks
 */

const semver = require('semver');
const axios = require('axios');
const config = require('../config');

class IntegrationService {
  constructor() {
    // Default configuration if none provided
    const defaultConfig = {
      enabled: false,
      registry: {
        url: 'http://localhost:4000',
      },
      services: {},
      webhooks: {
        enabled: true,
        timeout: 5000,
      },
    };

    this.config = config.integration || defaultConfig;
    this.initialized = false;
    this.extensions = new Map();
    this.connections = new Map();
    this.webhooks = new Map();
  }

  /**
   * Initialize the integration service
   */
  async initialize() {
    // If integration is not configured, just mark as initialized but disabled
    if (!this.config || !this.config.enabled) {
      console.log('Integration service is disabled');
      this.initialized = true;
      return;
    }

    try {
      // Initialize extension registry
      await this._initializeExtensionRegistry();

      // Initialize service connections
      await this._initializeConnections();

      // Initialize webhook system
      await this._initializeWebhooks();

      this.initialized = true;
      console.log('Integration service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize integration service:', error);
      // Don't throw error, just mark as not initialized
      this.initialized = false;
    }
  }

  /**
   * Check if integration is available
   * @private
   */
  _checkAvailability() {
    if (!this.initialized || !this.config.enabled) {
      throw new Error('Integration service is not available');
    }
  }

  /**
   * Install extension
   * @param {Object} params Installation parameters
   * @returns {Promise<Object>} Installation result
   */
  async installExtension(params) {
    this._checkAvailability();

    const { extensionId, version, config = {} } = params;

    try {
      // Validate extension
      const extension = await this._validateExtension(extensionId, version);

      // Check dependencies
      await this._checkDependencies(extension.dependencies);

      // Download and install
      const installed = await this._installExtensionFiles(extension);

      // Configure extension
      await this._configureExtension(installed, config);

      // Register extension
      this.extensions.set(extensionId, {
        ...installed,
        status: 'active',
        installedAt: new Date(),
      });

      return {
        success: true,
        extension: installed,
      };
    } catch (error) {
      console.error('Extension installation failed:', error);
      throw error;
    }
  }

  /**
   * Connect service
   * @param {Object} params Connection parameters
   * @returns {Promise<Object>} Connection result
   */
  async connectService(params) {
    if (!this.initialized) {
      throw new Error('Integration service is not initialized');
    }

    const { service, credentials, config = {} } = params;

    try {
      // Validate service
      const serviceConfig = await this._validateService(service);

      // Test connection
      await this._testConnection(service, credentials);

      // Configure connection
      const connection = await this._configureConnection(service, credentials, config);

      // Register connection
      this.connections.set(service, {
        ...connection,
        status: 'active',
        connectedAt: new Date(),
      });

      return {
        success: true,
        connection,
      };
    } catch (error) {
      console.error('Service connection failed:', error);
      throw error;
    }
  }

  /**
   * Register webhook
   * @param {Object} params Webhook parameters
   * @returns {Promise<Object>} Registration result
   */
  async registerWebhook(params) {
    if (!this.initialized) {
      throw new Error('Integration service is not initialized');
    }

    const { event, url, secret, config = {} } = params;

    try {
      // Validate webhook
      await this._validateWebhook(url);

      // Generate webhook ID
      const webhookId = this._generateWebhookId();

      // Configure webhook
      const webhook = {
        id: webhookId,
        event,
        url,
        secret,
        config,
        status: 'active',
        createdAt: new Date(),
      };

      // Register webhook
      this.webhooks.set(webhookId, webhook);

      return {
        success: true,
        webhook,
      };
    } catch (error) {
      console.error('Webhook registration failed:', error);
      throw error;
    }
  }

  /**
   * Trigger webhook
   * @param {string} event Event name
   * @param {Object} data Event data
   * @returns {Promise<Object>} Delivery result
   */
  async triggerWebhook(event, data) {
    if (!this.initialized) {
      throw new Error('Integration service is not initialized');
    }

    try {
      const webhooks = Array.from(this.webhooks.values()).filter(
        w => w.event === event && w.status === 'active'
      );

      const results = await Promise.allSettled(
        webhooks.map(webhook => this._deliverWebhook(webhook, data))
      );

      return {
        success: true,
        delivered: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length,
        results,
      };
    } catch (error) {
      console.error('Webhook trigger failed:', error);
      throw error;
    }
  }

  /**
   * Initialize extension registry
   * @private
   */
  async _initializeExtensionRegistry() {
    // Initialize Parse classes
    const schema = new Parse.Schema();
    const classes = [
      {
        className: 'Extension',
        fields: {
          name: 'String',
          version: 'String',
          description: 'String',
          author: 'String',
          dependencies: 'Object',
          config: 'Object',
          status: 'String',
        },
      },
      {
        className: 'ServiceConnection',
        fields: {
          service: 'String',
          config: 'Object',
          credentials: 'Object',
          status: 'String',
        },
      },
      {
        className: 'Webhook',
        fields: {
          event: 'String',
          url: 'String',
          secret: 'String',
          config: 'Object',
          status: 'String',
        },
      },
    ];

    for (const classConfig of classes) {
      try {
        await schema.get(classConfig.className);
      } catch (error) {
        const classSchema = new Parse.Schema(classConfig.className);
        for (const [field, type] of Object.entries(classConfig.fields)) {
          classSchema.addField(field, type);
        }
        await classSchema.save();
      }
    }

    // Load existing extensions
    const query = new Parse.Query('Extension');
    const extensions = await query.find({ useMasterKey: true });

    extensions.forEach(ext => {
      this.extensions.set(ext.id, {
        ...ext.toJSON(),
        status: ext.get('status'),
      });
    });
  }

  /**
   * Initialize service connections
   * @private
   */
  async _initializeConnections() {
    const query = new Parse.Query('ServiceConnection');
    const connections = await query.find({ useMasterKey: true });

    connections.forEach(conn => {
      this.connections.set(conn.get('service'), {
        ...conn.toJSON(),
        status: conn.get('status'),
      });
    });
  }

  /**
   * Initialize webhook system
   * @private
   */
  async _initializeWebhooks() {
    const query = new Parse.Query('Webhook');
    const webhooks = await query.find({ useMasterKey: true });

    webhooks.forEach(hook => {
      this.webhooks.set(hook.id, {
        ...hook.toJSON(),
        status: hook.get('status'),
      });
    });
  }

  /**
   * Validate extension
   * @param {string} extensionId Extension ID
   * @param {string} version Version to install
   * @returns {Promise<Object>} Validated extension
   * @private
   */
  async _validateExtension(extensionId, version) {
    // Fetch extension metadata
    const response = await axios.get(`${this.config.registry.url}/extensions/${extensionId}`);

    const extension = response.data;

    // Validate version
    if (version && !semver.valid(version)) {
      throw new Error('Invalid version format');
    }

    const targetVersion = version || extension.latest;
    if (!extension.versions[targetVersion]) {
      throw new Error(`Version ${targetVersion} not found`);
    }

    return {
      ...extension,
      version: targetVersion,
    };
  }

  /**
   * Check extension dependencies
   * @param {Object} dependencies Dependencies to check
   * @returns {Promise<void>}
   * @private
   */
  async _checkDependencies(dependencies) {
    const missing = [];

    for (const [dep, version] of Object.entries(dependencies)) {
      const installed = this.extensions.get(dep);
      if (!installed || !semver.satisfies(installed.version, version)) {
        missing.push(`${dep}@${version}`);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing dependencies: ${missing.join(', ')}`);
    }
  }

  /**
   * Install extension files
   * @param {Object} extension Extension to install
   * @returns {Promise<Object>} Installation result
   * @private
   */
  async _installExtensionFiles(extension) {
    // Download extension package
    const response = await axios.get(
      `${this.config.registry.url}/extensions/${extension.id}/download/${extension.version}`,
      { responseType: 'arraybuffer' }
    );

    // TODO: Implement actual file installation
    return {
      ...extension,
      files: ['installed files would go here'],
    };
  }

  /**
   * Configure extension
   * @param {Object} extension Extension to configure
   * @param {Object} config Configuration options
   * @returns {Promise<void>}
   * @private
   */
  async _configureExtension(extension, config) {
    const Extension = Parse.Object.extend('Extension');
    const ext = new Extension();

    ext.set('name', extension.name);
    ext.set('version', extension.version);
    ext.set('description', extension.description);
    ext.set('author', extension.author);
    ext.set('dependencies', extension.dependencies);
    ext.set('config', config);
    ext.set('status', 'active');

    await ext.save(null, { useMasterKey: true });
  }

  /**
   * Validate service
   * @param {string} service Service to validate
   * @returns {Promise<Object>} Service configuration
   * @private
   */
  async _validateService(service) {
    const serviceConfig = this.config.services[service];
    if (!serviceConfig) {
      throw new Error(`Unsupported service: ${service}`);
    }
    return serviceConfig;
  }

  /**
   * Test service connection
   * @param {string} service Service to test
   * @param {Object} credentials Connection credentials
   * @returns {Promise<void>}
   * @private
   */
  async _testConnection(service, credentials) {
    const serviceConfig = this.config.services[service];

    try {
      await axios.post(serviceConfig.testEndpoint, { credentials }, { timeout: 5000 });
    } catch (error) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  /**
   * Configure service connection
   * @param {string} service Service to configure
   * @param {Object} credentials Connection credentials
   * @param {Object} config Configuration options
   * @returns {Promise<Object>} Connection configuration
   * @private
   */
  async _configureConnection(service, credentials, config) {
    const ServiceConnection = Parse.Object.extend('ServiceConnection');
    const conn = new ServiceConnection();

    conn.set('service', service);
    conn.set('credentials', credentials);
    conn.set('config', config);
    conn.set('status', 'active');

    await conn.save(null, { useMasterKey: true });

    return {
      service,
      config,
      status: 'active',
    };
  }

  /**
   * Validate webhook URL
   * @param {string} url URL to validate
   * @returns {Promise<void>}
   * @private
   */
  async _validateWebhook(url) {
    try {
      await axios.options(url, { timeout: 5000 });
    } catch (error) {
      throw new Error(`Invalid webhook URL: ${error.message}`);
    }
  }

  /**
   * Generate webhook ID
   * @returns {string} Generated ID
   * @private
   */
  _generateWebhookId() {
    return `wh_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Deliver webhook
   * @param {Object} webhook Webhook to deliver
   * @param {Object} data Event data
   * @returns {Promise<Object>} Delivery result
   * @private
   */
  async _deliverWebhook(webhook, data) {
    try {
      const signature = this._generateSignature(webhook.secret, data);

      const response = await axios.post(webhook.url, data, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
        },
        timeout: 5000,
      });

      return {
        success: true,
        statusCode: response.status,
        webhook: webhook.id,
      };
    } catch (error) {
      throw new Error(`Webhook delivery failed: ${error.message}`);
    }
  }

  /**
   * Generate webhook signature
   * @param {string} secret Webhook secret
   * @param {Object} data Event data
   * @returns {string} Generated signature
   * @private
   */
  _generateSignature(secret, data) {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(data));
    return hmac.digest('hex');
  }
}

module.exports = new IntegrationService();

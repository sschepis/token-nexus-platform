/**
 * Configuration Manager
 * Handles configuration loading, validation, and merging
 */

const Joi = require('joi');
const fs = require('fs');
const path = require('path');
const defaultConfig = require('./defaults');

// Configuration schema for validation
const configSchema = Joi.object({
  database: Joi.object({
    collectionPrefix: Joi.string().default('CMS'),
    enableMigrations: Joi.boolean().default(true),
    schemaVersion: Joi.string().default('1.0.0'),
  }),

  content: Joi.object({
    maxContentSize: Joi.number()
      .min(1)
      .default(5 * 1024 * 1024),
    versioning: Joi.object({
      enabled: Joi.boolean().default(true),
      maxVersions: Joi.number().min(1).default(10),
    }),
    validation: Joi.object({
      enabled: Joi.boolean().default(true),
      strict: Joi.boolean().default(false),
    }),
    publishing: Joi.object({
      enableScheduling: Joi.boolean().default(true),
      enableDrafts: Joi.boolean().default(true),
      requireApproval: Joi.boolean().default(false),
    }),
  }),

  media: Joi.object({
    storage: Joi.object({
      type: Joi.string().valid('parse', 's3').default('parse'),
      s3: Joi.object({
        bucket: Joi.string().when('type', {
          is: 's3',
          then: Joi.required(),
        }),
        region: Joi.string(),
        accessKey: Joi.string(),
        secretKey: Joi.string(),
        endpoint: Joi.string(),
      }),
    }),
    limits: Joi.object({
      maxFileSize: Joi.number()
        .min(1)
        .default(100 * 1024 * 1024),
      maxFiles: Joi.number().min(1).default(10000),
    }),
    supportedTypes: Joi.object({
      images: Joi.array().items(Joi.string()),
      videos: Joi.array().items(Joi.string()),
      documents: Joi.array().items(Joi.string()),
    }),
    images: Joi.object({
      optimize: Joi.boolean().default(true),
      variations: Joi.object().pattern(
        Joi.string(),
        Joi.object({
          width: Joi.number().required(),
          height: Joi.number().required(),
          fit: Joi.string().valid('cover', 'contain', 'inside', 'outside'),
        })
      ),
      format: Joi.object({
        quality: Joi.number().min(1).max(100).default(80),
        progressive: Joi.boolean().default(true),
        withMetadata: Joi.boolean().default(false),
      }),
    }),
  }),

  security: Joi.object({
    accessControl: Joi.object({
      roleBasedAccess: Joi.boolean().default(true),
      defaultRole: Joi.string().default('content-creator'),
      requiredRoles: Joi.object().pattern(Joi.string(), Joi.array().items(Joi.string())),
    }),
    rateLimit: Joi.object({
      enabled: Joi.boolean().default(true),
      windowMs: Joi.number().default(15 * 60 * 1000),
      max: Joi.number().default(100),
    }),
  }),

  cache: Joi.object({
    enabled: Joi.boolean().default(true),
    duration: Joi.number().default(3600),
    storage: Joi.string().valid('memory', 'redis').default('memory'),
    redis: Joi.object({
      host: Joi.string(),
      port: Joi.number(),
      password: Joi.string(),
    }).when('storage', {
      is: 'redis',
      then: Joi.required(),
    }),
  }),

  webhooks: Joi.object({
    enabled: Joi.boolean().default(false),
    events: Joi.array().items(Joi.string()),
  }),

  jobs: Joi.object({
    publishScheduled: Joi.object({
      schedule: Joi.string().default('*/5 * * * *'),
      enabled: Joi.boolean().default(true),
    }),
    cleanupMedia: Joi.object({
      schedule: Joi.string().default('0 0 * * *'),
      enabled: Joi.boolean().default(true),
    }),
  }),

  logging: Joi.object({
    level: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
    requests: Joi.boolean().default(true),
    queries: Joi.boolean().default(false),
    format: Joi.string().valid('json', 'text').default('json'),
  }),

  dashboard: Joi.object({
    enabled: Joi.boolean().default(true),
    mountPath: Joi.string().default('/dashboard'),
    appName: Joi.string().default('My GemCMS App'),
    apps: Joi.array().items(
      Joi.object({
        serverURL: Joi.string().uri().required(),
        appId: Joi.string().required(),
        masterKey: Joi.string().required(),
        appName: Joi.string().required(),
        graphQLPath: Joi.string().optional().default('/graphql'), // Optional, with default
        iconName: Joi.string().optional(), // Optional
      })
    ).min(1).required(), // Must have at least one app defined
    users: Joi.array().items(
      Joi.object({
        user: Joi.string().required(),
        pass: Joi.string().required(),
        apps: Joi.array().items(Joi.string()).optional(), // Optional: restrict user to specific appIds
      })
    ).min(1).required(), // Must have at least one user defined
    trustProxy: Joi.alternatives().try(Joi.number(), Joi.string()).default(1),
    cookieSessionSecret: Joi.string().default('a_very_secure_secret_for_dashboard_session'),
    useEncryptedPasswords: Joi.boolean().default(false),
    allowInsecureHTTP: Joi.boolean().default(true), // Default to true for dev, override for prod
  }).default({ // Provide a default for the entire dashboard object if not present
    enabled: true,
    mountPath: '/dashboard',
    appName: 'My GemCMS App',
    apps: [{
      serverURL: 'http://localhost:1337/parse',
      appId: 'gemcms_dev',
      masterKey: 'gemcms_master_key_dev',
      appName: 'GemCMS Dev App',
      graphQLPath: '/graphql',
    }],
    users: [{
      user: 'admin',
      pass: 'password',
    }],
    trustProxy: 1,
    cookieSessionSecret: 'a_very_secure_secret_for_dashboard_session',
    useEncryptedPasswords: false,
    allowInsecureHTTP: true,
  }),
});

const evmDeploymentSchema = Joi.object().pattern(
  Joi.string(), // Network name (e.g., 'basesep')
  Joi.object().pattern(
    Joi.string(), // Contract name (e.g., 'DiamondFactory')
    Joi.object({
      address: Joi.string().required(),
      abi: Joi.array().required(),
    }).unknown(true) // Allow other properties in contract object if needed
  ).unknown(true) // Allow other properties in network object if needed
).default({}); // Default to an empty object if not provided

const updatedConfigSchema = configSchema.keys({
  evmDeployments: evmDeploymentSchema,
});

class ConfigManager {
  constructor() {
    this.config = null;
  }

  /**
   * Initialize configuration
   * @param {Object} userConfig - User provided configuration
   * @returns {Object} Validated and merged configuration
   */
  initialize(userConfig = {}) {
    try {
      // Deep merge default config with user config
      let mergedConfig = this.mergeConfigs(defaultConfig, userConfig);

      // Load EVM deployment data from files
      const deploymentsPath = path.join(__dirname, '../../src/config/evm-deployments');
      const evmDeployments = {};

      if (fs.existsSync(deploymentsPath)) {
        const networks = fs.readdirSync(deploymentsPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);

        for (const network of networks) {
          const networkPath = path.join(deploymentsPath, network);
          const contractFiles = fs.readdirSync(networkPath)
            .filter(file => file.endsWith('.json'));

          evmDeployments[network] = {};
          for (const file of contractFiles) {
            const filePath = path.join(networkPath, file);
            try {
              const fileContent = fs.readFileSync(filePath, 'utf8');
              const deploymentData = JSON.parse(fileContent);
              const contractName = path.basename(file, '.json');
              evmDeployments[network][contractName] = deploymentData;
            } catch (fileReadError) {
              console.error(`Error reading or parsing deployment file ${filePath}:`, fileReadError);
            }
          }
        }
      }

      // Merge loaded deployment data with the configuration
      mergedConfig = this.mergeConfigs(mergedConfig, { evmDeployments });

      console.log('[ConfigManager DEBUG] Dashboard config in mergedConfig BEFORE validation:', JSON.stringify(mergedConfig.dashboard, null, 2));
      console.log(`[ConfigManager DEBUG] process.env.PARSE_DASHBOARD_ENABLED value: ${process.env.PARSE_DASHBOARD_ENABLED}`);


      // Validate merged configuration
      const { error, value } = updatedConfigSchema.validate(mergedConfig, {
        abortEarly: false,
        allowUnknown: true, // This is important for allowing properties not strictly in schema if needed elsewhere
      });

      if (error) {
        console.error('[ConfigManager DEBUG] Joi validation error object:', JSON.stringify(error, null, 2));
        throw new Error(`Configuration validation failed: ${error.message}`);
      }

      this.config = value;
      console.log('[ConfigManager DEBUG] Dashboard config in this.config AFTER validation:', JSON.stringify(this.config.dashboard, null, 2));
      return this.config;
    } catch (error) {
      throw new Error(`Configuration initialization failed: ${error.message}`);
    }
  }

  /**
   * Deep merge two configuration objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged configuration
   */
  mergeConfigs(target, source) {
    const merged = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        merged[key] = this.mergeConfigs(merged[key] || {}, source[key]);
      } else {
        merged[key] = source[key];
      }
    }

    return merged;
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }
    return this.config;
  }

  /**
   * Get specific configuration value
   * @param {string} path - Configuration path (dot notation)
   * @param {*} defaultValue - Default value if path not found
   * @returns {*} Configuration value
   */
  get(path, defaultValue = null) {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }

    const value = path.split('.').reduce((obj, key) => {
      return obj && obj[key] !== undefined ? obj[key] : undefined;
    }, this.config);

    return value !== undefined ? value : defaultValue;
  }

  /**
   * Validate specific configuration section
   * @param {string} section - Configuration section name
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validated configuration
   */
  validateSection(section, config) {
    const sectionSchema = configSchema.extract(section);
    const { error, value } = sectionSchema.validate(config, {
      abortEarly: false,
    });

    if (error) {
      throw new Error(`Configuration validation failed for section ${section}: ${error.message}`);
    }

    return value;
  }
}

// Export singleton instance
module.exports = new ConfigManager();

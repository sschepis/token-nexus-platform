/**
 * Configuration Validation
 */

const logger = require('./logger');

/**
 * Validate configuration object
 * @param {Object} config Configuration object
 * @throws {Error} If configuration is invalid
 */
function validateConfig(config) {
  const errors = [];

  // Validate Parse Server core config
  validateParseServerConfig(config.parseServer, errors);

  // Validate plugin configs
  validateContentConfig(config.content, errors);
  validateMediaConfig(config.media, errors);
  validateTemplateConfig(config.template, errors);
  validateWebsiteConfig(config.website, errors);

  // Validate infrastructure configs
  validateCacheConfig(config.cache, errors);
  validateAnalyticsConfig(config.analytics, errors);
  validateSecurityConfig(config.security, errors);

  if (errors.length > 0) {
    throw new Error('Invalid configuration:\n' + errors.join('\n'));
  }
}

/**
 * Validate Parse Server core configuration
 * @param {Object} config Parse Server configuration
 * @param {Array} errors Array to collect validation errors
 */
function validateParseServerConfig(config, errors) {
  if (!config) {
    errors.push('Parse Server configuration is required');
    return;
  }

  // Required fields
  const required = ['appId', 'masterKey', 'serverURL', 'databaseURI'];
  required.forEach(field => {
    if (!config[field]) {
      errors.push(`Parse Server ${field} is required`);
    }
  });

  // Database URI format
  if (config.databaseURI && !isValidDatabaseURI(config.databaseURI)) {
    errors.push('Invalid database URI format');
  }

  // Email configuration
  if (config.emailAdapter) {
    // const { apiKey, domain, fromAddress } = config.emailAdapter.options || {};
    // if (!apiKey || !domain || !fromAddress) {
    //   errors.push('Email adapter configuration requires apiKey, domain, and fromAddress');
    // }
  }
}

/**
 * Validate content plugin configuration
 * @param {Object} config Content plugin configuration
 * @param {Array} errors Array to collect validation errors
 */
function validateContentConfig(config, errors) {
  if (!config) return; // Optional

  if (config.webhooks?.enabled) {
    if (!Array.isArray(config.webhooks.endpoints)) {
      errors.push('Content webhook endpoints must be an array');
    }
  }

  if (config.validation) {
    const { maxTitleLength, maxContentSize } = config.validation;
    if (maxTitleLength && !Number.isInteger(maxTitleLength)) {
      errors.push('Content maxTitleLength must be an integer');
    }
    if (maxContentSize && !Number.isInteger(maxContentSize)) {
      errors.push('Content maxContentSize must be an integer');
    }
  }
}

/**
 * Validate media plugin configuration
 * @param {Object} config Media plugin configuration
 * @param {Array} errors Array to collect validation errors
 */
function validateMediaConfig(config, errors) {
  if (!config) return; // Optional

  // Storage configuration
  if (config.storage) {
    const validAdapters = ['fs', 's3', 'gcs'];
    if (!validAdapters.includes(config.storage.adapter)) {
      errors.push(`Invalid media storage adapter. Must be one of: ${validAdapters.join(', ')}`);
    }

    // Validate adapter-specific options
    switch (config.storage.adapter) {
      case 's3':
        validateS3Config(config.storage.options, errors);
        break;
      case 'gcs':
        validateGCSConfig(config.storage.options, errors);
        break;
    }
  }

  // Image processing configuration
  if (config.imageProcessing?.enabled) {
    if (!Array.isArray(config.imageProcessing.formats)) {
      errors.push('Image processing formats must be an array');
    }
    if (
      typeof config.imageProcessing.quality !== 'number' ||
      config.imageProcessing.quality < 0 ||
      config.imageProcessing.quality > 100
    ) {
      errors.push('Image processing quality must be a number between 0 and 100');
    }
  }
}

/**
 * Validate template plugin configuration
 * @param {Object} config Template plugin configuration
 * @param {Array} errors Array to collect validation errors
 */
function validateTemplateConfig(config, errors) {
  if (!config) return; // Optional

  if (config.webhooks?.enabled) {
    if (!Array.isArray(config.webhooks.endpoints)) {
      errors.push('Template webhook endpoints must be an array');
    }
  }

  if (config.validation) {
    const { maxNameLength, maxSchemaSize } = config.validation;
    if (maxNameLength && !Number.isInteger(maxNameLength)) {
      errors.push('Template maxNameLength must be an integer');
    }
    if (maxSchemaSize && !Number.isInteger(maxSchemaSize)) {
      errors.push('Template maxSchemaSize must be an integer');
    }
  }
}

/**
 * Validate website plugin configuration
 * @param {Object} config Website plugin configuration
 * @param {Array} errors Array to collect validation errors
 */
function validateWebsiteConfig(config, errors) {
  if (!config) return; // Optional

  if (config.hosting?.enabled) {
    const validProviders = ['local', 's3', 'netlify', 'vercel'];
    if (!validProviders.includes(config.hosting.provider)) {
      errors.push(`Invalid website hosting provider. Must be one of: ${validProviders.join(', ')}`);
    }

    // Validate provider-specific options
    switch (config.hosting.provider) {
      case 's3':
        validateS3Config(config.hosting.options, errors, 'website hosting');
        break;
      case 'netlify':
        if (!config.hosting.options.siteId || !config.hosting.options.token) {
          errors.push('Netlify hosting requires siteId and token');
        }
        break;
      case 'vercel':
        if (!config.hosting.options.projectId || !config.hosting.options.token) {
          errors.push('Vercel hosting requires projectId and token');
        }
        break;
    }
  }
}

/**
 * Validate cache configuration
 * @param {Object} config Cache configuration
 * @param {Array} errors Array to collect validation errors
 */
function validateCacheConfig(config, errors) {
  if (!config) return; // Optional

  if (config.enabled) {
    const validAdapters = ['memory', 'redis'];
    if (!validAdapters.includes(config.adapter)) {
      errors.push(`Invalid cache adapter. Must be one of: ${validAdapters.join(', ')}`);
    }

    if (config.adapter === 'redis') {
      const { host, port } = config.options;
      if (!host || !port) {
        errors.push('Redis cache requires host and port');
      }
      if (port && !Number.isInteger(port)) {
        errors.push('Redis port must be an integer');
      }
    }
  }
}

/**
 * Validate analytics configuration
 * @param {Object} config Analytics configuration
 * @param {Array} errors Array to collect validation errors
 */
function validateAnalyticsConfig(config, errors) {
  if (!config) return; // Optional

  if (config.enabled) {
    const validProviders = ['internal', 'ga', 'mixpanel'];
    if (!validProviders.includes(config.provider)) {
      errors.push(`Invalid analytics provider. Must be one of: ${validProviders.join(', ')}`);
    }

    switch (config.provider) {
      case 'ga':
        if (!config.options.trackingId) {
          errors.push('Google Analytics requires trackingId');
        }
        break;
      case 'mixpanel':
        if (!config.options.token) {
          errors.push('Mixpanel requires token');
        }
        break;
    }
  }
}

/**
 * Validate security configuration
 * @param {Object} config Security configuration
 * @param {Array} errors Array to collect validation errors
 */
function validateSecurityConfig(config, errors) {
  if (!config) return; // Optional

  if (config.rateLimit?.enabled) {
    const { windowMs, max } = config.rateLimit;
    if (!Number.isInteger(windowMs) || windowMs <= 0) {
      errors.push('Rate limit windowMs must be a positive integer');
    }
    if (!Number.isInteger(max) || max <= 0) {
      errors.push('Rate limit max must be a positive integer');
    }
  }
}

/**
 * Validate S3 configuration
 * @param {Object} options S3 configuration options
 * @param {Array} errors Array to collect validation errors
 * @param {string} context Context for error messages
 */
function validateS3Config(options, errors, context = 'media storage') {
  const required = ['bucket', 'region', 'accessKey', 'secretKey'];
  required.forEach(field => {
    if (!options[field]) {
      errors.push(`${context} S3 ${field} is required`);
    }
  });
}

/**
 * Validate GCS configuration
 * @param {Object} options GCS configuration options
 * @param {Array} errors Array to collect validation errors
 */
function validateGCSConfig(options, errors) {
  const required = ['projectId', 'keyFilename', 'bucketName'];
  required.forEach(field => {
    if (!options[field]) {
      errors.push(`GCS ${field} is required`);
    }
  });
}

/**
 * Check if a database URI is valid
 * @param {string} uri Database URI
 * @returns {boolean} Whether the URI is valid
 */
function isValidDatabaseURI(uri) {
  try {
    const url = new URL(uri);
    return ['mongodb:', 'mongodb+srv:'].includes(url.protocol);
  } catch {
    return false;
  }
}

module.exports = validateConfig;

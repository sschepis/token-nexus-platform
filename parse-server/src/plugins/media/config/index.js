/**
 * Media Plugin Configuration
 * Loads and merges configuration settings
 */

const defaults = require('./defaults');

/**
 * Deep merge two objects
 * @param {Object} target Target object
 * @param {Object} source Source object
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Validate configuration
 * @param {Object} config Configuration object
 * @throws {Error} If configuration is invalid
 */
function validateConfig(config) {
  const errors = [];

  // Validate storage configuration
  if (!['parse', 'cloudinary', 'local'].includes(config.storage.provider)) {
    errors.push(`Invalid storage provider: ${config.storage.provider}`);
  }

  // Validate CDN configuration
  if (config.cdn.enabled && !['cloudinary'].includes(config.cdn.provider)) {
    errors.push(`Invalid CDN provider: ${config.cdn.provider}`);
  }

  // Validate image formats
  if (config.image.formats.output.some(format => !config.image.formats.input.includes(format))) {
    errors.push('Output formats must be included in input formats');
  }

  // Validate video formats
  if (config.video.formats.output.some(format => !config.video.formats.input.includes(format))) {
    errors.push('Output formats must be included in input formats');
  }

  // Validate performance settings
  if (config.performance.queue.concurrency < 1) {
    errors.push('Queue concurrency must be at least 1');
  }

  // Validate webhook settings
  if (config.webhooks.enabled && config.webhooks.timeout < 1000) {
    errors.push('Webhook timeout must be at least 1000ms');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid media configuration:\n${errors.join('\n')}`);
  }
}

/**
 * Load configuration
 * @param {Object} options User-provided configuration options
 * @returns {Object} Merged and validated configuration
 */
function loadConfig(options = {}) {
  // Merge defaults with user options
  const config = deepMerge(defaults, options);

  // Validate configuration
  validateConfig(config);

  // Freeze configuration to prevent modifications
  return Object.freeze(config);
}

module.exports = {
  loadConfig,
  defaults,
  validateConfig,
};

/* eslint-disable valid-jsdoc */
/**
 * CloudFunctionProvider
 * Dynamically loads and manages Parse Cloud Functions
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class CloudFunctionProvider {
  constructor() {
    this.functions = new Map();
    this.functionSources = new Map();
    this.watchMode = false;
    this.Parse = null;
  }

  /**
   * Initialize the provider
   * @param {Object} options Configuration options
   * @param {Object} Parse Parse instance from Parse Server
   * @return {Promise<void>}
   */
  async initialize(options = {}, Parse) {
    if (!Parse) {
      throw new Error('Parse instance is required');
    }

    logger.info('Initializing CloudFunctionProvider...');
    logger.info('Parse instance provided:', !!Parse);

    this.Parse = Parse;
    this.options = {
      watchMode: process.env.NODE_ENV === 'development',
      functionPath: path.join(process.cwd(), 'functions'),
      ...options,
    };

    logger.info('Function path:', this.options.functionPath);

    // Create functions directory if it doesn't exist
    await fs.mkdir(this.options.functionPath, { recursive: true });

    // Load functions from disk
    await this.loadFunctionsFromDisk();

    // Watch for changes in development
    if (this.options.watchMode) {
      this.startWatching();
    }

    logger.info(
      'CloudFunctionProvider initialized with functions:',
      Array.from(this.functions.keys()).join(', ')
    );

    return this;
  }

  /**
   * Load functions from disk
   * @return {Promise<void>}
   */
  async loadFunctionsFromDisk() {
    try {
      logger.info('Loading functions from disk...');
      const files = await fs.readdir(this.options.functionPath);

      logger.info('Found function files:', files.join(', '));

      for (const file of files) {
        if (file.endsWith('.js')) {
          await this.loadFunctionFile(file);
        }
      }
    } catch (error) {
      logger.error('Error loading functions from disk:', error);
      throw error;
    }
  }

  /**
   * Load a single function file
   * @param {string} filename Function file name
   * @return {Promise<void>}
   */
  async loadFunctionFile(filename) {
    try {
      const filePath = path.join(this.options.functionPath, filename);

      logger.info('Loading function file:', filePath);

      const source = await fs.readFile(filePath, 'utf8');

      // Clear module cache in development
      if (this.options.watchMode) {
        delete require.cache[require.resolve(filePath)];
      }

      const module = require(filePath);
      const functionName = path.basename(filename, '.js');

      // Store source for hot reloading
      this.functionSources.set(functionName, {
        source,
        path: filePath,
        timestamp: Date.now(),
      });

      // Register the function
      this.registerFunction(functionName, module);
    } catch (error) {
      logger.error(`Error loading function file ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Register a cloud function
   * @param {string} name Function name
   * @param {Object} module Function module
   */
  registerFunction(name, module) {
    if (typeof module.handler !== 'function') {
      throw new Error(`Function ${name} must export a handler function`);
    }

    const metadata = {
      name,
      version: module.version || '1.0.0',
      description: module.description || '',
      requireMaster: module.requireMaster || false,
      requireUser: module.requireUser || false,
      rateLimit: module.rateLimit,
      ...module.metadata,
    };

    // Create the wrapped function
    const wrappedFunction = async request => {
      try {
        // Validate requirements
        if (metadata.requireMaster && !request.master) {
          throw new this.Parse.Error(this.Parse.Error.OPERATION_FORBIDDEN, 'Master key required');
        }

        if (metadata.requireUser && !request.user) {
          throw new this.Parse.Error(
            this.Parse.Error.INVALID_SESSION_TOKEN,
            'User must be logged in'
          );
        }

        // Execute pre-hooks if any
        if (module.beforeHandler) {
          await module.beforeHandler(request);
        }

        // Execute main handler
        const result = await module.handler(request);

        // Execute post-hooks if any
        if (module.afterHandler) {
          await module.afterHandler(request, result);
        }

        return result;
      } catch (error) {
        logger.error(`Error executing function ${name}:`, error);
        throw error;
      }
    };

    // Store function metadata
    this.functions.set(name, {
      metadata,
      handler: wrappedFunction,
    });

    // Register with Parse
    logger.info(`Registering cloud function: ${name}`);
    this.Parse.Cloud.define(name, wrappedFunction, {
      requireMaster: metadata.requireMaster,
      requireUser: metadata.requireUser,
    });

    logger.info(`Registered cloud function: ${name}`);
  }

  /**
   * Start watching for function changes
   */
  startWatching() {
    const chokidar = require('chokidar');

    const watcher = chokidar.watch(this.options.functionPath, {
      ignored: /(^|[\\/\\])\../,
      persistent: true,
    });

    watcher.on('change', async filePath => {
      const filename = path.basename(filePath);

      logger.info(`Function file changed: ${filename}`);
      await this.loadFunctionFile(filename);
    });

    watcher.on('add', async filePath => {
      const filename = path.basename(filePath);

      if (filename.endsWith('.js')) {
        logger.info(`New function file detected: ${filename}`);
        await this.loadFunctionFile(filename);
      }
    });

    watcher.on('unlink', filePath => {
      const functionName = path.basename(filePath, '.js');

      if (this.functions.has(functionName)) {
        this.functions.delete(functionName);
        logger.info(`Function removed: ${functionName}`);
      }
    });

    this.watchMode = true;
    logger.info('Watching for function changes');
  }

  /**
   * Get function metadata
   * @param {string} name Function name
   * @return {Object|null} Function metadata
   */
  getFunctionMetadata(name) {
    const func = this.functions.get(name);

    return func ? func.metadata : null;
  }

  /**
   * List all registered functions
   * @return {Array<Object>} Array of function metadata
   */
  listFunctions() {
    return Array.from(this.functions.values()).map(f => f.metadata);
  }
}

module.exports = new CloudFunctionProvider();

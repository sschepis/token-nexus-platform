/* eslint-disable no-underscore-dangle */
/* eslint-disable no-promise-executor-return */
/* eslint-disable require-await */
const express = require('express');
const { ParseServer } = require('parse-server');
const ParseDashboard = require('parse-dashboard');
const Parse = require('parse/node');
const config = require('./config');
const setupMiddleware = require('./middleware');
const logger = require('./utils/logger');
const ServiceManager = require('./services/ServiceManager');

class Server {
  constructor() {
    this.app = null;
    this.parseServer = null;
    this.httpServer = null;
    this.initialized = false;
    this.wsServer = null;
  }

  async initialize() {
    try {
      if (this.initialized) {
        throw new Error('Server already initialized');
      }

      const timer = logger.time('Server initialization');

      logger.startup('begin', 'Starting server initialization');

      // Create Express app
      logger.startup('express', 'Creating Express application');
      this.app = express();

      // Create HTTP Server
      logger.startup('http', 'Creating HTTP Server');
      this.httpServer = require('http').createServer(this.app);

      // Create Parse Server instance with configuration and pass the HTTP server
      logger.startup('parse', 'Creating Parse Server instance');
      this.parseServer = new ParseServer({
        ...config.parseServer,
        websocketTimeout: 10 * 1000,
        liveQuery: {
          classNames: ['AnalyticsEvent'], // Allow LiveQuery for this class
          redisURL: process.env.REDIS_URL, // Optional: Redis URL for scalability
        },
      });

      // Initialize LiveQuery server
      this.wsServer = require('parse-server').ParseServer.createLiveQueryServer(this.httpServer, {
        appId: config.parseServer.appId,
        masterKey: config.parseServer.masterKey,
        serverURL: config.parseServer.serverURL,
        websocketTimeout: 10 * 1000,
        liveQuery: {
          classNames: ['AnalyticsEvent'],
          redisURL: process.env.REDIS_URL,
        },
      });

      // Setup middleware and mount Parse Server
      logger.startup('middleware', 'Setting up middleware');
      setupMiddleware(this.app, this.parseServer, config.databaseManager, config.tenantContext);

      // Setup Parse Dashboard if enabled
      logger.startup('dashboard_check', `Dashboard enabled: ${config.dashboard?.enabled}, Mount path: ${config.dashboard?.mountPath}`);
      if (config.dashboard && config.dashboard.enabled) {
        logger.startup('dashboard', 'Setting up Parse Dashboard');
        const dashboard = new ParseDashboard(
          {
            apps: config.dashboard.apps,
            users: config.dashboard.users,
            trustProxy: config.dashboard.trustProxy,
            useEncryptedPasswords: config.dashboard.useEncryptedPasswords,
            cookieSessionSecret: config.dashboard.cookieSessionSecret,
          },
          {
            allowInsecureHTTP: config.dashboard.allowInsecureHTTP,
          }
        );

        this.app.use(config.dashboard.mountPath, dashboard);
        logger.startup('dashboard', `Parse Dashboard mounted at ${config.dashboard.mountPath}`);
      }

      this.initialized = true;
      const duration = timer.end();

      logger.startup('complete', `Server initialization completed in ${duration}ms`);
    } catch (error) {
      logger.error('Failed to initialize server:', error);
      throw error;
    }
  }

  async _initializeServices() {
    // Initialize Parse SDK for services
    Parse.initialize(config.parseServer.appId, null, config.parseServer.masterKey);
    Parse.serverURL = config.parseServer.serverURL;

    // Load cloud functions after Parse SDK initialization
    require('../cloud/functions/auth/registration');

    // Give Parse Server a moment to fully start
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Run afterStart initialization
    await Parse.Cloud.run('afterStart', {}, { useMasterKey: true });

    // Initialize services
    logger.startup('services', 'Initializing services');
    await ServiceManager.initialize(config);
    logger.startup('services', 'Services initialized');

    // Check for automated install configuration
    try {
      logger.startup('auto-install', 'Checking for automated install configuration');
      const autoInstallResult = await Parse.Cloud.run('checkAndRunAutomatedInstall', {}, { useMasterKey: true });
      
      if (autoInstallResult.success) {
        logger.startup('auto-install', 'Automated install completed successfully');
      } else {
        logger.startup('auto-install', `Automated install skipped: ${autoInstallResult.message}`);
      }
    } catch (error) {
      logger.error('Error during automated install check:', error);
      // Don't fail server startup if automated install fails
    }
  }

  runInitializationJob() {
    logger.startup('init', 'Running initialization job');

    return new Promise((resolve, reject) => {
      // Wait for server to be ready before running initialization
      setTimeout(async () => {
        try {
          const Parse = require('parse/node');

          Parse.serverURL = config.parseServer.serverURL;
          Parse.initialize(config.parseServer.appId, null, config.parseServer.masterKey);

          const result = await Parse.Cloud.run('initialize', {}, { useMasterKey: true });

          logger.startup('init', `Initialization completed: ${result.message}`);
          resolve(result);
        } catch (error) {
          logger.error('Failed to run initialization:', error);
          reject(error);
        }
      }, 1000); // Give server 1 second to start up
    });
  }

  async start(port = process.env.PORT || 1337) {
    if (!this.initialized) {
      throw new Error('Server not initialized');
    }

    const timer = logger.time('Server startup');

    try {
      // Start the HTTP server with WebSocket support
      await new Promise((resolve, reject) => {
        this.httpServer
          .listen(port, () => {
            logger.startup('listen', `Server listening on port ${port}`);
            resolve();
          })
          .on('error', reject);
      });

      // Initialize services after server is up
      await this._initializeServices();

      // Run initialization job
      await this.runInitializationJob();

      const duration = timer.end();

      logger.startup('complete', `Server startup completed in ${duration}ms`);
      logger.startup('urls', 'Server URLs:', {
        parseServer: config.parseServer.serverURL,
        dashboard: null,
      });

      return this.httpServer;
    } catch (error) {
      logger.error('Failed to start server:', error);
      throw error;
    }
  }

  async stop() {
    if (this.httpServer) {
      logger.shutdown('parse', 'Shutting down server');
      // Shutdown services
      logger.shutdown('services', 'Shutting down services');
      await ServiceManager.shutdown();
      logger.shutdown('services', 'Services shutdown completed');
      // eslint-disable-next-line no-promise-executor-return
      await new Promise(resolve => this.httpServer.close(resolve));
      logger.shutdown('parse', 'Server shutdown completed');
    }
  }

  getParseServer() {
    return this.parseServer;
  }

  getExpressApp() {
    return this.app;
  }
}

module.exports = Server;

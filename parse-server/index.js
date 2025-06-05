/**
 * Parse Server CMS Entry Point
 */

// Configure Parse SDK for Node.js environment
// This prevents the Parse SDK from trying to use browser-specific storage
process.env.PARSE_BUILD = 'node';

const Server = require('./src/server');
const logger = require('./src/utils/logger');

class ParseApplication {
  constructor() {
    this.server = new Server();
  }

  async initialize() {
    const timer = logger.time('Application initialization');

    try {
      logger.startup('app', 'Initializing Parse application');
      await this.server.initialize();
      const duration = timer.end();

      logger.startup('app', `Parse application initialized in ${duration}ms`);
    } catch (error) {
      logger.error('Failed to initialize Parse application:', error);
      throw error;
    }
  }

  async start() {
    const timer = logger.time('Application startup');

    try {
      await this.server.start();
      const duration = timer.end();

      logger.startup('app', `Parse application started in ${duration}ms`);
    } catch (error) {
      logger.error('Failed to start Parse application:', error);
      throw error;
    }
  }

  async shutdown() {
    const timer = logger.time('Application shutdown');

    try {
      logger.shutdown('app', 'Shutting down Parse application');
      await this.server.stop();
      const duration = timer.end();

      logger.shutdown('app', `Parse application shut down in ${duration}ms`);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      throw error;
    }
  }
}

// Create and start the application
const app = new ParseApplication();

// Handle shutdown signals
process.on('SIGINT', async () => {
  try {
    await app.shutdown();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  try {
    await app.shutdown();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Initialize and start the application
(async () => {
  try {
    await app.initialize();
    await app.start();
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
})();

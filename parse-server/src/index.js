/**
 * Parse Server CMS
 * Main entry point
 */

const Server = require('./server');
const logger = require('./utils/logger');

// Create singleton instance
const server = new Server();

// Export server instance
module.exports = server;

// Start server if this file is run directly
if (require.main === module) {
  (async () => {
    try {
      await server.initialize();
      await server.start();
    } catch (error) {
      logger.error('Failed to start CMS:', error);
      process.exit(1);
    }
  })();
}

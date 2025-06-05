/* global Parse */

const logInterceptor = require('../utils/logInterceptor');

let AIService;
let MonitoringService;
let configService;

async function initializeServices() {
  try {
    console.log('🚀 Initializing platform infrastructure...');
    
    // Ensure Parse is properly initialized with master key
    const config = require('../../src/config');
    Parse.initialize(config.parseServer.appId, null, config.parseServer.masterKey);
    Parse.serverURL = config.parseServer.serverURL;
    
    // Wait a moment to ensure Parse Server is fully ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { initializeAISchemas, initializeApplicationSchemas } = require('../schema/initSchemas');

    // Initialize schemas with log interception to suppress verbose errors
    const [aiResults, appResults] = await logInterceptor.withInterception(async () => {
      return Promise.all([
        initializeAISchemas({ verbose: false }),
        initializeApplicationSchemas({ verbose: false })
      ]);
    });

    // Initialize services with Parse instance
    AIService = require('./aiService')(Parse);
    MonitoringService = require('./monitoringService')(Parse);
    configService = require('./configService')(Parse);

    // Initialize all cloud functions
    require('../functions/ai')(Parse);
    
    // Load our new setup functions
    require('../functions/setupFunctions');

    // Initialize services
    await configService.initializeCache();

    console.log('✅ Platform infrastructure initialized successfully\n');
  } catch (error) {
    console.error('❌ Failed to initialize platform infrastructure:', error.message);
    // Don't throw to prevent server crash, just log the error
  }
}

// Register the afterStart hook
Parse.Cloud.define('afterStart', initializeServices);

module.exports = {
  initializeServices,
  getAIService: () => AIService,
  getMonitoringService: () => MonitoringService,
  getConfigService: () => configService,
};
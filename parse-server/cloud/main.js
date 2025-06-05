/* eslint-disable no-console */
/* global Parse */

// This file is the entry point for all Parse Cloud Code.
// It should primarily be used to load other Cloud Code modules.
// Parse.initialize, schema initialization, service initialization,
// and Parse.Cloud.afterStart hooks are expected to be handled
// by the main Parse Server bootstrap (e.g., parse-server/src/server.js).

// Centralized Cloud Function registration.
// This requires files that define Parse.Cloud.define functions.
require('./functions');

// Load setup functions
require('./setup');

// Register access control middleware.
// This requires files that set up Parse.Cloud.beforeSave/Find/etc. hooks.
require('./middleware/accessControl');
require('./middleware/organizationContextMiddleware');
require('./middleware/organizationAware');

// Load background jobs.
// These are typically modules that register themselves for scheduled tasks.
require('./jobs/createSampleTemplates');

// Export service getters for use in other cloud functions.
// These assume the services are initialized globally elsewhere (e.g., in an afterStart hook in server.js).
const { getAIService, getMonitoringService, getConfigService } = require('./services/initialization');
module.exports.AIService = getAIService();
module.exports.MonitoringService = getMonitoringService();
module.exports.configService = getConfigService();

console.log('✓ Parse Server cloud code modules loaded.');

/* global Parse */

const config = require('../src/config');

// Import webhook functions
require('./functions/webhooks');

// Import NEW refactored organization functions from src/cloud/organizations
require('../src/cloud/organizations'); // This will load index.js in that directory

// Import application functions
const {
  checkSlugAvailability,
  createApplication,
  updateApplication,
} = require('./functions/application');

// Import application creation functions
require('./functions/dependencies');
require('./functions/environment');
require('./functions/apis/api');
require('./functions/triggers');
require('./functions/theme/themes');
require('./functions/templates/templates');

// Import marketplace functions
const {
  fetchMarketplaceApps,
  installMarketplaceApp,
} = require('./functions/integrations/marketplaceManagement');

// Import configuration functions
const {
  getAppConfiguration,
  updateAppConfiguration,
} = require('./functions/configuration/configurationManagement');

// Import update management functions
const { checkForUpdates, performAppUpdate } = require('./functions/updates/updateManagement');

// Import requirement management functions
const {
  checkSystemRequirements,
  checkDependencies,
  checkPermissions,
  validateAppSettings,
  setupAppEnvironment,
} = require('./functions/requirements/requirementManagement');

// Import role management functions
const { checkUserRole } = require('./functions/roles');
const {
  getRoles,
  getPermissions,
  getUsers,
  addRole,
  updateRole,
  deleteRole,
  moveRole,
  assignRole,
  removeRole,
  searchUsers,
} = require('./functions/roles/roleManagement');

// Import analytics functions
const { getOrganizationAnalytics } = require('./functions/analytics');
const getSystemAnalytics = require('./functions/analytics/getSystemAnalytics');
const { getSecurityMetrics } = require('./functions/security/securityMetrics');

// Import initialization functions
const { initialize, createExampleAPI } = require('./functions/initialization');

// Import content scheduling functions
const {
  scheduleContent,
  processScheduledContent,
  getOptimalPublishTime,
} = require('./functions/scheduledJobs/contentScheduling');

// Import application management functions
const { getOrganizationApplications } = require('./functions/application/applicationManagement');

// Load other cloud functions
require('./functions/cms/pageManagement.js')(Parse);
require('./functions/apis/apiManagement.js');
require('./functions/workflow/workflow.js')(Parse);
require('./functions/assistant');
require('./functions/reports/reportManagement.js')(Parse);
require('./functions/security/securityEvents.js');
require('./functions/theme/themeEditor.js');

// Import NEW refactored modular functions
require('./functions/triggers');
require('./functions/access-policy');

// Import custom schemas
require('./schema/OrgIntegrationConfig');

module.exports = {
  config,
  // Application functions
  checkSlugAvailability,
  createApplication,
  updateApplication,
  // Marketplace functions
  fetchMarketplaceApps,
  installMarketplaceApp,
  // Configuration functions
  getAppConfiguration,
  updateAppConfiguration,
  // Update management functions
  checkForUpdates,
  performAppUpdate,
  // Requirement management functions
  checkSystemRequirements,
  checkDependencies,
  checkPermissions,
  validateAppSettings,
  setupAppEnvironment,
  // Role management functions
  checkUserRole,
  getRoles,
  getPermissions,
  getUsers,
  addRole,
  updateRole,
  deleteRole,
  moveRole,
  assignRole,
  removeRole,
  searchUsers,
  // Analytics functions
  getOrganizationAnalytics,
  getSystemAnalytics,
  getSecurityMetrics,
  // Initialization functions
  initialize,
  createExampleAPI,
  // Content scheduling functions
  scheduleContent,
  processScheduledContent,
  getOptimalPublishTime,
  // Application management functions
  getOrganizationApplications,
};
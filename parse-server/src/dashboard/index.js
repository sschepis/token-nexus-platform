const ParseDashboard = require('parse-dashboard');
const config = require('../config');
const logger = require('../utils/logger');
const extensionManager = require('./extensions');

// Default scripts that can be executed from the dashboard
const defaultScripts = [
  {
    title: 'Delete User',
    classes: ['_User'],
    cloudCodeFunction: 'deleteUser',
    showConfirmationDialog: true,
    confirmationDialogStyle: 'critical',
  },
  {
    title: 'Reset User Password',
    classes: ['_User'],
    cloudCodeFunction: 'resetUserPassword',
    showConfirmationDialog: true,
    confirmationDialogStyle: 'info',
  },
];

// Default info panels for displaying additional information
const defaultInfoPanels = [
  {
    title: 'User Details',
    classes: ['_User'],
    cloudCodeFunction: 'getUserDetails',
  },
  {
    title: 'Organization Details',
    classes: ['Organization'],
    cloudCodeFunction: 'getOrganizationDetails',
  },
];

async function createDashboard() {
  try {
    // Initialize extension manager
    await extensionManager.initialize();

    // Create base dashboard configuration
    const baseConfig = {
      apps: config.dashboard.apps.map(app => ({
        ...app,
        scripts: defaultScripts,
        infoPanel: defaultInfoPanels,
      })),
      users: config.dashboard.users,
      useEncryptedPasswords: config.dashboard.useEncryptedPasswords,
      trustProxy: config.dashboard.trustProxy,
    };

    // Extend configuration with extensions
    const dashboardConfig = extensionManager.extendDashboardConfig(baseConfig);

    // Create dashboard options
    const options = {
      allowInsecureHTTP: config.dashboard.allowInsecureHTTP,
      cookieSessionSecret: config.dashboard.cookieSessionSecret,
    };

    // Create dashboard instance
    const dashboard = new ParseDashboard(dashboardConfig, options);

    // Create wrapper middleware
    return function (req, res, next) {
      dashboard(req, res, err => {
        if (err) {
          logger.error('Dashboard error:', err);

          return next(err);
        }

        next();
      });
    };
  } catch (error) {
    logger.error('Failed to create dashboard:', error);
    throw error;
  }
}

module.exports = createDashboard;

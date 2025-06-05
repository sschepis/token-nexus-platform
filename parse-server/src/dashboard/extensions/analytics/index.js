/* eslint-disable no-promise-executor-return */
/* global Parse */

/**
 * Analytics Dashboard Extension
 * Provides analytics features for the Parse Dashboard
 */

const logger = require('../../../utils/logger');

// Analytics cloud functions
const getActiveUsers = async () => {
  const query = new Parse.Query('_User');

  query.greaterThan('lastLogin', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  const count = await query.count({ useMasterKey: true });

  return count;
};

const getOrganizationStats = async () => {
  const query = new Parse.Query('Organization');
  const [total, active] = await Promise.all([
    query.count({ useMasterKey: true }),
    query.equalTo('status', 'active').count({ useMasterKey: true }),
  ]);

  return { total, active };
};

// Extension configuration
module.exports = {
  id: 'analytics',
  name: 'Analytics Extension',
  version: '1.0.0',
  author: 'GemCMS',
  type: 'dashboard',
  description: 'Adds analytics features to the Parse Dashboard',

  // Scripts that appear in the class-level toolbar
  scripts: [
    {
      id: 'export-user-stats',
      title: 'Export User Statistics',
      classes: ['_User'],
      cloudCodeFunction: 'exportUserStats',
      showConfirmationDialog: true,
      confirmationDialogStyle: 'info',
    },
    {
      id: 'export-org-stats',
      title: 'Export Organization Statistics',
      classes: ['Organization'],
      cloudCodeFunction: 'exportOrganizationStats',
      showConfirmationDialog: true,
      confirmationDialogStyle: 'info',
    },
  ],

  // Info panels that appear in the object details view
  infoPanels: [
    {
      id: 'user-activity',
      title: 'User Activity',
      classes: ['_User'],
      cloudCodeFunction: 'getUserActivity',
    },
    {
      id: 'org-analytics',
      title: 'Organization Analytics',
      classes: ['Organization'],
      cloudCodeFunction: 'getOrganizationAnalytics',
    },
  ],

  // Custom routes for analytics data
  routes: [
    {
      id: 'active-users',
      path: '/analytics/active-users',
      method: 'GET',
      handler: async (req, res) => {
        try {
          const count = await getActiveUsers();

          res.json({ count });
        } catch (error) {
          logger.error('Error getting active users:', error);
          res.status(500).json({ error: 'Failed to get active users' });
        }
      },
    },
    {
      id: 'org-stats',
      path: '/analytics/organization-stats',
      method: 'GET',
      handler: async (req, res) => {
        try {
          const stats = await getOrganizationStats();

          res.json(stats);
        } catch (error) {
          logger.error('Error getting organization stats:', error);
          res.status(500).json({ error: 'Failed to get organization stats' });
        }
      },
    },
  ],

  // Initialize extension
  initialize: async () => {
    logger.info('Initializing analytics extension');

    // Register cloud functions
    Parse.Cloud.define('exportUserStats', async () => {
      // Implementation would go here
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work

      return { message: 'User stats export started' };
    });

    Parse.Cloud.define('exportOrganizationStats', async () => {
      // Implementation would go here
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work

      return { message: 'Organization stats export started' };
    });

    Parse.Cloud.define('getUserActivity', async req => {
      const { user } = req.params;

      // Implementation would go here
      const loginCount = await new Parse.Query('_Session')
        .equalTo('user', user)
        .count({ useMasterKey: true });

      return {
        lastLogin: user.get('lastLogin'),
        loginCount,
        // Add more activity metrics
      };
    });

    Parse.Cloud.define('getOrganizationAnalytics', async req => {
      const { organization } = req.params;

      // Implementation would go here
      const memberCount = await new Parse.Query('_User')
        .equalTo('organizations', organization)
        .count({ useMasterKey: true });

      return {
        memberCount,
        resourceUsage: organization.get('resourceUsage'),
        // Add more analytics metrics
      };
    });

    await new Promise(resolve => setTimeout(resolve, 100)); // Ensure async
    logger.info('Analytics extension initialized successfully');
  },
};

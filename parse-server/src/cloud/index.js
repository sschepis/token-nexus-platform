/**
 * Cloud Functions Index
 * Registers and exports all cloud functions
 */

// Note: content, templates, media, and website modules don't exist yet
// const content = require('./content');
// const templates = require('./templates');
// const media = require('./media');
// const website = require('./website');
const utils = require('../utils');
const logger = utils.logger;
const StandardAppFunctionLoader = require('../utils/standardAppFunctionLoader');

// Require domain-specific cloud function modules.
// Parse.Cloud.define calls within these files will register the functions.
require('./auth');
// DISABLED: Causes duplicate cloud function loading conflicts with primary system
// require('./appStore');
require('./marketplace'); // Require the new marketplace module
// Re-enabled: Primary system organization functions now disabled
require('./organizations');
// DISABLED: Causes duplicate cloud function loading conflicts with primary system
// require('./users');
require('./userManagement'); // Require the new user management module
// require('./orgAppInstallations');
// require('./orgUsers'); // Require the new orgUsers module
// require('./tokens'); // Require the new tokens module
// DISABLED: Causes duplicate cloud function loading conflicts with primary system
// require('./notifications'); // Require the new notifications module
// require('./audit'); // Require the new audit module
// require('./integrations'); // Require the new integrations module
// require('./dashboard'); // Require the new dashboard module
// require('./ai-assistant/main.js'); // DISABLED - Duplicate of cloud/functions/ai/aiAssistant.js
 
 /**
 * Initialize cloud functions and jobs
 * @param {Object} config - Configuration options
 */
const initialize = async (config = {}) => {
  try {
    logger.info('Initializing cloud functions and jobs...');

    // Load standard app cloud functions
    if (config.standardApps?.enabled !== false) {
      const standardAppLoader = new StandardAppFunctionLoader(Parse);
      await standardAppLoader.loadAllStandardAppFunctions();
    }

    // Register background jobs (defined below)
    registerJobs();

    // Register webhooks (defined below)
    if (config.webhooks?.enabled) {
      registerWebhooks();
    }

    logger.info('Cloud functions and jobs initialized successfully');
  } catch (error) {
    logger.error('Error initializing cloud functions and jobs:', error);
    throw error;
  }
};

/**
 * Register background jobs
 */
const registerJobs = () => {
  // Process scheduled content publishing
  Parse.Cloud.job('processScheduledContent', async () => {
    const query = new Parse.Query('CMSContent');
    query.equalTo('status', 'scheduled');
    query.lessThanOrEqualTo('scheduledAt', new Date());
    const contents = await query.find({ useMasterKey: true });
    for (const item of contents) {
      try {
        await Parse.Cloud.run('publishContent', { contentId: item.id }, { useMasterKey: true });
      } catch (error) {
        logger.error(`Error publishing content ${item.id}:`, error);
      }
    }
  });

  // Process scheduled page publishing
  Parse.Cloud.job('processScheduledPages', async () => {
    const query = new Parse.Query('CMSWebPage');
    query.equalTo('status', 'scheduled');
    query.lessThanOrEqualTo('scheduledAt', new Date());
    const pages = await query.find({ useMasterKey: true });
    for (const page of pages) {
      try {
        await Parse.Cloud.run('publishWebsitePage', { pageId: page.id }, { useMasterKey: true });
      } catch (error) {
        logger.error(`Error publishing page ${page.id}:`, error);
      }
    }
  });

  // Clean up unused media
  Parse.Cloud.job('cleanupUnusedMedia', async () => {
    const query = new Parse.Query('CMSMedia');
    query.equalTo('usageCount', 0);
    query.lessThan('createdAt', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 days old
    const mediaItems = await query.find({ useMasterKey: true });
    for (const item of mediaItems) {
      try {
        await Parse.Cloud.run('deleteMedia', { mediaId: item.id }, { useMasterKey: true });
      } catch (error) {
        logger.error(`Error deleting media ${item.id}:`, error);
      }
    }
  });

  // Clean up old page versions
  Parse.Cloud.job('cleanupOldVersions', async () => {
    const query = new Parse.Query('CMSWebPage');
    const pages = await query.find({ useMasterKey: true });
    for (const page of pages) {
      try {
        const versionsQuery = new Parse.Query('CMSWebPageVersion');
        versionsQuery.equalTo('page', page);
        versionsQuery.descending('createdAt');
        versionsQuery.skip(10); // Keep last 10 versions
        const oldVersions = await versionsQuery.find({ useMasterKey: true });
        if (oldVersions.length > 0) {
          await Parse.Object.destroyAll(oldVersions, { useMasterKey: true });
        }
      } catch (error) {
        logger.error(`Error cleaning up versions for page ${page.id}:`, error);
      }
    }
  });
};

/**
 * Register webhook handlers
 */
const registerWebhooks = () => {
  // Content webhooks
  Parse.Cloud.define('content.published', async request => {
    const { contentId } = request.params;
    // Implementation... (ensure this doesn't rely on removed parts or move to content.js if specific)
    // For now, assuming it's generic enough or self-contained.
    // If it calls other cloud functions, ensure they are defined.
    logger.info(`Webhook triggered: content.published for ${contentId}`);
  });

  // Page webhooks
  Parse.Cloud.define('website.page.published', async request => {
    const { pageId } = request.params;
    logger.info(`Webhook triggered: website.page.published for ${pageId}`);
  });

  // Media webhooks
  Parse.Cloud.define('media.processed', async request => {
    const { mediaId } = request.params;
    logger.info(`Webhook triggered: media.processed for ${mediaId}`);
  });
};

module.exports = {
  initialize,
  registerJobs,
  registerWebhooks,
  // Note: Content, template, media, and website modules don't exist yet
  // ...content,
  // ...templates,
  // ...media,
  // ...website,
  // Note: Cloud functions defined in the required modules (auth, appStore, etc.)
  // are automatically registered with Parse Server. No need to spread them here.
};

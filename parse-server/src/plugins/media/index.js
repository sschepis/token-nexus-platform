/**
 * Media Management Plugin for Parse Server
 */

const { loadConfig } = require('./config');
const MediaService = require('./services/MediaService');
const MediaAnalyticsService = require('./services/MediaAnalyticsService');
const MediaCleanupService = require('./services/MediaCleanupService');
const MediaEventsService = require('./services/MediaEventsService');
const MediaMigrationService = require('./services/MediaMigrationService');
const MediaQuotaService = require('./services/MediaQuotaService');

/**
 * Media Plugin
 * @param {Object} config Plugin configuration
 */
class ParseMediaPlugin {
  constructor(config = {}) {
    this.config = loadConfig(config);
  }

  /**
   * Required by Parse Server plugin system
   * Called when plugin is loaded
   * @param {ParseServer} parseServer Parse Server instance
   */
  async load(parseServer) {
    try {
      // Initialize services in dependency order
      await MediaEventsService.initialize({ config: this.config });
      await MediaQuotaService.initialize({ config: this.config });
      await MediaAnalyticsService.initialize({ config: this.config });
      await MediaCleanupService.initialize({ config: this.config });
      await MediaMigrationService.initialize({ config: this.config });
      await MediaService.initialize({ config: this.config });

      // Register schema
      await this.registerSchema(parseServer);

      // Register cloud functions
      this.registerCloudFunctions();

      // Register jobs
      this.registerJobs();

      // Register webhooks if enabled
      if (this.config.webhooks?.enabled) {
        this.registerWebhooks();
      }

      // Start cleanup service if enabled
      if (this.config.cleanup?.enabled) {
        MediaCleanupService.start();
      }
    } catch (error) {
      console.error('Failed to initialize Media Plugin:', error);
      throw error;
    }
  }

  /**
   * Register Parse class schema
   * @param {ParseServer} parseServer Parse Server instance
   */
  async registerSchema(parseServer) {
    const schema = {
      className: 'CMSMedia',
      fields: {
        name: { type: 'String', required: true },
        type: { type: 'String', required: true },
        file: { type: 'File', required: true },
        thumbnails: { type: 'Object' },
        metadata: { type: 'Object' },
        organization: { type: 'Pointer', targetClass: '_User', required: true },
        createdBy: { type: 'Pointer', targetClass: '_User', required: true },
        updatedBy: { type: 'Pointer', targetClass: '_User' },
        usageCount: { type: 'Number', defaultValue: 0 },
        status: { type: 'String', defaultValue: 'active' },
        processingStatus: { type: 'String' },
        processingError: { type: 'String' },
        size: { type: 'Number' },
        bandwidth: { type: 'Number', defaultValue: 0 },
        lastAccessed: { type: 'Date' },
        analytics: { type: 'Object' },
        storage: { type: 'String' },
      },
      indexes: {
        name: { index: true },
        type: { index: true },
        organization: { index: true },
        status: { index: true },
        processingStatus: { index: true },
      },
    };

    await parseServer.config.databaseController
      .loadSchema()
      .then(schemaController => schemaController.addClassIfNotExists(schema));
  }

  /**
   * Register cloud functions
   */
  registerCloudFunctions() {
    // Media operations
    Parse.Cloud.define('uploadMedia', MediaService.uploadMedia.bind(MediaService));
    Parse.Cloud.define('getMedia', MediaService.getMedia.bind(MediaService));
    Parse.Cloud.define('deleteMedia', MediaService.deleteMedia.bind(MediaService));
    Parse.Cloud.define('optimizeMedia', MediaService.optimizeMedia.bind(MediaService));

    // Analytics operations
    Parse.Cloud.define(
      'getMediaAnalytics',
      MediaAnalyticsService.getAnalytics.bind(MediaAnalyticsService)
    );
    Parse.Cloud.define(
      'getTrendingMedia',
      MediaAnalyticsService.getTrendingMedia.bind(MediaAnalyticsService)
    );
    Parse.Cloud.define(
      'generateMediaReport',
      MediaAnalyticsService.generateReport.bind(MediaAnalyticsService)
    );

    // Quota operations
    Parse.Cloud.define('checkMediaQuota', MediaQuotaService.checkQuota.bind(MediaQuotaService));
    Parse.Cloud.define('getMediaQuota', MediaQuotaService.getUserQuota.bind(MediaQuotaService));
    Parse.Cloud.define(
      'getOrganizationMediaQuota',
      MediaQuotaService.getOrganizationQuota.bind(MediaQuotaService)
    );

    // Migration operations
    Parse.Cloud.define(
      'startMediaMigration',
      MediaMigrationService.startMigration.bind(MediaMigrationService)
    );
    Parse.Cloud.define(
      'getMediaMigrationStatus',
      MediaMigrationService.getProgress.bind(MediaMigrationService)
    );
  }

  /**
   * Register background jobs
   */
  registerJobs() {
    // Cleanup jobs
    Parse.Cloud.job('cleanupUnusedMedia', MediaCleanupService.runCleanup.bind(MediaCleanupService));
    Parse.Cloud.job(
      'cleanupTempFiles',
      MediaCleanupService.cleanupTempFiles.bind(MediaCleanupService)
    );

    // Analytics jobs
    Parse.Cloud.job(
      'aggregateMediaAnalytics',
      MediaAnalyticsService.aggregateAnalytics.bind(MediaAnalyticsService)
    );

    // Quota jobs
    Parse.Cloud.job('resetBandwidthQuotas', async () => {
      const query = new Parse.Query('_User');
      const users = await query.find({ useMasterKey: true });
      await Promise.all(users.map(user => MediaQuotaService.resetBandwidth(user.id)));
    });

    // Migration jobs
    Parse.Cloud.job('retryFailedMediaProcessing', async () => {
      const query = new Parse.Query('CMSMedia');
      query.equalTo('processingStatus', 'failed');

      const media = await query.find({ useMasterKey: true });

      for (const item of media) {
        try {
          await MediaService.processMedia(item.id);
        } catch (error) {
          console.error(`Error processing media ${item.id}:`, error);
        }
      }
    });
  }

  /**
   * Register webhooks
   */
  registerWebhooks() {
    const events = [
      'media.uploaded',
      'media.processed',
      'media.deleted',
      'media.accessed',
      'media.quota.exceeded',
      'media.cleanup.completed',
      'media.migration.completed',
    ];

    events.forEach(event => {
      if (this.config.webhooks.endpoints) {
        this.config.webhooks.endpoints.forEach(endpoint => {
          MediaEventsService.registerWebhook(event, endpoint, {
            secret: this.config.webhooks.secret,
          });
        });
      }
    });
  }
}

module.exports = ParseMediaPlugin;

/**
 * Media Migration Service
 * Handles media migrations, format conversions, and storage transitions
 */

const BaseService = require('../../../services/BaseService');

class MediaMigrationService extends BaseService {
  constructor() {
    super('MediaMigration');
    this.running = false;
    this.progress = {
      total: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
    };
    this.errors = [];
  }

  /**
   * Service-specific initialization
   * @param {Object} options Initialization options
   */
  async _initializeService(options = {}) {
    // Register dependencies
    const MediaService = require('./MediaService');
    const MediaEventsService = require('./MediaEventsService');
    const MediaUtils = require('../utils/mediaUtils');

    this.registerDependency('media', MediaService);
    this.registerDependency('events', MediaEventsService);
    this.mediaUtils = new MediaUtils(this.config);

    // Register cleanup handler
    this.registerCleanup(async () => {
      this.running = false;
      this.resetProgress();
    });
  }

  /**
   * Start migration process
   * @param {Object} options Migration options
   * @returns {Promise<Object>} Migration results
   */
  async startMigration(options = {}) {
    return this.executeOperation(
      async () => {
        if (this.running) {
          throw new Error('Migration already in progress');
        }

        this.validateOptions(options);
        this.running = true;
        this.resetProgress();

        try {
          const events = this.getDependency('events');
          events.emit('media.migration.started', {
            options,
            timestamp: new Date(),
          });

          const results = await this.executeMigration(options);

          events.emit('media.migration.completed', {
            results,
            timestamp: new Date(),
          });

          return results;
        } catch (error) {
          const events = this.getDependency('events');
          events.emit('media.migration.error', {
            error: error.message,
            timestamp: new Date(),
          });
          throw error;
        } finally {
          this.running = false;
        }
      },
      'startMigration',
      { options }
    );
  }

  /**
   * Execute migration process
   * @param {Object} options Migration options
   * @returns {Promise<Object>} Migration results
   */
  async executeMigration(options) {
    const {
      type = 'storage',
      source,
      target,
      filters = {},
      batchSize = 100,
      dryRun = false,
    } = options;

    // Get media to migrate
    const query = this.buildMigrationQuery(filters);
    this.progress.total = await query.count({ useMasterKey: true });

    if (this.progress.total === 0) {
      return this.getProgress();
    }

    // Process in batches
    let skip = 0;
    while (skip < this.progress.total) {
      query.limit(batchSize);
      query.skip(skip);
      const batch = await query.find({ useMasterKey: true });

      await Promise.all(batch.map(media => this.migrateMedia(media, type, source, target, dryRun)));

      skip += batchSize;
    }

    return this.getProgress();
  }

  /**
   * Build migration query
   * @param {Object} filters Query filters
   * @returns {Parse.Query} Query object
   */
  buildMigrationQuery(filters) {
    const query = new Parse.Query('CMSMedia');

    if (filters.status) {
      query.equalTo('status', filters.status);
    }
    if (filters.type) {
      query.equalTo('type', filters.type);
    }
    if (filters.minSize) {
      query.greaterThanOrEqualTo('size', filters.minSize);
    }
    if (filters.maxSize) {
      query.lessThanOrEqualTo('size', filters.maxSize);
    }
    if (filters.before) {
      query.lessThan('createdAt', new Date(filters.before));
    }
    if (filters.after) {
      query.greaterThan('createdAt', new Date(filters.after));
    }

    return query;
  }

  /**
   * Migrate single media item
   * @param {Parse.Object} media Media object
   * @param {string} type Migration type
   * @param {string} source Source configuration
   * @param {string} target Target configuration
   * @param {boolean} dryRun Whether to simulate migration
   * @returns {Promise<void>}
   */
  async migrateMedia(media, type, source, target, dryRun) {
    return this.executeOperation(
      async () => {
        try {
          switch (type) {
            case 'storage':
              await this.migrateStorage(media, source, target, dryRun);
              break;
            case 'format':
              await this.migrateFormat(media, source, target, dryRun);
              break;
            case 'optimize':
              await this.optimizeMedia(media, target, dryRun);
              break;
            default:
              throw new Error(`Unknown migration type: ${type}`);
          }

          this.progress.completed++;
        } catch (error) {
          this.progress.failed++;
          this.errors.push({
            mediaId: media.id,
            error: error.message,
          });
          this.logger.error(`Migration failed for media ${media.id}:`, {
            metadata: {
              mediaId: media.id,
              type,
              source,
              target,
            },
            stack: error.stack,
          });
        }
      },
      'migrateMedia',
      { mediaId: media.id, type }
    );
  }

  /**
   * Migrate media storage
   * @param {Parse.Object} media Media object
   * @param {string} source Source storage
   * @param {string} target Target storage
   * @param {boolean} dryRun Whether to simulate migration
   * @returns {Promise<void>}
   */
  async migrateStorage(media, source, target, dryRun) {
    const file = media.get('file');
    if (!file) {
      this.progress.skipped++;
      return;
    }

    // Download from source
    const buffer = await file.getData();

    if (!dryRun) {
      const mediaService = this.getDependency('media');

      // Upload to target
      const newFile = await mediaService.uploadFile(buffer, {
        filename: file.name(),
        type: media.get('type'),
        storage: target,
      });

      // Update media record
      media.set('file', newFile);
      media.set('storage', target);
      await media.save(null, { useMasterKey: true });

      // Clean up old file if needed
      if (source !== target) {
        await file.destroy({ useMasterKey: true });
      }
    }
  }

  /**
   * Migrate media format
   * @param {Parse.Object} media Media object
   * @param {string} source Source format
   * @param {string} target Target format
   * @param {boolean} dryRun Whether to simulate migration
   * @returns {Promise<void>}
   */
  async migrateFormat(media, source, target, dryRun) {
    const file = media.get('file');
    if (!file || !this.mediaUtils.isImage(media.get('type'))) {
      this.progress.skipped++;
      return;
    }

    // Download and convert
    const buffer = await file.getData();
    const converted = await this.mediaUtils.convertImageFormat(buffer, target);

    if (!dryRun) {
      const mediaService = this.getDependency('media');

      // Upload converted file
      const newFile = await mediaService.uploadFile(converted, {
        filename: file.name().replace(/\.[^/.]+$/, `.${target}`),
        type: `image/${target}`,
      });

      // Update media record
      media.set('file', newFile);
      media.set('type', `image/${target}`);
      await media.save(null, { useMasterKey: true });

      // Clean up old file
      await file.destroy({ useMasterKey: true });
    }
  }

  /**
   * Optimize media
   * @param {Parse.Object} media Media object
   * @param {Object} options Optimization options
   * @param {boolean} dryRun Whether to simulate optimization
   * @returns {Promise<void>}
   */
  async optimizeMedia(media, options, dryRun) {
    const file = media.get('file');
    if (!file || !this.mediaUtils.isImage(media.get('type'))) {
      this.progress.skipped++;
      return;
    }

    // Download and optimize
    const buffer = await file.getData();
    const mediaService = this.getDependency('media');
    const optimized = await mediaService.optimizeAsset(buffer, options);

    if (!dryRun) {
      // Upload optimized file
      const newFile = await mediaService.uploadFile(optimized.buffer, {
        filename: file.name(),
        type: media.get('type'),
      });

      // Update media record
      media.set('file', newFile);
      media.set('size', optimized.buffer.length);
      media.set('metadata', {
        ...media.get('metadata'),
        ...optimized.metadata,
      });
      await media.save(null, { useMasterKey: true });

      // Clean up old file
      await file.destroy({ useMasterKey: true });
    }
  }

  /**
   * Get migration progress
   * @returns {Object} Progress information
   */
  getProgress() {
    return {
      ...this.progress,
      running: this.running,
      errors: this.errors,
      timestamp: new Date(),
    };
  }

  /**
   * Reset migration progress
   */
  resetProgress() {
    this.progress = {
      total: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
    };
    this.errors = [];
  }

  /**
   * Validate migration options
   * @param {Object} options Migration options
   * @throws {Error} If options are invalid
   */
  validateOptions(options) {
    const { type, source, target } = options;

    if (!type) {
      throw new Error('Migration type is required');
    }

    switch (type) {
      case 'storage':
        if (!source || !target) {
          throw new Error('Source and target storage are required');
        }
        if (!this.config.storage[source] || !this.config.storage[target]) {
          throw new Error('Invalid storage configuration');
        }
        break;

      case 'format':
        if (!source || !target) {
          throw new Error('Source and target formats are required');
        }
        if (
          !this.config.image.formats.input.includes(source) ||
          !this.config.image.formats.output.includes(target)
        ) {
          throw new Error('Invalid format configuration');
        }
        break;

      case 'optimize':
        if (!target || typeof target !== 'object') {
          throw new Error('Optimization options are required');
        }
        break;

      default:
        throw new Error(`Unknown migration type: ${type}`);
    }
  }
}

module.exports = new MediaMigrationService();

/**
 * Media Service
 * Handles media asset management, optimization, and storage
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const EventEmitter = require('events');
const BaseService = require('../../../services/BaseService');

class MediaService extends BaseService {
  constructor() {
    super('Media');
    this.supportedFormats = new Set(['jpeg', 'png', 'webp', 'gif', 'avif']);
    this.uploadPath = path.join(process.cwd(), 'uploads');
    this.cachePath = path.join(process.cwd(), 'cache');
    this.events = new EventEmitter();
    this.quotaEnabled = true;
  }

  /**
   * Service-specific initialization
   * @param {Object} options Initialization options
   */
  async _initializeService(options = {}) {
    // Register dependencies
    const CacheService = require('../../../services/CacheService');
    const AnalyticsService = require('../../../services/AnalyticsService');

    this.registerDependency('cache', CacheService);
    this.registerDependency('analytics', AnalyticsService);

    // Ensure directories exist
    await Promise.all([
      fs.mkdir(this.uploadPath, { recursive: true }),
      fs.mkdir(this.cachePath, { recursive: true }),
    ]);

    // Initialize event handlers
    this.setupEventHandlers();

    // Start cleanup service if enabled
    if (options.cleanup?.enabled) {
      this.startCleanupService(options.cleanup);
    }

    // Register cleanup handler
    this.registerCleanup(async () => {
      await this._cleanupTempFiles();
      this.stopCleanupService();
    });
  }

  /**
   * Set up event handlers
   */
  setupEventHandlers() {
    // Media events
    this.events.on('media.uploaded', this.handleMediaUploaded.bind(this));
    this.events.on('media.processed', this.handleMediaProcessed.bind(this));
    this.events.on('media.deleted', this.handleMediaDeleted.bind(this));

    // Quota events
    this.events.on('media.quota.exceeded', this.handleQuotaExceeded.bind(this));

    // Cleanup events
    this.events.on('media.cleanup.completed', this.handleCleanupCompleted.bind(this));
    this.events.on('media.cleanup.error', this.handleCleanupError.bind(this));

    // Migration events
    this.events.on('media.migration.completed', this.handleMigrationCompleted.bind(this));
    this.events.on('media.migration.error', this.handleMigrationError.bind(this));
  }

  /**
   * Upload media file
   * @param {Buffer} buffer File buffer
   * @param {string} filename Filename
   * @param {Object} options Validation options
   * @private
   */
  async _validateFile(buffer, filename, options = {}) {
    const { type, maxSize = 10 * 1024 * 1024 } = options; // 10MB default

    if (buffer.length > maxSize) {
      throw new Error(`File size exceeds maximum allowed (${maxSize} bytes)`);
    }

    if (type && type.startsWith('image/')) {
      try {
        const metadata = await this._getMetadata(buffer);
        this._validateFormat(metadata.format);
      } catch (error) {
        throw new Error(`Invalid image file: ${error.message}`);
      }
    }
  }

  /**
   * Get asset metadata
   * @param {Buffer} buffer Asset buffer
   * @returns {Promise<Object>} Asset metadata
   * @private
   */
  async _getMetadata(buffer) {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    return {
      format: metadata.format,
      dimensions: {
        width: metadata.width,
        height: metadata.height,
      },
      hasAlpha: metadata.hasAlpha,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      density: metadata.density,
      chromaSubsampling: metadata.chromaSubsampling,
      isProgressive: metadata.isProgressive,
      pages: metadata.pages,
      compression: metadata.compression,
    };
  }

  /**
   * Validate asset format
   * @param {string} format Asset format
   * @private
   */
  _validateFormat(format) {
    if (!this.supportedFormats.has(format)) {
      throw new Error(
        `Unsupported format: ${format}. Supported formats: ${Array.from(this.supportedFormats).join(
          ', '
        )}`
      );
    }
  }

  /**
   * Generate asset hash
   * @param {Buffer} buffer Asset buffer
   * @returns {Promise<string>} Asset hash
   * @private
   */
  async _generateHash(buffer) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 16);
  }

  /**
   * Optimize asset
   * @param {Buffer} buffer Asset buffer
   * @param {Object} options Optimization options
   * @returns {Promise<Buffer>} Optimized buffer
   * @private
   */
  async _optimizeAsset(buffer, options) {
    const {
      format,
      quality = 80,
      width,
      height,
      fit = 'cover',
      background = { r: 255, g: 255, b: 255, alpha: 1 },
    } = options;

    let pipeline = sharp(buffer);

    // Apply resize if dimensions provided
    if (width || height) {
      pipeline = pipeline.resize(width, height, {
        fit,
        background,
        withoutEnlargement: true,
      });
    }

    // Apply format-specific optimizations
    switch (format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({
          quality,
          progressive: true,
          optimizeCoding: true,
          trellisQuantisation: true,
          overshootDeringing: true,
          optimizeScans: true,
        });
        break;
      case 'png':
        pipeline = pipeline.png({
          quality,
          progressive: true,
          palette: true,
          compressionLevel: 9,
          adaptiveFiltering: true,
        });
        break;
      case 'webp':
        pipeline = pipeline.webp({
          quality,
          lossless: quality === 100,
          nearLossless: quality > 90,
          smartSubsample: true,
          effort: 6, // Maximum compression effort
        });
        break;
      case 'avif':
        pipeline = pipeline.avif({
          quality,
          lossless: quality === 100,
          effort: 9, // Maximum compression effort
        });
        break;
      case 'gif':
        pipeline = pipeline.gif({
          colours: 256,
          effort: 10, // Maximum compression effort
        });
        break;
    }

    return pipeline.toBuffer();
  }

  /**
   * Transform asset
   * @param {Buffer} buffer Asset buffer
   * @param {Object} options Transform options
   * @returns {Promise<Buffer>} Transformed buffer
   * @private
   */
  async _transformAsset(buffer, options) {
    const {
      width,
      height,
      format,
      quality = 80,
      fit = 'cover',
      position = 'centre',
      background = { r: 255, g: 255, b: 255, alpha: 1 },
      withoutEnlargement = true,
      sharpen = false,
      blur = false,
      rotate = false,
      flip = false,
      flop = false,
      normalize = false,
      tint = false,
    } = options;

    let pipeline = sharp(buffer);

    // Apply transformations in optimal order
    if (rotate) {
      pipeline = pipeline.rotate(rotate);
    }

    if (flip) {
      pipeline = pipeline.flip();
    }

    if (flop) {
      pipeline = pipeline.flop();
    }

    if (width || height) {
      pipeline = pipeline.resize(width, height, {
        fit,
        position,
        background,
        withoutEnlargement,
      });
    }

    if (sharpen) {
      pipeline = pipeline.sharpen(sharpen === true ? undefined : sharpen);
    }

    if (blur) {
      pipeline = pipeline.blur(blur === true ? 1 : blur);
    }

    if (normalize) {
      pipeline = pipeline.normalize();
    }

    if (tint) {
      pipeline = pipeline.tint(tint);
    }

    if (format) {
      this._validateFormat(format);
      pipeline = pipeline.toFormat(format, { quality });
    }

    return pipeline.toBuffer();
  }

  /**
   * Cleanup temporary files
   * @private
   */
  async _cleanupTempFiles() {
    try {
      const files = await fs.readdir(this.cachePath);
      await Promise.all(
        files.map(file =>
          fs.unlink(path.join(this.cachePath, file)).catch(error => {
            this.logger.error(`Failed to delete temp file ${file}:`, {
              metadata: { error: error.message },
              stack: error.stack,
            });
          })
        )
      );
    } catch (error) {
      this.logger.error('Error cleaning up temporary files:', {
        metadata: { error: error.message },
        stack: error.stack,
      });
    }
  }

  /**
   * Upload media file
   * @param {Buffer} buffer File buffer
   * @param {Object} options Upload options
   * @returns {Promise<Parse.Object>} Media object
   */
  async uploadMedia(buffer, options) {
    return this.executeOperation(
      async () => {
        const { filename, type, userId, metadata = {}, acl = null } = options;

        // Validate file
        await this._validateFile(buffer, filename, { type });

        // Check quota if enabled
        if (this.quotaEnabled) {
          const quotaCheck = await this.checkQuota(userId, {
            type: 'upload',
            size: buffer.length,
          });

          if (!quotaCheck.allowed) {
            throw new Error('Storage quota exceeded');
          }
        }

        // Process and optimize file
        const processed = await this.optimizeAsset(buffer, {
          type,
          filename,
        });

        // Create media record
        const media = new Parse.Object('CMSMedia');
        const file = new Parse.File(filename, processed.buffer);

        media.set({
          file,
          type,
          size: processed.buffer.length,
          owner: Parse.User.createWithoutData(userId),
          status: 'active',
          metadata: {
            ...metadata,
            ...processed.metadata,
          },
        });

        if (acl) {
          media.setACL(acl);
        }

        await media.save(null, { useMasterKey: true });

        // Track usage if quota enabled
        if (this.quotaEnabled) {
          await this.trackQuotaUsage(userId, {
            type: 'upload',
            size: processed.buffer.length,
          });
        }

        // Emit event
        this.events.emit('media.uploaded', {
          mediaId: media.id,
          userId,
          size: processed.buffer.length,
          type,
        });

        return media;
      },
      'uploadMedia',
      { options }
    );
  }

  /**
   * Get media file
   * @param {string} mediaId Media ID
   * @param {Object} options Request options
   * @returns {Promise<Object>} Media data
   */
  async getMedia(mediaId, options = {}) {
    return this.executeOperation(
      async () => {
        const { userId, download = false } = options;

        const media = await new Parse.Query('CMSMedia').get(mediaId, { useMasterKey: true });

        // Check access
        const acl = media.getACL();
        if (acl && !acl.getReadAccess(userId)) {
          throw new Error('Access denied');
        }

        const file = media.get('file');
        if (!file) {
          throw new Error('File not found');
        }

        // Track access
        this.events.emit('media.accessed', {
          mediaId,
          userId,
          type: download ? 'download' : 'view',
        });

        // Update last accessed timestamp
        media.set('lastAccessed', new Date());
        await media.save(null, { useMasterKey: true });

        // Track bandwidth if downloading and quota enabled
        if (download && this.quotaEnabled) {
          await this.trackQuotaUsage(userId, {
            type: 'bandwidth',
            size: media.get('size'),
          });
        }

        return {
          url: file.url(),
          type: media.get('type'),
          size: media.get('size'),
          metadata: media.get('metadata'),
        };
      },
      'getMedia',
      { mediaId, options }
    );
  }

  /**
   * Delete media file
   * @param {string} mediaId Media ID
   * @param {Object} options Delete options
   */
  async deleteMedia(mediaId, options = {}) {
    return this.executeOperation(
      async () => {
        const { userId, force = false } = options;

        const media = await new Parse.Query('CMSMedia').get(mediaId, { useMasterKey: true });

        // Check access
        const acl = media.getACL();
        if (!force && acl && !acl.getWriteAccess(userId)) {
          throw new Error('Access denied');
        }

        const file = media.get('file');
        if (file) {
          await file.destroy({ useMasterKey: true });
        }

        await media.destroy({ useMasterKey: true });

        // Update quota if enabled
        if (this.quotaEnabled && userId) {
          await this.trackQuotaUsage(userId, {
            type: 'delete',
            size: media.get('size'),
          });
        }

        // Emit event
        this.events.emit('media.deleted', {
          mediaId,
          userId,
          size: media.get('size'),
        });
      },
      'deleteMedia',
      { mediaId, options }
    );
  }

  /**
   * Check user quota
   * @param {string} userId User ID
   * @param {Object} operation Operation details
   * @returns {Promise<Object>} Quota check result
   */
  async checkQuota(userId, operation) {
    return this.executeOperation(
      async () => {
        const query = new Parse.Query('UserQuota');
        query.equalTo('user', Parse.User.createWithoutData(userId));

        let quota = await query.first({ useMasterKey: true });
        if (!quota) {
          quota = new Parse.Object('UserQuota');
          quota.set('user', Parse.User.createWithoutData(userId));
          quota.set('storageUsed', 0);
          quota.set('bandwidthUsed', 0);
          await quota.save(null, { useMasterKey: true });
        }

        const storageLimit = quota.get('storageLimit') || 1024 * 1024 * 100; // 100MB default
        const bandwidthLimit = quota.get('bandwidthLimit') || 1024 * 1024 * 1000; // 1GB default

        const storageUsed = quota.get('storageUsed') || 0;
        const bandwidthUsed = quota.get('bandwidthUsed') || 0;

        if (operation.type === 'upload') {
          return {
            allowed: storageUsed + operation.size <= storageLimit,
            remaining: storageLimit - storageUsed,
          };
        }

        if (operation.type === 'bandwidth') {
          return {
            allowed: bandwidthUsed + operation.size <= bandwidthLimit,
            remaining: bandwidthLimit - bandwidthUsed,
          };
        }

        return { allowed: true };
      },
      'checkQuota',
      { userId, operation }
    );
  }

  /**
   * Track quota usage
   * @param {string} userId User ID
   * @param {Object} operation Operation details
   */
  async trackQuotaUsage(userId, operation) {
    return this.executeOperation(
      async () => {
        const query = new Parse.Query('UserQuota');
        query.equalTo('user', Parse.User.createWithoutData(userId));

        const quota = await query.first({ useMasterKey: true });
        if (!quota) return;

        switch (operation.type) {
          case 'upload':
            quota.increment('storageUsed', operation.size);
            break;
          case 'delete':
            quota.increment('storageUsed', -operation.size);
            break;
          case 'bandwidth':
            quota.increment('bandwidthUsed', operation.size);
            break;
        }

        await quota.save(null, { useMasterKey: true });
      },
      'trackQuotaUsage',
      { userId, operation }
    );
  }

  /**
   * Start cleanup service
   * @param {Object} options Cleanup options
   */
  startCleanupService(options = {}) {
    const {
      interval = 24 * 60 * 60 * 1000, // 24 hours
      maxAge = 30 * 24 * 60 * 60 * 1000, // 30 days
    } = options;

    this.cleanupInterval = setInterval(async () => {
      try {
        const query = new Parse.Query('CMSMedia');
        query.lessThan('lastAccessed', new Date(Date.now() - maxAge));
        query.equalTo('status', 'inactive');

        const media = await query.find({ useMasterKey: true });

        for (const item of media) {
          await this.deleteMedia(item.id, { force: true });
        }

        this.events.emit('media.cleanup.completed', {
          count: media.length,
        });
      } catch (error) {
        this.events.emit('media.cleanup.error', {
          error: error.message,
        });
      }
    }, interval);
  }

  /**
   * Stop cleanup service
   */
  stopCleanupService() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Event handlers
   */

  async handleMediaUploaded(data) {
    this.logger.info('Media uploaded:', { metadata: data });
  }

  async handleMediaProcessed(data) {
    this.logger.info('Media processed:', { metadata: data });
  }

  async handleMediaDeleted(data) {
    this.logger.info('Media deleted:', { metadata: data });
  }

  async handleQuotaExceeded(data) {
    this.logger.warn('Quota exceeded:', { metadata: data });
  }

  async handleCleanupCompleted(data) {
    this.logger.info('Cleanup completed:', { metadata: data });
  }

  async handleCleanupError(data) {
    this.logger.error('Cleanup error:', { metadata: data });
  }

  async handleMigrationCompleted(data) {
    this.logger.info('Migration completed:', { metadata: data });
  }

  async handleMigrationError(data) {
    this.logger.error('Migration error:', { metadata: data });
  }
}

module.exports = new MediaService();

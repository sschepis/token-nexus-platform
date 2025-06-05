/**
 * Media Cleanup Service
 * Handles automatic cleanup of media files and resources
 */

const fs = require('fs').promises;
const path = require('path');
const BaseService = require('../../../services/BaseService');

class MediaCleanupService extends BaseService {
  constructor() {
    super('MediaCleanup');
    this.running = false;
    this.lastRun = null;
    this.stats = {
      filesDeleted: 0,
      bytesRecovered: 0,
      lastCleanup: null,
    };
  }

  /**
   * Service-specific initialization
   * @param {Object} options Initialization options
   */
  async _initializeService(options = {}) {
    // Start cleanup service if enabled
    if (this.config.cleanup?.enabled) {
      this.start();
    }

    // Register cleanup handler
    this.registerCleanup(async () => {
      this.stop();
    });
  }

  /**
   * Start cleanup service
   */
  start() {
    if (this.running) return;
    this.running = true;
    this.logger.info('Media cleanup service started');
    this.scheduleCleanup();
  }

  /**
   * Stop cleanup service
   */
  stop() {
    this.running = false;
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
    }
    this.logger.info('Media cleanup service stopped');
  }

  /**
   * Schedule next cleanup
   */
  scheduleCleanup() {
    if (!this.running) return;

    const now = Date.now();
    const nextRun = this.lastRun ? this.lastRun + this.config.cleanup.interval : now;

    const delay = Math.max(0, nextRun - now);

    this.cleanupTimeout = setTimeout(() => this.runCleanup(), delay);
  }

  /**
   * Run cleanup process
   */
  async runCleanup() {
    return this.executeOperation(async () => {
      this.lastRun = Date.now();
      const startTime = Date.now();

      await Promise.all([
        this.cleanupUnusedMedia(),
        this.cleanupTempFiles(),
        this.cleanupExpiredContent(),
        this.cleanupOrphanedFiles(),
      ]);

      this.stats.lastCleanup = new Date();
      this.stats.duration = Date.now() - startTime;

      // Emit cleanup completed event
      this.events.emit('media.cleanup.completed', {
        stats: this.stats,
        timestamp: new Date(),
      });

      // Schedule next cleanup
      this.scheduleCleanup();

      return this.stats;
    }, 'runCleanup');
  }

  /**
   * Clean up unused media files
   */
  async cleanupUnusedMedia() {
    return this.executeOperation(async () => {
      const query = new Parse.Query('CMSMedia');
      query.equalTo('status', 'unused');
      query.lessThan('lastAccessed', new Date(Date.now() - this.config.cleanup.unusedThreshold));

      const unusedMedia = await query.find({ useMasterKey: true });
      let deletedCount = 0;
      let bytesRecovered = 0;

      for (const media of unusedMedia) {
        try {
          // Get file size before deletion
          const size = media.get('size') || 0;

          // Delete file and record
          await media.destroy({ useMasterKey: true });

          deletedCount++;
          bytesRecovered += size;

          this.events.emit('media.deleted', {
            mediaId: media.id,
            reason: 'unused',
            size,
          });
        } catch (error) {
          this.logger.error(`Error deleting unused media ${media.id}:`, {
            metadata: { mediaId: media.id },
            stack: error.stack,
          });
        }
      }

      this.stats.filesDeleted += deletedCount;
      this.stats.bytesRecovered += bytesRecovered;

      return { deletedCount, bytesRecovered };
    }, 'cleanupUnusedMedia');
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles() {
    return this.executeOperation(async () => {
      const tempDir = this.config.storage.local.tempDir;
      let deletedCount = 0;
      let bytesRecovered = 0;

      try {
        const files = await fs.readdir(tempDir);
        const now = Date.now();

        for (const file of files) {
          const filePath = path.join(tempDir, file);
          try {
            const stats = await fs.stat(filePath);
            const age = now - stats.mtimeMs;

            if (age > this.config.cleanup.tempFileThreshold) {
              await fs.unlink(filePath);
              deletedCount++;
              bytesRecovered += stats.size;
            }
          } catch (error) {
            this.logger.error(`Error processing temp file ${file}:`, {
              metadata: { file },
              stack: error.stack,
            });
          }
        }
      } catch (error) {
        this.logger.error('Error cleaning up temp files:', {
          metadata: { tempDir },
          stack: error.stack,
        });
      }

      this.stats.filesDeleted += deletedCount;
      this.stats.bytesRecovered += bytesRecovered;

      return { deletedCount, bytesRecovered };
    }, 'cleanupTempFiles');
  }

  /**
   * Clean up expired content
   */
  async cleanupExpiredContent() {
    return this.executeOperation(async () => {
      const query = new Parse.Query('CMSMedia');
      query.lessThan('expiresAt', new Date());
      query.exists('expiresAt');

      const expiredMedia = await query.find({ useMasterKey: true });
      let deletedCount = 0;
      let bytesRecovered = 0;

      for (const media of expiredMedia) {
        try {
          const size = media.get('size') || 0;
          await media.destroy({ useMasterKey: true });

          deletedCount++;
          bytesRecovered += size;

          this.events.emit('media.deleted', {
            mediaId: media.id,
            reason: 'expired',
            size,
          });
        } catch (error) {
          this.logger.error(`Error deleting expired media ${media.id}:`, {
            metadata: { mediaId: media.id },
            stack: error.stack,
          });
        }
      }

      this.stats.filesDeleted += deletedCount;
      this.stats.bytesRecovered += bytesRecovered;

      return { deletedCount, bytesRecovered };
    }, 'cleanupExpiredContent');
  }

  /**
   * Clean up orphaned files
   */
  async cleanupOrphanedFiles() {
    return this.executeOperation(async () => {
      let deletedCount = 0;
      let bytesRecovered = 0;

      // Get all media file references
      const query = new Parse.Query('CMSMedia');
      const media = await query.find({ useMasterKey: true });
      const validFiles = new Set(media.map(m => m.get('file')?.name()).filter(Boolean));

      // Check files in storage
      try {
        const files = await this.listStorageFiles();

        for (const file of files) {
          if (!validFiles.has(path.basename(file.path))) {
            try {
              const size = file.size || 0;
              await this.deleteStorageFile(file.path);

              deletedCount++;
              bytesRecovered += size;

              this.events.emit('media.deleted', {
                path: file.path,
                reason: 'orphaned',
                size,
              });
            } catch (error) {
              this.logger.error(`Error deleting orphaned file ${file.path}:`, {
                metadata: { filePath: file.path },
                stack: error.stack,
              });
            }
          }
        }
      } catch (error) {
        this.logger.error('Error cleaning up orphaned files:', {
          stack: error.stack,
        });
      }

      this.stats.filesDeleted += deletedCount;
      this.stats.bytesRecovered += bytesRecovered;

      return { deletedCount, bytesRecovered };
    }, 'cleanupOrphanedFiles');
  }

  /**
   * List files in storage
   * @returns {Promise<Array>} List of files
   */
  async listStorageFiles() {
    return this.executeOperation(async () => {
      if (this.config.storage.provider === 'parse') {
        // Use Parse Server file adapter
        return Parse.Cloud.run('listFiles');
      } else {
        throw new Error(`Storage provider ${this.config.storage.provider} not supported`);
      }
    }, 'listStorageFiles');
  }

  /**
   * Delete file from storage
   * @param {string} path File path
   * @returns {Promise<void>}
   */
  async deleteStorageFile(path) {
    return this.executeOperation(
      async () => {
        if (this.config.storage.provider === 'parse') {
          // Use Parse Server file adapter
          return Parse.Cloud.run('deleteFile', { path });
        } else {
          throw new Error(`Storage provider ${this.config.storage.provider} not supported`);
        }
      },
      'deleteStorageFile',
      { path }
    );
  }

  /**
   * Get cleanup statistics
   * @returns {Object} Cleanup statistics
   */
  getStats() {
    return {
      ...this.stats,
      running: this.running,
      nextRun: this.lastRun ? new Date(this.lastRun + this.config.cleanup.interval) : null,
    };
  }

  /**
   * Reset cleanup statistics
   */
  resetStats() {
    this.stats = {
      filesDeleted: 0,
      bytesRecovered: 0,
      lastCleanup: null,
    };
  }
}

module.exports = new MediaCleanupService();

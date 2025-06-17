/**
 * Media Manager Service
 * Handles media file uploads, processing, and optimization
 */

const fs = require('fs').promises;
const path = require('path');
const BaseService = require('../services/BaseService');

// Try to load sharp, but handle gracefully if it fails
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.warn('Sharp package not available, image optimization will be disabled:', error.message);
  sharp = null;
}

class MediaManager extends BaseService {
  constructor() {
    super('Media');
    this.uploadDir = './uploads';
    this.initialized = false;
  }

  /**
   * Initialize the media manager
   * @param {Object} options Initialization options
   */
  async _initializeService(options = {}) {
    try {
      // Ensure upload directory exists
      await fs.mkdir(this.uploadDir, { recursive: true });

      // Initialize cleanup schedule
      if (options.cleanupInterval) {
        setInterval(() => this.cleanup(), options.cleanupInterval);
      }

      console.log('Media manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize media manager:', error);
      throw error;
    }
  }

  /**
   * Optimize media asset
   * @param {Buffer} buffer Asset buffer
   * @param {Object} options Optimization options
   * @returns {Promise<Buffer>} Optimized asset
   */
  async optimizeAsset(buffer, options = {}) {
    this.validateInitialization();

    if (!sharp) {
      console.warn('Sharp not available, returning original buffer');
      return buffer;
    }

    const { format = 'webp', quality = 80, maxWidth = 2000, maxHeight = 2000 } = options;

    try {
      let image = sharp(buffer);
      const metadata = await image.metadata();

      // Resize if needed
      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        image = image.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Convert and optimize
      return await image[format]({ quality }).toBuffer();
    } catch (error) {
      console.error('Failed to optimize asset:', error);
      // Return original buffer if optimization fails
      return buffer;
    }
  }

  /**
   * Store media file
   * @param {Buffer} buffer File buffer
   * @param {string} filename Original filename
   * @param {Object} options Storage options
   * @returns {Promise<Object>} Stored file info
   */
  async storeFile(buffer, filename, options = {}) {
    this.validateInitialization();

    const { optimize = true, format, quality, maxWidth, maxHeight } = options;

    try {
      // Optimize if requested and sharp is available
      const processedBuffer = (optimize && sharp)
        ? await this.optimizeAsset(buffer, { format, quality, maxWidth, maxHeight })
        : buffer;

      // Generate unique filename
      const ext = path.extname(filename);
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
      const filePath = path.join(this.uploadDir, uniqueName);

      // Save file
      await fs.writeFile(filePath, processedBuffer);

      return {
        filename: uniqueName,
        path: filePath,
        size: processedBuffer.length,
        type: format || path.extname(filename).slice(1),
      };
    } catch (error) {
      console.error('Failed to store file:', error);
      throw error;
    }
  }

  /**
   * Delete media file
   * @param {string} filename Filename to delete
   */
  async deleteFile(filename) {
    this.validateInitialization();

    try {
      const filePath = path.join(this.uploadDir, filename);
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  /**
   * Clean up old files
   */
  async cleanup() {
    this.validateInitialization();

    try {
      const files = await fs.readdir(this.uploadDir);
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          await fs.unlink(filePath);
          console.log(`Deleted old file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup files:', error);
      throw error;
    }
  }
}

module.exports = new MediaManager();

/* global Parse */

const sharp = require('sharp');
const ExifReader = require('exif-reader');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const BaseService = require('./BaseService');
const logger = require('../utils/logger');

/**
 * Media Processing Service
 * Handles advanced media processing, optimization, CDN integration, and tracking
 */
class MediaProcessingService extends BaseService {
  constructor() {
    super('MediaProcessing');
    this.initialized = false;
    this.s3Client = null;
    this.cdnConfig = null;
  }

  initialize(config = {}) {
    try {
      this.cdnConfig = config.cdn || {};

      // Initialize S3 client for CDN storage
      if (this.cdnConfig.enabled) {
        this.s3Client = new S3Client({
          region: this.cdnConfig.region,
          credentials: {
            accessKeyId: this.cdnConfig.accessKeyId,
            secretAccessKey: this.cdnConfig.secretAccessKey,
          },
        });
      }

      this.initialized = true;
      logger.info('Media Processing Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Media Processing Service:', error);
      throw error;
    }
  }

  /**
   * Process media file through the pipeline
   * @param {Buffer} buffer File buffer
   * @param {string} filename Original filename
   * @param {Object} options Processing options
   * @return {Promise<Object>} Processed media info
   */
  async processMedia(buffer, filename, options = {}) {
    this.validateInitialization();

    try {
      // Extract metadata
      const metadata = await this.extractMetadata(buffer);

      // Generate optimized versions
      const optimizedVersions = await this.generateOptimizedVersions(buffer, options);

      // Upload to CDN if enabled
      const cdnUrls = this.cdnConfig.enabled
        ? await this.uploadToCDN(optimizedVersions, filename)
        : null;

      // Track usage
      await this.trackUsage({
        filename,
        size: buffer.length,
        versions: Object.keys(optimizedVersions).length,
        metadata,
      });

      return {
        metadata,
        versions: optimizedVersions,
        cdnUrls,
        originalSize: buffer.length,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Media processing failed:', error);
      throw error;
    }
  }

  /**
   * Extract metadata from media file
   * @param {Buffer} buffer File buffer
   * @return {Promise<Object>} Extracted metadata
   */
  async extractMetadata(buffer) {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      const result = {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
      };

      // Extract EXIF data if available
      if (metadata.exif) {
        try {
          result.exif = ExifReader(metadata.exif);
        } catch (exifError) {
          logger.warn('Failed to parse EXIF data:', exifError);
        }
      }

      return result;
    } catch (error) {
      logger.error('Metadata extraction failed:', error);
      throw error;
    }
  }

  /**
   * Generate optimized versions of media
   * @param {Buffer} buffer Original file buffer
   * @param {Object} options Optimization options
   * @return {Promise<Object>} Optimized versions
   */
  async generateOptimizedVersions(buffer, options = {}) {
    const versions = {};
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Define optimization profiles
    const profiles = {
      thumbnail: {
        width: 150,
        height: 150,
        fit: 'cover',
        format: 'webp',
        quality: 80,
      },
      preview: {
        width: 500,
        maxHeight: 500,
        fit: 'inside',
        format: 'webp',
        quality: 85,
      },
      full: {
        width: metadata.width,
        height: metadata.height,
        format: 'webp',
        quality: 90,
        withMetadata: true,
      },
      ...options.profiles,
    };

    // Generate each version
    for (const [name, profile] of Object.entries(profiles)) {
      try {
        let processedImage = image.clone();

        // Apply transformations
        if (profile.width || profile.height) {
          processedImage = processedImage.resize({
            width: profile.width,
            height: profile.height,
            fit: profile.fit || 'inside',
            withoutEnlargement: true,
          });
        }

        // Convert format if specified
        if (profile.format) {
          processedImage = processedImage[profile.format]({
            quality: profile.quality,
          });
        }

        // Preserve metadata if requested
        if (profile.withMetadata) {
          processedImage = processedImage.withMetadata();
        }

        const buffer = await processedImage.toBuffer();
        const processedMetadata = await processedImage.metadata();

        versions[name] = {
          buffer,
          format: processedMetadata.format,
          width: processedMetadata.width,
          height: processedMetadata.height,
          size: buffer.length,
        };
      } catch (error) {
        logger.error(`Failed to generate ${name} version:`, error);
        throw error;
      }
    }

    return versions;
  }

  /**
   * Upload media versions to CDN
   * @param {Object} versions Media versions to upload
   * @param {string} filename Original filename
   * @return {Promise<Object>} CDN URLs for each version
   */
  async uploadToCDN(versions) {
    if (!this.cdnConfig.enabled || !this.s3Client) {
      return null;
    }

    const urls = {};
    const baseKey = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    for (const [version, data] of Object.entries(versions)) {
      try {
        const key = `${baseKey}-${version}.${data.format}`;

        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.cdnConfig.bucket,
            Key: key,
            Body: data.buffer,
            ContentType: `image/${data.format}`,
            CacheControl: 'public, max-age=31536000',
          })
        );

        urls[version] = `${this.cdnConfig.baseUrl}/${key}`;
      } catch (error) {
        logger.error(`Failed to upload ${version} to CDN:`, error);
        throw error;
      }
    }

    return urls;
  }

  /**
   * Track media usage
   * @param {Object} data Usage data to track
   */
  async trackUsage(data) {
    try {
      const MediaUsage = Parse.Object.extend('MediaUsage');
      const usage = new MediaUsage();

      usage.set({
        filename: data.filename,
        size: data.size,
        versions: data.versions,
        metadata: data.metadata,
        timestamp: new Date(),
      });

      await usage.save(null, { useMasterKey: true });
    } catch (error) {
      logger.error('Failed to track media usage:', error);
      // Don't throw error to prevent blocking the main process
    }
  }

  /**
   * Get usage statistics
   * @param {Object} params Query parameters
   * @return {Promise<Object>} Usage statistics
   */
  async getUsageStats(params = {}) {
    try {
      const query = new Parse.Query('MediaUsage');

      if (params.startDate) {
        query.greaterThanOrEqualTo('timestamp', params.startDate);
      }
      if (params.endDate) {
        query.lessThanOrEqualTo('timestamp', params.endDate);
      }

      const [results, count] = await Promise.all([
        query.find({ useMasterKey: true }),
        query.count({ useMasterKey: true }),
      ]);

      const totalSize = results.reduce((sum, usage) => sum + usage.get('size'), 0);
      const averageSize = count > 0 ? totalSize / count : 0;

      return {
        totalFiles: count,
        totalSize,
        averageSize,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to get usage stats:', error);
      throw error;
    }
  }
}

module.exports = new MediaProcessingService();

/**
 * Media Utilities
 * Helper functions for media operations
 */

const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const crypto = require('crypto');
const mime = require('mime-types');

class MediaUtils {
  constructor(config) {
    this.config = config;
  }

  /**
   * Validate file
   * @param {Buffer} buffer - File buffer
   * @param {string} filename - Original filename
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation result
   */
  async validateFile(buffer, filename, options = {}) {
    const mimeType = mime.lookup(filename) || 'application/octet-stream';
    const fileSize = buffer.length;
    const ext = path.extname(filename).toLowerCase();

    // Check file size
    if (fileSize > this.config.security.validation.maxFileSize) {
      throw new Error('File size exceeds maximum allowed size');
    }

    // Check file type
    const allowedTypes = Object.values(this.config.security.validation.allowedMimeTypes).flat();
    if (!allowedTypes.includes(mimeType)) {
      throw new Error('File type not allowed');
    }

    // Validate image files
    if (mimeType.startsWith('image/')) {
      await this.validateImage(buffer);
    }

    // Validate video files
    if (mimeType.startsWith('video/')) {
      await this.validateVideo(buffer);
    }

    return {
      valid: true,
      mimeType,
      fileSize,
      extension: ext,
    };
  }

  /**
   * Validate image file
   * @param {Buffer} buffer - Image buffer
   * @returns {Promise<void>}
   */
  async validateImage(buffer) {
    try {
      const metadata = await sharp(buffer).metadata();
      if (!this.config.image.formats.input.includes(metadata.format)) {
        throw new Error('Image format not supported');
      }
    } catch (error) {
      throw new Error(`Invalid image file: ${error.message}`);
    }
  }

  /**
   * Validate video file
   * @param {Buffer} buffer - Video buffer
   * @returns {Promise<void>}
   */
  async validateVideo(buffer) {
    const tempPath = path.join(this.config.storage.local.tempDir, `temp-${Date.now()}.mp4`);
    await require('fs').promises.writeFile(tempPath, buffer);

    try {
      await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(tempPath, (err, metadata) => {
          if (err) reject(err);
          else {
            const format = metadata.format.format_name.split(',')[0];
            if (!this.config.video.formats.input.includes(format)) {
              reject(new Error('Video format not supported'));
            }
            resolve();
          }
        });
      });
    } finally {
      await require('fs').promises.unlink(tempPath);
    }
  }

  /**
   * Extract file metadata
   * @param {Buffer} buffer - File buffer
   * @param {string} mimeType - File MIME type
   * @returns {Promise<Object>} File metadata
   */
  async extractMetadata(buffer, mimeType) {
    if (mimeType.startsWith('image/')) {
      return this.extractImageMetadata(buffer);
    }
    if (mimeType.startsWith('video/')) {
      return this.extractVideoMetadata(buffer);
    }
    return {};
  }

  /**
   * Extract image metadata
   * @param {Buffer} buffer - Image buffer
   * @returns {Promise<Object>} Image metadata
   */
  async extractImageMetadata(buffer) {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation,
    };
  }

  /**
   * Extract video metadata
   * @param {Buffer} buffer - Video buffer
   * @returns {Promise<Object>} Video metadata
   */
  async extractVideoMetadata(buffer) {
    const tempPath = path.join(this.config.storage.local.tempDir, `temp-${Date.now()}.mp4`);
    await require('fs').promises.writeFile(tempPath, buffer);

    try {
      const metadata = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(tempPath, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      return {
        format: metadata.format.format_name,
        duration: metadata.format.duration,
        size: metadata.format.size,
        bitrate: metadata.format.bit_rate,
        streams: metadata.streams.map(stream => ({
          type: stream.codec_type,
          codec: stream.codec_name,
          width: stream.width,
          height: stream.height,
          frameRate: stream.r_frame_rate,
          sampleRate: stream.sample_rate,
          channels: stream.channels,
        })),
      };
    } finally {
      await require('fs').promises.unlink(tempPath);
    }
  }

  /**
   * Generate file hash
   * @param {Buffer} buffer - File buffer
   * @returns {string} File hash
   */
  generateFileHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Sanitize filename
   * @param {string} filename - Original filename
   * @returns {string} Sanitized filename
   */
  sanitizeFilename(filename) {
    // Remove invalid characters
    let sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '-');

    // Remove multiple dashes
    sanitized = sanitized.replace(/-+/g, '-');

    // Remove leading/trailing dashes
    sanitized = sanitized.replace(/^-+|-+$/g, '');

    // Ensure safe extension
    const ext = path.extname(sanitized).toLowerCase();
    const basename = path.basename(sanitized, ext);

    return `${basename}${ext}`;
  }

  /**
   * Generate unique filename
   * @param {string} filename - Original filename
   * @returns {string} Unique filename
   */
  generateUniqueFilename(filename) {
    const ext = path.extname(filename);
    const basename = path.basename(filename, ext);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);

    return `${basename}-${timestamp}-${random}${ext}`;
  }

  /**
   * Convert image format
   * @param {Buffer} buffer - Image buffer
   * @param {string} format - Target format
   * @param {Object} options - Conversion options
   * @returns {Promise<Buffer>} Converted image buffer
   */
  async convertImageFormat(buffer, format, options = {}) {
    const image = sharp(buffer);

    switch (format) {
      case 'jpeg':
        return image.jpeg(options).toBuffer();
      case 'png':
        return image.png(options).toBuffer();
      case 'webp':
        return image.webp(options).toBuffer();
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Get file type from buffer
   * @param {Buffer} buffer - File buffer
   * @returns {Promise<string>} File MIME type
   */
  async getFileType(buffer) {
    const fileType = await import('file-type');
    const type = await fileType.fileTypeFromBuffer(buffer);
    return type ? type.mime : 'application/octet-stream';
  }

  /**
   * Calculate dimensions maintaining aspect ratio
   * @param {number} width - Original width
   * @param {number} height - Original height
   * @param {Object} maxDimensions - Maximum dimensions
   * @returns {Object} New dimensions
   */
  calculateDimensions(width, height, maxDimensions) {
    const ratio = Math.min(maxDimensions.width / width, maxDimensions.height / height);

    return {
      width: Math.round(width * ratio),
      height: Math.round(height * ratio),
    };
  }

  /**
   * Format file size
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Check if file is image
   * @param {string} mimeType - File MIME type
   * @returns {boolean} Is image file
   */
  isImage(mimeType) {
    return mimeType.startsWith('image/');
  }

  /**
   * Check if file is video
   * @param {string} mimeType - File MIME type
   * @returns {boolean} Is video file
   */
  isVideo(mimeType) {
    return mimeType.startsWith('video/');
  }
}

module.exports = MediaUtils;

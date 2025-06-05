/**
 * CMSMedia Class
 * Handles media assets in the CMS (images, videos, documents, etc.)
 */

const Parse = require('parse/node');

class CMSMedia extends Parse.Object {
  constructor() {
    super('CMSMedia');
  }

  static get className() {
    return 'CMSMedia';
  }

  static get schema() {
    return {
      // Media identification
      name: { type: 'String', required: true },
      type: { type: 'String', required: true }, // mime type
      size: { type: 'Number', required: true },

      // Media file
      file: { type: 'File', required: true },
      thumbnail: { type: 'File' },

      // Media metadata
      metadata: { type: 'Object' },
      alt: { type: 'String' },
      caption: { type: 'String' },

      // Media organization
      folder: { type: 'String' },
      tags: { type: 'Array' },

      // Media usage
      usageCount: { type: 'Number', defaultValue: 0 },
      lastUsed: { type: 'Date' },

      // Media processing
      status: { type: 'String', defaultValue: 'processing' },
      processingError: { type: 'String' },

      // Media variations
      variations: { type: 'Object' }, // Different sizes/formats

      // Organization and user
      organization: { type: 'Pointer', targetClass: '_User', required: true },
      createdBy: { type: 'Pointer', targetClass: '_User', required: true },
      updatedBy: { type: 'Pointer', targetClass: '_User' },

      // Standard fields
      createdAt: { type: 'Date' },
      updatedAt: { type: 'Date' },
      ACL: { type: 'ACL' },
    };
  }

  static get indexes() {
    return {
      name: { type: 'string' },
      type: { type: 'string' },
      folder: { type: 'string' },
      status: { type: 'string' },
      organization: { type: 'string' },
    };
  }

  static get classLevelPermissions() {
    return {
      find: { '*': true },
      count: { '*': true },
      get: { '*': true },
      create: { requiresAuthentication: true },
      update: { requiresAuthentication: true },
      delete: { requiresAuthentication: true },
      addField: { requiresAuthentication: true },
    };
  }

  /**
   * Before save trigger
   */
  static async beforeSave(request) {
    const media = request.object;

    // Set organization if not set
    if (!media.get('organization')) {
      const currentUser = Parse.User.current();
      media.set('organization', currentUser);
    }

    // Set creator/updater
    const currentUser = Parse.User.current();
    if (!media.get('createdBy')) {
      media.set('createdBy', currentUser);
    }
    media.set('updatedBy', currentUser);

    // Validate media file
    await this.validateMedia(media);

    // Generate metadata if not present
    if (!media.get('metadata')) {
      await this.generateMetadata(media);
    }

    // Generate thumbnail if needed
    if (this.needsThumbnail(media) && !media.get('thumbnail')) {
      await this.generateThumbnail(media);
    }
  }

  /**
   * After save trigger
   */
  static async afterSave(request) {
    const media = request.object;

    // Process media if needed
    if (media.get('status') === 'processing') {
      await this.processMedia(media);
    }

    // Update usage statistics
    await this.updateUsageStats(media);
  }

  /**
   * Before delete trigger
   */
  static async beforeDelete(request) {
    const media = request.object;

    // Check if media is in use
    const isInUse = await this.checkMediaUsage(media);
    if (isInUse) {
      throw new Parse.Error(
        Parse.Error.OPERATION_FORBIDDEN,
        'Cannot delete media that is currently in use'
      );
    }

    // Delete associated files
    await this.deleteAssociatedFiles(media);
  }

  /**
   * Validate media file
   */
  static async validateMedia(media) {
    const file = media.get('file');
    if (!file) {
      throw new Parse.Error(Parse.Error.FILE_MISSING, 'Media file is required');
    }

    // Validate file type
    const type = media.get('type');
    if (!this.isValidMediaType(type)) {
      throw new Parse.Error(Parse.Error.INVALID_FILE_NAME, 'Invalid media type');
    }

    // Validate file size
    const size = media.get('size');
    if (!this.isValidFileSize(size)) {
      throw new Parse.Error(Parse.Error.FILE_TOO_LARGE, 'File size exceeds limit');
    }
  }

  /**
   * Check if media type is valid
   */
  static isValidMediaType(type) {
    const validTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    return validTypes.includes(type);
  }

  /**
   * Check if file size is valid
   */
  static isValidFileSize(size) {
    const maxSize = 100 * 1024 * 1024; // 100MB
    return size > 0 && size <= maxSize;
  }

  /**
   * Generate media metadata
   */
  static async generateMetadata(media) {
    const file = media.get('file');
    const type = media.get('type');

    const metadata = {
      filename: file.name(),
      mimeType: type,
      size: media.get('size'),
      dimensions: null, // For images
      duration: null, // For videos
      createdAt: new Date(),
    };

    // Add specific metadata based on type
    if (type.startsWith('image/')) {
      // Add image-specific metadata
      metadata.dimensions = await this.getImageDimensions(file);
    } else if (type.startsWith('video/')) {
      // Add video-specific metadata
      metadata.duration = await this.getVideoDuration(file);
    }

    media.set('metadata', metadata);
  }

  /**
   * Check if media needs thumbnail
   */
  static needsThumbnail(media) {
    const type = media.get('type');
    return type.startsWith('image/') || type.startsWith('video/');
  }

  /**
   * Generate thumbnail for media
   */
  static async generateThumbnail(media) {
    const file = media.get('file');
    const type = media.get('type');

    try {
      let thumbnail;
      if (type.startsWith('image/')) {
        thumbnail = await this.generateImageThumbnail(file);
      } else if (type.startsWith('video/')) {
        thumbnail = await this.generateVideoThumbnail(file);
      }

      if (thumbnail) {
        media.set('thumbnail', thumbnail);
      }
    } catch (error) {
      console.error('Error generating thumbnail:', error);
    }
  }

  /**
   * Process media file
   */
  static async processMedia(media) {
    try {
      const type = media.get('type');

      if (type.startsWith('image/')) {
        await this.processImage(media);
      } else if (type.startsWith('video/')) {
        await this.processVideo(media);
      }

      media.set('status', 'complete');
    } catch (error) {
      media.set('status', 'error');
      media.set('processingError', error.message);
    }

    await media.save(null, { useMasterKey: true });
  }

  /**
   * Update media usage statistics
   */
  static async updateUsageStats(media) {
    const query = new Parse.Query('CMSContent');
    query.equalTo('content.media', media.id);

    const count = await query.count({ useMasterKey: true });
    media.set('usageCount', count);
    media.set('lastUsed', count > 0 ? new Date() : null);

    await media.save(null, { useMasterKey: true });
  }

  /**
   * Check if media is in use
   */
  static async checkMediaUsage(media) {
    const query = new Parse.Query('CMSContent');
    query.equalTo('content.media', media.id);
    return (await query.count({ useMasterKey: true })) > 0;
  }

  /**
   * Delete associated files
   */
  static async deleteAssociatedFiles(media) {
    const files = [media.get('file'), media.get('thumbnail')];

    // Add variation files
    const variations = media.get('variations') || {};
    Object.values(variations).forEach(variation => {
      if (variation.file) {
        files.push(variation.file);
      }
    });

    // Delete all files
    const deletePromises = files
      .filter(file => file)
      .map(file => file.destroy({ useMasterKey: true }));

    await Promise.all(deletePromises);
  }
}

Parse.Object.registerSubclass('CMSMedia', CMSMedia);
module.exports = CMSMedia;

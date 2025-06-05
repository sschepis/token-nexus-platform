/**
 * Media Plugin Default Configuration
 */

module.exports = {
  // Image processing settings
  image: {
    optimization: {
      enabled: true,
      quality: {
        jpeg: 80,
        png: 80,
        webp: 75,
      },
      maxDimensions: {
        width: 2048,
        height: 2048,
      },
      preserveMetadata: ['orientation', 'copyright', 'profile'],
      stripMetadata: ['gps', 'exif'],
    },

    variants: {
      thumbnail: {
        width: 150,
        height: 150,
        fit: 'cover',
        format: 'webp',
      },
      small: {
        width: 400,
        height: 300,
        fit: 'inside',
        format: 'webp',
      },
      medium: {
        width: 800,
        height: 600,
        fit: 'inside',
        format: 'webp',
      },
      large: {
        width: 1600,
        height: 1200,
        fit: 'inside',
        format: 'webp',
      },
    },

    formats: {
      input: ['jpeg', 'jpg', 'png', 'webp', 'gif', 'svg'],
      output: ['jpeg', 'webp', 'png'],
      preferredFormat: 'webp',
    },

    processing: {
      sharpen: true,
      normalize: false,
      progressive: true,
      withMetadata: true,
    },
  },

  // Video processing settings
  video: {
    thumbnail: {
      enabled: true,
      timestamp: '00:00:01',
      format: 'webp',
      dimensions: {
        width: 320,
        height: 240,
      },
      quality: 80,
    },

    transcoding: {
      enabled: true,
      formats: ['mp4', 'webm'],
      presets: {
        mobile: {
          resolution: '640x360',
          bitrate: '500k',
          audioBitrate: '96k',
        },
        standard: {
          resolution: '1280x720',
          bitrate: '1500k',
          audioBitrate: '128k',
        },
        hd: {
          resolution: '1920x1080',
          bitrate: '3000k',
          audioBitrate: '192k',
        },
      },
      defaultPreset: 'standard',
      preserveOriginal: true,
    },

    formats: {
      input: ['mp4', 'mov', 'avi', 'webm', 'mkv'],
      output: ['mp4', 'webm'],
    },
  },

  // Storage configuration
  storage: {
    provider: process.env.MEDIA_STORAGE_PROVIDER || 'parse',

    parse: {
      maxUploadSize: 100 * 1024 * 1024, // 100MB
      preserveFilename: true,
      validateFilename: true,
      sanitizeFilename: true,
    },

    cloudinary: {
      folder: process.env.CLOUDINARY_FOLDER || 'media',
      resourceType: 'auto',
      overwrite: false,
      useFilename: true,
      uniqueFilename: true,
      invalidate: true,
    },

    local: {
      tempDir: process.env.TEMP_DIR || '/tmp',
      cleanupInterval: 3600000, // 1 hour
    },
  },

  // CDN configuration
  cdn: {
    provider: process.env.MEDIA_CDN_PROVIDER || 'cloudinary',

    cloudinary: {
      secure: true,
      cdnSubdomain: true,
      privateCdn: false,
      cname: process.env.CLOUDINARY_CNAME || null,
      secureDistribution: process.env.CLOUDINARY_SECURE_DIST || null,
      transformations: {
        default: {
          quality: 'auto',
          fetchFormat: 'auto',
          dpr: 'auto',
        },
        responsive: {
          width: 'auto',
          crop: 'scale',
          dpr: 'auto',
        },
      },
    },
  },

  // Media library settings
  library: {
    folders: {
      enabled: true,
      defaultFolders: ['images', 'videos', 'documents'],
      maxDepth: 5,
      allowCreate: true,
      allowRename: true,
      allowDelete: true,
    },

    organization: {
      tags: {
        enabled: true,
        suggestTags: true,
        maxTags: 20,
      },
      categories: {
        enabled: true,
        allowCustom: true,
      },
      metadata: {
        extractAutomatically: true,
        customFields: true,
      },
    },

    tracking: {
      enabled: true,
      trackViews: true,
      trackDownloads: true,
      trackUsageInContent: true,
    },
  },

  // Security settings
  security: {
    validation: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 100 * 1024 * 1024, // 100MB
      allowedMimeTypes: {
        image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
        video: ['video/mp4', 'video/webm', 'video/quicktime'],
        document: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
      },
      scanVirus: process.env.SCAN_VIRUS === 'true',
      validateContent: true,
    },

    access: {
      requireAuth: true,
      publicRead: true,
      privateFiles: {
        enabled: true,
        expiryTime: 3600, // 1 hour
      },
    },

    contentFiltering: {
      enabled: process.env.CONTENT_FILTERING === 'true',
      moderateImages: true,
      moderateVideos: true,
      blockList: [],
    },
  },

  // Performance settings
  performance: {
    cache: {
      enabled: true,
      duration: 3600, // 1 hour
      invalidateOnUpdate: true,
    },

    optimization: {
      lazy: true,
      batch: {
        enabled: true,
        maxSize: 10,
        interval: 1000,
      },
    },

    queue: {
      enabled: true,
      concurrency: parseInt(process.env.QUEUE_CONCURRENCY, 10) || 3,
      timeout: 300000, // 5 minutes
    },
  },

  // Webhook settings
  webhooks: {
    enabled: process.env.WEBHOOKS_ENABLED === 'true',
    events: ['media.uploaded', 'media.processed', 'media.deleted', 'media.accessed'],
    retries: 3,
    timeout: 10000,
  },
};

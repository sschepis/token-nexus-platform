/**
 * Default Configuration
 * Defines default settings for the CMS plugin
 */

module.exports = {
  // Database configuration
  database: {
    // Collection prefix for CMS classes
    collectionPrefix: 'CMS',
    // Enable schema migrations
    enableMigrations: true,
    // Schema version
    schemaVersion: '1.0.0',
  },

  // Content management
  content: {
    // Maximum content size in bytes (5MB)
    maxContentSize: 5 * 1024 * 1024,
    // Enable content versioning
    versioning: {
      enabled: true,
      maxVersions: 10,
    },
    // Content validation
    validation: {
      enabled: true,
      strict: false,
    },
    // Publishing workflow
    publishing: {
      enableScheduling: true,
      enableDrafts: true,
      requireApproval: false,
    },
  },

  // Media management
  media: {
    // Storage configuration
    storage: {
      // 'parse' or 's3'
      type: 'parse',
      // S3 configuration
      s3: {
        bucket: process.env.S3_BUCKET,
        region: process.env.S3_REGION,
        accessKey: process.env.S3_ACCESS_KEY,
        secretKey: process.env.S3_SECRET_KEY,
        endpoint: process.env.S3_ENDPOINT,
      },
    },
    // File limits
    limits: {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      maxFiles: 10000,
    },
    // Supported file types
    supportedTypes: {
      images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      videos: ['video/mp4', 'video/webm'],
      documents: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
    },
    // Image processing
    images: {
      // Enable image optimization
      optimize: true,
      // Generate variations
      variations: {
        thumbnail: { width: 150, height: 150, fit: 'cover' },
        small: { width: 300, height: 300, fit: 'inside' },
        medium: { width: 600, height: 600, fit: 'inside' },
        large: { width: 1200, height: 1200, fit: 'inside' },
      },
      // Format options
      format: {
        quality: 80,
        progressive: true,
        withMetadata: false,
      },
    },
    // Video processing
    videos: {
      // Enable video transcoding
      transcode: true,
      // Generate thumbnails
      thumbnails: true,
      // Format options
      format: {
        codec: 'h264',
        quality: 'medium',
      },
    },
  },

  // Template system
  templates: {
    // Enable template inheritance
    inheritance: true,
    // Enable template versioning
    versioning: true,
    // Default template settings
    defaults: {
      layout: 'default',
      components: [],
    },
  },

  // Component system
  components: {
    // Enable global components
    global: true,
    // Component validation
    validation: {
      enabled: true,
      strict: false,
    },
    // Default component settings
    defaults: {
      isGlobal: false,
      isActive: true,
    },
  },

  // Security settings
  security: {
    // Content access control
    accessControl: {
      // Enable role-based access control
      roleBasedAccess: true,
      // Default role for content creators
      defaultRole: 'content-creator',
      // Required roles for actions
      requiredRoles: {
        publish: ['editor', 'admin'],
        delete: ['admin'],
      },
    },
    // API rate limiting
    rateLimit: {
      enabled: true,
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
  },

  // Cache settings
  cache: {
    // Enable content caching
    enabled: true,
    // Cache duration in seconds
    duration: 3600,
    // Cache storage type ('memory' or 'redis')
    storage: 'memory',
    // Redis configuration
    redis: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
    },
  },

  // Search settings
  search: {
    // Enable content indexing
    enabled: true,
    // Search provider ('parse' or 'elasticsearch')
    provider: 'parse',
    // Elasticsearch configuration
    elasticsearch: {
      host: process.env.ELASTICSEARCH_HOST,
      port: process.env.ELASTICSEARCH_PORT,
      index: process.env.ELASTICSEARCH_INDEX,
    },
  },

  // Webhook settings
  webhooks: {
    // Enable webhooks
    enabled: false,
    // Webhook events
    events: [
      'content.created',
      'content.updated',
      'content.deleted',
      'content.published',
      'media.uploaded',
      'template.created',
    ],
  },

  // Job settings
  jobs: {
    // Content publishing job
    publishScheduled: {
      schedule: '*/5 * * * *', // every 5 minutes
      enabled: true,
    },
    // Media cleanup job
    cleanupMedia: {
      schedule: '0 0 * * *', // daily at midnight
      enabled: true,
    },
  },

  // Logging settings
  logging: {
    // Log level
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    // Enable request logging
    requests: true,
    // Enable query logging
    queries: false,
    // Log format
    format: 'json',
  },

  // EVM Deployment settings
  evmDeployments: {
    // This section will hold deployment data, keyed by network name
    // Example:
    // basesep: {
    //   DiamondFactory: {
    //     address: "0x...",
    //     abi: [...]
    //   },
    //   AnotherContract: {
    //     address: "0x...",
    //     abi: [...]
    //   }
    // }
  },

  // Parse Dashboard settings
  dashboard: {
    enabled: process.env.PARSE_DASHBOARD_ENABLED !== 'false', // Enable by default, disable if 'false'
    mountPath: process.env.PARSE_DASHBOARD_MOUNT_PATH || '/dashboard',
    appName: process.env.PARSE_DASHBOARD_APP_NAME || 'My GemCMS App',
    apps: [
      {
        serverURL: process.env.PARSE_SERVER_URL || 'http://localhost:1337/parse',
        appId: process.env.PARSE_SERVER_APPLICATION_ID || 'gemcms_dev',
        masterKey: process.env.PARSE_SERVER_MASTER_KEY || 'gemcms_master_key_dev', // Needed for dashboard to function fully
        appName: process.env.PARSE_DASHBOARD_APP_NAME || 'GemCMS Dev App',
      },
    ],
    users: [
      {
        user: process.env.PARSE_DASHBOARD_USER_1_USER || 'admin',
        pass: process.env.PARSE_DASHBOARD_USER_1_PASS || 'password',
      },
      // Add more users here or via environment variables
      // {
      //   user: process.env.PARSE_DASHBOARD_USER_2_USER,
      //   pass: process.env.PARSE_DASHBOARD_USER_2_PASS,
      // },
    ],
    trustProxy: 1, // Or your specific proxy setup
    cookieSessionSecret: process.env.PARSE_DASHBOARD_COOKIE_SECRET || 'a_very_secure_secret_for_dashboard_session', // CHANGE THIS IN PRODUCTION
    useEncryptedPasswords: false, // Set to true if you are using encrypted passwords for dashboard users
    allowInsecureHTTP: process.env.NODE_ENV !== 'production', // Allow insecure HTTP for dev, require HTTPS for prod
  },
};

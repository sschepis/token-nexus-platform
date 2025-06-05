const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const port = process.env.PORT || '1337';

// Import tenant-aware adapter if PostgreSQL is configured
let TenantAwarePostgresAdapter;
let databaseManager;
let tenantContext;

if (process.env.DATABASE_TYPE === 'postgresql') {
  TenantAwarePostgresAdapter = require('./adapters/TenantAwarePostgresAdapter');
  const DatabaseManager = require('../src/database/DatabaseManager');
  const TenantContext = require('../src/database/TenantContext');
  
  // Initialize database manager and tenant context
  databaseManager = new DatabaseManager({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'token_nexus_platform',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true',
    max: parseInt(process.env.DB_POOL_MAX) || 20,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
  });
  
  tenantContext = new TenantContext(databaseManager);
}

// Configure database adapter based on environment
function getDatabaseAdapter() {
  if (process.env.DATABASE_TYPE === 'postgresql' && TenantAwarePostgresAdapter) {
    return new TenantAwarePostgresAdapter({
      uri: process.env.DATABASE_URI || process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'password'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'token_nexus_platform'}`,
      dbManager: databaseManager,
      tenantContext: tenantContext,
      defaultTenantId: process.env.DEFAULT_TENANT_ID || 'default'
    });
  }
  
  // Fallback to MongoDB URI for backward compatibility
  return undefined; // Let Parse Server use default MongoDB adapter
}

const config = {
  parseServer: {
    appId: process.env.PARSE_APP_ID || 'gemcms_dev',
    masterKey: process.env.PARSE_MASTER_KEY || 'gemcms_master_key_dev',
    serverURL: process.env.PARSE_SERVER_URL || `http://localhost:${port}/parse`,
    databaseURI: process.env.DATABASE_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/gemcms',
    databaseAdapter: getDatabaseAdapter(),
    cloud: './cloud/main.js',
    allowClientClassCreation: false,
    schema: require('../cloud/schema'),
    enableAnonymousUsers: true, // Allow anonymous users for initial setup
    enforcePrivateUsers: false, // Don't enforce private users during initial setup
    directAccess: true, // Fix deprecation warning

    // Files adapter configuration
    filesAdapter: {
      module: '@parse/fs-files-adapter',
      options: {
        filesSubDirectory: process.env.FILES_DIR || './uploads',
      },
    },

    // LiveQuery configuration
    liveQuery: {
      classNames: ['AnalyticsEvent'], // Enable LiveQuery for AnalyticsEvent class
      redisURL: process.env.REDIS_URL, // Optional: Redis URL for scalability
    },

    websocketTimeout: 10 * 1000, // 10 seconds

    // Basic security settings
    verifyUserEmails: false,
    emailVerifyTokenValidityDuration: 24 * 60 * 60,
    preventLoginWithUnverifiedEmail: false,

    // Custom pages
    customPages: {
      passwordResetSuccess: process.env.PASSWORD_RESET_SUCCESS_URL,
      verifyEmailSuccess: process.env.VERIFY_EMAIL_SUCCESS_URL,
      invalidLink: process.env.INVALID_LINK_URL,
      invalidVerificationLink: process.env.INVALID_VERIFICATION_LINK_URL,
      choosePassword: process.env.CHOOSE_PASSWORD_URL,
    },

    // CORS configuration
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: [
        'X-Parse-Application-Id',
        'X-Parse-REST-API-Key',
        'X-Parse-Session-Token',
        'X-Parse-Master-Key',
        'X-Parse-Javascript-Key',
        'Content-Type',
      ],
      exposeHeaders: ['X-Parse-Session-Token', 'X-Parse-Object-Id'],
      credentials: true,
    },
  },

  // Dashboard Configuration
  dashboard: {
    enabled: process.env.DASHBOARD_ENABLED === 'true',
    mountPath: process.env.DASHBOARD_MOUNT_PATH || '/dashboard',
    apps: [
      {
        appName: process.env.PARSE_APP_NAME || 'GemCMS',
        serverURL: process.env.PARSE_SERVER_URL || `http://localhost:${port}/parse`,
        appId: process.env.PARSE_APP_ID || 'gemcms_dev',
        masterKey: process.env.PARSE_MASTER_KEY || 'gemcms_master_key_dev',
      },
    ],
    users: [
      {
        user: process.env.DASHBOARD_USER || 'admin',
        pass: process.env.DASHBOARD_PASS || 'admin',
      },
    ],
    useEncryptedPasswords: false,
    trustProxy: 1,
    cookieSessionSecret: process.env.DASHBOARD_COOKIE_SECRET || 'secret',
    allowInsecureHTTP: process.env.NODE_ENV !== 'production',
  },

  // Security Configuration
  security: {
    rateLimit: {
      enabled: false,
      windowMs: 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    },
    cors: {
      enabled: true,
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: [
        'X-Parse-Application-Id',
        'X-Parse-REST-API-Key',
        'X-Parse-Session-Token',
        'X-Parse-Master-Key',
        'X-Parse-Javascript-Key',
        'Content-Type',
      ],
      exposeHeaders: ['X-Parse-Session-Token', 'X-Parse-Object-Id'],
      credentials: true,
    },
  },

  // Cache Configuration
  cache: {
    enabled: true,
    ttl: 300, // 5 minutes default TTL
    maxSize: 100 * 1024 * 1024, // 100MB max cache size
  },

  // Analytics Configuration
  analytics: {
    enabled: true,
    collection: {
      pageViews: true,
      events: true,
    },
    realtime: {
      enabled: true,
    },
  },

  ai: {
    enabled: true,
    models: {
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      }
    }
  }
};

// Export database manager and tenant context for middleware
config.databaseManager = databaseManager;
config.tenantContext = tenantContext;

module.exports = config;

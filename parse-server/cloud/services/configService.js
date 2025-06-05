const DEFAULT_CONFIG = {
  ai: {
    provider: process.env.DEFAULT_AI_PROVIDER || 'openai',
    model: process.env.DEFAULT_AI_MODEL || 'gpt-4',
    tokenLimit: parseInt(process.env.DEFAULT_TOKEN_LIMIT, 10) || 100000,
    temperature: parseFloat(process.env.DEFAULT_TEMPERATURE) || 0.7,
    maxTokens: parseInt(process.env.MAX_TOKENS, 10) || 2048,
  },
  security: {
    enableRateLimiting: process.env.ENABLE_AI_RATE_LIMITING === 'true',
    rateLimitWindow: parseInt(process.env.AI_RATE_LIMIT_WINDOW, 10) || 3600,
    rateLimitMaxRequests: parseInt(process.env.AI_RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    enableOrgIsolation: process.env.ENABLE_ORG_ISOLATION === 'true',
  },
  monitoring: {
    enabled: process.env.ENABLE_AI_MONITORING === 'true',
    interval: parseInt(process.env.AI_MONITORING_INTERVAL, 10) || 60,
    alertThreshold: parseFloat(process.env.AI_ALERT_THRESHOLD) || 0.9,
    errorThreshold: parseFloat(process.env.AI_ERROR_THRESHOLD) || 0.05,
    latencyThreshold: parseInt(process.env.AI_LATENCY_THRESHOLD, 10) || 2000,
  },
  logging: {
    level: process.env.AI_LOG_LEVEL || 'info',
    retentionDays: parseInt(process.env.AI_LOG_RETENTION_DAYS, 10) || 30,
    enableAudit: process.env.ENABLE_AI_AUDIT_LOGGING === 'true',
  },
  cache: {
    enabled: process.env.ENABLE_AI_RESPONSE_CACHE === 'true',
    ttl: parseInt(process.env.AI_CACHE_TTL, 10) || 3600,
    maxSize: parseInt(process.env.AI_CACHE_MAX_SIZE, 10) || 1000,
  },
  cost: {
    enableTracking: process.env.ENABLE_COST_TRACKING === 'true',
    alertThreshold: parseInt(process.env.COST_ALERT_THRESHOLD, 10) || 100,
    dailyLimit: parseInt(process.env.DAILY_COST_LIMIT, 10) || 500,
  },
  performance: {
    requestTimeout: parseInt(process.env.AI_REQUEST_TIMEOUT, 10) || 30000,
    maxConcurrentRequests: parseInt(process.env.AI_MAX_CONCURRENT_REQUESTS, 10) || 50,
    batchSize: parseInt(process.env.AI_BATCH_SIZE, 10) || 10,
  },
  features: {
    enableStreaming: process.env.ENABLE_STREAMING === 'true',
    enableFunctionCalling: process.env.ENABLE_FUNCTION_CALLING === 'true',
    enableModelSelection: process.env.ENABLE_MODEL_SELECTION === 'true',
    enableTemperatureControl: process.env.ENABLE_TEMPERATURE_CONTROL === 'true',
  },
  organization: {
    defaultTokenLimit: parseInt(process.env.DEFAULT_ORG_TOKEN_LIMIT, 10) || 1000000,
  },
};

module.exports = Parse => {
  class ConfigService {
    constructor() {
      this.config = { ...DEFAULT_CONFIG };
      this.cache = new Map();
      this.initializeCache();
    }

    async initializeCache() {
      try {
        const Settings = Parse.Object.extend('AISettings');
        const query = new Parse.Query(Settings);
        const settings = await query.first({ useMasterKey: true });

        if (settings) {
          this.cache.set('settings', settings.toJSON());
        }
      } catch (error) {
        console.error('Failed to initialize config cache:', error);
      }
    }

    async getOrganizationConfig(organizationId) {
      if (!organizationId) {
        return this.config;
      }

      const cacheKey = `org_${organizationId}`;

      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      try {
        const Settings = Parse.Object.extend('AISettings');
        const query = new Parse.Query(Settings);

        query.equalTo('organization', organizationId);
        const settings = await query.first({ useMasterKey: true });

        if (settings) {
          const orgConfig = {
            ...this.config,
            ai: {
              ...this.config.ai,
              ...settings.get('aiConfig'),
            },
            security: {
              ...this.config.security,
              ...settings.get('securityConfig'),
            },
          };

          this.cache.set(cacheKey, orgConfig);

          return orgConfig;
        }
      } catch (error) {
        console.error('Failed to get organization config:', error);
      }

      return this.config;
    }

    async updateOrganizationConfig(organizationId, newConfig) {
      try {
        const Settings = Parse.Object.extend('AISettings');
        const query = new Parse.Query(Settings);

        query.equalTo('organization', organizationId);
        let settings = await query.first({ useMasterKey: true });

        if (!settings) {
          settings = new Settings();
          settings.set('organization', organizationId);
        }

        settings.set('aiConfig', newConfig.ai);
        settings.set('securityConfig', newConfig.security);
        await settings.save(null, { useMasterKey: true });

        const cacheKey = `org_${organizationId}`;

        this.cache.delete(cacheKey);

        return true;
      } catch (error) {
        console.error('Failed to update organization config:', error);

        return false;
      }
    }

    getDefaultConfig() {
      return this.config;
    }
  }

  return new ConfigService();
};

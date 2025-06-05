/* eslint-disable require-await */
/* eslint-disable no-underscore-dangle */
const LRU = require('lru-cache');
const BaseService = require('./BaseService');

class CacheService extends BaseService {
  constructor() {
    super('Cache');
    this.caches = new Map();
    this.stats = new Map();
    this._monitoringInterval = null;
  }

  /**
   * Service-specific initialization
   * @param {Object} options Cache initialization options
   */
  _initializeService(options = {}) {
    // Initialize caches for different services with custom configurations
    const cacheConfigs = {
      optimization: {
        max: 1000,
        ttl: 1000 * 60 * 60, // 1 hour
      },
      media: {
        max: 500,
        ttl: 1000 * 60 * 60, // 1 hour
      },
      analytics: {
        max: 1000,
        ttl: 1000 * 60 * 5, // 5 minutes
      },
      search: {
        max: 500,
        ttl: 1000 * 60 * 15, // 15 minutes
      },
      ai: {
        max: 200,
        ttl: 1000 * 60 * 30, // 30 minutes
      },
    };

    // Initialize each cache with monitoring
    for (const [service, serviceConfig] of Object.entries(cacheConfigs)) {
      this._initializeCache(service, {
        ...options,
        ...serviceConfig,
      });
      this._initializeStats(service);
    }

    // Start monitoring
    this._startMonitoring();

    // Register cleanup handler
    this.registerCleanup(async () => {
      if (this._monitoringInterval) {
        clearInterval(this._monitoringInterval);
      }
      await this.clearAll();
    });
  }

  /**
   * Get cached value
   * @param {string} key Cache key
   * @return {Promise<any>} Cached value
   */
  async get(key) {
    this.validateInitialization();

    const service = this._getServiceFromKey(key);
    const cache = this.caches.get(service);

    if (!cache) {
      throw new Error(`Cache not found for key: ${key}`);
    }

    const value = cache.get(key);

    this._updateStats(service, 'get', value !== undefined);

    return value;
  }

  /**
   * Set cache value
   * @param {string} key Cache key
   * @param {any} value Value to cache
   * @param {number} ttl Time to live in seconds
   */
  async set(key, value, ttl) {
    this.validateInitialization();

    const service = this._getServiceFromKey(key);
    const cache = this.caches.get(service);

    if (!cache) {
      throw new Error(`Cache not found for key: ${key}`);
    }

    const options = ttl ? { ttl: ttl * 1000 } : undefined;

    cache.set(key, value, options);
    this._updateStats(service, 'set');
  }

  /**
   * Delete cached value
   * @param {string} key Cache key
   */
  async delete(key) {
    this.validateInitialization();

    const service = this._getServiceFromKey(key);
    const cache = this.caches.get(service);

    if (cache) {
      cache.delete(key);
      this._updateStats(service, 'delete');
    }
  }

  /**
   * Clear all caches
   */
  async clearAll() {
    this.validateInitialization();

    for (const [service, cache] of this.caches.entries()) {
      cache.clear();
      this._updateStats(service, 'clear');
    }
  }

  /**
   * Get cache statistics
   * @return {Object} Cache statistics
   */
  getStats() {
    this.validateInitialization();

    const allStats = {};

    for (const [service, stats] of this.stats.entries()) {
      allStats[service] = {
        ...stats,
        size: this.caches.get(service)?.size || 0,
      };
    }

    return allStats;
  }

  /**
   * Initialize cache for service
   * @param {string} service Service name
   * @param {Object} options Cache options
   * @private
   */
  _initializeCache(service, options) {
    const cache = new LRU({
      max: options.max || 1000,
      ttl: options.ttl || 1000 * 60 * 5, // 5 minutes default
      updateAgeOnGet: true,
    });

    this.caches.set(service, cache);
  }

  /**
   * Initialize statistics for service
   * @param {string} service Service name
   * @private
   */
  _initializeStats(service) {
    this.stats.set(service, {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      clears: 0,
      lastAccessed: null,
      lastUpdated: null,
    });
  }

  /**
   * Start cache monitoring
   * @private
   */
  _startMonitoring() {
    this._monitoringInterval = setInterval(() => {
      for (const [service, cache] of this.caches.entries()) {
        const stats = this.stats.get(service);

        if (stats) {
          const size = cache.size;
          const max = cache.max;

          if (size > max * 0.9) {
            console.warn(`Cache ${service} is nearing capacity: ${size}/${max} items`);
          }
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Update cache statistics
   * @param {string} service Service name
   * @param {string} operation Operation type
   * @param {boolean} [hit] Whether operation was a cache hit
   * @private
   */
  _updateStats(service, operation, hit) {
    const stats = this.stats.get(service);

    if (!stats) return;

    const now = new Date();

    switch (operation) {
      case 'get':
        if (hit) {
          stats.hits++;
          stats.lastAccessed = now;
        } else {
          stats.misses++;
        }
        break;
      case 'set':
        stats.sets++;
        stats.lastUpdated = now;
        break;
      case 'delete':
        stats.deletes++;
        stats.lastUpdated = now;
        break;
      case 'clear':
        stats.clears++;
        stats.lastUpdated = now;
        break;
    }
  }

  /**
   * Get cached value or compute it if not found
   * @param {string} key Cache key
   * @param {Function} computeFn Function to compute value if not in cache
   * @param {number} ttl Time to live in seconds
   * @return {Promise<any>} Cached or computed value
   */
  async getOrCompute(key, computeFn, ttl) {
    this.validateInitialization();

    const service = this._getServiceFromKey(key);
    const cache = this.caches.get(service);

    if (!cache) {
      throw new Error(`Cache not found for key: ${key}`);
    }

    let value = cache.get(key);

    if (value === undefined) {
      value = await computeFn();
      const options = ttl ? { ttl: ttl * 1000 } : undefined;
      cache.set(key, value, options);
      this._updateStats(service, 'set');
    }

    this._updateStats(service, 'get', value !== undefined);
    return value;
  }

  /**
   * Get service name from cache key
   * @param {string} key Cache key
   * @return {string} Service name
   * @private
   */
  _getServiceFromKey(key) {
    const [service] = key.split(':');

    return service;
  }
}

module.exports = new CacheService();

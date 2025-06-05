/**
 * Cache Manager Utility
 * Handles caching with support for memory and Redis backends
 */

const Redis = require('ioredis');
const LRU = require('lru-cache');
const config = require('../config');
const logger = require('./logger');

class CacheManager {
  constructor() {
    this.client = null;
    this.memoryCache = null;
    this.initialized = false;
  }

  /**
   * Initialize cache manager
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      const cacheConfig = config.get('cache');

      if (!cacheConfig.enabled) {
        logger.info('Cache is disabled');
        return;
      }

      if (cacheConfig.storage === 'redis') {
        await this.initializeRedis(cacheConfig.redis);
      } else {
        this.initializeMemory();
      }

      this.initialized = true;
      logger.info(`Cache initialized using ${cacheConfig.storage} storage`);
    } catch (error) {
      logger.error(error, { context: 'cache initialization' });
      throw error;
    }
  }

  /**
   * Initialize Redis client
   * @param {Object} redisConfig - Redis configuration
   * @returns {Promise<void>}
   */
  async initializeRedis(redisConfig) {
    try {
      this.client = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        retryStrategy: times => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      await this.client.ping();
    } catch (error) {
      logger.error(error, { context: 'redis initialization' });
      throw error;
    }
  }

  /**
   * Initialize memory cache
   */
  initializeMemory() {
    this.memoryCache = new LRU({
      max: 500, // Maximum number of items
      maxSize: 50 * 1024 * 1024, // 50MB
      sizeCalculation: (value, key) => {
        return JSON.stringify(value).length + key.length;
      },
      ttl: config.get('cache.duration', 3600) * 1000, // Convert to milliseconds
    });
  }

  /**
   * Get cache key
   * @param {string} key - Base key
   * @param {Object} params - Additional parameters
   * @returns {string} Cache key
   */
  getCacheKey(key, params = {}) {
    const parts = [key];

    if (params.organization) {
      parts.push(params.organization);
    }

    if (params.user) {
      parts.push(params.user);
    }

    if (params.query) {
      parts.push(JSON.stringify(params.query));
    }

    return parts.join(':');
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value
   */
  async get(key) {
    if (!this.initialized) return null;

    try {
      if (this.client) {
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        return this.memoryCache.get(key);
      }
    } catch (error) {
      logger.error(error, { context: 'cache get', key });
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = null) {
    if (!this.initialized) return false;

    try {
      const duration = ttl || config.get('cache.duration', 3600);

      if (this.client) {
        await this.client.set(key, JSON.stringify(value), 'EX', duration);
      } else {
        this.memoryCache.set(key, value, {
          ttl: duration * 1000, // Convert to milliseconds
        });
      }

      return true;
    } catch (error) {
      logger.error(error, { context: 'cache set', key });
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async delete(key) {
    if (!this.initialized) return false;

    try {
      if (this.client) {
        await this.client.del(key);
      } else {
        this.memoryCache.delete(key);
      }

      return true;
    } catch (error) {
      logger.error(error, { context: 'cache delete', key });
      return false;
    }
  }

  /**
   * Clear cache by pattern
   * @param {string} pattern - Key pattern to clear
   * @returns {Promise<boolean>} Success status
   */
  async clear(pattern) {
    if (!this.initialized) return false;

    try {
      if (this.client) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } else {
        const keys = Array.from(this.memoryCache.keys()).filter(key => key.includes(pattern));
        keys.forEach(key => this.memoryCache.delete(key));
      }

      return true;
    } catch (error) {
      logger.error(error, { context: 'cache clear', pattern });
      return false;
    }
  }

  /**
   * Cache function result
   * @param {string} key - Cache key
   * @param {Function} fn - Function to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<any>} Function result
   */
  async remember(key, fn, ttl = null) {
    if (!this.initialized) return fn();

    try {
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }

      const result = await fn();
      await this.set(key, result, ttl);
      return result;
    } catch (error) {
      logger.error(error, { context: 'cache remember', key });
      return fn();
    }
  }

  /**
   * Cache function result forever
   * @param {string} key - Cache key
   * @param {Function} fn - Function to cache
   * @returns {Promise<any>} Function result
   */
  async rememberForever(key, fn) {
    return this.remember(key, fn, 0);
  }

  /**
   * Get cache stats
   * @returns {Object} Cache statistics
   */
  getStats() {
    if (!this.initialized) return {};

    if (this.client) {
      return {
        type: 'redis',
        connected: this.client.status === 'ready',
      };
    } else {
      return {
        type: 'memory',
        size: this.memoryCache.size,
        maxSize: this.memoryCache.maxSize,
        itemCount: this.memoryCache.size,
      };
    }
  }
}

// Export singleton instance
module.exports = new CacheManager();

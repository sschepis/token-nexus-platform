/* eslint-disable no-underscore-dangle */
const { performance } = require('perf_hooks');
const logger = require('./logger');

/**
 * Query Optimizer for improving database query performance
 */
class QueryOptimizer {
  constructor() {
    this.queryStats = new Map();
    this.indexSuggestions = new Map();
    this.slowQueryThreshold = 100; // ms
  }

  /**
   * Analyze a query and collect performance metrics
   * @param {Object} query Parse Query object
   * @param {string} className Parse class name
   * @param {number} duration Query execution time in ms
   */
  analyzeQuery(query, className, duration) {
    const queryKey = this.getQueryKey(query, className);
    const stats = this.queryStats.get(queryKey) || {
      count: 0,
      totalDuration: 0,
      avgDuration: 0,
      lastSeen: Date.now(),
    };

    stats.count++;
    stats.totalDuration += duration;
    stats.avgDuration = stats.totalDuration / stats.count;
    stats.lastSeen = Date.now();

    this.queryStats.set(queryKey, stats);

    // Check if query is slow
    if (duration > this.slowQueryThreshold) {
      this.analyzeSlow(query, className, duration);
    }
  }

  /**
   * Analyze a slow query and generate optimization suggestions
   * @param {Object} query Parse Query object
   * @param {string} className Parse class name
   * @param {number} duration Query execution time in ms
   */
  analyzeSlow(query, className, duration) {
    const suggestions = [];

    // Check if query uses indexes effectively
    const constraints = query._where || {};
    const fields = Object.keys(constraints);

    // Check for full collection scans
    if (fields.length === 0) {
      suggestions.push({
        type: 'FULL_SCAN',
        message: 'Query performs full collection scan. Consider adding filters.',
        severity: 'HIGH',
      });
    }

    // Check for unindexed fields in constraints
    fields.forEach(field => {
      if (!this.isFieldIndexed(className, field)) {
        suggestions.push({
          type: 'MISSING_INDEX',
          message: `Consider adding index for field: ${field}`,
          severity: 'MEDIUM',
          field,
        });
      }
    });

    // Check for inefficient regex queries
    fields.forEach(field => {
      const constraint = constraints[field];

      if (constraint?.$regex && constraint.$regex.startsWith('.*')) {
        suggestions.push({
          type: 'INEFFICIENT_REGEX',
          message: `Regex with leading wildcard on field: ${field}. Consider restructuring data or query.`,
          severity: 'HIGH',
          field,
        });
      }
    });

    // Check for large skip values
    if (query._skip > 1000) {
      suggestions.push({
        type: 'LARGE_SKIP',
        message:
          'Large skip value may cause performance issues. Consider using cursor-based pagination.',
        severity: 'MEDIUM',
      });
    }

    // Store suggestions
    if (suggestions.length > 0) {
      this.indexSuggestions.set(`${className}:${this.getQueryKey(query, className)}`, {
        suggestions,
        lastSeen: Date.now(),
        duration,
      });

      // Log suggestions
      logger.warn('Query Optimization Suggestions:', {
        className,
        duration,
        suggestions,
      });
    }
  }

  /**
   * Get optimization suggestions for a class
   * @param {string} className Parse class name
   * @return {Array} Array of optimization suggestions
   */
  getSuggestions(className) {
    const suggestions = [];

    for (const [key, value] of this.indexSuggestions.entries()) {
      if (key.startsWith(`${className}:`)) {
        suggestions.push(value);
      }
    }

    return suggestions;
  }

  /**
   * Generate a unique key for a query
   * @param {Object} query Parse Query object
   * @param {string} className Parse class name
   * @return {string} Query key
   */
  getQueryKey(query, className) {
    const constraints = query._where || {};
    const sort = query._order || [];
    const skip = query._skip || 0;
    const limit = query._limit || -1;

    return JSON.stringify({
      className,
      constraints,
      sort,
      skip,
      limit,
    });
  }

  /**
   * Check if a field is indexed
   * @param {string} className Parse class name
   * @param {string} field Field name
   * @return {boolean} Whether field is indexed
   */
  isFieldIndexed(_className, _field) {
    // This should be implemented to check actual database indexes
    // For now, return false to encourage index creation
    return false;
  }

  /**
   * Wrap a query with performance monitoring
   * @param {Object} query Parse Query object
   * @param {string} className Parse class name
   * @return {Object} Wrapped query
   */
  wrapQuery(query, className) {
    const originalFind = query.find.bind(query);
    const optimizer = this;

    query.find = async function (...args) {
      const start = performance.now();

      try {
        const result = await originalFind(...args);
        const duration = performance.now() - start;

        optimizer.analyzeQuery(query, className, duration);

        return result;
      } catch (error) {
        const duration = performance.now() - start;

        optimizer.analyzeQuery(query, className, duration);
        throw error;
      }
    };

    return query;
  }

  /**
   * Get performance metrics for queries
   * @return {Object} Query performance metrics
   */
  getMetrics() {
    const metrics = {
      totalQueries: 0,
      slowQueries: 0,
      averageDuration: 0,
      totalDuration: 0,
      queriesByClass: {},
    };

    for (const [key, stats] of this.queryStats.entries()) {
      const className = key.split(':')[0];

      metrics.totalQueries += stats.count;
      metrics.totalDuration += stats.totalDuration;

      if (stats.avgDuration > this.slowQueryThreshold) {
        metrics.slowQueries++;
      }

      if (!metrics.queriesByClass[className]) {
        metrics.queriesByClass[className] = {
          count: 0,
          totalDuration: 0,
          avgDuration: 0,
        };
      }

      const classStats = metrics.queriesByClass[className];

      classStats.count += stats.count;
      classStats.totalDuration += stats.totalDuration;
      classStats.avgDuration = classStats.totalDuration / classStats.count;
    }

    metrics.averageDuration =
      metrics.totalQueries > 0 ? metrics.totalDuration / metrics.totalQueries : 0;

    return metrics;
  }

  /**
   * Clear old statistics and suggestions
   * @param {number} maxAge Maximum age in milliseconds
   */
  cleanup(maxAge = 24 * 60 * 60 * 1000) {
    // Default 24 hours
    const now = Date.now();

    // Clean up query stats
    for (const [key, stats] of this.queryStats.entries()) {
      if (now - stats.lastSeen > maxAge) {
        this.queryStats.delete(key);
      }
    }

    // Clean up suggestions
    for (const [key, value] of this.indexSuggestions.entries()) {
      if (now - value.lastSeen > maxAge) {
        this.indexSuggestions.delete(key);
      }
    }
  }
}

// Export singleton instance
module.exports = new QueryOptimizer();

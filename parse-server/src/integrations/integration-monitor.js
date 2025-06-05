const { logger } = require('../utils/logger');
const { MonitorError } = require('../utils/errors');
const { validateMetrics } = require('../utils/validation');

/**
 * Monitors health and performance of integration points
 */
class IntegrationMonitor {
  constructor() {
    this.monitors = new Map();
    this.healthChecks = new Map();
    this.metrics = new Map();
    this.alerts = new Map();
    this.checkInterval = 60000; // 1 minute
    this.retentionPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
  }

  /**
   * Register integration monitor
   * @param {Object} options Monitor configuration
   * @param {string} options.name Integration identifier
   * @param {string} options.type Integration type
   * @param {Function} options.healthCheck Health check function
   * @param {Function} options.metricsCollector Metrics collection function
   * @param {Object} options.alertConfig Alert configuration
   * @return {Promise<void>}
   */
  async registerMonitor(options) {
    const { name, type, healthCheck, metricsCollector, alertConfig = {} } = options;

    if (this.monitors.has(name)) {
      throw new MonitorError('MONITOR_EXISTS', `Monitor ${name} already exists`);
    }

    try {
      // Initialize monitor
      const monitor = {
        name,
        type,
        status: 'active',
        lastCheck: null,
        health: {
          status: 'unknown',
          lastSuccess: null,
          lastFailure: null,
          consecutiveFailures: 0,
        },
        metrics: {
          current: {},
          history: [],
        },
      };

      // Store monitor configuration
      this.monitors.set(name, monitor);
      this.healthChecks.set(name, healthCheck);
      this.metrics.set(name, metricsCollector);
      this.alerts.set(name, this.createAlertConfig(alertConfig));

      // Start monitoring
      await this.startMonitoring(name);

      logger.info('Integration monitor registered', {
        integration: name,
        type,
      });
    } catch (error) {
      logger.error('Failed to register monitor', {
        integration: name,
        error: error.message,
      });
      throw new MonitorError('REGISTRATION_FAILED', error.message);
    }
  }

  /**
   * Start monitoring integration
   * @param {string} name Integration identifier
   * @return {Promise<void>}
   */
  async startMonitoring(name) {
    const monitor = this.getMonitor(name);
    const healthCheck = this.healthChecks.get(name);
    const metricsCollector = this.metrics.get(name);

    // Perform initial health check
    await this.performHealthCheck(name, healthCheck);

    // Collect initial metrics
    if (metricsCollector) {
      await this.collectMetrics(name, metricsCollector);
    }

    // Schedule regular checks
    setInterval(async () => {
      try {
        await this.performHealthCheck(name, healthCheck);
        if (metricsCollector) {
          await this.collectMetrics(name, metricsCollector);
        }
      } catch (error) {
        logger.error('Monitor check failed', {
          integration: name,
          error: error.message,
        });
      }
    }, this.checkInterval);

    // Schedule metrics cleanup
    setInterval(() => {
      this.cleanupMetrics(name);
    }, this.checkInterval);

    monitor.status = 'monitoring';
  }

  /**
   * Perform health check
   * @param {string} name Integration identifier
   * @param {Function} healthCheck Health check function
   * @return {Promise<void>}
   */
  async performHealthCheck(name, healthCheck) {
    const monitor = this.getMonitor(name);
    const alertConfig = this.alerts.get(name);

    try {
      // Execute health check
      const result = await healthCheck();

      // Update health status
      monitor.health.status = result.status;
      monitor.health.lastCheck = new Date().toISOString();
      monitor.health.lastSuccess = new Date().toISOString();
      monitor.health.consecutiveFailures = 0;

      // Clear alerts if any
      if (alertConfig.active) {
        await this.clearAlert(name, 'health');
      }
    } catch (error) {
      // Update failure metrics
      monitor.health.status = 'error';
      monitor.health.lastCheck = new Date().toISOString();
      monitor.health.lastFailure = new Date().toISOString();
      monitor.health.consecutiveFailures++;

      // Check alert threshold
      if (
        alertConfig.active &&
        monitor.health.consecutiveFailures >= alertConfig.healthFailureThreshold
      ) {
        await this.triggerAlert(name, 'health', error.message);
      }

      logger.error('Health check failed', {
        integration: name,
        error: error.message,
      });
    }
  }

  /**
   * Collect integration metrics
   * @param {string} name Integration identifier
   * @param {Function} collector Metrics collector function
   * @return {Promise<void>}
   */
  async collectMetrics(name, collector) {
    const monitor = this.getMonitor(name);
    const alertConfig = this.alerts.get(name);

    try {
      // Collect metrics
      const metrics = await collector();

      // Validate metrics
      await validateMetrics(metrics);

      // Store metrics
      monitor.metrics.current = metrics;
      monitor.metrics.history.push({
        timestamp: new Date().toISOString(),
        metrics,
      });

      // Check thresholds
      await this.checkMetricThresholds(name, metrics, alertConfig);
    } catch (error) {
      logger.error('Metrics collection failed', {
        integration: name,
        error: error.message,
      });
    }
  }

  /**
   * Check metric thresholds
   * @param {string} name Integration identifier
   * @param {Object} metrics Current metrics
   * @param {Object} alertConfig Alert configuration
   * @return {Promise<void>}
   */
  async checkMetricThresholds(name, metrics, alertConfig) {
    if (!alertConfig.thresholds) return;

    for (const [metric, threshold] of Object.entries(alertConfig.thresholds)) {
      const value = metrics[metric];

      if (value === undefined) continue;

      if (
        (threshold.min !== undefined && value < threshold.min) ||
        (threshold.max !== undefined && value > threshold.max)
      ) {
        await this.triggerAlert(name, 'metric', `${metric} threshold exceeded: ${value}`);
      }
    }
  }

  /**
   * Trigger integration alert
   * @param {string} name Integration identifier
   * @param {string} type Alert type
   * @param {string} message Alert message
   * @return {Promise<void>}
   */
  async triggerAlert(name, type, message) {
    const monitor = this.getMonitor(name);
    const alertConfig = this.alerts.get(name);

    // Create alert
    const alert = {
      integration: name,
      type,
      message,
      timestamp: new Date().toISOString(),
      status: 'active',
    };

    // Store alert
    if (!monitor.alerts) {
      monitor.alerts = [];
    }
    monitor.alerts.push(alert);

    // Send notifications
    for (const notifier of alertConfig.notifiers) {
      try {
        await notifier(alert);
      } catch (error) {
        logger.error('Alert notification failed', {
          integration: name,
          notifier: notifier.name,
          error: error.message,
        });
      }
    }

    logger.warn('Integration alert triggered', {
      integration: name,
      type,
      message,
    });
  }

  /**
   * Clear integration alert
   * @param {string} name Integration identifier
   * @param {string} type Alert type
   * @return {Promise<void>}
   */
  clearAlert(name, type) {
    const monitor = this.getMonitor(name);

    if (!monitor.alerts) return;

    // Clear matching alerts
    monitor.alerts = monitor.alerts.filter(
      alert => alert.type !== type || alert.status !== 'active'
    );

    logger.info('Integration alert cleared', {
      integration: name,
      type,
    });
  }

  /**
   * Create alert configuration
   * @param {Object} config Alert configuration
   * @return {Object} Processed alert config
   */
  createAlertConfig(config) {
    return {
      active: config.active !== false,
      healthFailureThreshold: config.healthFailureThreshold || 3,
      thresholds: config.thresholds || {},
      notifiers: config.notifiers || [],
      retention: config.retention || this.retentionPeriod,
    };
  }

  /**
   * Clean up old metrics
   * @param {string} name Integration identifier
   */
  cleanupMetrics(name) {
    const monitor = this.getMonitor(name);
    const alertConfig = this.alerts.get(name);
    const cutoff = Date.now() - alertConfig.retention;

    // Remove old metrics
    monitor.metrics.history = monitor.metrics.history.filter(
      entry => new Date(entry.timestamp).getTime() > cutoff
    );
  }

  /**
   * Get monitor instance
   * @param {string} name Integration identifier
   * @return {Object} Monitor instance
   */
  getMonitor(name) {
    const monitor = this.monitors.get(name);

    if (!monitor) {
      throw new MonitorError('MONITOR_NOT_FOUND', `Monitor ${name} not found`);
    }

    return monitor;
  }

  /**
   * Get integration health
   * @param {string} name Integration identifier
   * @return {Object} Health status
   */
  getHealth(name) {
    return this.getMonitor(name).health;
  }

  /**
   * Get integration metrics
   * @param {string} name Integration identifier
   * @param {Object} options Query options
   * @return {Object} Metrics data
   */
  getMetrics(name, options = {}) {
    const monitor = this.getMonitor(name);
    const { period = '1h', aggregate = false } = options;

    // Get metrics for period
    const cutoff = new Date(Date.now() - this.parsePeriod(period));
    const metrics = monitor.metrics.history.filter(entry => new Date(entry.timestamp) > cutoff);

    if (!aggregate) {
      return metrics;
    }

    // Aggregate metrics
    return this.aggregateMetrics(metrics);
  }

  /**
   * Parse time period string
   * @param {string} period Period string (e.g., '1h', '7d')
   * @return {number} Period in milliseconds
   */
  parsePeriod(period) {
    const units = {
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    const match = period.match(/^(\d+)([mhd])$/);

    if (!match) {
      throw new MonitorError('INVALID_PERIOD', `Invalid period format: ${period}`);
    }

    const [, value, unit] = match;

    return parseInt(value) * units[unit];
  }

  /**
   * Aggregate metrics data
   * @param {Object[]} metrics Metrics entries
   * @return {Object} Aggregated metrics
   */
  aggregateMetrics(metrics) {
    if (metrics.length === 0) return {};

    const aggregated = {};
    const firstMetrics = metrics[0].metrics;

    // Initialize aggregates
    for (const key of Object.keys(firstMetrics)) {
      aggregated[key] = {
        min: Infinity,
        max: -Infinity,
        sum: 0,
        avg: 0,
      };
    }

    // Calculate aggregates
    for (const entry of metrics) {
      for (const [key, value] of Object.entries(entry.metrics)) {
        if (typeof value === 'number') {
          aggregated[key].min = Math.min(aggregated[key].min, value);
          aggregated[key].max = Math.max(aggregated[key].max, value);
          aggregated[key].sum += value;
        }
      }
    }

    // Calculate averages
    for (const key of Object.keys(aggregated)) {
      aggregated[key].avg = aggregated[key].sum / metrics.length;
    }

    return aggregated;
  }

  /**
   * List all monitors
   * @return {Object[]} List of monitors
   */
  listMonitors() {
    return Array.from(this.monitors.values()).map(monitor => ({
      name: monitor.name,
      type: monitor.type,
      status: monitor.status,
      health: monitor.health,
      metrics: monitor.metrics.current,
    }));
  }

  /**
   * Remove monitor
   * @param {string} name Integration identifier
   * @return {boolean} Whether monitor was removed
   */
  removeMonitor(name) {
    if (!this.monitors.has(name)) {
      return false;
    }

    this.monitors.delete(name);
    this.healthChecks.delete(name);
    this.metrics.delete(name);
    this.alerts.delete(name);

    logger.info('Integration monitor removed', {
      integration: name,
    });

    return true;
  }
}

module.exports = new IntegrationMonitor();

/**
 * Monitoring Service
 * Handles system health monitoring and performance tracking
 */

const os = require('os');
const config = require('../config').defaultConfig;
const LoggingService = require('./LoggingService');
const { EventEmitter } = require('events');

class MonitoringService extends EventEmitter {
  constructor() {
    super();
    this.config = config.monitoring;
    this.initialized = false;
    this.metrics = new Map();
    this.alerts = new Map();
    this.healthChecks = new Map();
    this.intervals = new Map();
  }

  /**
   * Initialize the monitoring service
   */
  async initialize() {
    try {
      // Initialize system metrics collection
      this._initializeSystemMetrics();

      // Initialize service health checks
      this._initializeHealthChecks();

      // Initialize alert thresholds
      this._initializeAlerts();

      // Start monitoring intervals
      this._startMonitoring();

      this.initialized = true;
      LoggingService.log('system', 'info', 'Monitoring service initialized successfully');
    } catch (error) {
      LoggingService.trackError(error, { service: 'MonitoringService', method: 'initialize' });
      throw error;
    }
  }

  /**
   * Get system health status
   * @returns {Object} System health status
   */
  async getHealthStatus() {
    if (!this.initialized) {
      throw new Error('Monitoring service is not initialized');
    }

    try {
      const checks = await this._runHealthChecks();
      const metrics = this._getLatestMetrics();
      const alerts = Array.from(this.alerts.values()).filter(alert => alert.active);

      return {
        status: this._calculateOverallStatus(checks),
        timestamp: new Date(),
        checks,
        metrics,
        alerts,
      };
    } catch (error) {
      LoggingService.trackError(error, { service: 'MonitoringService', method: 'getHealthStatus' });
      throw error;
    }
  }

  /**
   * Get performance metrics
   * @param {string} category Metric category
   * @param {Object} timeRange Time range for metrics
   * @returns {Array} Performance metrics
   */
  getMetrics(category, timeRange = { minutes: 60 }) {
    if (!this.initialized) {
      throw new Error('Monitoring service is not initialized');
    }

    const metrics = this.metrics.get(category) || [];
    const cutoff = Date.now() - this._calculateTimeRange(timeRange);

    return metrics.filter(metric => metric.timestamp >= cutoff);
  }

  /**
   * Register custom health check
   * @param {string} name Health check name
   * @param {Function} check Health check function
   * @param {Object} options Health check options
   */
  registerHealthCheck(name, check, options = {}) {
    if (!this.initialized) {
      throw new Error('Monitoring service is not initialized');
    }

    this.healthChecks.set(name, {
      check,
      interval: options.interval || 60000,
      timeout: options.timeout || 5000,
      enabled: true,
    });

    // Start health check interval
    this._startHealthCheck(name);
  }

  /**
   * Set alert threshold
   * @param {string} name Alert name
   * @param {Function} condition Alert condition
   * @param {Object} options Alert options
   */
  setAlertThreshold(name, condition, options = {}) {
    if (!this.initialized) {
      throw new Error('Monitoring service is not initialized');
    }

    this.alerts.set(name, {
      condition,
      threshold: options.threshold,
      interval: options.interval || 60000,
      severity: options.severity || 'warning',
      active: false,
      lastTriggered: null,
    });

    // Start alert monitoring
    this._startAlertMonitoring(name);
  }

  /**
   * Initialize system metrics collection
   * @private
   */
  _initializeSystemMetrics() {
    const systemMetrics = [
      {
        name: 'cpu',
        collector: () => {
          const cpus = os.cpus();
          const usage =
            cpus.reduce((acc, cpu) => {
              const total = Object.values(cpu.times).reduce((a, b) => a + b);
              const idle = cpu.times.idle;
              return acc + (total - idle) / total;
            }, 0) / cpus.length;

          return usage * 100;
        },
      },
      {
        name: 'memory',
        collector: () => {
          const total = os.totalmem();
          const free = os.freemem();
          return ((total - free) / total) * 100;
        },
      },
      {
        name: 'load',
        collector: () => {
          const [oneMin, fiveMin, fifteenMin] = os.loadavg();
          return { oneMin, fiveMin, fifteenMin };
        },
      },
    ];

    systemMetrics.forEach(metric => {
      this.metrics.set(metric.name, []);
      this.intervals.set(
        `metric_${metric.name}`,
        setInterval(() => {
          this._collectMetric(metric.name, metric.collector());
        }, this.config.metrics.interval)
      );
    });
  }

  /**
   * Initialize service health checks
   * @private
   */
  _initializeHealthChecks() {
    const defaultChecks = {
      database: async () => {
        const query = new Parse.Query('_User');
        await query.limit(1).find({ useMasterKey: true });
        return true;
      },
      cache: async () => {
        return Parse.Cache.get('health_check') !== null;
      },
      elasticsearch: async () => {
        const response = await fetch(`${config.search.engine.host}/_cluster/health`);
        return response.status === 200;
      },
    };

    Object.entries(defaultChecks).forEach(([name, check]) => {
      this.registerHealthCheck(name, check);
    });
  }

  /**
   * Initialize alert thresholds
   * @private
   */
  _initializeAlerts() {
    const defaultAlerts = {
      highCPU: {
        condition: metrics => metrics.cpu > 80,
        threshold: 80,
        severity: 'warning',
      },
      criticalCPU: {
        condition: metrics => metrics.cpu > 90,
        threshold: 90,
        severity: 'critical',
      },
      highMemory: {
        condition: metrics => metrics.memory > 85,
        threshold: 85,
        severity: 'warning',
      },
      criticalMemory: {
        condition: metrics => metrics.memory > 95,
        threshold: 95,
        severity: 'critical',
      },
      highLoad: {
        condition: metrics => metrics.load.oneMin > 10,
        threshold: 10,
        severity: 'warning',
      },
    };

    Object.entries(defaultAlerts).forEach(([name, alert]) => {
      this.setAlertThreshold(name, alert.condition, alert);
    });
  }

  /**
   * Start monitoring intervals
   * @private
   */
  _startMonitoring() {
    // Start health status reporting
    this.intervals.set(
      'health_report',
      setInterval(async () => {
        const status = await this.getHealthStatus();
        this.emit('healthStatus', status);
        LoggingService.log('performance', 'info', 'Health status updated', status);
      }, this.config.healthCheck.interval)
    );

    // Start metrics cleanup
    this.intervals.set(
      'metrics_cleanup',
      setInterval(() => {
        this._cleanupOldMetrics();
      }, this.config.metrics.cleanupInterval)
    );
  }

  /**
   * Start health check interval
   * @param {string} name Health check name
   * @private
   */
  _startHealthCheck(name) {
    const check = this.healthChecks.get(name);
    if (!check || !check.enabled) return;

    this.intervals.set(
      `health_${name}`,
      setInterval(async () => {
        try {
          const result = await Promise.race([
            check.check(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), check.timeout)
            ),
          ]);

          this.emit('healthCheck', { name, status: result ? 'healthy' : 'unhealthy' });
        } catch (error) {
          this.emit('healthCheck', { name, status: 'unhealthy', error: error.message });
          LoggingService.trackError(error, { service: 'MonitoringService', check: name });
        }
      }, check.interval)
    );
  }

  /**
   * Start alert monitoring
   * @param {string} name Alert name
   * @private
   */
  _startAlertMonitoring(name) {
    const alert = this.alerts.get(name);
    if (!alert) return;

    this.intervals.set(
      `alert_${name}`,
      setInterval(() => {
        const metrics = this._getLatestMetrics();
        const triggered = alert.condition(metrics);

        if (triggered && !alert.active) {
          alert.active = true;
          alert.lastTriggered = new Date();
          this.emit('alertTriggered', { name, severity: alert.severity, metrics });
          LoggingService.log('system', 'warn', `Alert triggered: ${name}`, { alert, metrics });
        } else if (!triggered && alert.active) {
          alert.active = false;
          this.emit('alertResolved', { name });
          LoggingService.log('system', 'info', `Alert resolved: ${name}`);
        }
      }, alert.interval)
    );
  }

  /**
   * Collect metric
   * @param {string} name Metric name
   * @param {any} value Metric value
   * @private
   */
  _collectMetric(name, value) {
    const metrics = this.metrics.get(name) || [];
    metrics.push({
      timestamp: Date.now(),
      value,
    });
    this.metrics.set(name, metrics);
  }

  /**
   * Run all health checks
   * @returns {Object} Health check results
   * @private
   */
  async _runHealthChecks() {
    const results = {};

    for (const [name, check] of this.healthChecks.entries()) {
      if (!check.enabled) continue;

      try {
        const result = await Promise.race([
          check.check(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), check.timeout)),
        ]);

        results[name] = {
          status: result ? 'healthy' : 'unhealthy',
          timestamp: new Date(),
        };
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date(),
        };
      }
    }

    return results;
  }

  /**
   * Get latest metrics
   * @returns {Object} Latest metrics
   * @private
   */
  _getLatestMetrics() {
    const latest = {};

    for (const [name, metrics] of this.metrics.entries()) {
      if (metrics.length > 0) {
        latest[name] = metrics[metrics.length - 1].value;
      }
    }

    return latest;
  }

  /**
   * Calculate overall system status
   * @param {Object} checks Health check results
   * @returns {string} Overall status
   * @private
   */
  _calculateOverallStatus(checks) {
    const statuses = Object.values(checks).map(check => check.status);

    if (statuses.some(status => status === 'unhealthy')) {
      return 'unhealthy';
    }

    return 'healthy';
  }

  /**
   * Calculate time range in milliseconds
   * @param {Object} range Time range object
   * @returns {number} Time range in milliseconds
   * @private
   */
  _calculateTimeRange(range) {
    const multipliers = {
      seconds: 1000,
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
    };

    return Object.entries(range).reduce((acc, [unit, value]) => {
      return acc + value * multipliers[unit];
    }, 0);
  }

  /**
   * Clean up old metrics
   * @private
   */
  _cleanupOldMetrics() {
    const retention = this.config.metrics.retention;
    const cutoff = Date.now() - retention;

    for (const [name, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(metric => metric.timestamp > cutoff);
      this.metrics.set(name, filtered);
    }
  }

  /**
   * Stop monitoring service
   */
  stop() {
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
    this.initialized = false;
  }
}

module.exports = new MonitoringService();

const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');

/**
 * Aggregates and processes usage data for migration and analysis
 */
class UsageDataAggregator {
  /**
   * Aggregate usage data from multiple sources
   * @param {Object} options Aggregation options
   * @param {string} options.sourcePath Source data directory
   * @param {string} options.targetPath Target output file
   * @param {string[]} options.metrics Metrics to aggregate
   * @param {string} options.startDate Start date for aggregation
   * @param {string} options.endDate End date for aggregation
   * @param {Object} options.filters Data filters
   * @return {Promise<Object>} Aggregation result
   */
  async aggregate(options) {
    const {
      sourcePath,
      targetPath,
      metrics = ['api', 'storage', 'compute'],
      startDate,
      endDate,
      filters = {},
    } = options;

    try {
      // Read source data files
      const files = await this.getDataFiles(sourcePath);

      // Process and aggregate data
      const aggregatedData = await this.processFiles(files, {
        metrics,
        startDate,
        endDate,
        filters,
      });

      // Generate summary
      const summary = this.generateSummary(aggregatedData);

      // Save aggregated data
      await this.saveAggregatedData(targetPath, {
        data: aggregatedData,
        summary,
        metadata: {
          metrics,
          period: { startDate, endDate },
          filters,
          generatedAt: new Date().toISOString(),
        },
      });

      return {
        success: true,
        summary,
        dataPoints: aggregatedData.length,
        outputPath: targetPath,
      };
    } catch (error) {
      logger.error('Usage data aggregation failed', {
        error: error.message,
        source: sourcePath,
        metrics,
      });
      throw error;
    }
  }

  /**
   * Get list of data files to process
   * @param {string} sourcePath Source directory path
   * @return {Promise<string[]>} List of file paths
   */
  async getDataFiles(sourcePath) {
    const files = await fs.readdir(sourcePath);

    return files.filter(file => file.endsWith('.json')).map(file => path.join(sourcePath, file));
  }

  /**
   * Process data files and aggregate metrics
   * @param {string[]} files List of file paths
   * @param {Object} options Processing options
   * @return {Promise<Object[]>} Processed data
   */
  async processFiles(files, options) {
    const { metrics, startDate, endDate, filters } = options;
    const data = [];

    for (const file of files) {
      const fileData = await this.readDataFile(file);
      const processedData = this.processData(fileData, {
        metrics,
        startDate,
        endDate,
        filters,
      });

      data.push(...processedData);
    }

    return this.aggregateData(data, metrics);
  }

  /**
   * Read and parse data file
   * @param {string} filePath File path
   * @return {Promise<Object>} File data
   */
  async readDataFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');

    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
    }
  }

  /**
   * Process raw data according to options
   * @param {Object} data Raw data
   * @param {Object} options Processing options
   * @return {Object[]} Processed data
   */
  processData(data, options) {
    const { metrics, startDate, endDate, filters } = options;

    return data
      .filter(record => {
        // Apply date filters
        const timestamp = new Date(record.timestamp);

        if (startDate && timestamp < new Date(startDate)) return false;
        if (endDate && timestamp > new Date(endDate)) return false;

        // Apply custom filters
        return Object.entries(filters).every(([key, value]) => {
          if (Array.isArray(value)) {
            return value.includes(record[key]);
          }

          return record[key] === value;
        });
      })
      .map(record => this.extractMetrics(record, metrics));
  }

  /**
   * Extract specified metrics from record
   * @param {Object} record Data record
   * @param {string[]} metrics Metrics to extract
   * @return {Object} Extracted metrics
   */
  extractMetrics(record, metrics) {
    const result = {
      timestamp: record.timestamp,
      organizationId: record.organizationId,
      applicationId: record.applicationId,
    };

    for (const metric of metrics) {
      switch (metric) {
        case 'api':
          result.api = {
            requests: record.apiRequests || 0,
            bandwidth: record.apiBandwidth || 0,
            errors: record.apiErrors || 0,
          };
          break;
        case 'storage':
          result.storage = {
            used: record.storageUsed || 0,
            files: record.fileCount || 0,
            bandwidth: record.storageBandwidth || 0,
          };
          break;
        case 'compute':
          result.compute = {
            cpu: record.cpuUsage || 0,
            memory: record.memoryUsage || 0,
            time: record.computeTime || 0,
          };
          break;
      }
    }

    return result;
  }

  /**
   * Aggregate processed data
   * @param {Object[]} data Processed data records
   * @param {string[]} metrics Metrics to aggregate
   * @return {Object[]} Aggregated data
   */
  aggregateData(data, metrics) {
    const aggregated = {};

    // Group by time period (daily)
    for (const record of data) {
      const date = new Date(record.timestamp).toISOString().split('T')[0];

      if (!aggregated[date]) {
        aggregated[date] = {
          date,
          organizations: new Set(),
          applications: new Set(),
          metrics: {},
        };
      }

      aggregated[date].organizations.add(record.organizationId);
      aggregated[date].applications.add(record.applicationId);

      // Aggregate metrics
      for (const metric of metrics) {
        if (!aggregated[date].metrics[metric]) {
          aggregated[date].metrics[metric] = this.initializeMetrics(metric);
        }
        this.aggregateMetrics(aggregated[date].metrics[metric], record[metric], metric);
      }
    }

    // Convert to array and finalize
    return Object.values(aggregated).map(day => ({
      date: day.date,
      organizations: day.organizations.size,
      applications: day.applications.size,
      metrics: day.metrics,
    }));
  }

  /**
   * Initialize metric aggregation object
   * @param {string} metric Metric type
   * @return {Object} Initial metric values
   */
  initializeMetrics(metric) {
    switch (metric) {
      case 'api':
        return {
          totalRequests: 0,
          totalBandwidth: 0,
          totalErrors: 0,
        };
      case 'storage':
        return {
          averageUsed: 0,
          totalFiles: 0,
          totalBandwidth: 0,
          samples: 0,
        };
      case 'compute':
        return {
          averageCpu: 0,
          averageMemory: 0,
          totalTime: 0,
          samples: 0,
        };
      default:
        return {};
    }
  }

  /**
   * Aggregate metrics from record
   * @param {Object} aggregate Current aggregate
   * @param {Object} metrics New metrics
   * @param {string} type Metric type
   */
  aggregateMetrics(aggregate, metrics, type) {
    if (!metrics) return;

    switch (type) {
      case 'api':
        aggregate.totalRequests += metrics.requests;
        aggregate.totalBandwidth += metrics.bandwidth;
        aggregate.totalErrors += metrics.errors;
        break;
      case 'storage':
        aggregate.averageUsed = this.updateAverage(
          aggregate.averageUsed,
          metrics.used,
          aggregate.samples
        );
        aggregate.totalFiles += metrics.files;
        aggregate.totalBandwidth += metrics.bandwidth;
        aggregate.samples++;
        break;
      case 'compute':
        aggregate.averageCpu = this.updateAverage(
          aggregate.averageCpu,
          metrics.cpu,
          aggregate.samples
        );
        aggregate.averageMemory = this.updateAverage(
          aggregate.averageMemory,
          metrics.memory,
          aggregate.samples
        );
        aggregate.totalTime += metrics.time;
        aggregate.samples++;
        break;
    }
  }

  /**
   * Update running average
   * @param {number} currentAvg Current average
   * @param {number} newValue New value
   * @param {number} sampleCount Sample count
   * @return {number} Updated average
   */
  updateAverage(currentAvg, newValue, sampleCount) {
    return (currentAvg * sampleCount + newValue) / (sampleCount + 1);
  }

  /**
   * Generate summary of aggregated data
   * @param {Object[]} data Aggregated data
   * @return {Object} Summary statistics
   */
  generateSummary(data) {
    const summary = {
      period: {
        start: data[0]?.date,
        end: data[data.length - 1]?.date,
      },
      organizations: {
        min: Infinity,
        max: -Infinity,
        average: 0,
      },
      applications: {
        min: Infinity,
        max: -Infinity,
        average: 0,
      },
      metrics: {},
    };

    let totalOrgs = 0;
    let totalApps = 0;

    for (const day of data) {
      // Update organization stats
      summary.organizations.min = Math.min(summary.organizations.min, day.organizations);
      summary.organizations.max = Math.max(summary.organizations.max, day.organizations);
      totalOrgs += day.organizations;

      // Update application stats
      summary.applications.min = Math.min(summary.applications.min, day.applications);
      summary.applications.max = Math.max(summary.applications.max, day.applications);
      totalApps += day.applications;

      // Aggregate metrics
      for (const [metric, values] of Object.entries(day.metrics)) {
        if (!summary.metrics[metric]) {
          summary.metrics[metric] = this.initializeSummaryMetrics(metric);
        }
        this.updateSummaryMetrics(summary.metrics[metric], values, metric);
      }
    }

    // Calculate averages
    const days = data.length;

    summary.organizations.average = totalOrgs / days;
    summary.applications.average = totalApps / days;

    // Finalize metric summaries
    for (const metricSummary of Object.values(summary.metrics)) {
      if (metricSummary.samples) {
        metricSummary.average = metricSummary.total / metricSummary.samples;
      }
    }

    return summary;
  }

  /**
   * Initialize summary metrics
   * @param {string} metric Metric type
   * @return {Object} Initial summary values
   */
  initializeSummaryMetrics(_metric) {
    return {
      total: 0,
      min: Infinity,
      max: -Infinity,
      average: 0,
      samples: 0,
    };
  }

  /**
   * Update summary metrics
   * @param {Object} summary Summary object
   * @param {Object} metrics Daily metrics
   * @param {string} type Metric type
   */
  updateSummaryMetrics(summary, metrics, type) {
    switch (type) {
      case 'api':
        summary.total += metrics.totalRequests;
        summary.min = Math.min(summary.min, metrics.totalRequests);
        summary.max = Math.max(summary.max, metrics.totalRequests);
        summary.samples++;
        break;
      case 'storage':
        summary.total += metrics.averageUsed;
        summary.min = Math.min(summary.min, metrics.averageUsed);
        summary.max = Math.max(summary.max, metrics.averageUsed);
        summary.samples++;
        break;
      case 'compute':
        summary.total += metrics.totalTime;
        summary.min = Math.min(summary.min, metrics.averageCpu);
        summary.max = Math.max(summary.max, metrics.averageCpu);
        summary.samples++;
        break;
    }
  }

  /**
   * Save aggregated data to file
   * @param {string} targetPath Output file path
   * @param {Object} data Aggregated data and summary
   */
  async saveAggregatedData(targetPath, data) {
    const content = JSON.stringify(data, null, 2);

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content, 'utf8');
  }
}

module.exports = new UsageDataAggregator();

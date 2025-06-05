/* eslint-disable no-case-declarations */
const { logger } = require('../utils/logger');
const { ReportError } = require('../utils/errors');
const { validateReport } = require('../utils/validation');
const UsageDataAggregator = require('../tools/usage-data-aggregator');

/**
 * Builds customizable analytics reports
 */
class ReportBuilder {
  constructor() {
    this.templates = new Map();
    this.schedules = new Map();
    this.formats = ['pdf', 'xlsx', 'json', 'csv'];
    this.aggregator = UsageDataAggregator;
  }

  /**
   * Register report template
   * @param {Object} options Template configuration
   * @param {string} options.name Template identifier
   * @param {string} options.title Report title
   * @param {Object[]} options.sections Report sections
   * @param {Object} options.parameters Configurable parameters
   * @param {Object} options.layout Layout configuration
   * @return {Promise<void>}
   */
  async registerTemplate(options) {
    const { name, title, sections, parameters = {}, layout = {} } = options;

    if (this.templates.has(name)) {
      throw new ReportError('TEMPLATE_EXISTS', `Template ${name} already exists`);
    }

    try {
      // Validate template
      await validateReport({
        title,
        sections,
        parameters,
        layout,
      });

      // Store template
      this.templates.set(name, {
        name,
        title,
        sections,
        parameters,
        layout,
        createdAt: new Date().toISOString(),
      });

      logger.info('Report template registered', { template: name });
    } catch (error) {
      logger.error('Failed to register report template', {
        template: name,
        error: error.message,
      });
      throw new ReportError('TEMPLATE_REGISTRATION_FAILED', error.message);
    }
  }

  /**
   * Generate report from template
   * @param {Object} options Report options
   * @param {string} options.template Template name
   * @param {Object} options.parameters Parameter values
   * @param {string} options.format Output format
   * @param {Object} options.customization Custom options
   * @return {Promise<Object>} Generated report
   */
  async generateReport(options) {
    const { template: templateName, parameters = {}, format = 'pdf', customization = {} } = options;

    const template = this.getTemplate(templateName);

    try {
      // Validate parameters
      this.validateParameters(template.parameters, parameters);

      // Validate format
      if (!this.formats.includes(format)) {
        throw new Error(`Unsupported format: ${format}`);
      }

      // Generate report sections
      const sections = await this.generateSections(template.sections, parameters);

      // Apply customization
      const customized = this.applyCustomization(sections, customization);

      // Format report
      const report = await this.formatReport({
        title: template.title,
        sections: customized,
        parameters,
        layout: template.layout,
        format,
      });

      logger.info('Report generated', {
        template: templateName,
        format,
      });

      return report;
    } catch (error) {
      logger.error('Report generation failed', {
        template: templateName,
        error: error.message,
      });
      throw new ReportError('GENERATION_FAILED', error.message);
    }
  }

  /**
   * Generate report sections
   * @param {Object[]} sections Section configurations
   * @param {Object} parameters Parameter values
   * @return {Promise<Object[]>} Generated sections
   */
  async generateSections(sections, parameters) {
    const generated = [];

    for (const section of sections) {
      const data = await this.generateSectionData(section, parameters);

      generated.push({
        ...section,
        data,
      });
    }

    return generated;
  }

  /**
   * Generate data for report section
   * @param {Object} section Section configuration
   * @param {Object} parameters Parameter values
   * @return {Promise<Object>} Section data
   */
  async generateSectionData(section, parameters) {
    const { type, query, options = {} } = section;

    // Apply parameter substitution to query
    const processedQuery = this.substituteParameters(query, parameters);

    switch (type) {
      case 'metrics':
        return this.aggregator.aggregate({
          ...processedQuery,
          ...options,
        });

      case 'chart':
        const data = await this.aggregator.aggregate(processedQuery);

        return this.formatChartData(data, options);

      case 'table':
        const records = await this.aggregator.aggregate(processedQuery);

        return this.formatTableData(records, options);

      case 'summary':
        const metrics = await this.aggregator.aggregate(processedQuery);

        return this.generateSummary(metrics, options);

      default:
        throw new Error(`Unsupported section type: ${type}`);
    }
  }

  /**
   * Format chart data
   * @param {Object} data Raw data
   * @param {Object} options Formatting options
   * @return {Object} Formatted chart data
   */
  formatChartData(data, options) {
    const { type, series, axes, aggregation = 'sum' } = options;

    return {
      type,
      series: series.map(s => ({
        name: s.name,
        data: this.aggregateSeriesData(data, s.metric, aggregation),
      })),
      axes,
    };
  }

  /**
   * Format table data
   * @param {Object} data Raw data
   * @param {Object} options Formatting options
   * @return {Object} Formatted table data
   */
  formatTableData(data, options) {
    const { columns, sorting, pagination } = options;

    let records = data.map(record =>
      columns.reduce(
        (row, col) => ({
          ...row,
          [col.key]: this.extractValue(record, col.path),
        }),
        {}
      )
    );

    // Apply sorting
    if (sorting) {
      records = this.sortRecords(records, sorting);
    }

    // Apply pagination
    if (pagination) {
      records = this.paginateRecords(records, pagination);
    }

    return {
      columns,
      records,
      total: data.length,
    };
  }

  /**
   * Generate summary from metrics
   * @param {Object} metrics Metrics data
   * @param {Object} options Summary options
   * @return {Object} Generated summary
   */
  generateSummary(metrics, options) {
    const { metrics: metricConfig, comparisons = [] } = options;
    const summary = {};

    // Calculate metric summaries
    for (const [key, config] of Object.entries(metricConfig)) {
      summary[key] = this.calculateMetricSummary(metrics, config);
    }

    // Add comparisons
    for (const comparison of comparisons) {
      summary[comparison.name] = this.calculateComparison(
        summary[comparison.metric1],
        summary[comparison.metric2],
        comparison.type
      );
    }

    return summary;
  }

  /**
   * Calculate metric summary
   * @param {Object} metrics Metrics data
   * @param {Object} config Metric configuration
   * @return {Object} Metric summary
   */
  calculateMetricSummary(metrics, config) {
    const values = this.extractMetricValues(metrics, config.path);

    return {
      total: values.reduce((sum, v) => sum + v, 0),
      average: values.reduce((sum, v) => sum + v, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      trend: this.calculateTrend(values),
    };
  }

  /**
   * Calculate comparison between metrics
   * @param {Object} metric1 First metric
   * @param {Object} metric2 Second metric
   * @param {string} type Comparison type
   * @return {Object} Comparison result
   */
  calculateComparison(metric1, metric2, type) {
    switch (type) {
      case 'difference':
        return metric1.total - metric2.total;
      case 'percentage':
        return (metric1.total / metric2.total) * 100;
      case 'ratio':
        return metric1.total / metric2.total;
      default:
        throw new Error(`Unsupported comparison type: ${type}`);
    }
  }

  /**
   * Schedule report generation
   * @param {Object} options Schedule configuration
   * @param {string} options.name Schedule identifier
   * @param {Object} options.report Report configuration
   * @param {string} options.schedule Cron expression
   * @param {Object} options.delivery Delivery configuration
   * @return {Promise<void>}
   */
  scheduleReport(options) {
    const { name, report, schedule, delivery } = options;

    if (this.schedules.has(name)) {
      throw new ReportError('SCHEDULE_EXISTS', `Schedule ${name} already exists`);
    }

    try {
      // Validate schedule
      this.validateSchedule(schedule);

      // Store schedule
      this.schedules.set(name, {
        name,
        report,
        schedule,
        delivery,
        status: 'active',
        lastRun: null,
        nextRun: this.calculateNextRun(schedule),
        createdAt: new Date().toISOString(),
      });

      logger.info('Report schedule created', { schedule: name });
    } catch (error) {
      logger.error('Failed to create report schedule', {
        schedule: name,
        error: error.message,
      });
      throw new ReportError('SCHEDULE_CREATION_FAILED', error.message);
    }
  }

  /**
   * Get report template
   * @param {string} name Template name
   * @return {Object} Template configuration
   */
  getTemplate(name) {
    const template = this.templates.get(name);

    if (!template) {
      throw new ReportError('TEMPLATE_NOT_FOUND', `Template ${name} not found`);
    }

    return template;
  }

  /**
   * List report templates
   * @return {Object[]} List of templates
   */
  listTemplates() {
    return Array.from(this.templates.values());
  }

  /**
   * List report schedules
   * @return {Object[]} List of schedules
   */
  listSchedules() {
    return Array.from(this.schedules.values());
  }

  /**
   * Remove report template
   * @param {string} name Template name
   * @return {boolean} Whether template was removed
   */
  removeTemplate(name) {
    return this.templates.delete(name);
  }

  /**
   * Remove report schedule
   * @param {string} name Schedule name
   * @return {boolean} Whether schedule was removed
   */
  removeSchedule(name) {
    return this.schedules.delete(name);
  }

  /**
   * Helper methods
   */

  validateParameters(schema, values) {
    for (const [key, config] of Object.entries(schema)) {
      if (config.required && values[key] === undefined) {
        throw new Error(`Missing required parameter: ${key}`);
      }
      if (values[key] !== undefined && config.validate) {
        config.validate(values[key]);
      }
    }
  }

  substituteParameters(query, parameters) {
    const queryStr = JSON.stringify(query);

    return JSON.parse(queryStr.replace(/\${(\w+)}/g, (_, key) => parameters[key]));
  }

  extractValue(obj, path) {
    return path.split('.').reduce((o, k) => o?.[k], obj);
  }

  sortRecords(records, sorting) {
    const { field, order = 'asc' } = sorting;

    return [...records].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];

      return order === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }

  paginateRecords(records, pagination) {
    const { page = 1, pageSize = 10 } = pagination;
    const start = (page - 1) * pageSize;

    return records.slice(start, start + pageSize);
  }

  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / first) * 100;

    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';

    return 'stable';
  }

  validateSchedule(schedule) {
    // Basic cron validation - could be more comprehensive
    const parts = schedule.split(' ');

    if (parts.length !== 5) {
      throw new Error('Invalid cron schedule format');
    }
  }

  calculateNextRun(_schedule) {
    // Basic next run calculation - could use a cron parser library
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }
}

module.exports = new ReportBuilder();

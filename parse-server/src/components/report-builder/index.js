/**
 * Report Builder
 * Export all report builder components and utilities
 */

// Main components
export { ReportBuilder } from './ReportBuilder';
export { ChartComponent } from './ChartComponent';
export { TableComponent } from './TableComponent';
export { FilterComponent } from './FilterComponent';
export { Toolbox } from './Toolbox';
export { PropertiesPanel } from './PropertiesPanel';

// Hooks
export { useReportState } from './hooks/useReportState';

// Theme
export { theme } from './theme';

// Types
export const ComponentTypes = {
  CHART: 'chart',
  TABLE: 'table',
  FILTER: 'filter',
  TEXT: 'text',
  IMAGE: 'image',
};

export const ChartTypes = {
  LINE: 'line',
  BAR: 'bar',
  PIE: 'pie',
  AREA: 'area',
  SCATTER: 'scatter',
};

export const FilterTypes = {
  SELECT: 'select',
  MULTI_SELECT: 'multiSelect',
  DATE: 'date',
  DATE_RANGE: 'dateRange',
  TEXT: 'text',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
};

// Default configurations
export const defaultConfig = {
  components: {
    charts: true,
    tables: true,
    filters: true,
    text: true,
    image: true,
  },
  theme: 'light',
  export: ['pdf', 'excel'],
};

// Component default props
export const defaultProps = {
  chart: {
    type: ChartTypes.LINE,
    colorScheme: 'default',
    showLegend: true,
    showGrid: true,
    height: 300,
  },
  table: {
    pagination: true,
    sortable: true,
    filterable: true,
    pageSize: 10,
  },
  filter: {
    type: FilterTypes.SELECT,
    multiple: false,
  },
};

// Utility functions
export const utils = {
  /**
   * Generate unique component ID
   * @param {string} type - Component type
   * @returns {string} Unique ID
   */
  generateComponentId: type => `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

  /**
   * Create default component config
   * @param {string} type - Component type
   * @returns {Object} Default configuration
   */
  createDefaultConfig: type => ({
    ...defaultProps[type],
    id: utils.generateComponentId(type),
    title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
  }),

  /**
   * Validate component configuration
   * @param {Object} config - Component configuration
   * @param {string} type - Component type
   * @returns {boolean} Is valid configuration
   */
  validateConfig: (config, type) => {
    switch (type) {
      case ComponentTypes.CHART:
        return config.type && config.xAxis && config.yAxis;
      case ComponentTypes.TABLE:
        return Array.isArray(config.columns) && config.columns.length > 0;
      case ComponentTypes.FILTER:
        return config.type && config.field;
      default:
        return true;
    }
  },

  /**
   * Format data for chart display
   * @param {Array} data - Raw data
   * @param {Object} config - Chart configuration
   * @returns {Array} Formatted data
   */
  formatChartData: (data, config) => {
    if (!Array.isArray(data)) return [];
    return data.map(item => ({
      [config.xAxis]: item[config.xAxis],
      [config.yAxis]: Number(item[config.yAxis]),
    }));
  },

  /**
   * Format data for table display
   * @param {Array} data - Raw data
   * @param {Array} columns - Column configuration
   * @returns {Array} Formatted data
   */
  formatTableData: (data, columns) => {
    if (!Array.isArray(data)) return [];
    return data.map(item =>
      columns.reduce((acc, col) => {
        acc[col.field] = item[col.field];
        return acc;
      }, {})
    );
  },
};

// Export default configuration
export default {
  ComponentTypes,
  ChartTypes,
  FilterTypes,
  defaultConfig,
  defaultProps,
  utils,
};

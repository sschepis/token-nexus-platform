import { BasePageController } from './base/BasePageController';
import {
  ActionDefinition,
  ActionContext,
  ActionResult
} from './types/ActionTypes';
import { callCloudFunction } from '@/utils/apiUtils';

/**
 * Reports Page Controller - Manages reports and analytics functionality
 * Follows the standardized controller pattern from PAGES.md
 */
export class ReportsPageController extends BasePageController {
  constructor() {
    super({
      pageId: 'reports',
      pageName: 'Reports & Analytics',
      description: 'Generate and manage custom reports and analytics with AI assistant integration',
      category: 'analytics',
      tags: ['reports', 'analytics', 'data', 'visualization', 'metrics'],
      permissions: ['reports:read', 'reports:write', 'analytics:read', 'analytics:write', 'system:admin'],
      version: '1.0.0'
    });
  }

  protected initializeActions(): void {
    this.registerFetchReportsAction();
    this.registerFetchMetricsAction();
    this.registerGenerateReportAction();
    this.registerCreateReportAction();
    this.registerRunReportAction();
    this.registerUpdateReportAction();
    this.registerDeleteReportAction();
    this.registerGetReportCategoriesAction();
  }

  private registerFetchReportsAction(): void {
    this.registerAction(
      {
        id: 'fetchReports',
        name: 'Fetch Reports',
        description: 'Get all available reports with filtering options',
        category: 'data',
        permissions: ['reports:read'],
        parameters: [
          { name: 'category', type: 'string', required: false, description: 'Filter by report category' },
          { name: 'searchTerm', type: 'string', required: false, description: 'Search term for report names' },
          { name: 'includeInactive', type: 'boolean', required: false, description: 'Include inactive reports' },
          { name: 'createdBy', type: 'string', required: false, description: 'Filter by report creator' }
        ]
      },
      async (params, context) => {
        const orgValidation = this.validateOrganizationContext(context);
        if (!orgValidation.success) {
          throw new Error(orgValidation.error);
        }

        const { category, searchTerm, includeInactive = false, createdBy } = params;
        const orgId = this.getOrganizationId(context);

        try {
          const response = await callCloudFunction('getReports', {
            organizationId: orgId,
            category: category as string,
            searchTerm: searchTerm as string,
            includeInactive: includeInactive as boolean,
            createdBy: createdBy as string
          });

          if (!response.success) {
            throw new Error(response.error || 'Failed to fetch reports');
          }

          const reports = (response as any).reports || [];
          return { reports, count: reports.length };
        } catch (error) {
          throw new Error(`Failed to fetch reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    );
  }

  private registerFetchMetricsAction(): void {
    this.registerAction(
      {
        id: 'fetchMetrics',
        name: 'Fetch Analytics Metrics',
        description: 'Get analytics metrics and chart data for the specified time range',
        category: 'data',
        permissions: ['analytics:read'],
        parameters: [
          { name: 'timeRange', type: 'string', required: false, description: 'Time range for metrics (7d, 30d, 90d, 1y)' },
          { name: 'organizationId', type: 'string', required: false, description: 'Organization ID for filtering' }
        ]
      },
      async (params, context) => {
        const orgValidation = this.validateOrganizationContext(context);
        if (!orgValidation.success) {
          throw new Error(orgValidation.error);
        }

        const { timeRange = '30d', organizationId } = params;
        const orgId = organizationId || this.getOrganizationId(context);

        try {
          const response = await callCloudFunction('fetchMetrics', {
            timeRange: timeRange as string,
            organizationId: orgId
          });

          if (!response.success) {
            throw new Error(response.error || 'Failed to fetch metrics');
          }

          return response.data || {};
        } catch (error) {
          throw new Error(`Failed to fetch metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    );
  }

  private registerGenerateReportAction(): void {
    this.registerAction(
      {
        id: 'generateReport',
        name: 'Generate Report',
        description: 'Generate a new report with specified parameters and format',
        category: 'data',
        permissions: ['reports:write'],
        parameters: [
          { name: 'type', type: 'string', required: true, description: 'Report type (user_activity, token_usage, security_events, organization_summary)' },
          { name: 'format', type: 'string', required: true, description: 'Output format (json, csv, pdf)' },
          { name: 'title', type: 'string', required: false, description: 'Report title' },
          { name: 'startDate', type: 'string', required: false, description: 'Start date (YYYY-MM-DD)' },
          { name: 'endDate', type: 'string', required: false, description: 'End date (YYYY-MM-DD)' },
          { name: 'filters', type: 'object', required: false, description: 'Additional filters' }
        ]
      },
      async (params, context) => {
        const orgValidation = this.validateOrganizationContext(context);
        if (!orgValidation.success) {
          throw new Error(orgValidation.error);
        }

        const { type, format, title, startDate, endDate, filters = {} } = params;
        const orgId = this.getOrganizationId(context);

        try {
          const response = await callCloudFunction('generateReport', {
            type: type as string,
            format: format as string,
            title: title as string,
            startDate: startDate as string,
            endDate: endDate as string,
            filters: filters as object,
            organizationId: orgId
          });

          if (!response.success) {
            throw new Error(response.error || 'Failed to generate report');
          }

          return response.data || {};
        } catch (error) {
          throw new Error(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    );
  }

  private registerCreateReportAction(): void {
    this.registerAction(
      {
        id: 'createReport',
        name: 'Create Report',
        description: 'Create a new custom report with data sources and visualizations',
        category: 'data',
        permissions: ['reports:write'],
        parameters: [
          { name: 'name', type: 'string', required: true, description: 'Report name' },
          { name: 'description', type: 'string', required: false, description: 'Report description' },
          { name: 'category', type: 'string', required: true, description: 'Report category' },
          { name: 'dataSource', type: 'object', required: true, description: 'Data source configuration' },
          { name: 'visualization', type: 'object', required: true, description: 'Visualization configuration' },
          { name: 'filters', type: 'array', required: false, description: 'Default filters' },
          { name: 'schedule', type: 'object', required: false, description: 'Report schedule configuration' },
          { name: 'isPublic', type: 'boolean', required: false, description: 'Make report public' }
        ]
      },
      async (params, context) => {
        const orgValidation = this.validateOrganizationContext(context);
        if (!orgValidation.success) {
          throw new Error(orgValidation.error);
        }

        const { 
          name, 
          description, 
          category, 
          dataSource, 
          visualization, 
          filters = [], 
          schedule,
          isPublic = false 
        } = params;
        const orgId = this.getOrganizationId(context);

        try {
          const response = await callCloudFunction('createReport', {
            name: name as string,
            description: description as string,
            category: category as string,
            dataSource: dataSource as object,
            visualization: visualization as object,
            filters: filters as any[],
            schedule: schedule as object,
            isPublic: isPublic as boolean,
            organizationId: orgId,
            createdBy: context.user.userId
          });

          if (!response.success) {
            throw new Error(response.error || 'Failed to create report');
          }

          return response.data || {};
        } catch (error) {
          throw new Error(`Failed to create report: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    );
  }

  private registerRunReportAction(): void {
    this.registerAction(
      {
        id: 'runReport',
        name: 'Run Report',
        description: 'Execute a report and generate results',
        category: 'data',
        permissions: ['reports:read'],
        parameters: [
          { name: 'reportId', type: 'string', required: true, description: 'Report ID to run' },
          { name: 'parameters', type: 'object', required: false, description: 'Runtime parameters' },
          { name: 'format', type: 'string', required: false, description: 'Output format (json, csv, pdf)' }
        ]
      },
      async (params, context) => {
        const orgValidation = this.validateOrganizationContext(context);
        if (!orgValidation.success) {
          throw new Error(orgValidation.error);
        }

        const { reportId, parameters = {}, format = 'json' } = params;
        const orgId = this.getOrganizationId(context);

        try {
          const response = await callCloudFunction('runReport', {
            reportId: reportId as string,
            parameters: parameters as object,
            format: format as string,
            organizationId: orgId
          });

          if (!response.success) {
            throw new Error(response.error || 'Failed to run report');
          }

          return response.data || {};
        } catch (error) {
          throw new Error(`Failed to run report: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    );
  }

  private registerUpdateReportAction(): void {
    this.registerAction(
      {
        id: 'updateReport',
        name: 'Update Report',
        description: 'Update an existing report configuration',
        category: 'data',
        permissions: ['reports:write'],
        parameters: [
          { name: 'reportId', type: 'string', required: true, description: 'Report ID to update' },
          { name: 'name', type: 'string', required: false, description: 'Report name' },
          { name: 'description', type: 'string', required: false, description: 'Report description' },
          { name: 'dataSource', type: 'object', required: false, description: 'Data source configuration' },
          { name: 'visualization', type: 'object', required: false, description: 'Visualization configuration' },
          { name: 'filters', type: 'array', required: false, description: 'Default filters' },
          { name: 'schedule', type: 'object', required: false, description: 'Report schedule configuration' },
          { name: 'isActive', type: 'boolean', required: false, description: 'Report active status' }
        ]
      },
      async (params, context) => {
        const orgValidation = this.validateOrganizationContext(context);
        if (!orgValidation.success) {
          throw new Error(orgValidation.error);
        }

        const { reportId, ...updateData } = params;
        const orgId = this.getOrganizationId(context);

        try {
          const response = await callCloudFunction('updateReport', {
            reportId: reportId as string,
            organizationId: orgId,
            updatedBy: context.user.userId,
            ...updateData
          });

          if (!response.success) {
            throw new Error(response.error || 'Failed to update report');
          }

          return response.data || {};
        } catch (error) {
          throw new Error(`Failed to update report: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    );
  }

  private registerDeleteReportAction(): void {
    this.registerAction(
      {
        id: 'deleteReport',
        name: 'Delete Report',
        description: 'Delete a report from the system',
        category: 'data',
        permissions: ['reports:write'],
        parameters: [
          { name: 'reportId', type: 'string', required: true, description: 'Report ID to delete' },
          { name: 'confirmDelete', type: 'boolean', required: true, description: 'Confirmation flag for deletion' }
        ]
      },
      async (params, context) => {
        const orgValidation = this.validateOrganizationContext(context);
        if (!orgValidation.success) {
          throw new Error(orgValidation.error);
        }

        const { reportId, confirmDelete } = params;

        if (!confirmDelete) {
          throw new Error('Delete confirmation is required');
        }

        const orgId = this.getOrganizationId(context);

        try {
          const response = await callCloudFunction('deleteReport', {
            reportId: reportId as string,
            organizationId: orgId,
            confirmDelete: confirmDelete as boolean
          });

          if (!response.success) {
            throw new Error(response.error || 'Failed to delete report');
          }

          return { deletedReportId: reportId };
        } catch (error) {
          throw new Error(`Failed to delete report: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    );
  }

  private registerGetReportCategoriesAction(): void {
    this.registerAction(
      {
        id: 'getReportCategories',
        name: 'Get Report Categories',
        description: 'Get all available report categories',
        category: 'data',
        permissions: ['reports:read'],
        parameters: []
      },
      async (params, context) => {
        const orgValidation = this.validateOrganizationContext(context);
        if (!orgValidation.success) {
          throw new Error(orgValidation.error);
        }

        const orgId = this.getOrganizationId(context);

        try {
          const response = await callCloudFunction('getReportCategories', {
            organizationId: orgId
          });

          if (!response.success) {
            throw new Error(response.error || 'Failed to get report categories');
          }

          const categories = (response as any).categories || [];
          return { categories, count: categories.length };
        } catch (error) {
          throw new Error(`Failed to get report categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    );
  }
}

// Export singleton instance
export const reportsPageController = new ReportsPageController();
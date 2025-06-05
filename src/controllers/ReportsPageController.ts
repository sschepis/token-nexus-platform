import {
  PageController,
  ActionDefinition,
  ActionContext,
  ActionResult,
  PageContext
} from './types/ActionTypes';

export class ReportsPageController implements PageController {
  pageId = 'reports';
  pageName = 'Reports';
  description = 'Generate and manage custom reports and analytics';
  actions = new Map<string, ActionDefinition>();
  context: PageContext = {
    pageId: 'reports',
    pageName: 'Reports',
    state: {},
    props: {},
    metadata: {
      category: 'analytics',
      tags: ['reports', 'analytics', 'data', 'visualization'],
      permissions: ['reports:read', 'reports:write', 'analytics:read']
    }
  };
  metadata = {
    category: 'analytics',
    tags: ['reports', 'analytics', 'data', 'visualization'],
    permissions: ['reports:read', 'reports:write', 'analytics:read'],
    version: '1.0.0'
  };
  isActive = true;
  registeredAt = new Date();

  constructor() {
    this.initializeActions();
  }

  private initializeActions(): void {
    // Fetch Reports Action
    this.actions.set('fetchReports', {
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
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { category, searchTerm, includeInactive = false, createdBy } = params;
          const orgId = context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to fetch reports',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'fetchReports',
                userId: context.user.userId
              }
            };
          }

          const query = new Parse.Query('Report');
          query.equalTo('organizationId', orgId);

          if (!includeInactive) {
            query.equalTo('isActive', true);
          }

          if (category) {
            query.equalTo('category', category);
          }

          if (searchTerm) {
            query.contains('name', searchTerm.toString());
          }

          if (createdBy) {
            query.equalTo('createdBy', createdBy);
          }

          query.descending('updatedAt');
          const reports = await query.find();
          const reportData = reports.map(report => report.toJSON());

          return {
            success: true,
            data: { reports: reportData },
            message: `Found ${reportData.length} reports`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'fetchReports',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch reports',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'fetchReports',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Create Report Action
    this.actions.set('createReport', {
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
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
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
          const orgId = context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to create report',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'createReport',
                userId: context.user.userId
              }
            };
          }

          const Report = Parse.Object.extend('Report');
          const report = new Report();

          report.set('name', name);
          report.set('description', description || '');
          report.set('category', category);
          report.set('dataSource', dataSource);
          report.set('visualization', visualization);
          report.set('filters', filters);
          report.set('schedule', schedule || null);
          report.set('isPublic', isPublic);
          report.set('organizationId', orgId);
          report.set('createdBy', context.user.userId);
          report.set('isActive', true);
          report.set('runCount', 0);
          report.set('lastRun', null);

          const savedReport = await report.save();

          return {
            success: true,
            data: { report: savedReport.toJSON() },
            message: `Report "${name}" created successfully`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'createReport',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create report',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'createReport',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Run Report Action
    this.actions.set('runReport', {
      id: 'runReport',
      name: 'Run Report',
      description: 'Execute a report and generate results',
      category: 'data',
      permissions: ['reports:read'],
      parameters: [
        { name: 'reportId', type: 'string', required: true, description: 'Report ID to run' },
        { name: 'parameters', type: 'object', required: false, description: 'Runtime parameters' },
        { name: 'format', type: 'string', required: false, description: 'Output format (json, csv, pdf)' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { reportId, parameters = {}, format = 'json' } = params;
          const orgId = context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to run report',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'runReport',
                userId: context.user.userId
              }
            };
          }

          const query = new Parse.Query('Report');
          query.equalTo('objectId', reportId);
          query.equalTo('organizationId', orgId);

          const report = await query.first();
          if (!report) {
            return {
              success: false,
              error: 'Report not found',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'runReport',
                userId: context.user.userId
              }
            };
          }

          const dataSource = report.get('dataSource');
          const visualization = report.get('visualization');
          
          // Execute the report based on data source configuration
          let reportData;
          if (dataSource.type === 'parse_query') {
            const dataQuery = new Parse.Query(dataSource.className);
            
            // Apply organization filter
            dataQuery.equalTo('organizationId', orgId);
            
            // Apply filters from report configuration
            const filters = report.get('filters') || [];
            filters.forEach((filter: any) => {
              if (filter.field && filter.operator && filter.value !== undefined) {
                switch (filter.operator) {
                  case 'equals':
                    dataQuery.equalTo(filter.field, filter.value);
                    break;
                  case 'contains':
                    dataQuery.contains(filter.field, filter.value);
                    break;
                  case 'greaterThan':
                    dataQuery.greaterThan(filter.field, filter.value);
                    break;
                  case 'lessThan':
                    dataQuery.lessThan(filter.field, filter.value);
                    break;
                }
              }
            });

            // Apply runtime parameters
            Object.entries(parameters as Record<string, any>).forEach(([key, value]) => {
              if (value !== undefined) {
                dataQuery.equalTo(key, value);
              }
            });

            const results = await dataQuery.find();
            reportData = results.map(result => result.toJSON());
          } else {
            // Handle other data source types
            reportData = [];
          }

          // Update report run statistics
          report.increment('runCount');
          report.set('lastRun', new Date());
          await report.save();

          return {
            success: true,
            data: { 
              reportData,
              visualization,
              format,
              runAt: new Date(),
              recordCount: reportData.length
            },
            message: `Report executed successfully with ${reportData.length} records`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'runReport',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to run report',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'runReport',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Update Report Action
    this.actions.set('updateReport', {
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
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { reportId, ...updateData } = params;
          const orgId = context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to update report',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'updateReport',
                userId: context.user.userId
              }
            };
          }

          const query = new Parse.Query('Report');
          query.equalTo('objectId', reportId);
          query.equalTo('organizationId', orgId);

          const report = await query.first();
          if (!report) {
            return {
              success: false,
              error: 'Report not found',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'updateReport',
                userId: context.user.userId
              }
            };
          }

          // Update fields
          Object.entries(updateData).forEach(([key, value]) => {
            if (value !== undefined) {
              report.set(key, value);
            }
          });

          report.set('updatedBy', context.user.userId);
          const savedReport = await report.save();

          return {
            success: true,
            data: { report: savedReport.toJSON() },
            message: 'Report updated successfully',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'updateReport',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update report',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'updateReport',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Delete Report Action
    this.actions.set('deleteReport', {
      id: 'deleteReport',
      name: 'Delete Report',
      description: 'Delete a report from the system',
      category: 'data',
      permissions: ['reports:write'],
      parameters: [
        { name: 'reportId', type: 'string', required: true, description: 'Report ID to delete' },
        { name: 'confirmDelete', type: 'boolean', required: true, description: 'Confirmation flag for deletion' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { reportId, confirmDelete } = params;

          if (!confirmDelete) {
            return {
              success: false,
              error: 'Delete confirmation is required',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'deleteReport',
                userId: context.user.userId
              }
            };
          }

          const orgId = context.user.organizationId || context.organization?.id;
          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to delete report',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'deleteReport',
                userId: context.user.userId
              }
            };
          }

          const query = new Parse.Query('Report');
          query.equalTo('objectId', reportId);
          query.equalTo('organizationId', orgId);

          const report = await query.first();
          if (!report) {
            return {
              success: false,
              error: 'Report not found',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'deleteReport',
                userId: context.user.userId
              }
            };
          }

          await report.destroy();

          return {
            success: true,
            data: { deletedReportId: reportId },
            message: 'Report deleted successfully',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'deleteReport',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete report',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'deleteReport',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Get Report Categories Action
    this.actions.set('getReportCategories', {
      id: 'getReportCategories',
      name: 'Get Report Categories',
      description: 'Get all available report categories',
      category: 'data',
      permissions: ['reports:read'],
      parameters: [],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const orgId = context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to get categories',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'getReportCategories',
                userId: context.user.userId
              }
            };
          }

          const query = new Parse.Query('Report');
          query.equalTo('organizationId', orgId);
          query.select('category');

          const reports = await query.find();
          const categorySet = new Set(reports.map(r => r.get('category')).filter(Boolean));
          const categories = Array.from(categorySet);

          return {
            success: true,
            data: { categories },
            message: `Found ${categories.length} categories`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getReportCategories',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get report categories',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getReportCategories',
              userId: context.user.userId
            }
          };
        }
      }
    });
  }
}

// Export singleton instance
export const reportsPageController = new ReportsPageController();
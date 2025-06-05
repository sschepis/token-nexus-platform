import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import Parse from 'parse';

export const createReportAction: ActionDefinition = {
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
};
import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { createParseObject } from '../../../utils/parseUtils';

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

      // Create report using utility function
      const savedReport = await createParseObject('Report', {
        name,
        description: description || '',
        category,
        dataSource,
        visualization,
        filters,
        schedule: schedule || null,
        isPublic,
        organizationId: orgId,
        createdBy: context.user.userId,
        isActive: true,
        runCount: 0,
        lastRun: null
      });

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
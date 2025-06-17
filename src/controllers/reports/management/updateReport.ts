import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { updateParseObject } from '../../../utils/parseUtils';

export const updateReportAction: ActionDefinition = {
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

      // Update report using utility function with security filters
      const savedReport = await updateParseObject(
        'Report',
        reportId as string,
        {
          ...updateData,
          updatedBy: context.user.userId
        },
        { organizationId: orgId } // Security filter
      );

      if (!savedReport) {
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
};
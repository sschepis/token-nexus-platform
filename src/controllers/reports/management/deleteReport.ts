import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { deleteParseObject } from '../../../utils/parseUtils';

export const deleteReportAction: ActionDefinition = {
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

      // Delete report using utility function with security filters
      const deleted = await deleteParseObject(
        'Report',
        reportId as string,
        { organizationId: orgId } // Security filter
      );

      if (!deleted) {
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
};
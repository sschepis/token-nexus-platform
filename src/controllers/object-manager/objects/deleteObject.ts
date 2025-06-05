import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { objectManagerService } from '@/services/objectManagerService';

export const deleteObjectAction: ActionDefinition = {
  id: 'deleteObject',
  name: 'Delete Object',
  description: 'Delete a custom object and all its data',
  category: 'data',
  permissions: ['objects:write'],
  parameters: [
    { name: 'objectId', type: 'string', required: true, description: 'Object ID to delete' },
    { name: 'confirmDelete', type: 'boolean', required: true, description: 'Confirmation flag for deletion' }
  ],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const { objectId, confirmDelete } = params;

      if (!objectId || !confirmDelete) {
        return {
          success: false,
          error: 'Object ID and confirmation are required',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'deleteObject',
            userId: context.user.userId
          }
        };
      }

      await objectManagerService.deleteObject(objectId as string, confirmDelete as boolean);

      return {
        success: true,
        data: { objectId },
        message: `Object ${objectId} and all its records deleted successfully`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'deleteObject',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete object',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'deleteObject',
          userId: context.user.userId
        }
      };
    }
  }
};
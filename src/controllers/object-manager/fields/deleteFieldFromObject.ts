import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { objectManagerService } from '@/services/objectManagerService';

export const deleteFieldFromObjectAction: ActionDefinition = {
  id: 'deleteFieldFromObject',
  name: 'Delete Field from Object',
  description: 'Deletes a field from an existing custom object',
  category: 'data',
  permissions: ['objects:write'],
  parameters: [
    { name: 'objectApiName', type: 'string', required: true, description: 'API name of the object containing the field' },
    { name: 'fieldApiName', type: 'string', required: true, description: 'API name of the field to delete' }
  ],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    let objectApiName: string | undefined;
    let fieldApiName: string | undefined;
    try {
      const { objectApiName: extractedObjectApiName, fieldApiName: extractedFieldApiName } = params;
      objectApiName = extractedObjectApiName as string;
      fieldApiName = extractedFieldApiName as string;

      if (!objectApiName || !fieldApiName) {
        return {
          success: false,
          error: 'Object API name and field API name are required',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'deleteFieldFromObject',
            userId: context.user.userId
          }
        };
      }

      await objectManagerService.deleteFieldFromObject(objectApiName as string, fieldApiName as string);

      return {
        success: true,
        message: `Field "${fieldApiName}" deleted from object "${objectApiName}" successfully`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'deleteFieldFromObject',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to delete field "${fieldApiName as string}" from object "${objectApiName as string}"`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'deleteFieldFromObject',
          userId: context.user.userId
        }
      };
    }
  }
};
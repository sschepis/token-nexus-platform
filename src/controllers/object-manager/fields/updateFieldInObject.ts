import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { CustomField } from '@/types/object-manager';
import { objectManagerService } from '@/services/objectManagerService';

export const updateFieldInObjectAction: ActionDefinition = {
  id: 'updateFieldInObject',
  name: 'Update Field in Object',
  description: 'Updates an existing field in a custom object',
  category: 'data',
  permissions: ['objects:write'],
  parameters: [
    { name: 'objectApiName', type: 'string', required: true, description: 'API name of the object containing the field' },
    { name: 'fieldApiName', type: 'string', required: true, description: 'API name of the field to update' },
    { name: 'updates', type: 'object', required: true, description: 'Updates to apply to the field (e.g., newType, newLabel)' }
  ],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    let objectApiName: string | undefined;
    let fieldApiName: string | undefined;
    try {
      const { objectApiName: extractedObjectApiName, fieldApiName: extractedFieldApiName, updates } = params;
      objectApiName = extractedObjectApiName as string;
      fieldApiName = extractedFieldApiName as string;

      if (!objectApiName || !fieldApiName || !updates) {
        return {
          success: false,
          error: 'Object API name, field API name, and updates are required',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'updateFieldInObject',
            userId: context.user.userId
          }
        };
      }

      await objectManagerService.updateFieldInObject(objectApiName as string, fieldApiName as string, updates as Partial<CustomField>);

      return {
        success: true,
        message: `Field ${fieldApiName} in object ${objectApiName} updated successfully`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'updateFieldInObject',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to update field ${fieldApiName} in object ${objectApiName}`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'updateFieldInObject',
          userId: context.user.userId
        }
      };
    }
  }
};
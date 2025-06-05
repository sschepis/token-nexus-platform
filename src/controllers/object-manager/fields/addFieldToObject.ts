import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { CustomField } from '@/types/object-manager';
import { objectManagerService } from '@/services/objectManagerService';

export const addFieldToObjectAction: ActionDefinition = {
  id: 'addFieldToObject',
  name: 'Add Field to Object',
  description: 'Adds a new field to an existing custom object',
  category: 'data',
  permissions: ['objects:write'],
  parameters: [
    { name: 'objectApiName', type: 'string', required: true, description: 'API name of the object to add field to' },
    { name: 'fieldApiName', type: 'string', required: true, description: 'API name for the new field' },
    { name: 'fieldType', type: 'string', required: true, description: 'Data type of the new field (e.g., String, Number, Boolean)' },
    { name: 'options', type: 'object', required: false, description: 'Additional field options (e.g., required, defaultValue)' }
  ],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const { objectApiName, fieldApiName, fieldType, options = {} } = params;

      if (!objectApiName || !fieldApiName || !fieldType) {
        return {
          success: false,
          error: 'Object API name, field API name, and field type are required',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'addFieldToObject',
            userId: context.user.userId
          }
        };
      }

      const newField: CustomField = {
        id: `${objectApiName}_${fieldApiName}`,
        apiName: fieldApiName as string,
        label: (options as any).label || fieldApiName as string,
        type: fieldType as string,
        required: (options as any).required || false,
        description: (options as any).description || `${fieldType} field`,
        ...(fieldType === 'Pointer' && (options as any).targetClass ? { targetClass: (options as any).targetClass } : {})
      };

      await objectManagerService.addFieldToObject(objectApiName as string, newField);

      return {
        success: true,
        message: `Field ${fieldApiName} added to object ${objectApiName} successfully`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'addFieldToObject',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to add field ${params.fieldApiName} to object ${params.objectApiName}`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'addFieldToObject',
          userId: context.user.userId
        }
      };
    }
  }
};
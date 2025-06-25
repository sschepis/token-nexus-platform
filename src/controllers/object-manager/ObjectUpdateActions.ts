import { ActionDefinition } from '../types/actionDefinitions';
import { ActionContext } from '../types/actionContexts';
import { ActionResult } from '../types/actionResults';
import { CustomField, CustomObject } from '@/types/object-manager';
import { objectManagerApi } from '@/services/api';
import { ObjectManagerPageController } from '../ObjectManagerPageController';

/**
 * Registers actions related to updating objects, records, and fields.
 * @param controller The ObjectManagerPageController instance.
 */
export function registerObjectUpdateActions(controller: ObjectManagerPageController): void {
  // Update Record Action
  controller.actions.set('updateRecord', {
    id: 'updateRecord',
    name: 'Update Record',
    description: 'Update an existing record in the specified object',
    category: 'data',
    permissions: ['records:write'],
    parameters: [
      { name: 'objectApiName', type: 'string', required: true, description: 'Object API name where the record exists' },
      { name: 'recordId', type: 'string', required: true, description: 'ID of the record to update' },
      { name: 'recordData', type: 'object', required: true, description: 'Partial record data to update' }
    ],
    execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
      let recordId: string | undefined;
      try {
        const { objectApiName, recordId: extractedRecordId, recordData } = params;
        recordId = extractedRecordId as string;

        if (!objectApiName || !recordId || !recordData) {
          return {
            success: false,
            error: 'Object API name, record ID, and record data are required',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'updateRecord',
              userId: context.user.userId
            }
          };
        }

        const orgId = context.user.organizationId || context.organization?.id;
        if (!orgId) {
          return {
            success: false,
            error: 'Organization ID is required to update a record',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'updateRecord',
              userId: context.user.userId
            }
          };
        }

        const response = await objectManagerApi.updateRecord({
          orgId,
          objectApiName: objectApiName as string,
          recordId: recordId as string,
          updates: recordData as Record<string, any>
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to update record');
        }

        const updatedRecord = response.data;

        return {
          success: true,
          data: { record: updatedRecord },
          message: `Record ${recordId} updated successfully in ${objectApiName}`,
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'updateRecord',
            userId: context.user.userId
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : `Failed to update record ${recordId}`,
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'updateRecord',
            userId: context.user.userId
          }
        };
      }
    }
  });

  // Add Field To Object Action
  controller.actions.set('addFieldToObject', {
    id: 'addFieldToObject',
    name: 'Add Field To Object',
    description: 'Add a new field to an existing custom object',
    category: 'data',
    permissions: ['objects:write'],
    parameters: [
      { name: 'objectApiName', type: 'string', required: true, description: 'API name of the object to add field to' },
      { name: 'field', type: 'object', required: true, description: 'Field definition (apiName, label, type, etc.)' }
    ],
    execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
      let objectApiName: string | undefined;
      let fieldApiName: string | undefined;
      try {
        const { objectApiName: extractedObjectApiName, field } = params;
        objectApiName = extractedObjectApiName as string;
        fieldApiName = (field as CustomField)?.apiName;

        if (!objectApiName || !field) {
          return {
            success: false,
            error: 'Object API name and field definition are required',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'addFieldToObject',
              userId: context.user.userId
            }
          };
        }

        const orgId = context.user.organizationId || context.organization?.id;
        if (!orgId) {
          return {
            success: false,
            error: 'Organization ID is required to add a field',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'addFieldToObject',
              userId: context.user.userId
            }
          };
        }

        const response = await objectManagerApi.addFieldToObject({
          objectApiName: objectApiName as string,
          field: field as CustomField
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to add field to object');
        }

        const updatedObject = response.data;

        return {
          success: true,
          data: { object: updatedObject },
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
          error: error instanceof Error ? error.message : `Failed to add field ${fieldApiName} to object ${objectApiName}`,
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'addFieldToObject',
            userId: context.user.userId
          }
        };
      }
    }
  });

  // Update Field In Object Action
  controller.actions.set('updateFieldInObject', {
    id: 'updateFieldInObject',
    name: 'Update Field In Object',
    description: 'Update an existing field in a custom object',
    category: 'data',
    permissions: ['objects:write'],
    parameters: [
      { name: 'objectApiName', type: 'string', required: true, description: 'API name of the object containing the field' },
      { name: 'fieldApiName', type: 'string', required: true, description: 'API name of the field to update' },
      { name: 'updates', type: 'object', required: true, description: 'Partial updates for the field' }
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

        const orgId = context.user.organizationId || context.organization?.id;
        if (!orgId) {
          return {
            success: false,
            error: 'Organization ID is required to update a field',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'updateFieldInObject',
              userId: context.user.userId
            }
          };
        }

        const response = await objectManagerApi.updateFieldInObject({
          objectApiName: objectApiName as string,
          fieldApiName: fieldApiName as string,
          updates: updates as Partial<CustomField>
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to update field in object');
        }

        const updatedObject = response.data;

        return {
          success: true,
          data: { object: updatedObject },
          message: `Field ${fieldApiName} updated in object ${objectApiName} successfully`,
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
  });
}
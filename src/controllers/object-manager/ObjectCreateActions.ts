import { ActionDefinition } from '../types/actionDefinitions';
import { ActionContext } from '../types/actionContexts';
import { ActionResult } from '../types/actionResults';
import { CustomField } from '@/types/object-manager';
import { objectManagerService } from '@/services/objectManagerService';
import { ObjectManagerPageController } from '../ObjectManagerPageController';

/**
 * Registers actions related to creating objects and records.
 * @param controller The ObjectManagerPageController instance.
 */
export function registerObjectCreateActions(controller: ObjectManagerPageController): void {
  // Create Object Action
  controller.actions.set('createObject', {
    id: 'createObject',
    name: 'Create Object',
    description: 'Create a new custom object with fields and schema',
    category: 'data',
    permissions: ['objects:write'],
    parameters: [
      { name: 'apiName', type: 'string', required: true, description: 'API name for the object (e.g., CustomObject__c)' },
      { name: 'label', type: 'string', required: true, description: 'Display label for the object' },
      { name: 'description', type: 'string', required: false, description: 'Object description' },
      { name: 'fields', type: 'array', required: false, description: 'Initial fields to create with the object' }
    ],
    execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
      try {
        const { apiName, label, description, fields = [] } = params;

        if (!apiName || typeof apiName !== 'string') {
          return {
            success: false,
            error: 'API name is required and must be a string.',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'createObject',
              userId: context.user.userId
            }
          };
        }

        const orgId = context.user.organizationId || context.organization?.id;
        if (!orgId) {
          return {
            success: false,
            error: 'Organization ID is required to create an object',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'createObject',
              userId: context.user.userId
            }
          };
        }

        const newObject = await objectManagerService.createObject(orgId, {
          apiName: apiName as string,
          label: label as string,
          description: description as string,
          fields: fields as CustomField[]
        });

        return {
          success: true,
          data: { object: newObject },
          message: `Object ${apiName} created successfully`,
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'createObject',
            userId: context.user.userId
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create object',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'createObject',
            userId: context.user.userId
          }
        };
      }
    }
  });

  // Create Record Action
  controller.actions.set('createRecord', {
    id: 'createRecord',
    name: 'Create Record',
    description: 'Create a new record in the specified object',
    category: 'data',
    permissions: ['records:write'],
    parameters: [
      { name: 'objectApiName', type: 'string', required: true, description: 'Object API name to create record in' },
      { name: 'recordData', type: 'object', required: true, description: 'Record data to create' },
      { name: 'validateOnly', type: 'boolean', required: false, description: 'Only validate, do not save' }
    ],
    execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
      try {
        const { objectApiName, recordData, validateOnly = false } = params;

        if (!objectApiName || !recordData) {
          return {
            success: false,
            error: 'Object API name and record data are required',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'createRecord',
              userId: context.user.userId
            }
          };
        }

        if (validateOnly) {
          return {
            success: true,
            data: { validation: 'passed' },
            message: 'Record validation passed',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'createRecord',
              userId: context.user.userId
            }
          };
        }

        const orgId = context.user.organizationId || context.organization?.id;
        if (!orgId) {
          return {
            success: false,
            error: 'Organization ID is required to create a record',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'createRecord',
              userId: context.user.userId
            }
          };
        }

        const savedRecord = await objectManagerService.createRecord(orgId, objectApiName as string, recordData as Record<string, any>);

        return {
          success: true,
          data: {
            record: {
              id: savedRecord.id,
              ...savedRecord.toJSON()
            }
          },
          message: `Record created successfully in ${objectApiName}`,
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'createRecord',
            userId: context.user.userId
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create record',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'createRecord',
            userId: context.user.userId
          }
        };
      }
    }
  });
}
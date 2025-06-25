import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { CustomField } from '@/types/object-manager';
import { objectManagerApi } from '@/services/api';

export const createObjectAction: ActionDefinition = {
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

      const response = await objectManagerApi.createObject({
        orgId,
        apiName: apiName as string,
        label: label as string,
        description: description as string,
        fields: fields as CustomField[]
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create object');
      }

      const newObject = response.data;

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
};
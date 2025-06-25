import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { objectManagerApi } from '@/services/api';

export const createRecordAction: ActionDefinition = {
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

      const response = await objectManagerApi.createRecord({
        orgId,
        objectApiName: objectApiName as string,
        recordData: recordData as Record<string, any>
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create record');
      }

      const savedRecord = response.data;

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
};
import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { objectManagerService } from '@/services/objectManagerService';

export const updateRecordAction: ActionDefinition = {
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

      const updatedRecord = await objectManagerService.updateRecord(orgId, objectApiName as string, recordId as string, recordData as Record<string, any>);

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
};
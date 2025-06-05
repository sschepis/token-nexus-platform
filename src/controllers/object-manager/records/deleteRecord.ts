import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { objectManagerService } from '@/services/objectManagerService';

export const deleteRecordAction: ActionDefinition = {
  id: 'deleteRecord',
  name: 'Delete Record',
  description: 'Delete a record from the specified object',
  category: 'data',
  permissions: ['records:write'],
  parameters: [
    { name: 'objectApiName', type: 'string', required: true, description: 'Object API name where the record exists' },
    { name: 'recordId', type: 'string', required: true, description: 'ID of the record to delete' }
  ],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    let recordId: string | undefined;
    try {
      const { objectApiName, recordId: extractedRecordId } = params;
      recordId = extractedRecordId as string;

      if (!objectApiName || !recordId) {
        return {
          success: false,
          error: 'Object API name and record ID are required',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'deleteRecord',
            userId: context.user.userId
          }
        };
      }

      const orgId = context.user.organizationId || context.organization?.id;
      if (!orgId) {
        return {
          success: false,
          error: 'Organization ID is required to delete a record',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'deleteRecord',
            userId: context.user.userId
          }
        };
      }

      await objectManagerService.deleteRecord(orgId, objectApiName as string, recordId as string);

      return {
        success: true,
        message: `Record ${recordId} deleted successfully from ${objectApiName}`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'deleteRecord',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to delete record ${recordId}`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'deleteRecord',
          userId: context.user.userId
        }
      };
    }
  }
};
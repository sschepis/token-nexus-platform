import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { objectManagerApi } from '@/services/api';

export const fetchRecordsAction: ActionDefinition = {
  id: 'fetchRecords',
  name: 'Fetch Records',
  description: 'Get records for a specific object with pagination and filtering',
  category: 'data',
  permissions: ['records:read'],
  parameters: [
    { name: 'objectApiName', type: 'string', required: true, description: 'Object API name to fetch records from' },
    { name: 'limit', type: 'number', required: false, description: 'Number of records to fetch (default: 100)' },
    { name: 'skip', type: 'number', required: false, description: 'Number of records to skip for pagination' },
    { name: 'filters', type: 'object', required: false, description: 'Filter criteria' },
    { name: 'sortBy', type: 'string', required: false, description: 'Field to sort by' },
    { name: 'sortOrder', type: 'string', required: false, description: 'Sort order (asc, desc)' }
  ],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const {
        objectApiName,
        limit = 100,
        skip = 0,
        filters = {},
        sortBy,
        sortOrder = 'asc'
      } = params;

      if (!objectApiName) {
        return {
          success: false,
          error: 'Object API name is required',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'fetchRecords',
            userId: context.user.userId
          }
        };
      }

      const orgId = context.user.organizationId || context.organization?.id;
      if (!orgId) {
        return {
          success: false,
          error: 'Organization ID is required to fetch records',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'fetchRecords',
            userId: context.user.userId
          }
        };
      }

      const response = await objectManagerApi.fetchRecords({
        orgId,
        objectApiName: objectApiName as string,
        limit: limit as number,
        skip: skip as number,
        filters: filters as Record<string, any>,
        sortBy: sortBy as string,
        sortOrder: sortOrder as string
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch records');
      }

      const { records, total } = response.data || { records: [], total: 0 };

      return {
        success: true,
        data: {
          records: records,
          total: total,
          limit,
          skip
        },
        message: `Found ${records.length} records`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'fetchRecords',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch records',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'fetchRecords',
          userId: context.user.userId
        }
      };
    }
  }
};
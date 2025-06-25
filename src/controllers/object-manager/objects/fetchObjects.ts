import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { objectManagerApi } from '@/services/api';

export const fetchObjectsAction: ActionDefinition = {
  id: 'fetchObjects',
  name: 'Fetch Objects',
  description: 'Get all custom objects with optional filtering and real data from Parse',
  category: 'data',
  permissions: ['objects:read'],
  parameters: [
    { name: 'includeInactive', type: 'boolean', required: false, description: 'Include inactive objects' },
    { name: 'objectType', type: 'string', required: false, description: 'Filter by object type (custom, standard)' },
    { name: 'searchTerm', type: 'string', required: false, description: 'Search term for object names' },
    { name: 'includeRecordCount', type: 'boolean', required: false, description: 'Include record counts for each object' }
  ],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const { includeInactive = false, objectType, searchTerm, includeRecordCount = true } = params;

      const orgId = context.user.organizationId || context.organization?.id;
      if (!orgId) {
        return {
          success: false,
          error: 'Organization ID is required to fetch objects',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'fetchObjects',
            userId: context.user.userId
          }
        };
      }

      const response = await objectManagerApi.fetchObjects({
        orgId,
        includeInactive: includeInactive as boolean,
        objectType: objectType as string,
        searchTerm: searchTerm as string,
        includeRecordCount: includeRecordCount as boolean
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch objects');
      }

      const objects = response.data;

      return {
        success: true,
        data: { objects },
        message: `Found ${objects.length} objects`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'fetchObjects',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch objects',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'fetchObjects',
          userId: context.user.userId
        }
      };
    }
  }
};
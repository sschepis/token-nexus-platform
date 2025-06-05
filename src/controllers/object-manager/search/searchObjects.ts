import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { objectManagerService } from '@/services/objectManagerService';

export const searchObjectsAction: ActionDefinition = {
  id: 'searchObjects',
  name: 'Search Objects',
  description: 'Search and filter objects with advanced criteria',
  category: 'data',
  permissions: ['objects:read'],
  parameters: [
    { name: 'searchTerm', type: 'string', required: true, description: 'Search term' },
    { name: 'searchFields', type: 'array', required: false, description: 'Fields to search in (name, label, description)' },
    { name: 'filters', type: 'object', required: false, description: 'Additional filters' }
  ],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const { searchTerm, searchFields = ['name', 'label'], filters = {} } = params;

      if (!searchTerm) {
        return {
          success: false,
          error: 'Search term is required',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'searchObjects',
            userId: context.user.userId
          }
        };
      }

      const orgId = context.user.organizationId || context.organization?.id;
      if (!orgId) {
        return {
          success: false,
          error: 'Organization ID is required to search objects',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'searchObjects',
            userId: context.user.userId
          }
        };
      }

      const filteredObjects = await objectManagerService.fetchObjects(orgId, {
        searchTerm: searchTerm as string,
        includeInactive: false,
        objectType: undefined,
        includeRecordCount: true,
      });

      return {
        success: true,
        data: { objects: filteredObjects },
        message: `Found ${filteredObjects.length} objects matching "${searchTerm}"`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'searchObjects',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search objects',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'searchObjects',
          userId: context.user.userId
        }
      };
    }
  }
};
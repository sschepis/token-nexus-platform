import { ActionDefinition } from '../types/actionDefinitions';
import { ActionContext } from '../types/actionContexts';
import { ActionResult } from '../types/actionResults';
import { CustomObject, ObjectRecord } from '@/types/object-manager';
import { objectManagerApi } from '@/services/api';
import { ObjectManagerPageController } from '../ObjectManagerPageController';

/**
 * Registers actions related to reading (fetching and searching) objects and records.
 * @param controller The ObjectManagerPageController instance.
 */
export function registerObjectReadActions(controller: ObjectManagerPageController): void {
  // Fetch Objects Action
  controller.actions.set('fetchObjects', {
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
  });

  // Fetch Records Action
  controller.actions.set('fetchRecords', {
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

        const { records, total } = response.data;

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
  });

  // Search Objects Action
  controller.actions.set('searchObjects', {
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

        // The fetchObjects function in objectManagerApi takes includeInactive, objectType, searchTerm, includeRecordCount
        // It does not directly take searchFields or filters.
        // We will call fetchObjects with the searchTerm, and then filter the results if needed.
        const response = await objectManagerApi.fetchObjects({
          orgId,
          searchTerm: searchTerm as string,
          includeInactive: false, // Assuming searching active objects by default
          objectType: undefined, // Assuming searching all object types by default
          includeRecordCount: true, // Including record count if available
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to search objects');
        }

        const allObjects = response.data;

        const filteredObjects = allObjects.filter(obj => {
          // Implement client-side filtering based on searchFields and filters if objectManagerApi.fetchObjects doesn't support it directly
          // For now, only searchTerm is passed to the service. We will refine this later if needed.
          const objName = obj.label || obj.apiName;
          return objName.toLowerCase().includes((searchTerm as string).toLowerCase());
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
  });
}
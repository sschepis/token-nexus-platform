import { PageController } from './types/pageController';
import { ActionDefinition } from './types/actionDefinitions';
import { PageContext, ActionContext } from './types/actionContexts'; // PageContext and ActionContext are in actionContexts.ts
import { ActionResult } from './types/actionResults'; // ActionResult is in actionResults.ts
import { CustomObject, CustomField, ObjectRecord } from '@/types/object-manager';
import { objectManagerService } from '@/services/objectManagerService'; // Import the new service

export class ObjectManagerPageController implements PageController {
  pageId = 'object-manager';
  pageName = 'Object Manager';
  description = 'Comprehensive object and record management system';
  actions = new Map<string, ActionDefinition>();
  context: PageContext = {
    pageId: 'object-manager',
    pageName: 'Object Manager',
    state: {},
    props: {},
    metadata: {
      category: 'data',
      tags: ['objects', 'records', 'schema', 'data-management'],
      permissions: ['objects:read', 'objects:write', 'records:read', 'records:write']
    }
  };
  metadata = {
    category: 'data',
    tags: ['objects', 'records', 'schema', 'data-management'],
    permissions: ['objects:read', 'objects:write', 'records:read', 'records:write'],
    version: '1.0.0'
  };
  isActive = true;
  registeredAt = new Date();

  constructor() {
    this.initializeActions();
  }

  private initializeActions(): void {
    // Fetch Objects Action
    this.actions.set('fetchObjects', {
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

          const objects = await objectManagerService.fetchObjects(orgId, {
            includeInactive: includeInactive as boolean,
            objectType: objectType as string,
            searchTerm: searchTerm as string,
            includeRecordCount: includeRecordCount as boolean
          });

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

    // Create Object Action
    this.actions.set('createObject', {
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

    // Fetch Records Action
    this.actions.set('fetchRecords', {
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

          const { records, total } = await objectManagerService.fetchRecords(orgId, objectApiName as string, {
            limit: limit as number,
            skip: skip as number,
            filters: filters as Record<string, any>,
            sortBy: sortBy as string,
            sortOrder: sortOrder as 'asc' | 'desc'
          });

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

    // Create Record Action
    this.actions.set('createRecord', {
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

    // Update Record Action
    this.actions.set('updateRecord', {
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
    });

    // Delete Record Action
    this.actions.set('deleteRecord', {
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
    });

    // Add Field to Object Action
    this.actions.set('addFieldToObject', {
      id: 'addFieldToObject',
      name: 'Add Field to Object',
      description: 'Adds a new field to an existing custom object',
      category: 'data',
      permissions: ['objects:write'],
      parameters: [
        { name: 'objectApiName', type: 'string', required: true, description: 'API name of the object to add field to' },
        { name: 'fieldApiName', type: 'string', required: true, description: 'API name for the new field' },
        { name: 'fieldType', type: 'string', required: true, description: 'Data type of the new field (e.g., String, Number, Boolean)' },
        { name: 'options', type: 'object', required: false, description: 'Additional field options (e.g., required, defaultValue)' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { objectApiName, fieldApiName, fieldType, options = {} } = params;

          if (!objectApiName || !fieldApiName || !fieldType) {
            return {
              success: false,
              error: 'Object API name, field API name, and field type are required',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'addFieldToObject',
                userId: context.user.userId
              }
            };
          }

          const newField: CustomField = {
            id: `${objectApiName}_${fieldApiName}`, // Construct a unique ID
            apiName: fieldApiName as string,
            label: (options as any).label || fieldApiName as string, // Use label from options if available
            type: fieldType as string,
            required: (options as any).required || false,
            description: (options as any).description || `${fieldType} field`,
            // Potentially add targetClass if fieldType is 'Pointer'
            ...(fieldType === 'Pointer' && (options as any).targetClass ? { targetClass: (options as any).targetClass } : {})
          };

          await objectManagerService.addFieldToObject(objectApiName as string, newField);

          return {
            success: true,
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

    // Update Field in Object Action
    this.actions.set('updateFieldInObject', {
      id: 'updateFieldInObject',
      name: 'Update Field in Object',
      description: 'Updates an existing field in a custom object',
      category: 'data',
      permissions: ['objects:write'],
      parameters: [
        { name: 'objectApiName', type: 'string', required: true, description: 'API name of the object containing the field' },
        { name: 'fieldApiName', type: 'string', required: true, description: 'API name of the field to update' },
        { name: 'updates', type: 'object', required: true, description: 'Updates to apply to the field (e.g., newType, newLabel)' }
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

          await objectManagerService.updateFieldInObject(objectApiName as string, fieldApiName as string, updates as Partial<CustomField>);

          return {
            success: true,
            message: `Field ${fieldApiName} in object ${objectApiName} updated successfully`,
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

    // Delete Field from Object Action
    this.actions.set('deleteFieldFromObject', {
      id: 'deleteFieldFromObject',
      name: 'Delete Field from Object',
      description: 'Deletes a field from an existing custom object',
      category: 'data',
      permissions: ['objects:write'],
      parameters: [
        { name: 'objectApiName', type: 'string', required: true, description: 'API name of the object containing the field' },
        { name: 'fieldApiName', type: 'string', required: true, description: 'API name of the field to delete' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        let objectApiName: string | undefined;
        let fieldApiName: string | undefined;
        try {
          const { objectApiName: extractedObjectApiName, fieldApiName: extractedFieldApiName } = params;
          objectApiName = extractedObjectApiName as string;
          fieldApiName = extractedFieldApiName as string;

          if (!objectApiName || !fieldApiName) {
            return {
              success: false,
              error: 'Object API name and field API name are required',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'deleteFieldFromObject',
                userId: context.user.userId
              }
            };
          }

          await objectManagerService.deleteFieldFromObject(objectApiName as string, fieldApiName as string);

          return {
            success: true,
            message: `Field "${fieldApiName}" deleted from object "${objectApiName}" successfully`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'deleteFieldFromObject',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : `Failed to delete field "${fieldApiName as string}" from object "${objectApiName as string}"`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'deleteFieldFromObject',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Delete Object Action
    this.actions.set('deleteObject', {
      id: 'deleteObject',
      name: 'Delete Object',
      description: 'Delete a custom object and all its data',
      category: 'data',
      permissions: ['objects:write'],
      parameters: [
        { name: 'objectId', type: 'string', required: true, description: 'Object ID to delete' }, // Renamed from apiName to objectId for clarity, assuming Parse uses objectId for schema deletion
        { name: 'confirmDelete', type: 'boolean', required: true, description: 'Confirmation flag for deletion' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { objectId, confirmDelete } = params;

          if (!objectId || !confirmDelete) {
            return {
              success: false,
              error: 'Object ID and confirmation are required',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'deleteObject',
                userId: context.user.userId
              }
            };
          }

          // objectManagerService.deleteObject expects objectApiName and confirmDelete
          await objectManagerService.deleteObject(objectId as string, confirmDelete as boolean);

          return {
            success: true,
            data: { objectId },
            message: `Object ${objectId} and all its records deleted successfully`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'deleteObject',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete object',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'deleteObject',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Search Objects Action
    this.actions.set('searchObjects', {
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
    }); // End searchObjects action
  } // End initializeActions
} // End ObjectManagerPageController

// Export the controller instance
export const objectManagerPageController = new ObjectManagerPageController();
import { ActionDefinition, ActionContext, ActionResult } from '../types/ActionTypes';
import { createAction } from '../base/ActionBuilder';
import { PermissionValidator } from '../base/PermissionValidator';
import { ParseQueryBuilder, createParseObject, updateParseObject, deleteParseObject } from '../../utils/parseUtils';

/**
 * Configuration for CRUD action factory
 */
export interface CRUDConfig {
  resource: string; // e.g., 'users', 'tokens', 'organizations'
  className: string; // Parse class name
  permissions?: {
    read?: string[];
    create?: string[];
    update?: string[];
    delete?: string[];
  };
  fields?: {
    required?: string[];
    optional?: string[];
    readonly?: string[];
  };
  validation?: {
    [fieldName: string]: {
      type?: 'string' | 'number' | 'boolean';
      minLength?: number;
      maxLength?: number;
      pattern?: RegExp;
      enum?: string[];
      min?: number;
      max?: number;
    };
  };
  hooks?: {
    beforeCreate?: (data: Record<string, any>, context: ActionContext) => Promise<Record<string, any>>;
    afterCreate?: (object: Parse.Object, context: ActionContext) => Promise<void>;
    beforeUpdate?: (object: Parse.Object, data: Record<string, any>, context: ActionContext) => Promise<Record<string, any>>;
    afterUpdate?: (object: Parse.Object, context: ActionContext) => Promise<void>;
    beforeDelete?: (object: Parse.Object, context: ActionContext) => Promise<void>;
    afterDelete?: (objectId: string, context: ActionContext) => Promise<void>;
  };
  customQueries?: {
    list?: (query: Parse.Query, context: ActionContext) => Parse.Query;
    get?: (query: Parse.Query, context: ActionContext) => Parse.Query;
  };
}

/**
 * Factory for creating standard CRUD actions
 */
export class CRUDActionFactory {
  /**
   * Create all CRUD actions for a resource
   */
  static createAll(config: CRUDConfig): Map<string, ActionDefinition> {
    const actions = new Map<string, ActionDefinition>();
    
    actions.set(`list${config.resource}`, this.createListAction(config));
    actions.set(`get${config.resource}`, this.createGetAction(config));
    actions.set(`create${config.resource}`, this.createCreateAction(config));
    actions.set(`update${config.resource}`, this.createUpdateAction(config));
    actions.set(`delete${config.resource}`, this.createDeleteAction(config));
    
    return actions;
  }

  /**
   * Create list/fetch action
   */
  static createListAction(config: CRUDConfig): ActionDefinition {
    const resourceName = config.resource.toLowerCase();
    const permissions = config.permissions?.read || [`${resourceName}:read`];
    
    return createAction(`list${config.resource}`, `List ${config.resource}`)
      .description(`Get all ${resourceName} for the organization`)
      .category('data')
      .permissions(...permissions)
      .numberParam('limit', false, 'Maximum number of records to return', { min: 1, max: 1000 })
      .numberParam('skip', false, 'Number of records to skip for pagination', { min: 0 })
      .stringParam('sortBy', false, 'Field to sort by')
      .stringParam('sortOrder', false, 'Sort order (asc or desc)', { enum: ['asc', 'desc'] })
      .stringParam('search', false, 'Search query')
      .tags('crud', 'list', resourceName)
      .build(async (params, context) => {
        // Validate permissions
        const permissionCheck = PermissionValidator.validate(context, {
          permissions,
          organizationRequired: true,
          systemAdminBypass: true
        });
        
        if (!permissionCheck.success) {
          throw new Error(permissionCheck.error);
        }

        const { limit = 50, skip = 0, sortBy, sortOrder = 'desc', search } = params;
        
        // Create base query using ParseQueryBuilder
        let queryBuilder = new ParseQueryBuilder(config.className);
        
        // Add organization context
        const orgId = context.user.organizationId || context.organization?.id;
        if (orgId) {
          queryBuilder = queryBuilder.equalTo('organizationId', orgId);
        }
        
        // Apply search
        if (search && typeof search === 'string') {
          // Simple search implementation - can be enhanced
          queryBuilder = queryBuilder.contains('name', search);
        }
        
        // Apply sorting
        if (sortBy && typeof sortBy === 'string') {
          if (sortOrder === 'asc') {
            queryBuilder = queryBuilder.ascending(sortBy);
          } else {
            queryBuilder = queryBuilder.descending(sortBy);
          }
        } else {
          queryBuilder = queryBuilder.descending('createdAt');
        }
        
        // Apply pagination
        queryBuilder = queryBuilder.limit(limit as number).skip(skip as number);
        
        // Apply custom query modifications (convert to Parse.Query if needed)
        let query = queryBuilder.getQuery();
        if (config.customQueries?.list) {
          query = config.customQueries.list(query, context);
        }
        
        const results = await query.find({ useMasterKey: true });
        const total = await query.count({ useMasterKey: true });
        
        return {
          success: true,
          data: {
            items: results.map(obj => obj.toJSON()),
            total,
            limit: limit as number,
            skip: skip as number,
            hasMore: (skip as number) + (limit as number) < total
          },
          message: `Retrieved ${results.length} ${resourceName}(s)`
        };
      });
  }

  /**
   * Create get/fetch single action
   */
  static createGetAction(config: CRUDConfig): ActionDefinition {
    const resourceName = config.resource.toLowerCase();
    const permissions = config.permissions?.read || [`${resourceName}:read`];
    
    return createAction(`get${config.resource}`, `Get ${config.resource}`)
      .description(`Get a specific ${resourceName} by ID`)
      .category('data')
      .permissions(...permissions)
      .stringParam('id', true, 'ID of the record to retrieve')
      .tags('crud', 'get', resourceName)
      .build(async (params, context) => {
        // Validate permissions
        const permissionCheck = PermissionValidator.validate(context, {
          permissions,
          organizationRequired: true,
          systemAdminBypass: true
        });
        
        if (!permissionCheck.success) {
          throw new Error(permissionCheck.error);
        }

        const { id } = params;
        
        let queryBuilder = new ParseQueryBuilder(config.className);
        
        // Add organization context
        const orgId = context.user.organizationId || context.organization?.id;
        if (orgId) {
          queryBuilder = queryBuilder.equalTo('organizationId', orgId);
        }
        
        // Apply custom query modifications (convert to Parse.Query if needed)
        let query = queryBuilder.getQuery();
        if (config.customQueries?.get) {
          query = config.customQueries.get(query, context);
        }
        
        const object = await query.get(id as string, { useMasterKey: true });
        
        if (!object) {
          throw new Error(`${config.resource} not found`);
        }
        
        return {
          success: true,
          data: object.toJSON(),
          message: `${config.resource} retrieved successfully`
        };
      });
  }

  /**
   * Create create action
   */
  static createCreateAction(config: CRUDConfig): ActionDefinition {
    const resourceName = config.resource.toLowerCase();
    const permissions = config.permissions?.create || [`${resourceName}:create`, `${resourceName}:write`];
    
    const builder = createAction(`create${config.resource}`, `Create ${config.resource}`)
      .description(`Create a new ${resourceName}`)
      .category('data')
      .permissions(...permissions)
      .tags('crud', 'create', resourceName);
    
    // Add field parameters based on configuration
    if (config.fields?.required) {
      for (const field of config.fields.required) {
        const validation = config.validation?.[field];
        if (validation?.type === 'string') {
          builder.stringParam(field, true, `${field} field`, {
            minLength: validation.minLength,
            maxLength: validation.maxLength,
            pattern: validation.pattern?.source,
            enum: validation.enum
          });
        } else if (validation?.type === 'number') {
          builder.numberParam(field, true, `${field} field`, {
            min: validation.min,
            max: validation.max
          });
        } else {
          builder.parameter({
            name: field,
            type: validation?.type || 'string',
            required: true,
            description: `${field} field`
          });
        }
      }
    }
    
    if (config.fields?.optional) {
      for (const field of config.fields.optional) {
        const validation = config.validation?.[field];
        if (validation?.type === 'string') {
          builder.stringParam(field, false, `${field} field`, {
            minLength: validation.minLength,
            maxLength: validation.maxLength,
            pattern: validation.pattern?.source,
            enum: validation.enum
          });
        } else if (validation?.type === 'number') {
          builder.numberParam(field, false, `${field} field`, {
            min: validation.min,
            max: validation.max
          });
        } else {
          builder.parameter({
            name: field,
            type: validation?.type || 'string',
            required: false,
            description: `${field} field`
          });
        }
      }
    }
    
    return builder.build(async (params, context) => {
      // Validate permissions
      const permissionCheck = PermissionValidator.validate(context, {
        permissions,
        organizationRequired: true,
        systemAdminBypass: true
      });
      
      if (!permissionCheck.success) {
        throw new Error(permissionCheck.error);
      }

      let data = { ...params };
      
      // Remove non-field parameters
      delete data.id;
      
      // Apply before create hook
      if (config.hooks?.beforeCreate) {
        data = await config.hooks.beforeCreate(data, context);
      }
      
      // Prepare object data
      const objectData: Record<string, any> = { ...data };
      
      // Set organization context
      const orgId = context.user.organizationId || context.organization?.id;
      if (orgId) {
        objectData.organizationId = orgId;
      }
      
      // Set user context
      objectData.createdBy = context.user.userId;
      objectData.updatedBy = context.user.userId;
      
      const savedObject = await createParseObject(config.className, objectData);
      
      // Apply after create hook
      if (config.hooks?.afterCreate) {
        await config.hooks.afterCreate(savedObject, context);
      }
      
      return {
        success: true,
        data: savedObject.toJSON(),
        message: `${config.resource} created successfully`
      };
    });
  }

  /**
   * Create update action
   */
  static createUpdateAction(config: CRUDConfig): ActionDefinition {
    const resourceName = config.resource.toLowerCase();
    const permissions = config.permissions?.update || [`${resourceName}:update`, `${resourceName}:write`];
    
    return createAction(`update${config.resource}`, `Update ${config.resource}`)
      .description(`Update an existing ${resourceName}`)
      .category('data')
      .permissions(...permissions)
      .stringParam('id', true, 'ID of the record to update')
      .tags('crud', 'update', resourceName)
      .build(async (params, context) => {
        // Validate permissions
        const permissionCheck = PermissionValidator.validate(context, {
          permissions,
          organizationRequired: true,
          systemAdminBypass: true
        });
        
        if (!permissionCheck.success) {
          throw new Error(permissionCheck.error);
        }

        const { id, ...updateData } = params;
        
        // Prepare update data
        let data = { ...updateData };
        
        // Remove readonly fields
        if (config.fields?.readonly) {
          for (const field of config.fields.readonly) {
            delete data[field];
          }
        }
        
        // Add organization context for security
        const orgId = context.user.organizationId || context.organization?.id;
        const securityFilters: Record<string, any> = {};
        if (orgId) {
          securityFilters.organizationId = orgId;
        }
        
        // Get existing object for before update hook
        let object: Parse.Object | undefined;
        if (config.hooks?.beforeUpdate) {
          const queryBuilder = new ParseQueryBuilder(config.className);
          if (orgId) {
            queryBuilder.equalTo('organizationId', orgId);
          }
          object = await queryBuilder.getQuery().get(id as string, { useMasterKey: true });
          if (!object) {
            throw new Error(`${config.resource} not found`);
          }
          data = await config.hooks.beforeUpdate(object, data, context);
        }
        
        // Update metadata
        data.updatedBy = context.user.userId;
        
        const savedObject = await updateParseObject(config.className, id as string, data, securityFilters);
        
        // Apply after update hook
        if (config.hooks?.afterUpdate) {
          await config.hooks.afterUpdate(savedObject, context);
        }
        
        return {
          success: true,
          data: savedObject.toJSON(),
          message: `${config.resource} updated successfully`
        };
      });
  }

  /**
   * Create delete action
   */
  static createDeleteAction(config: CRUDConfig): ActionDefinition {
    const resourceName = config.resource.toLowerCase();
    const permissions = config.permissions?.delete || [`${resourceName}:delete`];
    
    return createAction(`delete${config.resource}`, `Delete ${config.resource}`)
      .description(`Delete a ${resourceName}`)
      .category('data')
      .permissions(...permissions)
      .stringParam('id', true, 'ID of the record to delete')
      .tags('crud', 'delete', resourceName)
      .build(async (params, context) => {
        // Validate permissions
        const permissionCheck = PermissionValidator.validate(context, {
          permissions,
          organizationRequired: true,
          systemAdminBypass: true
        });
        
        if (!permissionCheck.success) {
          throw new Error(permissionCheck.error);
        }

        const { id } = params;
        
        // Add organization context for security
        const orgId = context.user.organizationId || context.organization?.id;
        const securityFilters: Record<string, any> = {};
        if (orgId) {
          securityFilters.organizationId = orgId;
        }
        
        // Get existing object for before delete hook
        let object: Parse.Object | undefined;
        if (config.hooks?.beforeDelete) {
          const queryBuilder = new ParseQueryBuilder(config.className);
          if (orgId) {
            queryBuilder.equalTo('organizationId', orgId);
          }
          object = await queryBuilder.getQuery().get(id as string, { useMasterKey: true });
          if (!object) {
            throw new Error(`${config.resource} not found`);
          }
          await config.hooks.beforeDelete(object, context);
        }
        
        await deleteParseObject(config.className, id as string, securityFilters);
        
        // Apply after delete hook
        if (config.hooks?.afterDelete) {
          await config.hooks.afterDelete(id as string, context);
        }
        
        return {
          success: true,
          data: { id },
          message: `${config.resource} deleted successfully`
        };
      });
  }
}
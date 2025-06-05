# Controller Architecture

This document provides detailed information about the Token Nexus Platform's controller architecture, including the BasePageController system and migration strategy.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture Design](#architecture-design)
- [BasePageController System](#basepagecontroller-system)
- [Action System](#action-system)
- [Permission Management](#permission-management)
- [Migration Status](#migration-status)
- [Implementation Examples](#implementation-examples)

## 🎯 Overview

The Token Nexus Platform implements a sophisticated controller architecture based on the **BasePageController** pattern. This system provides a standardized approach to handling page-level operations, actions, and permissions across the entire application.

### Key Benefits
- **Code Reusability**: Common functionality abstracted into base classes
- **Consistent Patterns**: Standardized action registration and execution
- **Type Safety**: Full TypeScript support with comprehensive interfaces
- **Permission Integration**: Built-in role-based access control
- **Testing Support**: Comprehensive test coverage and mocking capabilities

## 🏗️ Architecture Design

### System Overview
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Page Components                            │ │
│  │  • React components for UI rendering                   │ │
│  │  • Hook integration for controller actions             │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Controller Layer                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           BasePageController (Abstract)                │ │
│  │  • Common functionality and patterns                   │ │
│  │  • Action registration and execution                   │ │
│  │  • Permission validation                               │ │
│  │  • Context management                                  │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Concrete Controllers                      │ │
│  │  • UsersPageController                                 │ │
│  │  • DashboardPageController                             │ │
│  │  • TokensPageController                                │ │
│  │  • ... (15+ controllers)                              │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Support Systems                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Action      │  │ Permission  │  │   Context           │  │
│  │ Builder     │  │ Validator   │  │   Manager           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ CRUD        │  │ Controller  │  │   Registry          │  │
│  │ Factory     │  │ Registry    │  │   System            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Core Principles

1. **Single Responsibility**: Each controller manages one page/feature area
2. **Composition over Inheritance**: Use mixins and utilities for shared functionality
3. **Dependency Injection**: Controllers receive dependencies through constructor
4. **Immutable Actions**: Actions are defined once and cannot be modified
5. **Context Isolation**: Each action execution has isolated context

## 🏛️ BasePageController System

### Abstract Base Class
```typescript
export abstract class BasePageController implements PageController {
  public readonly pageId: string;
  public readonly pageName: string;
  public readonly description: string;
  public readonly actions = new Map<string, ActionDefinition>();
  public readonly context: PageContext;
  public readonly metadata: {
    category: string;
    tags: string[];
    permissions: string[];
    version?: string;
  };
  public readonly isActive = true;
  public readonly registeredAt = new Date();

  constructor(config: PageControllerConfig) {
    this.pageId = config.pageId;
    this.pageName = config.pageName;
    this.description = config.description;
    this.metadata = {
      category: config.category,
      tags: config.tags,
      permissions: config.permissions,
      version: config.version || '1.0.0'
    };
    
    this.context = {
      pageId: this.pageId,
      pageName: this.pageName,
      state: {},
      props: {},
      metadata: this.metadata
    };

    this.initializeActions();
  }

  protected abstract initializeActions(): void;
  
  // Common utility methods
  protected registerAction(config: ActionConfig, executor: Function): void
  protected validateOrganizationContext(context: ActionContext): ValidationResult
  protected createSuccessResult(data: any): ActionResult
  protected createErrorResult(error: string): ActionResult
  protected createOrganizationQuery(className: string, context: ActionContext): Parse.Query
  protected executeQuery<T>(query: Parse.Query<T>): Promise<T[] | T | number | null>
}
```

### Configuration Interface
```typescript
export interface PageControllerConfig {
  pageId: string;
  pageName: string;
  description: string;
  category: string;
  tags: string[];
  permissions: string[];
  version?: string;
}

export interface ActionConfig {
  id: string;
  name: string;
  description: string;
  category: 'navigation' | 'data' | 'ui' | 'external';
  permissions: string[];
  parameters?: ActionParameter[];
  requiresOrganization?: boolean;
  metadata?: {
    tags?: string[];
    examples?: ActionExample[];
    relatedActions?: string[];
    version?: string;
    deprecated?: boolean;
    deprecationMessage?: string;
  };
}
```

### Lifecycle Management
```typescript
class BasePageController {
  // Called when controller is registered
  public initialize(): void {
    console.log(`[${this.pageId}] Controller initialized`);
    // Override in subclasses for custom initialization
  }

  // Called when controller is unregistered
  public destroy(): void {
    console.log(`[${this.pageId}] Controller destroyed`);
    this.actions.clear();
    // Override in subclasses for cleanup
  }

  // Health check for controller
  public healthCheck(): { healthy: boolean; issues?: string[] } {
    const issues: string[] = [];
    
    if (this.actions.size === 0) {
      issues.push('No actions registered');
    }
    
    return {
      healthy: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined
    };
  }
}
```

## ⚡ Action System

### Action Definition Structure
```typescript
interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  category: 'navigation' | 'data' | 'ui' | 'external';
  permissions: string[];
  parameters: ActionParameter[];
  execute: (params: Record<string, unknown>, context: ActionContext) => Promise<ActionResult>;
  metadata?: {
    tags: string[];
    examples: ActionExample[];
    relatedActions: string[];
    version?: string;
    deprecated?: boolean;
    deprecationMessage?: string;
  };
}

interface ActionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
  defaultValue?: any;
}

interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  metadata: {
    executionTime: number;
    timestamp: Date;
    actionId: string;
    userId: string;
  };
}
```

### ActionBuilder Pattern
```typescript
class ActionBuilder {
  private config: Partial<ActionConfig> = {};
  private parameters: ActionParameter[] = [];

  static create(id: string, name: string): ActionBuilder {
    return new ActionBuilder().id(id).name(name);
  }

  id(id: string): ActionBuilder {
    this.config.id = id;
    return this;
  }

  name(name: string): ActionBuilder {
    this.config.name = name;
    return this;
  }

  description(description: string): ActionBuilder {
    this.config.description = description;
    return this;
  }

  category(category: ActionConfig['category']): ActionBuilder {
    this.config.category = category;
    return this;
  }

  permissions(...permissions: string[]): ActionBuilder {
    this.config.permissions = permissions;
    return this;
  }

  stringParam(name: string, required: boolean, description: string, validation?: any): ActionBuilder {
    this.parameters.push({
      name,
      type: 'string',
      required,
      description,
      validation
    });
    return this;
  }

  numberParam(name: string, required: boolean, description: string, validation?: any): ActionBuilder {
    this.parameters.push({
      name,
      type: 'number',
      required,
      description,
      validation
    });
    return this;
  }

  booleanParam(name: string, required: boolean, description: string): ActionBuilder {
    this.parameters.push({
      name,
      type: 'boolean',
      required,
      description
    });
    return this;
  }

  build(executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>): ActionDefinition {
    if (!this.config.id || !this.config.name) {
      throw new Error('Action ID and name are required');
    }

    return {
      id: this.config.id,
      name: this.config.name,
      description: this.config.description || '',
      category: this.config.category || 'data',
      permissions: this.config.permissions || [],
      parameters: this.parameters,
      execute: async (params, context) => {
        // Parameter validation
        this.validateParameters(params);
        
        // Execute action
        const result = await executor(params, context);
        
        return {
          success: true,
          data: result,
          metadata: {
            executionTime: Date.now() - context.startTime,
            timestamp: new Date(),
            actionId: this.config.id!,
            userId: context.user.userId
          }
        };
      }
    };
  }

  private validateParameters(params: Record<string, unknown>): void {
    for (const param of this.parameters) {
      if (param.required && !(param.name in params)) {
        throw new Error(`Required parameter '${param.name}' is missing`);
      }

      const value = params[param.name];
      if (value !== undefined) {
        this.validateParameterType(param, value);
        this.validateParameterConstraints(param, value);
      }
    }
  }

  private validateParameterType(param: ActionParameter, value: any): void {
    const actualType = typeof value;
    
    if (param.type === 'array' && !Array.isArray(value)) {
      throw new Error(`Parameter '${param.name}' must be an array`);
    }
    
    if (param.type !== 'array' && param.type !== actualType) {
      throw new Error(`Parameter '${param.name}' must be of type ${param.type}`);
    }
  }

  private validateParameterConstraints(param: ActionParameter, value: any): void {
    if (!param.validation) return;

    const { min, max, pattern, enum: enumValues } = param.validation;

    if (typeof value === 'string') {
      if (min !== undefined && value.length < min) {
        throw new Error(`Parameter '${param.name}' must be at least ${min} characters`);
      }
      if (max !== undefined && value.length > max) {
        throw new Error(`Parameter '${param.name}' must be at most ${max} characters`);
      }
      if (pattern && !new RegExp(pattern).test(value)) {
        throw new Error(`Parameter '${param.name}' does not match required pattern`);
      }
    }

    if (typeof value === 'number') {
      if (min !== undefined && value < min) {
        throw new Error(`Parameter '${param.name}' must be at least ${min}`);
      }
      if (max !== undefined && value > max) {
        throw new Error(`Parameter '${param.name}' must be at most ${max}`);
      }
    }

    if (enumValues && !enumValues.includes(value)) {
      throw new Error(`Parameter '${param.name}' must be one of: ${enumValues.join(', ')}`);
    }
  }
}

// Convenience factory functions
export const createAction = (id: string, name: string) => ActionBuilder.create(id, name);

export const createDataAction = (id: string, name: string) => 
  ActionBuilder.create(id, name).category('data');

export const createNavigationAction = (id: string, name: string) => 
  ActionBuilder.create(id, name).category('navigation');

export const createUIAction = (id: string, name: string) => 
  ActionBuilder.create(id, name).category('ui');
```

### CRUD Action Factory
```typescript
interface CRUDConfig {
  resource: string;
  className: string;
  permissions: {
    read: string[];
    create: string[];
    update: string[];
    delete: string[];
  };
  fields?: {
    required: string[];
    optional: string[];
    readonly: string[];
  };
  hooks?: {
    beforeCreate?: (data: any, context: ActionContext) => Promise<any>;
    afterCreate?: (object: Parse.Object, context: ActionContext) => Promise<void>;
    beforeUpdate?: (object: Parse.Object, data: any, context: ActionContext) => Promise<any>;
    afterUpdate?: (object: Parse.Object, context: ActionContext) => Promise<void>;
    beforeDelete?: (object: Parse.Object, context: ActionContext) => Promise<void>;
    afterDelete?: (objectId: string, context: ActionContext) => Promise<void>;
  };
}

class CRUDActionFactory {
  static createAll(config: CRUDConfig): Map<string, ActionDefinition> {
    const actions = new Map<string, ActionDefinition>();
    
    actions.set(`list${config.resource}`, this.createList(config));
    actions.set(`get${config.resource}`, this.createGet(config));
    actions.set(`create${config.resource}`, this.createCreate(config));
    actions.set(`update${config.resource}`, this.createUpdate(config));
    actions.set(`delete${config.resource}`, this.createDelete(config));
    
    return actions;
  }

  static createList(config: CRUDConfig): ActionDefinition {
    return createDataAction(`list${config.resource}`, `List ${config.resource}`)
      .description(`Retrieve a list of ${config.resource.toLowerCase()}`)
      .permissions(...config.permissions.read)
      .numberParam('page', false, 'Page number', { min: 1 })
      .numberParam('limit', false, 'Items per page', { min: 1, max: 100 })
      .stringParam('search', false, 'Search query')
      .stringParam('sort', false, 'Sort field')
      .stringParam('order', false, 'Sort order', { enum: ['asc', 'desc'] })
      .build(async (params, context) => {
        const query = new Parse.Query(config.className);
        
        // Apply organization filter
        const orgId = context.user.organizationId || context.organization?.id;
        if (orgId) {
          query.equalTo('organizationId', orgId);
        }
        
        // Apply pagination
        const page = (params.page as number) || 1;
        const limit = Math.min((params.limit as number) || 20, 100);
        query.skip((page - 1) * limit);
        query.limit(limit);
        
        // Apply search
        if (params.search) {
          // Implement search logic based on resource type
          query.contains('name', params.search as string);
        }
        
        // Apply sorting
        if (params.sort) {
          const order = params.order === 'desc' ? '-' : '';
          query.ascending(`${order}${params.sort}`);
        }
        
        const [objects, total] = await Promise.all([
          query.find({ useMasterKey: true }),
          query.count({ useMasterKey: true })
        ]);
        
        return {
          items: objects.map(obj => obj.toJSON()),
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        };
      });
  }

  static createGet(config: CRUDConfig): ActionDefinition {
    return createDataAction(`get${config.resource}`, `Get ${config.resource}`)
      .description(`Retrieve a single ${config.resource.toLowerCase()} by ID`)
      .permissions(...config.permissions.read)
      .stringParam('id', true, 'Object ID')
      .build(async (params, context) => {
        const query = new Parse.Query(config.className);
        
        // Apply organization filter
        const orgId = context.user.organizationId || context.organization?.id;
        if (orgId) {
          query.equalTo('organizationId', orgId);
        }
        
        const object = await query.get(params.id as string, { useMasterKey: true });
        
        if (!object) {
          throw new Error(`${config.resource} not found`);
        }
        
        return object.toJSON();
      });
  }

  static createCreate(config: CRUDConfig): ActionDefinition {
    return createDataAction(`create${config.resource}`, `Create ${config.resource}`)
      .description(`Create a new ${config.resource.toLowerCase()}`)
      .permissions(...config.permissions.create)
      .build(async (params, context) => {
        // Validate required fields
        if (config.fields?.required) {
          for (const field of config.fields.required) {
            if (!(field in params)) {
              throw new Error(`Required field '${field}' is missing`);
            }
          }
        }
        
        // Remove readonly fields
        const data = { ...params };
        if (config.fields?.readonly) {
          for (const field of config.fields.readonly) {
            delete data[field];
          }
        }
        
        // Execute before hook
        if (config.hooks?.beforeCreate) {
          await config.hooks.beforeCreate(data, context);
        }
        
        const object = new Parse.Object(config.className);
        
        // Set organization context
        const orgId = context.user.organizationId || context.organization?.id;
        if (orgId) {
          object.set('organizationId', orgId);
        }
        
        // Set data
        Object.entries(data).forEach(([key, value]) => {
          object.set(key, value);
        });
        
        await object.save(null, { useMasterKey: true });
        
        // Execute after hook
        if (config.hooks?.afterCreate) {
          await config.hooks.afterCreate(object, context);
        }
        
        return object.toJSON();
      });
  }

  static createUpdate(config: CRUDConfig): ActionDefinition {
    return createDataAction(`update${config.resource}`, `Update ${config.resource}`)
      .description(`Update an existing ${config.resource.toLowerCase()}`)
      .permissions(...config.permissions.update)
      .stringParam('id', true, 'Object ID')
      .build(async (params, context) => {
        const { id, ...data } = params;
        
        // Remove readonly fields
        if (config.fields?.readonly) {
          for (const field of config.fields.readonly) {
            delete data[field];
          }
        }
        
        const query = new Parse.Query(config.className);
        
        // Apply organization filter
        const orgId = context.user.organizationId || context.organization?.id;
        if (orgId) {
          query.equalTo('organizationId', orgId);
        }
        
        const object = await query.get(id as string, { useMasterKey: true });
        
        if (!object) {
          throw new Error(`${config.resource} not found`);
        }
        
        // Execute before hook
        if (config.hooks?.beforeUpdate) {
          await config.hooks.beforeUpdate(object, data, context);
        }
        
        // Update data
        Object.entries(data).forEach(([key, value]) => {
          object.set(key, value);
        });
        
        await object.save(null, { useMasterKey: true });
        
        // Execute after hook
        if (config.hooks?.afterUpdate) {
          await config.hooks.afterUpdate(object, context);
        }
        
        return object.toJSON();
      });
  }

  static createDelete(config: CRUDConfig): ActionDefinition {
    return createDataAction(`delete${config.resource}`, `Delete ${config.resource}`)
      .description(`Delete a ${config.resource.toLowerCase()}`)
      .permissions(...config.permissions.delete)
      .stringParam('id', true, 'Object ID')
      .build(async (params, context) => {
        const query = new Parse.Query(config.className);
        
        // Apply organization filter
        const orgId = context.user.organizationId || context.organization?.id;
        if (orgId) {
          query.equalTo('organizationId', orgId);
        }
        
        const object = await query.get(params.id as string, { useMasterKey: true });
        
        if (!object) {
          throw new Error(`${config.resource} not found`);
        }
        
        // Execute before hook
        if (config.hooks?.beforeDelete) {
          await config.hooks.beforeDelete(object, context);
        }
        
        await object.destroy({ useMasterKey: true });
        
        // Execute after hook
        if (config.hooks?.afterDelete) {
          await config.hooks.afterDelete(params.id as string, context);
        }
        
        return { success: true, id: params.id };
      });
  }
}
```

## 🔐 Permission Management

### Permission Validator
```typescript
interface PermissionValidationConfig {
  permissions: string | string[];
  requireAll?: boolean;
  organizationRequired?: boolean;
  systemAdminBypass?: boolean;
  orgAdminBypass?: boolean;
}

interface PermissionValidationResult {
  success: boolean;
  error?: string;
  details?: {
    hasPermissions: string[];
    missingPermissions: string[];
    isSystemAdmin: boolean;
    isOrgAdmin: boolean;
    hasOrganization: boolean;
  };
}

class PermissionValidator {
  static validate(context: ActionContext, config: PermissionValidationConfig): PermissionValidationResult {
    const { user, organization } = context;
    const requiredPermissions = Array.isArray(config.permissions) ? config.permissions : [config.permissions];
    
    // Check system admin bypass
    if (config.systemAdminBypass !== false && user.isSystemAdmin) {
      return { success: true };
    }
    
    // Check organization admin bypass
    if (config.orgAdminBypass !== false && user.isOrgAdmin) {
      return { success: true };
    }
    
    // Check organization requirement
    if (config.organizationRequired !== false) {
      const hasOrganization = !!(user.organizationId || organization?.id);
      if (!hasOrganization) {
        return {
          success: false,
          error: 'Organization context is required for this operation'
        };
      }
    }
    
    // Check permissions
    const userPermissions = user.permissions || [];
    const hasPermissions: string[] = [];
    const missingPermissions: string[] = [];
    
    for (const permission of requiredPermissions) {
      if (this.hasPermission(userPermissions, permission)) {
        hasPermissions.push(permission);
      } else {
        missingPermissions.push(permission);
      }
    }
    
    const success = config.requireAll 
      ? missingPermissions.length === 0
      : hasPermissions.length > 0;
    
    if (!success) {
      const errorMessage = config.requireAll
        ? `Missing required permissions: ${missingPermissions.join(', ')}`
        : `At least one of these permissions is required: ${requiredPermissions.join(', ')}`;
      
      return {
        success: false,
        error: errorMessage,
        details: {
          hasPermissions,
          missingPermissions,
          isSystemAdmin: user.isSystemAdmin || false,
          isOrgAdmin: user.isOrgAdmin || false,
          hasOrganization: !!(user.organizationId || organization?.id)
        }
      };
    }
    
    return { success: true };
  }
  
  private static hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    // Exact match
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }
    
    // Wildcard match (e.g., "users:*" matches "users:read")
    const [resource, action] = requiredPermission.split(':');
    if (userPermissions.includes(`${resource}:*`)) {
      return true;
    }
    
    // Global wildcard
    if (userPermissions.includes('*:*') || userPermissions.includes('admin:all')) {
      return true;
    }
    
    return false;
  }
  
  // Convenience methods
  static validateRead(context: ActionContext, resource: string): PermissionValidationResult {
    return this.validate(context, {
      permissions: [`${resource}:read`],
      organizationRequired: true
    });
  }
  
  static validateWrite(context: ActionContext, resource: string): PermissionValidationResult {
    return this.validate(context, {
      permissions: [`${resource}:create`, `${resource}:update`],
      requireAll: false,
      organizationRequired: true
    });
  }
  
  static validateAdmin(context: ActionContext): PermissionValidationResult {
    return this.validate(context, {
      permissions: ['admin:all'],
      systemAdminBypass: true,
      orgAdminBypass: true
    });
  }
}
```

## 📊 Migration Status

### Controller Migration Progress

| Controller | Status | Progress | Actions | Tests | Notes |
|------------|--------|----------|---------|-------|-------|
| **UsersPageController** | ✅ Complete | 100% | 8/8 | ✅ | Fully migrated, all tests passing |
| **ObjectManagerPageController** | ✅ Complete | 95% | 12/12 | ✅ | Minor UI refinements needed |
| **DashboardPageController** | 🔄 Migrating | 70% | 6/10 | 🔄 | Action registration in progress |
| **TokensPageController** | 🔄 In Progress | 60% | 5/8 | 📋 | CRUD actions implemented |
| **CloudFunctionsPageController** | ✅ Complete | 90% | 7/8 | ✅ | Function management complete |
| **RoutesPageController** | ✅ Complete | 85% | 6/7 | ✅ | Route configuration complete |
| **AIAssistantPageController** | 🔄 In Progress | 50% | 3/6 | 📋 | Custom actions needed |
| **SettingsPageController** | 🔄 In Progress | 40% | 4/10 | 📋 | Configuration actions |
| **ThemePageController** | 🔄 In Progress | 45% | 3/7 | 📋 | Theme management actions |
| **AuditLogsPageController** | 🔄 In Progress | 55% | 4/7 | 📋 | Query actions implemented |
| **ReportsPageController** | 📋 Planned | 20% | 2/10 | 📋 | Basic structure only |
| **IntegrationsPageController** | 📋 Planned | 30% | 3/10 | 📋 | OAuth actions needed |
| **MarketplacePageController** | 📋 Planned | 10% | 1/12 | 📋 | App management actions |
| **NotificationsPageController** | 📋 Planned | 25% | 2/8 | 📋 | Real-time actions |
| **PageBuilderPageController** | 📋 Planned | 20% | 2/10 | 📋 | Component actions |
| **ComponentLibraryPageController** | 📋 Planned | 15% | 1/8 | 📋 | Library management |

### Migration Statistics
```
Total Controllers:        16
Completed:               4  (25%)
In Progress:             6  (37.5%)
Planned:                 6  (37.5%)

Total Actions:           142
Implemented:             85  (60%)
Remaining:               57  (40%)

Test Coverage:           68%
```

## 💡 Implementation Examples

### Complete Controller Example
```typescript
// UsersPageController.ts
import { BasePageController, PageControllerConfig } from '../base/BasePageController';
import { createAction, CRUDActionFactory } from '../base';

export class UsersPageController extends BasePageController {
  constructor() {
    const config: PageControllerConfig = {
      pageId: 'users',
      pageName: 'User Management',
      description: 'Manage organization users and permissions',
      category: 'management',
      tags: ['users', 'management', 'permissions'],
      permissions: ['users:read'],
      version: '1.0.0'
    };
    super(config);
  }

  protected initializeActions(): void {
    // Add CRUD actions using factory
    const crudActions = CRUDActionFactory.createAll({
      resource: 'Users',
      className: 'User',
      permissions: {
        read: ['users:read'],
        create: ['users:create'],
        update: ['users:update'],
        delete: ['users:delete']
      },
      fields: {
        required: ['email', 'firstName', 'lastName'],
        optional: ['bio', 'timezone', 'language'],
        readonly: ['id', 'createdAt', 'updatedAt']
      },
      hooks: {
        beforeCreate: async (data, context) => {
          // Validate email uniqueness
          const query = new Parse.Query('User');
          query.equalTo('email', data.email);
          const existing = await query.first({ useMasterKey: true });
          
          if (existing) {
            throw new Error('Email already exists');
          }
          
          return data;
        },
        afterCreate: async (user, context) => {
          //
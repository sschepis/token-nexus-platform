import {
  ActionDefinition,
  ActionParameter,
  ActionExample,
  ActionContext,
  ActionResult
} from '../types/ActionTypes';

/**
 * Fluent builder for creating action definitions
 * Provides a clean, readable way to construct actions with validation
 */
export class ActionBuilder {
  private actionDef: Partial<ActionDefinition> = {
    parameters: [],
    permissions: []
  };

  constructor(id: string, name: string) {
    this.actionDef.id = id;
    this.actionDef.name = name;
  }

  /**
   * Set the action description
   */
  description(desc: string): ActionBuilder {
    this.actionDef.description = desc;
    return this;
  }

  /**
   * Set the action category
   */
  category(cat: 'navigation' | 'data' | 'ui' | 'external'): ActionBuilder {
    this.actionDef.category = cat;
    return this;
  }

  /**
   * Add required permissions
   */
  permissions(...perms: string[]): ActionBuilder {
    this.actionDef.permissions = [...(this.actionDef.permissions || []), ...perms];
    return this;
  }

  /**
   * Add a parameter to the action
   */
  parameter(param: ActionParameter): ActionBuilder {
    if (!this.actionDef.parameters) {
      this.actionDef.parameters = [];
    }
    this.actionDef.parameters.push(param);
    return this;
  }

  /**
   * Add a string parameter with common validation
   */
  stringParam(
    name: string, 
    required: boolean = false, 
    description: string = '',
    options?: { minLength?: number; maxLength?: number; pattern?: string; enum?: string[] }
  ): ActionBuilder {
    const validation = [];
    
    if (options?.minLength !== undefined || options?.maxLength !== undefined) {
      validation.push({
        type: 'range' as const,
        min: options.minLength,
        max: options.maxLength,
        message: `${name} must be between ${options.minLength || 0} and ${options.maxLength || 'unlimited'} characters`
      });
    }
    
    if (options?.pattern) {
      validation.push({
        type: 'format' as const,
        pattern: options.pattern,
        message: `${name} format is invalid`
      });
    }
    
    if (options?.enum) {
      validation.push({
        type: 'enum' as const,
        values: options.enum,
        message: `${name} must be one of: ${options.enum.join(', ')}`
      });
    }

    return this.parameter({
      name,
      type: 'string',
      required,
      description,
      validation: validation.length > 0 ? validation : undefined
    });
  }

  /**
   * Add a number parameter with range validation
   */
  numberParam(
    name: string, 
    required: boolean = false, 
    description: string = '',
    options?: { min?: number; max?: number }
  ): ActionBuilder {
    const validation = [];
    
    if (options?.min !== undefined || options?.max !== undefined) {
      validation.push({
        type: 'range' as const,
        min: options.min,
        max: options.max,
        message: `${name} must be between ${options.min || 'unlimited'} and ${options.max || 'unlimited'}`
      });
    }

    return this.parameter({
      name,
      type: 'number',
      required,
      description,
      validation: validation.length > 0 ? validation : undefined
    });
  }

  /**
   * Add a boolean parameter
   */
  booleanParam(name: string, required: boolean = false, description: string = ''): ActionBuilder {
    return this.parameter({
      name,
      type: 'boolean',
      required,
      description
    });
  }

  /**
   * Add metadata tags
   */
  tags(...tags: string[]): ActionBuilder {
    if (!this.actionDef.metadata) {
      this.actionDef.metadata = { tags: [], examples: [], relatedActions: [] };
    }
    this.actionDef.metadata.tags = [...(this.actionDef.metadata.tags || []), ...tags];
    return this;
  }

  /**
   * Add usage examples
   */
  example(params: Record<string, unknown>, description: string, expectedResult?: unknown): ActionBuilder {
    if (!this.actionDef.metadata) {
      this.actionDef.metadata = { tags: [], examples: [], relatedActions: [] };
    }
    this.actionDef.metadata.examples.push({
      params,
      description,
      expectedResult
    });
    return this;
  }

  /**
   * Add related actions
   */
  relatedActions(...actionIds: string[]): ActionBuilder {
    if (!this.actionDef.metadata) {
      this.actionDef.metadata = { tags: [], examples: [], relatedActions: [] };
    }
    this.actionDef.metadata.relatedActions = [
      ...(this.actionDef.metadata.relatedActions || []), 
      ...actionIds
    ];
    return this;
  }

  /**
   * Mark action as deprecated
   */
  deprecated(message?: string): ActionBuilder {
    if (!this.actionDef.metadata) {
      this.actionDef.metadata = { tags: [], examples: [], relatedActions: [] };
    }
    this.actionDef.metadata.deprecated = true;
    if (message) {
      this.actionDef.metadata.deprecationMessage = message;
    }
    return this;
  }

  /**
   * Set action version
   */
  version(ver: string): ActionBuilder {
    if (!this.actionDef.metadata) {
      this.actionDef.metadata = { tags: [], examples: [], relatedActions: [] };
    }
    this.actionDef.metadata.version = ver;
    return this;
  }

  /**
   * Build the final action definition with executor
   */
  build(executor: (params: Record<string, unknown>, context: ActionContext) => Promise<ActionResult>): ActionDefinition {
    if (!this.actionDef.id || !this.actionDef.name || !this.actionDef.description || !this.actionDef.category) {
      throw new Error('Action must have id, name, description, and category');
    }

    return {
      id: this.actionDef.id,
      name: this.actionDef.name,
      description: this.actionDef.description,
      category: this.actionDef.category,
      permissions: this.actionDef.permissions || [],
      parameters: this.actionDef.parameters || [],
      execute: executor,
      metadata: this.actionDef.metadata
    };
  }
}

/**
 * Factory function to create a new ActionBuilder
 */
export function createAction(id: string, name: string): ActionBuilder {
  return new ActionBuilder(id, name);
}

/**
 * Pre-configured builders for common action patterns
 */
export class ActionBuilderPresets {
  /**
   * Create a standard data fetching action
   */
  static dataFetch(id: string, name: string, description: string): ActionBuilder {
    return createAction(id, name)
      .description(description)
      .category('data')
      .permissions('read')
      .tags('data', 'fetch');
  }

  /**
   * Create a standard data creation action
   */
  static dataCreate(id: string, name: string, description: string): ActionBuilder {
    return createAction(id, name)
      .description(description)
      .category('data')
      .permissions('write')
      .tags('data', 'create');
  }

  /**
   * Create a standard data update action
   */
  static dataUpdate(id: string, name: string, description: string): ActionBuilder {
    return createAction(id, name)
      .description(description)
      .category('data')
      .permissions('write')
      .tags('data', 'update')
      .stringParam('id', true, 'ID of the record to update');
  }

  /**
   * Create a standard data deletion action
   */
  static dataDelete(id: string, name: string, description: string): ActionBuilder {
    return createAction(id, name)
      .description(description)
      .category('data')
      .permissions('delete')
      .tags('data', 'delete')
      .stringParam('id', true, 'ID of the record to delete');
  }

  /**
   * Create a navigation action
   */
  static navigation(id: string, name: string, description: string): ActionBuilder {
    return createAction(id, name)
      .description(description)
      .category('navigation')
      .permissions('read')
      .tags('navigation');
  }

  /**
   * Create a UI interaction action
   */
  static uiAction(id: string, name: string, description: string): ActionBuilder {
    return createAction(id, name)
      .description(description)
      .category('ui')
      .permissions('read')
      .tags('ui', 'interaction');
  }
}
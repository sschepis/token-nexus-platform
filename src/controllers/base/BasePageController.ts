import {
  PageController,
  ActionDefinition,
  ActionContext,
  ActionResult,
  PageContext,
  ActionParameter,
  ActionExample
} from '../types/ActionTypes';
import Parse from 'parse';
import { ParseQueryBuilder } from '../../utils/parseUtils';

/**
 * Configuration for creating a page controller
 */
export interface PageControllerConfig {
  pageId: string;
  pageName: string;
  description: string;
  category: string;
  tags: string[];
  permissions: string[];
  version?: string;
}

/**
 * Configuration for creating an action
 */
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

/**
 * Base abstract class for all page controllers
 * Provides common functionality and reduces boilerplate code
 */
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

    // Initialize actions after construction
    this.initializeActions();
  }

  /**
   * Abstract method that subclasses must implement to register their actions
   */
  protected abstract initializeActions(): void;

  /**
   * Helper method to register an action with common error handling and validation
   */
  protected registerAction(
    config: ActionConfig,
    executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
  ): void {
    const actionDefinition: ActionDefinition = {
      id: config.id,
      name: config.name,
      description: config.description,
      category: config.category,
      permissions: config.permissions,
      parameters: config.parameters || [],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        const startTime = Date.now();
        
        try {
          // Validate organization context if required
          if (config.requiresOrganization !== false) {
            const orgValidation = this.validateOrganizationContext(context);
            if (!orgValidation.success) {
              return this.createErrorResult(
                config.id,
                context.user.userId,
                orgValidation.error!,
                startTime
              );
            }
          }

          // Execute the actual action logic
          const result = await executor(params, context);
          
          return this.createSuccessResult(
            config.id,
            context.user.userId,
            result,
            `${config.name} executed successfully`,
            startTime
          );
        } catch (error) {
          return this.createErrorResult(
            config.id,
            context.user.userId,
            error instanceof Error ? error.message : `Failed to execute ${config.name}`,
            startTime
          );
        }
      },
      metadata: config.metadata ? {
        tags: config.metadata.tags || [],
        examples: config.metadata.examples || [],
        relatedActions: config.metadata.relatedActions || [],
        version: config.metadata.version,
        deprecated: config.metadata.deprecated,
        deprecationMessage: config.metadata.deprecationMessage
      } : undefined
    };

    this.actions.set(config.id, actionDefinition);
  }

  /**
   * Validates that the user has organization context
   */
  protected validateOrganizationContext(context: ActionContext): { success: boolean; error?: string } {
    const orgId = context.user.organizationId || context.organization?.id;
    if (!orgId) {
      return {
        success: false,
        error: 'Organization ID is required for this operation'
      };
    }
    return { success: true };
  }

  /**
   * Gets the organization ID from context
   */
  protected getOrganizationId(context: ActionContext): string | null {
    return context.user.organizationId || context.organization?.id || null;
  }

  /**
   * Creates a standardized success result
   */
  protected createSuccessResult(
    actionId: string,
    userId: string,
    data: any,
    message: string,
    startTime: number
  ): ActionResult {
    return {
      success: true,
      data,
      message,
      metadata: {
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
        actionId,
        userId
      }
    };
  }

  /**
   * Creates a standardized error result
   */
  protected createErrorResult(
    actionId: string,
    userId: string,
    error: string,
    startTime: number
  ): ActionResult {
    return {
      success: false,
      error,
      metadata: {
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
        actionId,
        userId
      }
    };
  }

  /**
   * Helper method to create Parse queries with organization context
   */
  protected createOrganizationQuery(className: string, context: ActionContext): ParseQueryBuilder {
    const queryBuilder = new ParseQueryBuilder(className);
    const orgId = this.getOrganizationId(context);
    
    if (orgId) {
      // Try different organization field patterns
      queryBuilder.equalTo('organizationId', orgId);
    }
    
    return queryBuilder;
  }

  /**
   * Helper method to safely execute Parse queries with error handling
   */
  protected async executeQuery<T extends Parse.Object>(
    queryBuilder: ParseQueryBuilder,
    operation: 'find' | 'first' | 'count' = 'find'
  ): Promise<T[] | T | number | null> {
    try {
      switch (operation) {
        case 'find':
          return await queryBuilder.find() as T[];
        case 'first':
          return await queryBuilder.first() as T;
        case 'count':
          return await queryBuilder.count();
        default:
          throw new Error(`Unknown query operation: ${operation}`);
      }
    } catch (error) {
      console.warn(`[${this.pageId}] Query execution failed:`, error);
      if (operation === 'find') return [];
      if (operation === 'count') return 0;
      return null;
    }
  }

  /**
   * Helper method to get action by ID
   */
  public getAction(actionId: string): ActionDefinition | undefined {
    return this.actions.get(actionId);
  }

  /**
   * Helper method to get all actions
   */
  public getAllActions(): ActionDefinition[] {
    return Array.from(this.actions.values());
  }

  /**
   * Helper method to get actions by category
   */
  public getActionsByCategory(category: string): ActionDefinition[] {
    return this.getAllActions().filter(action => action.category === category);
  }

  /**
   * Helper method to get actions by permission
   */
  public getActionsByPermission(permission: string): ActionDefinition[] {
    return this.getAllActions().filter(action => 
      action.permissions.includes(permission)
    );
  }

  /**
   * Helper method to register a complete ActionDefinition object
   * This is useful for modular action systems where actions are pre-defined
   */
  protected registerActionDefinition(actionDefinition: ActionDefinition): void {
    this.actions.set(actionDefinition.id, actionDefinition);
  }

  /**
   * Lifecycle method called when controller is initialized
   */
  public initialize(): void {
    // Override in subclasses if needed
  }

  /**
   * Lifecycle method called when controller is destroyed
   */
  public destroy(): void {
    // Override in subclasses if needed
    this.actions.clear();
  }
}
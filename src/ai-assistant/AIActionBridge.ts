// src/ai-assistant/AIActionBridge.ts

import {
  ActionDefinition,
  UserContext,
  ActionContext,
  ActionResult,
  ActionDiscoveryQuery,
  ActionDiscoveryResult,
  AIToolDefinition,
  NavigationContext
} from '../controllers/types/ActionTypes';
import { ToolDefinition, UserContext as AIUserContext } from './types';
import { ControllerRegistry } from '../controllers/ControllerRegistry';
import { controllerRegistry } from '../controllers/registerControllers';
import { MCPIntegrationService } from './MCPIntegrationService';

/**
 * Bridge between the Controller Registry and AI Assistant
 * Converts actions to AI tools and handles AI-initiated action execution
 */
export class AIActionBridge {
  private registry: ControllerRegistry;
  private mcpService: MCPIntegrationService;

  constructor(registry: ControllerRegistry = controllerRegistry) {
    this.registry = registry;
    this.mcpService = new MCPIntegrationService();
  }

  /**
   * Set the organization context for MCP integration
   */
  setOrganizationContext(organizationId: string): void {
    this.mcpService.setOrganizationId(organizationId);
  }

  /**
   * Generate AI tool definitions from all registered actions and MCP servers
   */
  async generateToolDefinitions(): Promise<ToolDefinition[]> {
    const toolDefinitions: ToolDefinition[] = [];
    
    // Add page controller actions
    const pageControllers = this.registry.getPageControllers();
    pageControllers.forEach((pageController, pageId) => {
      pageController.actions.forEach((action, actionId) => {
        const fullActionId = `${pageId}.${actionId}`;
        const toolDefinition = this.convertActionToTool(fullActionId, action, pageId);
        toolDefinitions.push(toolDefinition);
      });
    });

    // Add MCP tools
    try {
      const mcpTools = await this.mcpService.generateMCPToolDefinitions();
      toolDefinitions.push(...mcpTools);
    } catch (error) {
      console.error('Error loading MCP tools:', error);
    }

    return toolDefinitions;
  }

  /**
   * Generate AI tool definitions for a specific page
   */
  async generateToolDefinitionsForPage(pageId: string): Promise<ToolDefinition[]> {
    const pageActions = this.registry.getPageActions(pageId);
    if (!pageActions) {
      return [];
    }

    const toolDefinitions: ToolDefinition[] = [];
    pageActions.forEach((action, actionId) => {
      const fullActionId = `${pageId}.${actionId}`;
      const toolDefinition = this.convertActionToTool(fullActionId, action, pageId);
      toolDefinitions.push(toolDefinition);
    });

    // If this is the MCP servers page, also include MCP tools
    if (pageId === 'mcp-servers') {
      try {
        const mcpTools = await this.mcpService.generateMCPToolDefinitions();
        toolDefinitions.push(...mcpTools);
      } catch (error) {
        console.error('Error loading MCP tools for page:', error);
      }
    }

    return toolDefinitions;
  }

  /**
   * Execute an action on behalf of the AI
   */
  async executeActionForAI(
    actionId: string,
    params: Record<string, unknown>,
    userContext: UserContext,
    additionalContext?: Partial<ActionContext>
  ): Promise<ActionResult> {
    try {
      // Validate that the action exists
      const action = this.registry.getAction(actionId);
      if (!action) {
        return {
          success: false,
          error: `Action ${actionId} not found`,
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId,
            userId: userContext.userId
          }
        };
      }

      // Check permissions
      const permissionManager = this.registry.getPermissionManager();
      if (!permissionManager.canExecuteAction(actionId, userContext)) {
        return {
          success: false,
          error: `Permission denied for action ${actionId}`,
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId,
            userId: userContext.userId
          }
        };
      }

      // Build action context
      const context = this.buildActionContext(userContext, actionId, additionalContext);

      // Execute the action
      const result = await this.registry.executeAction(actionId, params, context);

      // Add AI execution metadata
      result.metadata = {
        ...result.metadata,
        executedByAI: true,
        aiExecutionTimestamp: new Date()
      };

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId,
          userId: userContext.userId,
          executedByAI: true,
          aiExecutionTimestamp: new Date()
        }
      };
    }
  }

  /**
   * Discover actions based on natural language query
   */
  discoverActions(query: ActionDiscoveryQuery): ActionDiscoveryResult {
    return this.registry.discoverActions(query);
  }

  /**
   * Get action context for a specific page
   */
  getActionContext(pageId: string): Partial<ActionContext> {
    const pageController = this.registry.getPageController(pageId);
    if (!pageController) {
      return {};
    }

    return {
      page: pageController.context,
      timestamp: new Date()
    };
  }

  /**
   * Validate if an action can be executed by AI
   */
  validateActionExecution(
    actionId: string,
    params: Record<string, unknown>,
    userContext: UserContext
  ): { valid: boolean; reason?: string; requiresApproval: boolean } {
    const action = this.registry.getAction(actionId);
    if (!action) {
      return {
        valid: false,
        reason: `Action ${actionId} not found`,
        requiresApproval: false
      };
    }

    const permissionManager = this.registry.getPermissionManager();
    
    // Check permissions
    if (!permissionManager.canExecuteAction(actionId, userContext)) {
      return {
        valid: false,
        reason: 'Insufficient permissions',
        requiresApproval: false
      };
    }

    // Check if approval is required
    const requiresApproval = permissionManager.requiresApproval(actionId, userContext);

    return {
      valid: true,
      requiresApproval
    };
  }

  /**
   * Get available actions for a user context
   */
  getAvailableActionsForUser(userContext: UserContext): ActionDefinition[] {
    return this.registry.getAvailableActions(userContext);
  }

  /**
   * Get action suggestions based on current context
   */
  getActionSuggestions(
    userContext: UserContext,
    currentPageId?: string,
    limit: number = 5
  ): ActionDefinition[] {
    const availableActions = this.getAvailableActionsForUser(userContext);
    
    // Prioritize actions from current page
    if (currentPageId) {
      const pageActions = availableActions.filter(action => 
        this.getPageIdFromAction(action) === currentPageId
      );
      const otherActions = availableActions.filter(action => 
        this.getPageIdFromAction(action) !== currentPageId
      );
      
      return [...pageActions.slice(0, Math.ceil(limit / 2)), ...otherActions]
        .slice(0, limit);
    }

    return availableActions.slice(0, limit);
  }

  /**
   * Convert action definition to AI tool definition
   */
  private convertActionToTool(
    fullActionId: string,
    action: ActionDefinition,
    pageId: string
  ): ToolDefinition {
    // Build parameters schema
    const parametersSchema: Record<string, unknown> = {
      type: 'object',
      properties: {},
      required: []
    };

    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    action.parameters.forEach(param => {
      properties[param.name] = {
        type: param.type,
        description: param.description,
        ...(param.defaultValue !== undefined && { default: param.defaultValue }),
        ...(param.examples && { examples: param.examples })
      };

      if (param.required) {
        required.push(param.name);
      }
    });

    parametersSchema.properties = properties;
    if (required.length > 0) {
      parametersSchema.required = required;
    }

    // Build output schema
    const outputSchema = {
      type: 'object',
      properties: {
        success: { type: 'boolean', description: 'Whether the action succeeded' },
        data: { type: 'object', description: 'Action result data' },
        message: { type: 'string', description: 'Human-readable result message' },
        error: { type: 'string', description: 'Error message if action failed' }
      }
    };

    return {
      name: fullActionId.replace(/[^a-zA-Z0-9_]/g, '_'), // Sanitize for AI tool name
      description: this.buildToolDescription(action, pageId),
      parametersSchema,
      outputSchema,
      execute: async (args: Record<string, unknown>, userContext: AIUserContext) => {
        // Convert AI UserContext to Controller UserContext
        const controllerUserContext: UserContext = {
          userId: userContext.userId,
          username: userContext.userId, // Fallback
          email: userContext.userId, // Fallback
          roles: userContext.roles,
          permissions: [], // AI UserContext doesn't have permissions field
          organizationId: userContext.orgId,
          organizationRoles: []
        };
        return this.executeActionForAI(fullActionId, args, controllerUserContext);
      }
    };
  }

  /**
   * Build comprehensive tool description for AI
   */
  private buildToolDescription(action: ActionDefinition, pageId: string): string {
    let description = `${action.description}`;
    
    // Add page context
    description += ` (Page: ${pageId})`;
    
    // Add category
    description += ` [Category: ${action.category}]`;
    
    // Add examples if available
    if (action.metadata?.examples && action.metadata.examples.length > 0) {
      description += ` Examples: ${action.metadata.examples.map(ex => ex.description).join(', ')}`;
    }
    
    // Add tags if available
    if (action.metadata?.tags && action.metadata.tags.length > 0) {
      description += ` Tags: ${action.metadata.tags.join(', ')}`;
    }

    return description;
  }

  /**
   * Build action context for AI execution
   */
  private buildActionContext(
    userContext: UserContext,
    actionId: string,
    additionalContext?: Partial<ActionContext>
  ): ActionContext {
    const pageId = this.extractPageIdFromActionId(actionId);
    const pageController = this.registry.getPageController(pageId);

    // Build basic context
    const context: ActionContext = {
      user: userContext,
      page: pageController?.context || {
        pageId: 'unknown',
        pageName: 'Unknown Page',
        state: {},
        props: {},
        metadata: {
          category: 'unknown',
          tags: [],
          permissions: []
        }
      },
      navigation: {
        router: {} as NavigationContext['router'], // AI doesn't have direct router access
        currentPath: '/',
        breadcrumbs: []
      },
      timestamp: new Date(),
      ...additionalContext
    };

    return context;
  }

  /**
   * Extract page ID from full action ID
   */
  private extractPageIdFromActionId(actionId: string): string {
    const parts = actionId.split('.');
    return parts.length > 1 ? parts[0] : 'unknown';
  }

  /**
   * Get page ID from action definition (helper method)
   */
  private getPageIdFromAction(action: ActionDefinition): string {
    // This is a simplified approach - in a real implementation,
    // you might want to store page ID in action metadata
    const pageControllers = this.registry.getPageControllers();
    
    pageControllers.forEach((controller, pageId) => {
      if (controller.actions.has(action.id)) {
        return pageId;
      }
    });
    
    return 'unknown';
  }

  /**
   * Get registry statistics for AI context
   */
  getRegistryStatistics() {
    return this.registry.getStatistics();
  }

  /**
   * Search actions by natural language
   */
  searchActionsByNaturalLanguage(
    query: string,
    userContext: UserContext,
    limit: number = 10
  ): ActionDefinition[] {
    const discoveryQuery: ActionDiscoveryQuery = {
      query,
      limit
    };

    const result = this.discoverActions(discoveryQuery);
    
    // Filter by user permissions
    return result.actions.filter(action => {
      const pageId = this.getPageIdFromAction(action);
      const fullActionId = `${pageId}.${action.id}`;
      return this.registry.getPermissionManager().canExecuteAction(fullActionId, userContext);
    });
  }
}

// Export singleton instance
export const aiActionBridge = new AIActionBridge();

/**
 * Helper function to create AI tool definitions from current registry state
 */
export const generateAIToolDefinitions = async (): Promise<ToolDefinition[]> => {
  return await aiActionBridge.generateToolDefinitions();
};

/**
 * Helper function to execute action from AI with error handling
 */
export const executeActionFromAI = async (
  actionId: string,
  params: Record<string, unknown>,
  userContext: UserContext
): Promise<ActionResult> => {
  return aiActionBridge.executeActionForAI(actionId, params, userContext);
};
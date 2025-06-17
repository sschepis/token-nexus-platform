// src/controllers/ControllerRegistry.ts

import { PageController } from './types/pageController';
import { ActionDefinition, ActionParameter, ActionExample, ActionExecutor, ValidationRule } from './types/actionDefinitions';
import { ActionContext, UserContext, OrganizationContext, NavigationContext, PageContext } from './types/actionContexts';
import { ActionResult, ValidationResult } from './types/actionResults';
import { PermissionResult, ApprovalStep, EscalationRule, ApprovalWorkflow } from './types/permissionsAndApprovals';
import { ActionEvent, ActionEventType, ActionEventListener } from './types/actionEvents';
import { ControllerRegistryConfig } from './types/controllerRegistryConfig';
import { ActionDiscoveryQuery, ActionDiscoveryResult } from './types/actionDiscovery';
import { AIToolDefinition } from './types/aiToolDefinition'; // Assuming this is needed here.
import { PermissionManager, permissionManager } from './PermissionManager';

/**
 * Central registry for managing page controllers and their actions
 */
export class ControllerRegistry {
  private pageControllers: Map<string, PageController> = new Map();
  private actionIndex: Map<string, { pageId: string; action: ActionDefinition }> = new Map();
  private eventListeners: ActionEventListener[] = [];
  private permissionManager: PermissionManager;
  private config: ControllerRegistryConfig;

  constructor(
    permissionManagerInstance: PermissionManager = permissionManager,
    config: Partial<ControllerRegistryConfig> = {}
  ) {
    this.permissionManager = permissionManagerInstance;
    this.config = {
      enableAuditLogging: true,
      enablePermissionChecking: true,
      enableApprovalWorkflows: true,
      defaultTimeout: 30000, // 30 seconds
      maxActionsPerPage: 50,
      eventListeners: [],
      ...config
    };

    // Register default event listeners
    this.config.eventListeners.forEach(listener => {
      this.addEventListener(listener);
    });
  }

  /**
   * Register a page controller
   */
  registerPageController(pageController: PageController): void {
    // Validate page controller
    if (!pageController.pageId || !pageController.pageName) {
      throw new Error('Page controller must have pageId and pageName');
    }

    if (this.pageControllers.has(pageController.pageId)) {
      console.warn(`Page controller ${pageController.pageId} is already registered. Updating...`);
    }

    // Check action limit
    if (pageController.actions.size > this.config.maxActionsPerPage) {
      throw new Error(`Page controller ${pageController.pageId} exceeds maximum actions limit (${this.config.maxActionsPerPage})`);
    }

    // Register the page controller
    this.pageControllers.set(pageController.pageId, pageController);

    // Index all actions for quick lookup
    pageController.actions.forEach((action, actionId) => {
      const fullActionId = `${pageController.pageId}.${actionId}`;
      console.log(`[DEBUG ControllerRegistry] Indexing action: ${fullActionId}`);
      this.actionIndex.set(fullActionId, {
        pageId: pageController.pageId,
        action
      });
    });
    
    console.log(`[DEBUG ControllerRegistry] Total actions indexed: ${this.actionIndex.size}`);
    console.log(`[DEBUG ControllerRegistry] All indexed actions:`, Array.from(this.actionIndex.keys()));

    // Emit registration event
    this.emitEvent({
      type: 'action_registered',
      actionId: pageController.pageId,
      pageId: pageController.pageId,
      userId: 'system',
      timestamp: new Date(),
      data: {
        pageName: pageController.pageName,
        actionCount: pageController.actions.size
      }
    });

    console.log(`Registered page controller: ${pageController.pageId} with ${pageController.actions.size} actions`);
  }

  /**
   * Unregister a page controller
   */
  unregisterPageController(pageId: string): void {
    const pageController = this.pageControllers.get(pageId);
    if (!pageController) {
      console.warn(`Page controller ${pageId} not found for unregistration`);
      return;
    }

    // Remove actions from index
    pageController.actions.forEach((_, actionId) => {
      const fullActionId = `${pageId}.${actionId}`;
      this.actionIndex.delete(fullActionId);
    });

    // Remove page controller
    this.pageControllers.delete(pageId);

    // Emit unregistration event
    this.emitEvent({
      type: 'action_unregistered',
      actionId: pageId,
      pageId: pageId,
      userId: 'system',
      timestamp: new Date(),
      data: {
        pageName: pageController.pageName
      }
    });

    console.log(`Unregistered page controller: ${pageId}`);
  }

  /**
   * Register a single action to an existing page controller
   */
  registerAction(pageId: string, action: ActionDefinition): void {
    const pageController = this.pageControllers.get(pageId);
    if (!pageController) {
      throw new Error(`Page controller ${pageId} not found. Register the page controller first.`);
    }

    // Validate action
    this.validateAction(action);

    // Check action limit
    if (pageController.actions.size >= this.config.maxActionsPerPage) {
      throw new Error(`Page controller ${pageId} has reached maximum actions limit (${this.config.maxActionsPerPage})`);
    }

    // Add action to page controller
    pageController.actions.set(action.id, action);

    // Index action for quick lookup
    const fullActionId = `${pageId}.${action.id}`;
    this.actionIndex.set(fullActionId, {
      pageId,
      action
    });

    console.log(`Registered action: ${fullActionId}`);
  }

  /**
   * Unregister a single action
   */
  unregisterAction(pageId: string, actionId: string): void {
    const pageController = this.pageControllers.get(pageId);
    if (!pageController) {
      console.warn(`Page controller ${pageId} not found`);
      return;
    }

    // Remove from page controller
    pageController.actions.delete(actionId);

    // Remove from index
    const fullActionId = `${pageId}.${actionId}`;
    this.actionIndex.delete(fullActionId);

    console.log(`Unregistered action: ${fullActionId}`);
  }

  /**
   * Execute an action
   */
  async executeAction(
    actionId: string,
    params: Record<string, unknown>,
    context: ActionContext
  ): Promise<ActionResult> {
    const startTime = Date.now();

    try {
      // Find action
      const actionEntry = this.actionIndex.get(actionId);
      if (!actionEntry) {
        throw new Error(`Action ${actionId} not found`);
      }

      const { pageId, action } = actionEntry;

      // Validate parameters
      const validationResult = this.validateActionParameters(action, params);
      if (!validationResult.valid) {
        const errorMessage = `Parameter validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`;
        throw new Error(errorMessage);
      }

      // Check permissions
      if (this.config.enablePermissionChecking) {
        const permissionResult = this.permissionManager.validateActionPermissions(action, context.user);
        if (!permissionResult.allowed) {
          this.permissionManager.emitPermissionDenied(actionId, context.user, permissionResult.reason || 'Permission denied');
          throw new Error(permissionResult.reason || 'Permission denied');
        }
      }

      // Check if approval is required
      if (this.config.enableApprovalWorkflows && this.permissionManager.requiresApproval(actionId, context.user)) {
        // TODO: Implement approval workflow handling
        // For now, throw an error indicating approval is required
        throw new Error(`Action ${actionId} requires approval workflow`);
      }

      // Execute action with timeout
      const executionPromise = action.execute(params, context);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Action execution timeout')), this.config.defaultTimeout);
      });

      const result = await Promise.race([executionPromise, timeoutPromise]);

      // Add execution metadata
      const executionTime = Date.now() - startTime;
      const finalResult: ActionResult = {
        ...result,
        metadata: {
          executionTime,
          timestamp: new Date(),
          actionId,
          userId: context.user.userId,
          ...result.metadata
        }
      };

      // Audit logging
      if (this.config.enableAuditLogging) {
        this.permissionManager.auditActionExecution(actionId, params, finalResult, context.user);
      }

      // Emit success event
      this.emitEvent({
        type: 'action_executed',
        actionId,
        pageId,
        userId: context.user.userId,
        timestamp: new Date(),
        data: {
          params,
          result: finalResult,
          executionTime
        }
      });

      return finalResult;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Create error result
      const errorResult: ActionResult = {
        success: false,
        error: errorMessage,
        metadata: {
          executionTime,
          timestamp: new Date(),
          actionId,
          userId: context.user.userId
        }
      };

      // Audit logging for errors
      if (this.config.enableAuditLogging) {
        this.permissionManager.auditActionExecution(actionId, params, errorResult, context.user, errorMessage);
      }

      // Emit failure event
      const actionEntry = this.actionIndex.get(actionId);
      this.emitEvent({
        type: 'action_failed',
        actionId,
        pageId: actionEntry?.pageId || 'unknown',
        userId: context.user.userId,
        timestamp: new Date(),
        data: {
          params,
          executionTime
        },
        error: errorMessage
      });

      throw error;
    }
  }

  /**
   * Get all registered page controllers
   */
  getPageControllers(): Map<string, PageController> {
    return new Map(this.pageControllers);
  }

  /**
   * Get a specific page controller
   */
  getPageController(pageId: string): PageController | undefined {
    return this.pageControllers.get(pageId);
  }

  /**
   * Get all actions for a page
   */
  getPageActions(pageId: string): Map<string, ActionDefinition> | undefined {
    const pageController = this.pageControllers.get(pageId);
    return pageController ? new Map(pageController.actions) : undefined;
  }

  /**
   * Get a specific action
   */
  getAction(actionId: string): ActionDefinition | undefined {
    const actionEntry = this.actionIndex.get(actionId);
    return actionEntry?.action;
  }

  /**
   * Get all available actions for a user
   */
  getAvailableActions(userContext: UserContext): ActionDefinition[] {
    const availableActions: ActionDefinition[] = [];

    this.actionIndex.forEach(({ action }, actionId) => {
      if (this.permissionManager.canExecuteAction(actionId, userContext)) {
        availableActions.push(action);
      }
    });

    return availableActions;
  }

  /**
   * Discover actions based on query
   */
  discoverActions(query: ActionDiscoveryQuery): ActionDiscoveryResult {
    const { query: searchQuery, category, permissions, pageId, tags, limit = 10 } = query;
    
    const candidateActions: Array<{ actionId: string; action: ActionDefinition; pageId: string }> = [];

    // Collect candidate actions
    this.actionIndex.forEach(({ pageId: actionPageId, action }, actionId) => {
      // Filter by page if specified
      if (pageId && actionPageId !== pageId) {
        return;
      }

      // Filter by category if specified
      if (category && action.category !== category) {
        return;
      }

      // Filter by permissions if specified
      if (permissions && !permissions.some(perm => action.permissions.includes(perm))) {
        return;
      }

      // Filter by tags if specified
      if (tags && action.metadata?.tags) {
        const hasMatchingTag = tags.some(tag => action.metadata!.tags.includes(tag));
        if (!hasMatchingTag) {
          return;
        }
      }

      candidateActions.push({ actionId, action, pageId: actionPageId });
    });

    // Score actions based on search query
    const scoredActions = candidateActions.map(({ actionId, action, pageId }) => {
      const score = this.calculateActionScore(action, searchQuery);
      return { actionId, action, pageId, score };
    });

    // Sort by score and limit results
    scoredActions.sort((a, b) => b.score - a.score);
    const topActions = scoredActions.slice(0, limit);

    // Generate suggestions and related queries
    const suggestions = this.generateActionSuggestions(topActions.map(a => a.action));
    const relatedQueries = this.generateRelatedQueries(searchQuery, topActions.map(a => a.action));

    return {
      actions: topActions.map(a => a.action),
      confidence: topActions.length > 0 ? topActions[0].score : 0,
      suggestions,
      relatedQueries
    };
  }

  /**
   * Add event listener
   */
  addEventListener(listener: ActionEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: ActionEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Get registry statistics
   */
  getStatistics() {
    const totalPages = this.pageControllers.size;
    const totalActions = this.actionIndex.size;
    const actionsByCategory: Record<string, number> = {};
    const actionsByPage: Record<string, number> = {};

    this.actionIndex.forEach(({ pageId, action }) => {
      // Count by category
      actionsByCategory[action.category] = (actionsByCategory[action.category] || 0) + 1;
      
      // Count by page
      actionsByPage[pageId] = (actionsByPage[pageId] || 0) + 1;
    });

    // Return a plain serializable object
    return JSON.parse(JSON.stringify({
      totalPages,
      totalActions,
      actionsByCategory,
      actionsByPage,
      averageActionsPerPage: totalPages > 0 ? totalActions / totalPages : 0
    }));
  }

  /**
   * Validate action definition
   */
  private validateAction(action: ActionDefinition): void {
    if (!action.id || !action.name || !action.description) {
      throw new Error('Action must have id, name, and description');
    }

    if (!action.execute || typeof action.execute !== 'function') {
      throw new Error('Action must have a valid execute function');
    }

    if (!['navigation', 'data', 'ui', 'external'].includes(action.category)) {
      throw new Error('Action category must be one of: navigation, data, ui, external');
    }
  }

  /**
   * Validate action parameters
   */
  private validateActionParameters(action: ActionDefinition, params: Record<string, unknown>): ValidationResult {
    const errors: Array<{ parameter: string; message: string; value: unknown }> = [];

    // Check required parameters
    action.parameters.forEach(param => {
      const value = params[param.name];

      if (param.required && (value === undefined || value === null)) {
        errors.push({
          parameter: param.name,
          message: `Required parameter '${param.name}' is missing`,
          value
        });
        return;
      }

      if (value !== undefined && value !== null) {
        // Type validation
        if (!this.validateParameterType(value, param.type)) {
          errors.push({
            parameter: param.name,
            message: `Parameter '${param.name}' must be of type ${param.type}`,
            value
          });
        }

        // Custom validation rules
        if (param.validation) {
          param.validation.forEach(rule => {
            const validationError = this.validateParameterRule(value, rule, param.name);
            if (validationError) {
              errors.push(validationError);
            }
          });
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate parameter type
   */
  private validateParameterType(value: unknown, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * Validate parameter against a rule
   */
  private validateParameterRule(
    value: unknown,
    rule: ValidationRule,
    paramName: string
  ): { parameter: string; message: string; value: unknown } | null {
    switch (rule.type) {
      case 'format':
        if (typeof value === 'string' && rule.pattern) {
          const regex = new RegExp(rule.pattern);
          if (!regex.test(value)) {
            return {
              parameter: paramName,
              message: rule.message || `Parameter '${paramName}' does not match required format`,
              value
            };
          }
        }
        break;

      case 'enum':
        if (rule.values && !rule.values.includes(value as string | number)) {
          return {
            parameter: paramName,
            message: rule.message || `Parameter '${paramName}' must be one of: ${rule.values.join(', ')}`,
            value
          };
        }
        break;

      case 'range':
        if (typeof value === 'number') {
          if (rule.min !== undefined && value < rule.min) {
            return {
              parameter: paramName,
              message: rule.message || `Parameter '${paramName}' must be at least ${rule.min}`,
              value
            };
          }
          if (rule.max !== undefined && value > rule.max) {
            return {
              parameter: paramName,
              message: rule.message || `Parameter '${paramName}' must be at most ${rule.max}`,
              value
            };
          }
        }
        break;

      case 'custom':
        if (rule.customValidator && typeof rule.customValidator === 'function') {
          const result = rule.customValidator(value);
          if (result !== true) {
            return {
              parameter: paramName,
              message: typeof result === 'string' ? result : (rule.message || `Parameter '${paramName}' failed custom validation`),
              value
            };
          }
        }
        break;
    }

    return null;
  }

  /**
   * Calculate action score for search query
   */
  private calculateActionScore(action: ActionDefinition, query: string): number {
    const queryLower = query.toLowerCase();
    let score = 0;

    // Name match (highest weight)
    if (action.name.toLowerCase().includes(queryLower)) {
      score += 10;
    }

    // Description match
    if (action.description.toLowerCase().includes(queryLower)) {
      score += 5;
    }

    // Tag match
    if (action.metadata?.tags) {
      action.metadata.tags.forEach(tag => {
        if (tag.toLowerCase().includes(queryLower)) {
          score += 3;
        }
      });
    }

    // Category match
    if (action.category.toLowerCase().includes(queryLower)) {
      score += 2;
    }

    // ID match
    if (action.id.toLowerCase().includes(queryLower)) {
      score += 1;
    }

    return score;
  }

  /**
   * Generate action suggestions
   */
  private generateActionSuggestions(actions: ActionDefinition[]): string[] {
    const suggestions: string[] = [];
    
    actions.forEach(action => {
      if (action.metadata?.examples) {
        action.metadata.examples.forEach(example => {
          suggestions.push(example.description);
        });
      }
    });

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  /**
   * Generate related queries
   */
  private generateRelatedQueries(originalQuery: string, actions: ActionDefinition[]): string[] {
    const relatedQueries: string[] = [];
    const categories = new Set(actions.map(a => a.category));
    
    categories.forEach(category => {
      relatedQueries.push(`${category} actions`);
    });

    return relatedQueries.slice(0, 3); // Limit to 3 related queries
  }

  /**
   * Get the permission manager instance
   */
  getPermissionManager(): PermissionManager {
    return this.permissionManager;
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: ActionEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in action event listener:', error);
      }
    });
  }
}

// Export singleton instance
export const controllerRegistry = new ControllerRegistry();
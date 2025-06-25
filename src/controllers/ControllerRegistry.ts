// src/controllers/ControllerRegistry.ts

import { PageController } from './types/pageController';
import { ActionDefinition } from './types/actionDefinitions';
import { ActionContext, UserContext } from './types/actionContexts';
import { ActionResult, ValidationResult } from './types/actionResults'; // Keep ValidationResult for method signature
import { PermissionManager, permissionManager } from './PermissionManager';
import { ControllerRegistryConfig } from './types/controllerRegistryConfig';
import { ActionDiscoveryQuery, ActionDiscoveryResult } from './types/actionDiscovery';
import { ActionEvent, ActionEventListener } from './types/actionEvents'; // Keep for constructor config

// Import the new services
import { ActionValidationService, actionValidationService } from './services/ActionValidationService';
import { ActionDiscoveryService, actionDiscoveryService } from './services/ActionDiscoveryService';
import { ActionEventEmitter, actionEventEmitter } from './services/ActionEventEmitter';

/**
 * Central registry for managing page controllers and their actions
 */
export class ControllerRegistry {
  private pageControllers: Map<string, PageController> = new Map();
  private actionIndex: Map<string, { pageId: string; action: ActionDefinition }> = new Map();
  private permissionManager: PermissionManager;
  private config: ControllerRegistryConfig;

  // Inject services
  private actionValidationService: ActionValidationService;
  private actionDiscoveryService: ActionDiscoveryService;
  private actionEventEmitter: ActionEventEmitter;

  constructor(
    permissionManagerInstance: PermissionManager = permissionManager,
    config: Partial<ControllerRegistryConfig> = {},
    actionValidationServiceInstance: ActionValidationService = actionValidationService,
    actionDiscoveryServiceInstance: ActionDiscoveryService = actionDiscoveryService,
    actionEventEmitterInstance: ActionEventEmitter = actionEventEmitter
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

    this.actionValidationService = actionValidationServiceInstance;
    this.actionDiscoveryService = actionDiscoveryServiceInstance;
    this.actionEventEmitter = actionEventEmitterInstance;

    // Set registry reference in permission manager
    this.permissionManager.setRegistry(this);

    // Register default event listeners
    this.config.eventListeners.forEach(listener => {
      this.actionEventEmitter.addEventListener(listener);
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
      this.actionIndex.set(fullActionId, {
        pageId: pageController.pageId,
        action
      });
    });
    this.actionEventEmitter.emitEvent({
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
    this.actionEventEmitter.emitEvent({
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
    this.actionValidationService.validateAction(action);

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
      const validationResult = this.actionValidationService.validateActionParameters(action, params);
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
      this.actionEventEmitter.emitEvent({
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
      this.actionEventEmitter.emitEvent({
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
   * For debugging: Returns all registered action IDs.
   */
  public getAllRegisteredActionIds(): string[] {
    return Array.from(this.actionIndex.keys());
  }

  /**
   * Discover actions based on query
   */
  discoverActions(query: ActionDiscoveryQuery): ActionDiscoveryResult {
    return this.actionDiscoveryService.discoverActions(this.actionIndex, query);
  }

  /**
   * Add event listener
   */
  addEventListener(listener: ActionEventListener): void {
    this.actionEventEmitter.addEventListener(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: ActionEventListener): void {
    this.actionEventEmitter.removeEventListener(listener);
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
   * Check if user can execute a specific action
   */
  canExecuteAction(actionId: string, userContext: UserContext): boolean {
    return this.permissionManager.canExecuteAction(actionId, userContext);
  }

  /**
   * Get the permission manager instance
   */
  getPermissionManager(): PermissionManager {
    return this.permissionManager;
  }

  /**
   * Check if action requires approval
   */
  requiresApproval(actionId: string, userContext: UserContext): boolean {
    return this.permissionManager.requiresApproval(actionId, userContext);
  }
}
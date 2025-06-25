// src/controllers/PermissionManager.ts

import {
  UserContext,
  ActionDefinition,
  PermissionResult,
  ApprovalWorkflow,
  ActionContext,
  ActionEvent,
  ActionEventType,
  ActionEventListener
} from './types/ActionTypes';
import { getRolePermissions } from './permissionManager/data/RolePermissions';
import { hasRequiredPermissions, expandRolePermissions } from './permissionManager/utils/PermissionUtils'; // Import expandRolePermissions
import { ApprovalWorkflowService, approvalWorkflowService } from './permissionManager/workflow/ApprovalWorkflowService';
import { AuditLogger, auditLogger } from './permissionManager/audit/AuditLogger';
import { ActionEventEmitter, actionEventEmitter as globalActionEventEmitter } from './services/ActionEventEmitter'; // Correctly import AEE, rename singleton to avoid conflict

/**
 * Manages permissions and approval workflows for actions
 */
export class PermissionManager {
  private approvalWorkflowService: ApprovalWorkflowService;
  private auditLogger: AuditLogger;
  private eventListeners: ActionEventListener[] = [];
  private registry?: any; // Will be set by ControllerRegistry
  private actionEventEmitter: ActionEventEmitter; // Declare the property

  constructor(
    auditEnabled: boolean = true,
    approvalWorkflowServiceInstance: ApprovalWorkflowService = approvalWorkflowService,
    auditLoggerInstance: AuditLogger = auditLogger,
    actionEventEmitterInstance: ActionEventEmitter = globalActionEventEmitter // Inject AEE, use renamed singleton
  ) {
    this.auditLogger = new AuditLogger(auditEnabled); // Use the auditEnabled to configure the AuditLogger
    this.approvalWorkflowService = approvalWorkflowServiceInstance;
    this.actionEventEmitter = actionEventEmitterInstance; // Assign injected AEE
  }

  /**
   * Set the controller registry reference
   */
  setRegistry(registry: any): void {
    this.registry = registry;
  }

  /**
   * Check if user can execute a specific action
   */
  canExecuteAction(actionId: string, userContext: UserContext): boolean {
    // System admin can execute all actions
    if (userContext.isAdmin) {
      return true; // Admin users can execute all actions
    }

    // Check if user has any of the required permissions
    const action = this.getActionById(actionId);
    if (!action) {
      return false; // Action not found, cannot execute
    }

    // Use the external utility function
    return hasRequiredPermissions(action.permissions, userContext);
  }

  /**
   * Validate action permissions and return detailed result
   */
  validateActionPermissions(action: ActionDefinition, userContext: UserContext): PermissionResult {
    const requiredPermissions = action.permissions;

    // System admin bypass
    if (userContext.isAdmin) {
      return {
        allowed: true,
        reason: undefined,
        requiredPermissions,
        missingPermissions: []
      };
    }

    // Use the external utility function
    const allowed = hasRequiredPermissions(requiredPermissions, userContext);
    
    if (allowed) {
      return {
        allowed: true,
        reason: undefined,
        requiredPermissions,
        missingPermissions: []
      };
    } else {
      // Re-evaluate missing permissions for the detailed error message
      const userPermissions = new Set([
        ...userContext.permissions,
        ...userContext.roles,
        ...expandRolePermissions(userContext.roles) // Use imported function
      ]);
      const missingPermissions = requiredPermissions.filter(p => !userPermissions.has(p));
      return {
        allowed: false,
        reason: `Missing required permissions: ${missingPermissions.join(', ')}`,
        requiredPermissions,
        missingPermissions
      };
    }
  }

  /**
   * Check if action requires approval workflow
   */
  requiresApproval(actionId: string, userContext: UserContext): boolean {
    const action = this.getActionById(actionId);
    if (!action) {
      return false;
    }
    return this.approvalWorkflowService.requiresApproval(actionId, userContext);
  }

  /**
   * Get approval workflow for an action
   */
  getApprovalWorkflow(actionId: string): ApprovalWorkflow | null {
    return this.approvalWorkflowService.getApprovalWorkflow(actionId);
  }

  /**
   * Register an approval workflow
   */
  registerApprovalWorkflow(workflow: ApprovalWorkflow): void {
    this.approvalWorkflowService.registerApprovalWorkflow(workflow);
  }

  /**
   * Audit action execution
   */
  auditActionExecution(
    actionId: string,
    params: Record<string, unknown>,
    result: unknown,
    userContext: UserContext,
    error?: string
  ): void {
    const event: ActionEvent = {
      type: error ? 'action_failed' : 'action_executed',
      actionId,
      pageId: this.extractPageIdFromActionId(actionId),
      userId: userContext.userId,
      timestamp: new Date(),
      data: {
        params,
        result,
        userRoles: userContext.roles,
        organizationId: userContext.organizationId
      },
      error
    };
    this.actionEventEmitter.emitEvent(event);
    this.auditLogger.logAuditEvent(event);
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
   * Emit permission denied event
   */
  emitPermissionDenied(actionId: string, userContext: UserContext, reason: string): void {
    const event: ActionEvent = {
      type: 'permission_denied',
      actionId,
      pageId: this.extractPageIdFromActionId(actionId),
      userId: userContext.userId,
      timestamp: new Date(),
      data: { reason },
      error: reason
    };

    this.actionEventEmitter.emitEvent(event);
  }

  /**
   * Get action by ID (placeholder - would integrate with registry)
   */
  private getActionById(actionId: string): ActionDefinition | null {
    // Integrate with the ControllerRegistry to get action definitions
    // Import the registry instance if not already available
    if (this.registry) {
      return this.registry.getAction(actionId);
    }
    
    // Fallback: try to get from global registry
    try {
      // NOTE: This will eventually be removed once proper dependency injection/global access is wired up.
      // This is a temporary measure for initial refactoring.
      const { controllerRegistry } = require('../controllers/ControllerRegistry');
      return controllerRegistry.getAction(actionId);
    } catch (error) {
      console.warn('Could not access controller registry in PermissionManager.getActionById fallback:', error);
      return null;
    }
  }

  /**
   * Extract page ID from action ID
   */
  private extractPageIdFromActionId(actionId: string): string {
    const parts = actionId.split('.');
    return parts.length > 1 ? parts[0] : 'unknown';
  }

}

export const permissionManager = new PermissionManager();
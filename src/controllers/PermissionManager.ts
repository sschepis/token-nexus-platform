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

/**
 * Manages permissions and approval workflows for actions
 */
export class PermissionManager {
  private approvalWorkflows: Map<string, ApprovalWorkflow> = new Map();
  private eventListeners: ActionEventListener[] = [];
  private auditEnabled: boolean = true;

  constructor(auditEnabled: boolean = true) {
    this.auditEnabled = auditEnabled;
  }

  /**
   * Check if user can execute a specific action
   */
  canExecuteAction(actionId: string, userContext: UserContext): boolean {
    // System admin can execute all actions
    if (userContext.roles.includes('system-admin')) {
      return true;
    }

    // Check if user has any of the required permissions
    const action = this.getActionById(actionId);
    if (!action) {
      return false;
    }

    return this.hasRequiredPermissions(action.permissions, userContext);
  }

  /**
   * Validate action permissions and return detailed result
   */
  validateActionPermissions(action: ActionDefinition, userContext: UserContext): PermissionResult {
    const requiredPermissions = action.permissions;
    const userPermissions = [...userContext.permissions, ...userContext.roles];

    // System admin bypass
    if (userContext.roles.includes('system-admin')) {
      return {
        allowed: true,
        requiredPermissions,
        missingPermissions: []
      };
    }

    const missingPermissions = requiredPermissions.filter(
      permission => !userPermissions.includes(permission)
    );

    const allowed = missingPermissions.length === 0;

    return {
      allowed,
      reason: allowed ? undefined : `Missing required permissions: ${missingPermissions.join(', ')}`,
      requiredPermissions,
      missingPermissions
    };
  }

  /**
   * Check if action requires approval workflow
   */
  requiresApproval(actionId: string, userContext: UserContext): boolean {
    // System admin actions may still require approval for sensitive operations
    const action = this.getActionById(actionId);
    if (!action) {
      return false;
    }

    // Check if there's an approval workflow defined for this action
    const workflowId = this.getWorkflowIdForAction(actionId, userContext);
    return workflowId !== null;
  }

  /**
   * Get approval workflow for an action
   */
  getApprovalWorkflow(actionId: string): ApprovalWorkflow | null {
    const workflowId = this.getWorkflowIdForAction(actionId);
    return workflowId ? this.approvalWorkflows.get(workflowId) || null : null;
  }

  /**
   * Register an approval workflow
   */
  registerApprovalWorkflow(workflow: ApprovalWorkflow): void {
    this.approvalWorkflows.set(workflow.id, workflow);
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
    if (!this.auditEnabled) {
      return;
    }

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

    this.emitEvent(event);
    this.logAuditEvent(event);
  }

  /**
   * Get role permissions
   */
  getRolePermissions(role: string): string[] {
    const rolePermissions: Record<string, string[]> = {
      'system-admin': ['*'], // All permissions
      'organization-admin': [
        'organization.read',
        'organization.update',
        'organization.members.manage',
        'integrations.manage',
        'billing.read',
        'audit.read',
        // Object Manager permissions
        'objects:read',
        'objects:write',
        'records:read',
        'records:write',
        // Additional data management permissions
        'schema.read',
        'schema.write',
        'data.export',
        'data.import'
      ],
      'organization-member': [
        'organization.read',
        'profile.read',
        'profile.update',
        // Basic object access for members
        'objects:read',
        'records:read',
        'records:write'
      ],
      'user': [
        'profile.read',
        'profile.update',
        // Limited object access for regular users
        'objects:read',
        'records:read'
      ],
      'guest': [
        'public.read'
      ]
    };

    return rolePermissions[role] || [];
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

    this.emitEvent(event);
  }

  /**
   * Check if user has required permissions
   */
  private hasRequiredPermissions(requiredPermissions: string[], userContext: UserContext): boolean {
    if (requiredPermissions.length === 0) {
      return true; // No permissions required
    }

    const userPermissions = [
      ...userContext.permissions,
      ...userContext.roles,
      ...this.expandRolePermissions(userContext.roles)
    ];

    // Check for wildcard permission
    if (userPermissions.includes('*')) {
      return true;
    }

    // Check if user has any of the required permissions
    return requiredPermissions.some(permission => 
      userPermissions.includes(permission) ||
      this.matchesWildcardPermission(permission, userPermissions)
    );
  }

  /**
   * Expand role permissions to include all permissions granted by roles
   */
  private expandRolePermissions(roles: string[]): string[] {
    const expandedPermissions: string[] = [];
    
    roles.forEach(role => {
      const rolePermissions = this.getRolePermissions(role);
      expandedPermissions.push(...rolePermissions);
    });

    return expandedPermissions;
  }

  /**
   * Check if permission matches any wildcard permissions
   */
  private matchesWildcardPermission(permission: string, userPermissions: string[]): boolean {
    return userPermissions.some(userPerm => {
      if (userPerm.endsWith('.*')) {
        const prefix = userPerm.slice(0, -2);
        return permission.startsWith(prefix + '.');
      }
      return false;
    });
  }

  /**
   * Get workflow ID for action (simplified logic)
   */
  private getWorkflowIdForAction(actionId: string, userContext?: UserContext): string | null {
    // Define which actions require approval workflows
    const approvalRules: Record<string, string> = {
      // System admin actions that modify critical data
      'system-admin.*': 'system-admin-approval',
      // Organization admin actions
      'organization.delete': 'organization-admin-approval',
      'organization.members.remove': 'organization-admin-approval',
      // Financial operations
      'billing.*': 'financial-approval',
      // External API operations with high impact
      'external.dfns.transfer': 'financial-approval',
      'external.dfns.wallet.create': 'wallet-creation-approval'
    };

    // Check for exact match first
    if (approvalRules[actionId]) {
      return approvalRules[actionId];
    }

    // Check for wildcard matches
    for (const [pattern, workflowId] of Object.entries(approvalRules)) {
      if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1);
        if (actionId.startsWith(prefix)) {
          return workflowId;
        }
      }
    }

    return null;
  }

  /**
   * Get action by ID (placeholder - would integrate with registry)
   */
  private getActionById(actionId: string): ActionDefinition | null {
    // This would integrate with the ControllerRegistry
    // For now, return null as placeholder
    return null;
  }

  /**
   * Extract page ID from action ID
   */
  private extractPageIdFromActionId(actionId: string): string {
    const parts = actionId.split('.');
    return parts.length > 1 ? parts[0] : 'unknown';
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

  /**
   * Log audit event (placeholder for actual logging implementation)
   */
  private logAuditEvent(event: ActionEvent): void {
    // In a real implementation, this would write to a persistent audit log
    // For now, just console log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Audit Event:', {
        type: event.type,
        actionId: event.actionId,
        userId: event.userId,
        timestamp: event.timestamp.toISOString(),
        data: event.data,
        error: event.error
      });
    }

    // TODO: Implement actual audit logging to Parse Server or external service
  }
}

/**
 * Default approval workflows
 */
export const createDefaultApprovalWorkflows = (): ApprovalWorkflow[] => {
  return [
    {
      id: 'system-admin-approval',
      name: 'System Admin Approval',
      description: 'Approval workflow for system administration actions',
      steps: [
        {
          id: 'senior-admin-approval',
          name: 'Senior Admin Approval',
          description: 'Requires approval from a senior system administrator',
          approverRoles: ['senior-system-admin'],
          requiredApprovals: 1,
          timeout: 60, // 1 hour
          autoApprove: false
        }
      ],
      timeout: 120, // 2 hours total
      escalation: [
        {
          triggerAfter: 60,
          escalateTo: ['senior-system-admin', 'security-admin'],
          action: 'notify',
          message: 'System admin action pending approval for over 1 hour'
        }
      ]
    },
    {
      id: 'organization-admin-approval',
      name: 'Organization Admin Approval',
      description: 'Approval workflow for organization administration actions',
      steps: [
        {
          id: 'org-owner-approval',
          name: 'Organization Owner Approval',
          description: 'Requires approval from organization owner',
          approverRoles: ['organization-owner'],
          requiredApprovals: 1,
          timeout: 30, // 30 minutes
          autoApprove: false
        }
      ],
      timeout: 60, // 1 hour total
      escalation: [
        {
          triggerAfter: 30,
          escalateTo: ['organization-owner', 'system-admin'],
          action: 'notify',
          message: 'Organization admin action pending approval'
        }
      ]
    },
    {
      id: 'financial-approval',
      name: 'Financial Operations Approval',
      description: 'Approval workflow for financial and wallet operations',
      steps: [
        {
          id: 'financial-admin-approval',
          name: 'Financial Admin Approval',
          description: 'Requires approval from financial administrator',
          approverRoles: ['financial-admin', 'organization-owner'],
          requiredApprovals: 1,
          timeout: 15, // 15 minutes
          autoApprove: false
        },
        {
          id: 'security-review',
          name: 'Security Review',
          description: 'Security team review for high-value operations',
          approverRoles: ['security-admin'],
          requiredApprovals: 1,
          timeout: 30, // 30 minutes
          autoApprove: false,
          conditions: [
            {
              field: 'amount',
              operator: 'greater_than',
              value: 10000 // Require security review for amounts > $10,000
            }
          ]
        }
      ],
      timeout: 60, // 1 hour total
      escalation: [
        {
          triggerAfter: 45,
          escalateTo: ['security-admin', 'system-admin'],
          action: 'notify',
          message: 'Financial operation pending approval - security review required'
        }
      ]
    },
    {
      id: 'wallet-creation-approval',
      name: 'Wallet Creation Approval',
      description: 'Approval workflow for creating new wallets',
      steps: [
        {
          id: 'wallet-admin-approval',
          name: 'Wallet Admin Approval',
          description: 'Requires approval from wallet administrator',
          approverRoles: ['wallet-admin', 'organization-admin'],
          requiredApprovals: 1,
          timeout: 20, // 20 minutes
          autoApprove: false
        }
      ],
      timeout: 40, // 40 minutes total
      escalation: [
        {
          triggerAfter: 20,
          escalateTo: ['wallet-admin', 'organization-admin'],
          action: 'notify',
          message: 'Wallet creation request pending approval'
        }
      ]
    }
  ];
};

// Export singleton instance
export const permissionManager = new PermissionManager();

// Initialize default approval workflows
createDefaultApprovalWorkflows().forEach(workflow => {
  permissionManager.registerApprovalWorkflow(workflow);
});
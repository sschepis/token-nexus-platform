// src/controllers/permissionManager/workflow/ApprovalWorkflowService.ts

import { ApprovalWorkflow, UserContext } from '../../types/ActionTypes';
import { createDefaultApprovalWorkflows } from '../data/DefaultApprovalWorkflows';

export class ApprovalWorkflowService {
  private approvalWorkflows: Map<string, ApprovalWorkflow> = new Map();

  constructor() {
    // Register default approval workflows on initialization
    createDefaultApprovalWorkflows().forEach(workflow => {
      this.registerApprovalWorkflow(workflow);
    });
  }

  /**
   * Register an approval workflow
   */
  registerApprovalWorkflow(workflow: ApprovalWorkflow): void {
    this.approvalWorkflows.set(workflow.id, workflow);
  }

  /**
   * Get approval workflow for an action
   */
  getApprovalWorkflow(actionId: string): ApprovalWorkflow | null {
    const workflowId = this.getWorkflowIdForAction(actionId);
    return workflowId ? this.approvalWorkflows.get(workflowId) || null : null;
  }

  /**
   * Check if action requires approval workflow
   */
  requiresApproval(actionId: string, userContext: UserContext): boolean {
    // System admin actions may still require approval for sensitive operations
    // Note: ActionDefinition and getActionById need to be passed here or accessed via registry
    // For simplicity, this example assumes action definition is accessible or handled externally
    // For this refactor, we are solely focusing on the workflow logic.

    // Check if there's an approval workflow defined for this action
    const workflowId = this.getWorkflowIdForAction(actionId, userContext);
    return workflowId !== null;
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
}

export const approvalWorkflowService = new ApprovalWorkflowService();
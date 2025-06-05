/* eslint-disable @typescript-eslint/no-explicit-any */

import { ActionContext } from './actionContexts'; // Assuming actionContexts.ts will contain ActionContext

/**
 * Permission validation result
 */
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions: string[];
  missingPermissions: string[];
}

/**
 * Approval step in workflow
 */
export interface ApprovalStep {
  id: string;
  name: string;
  description: string;
  approverRoles: string[];
  requiredApprovals: number;
  timeout: number; // in minutes
  autoApprove?: boolean;
  conditions?: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
    value: unknown;
  }>;
}

/**
 * Escalation rule for approval workflows
 */
export interface EscalationRule {
  triggerAfter: number; // minutes
  escalateTo: string[]; // roles
  action: 'notify' | 'auto_approve' | 'auto_reject';
  message?: string;
}

/**
 * Approval workflow definition
 */
export interface ApprovalWorkflow {
  id: string;
  name: string;
  description: string;
  steps: ApprovalStep[];
  timeout: number; // total workflow timeout in minutes
  escalation: EscalationRule[];
  onApproval?: (actionId: string, params: Record<string, unknown>, context: ActionContext) => Promise<void>;
  onRejection?: (actionId: string, params: Record<string, unknown>, context: ActionContext, reason: string) => Promise<void>;
}
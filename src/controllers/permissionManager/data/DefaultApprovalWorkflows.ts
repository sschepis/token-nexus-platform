// src/controllers/permissionManager/data/DefaultApprovalWorkflows.ts

import { ApprovalWorkflow } from '../../types/ActionTypes';

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
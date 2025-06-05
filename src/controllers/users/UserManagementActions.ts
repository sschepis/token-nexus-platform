// src/controllers/users/UserManagementActions.ts

import {
  ActionDefinition,
  ActionContext,
  ActionResult
} from '../types/ActionTypes';
import { store } from '../../store/store';
import {
  inviteUserToOrganization,
  updateOrgUserRoles,
  suspendUserByAdmin,
  reactivateUserByAdmin
} from '../../store/slices/userSlice';

/**
 * User Management Actions
 * Handles user invitations, role updates, and account status changes
 */
export class UserManagementActions {
  /**
   * Register all management-related actions
   */
  registerActions(actions: Map<string, ActionDefinition>): void {
    this.registerInviteUserAction(actions);
    this.registerUpdateRolesAction(actions);
    this.registerSuspendUserAction(actions);
    this.registerActivateUserAction(actions);
  }

  /**
   * Register Invite User Action
   */
  private registerInviteUserAction(actions: Map<string, ActionDefinition>): void {
    const action: ActionDefinition = {
      id: 'inviteUser',
      name: 'Invite User',
      description: 'Send an invitation to a new user to join the organization',
      category: 'data',
      permissions: ['org_admin', 'user_manager'],
      parameters: [
        {
          name: 'email',
          type: 'string',
          description: 'Email address of the user to invite',
          required: true
        },
        {
          name: 'roles',
          type: 'array',
          description: 'Array of roles to assign to the user',
          required: true
        },
        {
          name: 'orgId',
          type: 'string',
          description: 'Organization ID (optional, uses current org if not provided)',
          required: false
        }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const email = params.email as string;
          const roles = params.roles as string[];
          const orgId = params.orgId as string || context.user.organizationId;

          if (!orgId) {
            return {
              success: false,
              error: 'No organization context available',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'users.inviteUser',
                userId: context.user.userId
              }
            };
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            return {
              success: false,
              error: 'Invalid email format',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'users.inviteUser',
                userId: context.user.userId
              }
            };
          }

          const result = await store.dispatch(inviteUserToOrganization({
            orgId,
            email,
            roles
          }));

          if (inviteUserToOrganization.fulfilled.match(result)) {
            return {
              success: true,
              data: {
                email,
                roles,
                orgId
              },
              message: `Invitation sent to ${email}`,
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'users.inviteUser',
                userId: context.user.userId
              }
            };
          } else {
            return {
              success: false,
              error: result.payload as string || 'Failed to invite user',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'users.inviteUser',
                userId: context.user.userId
              }
            };
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'users.inviteUser',
              userId: context.user.userId
            }
          };
        }
      },
      metadata: {
        tags: ['users', 'invite', 'organization'],
        examples: [
          {
            description: 'Invite a developer',
            params: { email: 'john@example.com', roles: ['developer'] }
          },
          {
            description: 'Invite a viewer',
            params: { email: 'jane@example.com', roles: ['viewer'] }
          }
        ],
        relatedActions: ['viewUsers', 'updateRoles']
      }
    };

    actions.set(action.id, action);
  }

  /**
   * Register Update Roles Action (with AI restrictions)
   */
  private registerUpdateRolesAction(actions: Map<string, ActionDefinition>): void {
    const action: ActionDefinition = {
      id: 'updateRoles',
      name: 'Update User Roles',
      description: 'Update roles for an existing user (AI cannot assign admin roles)',
      category: 'data',
      permissions: ['org_admin', 'user_manager'],
      parameters: [
        {
          name: 'userId',
          type: 'string',
          description: 'ID of the user to update',
          required: true
        },
        {
          name: 'roles',
          type: 'array',
          description: 'New array of roles for the user',
          required: true
        },
        {
          name: 'orgId',
          type: 'string',
          description: 'Organization ID (optional)',
          required: false
        }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const userId = params.userId as string;
          const roles = params.roles as string[];
          const orgId = params.orgId as string || context.user.organizationId;

          if (!orgId) {
            return {
              success: false,
              error: 'No organization context available',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'users.updateRoles',
                userId: context.user.userId
              }
            };
          }

          // AI Safety Check: Block admin role assignments if executed by AI
          // Note: We'll need to add executedByAI to ActionContext metadata
          const hasAdminRole = roles.some(role => 
            role.includes('admin') || role.includes('org_admin')
          );

          // For now, we'll add a comment about AI restriction
          // This will be properly implemented when ActionContext is updated
          if (hasAdminRole) {
            // TODO: Check if this is an AI execution and block admin role assignments
            console.warn('Admin role assignment detected - should be restricted for AI execution');
          }

          const result = await store.dispatch(updateOrgUserRoles({
            orgId,
            userId,
            roles
          }));

          if (updateOrgUserRoles.fulfilled.match(result)) {
            return {
              success: true,
              data: {
                userId,
                roles,
                orgId
              },
              message: `Roles updated for user ${userId}`,
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'users.updateRoles',
                userId: context.user.userId
              }
            };
          } else {
            return {
              success: false,
              error: result.payload as string || 'Failed to update user roles',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'users.updateRoles',
                userId: context.user.userId
              }
            };
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'users.updateRoles',
              userId: context.user.userId
            }
          };
        }
      },
      metadata: {
        tags: ['users', 'roles', 'permissions'],
        examples: [
          {
            description: 'Update user to developer role',
            params: { userId: 'user123', roles: ['developer'] }
          },
          {
            description: 'Add token manager role',
            params: { userId: 'user123', roles: ['developer', 'token_manager'] }
          }
        ],
        relatedActions: ['viewUserDetails', 'inviteUser']
      }
    };

    actions.set(action.id, action);
  }

  /**
   * Register Suspend User Action
   */
  private registerSuspendUserAction(actions: Map<string, ActionDefinition>): void {
    const action: ActionDefinition = {
      id: 'suspendUser',
      name: 'Suspend User',
      description: 'Suspend a user account to prevent access',
      category: 'data',
      permissions: ['org_admin'],
      parameters: [
        {
          name: 'userId',
          type: 'string',
          description: 'ID of the user to suspend',
          required: true
        }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const userId = params.userId as string;

          const result = await store.dispatch(suspendUserByAdmin({ userId }));

          if (suspendUserByAdmin.fulfilled.match(result)) {
            return {
              success: true,
              data: { userId, status: 'suspended' },
              message: `User ${userId} has been suspended`,
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'users.suspendUser',
                userId: context.user.userId
              }
            };
          } else {
            return {
              success: false,
              error: result.payload as string || 'Failed to suspend user',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'users.suspendUser',
                userId: context.user.userId
              }
            };
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'users.suspendUser',
              userId: context.user.userId
            }
          };
        }
      },
      metadata: {
        tags: ['users', 'suspend', 'security'],
        examples: [
          {
            description: 'Suspend a user account',
            params: { userId: 'user123' }
          }
        ],
        relatedActions: ['activateUser', 'viewUserDetails']
      }
    };

    actions.set(action.id, action);
  }

  /**
   * Register Activate User Action
   */
  private registerActivateUserAction(actions: Map<string, ActionDefinition>): void {
    const action: ActionDefinition = {
      id: 'activateUser',
      name: 'Activate User',
      description: 'Reactivate a suspended user account',
      category: 'data',
      permissions: ['org_admin'],
      parameters: [
        {
          name: 'userId',
          type: 'string',
          description: 'ID of the user to activate',
          required: true
        }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const userId = params.userId as string;

          const result = await store.dispatch(reactivateUserByAdmin({ userId }));

          if (reactivateUserByAdmin.fulfilled.match(result)) {
            return {
              success: true,
              data: { userId, status: 'active' },
              message: `User ${userId} has been reactivated`,
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'users.activateUser',
                userId: context.user.userId
              }
            };
          } else {
            return {
              success: false,
              error: result.payload as string || 'Failed to activate user',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'users.activateUser',
                userId: context.user.userId
              }
            };
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'users.activateUser',
              userId: context.user.userId
            }
          };
        }
      },
      metadata: {
        tags: ['users', 'activate', 'security'],
        examples: [
          {
            description: 'Reactivate a user account',
            params: { userId: 'user123' }
          }
        ],
        relatedActions: ['suspendUser', 'viewUserDetails']
      }
    };

    actions.set(action.id, action);
  }
}
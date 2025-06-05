// src/controllers/users/UserBulkActions.ts

import {
  ActionDefinition,
  ActionContext,
  ActionResult
} from '../types/ActionTypes';
import { store } from '../../store/store';
import {
  inviteUserToOrganization,
  fetchOrgUsers
} from '../../store/slices/userSlice';

/**
 * User Bulk Actions
 * Handles bulk operations like bulk invites and exports
 */
export class UserBulkActions {
  /**
   * Register all bulk-related actions
   */
  registerActions(actions: Map<string, ActionDefinition>): void {
    this.registerBulkInviteAction(actions);
    this.registerExportUsersAction(actions);
  }

  /**
   * Register Bulk Invite Action
   */
  private registerBulkInviteAction(actions: Map<string, ActionDefinition>): void {
    const action: ActionDefinition = {
      id: 'bulkInvite',
      name: 'Bulk Invite Users',
      description: 'Invite multiple users at once',
      category: 'data',
      permissions: ['org_admin', 'user_manager'],
      parameters: [
        {
          name: 'invitations',
          type: 'array',
          description: 'Array of invitation objects with email and roles',
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
          const invitations = params.invitations as Array<{ email: string; roles: string[] }>;
          const orgId = params.orgId as string || context.user.organizationId;

          if (!orgId) {
            return {
              success: false,
              error: 'No organization context available',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'users.bulkInvite',
                userId: context.user.userId
              }
            };
          }

          const results = [];
          const errors = [];

          // Process invitations sequentially to avoid overwhelming the system
          for (const invitation of invitations) {
            try {
              const result = await store.dispatch(inviteUserToOrganization({
                orgId,
                email: invitation.email,
                roles: invitation.roles
              }));

              if (inviteUserToOrganization.fulfilled.match(result)) {
                results.push({ email: invitation.email, status: 'success' });
              } else {
                errors.push({ email: invitation.email, error: result.payload });
              }
            } catch (error) {
              errors.push({ 
                email: invitation.email, 
                error: error instanceof Error ? error.message : 'Unknown error' 
              });
            }
          }

          return {
            success: errors.length === 0,
            data: {
              successful: results,
              failed: errors,
              totalProcessed: invitations.length,
              successCount: results.length,
              errorCount: errors.length
            },
            message: `Processed ${invitations.length} invitations: ${results.length} successful, ${errors.length} failed`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'users.bulkInvite',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'users.bulkInvite',
              userId: context.user.userId
            }
          };
        }
      },
      metadata: {
        tags: ['users', 'bulk', 'invite'],
        examples: [
          {
            description: 'Invite multiple developers',
            params: {
              invitations: [
                { email: 'dev1@example.com', roles: ['developer'] },
                { email: 'dev2@example.com', roles: ['developer'] }
              ]
            }
          }
        ],
        relatedActions: ['inviteUser', 'viewUsers']
      }
    };

    actions.set(action.id, action);
  }

  /**
   * Register Export Users Action
   */
  private registerExportUsersAction(actions: Map<string, ActionDefinition>): void {
    const action: ActionDefinition = {
      id: 'exportUsers',
      name: 'Export Users',
      description: 'Export user data in various formats',
      category: 'data',
      permissions: ['org_admin', 'user_manager'],
      parameters: [
        {
          name: 'format',
          type: 'string',
          description: 'Export format (csv, json, excel)',
          required: false,
          defaultValue: 'csv'
        },
        {
          name: 'filters',
          type: 'object',
          description: 'Filters to apply before export',
          required: false
        }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const format = params.format as string || 'csv';
          const filters = params.filters as Record<string, unknown> || {};
          
          // Get users with filters applied
          const orgId = context.user.organizationId;
          if (!orgId) {
            return {
              success: false,
              error: 'No organization context available',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'users.exportUsers',
                userId: context.user.userId
              }
            };
          }

          const result = await store.dispatch(fetchOrgUsers({ orgId }));
          
          if (!fetchOrgUsers.fulfilled.match(result)) {
            return {
              success: false,
              error: result.payload as string || 'Failed to fetch users for export',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'users.exportUsers',
                userId: context.user.userId
              }
            };
          }

          let users = result.payload;

          // Apply filters
          if (filters.role && Array.isArray(filters.role)) {
            users = users.filter(user => 
              (filters.role as string[]).some(role => user.orgRoles.includes(role))
            );
          }

          if (filters.status) {
            users = users.filter(user => 
              user.isActive === (filters.status === 'active')
            );
          }

          // In a real implementation, this would generate the actual file
          // For now, we'll return the data structure
          return {
            success: true,
            data: {
              users,
              format,
              count: users.length,
              exportedAt: new Date().toISOString(),
              filters
            },
            message: `Exported ${users.length} users in ${format} format`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'users.exportUsers',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'users.exportUsers',
              userId: context.user.userId
            }
          };
        }
      },
      metadata: {
        tags: ['users', 'export', 'data'],
        examples: [
          {
            description: 'Export all users as CSV',
            params: { format: 'csv' }
          },
          {
            description: 'Export active users only',
            params: { format: 'json', filters: { status: 'active' } }
          }
        ],
        relatedActions: ['viewUsers', 'filterUsers']
      }
    };

    actions.set(action.id, action);
  }
}
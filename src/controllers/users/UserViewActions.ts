// src/controllers/users/UserViewActions.ts

import {
  ActionDefinition,
  ActionContext,
  ActionResult
} from '../types/ActionTypes';
import { store } from '../../store/store';
import { fetchOrgUsers, OrgUser } from '../../store/slices/userSlice';

/**
 * User View Actions
 * Handles viewing, searching, and filtering users
 */
export class UserViewActions {
  /**
   * Register all view-related actions
   */
  registerActions(actions: Map<string, ActionDefinition>): void {
    this.registerViewUsersAction(actions);
    this.registerSearchUsersAction(actions);
    this.registerFilterUsersAction(actions);
    this.registerViewUserDetailsAction(actions);
  }

  /**
   * Register View Users Action
   */
  private registerViewUsersAction(actions: Map<string, ActionDefinition>): void {
    const action: ActionDefinition = {
      id: 'viewUsers',
      name: 'View Organization Users',
      description: 'Retrieve and display all users in the current organization',
      category: 'data',
      permissions: ['org_admin', 'user_manager', 'viewer'],
      parameters: [
        {
          name: 'orgId',
          type: 'string',
          description: 'Organization ID to fetch users for',
          required: false
        }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const orgId = params.orgId as string || context.user.organizationId;
          
          if (!orgId) {
            return {
              success: false,
              error: 'No organization context available',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'users.viewUsers',
                userId: context.user.userId
              }
            };
          }

          const result = await store.dispatch(fetchOrgUsers({ orgId }));
          
          if (fetchOrgUsers.fulfilled.match(result)) {
            return {
              success: true,
              data: {
                users: result.payload,
                count: result.payload.length
              },
              message: `Retrieved ${result.payload.length} users from organization`,
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'users.viewUsers',
                userId: context.user.userId
              }
            };
          } else {
            return {
              success: false,
              error: result.payload as string || 'Failed to fetch users',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'users.viewUsers',
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
              actionId: 'users.viewUsers',
              userId: context.user.userId
            }
          };
        }
      },
      metadata: {
        tags: ['users', 'organization', 'list'],
        examples: [
          {
            description: 'View all users in current organization',
            params: {}
          }
        ],
        relatedActions: ['searchUsers', 'filterUsers']
      }
    };

    actions.set(action.id, action);
  }

  /**
   * Register Search Users Action
   */
  private registerSearchUsersAction(actions: Map<string, ActionDefinition>): void {
    const action: ActionDefinition = {
      id: 'searchUsers',
      name: 'Search Users',
      description: 'Search for users by name, email, or other criteria',
      category: 'data',
      permissions: ['org_admin', 'user_manager', 'viewer'],
      parameters: [
        {
          name: 'query',
          type: 'string',
          description: 'Search query (name, email, etc.)',
          required: true
        },
        {
          name: 'filters',
          type: 'object',
          description: 'Additional filters (role, status, etc.)',
          required: false
        }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        return this.executeSearchUsers(params, context);
      },
      metadata: {
        tags: ['users', 'search', 'filter'],
        examples: [
          {
            description: 'Search for users by email',
            params: { query: 'john@example.com' }
          },
          {
            description: 'Search for developers',
            params: { query: '', filters: { role: ['developer'] } }
          }
        ],
        relatedActions: ['viewUsers', 'filterUsers']
      }
    };

    actions.set(action.id, action);
  }

  /**
   * Register Filter Users Action
   */
  private registerFilterUsersAction(actions: Map<string, ActionDefinition>): void {
    const action: ActionDefinition = {
      id: 'filterUsers',
      name: 'Filter Users',
      description: 'Apply filters to the user list (role, status, date range)',
      category: 'data',
      permissions: ['org_admin', 'user_manager', 'viewer'],
      parameters: [
        {
          name: 'filters',
          type: 'object',
          description: 'Filter criteria object',
          required: true
        }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        return this.executeSearchUsers({ query: '', filters: params.filters }, context);
      },
      metadata: {
        tags: ['users', 'filter'],
        examples: [
          {
            description: 'Filter by role',
            params: { filters: { role: ['developer', 'admin'] } }
          },
          {
            description: 'Filter by status',
            params: { filters: { status: 'active' } }
          }
        ],
        relatedActions: ['viewUsers', 'searchUsers']
      }
    };

    actions.set(action.id, action);
  }

  /**
   * Register View User Details Action
   */
  private registerViewUserDetailsAction(actions: Map<string, ActionDefinition>): void {
    const action: ActionDefinition = {
      id: 'viewUserDetails',
      name: 'View User Details',
      description: 'Get detailed information about a specific user',
      category: 'data',
      permissions: ['org_admin', 'user_manager', 'viewer'],
      parameters: [
        {
          name: 'userId',
          type: 'string',
          description: 'ID of the user to view',
          required: true
        }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const userId = params.userId as string;
          const orgId = context.user.organizationId;

          if (!orgId) {
            return {
              success: false,
              error: 'No organization context available',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'users.viewUserDetails',
                userId: context.user.userId
              }
            };
          }

          const result = await store.dispatch(fetchOrgUsers({ orgId }));
          
          if (fetchOrgUsers.fulfilled.match(result)) {
            const user = result.payload.find((u: OrgUser) => u.id === userId);
            
            if (!user) {
              return {
                success: false,
                error: `User with ID ${userId} not found in organization`,
                metadata: {
                  executionTime: 0,
                  timestamp: new Date(),
                  actionId: 'users.viewUserDetails',
                  userId: context.user.userId
                }
              };
            }

            return {
              success: true,
              data: { user },
              message: `Retrieved details for user ${user.email}`,
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'users.viewUserDetails',
                userId: context.user.userId
              }
            };
          } else {
            return {
              success: false,
              error: result.payload as string || 'Failed to fetch user details',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'users.viewUserDetails',
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
              actionId: 'users.viewUserDetails',
              userId: context.user.userId
            }
          };
        }
      },
      metadata: {
        tags: ['users', 'details', 'view'],
        examples: [
          {
            description: 'View user details',
            params: { userId: 'user123' }
          }
        ],
        relatedActions: ['viewUsers', 'searchUsers']
      }
    };

    actions.set(action.id, action);
  }

  /**
   * Helper method to execute search users (used by other actions)
   */
  private async executeSearchUsers(params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> {
    try {
      const query = params.query as string;
      const filters = params.filters as Record<string, unknown> || {};
      
      const orgId = context.user.organizationId;
      if (!orgId) {
        return {
          success: false,
          error: 'No organization context available',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'users.searchUsers',
            userId: context.user.userId
          }
        };
      }

      const result = await store.dispatch(fetchOrgUsers({ orgId }));
      
      if (fetchOrgUsers.fulfilled.match(result)) {
        const users = result.payload;
        const filteredUsers = users.filter((user: OrgUser) => {
          const matchesQuery = query.toLowerCase() === '' || 
            user.email.toLowerCase().includes(query.toLowerCase()) ||
            `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(query.toLowerCase());
          
          let matchesFilters = true;
          if (filters.role && Array.isArray(filters.role)) {
            matchesFilters = matchesFilters && (filters.role as string[]).some(role => 
              user.orgRoles.includes(role)
            );
          }
          
          if (filters.status) {
            matchesFilters = matchesFilters && user.isActive === (filters.status === 'active');
          }
          
          return matchesQuery && matchesFilters;
        });

        return {
          success: true,
          data: {
            users: filteredUsers,
            count: filteredUsers.length,
            query,
            filters
          },
          message: `Found ${filteredUsers.length} users matching search criteria`,
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'users.searchUsers',
            userId: context.user.userId
          }
        };
      } else {
        return {
          success: false,
          error: result.payload as string || 'Failed to search users',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'users.searchUsers',
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
          actionId: 'users.searchUsers',
          userId: context.user.userId
        }
      };
    }
  }
}
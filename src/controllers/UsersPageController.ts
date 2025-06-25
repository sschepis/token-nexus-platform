import { BasePageController, ActionConfig } from './base/BasePageController';
import { ActionContext, ActionResult, ActionDefinition } from './types/ActionTypes';
import { store } from '../store/store';
import {
  fetchOrgUsers,
  inviteUserToOrganization,
  updateOrgUserRoles,
  removeUserFromOrganization,
  suspendUserByAdmin,
  reactivateUserByAdmin,
  OrgUser,
  AdminUserView
} from '../store/slices/userSlice';
import Parse from 'parse';

export class UsersPageController extends BasePageController {
  constructor() {
    super({
      pageId: 'users',
      pageName: 'User Management',
      description: 'Comprehensive user management interface with AI assistant integration',
      category: 'user-management',
      tags: ['users', 'organization', 'permissions', 'roles'],
      permissions: ['org_admin', 'user_manager', 'users:read', 'users:write', 'system:admin'],
      version: '1.0.0'
    });
  }

  protected initializeActions(): void {
    this.registerViewUsersAction();
    this.registerSearchUsersAction();
    this.registerFilterUsersAction();
    this.registerViewUserDetailsAction();
    this.registerInviteUserAction();
    this.registerUpdateRolesAction();
    this.registerSuspendUserAction();
    this.registerActivateUserAction();
    this.registerBulkInviteAction();
    this.registerExportUsersAction();
    this.registerRemoveUserAction(); // Register the remove user action
  }

  // Common Action Execution Helper
  private async executeAction(
    actionId: string,
    executor: (context: ActionContext) => Promise<ActionResult>,
    context: ActionContext
  ): Promise<ActionResult> {
    const startTime = Date.now();
    try {
      const result = await executor(context);
      return this.createSuccessResult(actionId, context.user.userId, result.data, result.message || 'Action executed successfully', startTime);
    } catch (error) {
      return this.createErrorResult(actionId, context.user.userId, error instanceof Error ? error.message : 'Unknown error occurred', startTime);
    }
  }

  // User View Actions
  private registerViewUsersAction(): void {
    this.registerAction(
      {
        id: 'viewUsers',
        name: 'View Organization Users',
        description: 'Retrieve and display all users in the current organization',
        category: 'data',
        permissions: ['org_admin', 'user_manager', 'viewer'],
        parameters: [
          { name: 'orgId', type: 'string', description: 'Organization ID to fetch users for', required: false }
        ]
      },
      async (params, context) => {
        const orgId = params.orgId as string || this.getOrganizationId(context);
        if (!orgId) {
          throw new Error('No organization context available');
        }
        const result = await store.dispatch(fetchOrgUsers({ orgId }));
        if (fetchOrgUsers.fulfilled.match(result)) {
          return { users: result.payload, count: result.payload.length };
        } else {
          throw new Error(result.payload as string || 'Failed to fetch users');
        }
      }
    );
  }

  private registerSearchUsersAction(): void {
    this.registerAction(
      {
        id: 'searchUsers',
        name: 'Search Users',
        description: 'Search for users by name, email, or other criteria',
        category: 'data',
        permissions: ['org_admin', 'user_manager', 'viewer'],
        parameters: [
          { name: 'query', type: 'string', description: 'Search query (name, email, etc.)', required: true },
          { name: 'filters', type: 'object', description: 'Additional filters (role, status, etc.)', required: false }
        ]
      },
      async (params, context) => {
        const query = params.query as string;
        const filters = params.filters as Record<string, unknown> || {};
        const orgId = this.getOrganizationId(context);
        if (!orgId) {
          throw new Error('No organization context available');
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
          return { users: filteredUsers, count: filteredUsers.length, query, filters };
        } else {
          throw new Error(result.payload as string || 'Failed to search users');
        }
      }
    );
  }

  private registerFilterUsersAction(): void {
    this.registerAction(
      {
        id: 'filterUsers',
        name: 'Filter Users',
        description: 'Apply filters to the user list (role, status, date range)',
        category: 'data',
        permissions: ['org_admin', 'user_manager', 'viewer'],
        parameters: [
          { name: 'filters', type: 'object', description: 'Filter criteria object', required: true }
        ]
      },
      async (params, context) => {
        return this.actions.get('searchUsers')?.execute({ query: '', filters: params.filters }, context);
      }
    );
  }

  private registerViewUserDetailsAction(): void {
    this.registerAction(
      {
        id: 'viewUserDetails',
        name: 'View User Details',
        description: 'Get detailed information about a specific user',
        category: 'data',
        permissions: ['org_admin', 'user_manager', 'viewer'],
        parameters: [
          { name: 'userId', type: 'string', description: 'ID of the user to view', required: true }
        ]
      },
      async (params, context) => {
        const userId = params.userId as string;
        const orgId = this.getOrganizationId(context);
        if (!orgId) {
          throw new Error('No organization context available');
        }

        const result = await store.dispatch(fetchOrgUsers({ orgId }));
        if (fetchOrgUsers.fulfilled.match(result)) {
          const user = result.payload.find((u: OrgUser) => u.id === userId);
          if (!user) {
            throw new Error(`User with ID ${userId} not found in organization`);
          }
          return { user };
        } else {
          throw new Error(result.payload as string || 'Failed to fetch user details');
        }
      }
    );
  }

  // User Management Actions
  private registerInviteUserAction(): void {
    this.registerAction(
      {
        id: 'inviteUser',
        name: 'Invite User',
        description: 'Send an invitation to a new user to join the organization',
        category: 'data',
        permissions: ['org_admin', 'user_manager'],
        parameters: [
          { name: 'email', type: 'string', description: 'Email address of the user to invite', required: true },
          { name: 'roles', type: 'array', description: 'Array of roles to assign to the user', required: true },
          { name: 'orgId', type: 'string', description: 'Organization ID (optional, uses current org if not provided)', required: false }
        ]
      },
      async (params, context) => {
        const email = params.email as string;
        const roles = params.roles as string[];
        const orgId = params.orgId as string || this.getOrganizationId(context);
        if (!orgId) {
          throw new Error('No organization context available');
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new Error('Invalid email format');
        }

        const result = await store.dispatch(inviteUserToOrganization({ orgId, email, roles }));
        if (inviteUserToOrganization.fulfilled.match(result)) {
          return { email, roles, orgId };
        } else {
          throw new Error(result.payload as string || 'Failed to invite user');
        }
      }
    );
  }

  private registerUpdateRolesAction(): void {
    this.registerAction(
      {
        id: 'updateRoles',
        name: 'Update User Roles',
        description: 'Update roles for an existing user (AI cannot assign admin roles)',
        category: 'data',
        permissions: ['org_admin', 'user_manager'],
        parameters: [
          { name: 'userId', type: 'string', description: 'ID of the user to update', required: true },
          { name: 'roles', type: 'array', description: 'New array of roles for the user', required: true },
          { name: 'orgId', type: 'string', description: 'Organization ID (optional)', required: false }
        ]
      },
      async (params, context) => {
        const userId = params.userId as string;
        const roles = params.roles as string[];
        const orgId = params.orgId as string || this.getOrganizationId(context);
        if (!orgId) {
          throw new Error('No organization context available');
        }

        const hasAdminRole = roles.some(role => role.includes('admin') || role.includes('org_admin'));
        // TODO: Implement proper AI safety check based on action context metadata if applicable
        if (hasAdminRole) {
          console.warn('Admin role assignment detected - consider AI restriction if executed by AI.');
        }

        const result = await store.dispatch(updateOrgUserRoles({ orgId, userId, roles }));
        if (updateOrgUserRoles.fulfilled.match(result)) {
          return { userId, roles, orgId };
        } else {
          throw new Error(result.payload as string || 'Failed to update user roles');
        }
      }
    );
  }

  private registerSuspendUserAction(): void {
    this.registerAction(
      {
        id: 'suspendUser',
        name: 'Suspend User',
        description: 'Suspend a user account to prevent access',
        category: 'data',
        permissions: ['org_admin'],
        parameters: [{ name: 'userId', type: 'string', description: 'ID of the user to suspend', required: true }]
      },
      async (params, context) => {
        const userId = params.userId as string;
        const result = await store.dispatch(suspendUserByAdmin({ userId }));
        if (suspendUserByAdmin.fulfilled.match(result)) {
          return { userId, status: 'suspended' };
        } else {
          throw new Error(result.payload as string || 'Failed to suspend user');
        }
      }
    );
  }

  private registerActivateUserAction(): void {
    this.registerAction(
      {
        id: 'activateUser',
        name: 'Activate User',
        description: 'Reactivate a suspended user account',
        category: 'data',
        permissions: ['org_admin'],
        parameters: [{ name: 'userId', type: 'string', description: 'ID of the user to activate', required: true }]
      },
      async (params, context) => {
        const userId = params.userId as string;
        const result = await store.dispatch(reactivateUserByAdmin({ userId }));
        if (reactivateUserByAdmin.fulfilled.match(result)) {
          return { userId, status: 'active' };
        } else {
          throw new Error(result.payload as string || 'Failed to reactivate user');
        }
      }
    );
  }

  private registerRemoveUserAction(): void {
    this.registerAction(
      {
        id: 'removeUser',
        name: 'Remove User from Organization',
        description: 'Remove a user from the current organization (requires confirmation)',
        category: 'data',
        permissions: ['org_admin'],
        parameters: [
          { name: 'userId', type: 'string', description: 'ID of the user to remove from the organization', required: true },
          { name: 'reason', type: 'string', description: 'Reason for removing the user (for audit log)', required: false }
        ]
      },
      async (params, context) => {
        const userId = params.userId as string;
        const reason = params.reason as string;
        const orgId = this.getOrganizationId(context);

        if (!orgId) {
          throw new Error('No organization context available');
        }
        
        // Before removal, fetch user details to include in the success message
        const userFetchResult = await store.dispatch(fetchOrgUsers({ orgId }));
        let user: OrgUser | undefined;
        if (fetchOrgUsers.fulfilled.match(userFetchResult)) {
            user = userFetchResult.payload.find(u => u.id === userId);
        }

        const result = await store.dispatch(removeUserFromOrganization({ orgId, userId }));
        if (removeUserFromOrganization.fulfilled.match(result)) {
          return { 
            message: `User ${user?.firstName || ''} ${user?.lastName || ''} has been removed from the organization`,
            removedUser: user,
            reason: reason || 'No reason provided'
          };
        } else {
          throw new Error(result.payload as string || 'Failed to remove user from organization');
        }
      }
    );
  }

  // User Bulk Actions
  private registerBulkInviteAction(): void {
    this.registerAction(
      {
        id: 'bulkInvite',
        name: 'Bulk Invite Users',
        description: 'Invite multiple users at once',
        category: 'data',
        permissions: ['org_admin', 'user_manager'],
        parameters: [
          { name: 'invitations', type: 'array', description: 'Array of invitation objects with email and roles', required: true },
          { name: 'orgId', type: 'string', description: 'Organization ID (optional)', required: false }
        ]
      },
      async (params, context) => {
        const invitations = params.invitations as Array<{ email: string; roles: string[] }>;
        const orgId = params.orgId as string || this.getOrganizationId(context);
        if (!orgId) {
          throw new Error('No organization context available');
        }

        const results = [];
        const errors = [];

        for (const invitation of invitations) {
          try {
            const result = await store.dispatch(inviteUserToOrganization({ orgId, email: invitation.email, roles: invitation.roles }));
            if (inviteUserToOrganization.fulfilled.match(result)) {
              results.push({ email: invitation.email, status: 'success' });
            } else {
              errors.push({ email: invitation.email, error: result.payload });
            }
          } catch (error) {
            errors.push({ email: invitation.email, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }

        return {
          successful: results,
          failed: errors,
          totalProcessed: invitations.length,
          successCount: results.length,
          errorCount: errors.length
        };
      }
    );
  }

  private registerExportUsersAction(): void {
    this.registerAction(
      {
        id: 'exportUsers',
        name: 'Export Users',
        description: 'Export user data in various formats',
        category: 'data',
        permissions: ['org_admin', 'user_manager'],
        parameters: [
          { name: 'format', type: 'string', description: 'Export format (csv, json, excel)', required: false, defaultValue: 'csv' },
          { name: 'filters', type: 'object', description: 'Filters to apply before export', required: false }
        ]
      },
      async (params, context) => {
        const format = params.format as string || 'csv';
        const filters = params.filters as Record<string, unknown> || {};
        const orgId = this.getOrganizationId(context);
        if (!orgId) {
          throw new Error('No organization context available');
        }

        const result = await store.dispatch(fetchOrgUsers({ orgId }));
        if (!fetchOrgUsers.fulfilled.match(result)) {
          throw new Error(result.payload as string || 'Failed to fetch users for export');
        }

        let users = result.payload;
        if (filters.role && Array.isArray(filters.role)) {
          users = users.filter(user => (filters.role as string[]).some(role => user.orgRoles.includes(role)));
        }
        if (filters.status) {
          users = users.filter(user => user.isActive === (filters.status === 'active'));
        }

        return { users, format, count: users.length, exportedAt: new Date().toISOString(), filters };
      }
    );
  }
}

export const usersPageController = new UsersPageController();
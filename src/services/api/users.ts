import { callCloudFunction, callCloudFunctionForArray } from '../../utils/apiUtils';

/**
 * Users API for user management operations
 * This provides secure API calls for all user-related operations
 */

export interface UserDebugInfo {
  userId: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
  status: string;
  lastLogin?: string;
  metadata: Record<string, any>;
}

export interface GlobalUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isSystemAdmin: boolean;
  isInactive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  organizations: Array<{
    id: string;
    name: string;
    role: string;
    isActive: boolean;
    assignedAt: string;
  }>;
  stats: {
    tokenCount: number;
    organizationCount: number;
  };
}

export interface CreateUserParams {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  isSystemAdmin: boolean;
  organizationId: string;
  role: string;
}

export interface UpdateUserParams {
  userId: string;
  firstName: string;
  lastName: string;
  isSystemAdmin: boolean;
  organizationId?: string;
  role?: string;
}

export const usersApi = {
  /**
   * Debug user organization setup
   */
  async debugUserOrgSetup(orgId: string) {
    return callCloudFunction('debugUserOrgSetup', { orgId }, {
      errorMessage: 'Failed to debug user organization setup'
    });
  },

  /**
   * Create a new user by admin
   */
  async createUserByAdmin(params: CreateUserParams) {
    return callCloudFunction<{ success: boolean; message: string }>('createUserByAdmin', params as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to create user'
    });
  },

  /**
   * Update user by admin
   */
  async updateUserByAdmin(params: UpdateUserParams) {
    return callCloudFunction<{ success: boolean; message: string }>('updateUserByAdmin', params as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to update user'
    });
  },

  /**
   * Reset user password by admin
   */
  async resetUserPasswordByAdmin(params: { userId: string; newPassword: string }) {
    return callCloudFunction<{ success: boolean; message: string }>('resetUserPasswordByAdmin', params, {
      errorMessage: 'Failed to reset user password'
    });
  },

  /**
   * Toggle user status (active/inactive)
   */
  async toggleUserStatus(params: { userId: string; isInactive: boolean }) {
    return callCloudFunction<{ success: boolean; message: string }>('toggleUserStatus', params, {
      errorMessage: 'Failed to toggle user status'
    });
  },

  /**
   * Delete user by admin
   */
  async deleteUserByAdmin(params: { userId: string; transferDataTo?: string }) {
    return callCloudFunction<{ success: boolean; message: string }>('deleteUserByAdmin', params, {
      errorMessage: 'Failed to delete user'
    });
  },

  /**
   * Impersonate user
   */
  async impersonateUser(params: { userId: string }) {
    return callCloudFunction<{ success: boolean; sessionToken: string; user: GlobalUser }>('impersonateUser', params, {
      errorMessage: 'Failed to impersonate user'
    });
  }
};

// Export individual functions for backward compatibility (This section is kept as it only exports functions defined in usersApi)
export const {
  debugUserOrgSetup,
  createUserByAdmin,
  updateUserByAdmin,
  resetUserPasswordByAdmin,
  toggleUserStatus,
  deleteUserByAdmin,
  impersonateUser
} = usersApi;

// Default export
export default usersApi;
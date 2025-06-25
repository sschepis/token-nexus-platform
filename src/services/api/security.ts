import { callCloudFunction, callCloudFunctionForArray } from '../../utils/apiUtils';
import { 
  Permission, 
  Role, 
  SecurityPolicy, 
  AppSecurityContext,
  CreatePermissionParams,
  CreateRoleParams,
  CreatePolicyParams,
  SecurityValidationResult
} from './security/types/SecurityTypes';

/**
 * Security API for App Framework security management
 * Handles permissions, roles, policies, and security contexts
 */
export const securityApi = {
  /**
   * Get app permissions for an organization
   */
  async getAppPermissions(params: { organizationId: string }) {
    return callCloudFunctionForArray<Permission>('getAppPermissions', params, {
      errorMessage: 'Failed to fetch app permissions'
    });
  },

  /**
   * Get app roles for an organization
   */
  async getAppRoles(params: { organizationId: string }) {
    return callCloudFunctionForArray<Role>('getAppRoles', params, {
      errorMessage: 'Failed to fetch app roles'
    });
  },

  /**
   * Get security policies for an organization
   */
  async getSecurityPolicies(params: { organizationId: string }) {
    return callCloudFunctionForArray<SecurityPolicy>('getSecurityPolicies', params, {
      errorMessage: 'Failed to fetch security policies'
    });
  },

  /**
   * Get app security contexts for an organization
   */
  async getAppSecurityContexts(params: { organizationId: string }) {
    return callCloudFunctionForArray<AppSecurityContext>('getAppSecurityContexts', params, {
      errorMessage: 'Failed to fetch security contexts'
    });
  },

  /**
   * Create a new app permission
   */
  async createAppPermission(params: CreatePermissionParams) {
    return callCloudFunction<Permission>('createAppPermission', params as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to create app permission'
    });
  },

  /**
   * Create a new app role
   */
  async createAppRole(params: CreateRoleParams) {
    return callCloudFunction<Role>('createAppRole', params as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to create app role'
    });
  },

  /**
   * Create a new security policy
   */
  async createSecurityPolicy(params: CreatePolicyParams) {
    return callCloudFunction<SecurityPolicy>('createSecurityPolicy', params as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to create security policy'
    });
  },

  /**
   * Toggle security policy enabled/disabled status
   */
  async toggleSecurityPolicy(params: { policyId: string; enabled: boolean }) {
    return callCloudFunction<{ success: boolean }>('toggleSecurityPolicy', params, {
      errorMessage: 'Failed to toggle security policy'
    });
  },

  /**
   * Delete a permission
   */
  async deletePermission(params: { id: string }) {
    return callCloudFunction<{ success: boolean }>('deletePermission', params, {
      errorMessage: 'Failed to delete permission'
    });
  },

  /**
   * Delete a role
   */
  async deleteRole(params: { id: string }) {
    return callCloudFunction<{ success: boolean }>('deleteRole', params, {
      errorMessage: 'Failed to delete role'
    });
  },

  /**
   * Delete a security policy
   */
  async deleteSecurityPolicy(params: { id: string }) {
    return callCloudFunction<{ success: boolean }>('deleteSecurityPolicy', params, {
      errorMessage: 'Failed to delete security policy'
    });
  },

  /**
   * Delete a security context
   */
  async deleteSecurityContext(params: { id: string }) {
    return callCloudFunction<{ success: boolean }>('deleteSecurityContext', params, {
      errorMessage: 'Failed to delete security context'
    });
  },

  /**
   * Validate app security configuration
   */
  async validateAppSecurity(params: { appId: string }) {
    return callCloudFunction<SecurityValidationResult>('validateAppSecurity', params, {
      errorMessage: 'Failed to validate app security'
    });
  }
};

export default securityApi;
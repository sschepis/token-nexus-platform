import { ActionContext } from '../types/ActionTypes';

/**
 * Permission validation result
 */
export interface PermissionValidationResult {
  success: boolean;
  error?: string;
  missingPermissions?: string[];
}

/**
 * Permission validation configuration
 */
export interface PermissionConfig {
  permissions: string[];
  requireAll?: boolean; // If true, user must have ALL permissions. If false, user needs ANY permission
  organizationRequired?: boolean;
  systemAdminBypass?: boolean; // If true, system admins bypass permission checks
}

/**
 * Utility class for consistent permission validation across controllers
 */
export class PermissionValidator {
  /**
   * Validate user permissions against required permissions
   */
  static validate(context: ActionContext, config: PermissionConfig): PermissionValidationResult {
    // Check if organization is required
    if (config.organizationRequired) {
      const orgId = context.user.organizationId || context.organization?.id;
      if (!orgId) {
        return {
          success: false,
          error: 'Organization context is required for this operation'
        };
      }
    }

    // System admin bypass
    if (config.systemAdminBypass && this.isSystemAdmin(context)) {
      return { success: true };
    }

    // Get user permissions
    const userPermissions = this.getUserPermissions(context);
    
    // Check permissions
    const missingPermissions: string[] = [];
    const hasPermissions: string[] = [];

    for (const requiredPermission of config.permissions) {
      if (this.hasPermission(userPermissions, requiredPermission)) {
        hasPermissions.push(requiredPermission);
      } else {
        missingPermissions.push(requiredPermission);
      }
    }

    // Determine if validation passes
    const requireAll = config.requireAll !== false; // Default to true
    const success = requireAll 
      ? missingPermissions.length === 0
      : hasPermissions.length > 0;

    if (!success) {
      const errorMessage = requireAll
        ? `Missing required permissions: ${missingPermissions.join(', ')}`
        : `User lacks any of the required permissions: ${config.permissions.join(', ')}`;
      
      return {
        success: false,
        error: errorMessage,
        missingPermissions
      };
    }

    return { success: true };
  }

  /**
   * Check if user is a system administrator
   */
  static isSystemAdmin(context: ActionContext): boolean {
    return context.user.permissions?.includes('system:admin') === true ||
           context.user.roles?.includes('SystemAdmin') === true ||
           context.user.roles?.includes('system:admin') === true;
  }

  /**
   * Check if user is an organization administrator
   */
  static isOrgAdmin(context: ActionContext): boolean {
    return context.user.permissions?.includes('org:admin') === true ||
           context.user.roles?.includes('OrgAdmin') === true ||
           context.user.organizationRoles?.includes('admin') === true ||
           this.hasPermission(context.user.permissions || [], 'org:admin');
  }

  /**
   * Get user permissions from context
   */
  static getUserPermissions(context: ActionContext): string[] {
    return context.user.permissions || [];
  }

  /**
   * Check if user has a specific permission (supports wildcards)
   */
  static hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    // Direct match
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Wildcard matching
    for (const userPerm of userPermissions) {
      if (this.matchesWildcard(userPerm, requiredPermission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Match permission with wildcard support
   * Examples:
   * - "users:*" matches "users:read", "users:write", etc.
   * - "*:read" matches "users:read", "tokens:read", etc.
   * - "*" matches everything
   */
  static matchesWildcard(userPermission: string, requiredPermission: string): boolean {
    if (userPermission === '*') {
      return true;
    }

    const userParts = userPermission.split(':');
    const requiredParts = requiredPermission.split(':');

    if (userParts.length !== requiredParts.length) {
      return false;
    }

    for (let i = 0; i < userParts.length; i++) {
      if (userParts[i] !== '*' && userParts[i] !== requiredParts[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Create permission configuration for common patterns
   */
  static createConfig(permissions: string | string[], options?: {
    requireAll?: boolean;
    organizationRequired?: boolean;
    systemAdminBypass?: boolean;
  }): PermissionConfig {
    return {
      permissions: Array.isArray(permissions) ? permissions : [permissions],
      requireAll: options?.requireAll !== false, // Default to true
      organizationRequired: options?.organizationRequired !== false, // Default to true
      systemAdminBypass: options?.systemAdminBypass !== false // Default to true
    };
  }

  /**
   * Pre-configured permission validators for common scenarios
   */
  static readonly presets = {
    /**
     * Read-only access with organization context
     */
    read: (resource: string) => PermissionValidator.createConfig(`${resource}:read`),

    /**
     * Write access with organization context
     */
    write: (resource: string) => PermissionValidator.createConfig([`${resource}:write`, `${resource}:create`], {
      requireAll: false // User needs either write OR create
    }),

    /**
     * Full management access (read, write, delete)
     */
    manage: (resource: string) => PermissionValidator.createConfig([
      `${resource}:read`,
      `${resource}:write`, 
      `${resource}:delete`
    ]),

    /**
     * Admin-only access
     */
    admin: () => PermissionValidator.createConfig(['admin', 'org:admin'], {
      requireAll: false,
      systemAdminBypass: true
    }),

    /**
     * System admin only
     */
    systemAdmin: () => PermissionValidator.createConfig(['system:admin'], {
      organizationRequired: false,
      systemAdminBypass: false // Must explicitly have system admin permission
    }),

    /**
     * Public access (no permissions required)
     */
    public: () => PermissionValidator.createConfig([], {
      organizationRequired: false,
      systemAdminBypass: true
    })
  };
}

/**
 * Decorator function for automatic permission validation
 */
export function requiresPermissions(config: PermissionConfig) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Assume first argument is context for action methods
      const context = args[1] as ActionContext;
      
      if (context) {
        const validation = PermissionValidator.validate(context, config);
        if (!validation.success) {
          throw new Error(validation.error);
        }
      }

      return method.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Helper functions for common permission patterns
 */
export const Permissions = {
  /**
   * Validate read permissions
   */
  validateRead: (context: ActionContext, resource: string) => 
    PermissionValidator.validate(context, PermissionValidator.presets.read(resource)),

  /**
   * Validate write permissions
   */
  validateWrite: (context: ActionContext, resource: string) => 
    PermissionValidator.validate(context, PermissionValidator.presets.write(resource)),

  /**
   * Validate management permissions
   */
  validateManage: (context: ActionContext, resource: string) => 
    PermissionValidator.validate(context, PermissionValidator.presets.manage(resource)),

  /**
   * Validate admin permissions
   */
  validateAdmin: (context: ActionContext) => 
    PermissionValidator.validate(context, PermissionValidator.presets.admin()),

  /**
   * Validate system admin permissions
   */
  validateSystemAdmin: (context: ActionContext) => 
    PermissionValidator.validate(context, PermissionValidator.presets.systemAdmin())
};
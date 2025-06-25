// src/services/permissionService.ts
import Parse from 'parse';
import { safeParseCloudRun } from '@/utils/parseUtils';

/**
 * Permission mapping from roles to frontend permissions
 */
const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  // System-wide roles
  'SystemAdmin': ['*'], // All permissions
  'system_admin': ['*'], // All permissions
  
  // Organization-specific role patterns (will be matched with orgId suffix)
  'admin': [
    'dashboard:read', 'dashboard:write',
    'objects:read', 'objects:write',
    'tokens:read', 'tokens:write', 'tokens:create', 'tokens:delete',
    'users:read', 'users:write', 'users:manage',
    'integrations:read', 'integrations:write', 'integrations:manage',
    'reports:read', 'reports:write',
    'audit:read', 'audit:write',
    'notifications:read', 'notifications:write', 'notifications:manage',
    'settings:read', 'settings:write', 'settings:manage',
    'marketplace:read', 'marketplace:write',
    'apps:read', 'apps:manage', 'apps:install', 'apps:configure',
    'pagebuilder:read', 'pagebuilder:write', 'pagebuilder:manage',
    'routes:read', 'routes:write', 'routes:manage',
    'workflows:read', 'workflows:write', 'workflows:manage',
    'theme:read', 'theme:write', 'theme:manage',
    'ai:read', 'ai:write', 'ai:manage',
    'system:manage'
  ],
  
  'orgAdmin': [
    'dashboard:read', 'dashboard:write',
    'objects:read', 'objects:write',
    'tokens:read', 'tokens:write', 'tokens:create', 'tokens:delete',
    'users:read', 'users:write', 'users:manage',
    'integrations:read', 'integrations:write', 'integrations:manage',
    'reports:read', 'reports:write',
    'audit:read',
    'notifications:read', 'notifications:write', 'notifications:manage',
    'settings:read', 'settings:write', 'settings:manage',
    'marketplace:read', 'marketplace:write',
    'apps:read', 'apps:manage', 'apps:install', 'apps:configure',
    'pagebuilder:read', 'pagebuilder:write', 'pagebuilder:manage',
    'routes:read', 'routes:write', 'routes:manage',
    'workflows:read', 'workflows:write', 'workflows:manage',
    'theme:read', 'theme:write', 'theme:manage',
    'ai:read', 'ai:write', 'ai:manage'
  ],
  
  'editor': [
    'dashboard:read',
    'objects:read', 'objects:write',
    'tokens:read',
    'users:read',
    'integrations:read',
    'reports:read',
    'notifications:read',
    'settings:read',
    'marketplace:read',
    'apps:read',
    'pagebuilder:read', 'pagebuilder:write',
    'routes:read', 'routes:write',
    'workflows:read', 'workflows:write',
    'theme:read',
    'ai:read', 'ai:write'
  ],
  
  'member': [
    'dashboard:read',
    'objects:read',
    'tokens:read',
    'users:read',
    'integrations:read',
    'reports:read',
    'notifications:read',
    'settings:read',
    'marketplace:read',
    'apps:read',
    'pagebuilder:read',
    'routes:read',
    'workflows:read',
    'theme:read',
    'ai:read'
  ],
  
  'viewer': [
    'dashboard:read',
    'objects:read',
    'tokens:read',
    'users:read',
    'integrations:read',
    'reports:read',
    'notifications:read',
    'settings:read',
    'marketplace:read',
    'apps:read',
    'pagebuilder:read',
    'routes:read',
    'workflows:read',
    'theme:read',
    'ai:read'
  ],
  
  // Specific role permissions
  'token_manager': [
    'tokens:read', 'tokens:write', 'tokens:create', 'tokens:delete'
  ],
  
  'integration_manager': [
    'integrations:read', 'integrations:write', 'integrations:manage'
  ],
  
  'reports_viewer': [
    'reports:read', 'audit:read'
  ],
  
  'security_admin': [
    'audit:read', 'audit:write', 'reports:read', 'reports:write'
  ]
};

/**
 * Default permissions for authenticated users (minimum permissions)
 */
const DEFAULT_PERMISSIONS = [
  'dashboard:read',
  'objects:read',
  'users:read',
  'notifications:read',
  'settings:read'
];

/**
 * Fetch user roles from Parse and convert them to permissions
 */
export async function getUserPermissions(user: any, orgId?: string): Promise<string[]> {
  try {
    console.log(`[PermissionService] Fetching permissions for user ${user.id}, orgId: ${orgId}`);
    
    // Check if user is system admin first
    const isSystemAdmin = user.get('isSystemAdmin') || user.get('isAdmin');
    if (isSystemAdmin) {
      console.log(`[PermissionService] User is system admin, granting all permissions`);
      return ['*']; // All permissions
    }
    
    // Fetch user's roles using secure cloud function
    const rolesResult = await safeParseCloudRun('getUserRoles', { userId: user.id });
    const userRoles = rolesResult.roles || [];
    
    console.log(`[PermissionService] Found ${userRoles.length} roles for user`);
    
    if (userRoles.length === 0) {
      console.log(`[PermissionService] No roles found, returning default permissions`);
      return DEFAULT_PERMISSIONS;
    }
    
    const permissions = new Set<string>();
    
    // Process each role
    for (const role of userRoles) {
      const roleName = typeof role.getName === 'function' ? role.getName() : role.name;
      console.log(`[PermissionService] Processing role: ${roleName}`);
      
      // Check for system-wide roles first
      if (ROLE_PERMISSION_MAP[roleName]) {
        const rolePermissions = ROLE_PERMISSION_MAP[roleName];
        if (rolePermissions.includes('*')) {
          console.log(`[PermissionService] Role ${roleName} has all permissions`);
          return ['*']; // All permissions
        }
        rolePermissions.forEach(perm => permissions.add(perm));
        continue;
      }
      
      // Check for organization-specific roles (format: roleType_orgId)
      if (orgId && roleName.includes('_')) {
        const lastUnderscoreIndex = roleName.lastIndexOf('_');
        const roleOrgId = roleName.substring(lastUnderscoreIndex + 1);
        const roleType = roleName.substring(0, lastUnderscoreIndex);
        
        // Only process roles for the current organization
        if (roleOrgId === orgId && ROLE_PERMISSION_MAP[roleType]) {
          console.log(`[PermissionService] Processing org-specific role: ${roleType} for org ${roleOrgId}`);
          const rolePermissions = ROLE_PERMISSION_MAP[roleType];
          rolePermissions.forEach(perm => permissions.add(perm));
        }
      }
      
      // Check for custom permissions stored directly on the role
      const customPermissions = role.get('permissions');
      if (Array.isArray(customPermissions)) {
        console.log(`[PermissionService] Adding custom permissions from role ${roleName}:`, customPermissions);
        customPermissions.forEach(perm => permissions.add(perm));
      }
    }
    
    // If no permissions found, return default
    if (permissions.size === 0) {
      console.log(`[PermissionService] No permissions mapped from roles, returning default permissions`);
      return DEFAULT_PERMISSIONS;
    }
    
    const finalPermissions = Array.from(permissions);
    console.log(`[PermissionService] Final permissions for user:`, finalPermissions);
    
    return finalPermissions;
    
  } catch (error) {
    console.error(`[PermissionService] Error fetching user permissions:`, error);
    // Return default permissions on error to prevent complete lockout
    return DEFAULT_PERMISSIONS;
  }
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  // Check for wildcard permission (all permissions)
  if (userPermissions.includes('*')) {
    return true;
  }
  
  // Check for exact permission match
  return userPermissions.includes(requiredPermission);
}

/**
 * Check if user has any of the required permissions
 */
export function hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
  // Check for wildcard permission (all permissions)
  if (userPermissions.includes('*')) {
    return true;
  }
  
  // Check if user has any of the required permissions
  return requiredPermissions.some(perm => userPermissions.includes(perm));
}

/**
 * Check if user has all of the required permissions
 */
export function hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
  // Check for wildcard permission (all permissions)
  if (userPermissions.includes('*')) {
    return true;
  }
  
  // Check if user has all required permissions
  return requiredPermissions.every(perm => userPermissions.includes(perm));
}
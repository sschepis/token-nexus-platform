// src/controllers/permissionManager/utils/PermissionUtils.ts

import { UserContext, ActionDefinition } from '../../types/ActionTypes';
import { getRolePermissions } from '../data/RolePermissions';

export function hasRequiredPermissions(requiredPermissions: string[], userContext: UserContext): boolean {
  if (requiredPermissions.length === 0) {
    return true; // No permissions required
  }

  const userPermissions = [
    ...userContext.permissions,
    ...userContext.roles,
    ...expandRolePermissions(userContext.roles)
  ];

  // Check for wildcard permission
  if (userPermissions.includes('*')) {
    return true;
  }

  // Check if user has any of the required permissions
  return requiredPermissions.some(permission => 
    userPermissions.includes(permission) ||
    matchesWildcardPermission(permission, userPermissions)
  );
}

export function expandRolePermissions(roles: string[]): string[] {
  const expandedPermissions: string[] = [];
  
  roles.forEach(role => {
    const rolePermissions = getRolePermissions(role);
    expandedPermissions.push(...rolePermissions);
  });

  return expandedPermissions;
}

export function matchesWildcardPermission(permission: string, userPermissions: string[]): boolean {
  return userPermissions.some(userPerm => {
    if (userPerm.endsWith('.*')) {
      const prefix = userPerm.slice(0, -1);
      return permission.startsWith(prefix + '.');
    }
    return false;
  });
}
// src/utils/permissionUtils.ts
import Parse from 'parse';
import { store } from '../store/store';
import { refreshPermissions } from '../store/slices/authSlice';
import { getUserPermissions } from '../services/permissionService';

/**
 * Refresh user permissions for the current organization
 */
export async function refreshUserPermissions(orgId?: string): Promise<void> {
  try {
    const currentUser = Parse.User.current();
    if (!currentUser) {
      console.warn('[PermissionUtils] No current user found, cannot refresh permissions');
      return;
    }

    const state = store.getState();
    const currentOrgId = orgId || state.auth.orgId;

    console.log(`[PermissionUtils] Refreshing permissions for user ${currentUser.id}, orgId: ${currentOrgId}`);

    // Fetch fresh permissions
    const freshPermissions = await getUserPermissions(currentUser, currentOrgId || undefined);
    
    console.log(`[PermissionUtils] Fresh permissions loaded:`, freshPermissions);

    // Update Redux state
    store.dispatch(refreshPermissions({
      permissions: freshPermissions,
      orgId: currentOrgId
    }));

    console.log(`[PermissionUtils] Permissions refreshed successfully`);
  } catch (error) {
    console.error('[PermissionUtils] Error refreshing permissions:', error);
    throw error;
  }
}

/**
 * Refresh permissions when switching organizations
 */
export async function refreshPermissionsForOrganization(newOrgId: string): Promise<void> {
  try {
    console.log(`[PermissionUtils] Switching to organization ${newOrgId} and refreshing permissions`);
    await refreshUserPermissions(newOrgId);
  } catch (error) {
    console.error('[PermissionUtils] Error refreshing permissions for organization:', error);
    throw error;
  }
}

/**
 * Check if user has permission with real-time validation
 */
export async function validatePermission(permission: string, orgId?: string): Promise<boolean> {
  try {
    const currentUser = Parse.User.current();
    if (!currentUser) {
      return false;
    }

    const state = store.getState();
    const currentOrgId = orgId || state.auth.orgId;

    // Get fresh permissions for validation
    const permissions = await getUserPermissions(currentUser, currentOrgId || undefined);
    
    // Check for wildcard permission
    if (permissions.includes('*')) {
      return true;
    }

    // Check for specific permission
    return permissions.includes(permission);
  } catch (error) {
    console.error('[PermissionUtils] Error validating permission:', error);
    return false;
  }
}

/**
 * Get user's current permissions without updating state
 */
export async function getCurrentUserPermissions(orgId?: string): Promise<string[]> {
  try {
    const currentUser = Parse.User.current();
    if (!currentUser) {
      return [];
    }

    const state = store.getState();
    const currentOrgId = orgId || state.auth.orgId;

    return await getUserPermissions(currentUser, currentOrgId || undefined);
  } catch (error) {
    console.error('[PermissionUtils] Error getting current user permissions:', error);
    return [];
  }
}

/**
 * Debug function to log current permission state
 */
export function debugPermissionState(): void {
  const state = store.getState();
  const { auth } = state;
  
  console.log('[PermissionUtils] Current permission state:', {
    isAuthenticated: auth.isAuthenticated,
    userId: auth.user?.id,
    userIsAdmin: auth.user?.isAdmin,
    orgId: auth.orgId,
    permissionsCount: auth.permissions.length,
    permissions: auth.permissions
  });
}
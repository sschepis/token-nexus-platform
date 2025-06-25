
import Parse from 'parse';
import { useAppSelector } from '../store/hooks';
import { hasPermission as checkPermission, hasAnyPermission, hasAllPermissions } from '../services/permissionService';

export const usePermission = () => {
  const { permissions, user, isAuthenticated } = useAppSelector((state) => state.auth);
  
  // Enhanced logging for debugging
  console.log('[usePermission] Hook called with state:', {
    isAuthenticated,
    userId: user?.id,
    userIsAdmin: user?.isAdmin,
    permissionsCount: Array.isArray(permissions) ? permissions.length : 0,
    permissions: permissions
  });

  const hasPermission = (permission: string): boolean => {
    // If not authenticated, deny all permissions
    if (!isAuthenticated) {
      console.log(`[usePermission] User not authenticated, denying permission: ${permission}`);
      return false;
    }

    // Primary system admin check
    const isSystemAdmin = user?.isAdmin === true;
    if (isSystemAdmin) {
      console.log(`[usePermission] System admin detected, granting permission: ${permission}`);
      return true;
    }
    
    // Fallback: Check Parse user directly if Redux state seems incomplete
    if (Array.isArray(permissions) && permissions.length === 0) {
      const currentParseUser = Parse.User.current();
      if (currentParseUser && (currentParseUser.get('isSystemAdmin') || currentParseUser.get('isAdmin'))) {
        console.log(`[usePermission] Fallback system admin check passed for: ${permission}`);
        return true;
      }
    }
    
    // Check if permissions array is valid
    if (!Array.isArray(permissions)) {
      console.warn(`[usePermission] Permissions is not an array:`, permissions);
      return false;
    }
    
    // Use the permission service for checking
    const result = checkPermission(permissions, permission);
    console.log(`[usePermission] Checking permission: ${permission}, result: ${result}`);
    
    return result;
  };

  const checkAnyPermission = (permissionList: string[]): boolean => {
    // If not authenticated, deny all permissions
    if (!isAuthenticated) {
      console.log(`[usePermission] User not authenticated, denying any permissions check`);
      return false;
    }

    // Primary system admin check
    const isSystemAdmin = user?.isAdmin === true;
    if (isSystemAdmin) {
      console.log(`[usePermission] System admin detected, granting any permissions check`);
      return true;
    }
    
    // Fallback: Check Parse user directly if Redux state seems incomplete
    if (Array.isArray(permissions) && permissions.length === 0) {
      const currentParseUser = Parse.User.current();
      if (currentParseUser && (currentParseUser.get('isSystemAdmin') || currentParseUser.get('isAdmin'))) {
        console.log(`[usePermission] Fallback system admin check passed for any permissions: ${permissionList.join(', ')}`);
        return true;
      }
    }
    
    // Check if permissions array is valid
    if (!Array.isArray(permissions)) {
      console.warn(`[usePermission] Permissions is not an array for any permissions check:`, permissions);
      return false;
    }
    
    const result = hasAnyPermission(permissions, permissionList);
    console.log(`[usePermission] Checking any permissions: ${permissionList.join(', ')}, result: ${result}`);
    return result;
  };

  const checkAllPermissions = (permissionList: string[]): boolean => {
    // If not authenticated, deny all permissions
    if (!isAuthenticated) {
      console.log(`[usePermission] User not authenticated, denying all permissions check`);
      return false;
    }

    // Primary system admin check
    const isSystemAdmin = user?.isAdmin === true;
    if (isSystemAdmin) {
      console.log(`[usePermission] System admin detected, granting all permissions check`);
      return true;
    }
    
    // Fallback: Check Parse user directly if Redux state seems incomplete
    if (Array.isArray(permissions) && permissions.length === 0) {
      const currentParseUser = Parse.User.current();
      if (currentParseUser && (currentParseUser.get('isSystemAdmin') || currentParseUser.get('isAdmin'))) {
        console.log(`[usePermission] Fallback system admin check passed for all permissions: ${permissionList.join(', ')}`);
        return true;
      }
    }
    
    // Check if permissions array is valid
    if (!Array.isArray(permissions)) {
      console.warn(`[usePermission] Permissions is not an array for all permissions check:`, permissions);
      return false;
    }
    
    const result = hasAllPermissions(permissions, permissionList);
    console.log(`[usePermission] Checking all permissions: ${permissionList.join(', ')}, result: ${result}`);
    return result;
  };

  return {
    hasPermission,
    checkAnyPermission,
    checkAllPermissions,
    // Expose raw permissions for debugging
    permissions,
    isAuthenticated,
    user
  };
};

export default usePermission;

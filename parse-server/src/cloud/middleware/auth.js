/**
 * Authentication Middleware for Parse Cloud Functions
 * Provides various authentication checks and role validations
 */

/**
 * Basic authentication middleware - ensures user is logged in
 * @param {Function} handler - The cloud function handler to wrap
 * @returns {Function} - Wrapped handler with authentication check
 */
function withAuth(handler) {
  return async (request) => {
    const { user, functionName } = request;
    
    if (!user) {
      throw new Parse.Error(
        Parse.Error.INVALID_SESSION_TOKEN,
        'Authentication required. Please log in to access this function.'
      );
    }
    
    console.log(`[Auth] User authenticated for ${functionName}: ${user.id}`);
    return await handler(request);
  };
}

/**
 * Master key middleware - ensures request has master key privileges
 * @param {Function} handler - The cloud function handler to wrap
 * @returns {Function} - Wrapped handler with master key check
 */
function withMasterKey(handler) {
  return async (request) => {
    const { master, functionName } = request;
    
    if (!master) {
      throw new Parse.Error(
        Parse.Error.OPERATION_FORBIDDEN,
        'Master key required. This operation requires elevated privileges.'
      );
    }
    
    console.log(`[Auth] Master key verified for ${functionName}`);
    return await handler(request);
  };
}

/**
 * System admin middleware - ensures user has system admin role
 * @param {Function} handler - The cloud function handler to wrap
 * @returns {Function} - Wrapped handler with system admin check
 */
function withSystemAdmin(handler) {
  return async (request) => {
    const { user, functionName } = request;
    
    if (!user) {
      throw new Parse.Error(
        Parse.Error.INVALID_SESSION_TOKEN,
        'Authentication required'
      );
    }
    
    // Check if user has system admin flag
    const isSystemAdmin = user.get('isSystemAdmin');
    if (!isSystemAdmin) {
      throw new Parse.Error(
        Parse.Error.OPERATION_FORBIDDEN,
        'System administrator privileges required'
      );
    }
    
    console.log(`[Auth] System admin verified for ${functionName}: ${user.id}`);
    return await handler(request);
  };
}

/**
 * Organization admin middleware - ensures user has admin role in their organization
 * @param {Function} handler - The cloud function handler to wrap
 * @returns {Function} - Wrapped handler with organization admin check
 */
function withOrgAdmin(handler) {
  return async (request) => {
    const { user, functionName } = request;
    
    if (!user) {
      throw new Parse.Error(
        Parse.Error.INVALID_SESSION_TOKEN,
        'Authentication required'
      );
    }
    
    try {
      // Get user's role in their organization
      const roleQuery = new Parse.Query(Parse.Role);
      roleQuery.equalTo('users', user);
      roleQuery.startsWith('name', 'admin_'); // Organization admin roles start with 'admin_'
      
      const adminRole = await roleQuery.first({ useMasterKey: true });
      
      if (!adminRole) {
        throw new Parse.Error(
          Parse.Error.OPERATION_FORBIDDEN,
          'Organization administrator privileges required'
        );
      }
      
      console.log(`[Auth] Organization admin verified for ${functionName}: ${user.id}`);
      return await handler(request);
    } catch (error) {
      if (error instanceof Parse.Error) {
        throw error;
      }
      console.error(`[Auth] Error checking organization admin role for ${functionName}:`, error);
      throw new Parse.Error(
        Parse.Error.INTERNAL_SERVER_ERROR,
        'Error validating administrator privileges'
      );
    }
  };
}

/**
 * Role-based middleware - ensures user has specific role
 * @param {string|string[]} requiredRoles - Role name(s) required
 * @returns {Function} - Middleware function
 */
function withRole(requiredRoles) {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  return function(handler) {
    return async (request) => {
      const { user, functionName } = request;
      
      if (!user) {
        throw new Parse.Error(
          Parse.Error.INVALID_SESSION_TOKEN,
          'Authentication required'
        );
      }
      
      try {
        // Check if user has any of the required roles
        const roleQuery = new Parse.Query(Parse.Role);
        roleQuery.equalTo('users', user);
        roleQuery.containedIn('name', roles);
        
        const userRole = await roleQuery.first({ useMasterKey: true });
        
        if (!userRole) {
          throw new Parse.Error(
            Parse.Error.OPERATION_FORBIDDEN,
            `Required role not found. User must have one of: ${roles.join(', ')}`
          );
        }
        
        console.log(`[Auth] Role verified for ${functionName}: ${userRole.get('name')}`);
        return await handler(request);
      } catch (error) {
        if (error instanceof Parse.Error) {
          throw error;
        }
        console.error(`[Auth] Error checking user role for ${functionName}:`, error);
        throw new Parse.Error(
          Parse.Error.INTERNAL_SERVER_ERROR,
          'Error validating user role'
        );
      }
    };
  };
}

/**
 * Permission-based middleware - ensures user has specific permission
 * @param {string|string[]} requiredPermissions - Permission name(s) required
 * @returns {Function} - Middleware function
 */
function withPermission(requiredPermissions) {
  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  
  return function(handler) {
    return async (request) => {
      const { user, functionName } = request;
      
      if (!user) {
        throw new Parse.Error(
          Parse.Error.INVALID_SESSION_TOKEN,
          'Authentication required'
        );
      }
      
      try {
        // Get user's permissions through roles
        const roleQuery = new Parse.Query(Parse.Role);
        roleQuery.equalTo('users', user);
        const userRoles = await roleQuery.find({ useMasterKey: true });
        
        if (!userRoles.length) {
          throw new Parse.Error(
            Parse.Error.OPERATION_FORBIDDEN,
            'No roles assigned to user'
          );
        }
        
        // Check if any role has the required permissions
        let hasPermission = false;
        for (const role of userRoles) {
          const rolePermissions = role.get('permissions') || [];
          if (permissions.some(perm => rolePermissions.includes(perm))) {
            hasPermission = true;
            break;
          }
        }
        
        if (!hasPermission) {
          throw new Parse.Error(
            Parse.Error.OPERATION_FORBIDDEN,
            `Required permission not found. User must have one of: ${permissions.join(', ')}`
          );
        }
        
        console.log(`[Auth] Permission verified for ${functionName}: ${permissions.join(', ')}`);
        return await handler(request);
      } catch (error) {
        if (error instanceof Parse.Error) {
          throw error;
        }
        console.error(`[Auth] Error checking user permission for ${functionName}:`, error);
        throw new Parse.Error(
          Parse.Error.INTERNAL_SERVER_ERROR,
          'Error validating user permission'
        );
      }
    };
  };
}

/**
 * Utility function to check if user is system admin
 * @param {Parse.User} user - User to check
 * @returns {boolean} - True if user is system admin
 */
function isSystemAdmin(user) {
  return user && user.get('isSystemAdmin') === true;
}

/**
 * Utility function to get user's roles
 * @param {Parse.User} user - User to get roles for
 * @returns {Promise<Parse.Role[]>} - Array of user's roles
 */
async function getUserRoles(user) {
  if (!user) return [];
  
  try {
    const roleQuery = new Parse.Query(Parse.Role);
    roleQuery.equalTo('users', user);
    return await roleQuery.find({ useMasterKey: true });
  } catch (error) {
    console.error('Error getting user roles:', error);
    return [];
  }
}

module.exports = {
  withAuth,
  withMasterKey,
  withSystemAdmin,
  withOrgAdmin,
  withRole,
  withPermission,
  isSystemAdmin,
  getUserRoles
};
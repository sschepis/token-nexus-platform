/**
 * Organization Context Middleware
 * Automatically injects organization context into Parse Cloud Functions
 * Reuses existing getUserOrganization pattern from visualTestingApi.js
 */

/**
 * Get user's organization using existing patterns
 * Reuses logic from visualTestingApi.js and organizationAware.js
 */
async function getUserOrganization(user) {
  if (!user) {
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User is required');
  }

  // First try currentOrganizationId field (string) - from ai/index.js pattern
  const orgId = user.get('currentOrganizationId');
  if (orgId) {
    try {
      const query = new Parse.Query('Organization');
      const org = await query.get(orgId, { useMasterKey: true });
      return org;
    } catch (error) {
      console.warn(`Organization with ID ${orgId} not found, trying fallbacks`);
    }
  }
  
  // Fallback to currentOrganization pointer - from auth.js pattern
  const currentOrg = user.get('currentOrganization');
  if (currentOrg) {
    // Handle Parse Pointer objects
    if (currentOrg.className === 'Organization' && currentOrg.id) {
      try {
        const query = new Parse.Query('Organization');
        const org = await query.get(currentOrg.id, { useMasterKey: true });
        return org;
      } catch (error) {
        console.warn(`Organization pointer ${currentOrg.id} not found, trying fallback`);
      }
    }
    // Handle already fetched Parse Objects
    else if (typeof currentOrg === 'object' && currentOrg.id && currentOrg.get) {
      return currentOrg;
    }
    // Handle string IDs (malformed data)
    else if (typeof currentOrg === 'string') {
      try {
        const query = new Parse.Query('Organization');
        const org = await query.get(currentOrg, { useMasterKey: true });
        return org;
      } catch (error) {
        console.warn(`Organization string ${currentOrg} not found, trying final fallback`);
      }
    }
  }
  
  // Final fallback: find organization where user is member - from visualTestingApi.js pattern
  const query = new Parse.Query('Organization');
  query.equalTo('users', user);
  const org = await query.first({ useMasterKey: true });
  
  if (!org) {
    throw new Parse.Error(
      Parse.Error.OBJECT_NOT_FOUND,
      'User not associated with any organization. Please contact your administrator.'
    );
  }
  
  return org;
}

/**
 * Middleware to automatically inject organization context into cloud function requests
 * Reuses organizationAware.js fallback pattern
 */
async function withOrganizationContext(request) {
  const { user, params, functionName } = request;
  
  // Skip for system admin functions or master key requests
  if (request.master) {
    console.log(`[OrgContext] Skipping middleware for master key request: ${functionName}`);
    return request;
  }

  // Skip for functions that don't need organization context
  const skipFunctions = [
    'customUserLogin',
    'bootstrap',
    'completeInitialSetup',
    'checkSystemStatus',
    'tenantHealthCheck'
  ];
  
  if (skipFunctions.includes(functionName)) {
    console.log(`[OrgContext] Skipping middleware for system function: ${functionName}`);
    return request;
  }

  if (!user) {
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Authentication required');
  }
  
  try {
    // Get organization using existing patterns
    const org = await getUserOrganization(user);
    
    // Inject organization context (reuse organizationAware.js pattern)
    // If organizationId is already provided, validate it matches user's org
    if (params.organizationId && params.organizationId !== org.id) {
      throw new Parse.Error(
        Parse.Error.OPERATION_FORBIDDEN, 
        'Cannot access different organization'
      );
    }
    
    // Inject organization context into request
    request.params.organizationId = org.id;
    request.organizationId = org.id;
    request.organization = org;
    
    console.log(`[OrgContext] Injected organization context for ${functionName}: ${org.id}`);
    
    return request;
  } catch (error) {
    console.error(`[OrgContext] Error in organization context middleware for ${functionName}:`, error);
    throw error;
  }
}

/**
 * Validate that user has access to the specified organization
 */
async function validateUserOrgAccess(user, organizationId) {
  try {
    const userOrg = await getUserOrganization(user);
    return userOrg.id === organizationId;
  } catch (error) {
    console.error('Error validating user organization access:', error);
    return false;
  }
}

/**
 * Get organization ID from user context (for backward compatibility)
 */
async function getUserOrganizationId(user) {
  try {
    const org = await getUserOrganization(user);
    return org.id;
  } catch (error) {
    console.error('Error getting user organization ID:', error);
    return null;
  }
}

module.exports = {
  withOrganizationContext,
  getUserOrganization,
  validateUserOrgAccess,
  getUserOrganizationId
};
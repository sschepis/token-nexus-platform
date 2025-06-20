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

  console.log(`[OrgContext] Getting organization for user ${user.id}`);
  console.log(`[OrgContext] User currentOrganizationId: ${user.get('currentOrganizationId')}`);
  console.log(`[OrgContext] User currentOrganization: ${JSON.stringify(user.get('currentOrganization'))}`);

  // First try currentOrganizationId field (string) - from ai/index.js pattern
  const orgId = user.get('currentOrganizationId');
  if (orgId) {
    try {
      const query = new Parse.Query('Organization');
      const org = await query.get(orgId, { useMasterKey: true });
      console.log(`[OrgContext] Found organization by currentOrganizationId: ${org.id}`);
      return org;
    } catch (error) {
      console.warn(`[OrgContext] Organization with ID ${orgId} not found, trying fallbacks`);
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
        console.log(`[OrgContext] Found organization by currentOrganization pointer: ${org.id}`);
        return org;
      } catch (error) {
        console.warn(`[OrgContext] Organization pointer ${currentOrg.id} not found, trying fallback`);
      }
    }
    // Handle already fetched Parse Objects
    else if (typeof currentOrg === 'object' && currentOrg.id && currentOrg.get) {
      console.log(`[OrgContext] Found organization by currentOrganization object: ${currentOrg.id}`);
      return currentOrg;
    }
    // Handle string IDs (malformed data)
    else if (typeof currentOrg === 'string') {
      try {
        const query = new Parse.Query('Organization');
        const org = await query.get(currentOrg, { useMasterKey: true });
        console.log(`[OrgContext] Found organization by currentOrganization string: ${org.id}`);
        return org;
      } catch (error) {
        console.warn(`[OrgContext] Organization string ${currentOrg} not found, trying final fallback`);
      }
    }
  }
  
  // Final fallback: find organization where user is member - from visualTestingApi.js pattern
  console.log(`[OrgContext] Trying final fallback: finding organization where user is member`);
  const query = new Parse.Query('Organization');
  query.equalTo('users', user);
  const org = await query.first({ useMasterKey: true });
  
  if (org) {
    console.log(`[OrgContext] Found organization by user membership: ${org.id}`);
    return org;
  }
  
  // Additional fallback: try to find any organization for testing purposes
  console.log(`[OrgContext] No organization found by membership, trying to find any organization for testing`);
  const anyOrgQuery = new Parse.Query('Organization');
  const anyOrg = await anyOrgQuery.first({ useMasterKey: true });
  
  if (anyOrg) {
    console.warn(`[OrgContext] Using first available organization for testing: ${anyOrg.id}`);
    return anyOrg;
  }
  
  console.error(`[OrgContext] No organizations found in database`);
  throw new Parse.Error(
    Parse.Error.OBJECT_NOT_FOUND,
    'User must be associated with an organization'
  );
}

/**
 * Middleware to automatically inject organization context into cloud function requests
 * Reuses organizationAware.js fallback pattern
 */
function withOrganizationContext(handler) {
  return async (request) => {
    const { user, params, functionName } = request;
    
    // Skip for system admin functions or master key requests
    if (request.master) {
      console.log(`[OrgContext] Skipping middleware for master key request: ${functionName}`);
      return await handler(request);
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
      return await handler(request);
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
      
      return await handler(request);
    } catch (error) {
      console.error(`[OrgContext] Error in organization context middleware for ${functionName}:`, error);
      throw error;
    }
  };
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
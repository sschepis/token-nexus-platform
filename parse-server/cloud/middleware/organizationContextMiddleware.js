// Middleware for handling organization context in Parse Cloud Functions

/**
 * Helper function to robustly fetch the user's current organization.
 * @param {Parse.User} user - The Parse.User object.
 * @returns {Promise<Parse.Object|null>} The organization Parse Object or null.
 */
async function getUserOrganization(user) {
  if (!user) {
    return null;
  }

  try {
    // Attempt 1: Check if organization is directly on the user object (e.g., from included query)
    console.log(`[DEBUG Middleware] User object: ${JSON.stringify(user.toJSON())}`);
    let organization = user.get('organization');
    console.log(`[DEBUG Middleware] User.get('organization'): ${organization ? organization.id : 'null'}`);
    if (organization && organization.id) {
      // If it's a pointer, ensure it's fetched completely if needed beyond just id
      if (typeof organization.fetch === 'function') {
        try {
          await organization.fetch({ useMasterKey: true });
          console.log(`[DEBUG Middleware] Fetched user's organization directly: ${organization.id}`);
        } catch (fetchError) {
          console.warn(`[DEBUG Middleware] Failed to fetch user's organization directly: ${fetchError.message}`);
          organization = null; // Reset if fetch fails
        }
      }
      if (organization && organization.id) {
          return organization;
      }
    }

    // Attempt 2: Query for user's organization based on user's organizationPointer field
    const orgPointer = user.get('organizationPointer');
    console.log(`[DEBUG Middleware] User.get('organizationPointer'): ${orgPointer ? orgPointer.id : 'null'}`);
    if (orgPointer && orgPointer.id) {
      const Organization = Parse.Object.extend('Organization');
      const query = new Parse.Query(Organization);
      organization = await query.get(orgPointer.id, { useMasterKey: true });
      console.log(`[DEBUG Middleware] Queried user's organization by pointer: ${organization ? organization.id : 'null'}`);
      if (organization && organization.id) {
        return organization;
      }
    }
  } catch (error) {
    console.error('Error fetching user organization in middleware:', error);
  }
  return null;
}

/**
 * Middleware function to inject organizationId and organization object into Parse request.
 * Functions wrapped with this middleware will have request.organizationId and request.organization available.
 * If the user is a SystemAdmin, no organization context is applied by this middleware,
 * allowing them to operate globally unless explicitly filtered by the Cloud Function.
 *
 * @param {function} cloudFunction - The Parse Cloud Function to wrap.
 * @returns {function} The wrapped Cloud Function.
 */
function withOrganizationContext(cloudFunction) {
  return async (request) => {
    // SystemAdmin role can bypass organization context for broad operations
    // Check if user is a system admin via the isAdmin flag or SystemAdmin role membership
    const isSystemAdmin = request.user && (
      request.user.get('isAdmin') === true ||
      request.user.get('isSystemAdmin') === true
    );

    if (isSystemAdmin) {
      console.log('SystemAdmin detected, skipping organization context enforcement.');
      return cloudFunction(request);
    }

    let organizationId = request.params.organizationId || request.headers['x-parse-organization-id'];
    let organization = null;

    if (request.user) {
      // For authenticated non-SystemAdmin users, prioritize their assigned organization
      const userOrg = await getUserOrganization(request.user);
      if (userOrg) {
        organization = userOrg;
        organizationId = userOrg.id;
        console.log(`Authenticated user organization context: ${organizationId}`);
      } else if (!organizationId) {
        // If user is authenticated but has no assigned org_id and none was passed
        throw new Error('UNAUTHORIZED: Authenticated user does not belong to an organization, and no organization ID was provided.');
      }
    }

    if (!organization && organizationId) {
      // If organization ID was provided but not derived from user (e.g., public API or SystemAdmin using specific org)
      try {
        const Organization = Parse.Object.extend('Organization');
        const query = new Parse.Query(Organization);
        organization = await query.get(organizationId, { useMasterKey: true });
        if (!organization) {
          throw new Error('NOT_FOUND: Organization not found with the provided ID.');
        }
        console.log(`Provided organization ID context: ${organizationId}`);
      } catch (error) {
        console.error(`Error resolving organization context for ID ${organizationId}:`, error);
        throw new Error(`Invalid Organization ID: ${organizationId}`);
      }
    }

    if (!organizationId && !request.user) {
        throw new Error('UNAUTHORIZED: Organization ID is required for unauthenticated requests, or user must be authenticated.');
    }

    // Inject the organization context into the request object
    request.organizationId = organizationId;
    request.organization = organization;

    return cloudFunction(request);
  };
}

module.exports = {
  getUserOrganization,
  withOrganizationContext,
};
const utils = require('../utils');
const logger = utils.logger;

// Helper function to check for system admin permission
const requireSystemAdmin = (user) => {
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "User must be authenticated.");
  }
  // This assumes the 'permissions' array is available on the user object after customUserLogin
  // Or, if using Parse Roles, check if user belongs to "SystemAdmin" role.
  // For simplicity with current setup, we'll re-fetch and check the isSystemAdmin flag.
  // This is not ideal for performance in every function; a role-based check or session-propagated permission is better.
  // However, to align with the `isSystemAdmin` field directly for now:
  return new Parse.Query(Parse.User).get(user.id, { useMasterKey: true }).then(fullUser => {
    if (!fullUser.get("isSystemAdmin")) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "System administrator permission required.");
    }
    return fullUser;
  });
};

// Helper function to check if user is an admin of the specified org OR a system admin
const requireOrgAdminOrSystemAdmin = async (user, orgId) => {
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "User must be authenticated.");
  }
  if (!orgId) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "Organization ID is required for this operation.");
  }

  const fullUser = await new Parse.Query(Parse.User).get(user.id, { useMasterKey: true });
  if (fullUser.get("isSystemAdmin")) {
    return fullUser; // System admin has access
  }

  const userOrgPointer = fullUser.get("orgId"); 
  if (!userOrgPointer || userOrgPointer.id !== orgId) {
    // This check might be too strict if a user can be admin of multiple orgs 
    // but only has one primary 'orgId' pointer.
    // A better check involves querying the specific OrgAdmin role for that orgId.
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "User is not a member of the specified organization or operation is for a different organization.");
  }

  // Placeholder for actual role check for Org Admin.
  // A true role check (e.g., for a role named `orgAdmin_${orgId}`) is more robust.
  // For now, this simplified check assumes frontend/ACLs gate actions to org admins.
  logger.info(`User ${user.id} accessing/modifying org ${orgId}. Org membership confirmed. Specific 'orgAdmin' role check would be the next step for write operations if not covered by ACLs.`);

  return fullUser; // Return the user object if checks pass
};

const { defineFunction, withValidation } = require('./middleware');

// Validation schema for customUserLogin
const loginSchema = {
  username: { type: 'string', required: true, minLength: 1, maxLength: 100 },
  password: { type: 'string', required: true, minLength: 1 }
};

const customUserLoginHandler = async (request) => {
  const { username, password } = request.params; // Parameters are already validated by withValidation middleware

  try {
    const user = await Parse.User.logIn(username, password);
    const fullUser = await new Parse.Query(Parse.User)
      .include("currentOrganization")
      .get(user.id, { useMasterKey: true });

    const isSystemAdmin = fullUser.get("isAdmin") || fullUser.get("isSystemAdmin") || false;
    let currentOrg = fullUser.get("currentOrganization");
    let orgId = null;
    
    // Enhanced currentOrganization parsing with validation and repair
    if (currentOrg) {
      // Handle different possible formats of currentOrganization
      if (typeof currentOrg === 'string') {
        // Handle string ID format (malformed data)
        orgId = currentOrg;
        logger.info(`Found string currentOrganization for user ${user.id}: ${orgId}`);
      } else if (currentOrg.id) {
        // Handle proper Parse Pointer
        orgId = currentOrg.id;
      } else if (currentOrg.objectId) {
        // Handle object with objectId
        orgId = currentOrg.objectId;
      } else if (currentOrg.get && typeof currentOrg.get === 'function') {
        // Handle Parse Object
        orgId = currentOrg.get('objectId');
      }
      
      // Validate organization exists and repair malformed data
      if (orgId) {
        try {
          const orgQuery = new Parse.Query("Organization");
          const validOrg = await orgQuery.get(orgId, { useMasterKey: true });
          
          if (validOrg && typeof currentOrg === 'string') {
            // Repair: Convert string to proper Pointer and set both fields
            logger.info(`Repairing malformed currentOrganization for user ${user.id}`);
            fullUser.set("currentOrganization", validOrg);
            fullUser.set("currentOrganizationId", validOrg.id);
            await fullUser.save(null, { useMasterKey: true });
            currentOrg = validOrg;
          } else if (validOrg && !fullUser.get("currentOrganizationId")) {
            // Ensure currentOrganizationId is set for consistency
            fullUser.set("currentOrganizationId", validOrg.id);
            await fullUser.save(null, { useMasterKey: true });
          }
        } catch (orgError) {
          logger.warn(`Organization ${orgId} not found for user ${user.id}, will use fallback:`, orgError.message);
          orgId = null;
          currentOrg = null;
        }
      }
    }

    // Enhanced fallback logic when currentOrganization is invalid
    if (!orgId) {
      try {
        // Get user's organizations directly from relation
        const userOrgsQuery = fullUser.relation("organizations").query();
        const userOrgs = await userOrgsQuery.find({ useMasterKey: true });
        
        if (userOrgs.length > 0) {
          // Set the first organization as current with both fields
          const firstOrg = userOrgs[0];
          fullUser.set("currentOrganization", firstOrg);
          fullUser.set("currentOrganizationId", firstOrg.id);
          await fullUser.save(null, { useMasterKey: true });
          
          orgId = firstOrg.id;
          currentOrg = firstOrg;
          
          logger.info(`Set first organization ${orgId} as current for user ${user.id}`);
        }
      } catch (error) {
        logger.warn(`Could not fetch user organizations for user ${user.id}:`, error);
      }
    }

    // Ensure user has a current organization set (fallback)
    if (!orgId) {
      try {
        const orgResult = await Parse.Cloud.run('ensureUserHasCurrentOrg', {}, { sessionToken: user.getSessionToken() });
        if (orgResult.hasCurrentOrg) {
          orgId = orgResult.orgId;
          // Refetch the user to get the updated currentOrganization
          const updatedUser = await new Parse.Query(Parse.User)
            .include("currentOrganization")
            .get(user.id, { useMasterKey: true });
          currentOrg = updatedUser.get("currentOrganization");
        }
      } catch (error) {
        logger.warn(`Could not ensure user ${user.id} has current org:`, error);
        // Continue with login even if org setup fails
      }
    }

    let permissions = [
      "dashboard:read", "objects:read", "tokens:read", "users:read", 
      "integrations:read", "reports:read", "audit:read", 
      "notifications:read", "settings:read", "marketplace:read"
    ];

    if (isSystemAdmin) {
      permissions.push("system:admin", "users:write", "tokens:write", "integrations:write", "settings:write");
    } else if (orgId) {
      // Placeholder for fetching org-specific roles and permissions
      // e.g., if (userIsInRole(`orgAdmin_${orgId}`)) { permissions.push("orgSettings:write"); }
    }

    const frontendUser = {
      id: fullUser.id,
      email: fullUser.get("email"),
      firstName: fullUser.get("firstName") || '',
      lastName: fullUser.get("lastName") || '',
      avatarUrl: fullUser.get("avatarUrl"),
    };

    return {
      user: frontendUser,
      token: user.getSessionToken(),
      orgId: orgId,
      permissions: permissions,
      isAdmin: isSystemAdmin, // Added isAdmin flag
    };
  } catch (error) {
    logger.error("Custom user login error:", error);
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "Invalid login credentials.");
  }
};

// Define the cloud function with middleware
defineFunction("customUserLogin", [
  withValidation(loginSchema)
], customUserLoginHandler);

module.exports = {
  requireSystemAdmin,
  requireOrgAdminOrSystemAdmin,
  // customUserLogin is defined via Parse.Cloud.define, so it's automatically available.
};
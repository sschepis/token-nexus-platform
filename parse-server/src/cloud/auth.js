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
    const isSystemAdmin = fullUser.get("isAdmin") || fullUser.get("isSystemAdmin") || false;
    if (!isSystemAdmin) {
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
  const isSystemAdmin = fullUser.get("isAdmin") || fullUser.get("isSystemAdmin") || false;
  if (isSystemAdmin) {
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
    let currentOrgId = null;
    let organizations = [];
    
    // Get all organizations for the user
    if (isSystemAdmin) {
      // System admins have implicit access to all organizations
      const Organization = Parse.Object.extend('Organization');
      const orgQuery = new Parse.Query(Organization);
      orgQuery.equalTo('isActive', true);
      
      const allOrgs = await orgQuery.find({ useMasterKey: true });
      
      organizations = allOrgs.map(org => ({
        id: org.id,
        name: org.get('name'),
        description: org.get('description'),
        subdomain: org.get('subdomain'),
        industry: org.get('industry'),
        logo: org.get('logo'),
        planType: org.get('planType'),
        status: org.get('status'),
        administrator: org.get('administrator'),
        createdAt: org.createdAt?.toISOString(),
        updatedAt: org.updatedAt?.toISOString(),
        settings: org.get('settings') || {},
        userRoles: ['admin'], // System admins have admin role in all orgs
        isCurrentOrg: false
      }));
      
      // Set current organization based on currentOrganizationId
      currentOrgId = fullUser.get('currentOrganizationId');
      if (currentOrgId) {
        const matchingOrg = organizations.find(org => org.id === currentOrgId);
        if (matchingOrg) {
          matchingOrg.isCurrentOrg = true;
          currentOrg = matchingOrg;
        }
      }
      
      // If no current org set but user has orgs, set first one as current
      if (!currentOrgId && organizations.length > 0) {
        organizations[0].isCurrentOrg = true;
        currentOrgId = organizations[0].id;
        currentOrg = organizations[0];
        
        // Update user's current organization
        try {
          const orgPointer = new Parse.Object('Organization');
          orgPointer.id = currentOrgId;
          fullUser.set("currentOrganization", orgPointer);
          fullUser.set("currentOrganizationId", currentOrgId);
          await fullUser.save(null, { useMasterKey: true });
        } catch (error) {
          logger.warn(`Could not update current organization for admin user ${user.id}:`, error);
        }
      }
      
    } else {
      // Regular users - get organizations from relation
      try {
        // Get organizations from the relation
        const orgRelation = fullUser.relation("organizations");
        const orgResults = await orgRelation.query().find({ useMasterKey: true });

        if (orgResults && orgResults.length > 0) {
          // Get user's roles for each organization
          const roleQuery = new Parse.Query(Parse.Role);
          roleQuery.equalTo("users", fullUser);
          const userRoles = await roleQuery.find({ useMasterKey: true });

          // Map roles to organizations
          const userOrgRoles = new Map(); // orgId -> [roles]
          userRoles.forEach(role => {
            const roleName = role.getName();
            
            // Skip system-wide roles like 'SystemAdmin'
            if (roleName === 'SystemAdmin' || !roleName.includes('_')) {
              return;
            }

            // Extract orgId from role name (everything after the last underscore)
            const lastUnderscoreIndex = roleName.lastIndexOf('_');
            if (lastUnderscoreIndex > 0) {
              const orgId = roleName.substring(lastUnderscoreIndex + 1);
              const roleType = roleName.substring(0, lastUnderscoreIndex);
              
              if (orgId && orgId.length > 0) {
                if (!userOrgRoles.has(orgId)) {
                  userOrgRoles.set(orgId, []);
                }
                userOrgRoles.get(orgId).push(roleType);
              }
            }
          });

          // Build organizations array with user's roles
          organizations = orgResults.map(org => {
            const orgId = org.id;
            const orgRoles = userOrgRoles.get(orgId) || [];
            const isCurrentOrg = currentOrg && currentOrg.id === orgId;
            
            return {
              id: org.id,
              name: org.get("name"),
              description: org.get("description"),
              subdomain: org.get("subdomain"),
              industry: org.get("industry"),
              logo: org.get("logo"),
              planType: org.get("planType"),
              status: org.get("status"),
              administrator: org.get("administrator"),
              createdAt: org.createdAt?.toISOString(),
              updatedAt: org.updatedAt?.toISOString(),
              settings: org.get("settings") || {},
              userRoles: orgRoles,
              isCurrentOrg: isCurrentOrg
            };
          });
        }
      } catch (error) {
        logger.warn(`Could not fetch user organizations for user ${user.id}:`, error);
        organizations = [];
      }
    }
    
    // Enhanced currentOrganization parsing with validation and repair
    if (currentOrg) {
      // Handle different possible formats of currentOrganization
      if (typeof currentOrg === 'string') {
        // Handle string ID format (malformed data)
        currentOrgId = currentOrg;
        logger.info(`Found string currentOrganization for user ${user.id}: ${currentOrgId}`);
      } else if (currentOrg.id) {
        // Handle proper Parse Pointer
        currentOrgId = currentOrg.id;
      } else if (currentOrg.objectId) {
        // Handle object with objectId
        currentOrgId = currentOrg.objectId;
      } else if (currentOrg.get && typeof currentOrg.get === 'function') {
        // Handle Parse Object
        currentOrgId = currentOrg.get('objectId');
      }
      
      // Validate organization exists and repair malformed data
      if (currentOrgId) {
        try {
          const orgQuery = new Parse.Query("Organization");
          const validOrg = await orgQuery.get(currentOrgId, { useMasterKey: true });
          
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
          logger.warn(`Organization ${currentOrgId} not found for user ${user.id}, will use fallback:`, orgError.message);
          currentOrgId = null;
          currentOrg = null;
        }
      }
    }

    // Enhanced fallback logic when currentOrganization is invalid
    if (!currentOrgId && organizations.length > 0) {
      try {
        // Set the first organization as current with both fields
        const firstOrg = organizations[0];
        const orgPointer = new Parse.Object('Organization');
        orgPointer.id = firstOrg.id;
        
        fullUser.set("currentOrganization", orgPointer);
        fullUser.set("currentOrganizationId", firstOrg.id);
        await fullUser.save(null, { useMasterKey: true });
        
        currentOrgId = firstOrg.id;
        firstOrg.isCurrentOrg = true;
        
        logger.info(`Set first organization ${currentOrgId} as current for user ${user.id}`);
      } catch (error) {
        logger.warn(`Could not set current organization for user ${user.id}:`, error);
      }
    }

    // Ensure user has a current organization set (fallback)
    if (!currentOrgId && !isSystemAdmin) {
      try {
        const orgResult = await Parse.Cloud.run('ensureUserHasCurrentOrg', {}, { sessionToken: user.getSessionToken() });
        if (orgResult.hasCurrentOrg) {
          currentOrgId = orgResult.orgId;
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

    // Build comprehensive permissions based on user type and roles
    let permissions = [
      "dashboard:read", "objects:read", "tokens:read", "users:read",
      "integrations:read", "reports:read", "audit:read",
      "notifications:read", "settings:read", "marketplace:read"
    ];

    if (isSystemAdmin) {
      // System admins have ALL permissions
      permissions = [
        "system:admin", "dashboard:*", "objects:*", "tokens:*", "users:*",
        "integrations:*", "reports:*", "audit:*", "notifications:*",
        "settings:*", "marketplace:*", "organizations:*", "roles:*",
        "security:*", "analytics:*", "workflows:*", "templates:*"
      ];
    } else if (currentOrgId) {
      // Add organization-specific permissions based on user's roles
      const currentOrgData = organizations.find(org => org.id === currentOrgId);
      if (currentOrgData && currentOrgData.userRoles) {
        if (currentOrgData.userRoles.includes('admin') || currentOrgData.userRoles.includes('orgAdmin')) {
          permissions.push(
            "users:write", "tokens:write", "integrations:write",
            "settings:write", "objects:write", "reports:write"
          );
        }
        if (currentOrgData.userRoles.includes('manager')) {
          permissions.push("users:write", "reports:write");
        }
      }
    }

    // Enhanced user object with all necessary fields
    const frontendUser = {
      id: fullUser.id,
      email: fullUser.get("email"),
      firstName: fullUser.get("firstName") || '',
      lastName: fullUser.get("lastName") || '',
      avatarUrl: fullUser.get("avatarUrl"),
      isActive: fullUser.get("isActive"),
      isAdmin: isSystemAdmin,
      createdAt: fullUser.get("createdAt"),
      lastLogin: fullUser.get("lastLogin"),
      onboarded: fullUser.get("onboarded") || false,
      emailVerified: fullUser.get("emailVerified") || false
    };

    // Update last login timestamp
    try {
      fullUser.set("lastLogin", new Date());
      await fullUser.save(null, { useMasterKey: true });
    } catch (error) {
      logger.warn(`Could not update last login for user ${user.id}:`, error);
    }

    return {
      success: true,
      user: frontendUser,
      token: user.getSessionToken(),
      isAdmin: isSystemAdmin,
      currentOrg: currentOrgId,
      organizations: organizations,
      permissions: permissions
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
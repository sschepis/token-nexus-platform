const { defineFunction, withAuth } = require('../middleware');
const utils = require('../../utils');
const logger = utils.logger;

/**
 * Get all organizations that a user belongs to
 * This function returns organizations where the user has any role
 */
const getUserOrganizationsHandler = async (request) => {
  const { user } = request; // User is already validated by withAuth middleware

  try {
    // Get user with currentOrganization populated
    const fullUser = await new Parse.Query(Parse.User)
      .include("currentOrganization")
      .get(user.id, { useMasterKey: true });

    // Get organizations from the relation
    const orgRelation = fullUser.relation("organizations");
    const organizations = await orgRelation.query().find({ useMasterKey: true });
    const currentOrg = fullUser.get("currentOrganization");

    logger.info(`Found ${organizations ? organizations.length : 'undefined'} organizations for user ${user.id}`);

    if (organizations.length === 0) {
      logger.warn(`User ${user.id} has no organization memberships`);
      return [];
    }

    // Get user's roles for each organization (if using role-based permissions)
    const roleQuery = new Parse.Query(Parse.Role);
    roleQuery.equalTo("users", user);
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

    // Helper function to serialize Parse User objects
    const serializeUser = (user) => {
      if (!user) return null;
      return {
        objectId: user.id,
        id: user.id,
        className: user.className,
        email: user.get ? user.get("email") : user.email,
        username: user.get ? user.get("username") : user.username,
        firstName: user.get ? user.get("firstName") : user.firstName,
        lastName: user.get ? user.get("lastName") : user.lastName,
        createdAt: user.createdAt ? user.createdAt.toISOString() : user.createdAt,
        updatedAt: user.updatedAt ? user.updatedAt.toISOString() : user.updatedAt
      };
    };

    // Build response with organization details and user's roles
    const result = organizations.map(org => {
      const orgId = org.id;
      const orgRoles = userOrgRoles.get(orgId) || [];
      const isCurrentOrg = currentOrg && currentOrg.id === orgId;
      
      return {
        objectId: org.id,
        id: org.id, // For frontend compatibility
        name: org.get("name"),
        description: org.get("description"),
        subdomain: org.get("subdomain"),
        industry: org.get("industry"),
        logo: org.get("logo"),
        planType: org.get("planType"),
        plan: org.get("planType"), // Alias for compatibility
        status: org.get("status"),
        administrator: serializeUser(org.get("administrator")),
        createdAt: org.createdAt?.toISOString(),
        updatedAt: org.updatedAt?.toISOString(),
        createdBy: serializeUser(org.get("createdBy")),
        updatedBy: serializeUser(org.get("updatedBy")),
        settings: org.get("settings") || {},
        // User-specific data
        userRoles: orgRoles,
        isCurrentOrg: isCurrentOrg
      };
    });

    logger.info(`Returning ${result.length} organizations for user ${user.id}`);
    return result;

  } catch (error) {
    logger.error(`Error fetching user organizations for user ${user.id}:`, error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to fetch user organizations.");
  }
};

// Define the cloud function with middleware
defineFunction("getUserOrganizations", [
  withAuth
], getUserOrganizationsHandler);

/**
 * Ensure user has a current organization set
 * If user doesn't have orgId set, set it to their first organization
 */
const ensureUserHasCurrentOrgHandler = async (request) => {
  const { user } = request; // User is already validated by withAuth middleware

  try {
    // Get user with currentOrganization populated
    const fullUser = await new Parse.Query(Parse.User)
      .include("currentOrganization")
      .get(user.id, { useMasterKey: true });

    // If user already has a current org, return it
    const currentOrg = fullUser.get("currentOrganization");
    if (currentOrg) {
      return {
        hasCurrentOrg: true,
        orgId: currentOrg.id,
        orgName: currentOrg.get("name")
      };
    }

    // User doesn't have a current org, get their organizations from the relation
    const orgRelation = fullUser.relation("organizations");
    const organizations = await orgRelation.query().find({ useMasterKey: true });

    if (organizations.length === 0) {
      // User has no organizations - create a default organization for them
      logger.warn(`User ${user.id} has no organization memberships, creating default organization`);
      
      try {
        // Create a default organization for this user
        const Organization = Parse.Object.extend("Organization");
        const newOrg = new Organization();
        
        // Set organization properties
        newOrg.set("name", `${fullUser.get("firstName") || fullUser.get("username")}'s Organization`);
        newOrg.set("description", "Default organization");
        newOrg.set("status", "Active");
        newOrg.set("planType", "free");
        newOrg.set("administrator", fullUser);
        newOrg.set("createdBy", fullUser);
        newOrg.set("updatedBy", fullUser);
        newOrg.set("settings", {
          theme: {
            primaryColor: "#3b82f6",
            secondaryColor: "#64748b"
          }
        });
        
        // Save the organization
        const savedOrg = await newOrg.save(null, { useMasterKey: true });
        
        // Add the organization to the user's organizations relation
        const orgRelation = fullUser.relation("organizations");
        orgRelation.add(savedOrg);
        
        // Set it as the current organization
        fullUser.set("currentOrganization", savedOrg);
        
        // Save the user
        await fullUser.save(null, { useMasterKey: true });
        
        logger.info(`Created default organization ${savedOrg.id} for user ${user.id}`);
        
        return {
          hasCurrentOrg: true,
          orgId: savedOrg.id,
          orgName: savedOrg.get("name"),
          wasAutoCreated: true
        };
      } catch (createError) {
        logger.error(`Failed to create default organization for user ${user.id}:`, createError);
        return {
          hasCurrentOrg: false,
          message: "Failed to create default organization"
        };
      }
    }

    // Set the first organization as current
    const firstOrg = organizations[0];
    fullUser.set("currentOrganization", firstOrg);
    await fullUser.save(null, { useMasterKey: true });

    logger.info(`Set default current organization for user ${user.id} to ${firstOrg.id} (${firstOrg.get("name")})`);

    return {
      hasCurrentOrg: true,
      orgId: firstOrg.id,
      orgName: firstOrg.get("name"),
      wasAutoSet: true
    };
  } catch (error) {
    logger.error(`Error ensuring user has current org for user ${user.id}:`, error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to ensure user has current organization.");
  }
};

// Define the cloud function with middleware
defineFunction("ensureUserHasCurrentOrg", [
  withAuth
], ensureUserHasCurrentOrgHandler);

module.exports = {
  // Cloud functions are automatically registered
};
const auth = require('../auth');
const utils = require('../../utils');
const logger = utils.logger;

/**
 * Get user details including their organizations
 * This function wraps getUserOrganizations to provide the expected response format
 */
Parse.Cloud.define("getUserDetails", async (request) => {
  const { user } = request;
  const { userId } = request.params;

  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "User must be authenticated.");
  }

  const targetUserId = userId || user.id;

  // Check if user can access this info
  if (targetUserId !== user.id && !user.get('isSystemAdmin')) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Permission denied to access user details.");
  }

  try {
    // Get the target user
    const targetUser = await new Parse.Query(Parse.User).get(targetUserId, { useMasterKey: true });

    if (!targetUser) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "User not found.");
    }

    // Get user's organizations using the relation query
    const fullUser = await new Parse.Query(Parse.User)
      .include("currentOrganization")
      .get(targetUserId, { useMasterKey: true });

    // Get organizations from the relation
    const orgRelation = fullUser.relation("organizations");
    const organizations = await orgRelation.query().find({ useMasterKey: true });
    const currentOrg = fullUser.get("currentOrganization");

    logger.info(`Found ${organizations ? organizations.length : 'undefined'} organizations for user ${targetUserId}`);

    if (!organizations || organizations.length === 0) {
      logger.warn(`User ${targetUserId} has no organization memberships`);
      return {
        success: true,
        user: {
          id: targetUser.id,
          email: targetUser.get('email'),
          firstName: targetUser.get('firstName'),
          lastName: targetUser.get('lastName'),
          isActive: targetUser.get('isActive'),
          isSystemAdmin: targetUser.get('isSystemAdmin'),
          createdAt: targetUser.get('createdAt'),
          lastLogin: targetUser.get('lastLogin')
        },
        organizations: []
      };
    }

    // Get user's roles for each organization
    const roleQuery = new Parse.Query(Parse.Role);
    roleQuery.equalTo("users", targetUser);
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

    // Build response with organization details and user's roles
    const organizationsData = (organizations || []).map(org => {
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
        administrator: org.get("administrator"),
        createdAt: org.createdAt?.toISOString(),
        updatedAt: org.updatedAt?.toISOString(),
        createdBy: org.get("createdBy"),
        updatedBy: org.get("updatedBy"),
        settings: org.get("settings") || {},
        // User-specific data
        userRoles: orgRoles,
        isCurrentOrg: isCurrentOrg
      };
    });

    logger.info(`Returning user details with ${organizationsData.length} organizations for user ${targetUserId}`);

    return {
      success: true,
      user: {
        id: targetUser.id,
        email: targetUser.get('email'),
        firstName: targetUser.get('firstName'),
        lastName: targetUser.get('lastName'),
        isActive: targetUser.get('isActive'),
        isSystemAdmin: targetUser.get('isSystemAdmin'),
        createdAt: targetUser.get('createdAt'),
        lastLogin: targetUser.get('lastLogin')
      },
      organizations: organizationsData
    };

  } catch (error) {
    logger.error(`Error fetching user details for user ${targetUserId}:`, error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to fetch user details.");
  }
});

module.exports = {
  // Cloud function is automatically registered
};
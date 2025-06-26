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
  if (targetUserId !== user.id && !user.get('isAdmin')) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Permission denied to access user details.");
  }

  try {
    // Get the target user
    const targetUser = await new Parse.Query(Parse.User).get(targetUserId, { useMasterKey: true });

    if (!targetUser) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "User not found.");
    }

    // Get user's organizations - handle both system admins and regular users
    let organizations = [];
    let currentOrgObject = null;
    
    if (targetUser.get('isAdmin')) {
      // System admins have implicit access to all organizations
      const Organization = Parse.Object.extend('Organization');
      const orgQuery = new Parse.Query(Organization);
      orgQuery.equalTo('isActive', true);
      
      const allOrgs = await orgQuery.find({ useMasterKey: true });
      
      organizations = allOrgs.map(org => ({
        objectId: org.id,
        id: org.id,
        name: org.get('name'),
        description: org.get('description'),
        subdomain: org.get('subdomain'),
        industry: org.get('industry'),
        logo: org.get('logo'),
        planType: org.get('planType'),
        plan: org.get('planType'),
        status: org.get('status'),
        administrator: org.get('administrator'),
        createdAt: org.createdAt?.toISOString(),
        updatedAt: org.updatedAt?.toISOString(),
        createdBy: org.get('createdBy'),
        updatedBy: org.get('updatedBy'),
        settings: org.get('settings') || {},
        userRoles: ['admin'], // System admins have admin role in all orgs
        isCurrentOrg: false
      }));
      
      // Set current organization based on currentOrganizationId
      const currentOrgId = targetUser.get('currentOrganizationId');
      if (currentOrgId) {
        const matchingOrg = organizations.find(org => org.id === currentOrgId);
        if (matchingOrg) {
          matchingOrg.isCurrentOrg = true;
          currentOrgObject = matchingOrg;
        }
      }
      
      // If no current org set but user has orgs, set first one as current
      if (!currentOrgObject && organizations.length > 0) {
        organizations[0].isCurrentOrg = true;
        currentOrgObject = organizations[0];
      }
      
    } else {
      // Regular users - get organizations from relation
      const fullUser = await new Parse.Query(Parse.User)
        .include("currentOrganization")
        .get(targetUserId, { useMasterKey: true });

      // Get current organization
      const currentOrg = fullUser.get("currentOrganization");

      // Get organizations from the relation
      const orgRelation = fullUser.relation("organizations");
      const orgResults = await orgRelation.query().find({ useMasterKey: true });

      logger.info(`Found ${orgResults ? orgResults.length : 'undefined'} organizations for user ${targetUserId}`);

      if (!orgResults || orgResults.length === 0) {
        logger.warn(`User ${targetUserId} has no organization memberships`);
        return {
          success: true,
          user: {
            id: targetUser.id,
            email: targetUser.get('email'),
            firstName: targetUser.get('firstName'),
            lastName: targetUser.get('lastName'),
            isActive: targetUser.get('isActive'),
            isAdmin: targetUser.get('isAdmin'),
            createdAt: targetUser.get('createdAt'),
            lastLogin: targetUser.get('lastLogin')
          },
          organizations: [],
          currentOrganization: null
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
      organizations = orgResults.map(org => {
        const orgId = org.id;
        const orgRoles = userOrgRoles.get(orgId) || [];
        const isCurrentOrg = currentOrg && currentOrg.id === orgId;
        
        return {
          objectId: org.id,
          id: org.id,
          name: org.get("name"),
          description: org.get("description"),
          subdomain: org.get("subdomain"),
          industry: org.get("industry"),
          logo: org.get("logo"),
          planType: org.get("planType"),
          plan: org.get("planType"),
          status: org.get("status"),
          administrator: org.get("administrator"),
          createdAt: org.createdAt?.toISOString(),
          updatedAt: org.updatedAt?.toISOString(),
          createdBy: org.get("createdBy"),
          updatedBy: org.get("updatedBy"),
          settings: org.get("settings") || {},
          userRoles: orgRoles,
          isCurrentOrg: isCurrentOrg
        };
      });
      
      currentOrgObject = currentOrg ? {
        id: currentOrg.id,
        name: currentOrg.get("name"),
        description: currentOrg.get("description"),
        subdomain: currentOrg.get("subdomain"),
        industry: currentOrg.get("industry"),
        logo: currentOrg.get("logo"),
        planType: currentOrg.get("planType"),
        status: currentOrg.get("status"),
        administrator: currentOrg.get("administrator"),
        createdAt: currentOrg.createdAt?.toISOString(),
        updatedAt: currentOrg.updatedAt?.toISOString(),
        settings: currentOrg.get("settings") || {}
      } : null;
    }

    logger.info(`Returning user details with ${organizations.length} organizations for user ${targetUserId}`);

    return {
      success: true,
      user: {
        id: targetUser.id,
        email: targetUser.get('email'),
        firstName: targetUser.get('firstName'),
        lastName: targetUser.get('lastName'),
        isActive: targetUser.get('isActive'),
        isAdmin: targetUser.get('isAdmin'),
        createdAt: targetUser.get('createdAt'),
        lastLogin: targetUser.get('lastLogin')
      },
      organizations: organizations,
      currentOrganization: currentOrgObject
    };

  } catch (error) {
    logger.error(`Error fetching user details for user ${targetUserId}:`, error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to fetch user details.");
  }
});

module.exports = {
  // Cloud function is automatically registered
};
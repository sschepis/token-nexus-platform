const { defineFunction, withAuth, withValidation } = require('../middleware');
const utils = require('../../utils');
const logger = utils.logger;

// Validation schema for setCurrentOrganization
const setCurrentOrgSchema = {
  orgId: { type: 'string', required: true, minLength: 10, maxLength: 10 } // Parse objectId length
};

/**
 * Set the current organization for a user
 * Validates that the user has access to the target organization
 */
const setCurrentOrganizationHandler = async (request) => {
  const { user } = request; // User is already validated by withAuth middleware
  const { orgId } = request.params; // Parameters are already validated by withValidation middleware

  try {
    // First, verify that the user has access to this organization
    // by checking if they have any role in this organization
    const roleQuery = new Parse.Query(Parse.Role);
    roleQuery.equalTo("users", user);
    const userRoles = await roleQuery.find({ useMasterKey: true });

    // Check if user has any role in the target organization
    const hasAccessToOrg = userRoles.some(role => {
      const roleName = role.getName();
      // Skip system-wide roles
      if (roleName === 'SystemAdmin' || !roleName.includes('_')) {
        return false;
      }
      
      // Check if role belongs to target organization
      const lastUnderscoreIndex = roleName.lastIndexOf('_');
      if (lastUnderscoreIndex > 0) {
        const roleOrgId = roleName.substring(lastUnderscoreIndex + 1);
        return roleOrgId === orgId;
      }
      return false;
    });

    if (!hasAccessToOrg) {
      logger.warn(`User ${user.id} attempted to switch to organization ${orgId} without access`);
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "User does not have access to this organization.");
    }

    // Verify the organization exists
    const organizationQuery = new Parse.Query("Organization");
    const organization = await organizationQuery.get(orgId, { useMasterKey: true });

    if (!organization) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "Organization not found.");
    }

    // Update user's current organization
    const fullUser = await new Parse.Query(Parse.User).get(user.id, { useMasterKey: true });
    fullUser.set("currentOrganization", organization);
    await fullUser.save(null, { useMasterKey: true });

    logger.info(`User ${user.id} switched to organization ${orgId} (${organization.get("name")})`);

    // Return the updated organization context
    return {
      success: true,
      orgId: orgId,
      orgName: organization.get("name"),
      orgDescription: organization.get("description"),
      orgSubdomain: organization.get("subdomain"),
      orgIndustry: organization.get("industry"),
      orgLogo: organization.get("logo"),
      orgPlanType: organization.get("planType"),
      orgStatus: organization.get("status"),
      orgSettings: organization.get("settings") || {},
      message: `Successfully switched to organization: ${organization.get("name")}`
    };

  } catch (error) {
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    logger.error(`Error setting current organization for user ${user.id} to ${orgId}:`, error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to set current organization.");
  }
};

// Define the cloud function with middleware
defineFunction("setCurrentOrganization", [
  withAuth,
  withValidation(setCurrentOrgSchema)
], setCurrentOrganizationHandler);

/**
 * Get the current organization context for a user
 * Returns detailed information about the user's current organization
 */
const getCurrentOrganizationHandler = async (request) => {
  const { user } = request; // User is already validated by withAuth middleware

  try {
    // Get user with currentOrganization populated
    const fullUser = await new Parse.Query(Parse.User)
      .include("currentOrganization")
      .get(user.id, { useMasterKey: true });

    const currentOrg = fullUser.get("currentOrganization");
    
    if (!currentOrg) {
      return {
        hasCurrentOrg: false,
        message: "User has no current organization set"
      };
    }

    // Get user's roles in this organization
    const roleQuery = new Parse.Query(Parse.Role);
    roleQuery.equalTo("users", user);
    const userRoles = await roleQuery.find({ useMasterKey: true });

    const orgRoles = userRoles
      .filter(role => {
        const roleName = role.getName();
        return roleName.includes('_') && roleName.endsWith(`_${currentOrg.id}`);
      })
      .map(role => {
        const roleName = role.getName();
        const lastUnderscoreIndex = roleName.lastIndexOf('_');
        return roleName.substring(0, lastUnderscoreIndex);
      });

    return {
      hasCurrentOrg: true,
      orgId: currentOrg.id,
      orgName: currentOrg.get("name"),
      orgDescription: currentOrg.get("description"),
      orgSubdomain: currentOrg.get("subdomain"),
      orgIndustry: currentOrg.get("industry"),
      orgLogo: currentOrg.get("logo"),
      orgPlanType: currentOrg.get("planType"),
      orgStatus: currentOrg.get("status"),
      orgSettings: currentOrg.get("settings") || {},
      userRoles: orgRoles,
      createdAt: currentOrg.createdAt?.toISOString(),
      updatedAt: currentOrg.updatedAt?.toISOString()
    };

  } catch (error) {
    logger.error(`Error getting current organization for user ${user.id}:`, error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to get current organization.");
  }
};

// Define the cloud function with middleware
defineFunction("getCurrentOrganization", [
  withAuth
], getCurrentOrganizationHandler);

module.exports = {
  // Cloud functions are automatically registered
};
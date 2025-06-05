// parse-server/src/cloud/organizations/getOrganizationSettings.js
const auth = require('../auth');
const utils = require('../../utils');
const logger = utils.logger;

Parse.Cloud.define("getOrganizationSettings", async (request) => {
  const { user } = request;
  let { orgId } = request.params; 

  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "User must be authenticated.");
  }
  
  const fullUser = await new Parse.Query(Parse.User).include("orgId").get(user.id, { useMasterKey: true });

  if (!orgId) { 
    const userOrg = fullUser.get("orgId");
    if (!userOrg) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "User is not associated with an organization, and no orgId provided.");
    }
    orgId = userOrg.id;
  } else { 
     await auth.requireOrgAdminOrSystemAdmin(user, orgId); 
  }

  const query = new Parse.Query("Organization");
  try {
    const organization = await query.get(orgId, { sessionToken: user.getSessionToken() }); 
    return {
        objectId: organization.id,
        name: organization.get("name"),
        description: organization.get("description"),
        subdomain: organization.get("subdomain"),
        industry: organization.get("industry"),
        status: organization.get("status"),
        planType: organization.get("planType"),
        createdAt: organization.createdAt.toISOString(),
        updatedAt: organization.updatedAt.toISOString(),
        settings: organization.get("settings") || {},
    };
  } catch (error) {
    logger.error(`Error fetching settings for org ${orgId}:`, error);
    if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "Organization not found or not accessible.");
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to fetch organization settings.");
  }
});
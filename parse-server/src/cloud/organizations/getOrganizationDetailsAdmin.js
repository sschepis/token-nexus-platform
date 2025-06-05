// parse-server/src/cloud/organizations/getOrganizationDetailsAdmin.js
const auth = require('../auth');
const utils = require('../../utils');
const logger = utils.logger;

Parse.Cloud.define("getOrganizationDetailsAdmin", async (request) => {
  await auth.requireSystemAdmin(request.user);
  const { orgId } = request.params;

  if (!orgId) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "orgId is required.");
  }

  const query = new Parse.Query("Organization");
  query.include(["createdBy", "updatedBy", "administrator"]);
  
  try {
    const organization = await query.get(orgId, { useMasterKey: true });
    return organization.toJSON();
  } catch (error) {
    logger.error(`Error fetching details for org ${orgId}:`, error);
    if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "Organization not found.");
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to fetch organization details.");
  }
});
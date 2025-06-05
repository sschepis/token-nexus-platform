// parse-server/src/cloud/organizations/activateOrganization.js
const auth = require('../auth');
const utils = require('../../utils');
const logger = utils.logger;

Parse.Cloud.define("activateOrganization", async (request) => {
  const adminUser = await auth.requireSystemAdmin(request.user);
  const { orgId } = request.params;

  if (!orgId) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "orgId is required.");
  }

  const query = new Parse.Query("Organization");
  try {
    const organization = await query.get(orgId, { useMasterKey: true });
    organization.set("status", "Active");
    organization.set("updatedBy", adminUser);
    const savedOrg = await organization.save(null, { useMasterKey: true });
    return savedOrg.toJSON();
  } catch (error) {
    logger.error(`Error activating org ${orgId}:`, error);
    if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "Organization not found.");
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to activate organization.");
  }
});
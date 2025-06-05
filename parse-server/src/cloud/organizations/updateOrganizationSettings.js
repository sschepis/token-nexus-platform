// parse-server/src/cloud/organizations/updateOrganizationSettings.js
const auth = require('../auth');
const utils = require('../../utils');
const logger = utils.logger;

Parse.Cloud.define("updateOrganizationSettings", async (request) => {
  const { user } = request;
  const { orgId, name, description, subdomain, industry, settings } = request.params; 

  await auth.requireOrgAdminOrSystemAdmin(user, orgId); 

  if (name === undefined && description === undefined && subdomain === undefined && industry === undefined && settings === undefined) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "At least one setting (name, description, subdomain, industry, settings object) to update is required.");
  }

  const query = new Parse.Query("Organization");
  try {
    const organization = await query.get(orgId, { sessionToken: user.getSessionToken() }); 

    if (name !== undefined) organization.set("name", name);
    if (description !== undefined) organization.set("description", description);
    if (subdomain !== undefined) organization.set("subdomain", subdomain); 
    if (industry !== undefined) organization.set("industry", industry);
    if (settings !== undefined) { 
        const currentSettings = organization.get("settings") || {};
        organization.set("settings", { ...currentSettings, ...settings });
    }
    organization.set("updatedBy", user);

    const savedOrg = await organization.save(null, { sessionToken: user.getSessionToken() });
    return {
        objectId: savedOrg.id,
        name: savedOrg.get("name"),
        description: savedOrg.get("description"),
        subdomain: savedOrg.get("subdomain"),
        industry: savedOrg.get("industry"),
        status: savedOrg.get("status"),
        planType: savedOrg.get("planType"),
        createdAt: savedOrg.createdAt.toISOString(),
        updatedAt: savedOrg.updatedAt.toISOString(),
        settings: savedOrg.get("settings") || {},
    };
  } catch (error) {
    logger.error(`Error updating settings for org ${orgId}:`, error);
    if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "Organization not found or not accessible for update.");
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to update organization settings.");
  }
});
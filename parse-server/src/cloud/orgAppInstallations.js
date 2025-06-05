const auth = require('./auth'); // May need for future permission checks
const utils = require('../utils');
const logger = utils.logger;

// --- Org App Installation Cloud Functions ---

Parse.Cloud.define("getInstalledAppsForOrg", async (request) => {
  const { user } = request;
  let { orgId } = request.params;

  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "User must be authenticated.");
  }

  const fullUser = await new Parse.Query(Parse.User).include("orgId").get(user.id, { useMasterKey: true });
  const isSystemAdmin = fullUser.get("isSystemAdmin");

  if (!isSystemAdmin) {
    const userOrgPointer = fullUser.get("orgId");
    if (!userOrgPointer) {
         throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "User is not associated with an organization.");
    }
    if (orgId && userOrgPointer.id !== orgId) { // If orgId is passed, it must match user's org
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Cannot access installations for another organization.");
    }
    orgId = userOrgPointer.id; // Default to user's own orgId
  } else if (!orgId) { // System admin must specify an orgId
     throw new Parse.Error(Parse.Error.INVALID_JSON, "orgId is required for System Admin to query specific organization apps.");
  }
  
  if (!orgId) { // Should be caught above, but as a safeguard
     throw new Parse.Error(Parse.Error.INVALID_JSON, "Organization ID is required.");
  }

  const Organization = Parse.Object.extend("Organization");
  const orgPointer = Organization.createWithoutData(orgId);

  const query = new Parse.Query("OrgAppInstallation");
  query.equalTo("organization", orgPointer);
  query.include(["appDefinition", "installedVersion", "installedBy"]);
  query.descending("installationDate");

  try {
    // Use sessionToken to respect ACLs if user is not system admin.
    // System admin operations often use masterKey implicitly or explicitly.
    const findOptions = isSystemAdmin ? { useMasterKey: true } : { sessionToken: user.getSessionToken() };
    const results = await query.find(findOptions); 
    return results.map(installation => {
      const appDef = installation.get("appDefinition");
      const appVer = installation.get("installedVersion");
      return {
        objectId: installation.id,
        status: installation.get("status"),
        installationDate: installation.get("installationDate"),
        appSpecificConfig: installation.get("appSpecificConfig"),
        installedBy: installation.get("installedBy") ? installation.get("installedBy").toJSON() : null,
        appDefinition: appDef ? appDef.toJSON() : null,
        installedVersion: appVer ? appVer.toJSON() : null,
      };
    });
  } catch (error) {
    logger.error(`Error fetching installed apps for org ${orgId}:`, error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to fetch installed applications.");
  }
});

Parse.Cloud.define("installAppInOrg", async (request) => {
  const { user } = request;
  const { orgId, appDefinitionId, versionId, appSpecificConfig } = request.params;

  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "User must be authenticated.");
  }
  if (!orgId || !appDefinitionId || !versionId) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "orgId, appDefinitionId, and versionId are required.");
  }

  // Permission check: User must be an admin of orgId or a System Admin.
  // This relies on requireOrgAdminOrSystemAdmin from auth.js
  await auth.requireOrgAdminOrSystemAdmin(user, orgId);

  const Organization = Parse.Object.extend("Organization");
  const orgPointer = Organization.createWithoutData(orgId);

  const AppDefinition = Parse.Object.extend("AppDefinition");
  const appDefPointer = AppDefinition.createWithoutData(appDefinitionId);

  const AppVersion = Parse.Object.extend("AppVersion");
  const versionPointer = AppVersion.createWithoutData(versionId);
  
  const existingInstallQuery = new Parse.Query("OrgAppInstallation");
  existingInstallQuery.equalTo("organization", orgPointer);
  existingInstallQuery.equalTo("appDefinition", appDefPointer);
  const existingInstall = await existingInstallQuery.first({ useMasterKey: true });

  if (existingInstall) {
    throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, "This application definition is already installed in this organization. Please uninstall first or update.");
  }
  
  try {
    const appVersionToInstall = await versionPointer.fetch({ useMasterKey: true });
    if (appVersionToInstall.get("status") !== "published") {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Only published application versions can be installed.");
    }
  } catch (fetchError) {
     logger.error(`Error fetching AppVersion ${versionId} during install:`, fetchError);
     throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "Specified AppVersion not found or not accessible.");
  }

  const OrgAppInstallation = Parse.Object.extend("OrgAppInstallation");
  const installation = new OrgAppInstallation();
  installation.set("organization", orgPointer);
  installation.set("appDefinition", appDefPointer);
  installation.set("installedVersion", versionPointer);
  installation.set("installationDate", new Date());
  installation.set("status", "active"); 
  installation.set("appSpecificConfig", appSpecificConfig || {});
  installation.set("installedBy", user);

  const acl = new Parse.ACL();
  // Org members should have read access. Org admins should have write access.
  // This requires a role like `member_ORGID` and `admin_ORGID`.
  const orgMemberRoleName = `member_${orgId}`;
  const orgAdminRoleName = `admin_${orgId}`; // Or a more specific role like `orgAppManager_${orgId}`
  
  acl.setRoleReadAccess(orgMemberRoleName, true);
  acl.setRoleWriteAccess(orgAdminRoleName, true); // Org Admins can manage (update config, uninstall)
  acl.setWriteAccess(user.id, true); // The installer also gets write access
  installation.setACL(acl);

  try {
    const savedInstallation = await installation.save(null, { useMasterKey: true }); 
    return savedInstallation.toJSON();
  } catch (error) {
    logger.error("Error installing app in org:", error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to install application.");
  }
});

Parse.Cloud.define("uninstallAppFromOrg", async (request) => {
  const { user } = request;
  const { orgAppInstallationId } = request.params;

  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "User must be authenticated.");
  }
  if (!orgAppInstallationId) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "orgAppInstallationId is required.");
  }

  const query = new Parse.Query("OrgAppInstallation");
  try {
    // Fetch with sessionToken to respect ACLs. User must have write/delete access.
    const installation = await query.get(orgAppInstallationId, { sessionToken: user.getSessionToken() }); 
    
    // An additional explicit check using requireOrgAdminOrSystemAdmin can be added if ACLs are not granular enough
    // const installationOrgId = installation.get("organization").id;
    // await auth.requireOrgAdminOrSystemAdmin(user, installationOrgId);

    await installation.destroy({ sessionToken: user.getSessionToken() }); // Try with session token first
    return { success: true, message: "Application uninstalled successfully." };
  } catch (error) {
    logger.error(`Error uninstalling app installation ${orgAppInstallationId}:`, error);
    if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "Application installation not found or not accessible.");
    }
    // If it failed due to permissions with session token, a system process might use masterKey
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to uninstall application.");
  }
});

// module.exports = { /* Cloud.define functions are automatically registered */ };
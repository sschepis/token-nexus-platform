const auth = require('./auth');
const utils = require('../utils');
const logger = utils.logger;

// --- Marketplace Cloud Functions ---
// These functions bridge the gap between frontend API expectations and existing backend functions

/**
 * Fetches app definitions for the public marketplace
 * Transforms listAppsForAdmin for public consumption, filtering only published apps
 */
Parse.Cloud.define("fetchAppDefinitions", async (request) => {
  const { user } = request;
  const { category, search } = request.params || {};
  
  try {
    const query = new Parse.Query("AppDefinition");
    query.equalTo("status", "active");
    query.include(["latestPublishedVersion"]);
    query.descending("createdAt");
    
    if (category && category !== 'all') {
      query.equalTo("category", category);
    }
    
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.matches("name", searchRegex);
    }
    
    const results = await query.find({ useMasterKey: true });
    
    const appDefinitions = results.map(appDef => ({
      id: appDef.id,
      objectId: appDef.id,
      name: appDef.get("name"),
      description: appDef.get("description") || "",
      publisherName: appDef.get("publisherName") || "Unknown",
      category: appDef.get("category") || "other",
      iconUrl: appDef.get("iconUrl"),
      tags: appDef.get("tags") || [],
      overallRating: appDef.get("overallRating") || 0,
      reviewCount: appDef.get("reviewCount") || 0,
      isFeatured: appDef.get("isFeatured") || false,
      status: appDef.get("status") || "active"
    }));
    
    logger.info(`Fetched ${appDefinitions.length} app definitions for marketplace`);
    return appDefinitions;
    
  } catch (error) {
    logger.error("Error fetching app definitions for marketplace:", error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to fetch app definitions");
  }
});

/**
 * Fetches app versions for a specific app definition
 * Used by the marketplace to show version history and details
 */
Parse.Cloud.define("fetchAppVersionsForDefinition", async (request) => {
  const { user } = request;
  const { appDefinitionId } = request.params;
  
  if (!appDefinitionId) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "appDefinitionId is required");
  }
  
  try {
    const AppDefinition = Parse.Object.extend("AppDefinition");
    const appDefinitionPointer = AppDefinition.createWithoutData(appDefinitionId);
    
    const query = new Parse.Query("AppVersion");
    query.equalTo("appDefinition", appDefinitionPointer);
    query.equalTo("status", "published"); // Only show published versions in marketplace
    query.include(["submittedBy", "reviewedBy"]);
    query.descending("createdAt");
    
    const results = await query.find({ useMasterKey: true });
    
    const versions = results.map(version => ({
      id: version.id,
      objectId: version.id,
      versionString: version.get("versionString"),
      bundleUrl: version.get("bundleUrl"),
      changelog: version.get("changelog"),
      releaseNotes: version.get("releaseNotes"),
      status: version.get("status"),
      appDefinition: {
        objectId: appDefinitionId,
        __type: "Pointer",
        className: "AppDefinition"
      },
      submittedBy: version.get("submittedBy") ? {
        objectId: version.get("submittedBy").id,
        username: version.get("submittedBy").get("username"),
        email: version.get("submittedBy").get("email")
      } : null,
      reviewedBy: version.get("reviewedBy") ? {
        objectId: version.get("reviewedBy").id,
        username: version.get("reviewedBy").get("username"),
        email: version.get("reviewedBy").get("email")
      } : null,
      createdAt: version.get("createdAt").toISOString(),
      updatedAt: version.get("updatedAt").toISOString(),
      minPlatformVersion: version.get("minPlatformVersion"),
      dependencies: version.get("dependencies") || [],
      publishedTimestamp: version.get("publishedTimestamp") ? version.get("publishedTimestamp").toISOString() : null,
      reviewTimestamp: version.get("reviewTimestamp") ? version.get("reviewTimestamp").toISOString() : null
    }));
    
    logger.info(`Fetched ${versions.length} versions for app definition ${appDefinitionId}`);
    return versions;
    
  } catch (error) {
    logger.error(`Error fetching versions for app definition ${appDefinitionId}:`, error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to fetch app versions");
  }
});

/**
 * Fetches installed apps for the current user's organization
 * Wrapper around getInstalledAppsForOrg with consistent response format
 */
Parse.Cloud.define("fetchOrgAppInstallations", async (request) => {
  const { user } = request;
  const { organizationId } = request.params || {};
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "User must be authenticated");
  }
  
  try {
    // If no organizationId provided, use user's current organization
    let orgId = organizationId;
    
    if (!orgId) {
      const fullUser = await new Parse.Query(Parse.User).include("orgId").get(user.id, { useMasterKey: true });
      const userOrgPointer = fullUser.get("orgId");
      
      if (!userOrgPointer) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "User is not associated with an organization");
      }
      
      orgId = userOrgPointer.id;
    }
    
    // Use existing getInstalledAppsForOrg function
    const installations = await Parse.Cloud.run("getInstalledAppsForOrg", {
      orgId: orgId
    });
    
    // Transform to match expected OrgAppInstallation format
    const transformedInstallations = installations.map(inst => ({
      objectId: inst.objectId,
      organization: {
        objectId: orgId,
        __type: "Pointer",
        className: "Organization"
      },
      appDefinition: {
        id: inst.appDefinition.objectId,
        objectId: inst.appDefinition.objectId,
        name: inst.appDefinition.name,
        description: inst.appDefinition.description,
        publisherName: inst.appDefinition.publisherName || "Unknown",
        category: inst.appDefinition.category || "other",
        iconUrl: inst.appDefinition.iconUrl
      },
      installedVersion: {
        id: inst.installedVersion.objectId,
        objectId: inst.installedVersion.objectId,
        versionString: inst.installedVersion.versionString,
        changelog: inst.installedVersion.changelog,
        status: "published"
      },
      installationDate: inst.installationDate,
      status: inst.status,
      appSpecificConfig: inst.appSpecificConfig || {},
      installedBy: inst.installedBy
    }));
    
    logger.info(`Fetched ${transformedInstallations.length} installed apps for organization ${orgId}`);
    return transformedInstallations;
    
  } catch (error) {
    logger.error("Error fetching org app installations:", error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to fetch org app installations");
  }
});

/**
 * Installs an app for the current user's organization
 * Wrapper around installAppInOrg with automatic version resolution
 */
Parse.Cloud.define("installApp", async (request) => {
  const { user } = request;
  const { appDefinitionId, versionId, appSpecificConfig } = request.params;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "User must be authenticated");
  }
  
  if (!appDefinitionId) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "appDefinitionId is required");
  }
  
  try {
    // Get user's current organization
    const fullUser = await new Parse.Query(Parse.User).include("orgId").get(user.id, { useMasterKey: true });
    const userOrgPointer = fullUser.get("orgId");
    
    if (!userOrgPointer) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "User is not associated with an organization");
    }
    
    let resolvedVersionId = versionId;
    
    // If no specific version provided, find the latest published version
    if (!resolvedVersionId) {
      const AppDefinition = Parse.Object.extend("AppDefinition");
      const appDefPointer = AppDefinition.createWithoutData(appDefinitionId);
      
      const versionQuery = new Parse.Query("AppVersion");
      versionQuery.equalTo("appDefinition", appDefPointer);
      versionQuery.equalTo("status", "published");
      versionQuery.descending("createdAt");
      
      const latestVersion = await versionQuery.first({ useMasterKey: true });
      
      if (!latestVersion) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "No published version found for this app");
      }
      
      resolvedVersionId = latestVersion.id;
    }
    
    // Use existing installAppInOrg function
    const result = await Parse.Cloud.run("installAppInOrg", {
      orgId: userOrgPointer.id,
      appDefinitionId: appDefinitionId,
      versionId: resolvedVersionId,
      appSpecificConfig: appSpecificConfig || {}
    });
    
    logger.info(`App ${appDefinitionId} installed for organization ${userOrgPointer.id}`);
    return {
      success: true,
      message: "App installed successfully",
      installationId: result.objectId,
      installation: result
    };
    
  } catch (error) {
    logger.error("Error installing app:", error);
    if (error instanceof Parse.Error) {
      throw error;
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to install app");
  }
});

/**
 * Uninstalls an app from the current user's organization
 * Accepts appDefinitionId and finds the installation automatically
 */
Parse.Cloud.define("uninstallApp", async (request) => {
  const { user } = request;
  const { appDefinitionId, orgAppInstallationId } = request.params;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "User must be authenticated");
  }
  
  if (!appDefinitionId && !orgAppInstallationId) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "Either appDefinitionId or orgAppInstallationId is required");
  }
  
  try {
    // Get user's current organization
    const fullUser = await new Parse.Query(Parse.User).include("orgId").get(user.id, { useMasterKey: true });
    const userOrgPointer = fullUser.get("orgId");
    
    if (!userOrgPointer) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "User is not associated with an organization");
    }
    
    let installationId = orgAppInstallationId;
    
    // If appDefinitionId provided, find the installation record
    if (appDefinitionId && !installationId) {
      const query = new Parse.Query("OrgAppInstallation");
      query.equalTo("organization", userOrgPointer);
      query.equalTo("appDefinition", Parse.Object.extend("AppDefinition").createWithoutData(appDefinitionId));
      
      const installation = await query.first({ useMasterKey: true });
      
      if (!installation) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "App installation not found");
      }
      
      installationId = installation.id;
    }
    
    // Use existing uninstallAppFromOrg function
    const result = await Parse.Cloud.run("uninstallAppFromOrg", {
      orgAppInstallationId: installationId
    });
    
    logger.info(`App installation ${installationId} uninstalled from organization ${userOrgPointer.id}`);
    return {
      success: true,
      message: "App uninstalled successfully",
      orgAppInstallationId: installationId
    };
    
  } catch (error) {
    logger.error("Error uninstalling app:", error);
    if (error instanceof Parse.Error) {
      throw error;
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to uninstall app");
  }
});

/**
 * Updates settings for an installed app
 * Finds the installation and updates the appSpecificConfig
 */
Parse.Cloud.define("updateAppSettings", async (request) => {
  const { user } = request;
  const { appDefinitionId, orgAppInstallationId, settings } = request.params;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "User must be authenticated");
  }
  
  if (!settings) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "settings is required");
  }
  
  if (!appDefinitionId && !orgAppInstallationId) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "Either appDefinitionId or orgAppInstallationId is required");
  }
  
  try {
    // Get user's current organization
    const fullUser = await new Parse.Query(Parse.User).include("orgId").get(user.id, { useMasterKey: true });
    const userOrgPointer = fullUser.get("orgId");
    
    if (!userOrgPointer) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "User is not associated with an organization");
    }
    
    let installation;
    
    if (orgAppInstallationId) {
      // Find by installation ID
      const query = new Parse.Query("OrgAppInstallation");
      installation = await query.get(orgAppInstallationId, { useMasterKey: true });
      
      // Verify it belongs to user's organization
      if (installation.get("organization").id !== userOrgPointer.id) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Installation does not belong to your organization");
      }
    } else {
      // Find by app definition ID
      const query = new Parse.Query("OrgAppInstallation");
      query.equalTo("organization", userOrgPointer);
      query.equalTo("appDefinition", Parse.Object.extend("AppDefinition").createWithoutData(appDefinitionId));
      
      installation = await query.first({ useMasterKey: true });
      
      if (!installation) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "App installation not found");
      }
    }
    
    // Update the configuration
    installation.set("appSpecificConfig", settings);
    await installation.save(null, { useMasterKey: true });
    
    logger.info(`Updated settings for app installation ${installation.id}`);
    return {
      success: true,
      message: "App settings updated successfully",
      installation: {
        objectId: installation.id,
        appSpecificConfig: installation.get("appSpecificConfig"),
        updatedAt: installation.get("updatedAt").toISOString()
      }
    };
    
  } catch (error) {
    logger.error("Error updating app settings:", error);
    if (error instanceof Parse.Error) {
      throw error;
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to update app settings");
  }
});

/**
 * Gets detailed information about a specific app installation
 * Used by the frontend to display app configuration and status
 */
Parse.Cloud.define("getAppInstallationDetails", async (request) => {
  const { user } = request;
  const { appInstallationId } = request.params;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "User must be authenticated");
  }
  
  if (!appInstallationId) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "appInstallationId is required");
  }
  
  try {
    const query = new Parse.Query("OrgAppInstallation");
    query.include(["appDefinition", "installedVersion", "installedBy", "organization"]);
    
    const installation = await query.get(appInstallationId, { useMasterKey: true });
    
    if (!installation) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "App installation not found");
    }
    
    // Check if user has access to this installation
    const fullUser = await new Parse.Query(Parse.User).include("orgId").get(user.id, { useMasterKey: true });
    const userOrgPointer = fullUser.get("orgId");
    
    if (!userOrgPointer || installation.get("organization").id !== userOrgPointer.id) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "You don't have access to this installation");
    }
    
    const appDef = installation.get("appDefinition");
    const appVersion = installation.get("installedVersion");
    const installedBy = installation.get("installedBy");
    
    const details = {
      objectId: installation.id,
      organization: {
        objectId: installation.get("organization").id,
        __type: "Pointer",
        className: "Organization"
      },
      appDefinition: {
        id: appDef.id,
        objectId: appDef.id,
        name: appDef.get("name"),
        description: appDef.get("description"),
        publisherName: appDef.get("publisherName"),
        category: appDef.get("category"),
        iconUrl: appDef.get("iconUrl")
      },
      installedVersion: {
        id: appVersion.id,
        objectId: appVersion.id,
        versionString: appVersion.get("versionString"),
        changelog: appVersion.get("changelog"),
        status: appVersion.get("status")
      },
      installationDate: installation.get("installationDate").toISOString(),
      status: installation.get("status"),
      appSpecificConfig: installation.get("appSpecificConfig") || {},
      installedBy: {
        objectId: installedBy.id,
        username: installedBy.get("username"),
        email: installedBy.get("email")
      }
    };
    
    logger.info(`Retrieved details for app installation ${appInstallationId}`);
    return details;
    
  } catch (error) {
    logger.error(`Error getting app installation details for ${appInstallationId}:`, error);
    if (error instanceof Parse.Error) {
      throw error;
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to get app installation details");
  }
});

module.exports = {
  // Export functions for testing
  // Note: Parse.Cloud.getFunction doesn't exist, commenting out for now
  // fetchAppDefinitions: Parse.Cloud.getFunction("fetchAppDefinitions"),
  // fetchAppVersionsForDefinition: Parse.Cloud.getFunction("fetchAppVersionsForDefinition"),
  // fetchOrgAppInstallations: Parse.Cloud.getFunction("fetchOrgAppInstallations"),
  // installApp: Parse.Cloud.getFunction("installApp"),
  // uninstallApp: Parse.Cloud.getFunction("uninstallApp"),
  // updateAppSettings: Parse.Cloud.getFunction("updateAppSettings"),
  // getAppInstallationDetails: Parse.Cloud.getFunction("getAppInstallationDetails")
};
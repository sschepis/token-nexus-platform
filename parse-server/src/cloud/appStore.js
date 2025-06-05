const auth = require('./auth');
const utils = require('../utils');
const logger = utils.logger;

// --- App Store Management Cloud Functions ---

Parse.Cloud.define("listAppsForAdmin", async (request) => {
  await auth.requireSystemAdmin(request.user);
  const { page = 1, limit = 20, status, category, searchQuery } = request.params;

  const appDefinitionQuery = new Parse.Query("AppDefinition");
  
  if (status && status !== 'all') {
    appDefinitionQuery.equalTo("status", status);
  }
  
  if (category && category !== 'all') {
    appDefinitionQuery.equalTo("category", category);
  }
  
  if (searchQuery) {
    appDefinitionQuery.matches("name", searchQuery, "i");
  }
  
  appDefinitionQuery.include("createdBy");
  appDefinitionQuery.descending("createdAt");
  appDefinitionQuery.limit(limit);
  appDefinitionQuery.skip((page - 1) * limit);
  
  try {
    const results = await appDefinitionQuery.find({ useMasterKey: true });
    const count = await appDefinitionQuery.count({ useMasterKey: true });
    
    const bundles = results.map(app => ({
      id: app.id,
      objectId: app.id,
      name: app.get("name"),
      description: app.get("description"),
      category: app.get("category"),
      status: app.get("status") || "draft",
      currentVersion: "1.0.0", // This should come from latest version
      publisherName: app.get("publisherName"),
      iconUrl: app.get("iconUrl"),
      tags: app.get("tags") || [],
      overallRating: app.get("overallRating") || 0,
      reviewCount: app.get("reviewCount") || 0,
      isFeatured: app.get("isFeatured") || false,
      createdAt: app.get("createdAt")?.toISOString(),
      updatedAt: app.get("updatedAt")?.toISOString(),
      developer: app.get("createdBy") ? {
        id: app.get("createdBy").id,
        email: app.get("createdBy").get("email"),
        name: app.get("createdBy").get("username")
      } : null,
      stats: {
        versionCount: 1, // This should be calculated
        installCount: 0  // This should be calculated
      }
    }));

    return {
      success: true,
      bundles,
      totalCount: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    };
  } catch (error) {
    logger.error("Error listing apps for admin:", error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to list applications.");
  }
});

Parse.Cloud.define("submitAppForReview", async (request) => {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "User must be authenticated.");
  }

  const { appDefinitionId, versionString, bundleUrl, changelog, releaseNotes, minPlatformVersion, dependencies } = request.params;

  if (!versionString || !bundleUrl) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "Version string and bundle URL are required.");
  }

  const AppDefinition = Parse.Object.extend("AppDefinition");
  const appDefinition = AppDefinition.createWithoutData(appDefinitionId);

  const AppVersion = Parse.Object.extend("AppVersion");
  const appVersion = new AppVersion();
  appVersion.set("appDefinition", appDefinition);
  appVersion.set("versionString", versionString);
  appVersion.set("bundleUrl", bundleUrl);
  appVersion.set("changelog", changelog);
  appVersion.set("releaseNotes", releaseNotes);
  appVersion.set("minPlatformVersion", minPlatformVersion);
  appVersion.set("dependencies", dependencies || []);
  appVersion.set("submittedBy", request.user);
  appVersion.set("status", "pending_review");
  appVersion.set("createdBy", request.user); // Assuming baseSchema is not on AppVersion
  appVersion.set("updatedBy", request.user); // Assuming baseSchema is not on AppVersion

  try {
    const savedVersion = await appVersion.save(null, { useMasterKey: true });
    return savedVersion.toJSON();
  } catch (error) {
    logger.error("Error submitting app for review:", error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to submit application version.");
  }
});

Parse.Cloud.define("approveAppVersion", async (request) => {
  const adminUser = await auth.requireSystemAdmin(request.user);
  const { versionId } = request.params;

  if (!versionId) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "Version ID is required.");
  }

  const AppVersion = Parse.Object.extend("AppVersion");
  const query = new Parse.Query(AppVersion);
  try {
    const appVersion = await query.get(versionId, { useMasterKey: true });
    if (appVersion.get("status") !== "pending_review" && appVersion.get("status") !== "rejected") {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, `Version is not pending review or rejected. Current status: ${appVersion.get("status")}`);
    }
    appVersion.set("status", "approved");
    appVersion.set("reviewedBy", adminUser);
    appVersion.set("reviewTimestamp", new Date());
    appVersion.set("updatedBy", adminUser);
    const savedVersion = await appVersion.save(null, { useMasterKey: true });
    return savedVersion.toJSON();
  } catch (error) {
    logger.error("Error approving app version:", error);
    if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "AppVersion not found.");
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message || "Failed to approve application version.");
  }
});

Parse.Cloud.define("rejectAppVersion", async (request) => {
  const adminUser = await auth.requireSystemAdmin(request.user);
  const { versionId, reason } = request.params;

  if (!versionId || !reason) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "Version ID and reason are required.");
  }

  const AppVersion = Parse.Object.extend("AppVersion");
  const query = new Parse.Query(AppVersion);
  try {
    const appVersion = await query.get(versionId, { useMasterKey: true });
     if (appVersion.get("status") !== "pending_review") {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, `Version is not pending review. Current status: ${appVersion.get("status")}`);
    }
    appVersion.set("status", "rejected");
    appVersion.set("rejectionReason", reason);
    appVersion.set("reviewedBy", adminUser);
    appVersion.set("reviewTimestamp", new Date());
    appVersion.set("updatedBy", adminUser);
    const savedVersion = await appVersion.save(null, { useMasterKey: true });
    return savedVersion.toJSON();
  } catch (error) {
    logger.error("Error rejecting app version:", error);
     if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "AppVersion not found.");
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message || "Failed to reject application version.");
  }
});

Parse.Cloud.define("publishAppVersion", async (request) => {
  const adminUser = await auth.requireSystemAdmin(request.user);
  const { versionId } = request.params;

  if (!versionId) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "Version ID is required.");
  }

  const AppVersion = Parse.Object.extend("AppVersion");
  const query = new Parse.Query(AppVersion);
  try {
    const appVersion = await query.get(versionId, { useMasterKey: true });
    if (appVersion.get("status") !== "approved") {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Version must be approved before publishing.");
    }
    appVersion.set("status", "published");
    appVersion.set("publishedTimestamp", new Date());
    appVersion.set("updatedBy", adminUser);
    
    // Potentially update the parent AppDefinition's 'latestPublishedVersion' pointer here
    // const appDefinition = await appVersion.get("appDefinition").fetch({ useMasterKey: true });
    // appDefinition.set("latestPublishedVersion", appVersion); // This should be a pointer
    // await appDefinition.save(null, { useMasterKey: true });

    const savedVersion = await appVersion.save(null, { useMasterKey: true });
    return savedVersion.toJSON();
  } catch (error) {
    logger.error("Error publishing app version:", error);
    if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "AppVersion not found.");
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message || "Failed to publish application version.");
  }
});

Parse.Cloud.define("getAppVersionsForDefinition", async (request) => {
  const { appDefinitionId } = request.params;

  if (!appDefinitionId) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "appDefinitionId is required.");
  }

  const AppDefinition = Parse.Object.extend("AppDefinition");
  const appDefinitionPointer = AppDefinition.createWithoutData(appDefinitionId);

  const query = new Parse.Query("AppVersion");
  query.equalTo("appDefinition", appDefinitionPointer);
  query.include(["submittedBy", "reviewedBy"]);
  query.descending("createdAt");

  try {
    const results = await query.find({ useMasterKey: true }); // Use masterKey if ACLs might restrict non-admin view
    return results.map(version => version.toJSON());
  } catch (error) {
    logger.error(`Error fetching versions for app ${appDefinitionId}:`, error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to fetch application versions.");
  }
});

Parse.Cloud.define("getPendingReviews", async (request) => {
  await auth.requireSystemAdmin(request.user);
  const { page = 1, limit = 50 } = request.params;

  const query = new Parse.Query("AppVersion");
  query.equalTo("status", "pending_review");
  query.include(["appDefinition", "submittedBy"]);
  query.descending("createdAt");
  query.limit(limit);
  query.skip((page - 1) * limit);

  try {
    const results = await query.find({ useMasterKey: true });
    const count = await query.count({ useMasterKey: true });
    
    const reviews = results.map(version => {
      const appDefinition = version.get("appDefinition");
      const submittedBy = version.get("submittedBy");
      
      return {
        id: version.id,
        appBundle: {
          id: appDefinition?.id,
          name: appDefinition?.get("name"),
          category: appDefinition?.get("category"),
          icon: appDefinition?.get("iconUrl")
        },
        version: version.get("versionString"),
        submittedBy: {
          id: submittedBy?.id,
          email: submittedBy?.get("email"),
          name: submittedBy?.get("username") || submittedBy?.get("email")
        },
        submittedAt: version.get("createdAt")?.toISOString(),
        submissionNotes: version.get("releaseNotes")
      };
    });

    return {
      success: true,
      reviews,
      totalCount: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    };
  } catch (error) {
    logger.error("Error fetching pending reviews:", error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to fetch pending reviews.");
  }
});

// Additional functions for Phase 2 App Store Management

Parse.Cloud.define("createAppDefinition", async (request) => {
  await auth.requireSystemAdmin(request.user);
  const { name, description, category, publisherName, iconUrl, tags, isFeatured } = request.params;

  if (!name || !description || !category || !publisherName) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "Name, description, category, and publisher name are required.");
  }

  const AppDefinition = Parse.Object.extend("AppDefinition");
  const appDefinition = new AppDefinition();
  
  appDefinition.set("name", name);
  appDefinition.set("description", description);
  appDefinition.set("category", category);
  appDefinition.set("publisherName", publisherName);
  appDefinition.set("status", "draft");
  appDefinition.set("overallRating", 0);
  appDefinition.set("reviewCount", 0);
  appDefinition.set("isFeatured", isFeatured || false);
  
  if (iconUrl) appDefinition.set("iconUrl", iconUrl);
  if (tags && Array.isArray(tags)) appDefinition.set("tags", tags);
  
  appDefinition.set("createdBy", request.user);
  appDefinition.set("updatedBy", request.user);

  try {
    const savedApp = await appDefinition.save(null, { useMasterKey: true });
    return {
      success: true,
      message: "App definition created successfully",
      appDefinition: savedApp.toJSON()
    };
  } catch (error) {
    logger.error("Error creating app definition:", error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to create app definition.");
  }
});

Parse.Cloud.define("updateAppDefinition", async (request) => {
  await auth.requireSystemAdmin(request.user);
  const { appDefinitionId, name, description, category, publisherName, iconUrl, tags, isFeatured } = request.params;

  if (!appDefinitionId) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "App definition ID is required.");
  }

  const AppDefinition = Parse.Object.extend("AppDefinition");
  const query = new Parse.Query(AppDefinition);
  
  try {
    const appDefinition = await query.get(appDefinitionId, { useMasterKey: true });
    
    if (name) appDefinition.set("name", name);
    if (description) appDefinition.set("description", description);
    if (category) appDefinition.set("category", category);
    if (publisherName) appDefinition.set("publisherName", publisherName);
    if (iconUrl !== undefined) appDefinition.set("iconUrl", iconUrl);
    if (tags && Array.isArray(tags)) appDefinition.set("tags", tags);
    if (isFeatured !== undefined) appDefinition.set("isFeatured", isFeatured);
    
    appDefinition.set("updatedBy", request.user);

    const savedApp = await appDefinition.save(null, { useMasterKey: true });
    return {
      success: true,
      message: "App definition updated successfully",
      appDefinition: savedApp.toJSON()
    };
  } catch (error) {
    logger.error("Error updating app definition:", error);
    if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "App definition not found.");
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to update app definition.");
  }
});

Parse.Cloud.define("deleteAppDefinition", async (request) => {
  await auth.requireSystemAdmin(request.user);
  const { appDefinitionId } = request.params;

  if (!appDefinitionId) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "App definition ID is required.");
  }

  const AppDefinition = Parse.Object.extend("AppDefinition");
  const query = new Parse.Query(AppDefinition);
  
  try {
    const appDefinition = await query.get(appDefinitionId, { useMasterKey: true });
    
    // Check if there are any installations
    const installQuery = new Parse.Query("OrgAppInstallation");
    installQuery.equalTo("appDefinition", appDefinition);
    const installCount = await installQuery.count({ useMasterKey: true });
    
    if (installCount > 0) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Cannot delete app definition with existing installations.");
    }
    
    // Delete all versions first
    const versionQuery = new Parse.Query("AppVersion");
    versionQuery.equalTo("appDefinition", appDefinition);
    const versions = await versionQuery.find({ useMasterKey: true });
    
    if (versions.length > 0) {
      await Parse.Object.destroyAll(versions, { useMasterKey: true });
    }
    
    // Delete the app definition
    await appDefinition.destroy({ useMasterKey: true });
    
    return {
      success: true,
      message: "App definition deleted successfully"
    };
  } catch (error) {
    logger.error("Error deleting app definition:", error);
    if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "App definition not found.");
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message || "Failed to delete app definition.");
  }
});

Parse.Cloud.define("getAppBundleDetails", async (request) => {
  await auth.requireSystemAdmin(request.user);
  const { bundleId } = request.params;

  if (!bundleId) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "Bundle ID is required.");
  }

  const AppDefinition = Parse.Object.extend("AppDefinition");
  const query = new Parse.Query(AppDefinition);
  query.include("createdBy");
  
  try {
    const appDefinition = await query.get(bundleId, { useMasterKey: true });
    
    // Get versions
    const versionQuery = new Parse.Query("AppVersion");
    versionQuery.equalTo("appDefinition", appDefinition);
    versionQuery.include(["submittedBy", "reviewedBy"]);
    versionQuery.descending("createdAt");
    const versions = await versionQuery.find({ useMasterKey: true });
    
    // Get reviews (mock for now)
    const reviews = [];
    
    const bundle = {
      id: appDefinition.id,
      name: appDefinition.get("name"),
      description: appDefinition.get("description"),
      category: appDefinition.get("category"),
      status: appDefinition.get("status"),
      currentVersion: "1.0.0",
      publishedVersion: null,
      permissions: appDefinition.get("permissions") || [],
      configuration: appDefinition.get("configuration") || {},
      screenshots: appDefinition.get("screenshots") || [],
      icon: appDefinition.get("iconUrl"),
      supportEmail: appDefinition.get("supportEmail"),
      website: appDefinition.get("website"),
      documentation: appDefinition.get("documentation"),
      createdAt: appDefinition.get("createdAt")?.toISOString(),
      updatedAt: appDefinition.get("updatedAt")?.toISOString(),
      publishedAt: appDefinition.get("publishedAt")?.toISOString(),
      developer: appDefinition.get("createdBy") ? {
        id: appDefinition.get("createdBy").id,
        email: appDefinition.get("createdBy").get("email"),
        name: appDefinition.get("createdBy").get("username")
      } : null
    };

    return {
      success: true,
      bundle,
      versions: versions.map(v => v.toJSON()),
      reviews
    };
  } catch (error) {
    logger.error("Error getting app bundle details:", error);
    if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "App bundle not found.");
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to get app bundle details.");
  }
});

Parse.Cloud.define("createOrUpdateAppBundle", async (request) => {
  await auth.requireSystemAdmin(request.user);
  const {
    bundleId,
    name,
    description,
    category,
    version,
    bundleUrl,
    permissions,
    configuration,
    icon,
    supportEmail,
    website,
    documentation,
    releaseNotes
  } = request.params;

  if (!name || !description || !category) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "Name, description, and category are required.");
  }

  try {
    let appDefinition;
    
    if (bundleId) {
      // Update existing
      const AppDefinition = Parse.Object.extend("AppDefinition");
      const query = new Parse.Query(AppDefinition);
      appDefinition = await query.get(bundleId, { useMasterKey: true });
    } else {
      // Create new
      const AppDefinition = Parse.Object.extend("AppDefinition");
      appDefinition = new AppDefinition();
      appDefinition.set("createdBy", request.user);
    }
    
    appDefinition.set("name", name);
    appDefinition.set("description", description);
    appDefinition.set("category", category);
    appDefinition.set("status", "draft");
    appDefinition.set("updatedBy", request.user);
    
    if (icon) appDefinition.set("iconUrl", icon);
    if (supportEmail) appDefinition.set("supportEmail", supportEmail);
    if (website) appDefinition.set("website", website);
    if (documentation) appDefinition.set("documentation", documentation);
    if (permissions) appDefinition.set("permissions", permissions);
    if (configuration) appDefinition.set("configuration", configuration);

    const savedApp = await appDefinition.save(null, { useMasterKey: true });
    
    // If version info provided, create a version
    if (version && bundleUrl) {
      const AppVersion = Parse.Object.extend("AppVersion");
      const appVersion = new AppVersion();
      appVersion.set("appDefinition", savedApp);
      appVersion.set("versionString", version);
      appVersion.set("bundleUrl", bundleUrl);
      appVersion.set("releaseNotes", releaseNotes);
      appVersion.set("status", "draft");
      appVersion.set("submittedBy", request.user);
      appVersion.set("createdBy", request.user);
      appVersion.set("updatedBy", request.user);
      
      await appVersion.save(null, { useMasterKey: true });
    }

    return {
      success: true,
      message: bundleId ? "App bundle updated successfully" : "App bundle created successfully",
      bundle: savedApp.toJSON()
    };
  } catch (error) {
    logger.error("Error creating/updating app bundle:", error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to create/update app bundle.");
  }
});

// module.exports = { /* Cloud.define functions are automatically registered */ };
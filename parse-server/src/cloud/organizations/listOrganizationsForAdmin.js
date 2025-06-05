// parse-server/src/cloud/organizations/listOrganizationsForAdmin.js
const auth = require('../auth'); // Path relative to the 'organizations' subfolder
const utils = require('../../utils'); // Path relative to the 'organizations' subfolder
const logger = utils.logger;

Parse.Cloud.define("listOrganizationsForAdmin", async (request) => {
  await auth.requireSystemAdmin(request.user);
  const query = new Parse.Query("Organization");
  query.include(["createdBy", "updatedBy", "administrator"]);
  query.descending("createdAt");

  // Helper function to serialize Parse User objects
  const serializeUser = (user) => {
    if (!user) return null;
    return {
      objectId: user.id,
      id: user.id,
      className: user.className,
      email: user.get ? user.get("email") : user.email,
      username: user.get ? user.get("username") : user.username,
      firstName: user.get ? user.get("firstName") : user.firstName,
      lastName: user.get ? user.get("lastName") : user.lastName,
      createdAt: user.createdAt ? user.createdAt.toISOString() : user.createdAt,
      updatedAt: user.updatedAt ? user.updatedAt.toISOString() : user.updatedAt
    };
  };

  try {
    const results = await query.find({ useMasterKey: true });
    return results.map(org => {
      const orgData = org.toJSON();
      // Serialize Parse User objects to prevent Redux serialization warnings
      return {
        ...orgData,
        administrator: serializeUser(org.get("administrator")),
        createdBy: serializeUser(org.get("createdBy")),
        updatedBy: serializeUser(org.get("updatedBy"))
      };
    });
  } catch (error) {
    logger.error("Error listing organizations for admin:", error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to list organizations.");
  }
});
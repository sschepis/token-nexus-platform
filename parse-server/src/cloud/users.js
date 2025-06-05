const auth = require('./auth');
const utils = require('../utils');
const logger = utils.logger;

// --- Global User Management Cloud Functions ---

Parse.Cloud.define("listAllUsersAdmin", async (request) => {
  await auth.requireSystemAdmin(request.user);
  // const { filterParams, page, limit } = request.params; // TODO: Implement filtering & pagination

  const query = new Parse.Query(Parse.User);
  query.include("orgId"); // Include organization if users are linked
  query.descending("createdAt");
  // query.limit(limit || 25);
  // query.skip((page || 0) * (limit || 25));
  // query.withCount(); // For total count for pagination

  try {
    const results = await query.find({ useMasterKey: true });
    // const count = results.count; // If using withCount()
    const users = results.map(user => ({
      id: user.id,
      username: user.get("username"),
      email: user.get("email"),
      isSystemAdmin: user.get("isSystemAdmin") || false,
      createdAt: user.get("createdAt"),
      updatedAt: user.get("updatedAt"),
      emailVerified: user.get("emailVerified"),
      orgId: user.get("orgId") ? user.get("orgId").id : null,
      orgName: user.get("orgId") ? user.get("orgId").get("name") : null, // Assumes 'name' field on Organization
      // Add other relevant non-sensitive fields
    }));
    return users; // Or { users, count } for pagination
  } catch (error) {
    logger.error("Error listing all users for admin:", error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to list users.");
  }
});

Parse.Cloud.define("getUserDetailsAdmin", async (request) => {
  await auth.requireSystemAdmin(request.user);
  const { userId } = request.params;

  if (!userId) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "userId is required.");
  }

  const query = new Parse.Query(Parse.User);
  query.include("orgId"); // Include organization details
  // query.include("roles"); // This doesn't work directly, roles need separate query or handling

  try {
    const user = await query.get(userId, { useMasterKey: true });
    
    // Fetch roles separately if needed
    // const roleQuery = new Parse.Query(Parse.Role);
    // roleQuery.equalTo("users", user);
    // const roles = await roleQuery.find({ useMasterKey: true });
    // const roleNames = roles.map(role => role.getName());

    const userDetails = {
      id: user.id,
      username: user.get("username"),
      email: user.get("email"),
      firstName: user.get("firstName"),
      lastName: user.get("lastName"),
      isSystemAdmin: user.get("isSystemAdmin") || false,
      emailVerified: user.get("emailVerified"),
      createdAt: user.get("createdAt"),
      updatedAt: user.get("updatedAt"),
      orgId: user.get("orgId") ? user.get("orgId").id : null,
      orgName: user.get("orgId") ? user.get("orgId").get("name") : null,
      // roles: roleNames, // If roles are fetched
      // Add any other fields needed by admin, be mindful of sensitivity
    };
    return userDetails;
  } catch (error) {
    logger.error(`Error fetching details for user ${userId}:`, error);
    if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "User not found.");
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to fetch user details.");
  }
});

Parse.Cloud.define("suspendUserGlobal", async (request) => {
  const adminUser = await auth.requireSystemAdmin(request.user);
  const { userId } = request.params;

  if (!userId) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "userId is required.");
  }
  if (userId === request.user.id) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Cannot suspend your own account.");
  }

  const query = new Parse.Query(Parse.User);
  try {
    const user = await query.get(userId, { useMasterKey: true });
    // How suspension is handled depends on schema:
    // Option 1: Set a flag e.g., user.set("isSuspended", true);
    // Option 2: Remove from active roles, add to a 'suspended' role
    // Option 3: Parse doesn't have a built-in suspend. Revoking session tokens is one aspect.
    // For now, conceptual:
    user.set("isSuspended", true); // Requires 'isSuspended' field in User schema
    // await user.save(null, { useMasterKey: true });
    // Additionally, revoke all sessions for this user:
    // const sessionQuery = new Parse.Query(Parse.Session);
    // sessionQuery.equalTo('user', user);
    // const sessions = await sessionQuery.find({ useMasterKey: true });
    // await Parse.Object.destroyAll(sessions, { useMasterKey: true });

    logger.info(`User ${userId} suspended by ${adminUser.id}. (Conceptual: 'isSuspended' flag set).`);
    return { success: true, message: `User ${userId} suspended. (Conceptual: 'isSuspended' flag set).` };
  } catch (error) {
    logger.error(`Error suspending user ${userId}:`, error);
    if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "User not found.");
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to suspend user.");
  }
});

Parse.Cloud.define("reactivateUserGlobal", async (request) => {
  const adminUser = await auth.requireSystemAdmin(request.user);
  const { userId } = request.params;

  if (!userId) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "userId is required.");
  }

  const query = new Parse.Query(Parse.User);
  try {
    const user = await query.get(userId, { useMasterKey: true });
    // Assuming an 'isSuspended' field on User schema
    user.set("isSuspended", false);
    // await user.save(null, { useMasterKey: true });
    logger.info(`User ${userId} reactivated by ${adminUser.id}. (Conceptual: 'isSuspended' flag cleared).`);
    return { success: true, message: `User ${userId} reactivated. (Conceptual: 'isSuspended' flag cleared).` };
  } catch (error) {
    logger.error(`Error reactivating user ${userId}:`, error);
    if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "User not found.");
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to reactivate user.");
  }
});

// module.exports = { /* Cloud.define functions are automatically registered */ };
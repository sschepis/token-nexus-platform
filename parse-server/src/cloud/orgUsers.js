const auth = require('./auth');
const utils = require('../utils');
const logger = utils.logger;

Parse.Cloud.define("getOrgUsers", async (request) => {
  const { user } = request; // Calling user
  const { orgId, /* TODO: filterParams, page, limit */ } = request.params;

  if (!orgId) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "orgId is required.");
  }
  // Ensure the calling user is an admin of this org or a system admin
  await auth.requireOrgAdminOrSystemAdmin(user, orgId);

  // Strategy 1: Users with a direct pointer to the Organization
  // const userQuery = new Parse.Query(Parse.User);
  // const organizationPointer = Parse.Object.extend("Organization").createWithoutData(orgId);
  // userQuery.equalTo("orgId", organizationPointer); // Assuming 'orgId' field on User points to Organization

  // Strategy 2: Users belonging to any role associated with the organization.
  // This is more flexible if users can have multiple roles within an org.
  // We'd first find all roles for the org, then users in those roles.
  // For simplicity now, let's assume a primary role like `member_ORGID` or `admin_ORGID` exists,
  // or users have a direct pointer.
  // A common pattern is to have an "OrgUserLink" class: (userPointer, orgPointer, rolesArray)

  // Let's use a simplified direct pointer approach for now, assuming User.orgId points to their primary org.
  // And for roles, we'd query roles named like `roleName_${orgId}`.

  const userQuery = new Parse.Query(Parse.User);
  const organizationObject = Parse.Object.extend("Organization").createWithoutData(orgId);
  userQuery.equalTo("orgId", organizationObject); // Filter by users directly linked to this org
  userQuery.include("orgId"); // To get org name if needed, though it's the one we're querying for
  // userQuery.limit(limit || 25);
  // userQuery.skip((page || 0) * (limit || 25));
  // userQuery.withCount();

  try {
    const results = await userQuery.find({ useMasterKey: true }); // Use masterKey for admin-level data access
    // const count = results.count;

    const usersWithRoles = await Promise.all(results.map(async (u) => {
      const roleQuery = new Parse.Query(Parse.Role);
      roleQuery.equalTo("users", u);
      // Potentially filter roles that are specific to this org, e.g., role.getName().endsWith(`_${orgId}`)
      const roles = await roleQuery.find({ useMasterKey: true });
      const roleNames = roles
        .map(role => role.getName())
        .filter(name => name.includes(`_${orgId}`) || name === 'SystemAdmin'); // Crude filter for org-specific roles

      return {
        id: u.id,
        username: u.get("username"),
        email: u.get("email"),
        firstName: u.get("firstName"),
        lastName: u.get("lastName"),
        createdAt: u.get("createdAt"),
        orgId: u.get("orgId") ? u.get("orgId").id : null,
        // roles: roleNames, // Roles within this org
        orgRoles: roleNames.filter(rn => rn !== 'SystemAdmin'), // Filter out global roles for "orgRoles"
        isSystemAdmin: u.get("isSystemAdmin") || false,
      };
    }));

    return usersWithRoles; // Or { users: usersWithRoles, count }
  } catch (error) {
    logger.error(`Error fetching users for org ${orgId}:`, error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to fetch organization users.");
  }
});

Parse.Cloud.define("inviteUserToOrg", async (request) => {
  const { user: invitingUser } = request;
  const { orgId, email, roles: roleNames } = request.params; // roles should be an array of role names (e.g., ['editor', 'viewer'])

  if (!orgId || !email || !roleNames || !Array.isArray(roleNames) || roleNames.length === 0) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "orgId, email, and a non-empty array of roleNames are required.");
  }
  await auth.requireOrgAdminOrSystemAdmin(invitingUser, orgId);

  let targetUser;
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo("email", email);
  targetUser = await userQuery.first({ useMasterKey: true });

  if (!targetUser) {
    // Option: Create a placeholder user or send an invitation email.
    // For now, we'll throw an error if the user doesn't exist in the system.
    // A more complete system might create the user with a temporary password and send an invite.
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, `User with email ${email} not found. Please ensure they have an account.`);
  }
  
  // Ensure user is linked to the organization if not already (e.g., by setting their 'orgId' pointer)
  // This depends on your schema design. If User.orgId is a primary link:
  if (!targetUser.get("orgId") || targetUser.get("orgId").id !== orgId) {
      const organizationObject = Parse.Object.extend("Organization").createWithoutData(orgId);
      targetUser.set("orgId", organizationObject);
      await targetUser.save(null, { useMasterKey: true });
      logger.info(`Linked user ${targetUser.id} to organization ${orgId}.`);
  }


  // Add user to specified roles within the organization
  for (const roleBaseName of roleNames) {
    const fullRoleName = `${roleBaseName}_${orgId}`; // e.g., editor_ORGID
    const roleQuery = new Parse.Query(Parse.Role);
    roleQuery.equalTo("name", fullRoleName);
    let role = await roleQuery.first({ useMasterKey: true });

    if (!role) {
      // If role doesn't exist, create it. ACL for the role itself needs consideration.
      const roleACL = new Parse.ACL();
      roleACL.setPublicReadAccess(true); // Or restrict as needed
      // Admins of the org should be able to manage the role
      const orgAdminRoleNameForACL = `admin_${orgId}`; // Assuming an admin role for the org exists
      roleACL.setRoleWriteAccess(orgAdminRoleNameForACL, true);
      role = new Parse.Role(fullRoleName, roleACL);
      logger.info(`Creating role: ${fullRoleName}`);
    }
    role.getUsers().add(targetUser);
    await role.save(null, { useMasterKey: true });
    logger.info(`Added user ${targetUser.id} to role ${fullRoleName}`);
  }

  return { success: true, message: `User ${email} successfully invited/added to organization ${orgId} with specified roles.` };
});


Parse.Cloud.define("updateUserRolesInOrg", async (request) => {
  const { user: updatingUser } = request;
  const { orgId, userId, roles: targetRoleNames } = request.params; // targetRoleNames: array of desired role base names

  if (!orgId || !userId || !targetRoleNames || !Array.isArray(targetRoleNames)) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "orgId, userId, and an array of targetRoleNames are required.");
  }
  await auth.requireOrgAdminOrSystemAdmin(updatingUser, orgId);

  const targetUser = Parse.Object.extend("_User").createWithoutData(userId);
  await targetUser.fetch({ useMasterKey: true }); // Ensure user exists

  // Fetch all existing roles for the user that are specific to this org
  const currentRoleQuery = new Parse.Query(Parse.Role);
  currentRoleQuery.equalTo("users", targetUser);
  const currentRoles = await currentRoleQuery.find({ useMasterKey: true });

  const rolesToSave = [];

  // Remove user from org-specific roles not in targetRoleNames
  for (const role of currentRoles) {
    const roleName = role.getName();
    if (roleName.endsWith(`_${orgId}`)) {
      const roleBaseName = roleName.substring(0, roleName.lastIndexOf(`_${orgId}`));
      if (!targetRoleNames.includes(roleBaseName)) {
        role.getUsers().remove(targetUser);
        rolesToSave.push(role);
        logger.info(`Removing user ${userId} from role ${roleName}`);
      }
    }
  }

  // Add user to target roles if not already a member
  for (const roleBaseName of targetRoleNames) {
    const fullRoleName = `${roleBaseName}_${orgId}`;
    let role = currentRoles.find(r => r.getName() === fullRoleName);
    if (!role) { // Role needs to be created or user is not yet in it
      const roleQuery = new Parse.Query(Parse.Role);
      roleQuery.equalTo("name", fullRoleName);
      role = await roleQuery.first({ useMasterKey: true });
      if (!role) {
        const roleACL = new Parse.ACL();
        roleACL.setPublicReadAccess(true);
        const orgAdminRoleNameForACL = `admin_${orgId}`;
        roleACL.setRoleWriteAccess(orgAdminRoleNameForACL, true);
        role = new Parse.Role(fullRoleName, roleACL);
        logger.info(`Creating role: ${fullRoleName}`);
      }
    }
    // Check if user is already in this role (could happen if role was just fetched but not in currentRoles initially)
    const usersInRole = role.getUsers();
    let userFound = false;
    try {
        // Relation.query() can check if user is in relation without fetching all users
        const userRelationQuery = usersInRole.query();
        userRelationQuery.equalTo("objectId", targetUser.id);
        const userInRelation = await userRelationQuery.first({useMasterKey: true});
        if (userInRelation) userFound = true;
    } catch(e) { /* ignore if query fails, means user not in relation */ }

    if (!userFound) {
        usersInRole.add(targetUser);
        if (!rolesToSave.find(rts => rts.id === role.id)) { // Avoid duplicating if already marked for save
            rolesToSave.push(role);
        }
        logger.info(`Adding user ${userId} to role ${fullRoleName}`);
    }
  }
  
  if (rolesToSave.length > 0) {
    await Parse.Object.saveAll(rolesToSave, { useMasterKey: true });
  }

  return { success: true, message: `User ${userId}'s roles in organization ${orgId} updated.` };
});


Parse.Cloud.define("removeUserFromOrg", async (request) => {
  const { user: removingUser } = request;
  const { orgId, userId } = request.params;

  if (!orgId || !userId) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "orgId and userId are required.");
  }
  await auth.requireOrgAdminOrSystemAdmin(removingUser, orgId);

  if (removingUser.id === userId && !removingUser.get("isSystemAdmin")) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Organization administrators cannot remove themselves from the organization directly. Another admin must perform this action.");
  }

  const targetUser = Parse.Object.extend("_User").createWithoutData(userId);
  await targetUser.fetch({ useMasterKey: true }); // Ensure user exists

  // Remove user from all roles associated with this org
  const roleQuery = new Parse.Query(Parse.Role);
  roleQuery.equalTo("users", targetUser);
  const roles = await roleQuery.find({ useMasterKey: true });

  const rolesToSave = [];
  for (const role of roles) {
    if (role.getName().endsWith(`_${orgId}`)) {
      role.getUsers().remove(targetUser);
      rolesToSave.push(role);
      logger.info(`Removing user ${userId} from org-specific role ${role.getName()}`);
    }
  }

  if (rolesToSave.length > 0) {
    await Parse.Object.saveAll(rolesToSave, { useMasterKey: true });
  }

  // Optional: Clear the direct organization pointer on the user, if it matches this orgId.
  // This depends on whether a user can belong to multiple orgs or has one primary.
  if (targetUser.get("orgId") && targetUser.get("orgId").id === orgId) {
    targetUser.unset("orgId");
    await targetUser.save(null, { useMasterKey: true });
    logger.info(`Unset orgId pointer for user ${userId} from organization ${orgId}.`);
  }

  return { success: true, message: `User ${userId} removed from organization ${orgId}.` };
});

// module.exports = { /* Cloud.define functions are automatically registered */ };
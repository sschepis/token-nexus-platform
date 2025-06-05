// parse-server/src/cloud/organizations/createOrgAndUserWithRole.js
const auth = require('../auth');
const utils = require('../../utils');
const logger = utils.logger;

Parse.Cloud.define("createOrgAndUserWithRole", async (request) => {
  // This function should only be callable by a System Admin
  await auth.requireSystemAdmin(request.user);

  const {
    orgName,
    userEmail,
    userPassword,
    userFirstName,
    userLastName,
    isUserSystemAdmin, // Optional: to make the new user also a system admin
    orgPlanType,
    orgDescription,
    orgSubdomain,
    orgIndustry
  } = request.params;

  if (!orgName || !userEmail || !userPassword || !userFirstName) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, "Organization name, user email, password, and first name are required.");
  }

  // 1. Create the Organization
  const Organization = Parse.Object.extend("Organization");
  const organization = new Organization();
  organization.set("name", orgName);
  organization.set("planType", orgPlanType || "standard");
  organization.set("status", "Active");
  organization.set("createdBy", request.user); // The system admin creating this
  organization.set("updatedBy", request.user);
  if (orgDescription) organization.set("description", orgDescription);
  if (orgSubdomain) organization.set("subdomain", orgSubdomain);
  if (orgIndustry) organization.set("industry", orgIndustry);
  organization.set("settings", {});

  const orgACL = new Parse.ACL();
  orgACL.setPublicReadAccess(true); // Or false, depending on requirements
  // System admins can write
  const systemAdminRoleQuery = new Parse.Query(Parse.Role);
  systemAdminRoleQuery.equalTo("name", "SystemAdmin"); // Assuming a "SystemAdmin" role exists
  const systemAdminRole = await systemAdminRoleQuery.first({ useMasterKey: true });
  if (systemAdminRole) {
    orgACL.setRoleWriteAccess(systemAdminRole, true);
  } else {
    // Fallback to individual system admin if SystemAdmin role doesn't exist
    orgACL.setWriteAccess(request.user.id, true);
  }
  organization.setACL(orgACL);

  let savedOrg;
  try {
    savedOrg = await organization.save(null, { useMasterKey: true });
  } catch (error) {
    logger.error("Error creating organization in createOrgAndUserWithRole:", error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to create organization: ${error.message}`);
  }

  // 2. Create the User
  const newUser = new Parse.User();
  newUser.set("username", userEmail); // Parse uses username for login, typically email
  newUser.set("email", userEmail);
  newUser.set("password", userPassword);
  newUser.set("firstName", userFirstName);
  if (userLastName) newUser.set("lastName", userLastName);
  newUser.set("orgId", savedOrg); // Link user to the new organization
  if (isUserSystemAdmin === true) {
    newUser.set("isSystemAdmin", true);
  }

  const userACL = new Parse.ACL();
  userACL.setPublicReadAccess(false); // Users should not be publicly readable
  userACL.setReadAccess(newUser.id, true); // User can read their own data
  userACL.setWriteAccess(newUser.id, true); // User can write their own data
  if (systemAdminRole) { // System admins can read/write user data
      userACL.setRoleReadAccess(systemAdminRole, true);
      userACL.setRoleWriteAccess(systemAdminRole, true);
  } else {
      userACL.setReadAccess(request.user.id, true);
      userACL.setWriteAccess(request.user.id, true);
  }
  newUser.setACL(userACL);
  
  let savedUser;
  try {
    savedUser = await newUser.signUp(null, { useMasterKey: true }); 
  } catch (error) {
    logger.error("Error creating user in createOrgAndUserWithRole:", error);
    try {
      await savedOrg.destroy({ useMasterKey: true });
      logger.info(`Cleaned up organization ${savedOrg.id} after user creation failure.`);
    } catch (cleanupError) {
      logger.error(`Failed to cleanup organization ${savedOrg.id}:`, cleanupError);
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to create user: ${error.message}`);
  }

  // 3. Assign "OrgAdmin" role to the new user for the new organization
  const orgAdminRoleName = `orgAdmin_${savedOrg.id}`;
  const roleQuery = new Parse.Query(Parse.Role);
  roleQuery.equalTo("name", orgAdminRoleName);
  let orgAdminRole = await roleQuery.first({ useMasterKey: true });

  if (!orgAdminRole) {
    const roleACL = new Parse.ACL();
    roleACL.setPublicReadAccess(true); 
    if (systemAdminRole) {
        roleACL.setRoleWriteAccess(systemAdminRole, true);
    } else {
        roleACL.setWriteAccess(request.user.id, true); 
    }
    orgAdminRole = new Parse.Role(orgAdminRoleName, roleACL);
    try {
        await orgAdminRole.save(null, { useMasterKey: true });
    } catch (error) {
        logger.error(`Error creating role ${orgAdminRoleName}:`, error);
        throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to create role ${orgAdminRoleName}: ${error.message}`);
    }
  }
  
  orgAdminRole.getUsers().add(savedUser);
  try {
    await orgAdminRole.save(null, { useMasterKey: true });
  } catch (error) {
    logger.error(`Error adding user to role ${orgAdminRoleName}:`, error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to add user to role: ${error.message}`);
  }
  
  const finalOrgACL = savedOrg.getACL();
  if (finalOrgACL) { 
    finalOrgACL.setRoleWriteAccess(orgAdminRoleName, true); 
    await savedOrg.save(null, { useMasterKey: true });
  }

  logger.info(`Successfully created Org ${savedOrg.id} and User ${savedUser.id} with OrgAdmin role.`);
  return {
    organizationId: savedOrg.id,
    organizationName: savedOrg.get("name"),
    userId: savedUser.id,
    userEmail: savedUser.get("email"),
    message: "Organization and user created successfully with OrgAdmin role."
  };
});
// parse-server/src/cloud/organizations/createOrganization.js
const { defineFunction, withSystemAdmin, withValidation } = require('../middleware');
const utils = require('../../utils');
const logger = utils.logger;

// Validation schema for createOrganization
const createOrgSchema = {
  name: { type: 'string', required: true, minLength: 1, maxLength: 100 },
  ownerEmail: { type: 'string', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  planType: { type: 'string', required: false, enum: ['free', 'standard', 'premium', 'enterprise'] },
  description: { type: 'string', required: false, maxLength: 500 },
  subdomain: { type: 'string', required: false, pattern: /^[a-z0-9-]+$/, minLength: 3, maxLength: 30 },
  industry: { type: 'string', required: false, maxLength: 100 }
};

const createOrganizationHandler = async (request) => {
  const { name, ownerEmail, planType, description, subdomain, industry } = request.params;
  const adminUser = request.user; // User is already validated by withSystemAdmin middleware

  let ownerUser;
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo("email", ownerEmail);
  ownerUser = await userQuery.first({ useMasterKey: true });

  if (!ownerUser) {
    logger.warn(`Owner user with email ${ownerEmail} not found during org creation. Consider user pre-creation flow.`);
    // Decide if org creation should proceed or fail if owner user doesn't exist.
    // For now, we'll allow it and store email in 'administrator' if user not found.
  }

  const Organization = Parse.Object.extend("Organization");
  const organization = new Organization();
  organization.set("name", name);
  organization.set("administrator", ownerUser ? ownerUser.id : ownerEmail); // Store owner's ID or email
  organization.set("planType", planType || "standard");
  organization.set("status", "Active");
  organization.set("createdBy", adminUser);
  organization.set("updatedBy", adminUser);
  if (description) organization.set("description", description);
  if (subdomain) organization.set("subdomain", subdomain); // TODO: Server-side uniqueness check for subdomain
  if (industry) organization.set("industry", industry);
  organization.set("settings", {}); // Initialize with empty settings object

  const acl = new Parse.ACL();
  acl.setPublicReadAccess(true); // Adjust as per security requirements
  acl.setWriteAccess(adminUser.id, true); // System admin who created it
  // TODO: Create and assign OrgAdmin role for 'ownerUser' if they exist.
  // e.g., acl.setRoleWriteAccess(`orgAdmin_${NEW_ORG_ID}`, true);
  organization.setACL(acl);

  try {
    const savedOrg = await organization.save(null, { useMasterKey: true });
    // Post-save: if ownerUser exists, create/assign OrgAdmin role for savedOrg.id
    if (ownerUser) {
        const roleName = `orgAdmin_${savedOrg.id}`;
        const roleQuery = new Parse.Query(Parse.Role);
        roleQuery.equalTo("name", roleName);
        let orgAdminRole = await roleQuery.first({ useMasterKey: true });
        if (!orgAdminRole) {
            const roleACL = new Parse.ACL();
            roleACL.setPublicReadAccess(true); // Or false
            roleACL.setRoleWriteAccess(roleName, true); // Role can manage itself
            orgAdminRole = new Parse.Role(roleName, roleACL);
        }
        orgAdminRole.getUsers().add(ownerUser);
        await orgAdminRole.save(null, { useMasterKey: true });
        logger.info(`Assigned/Created role ${roleName} for user ${ownerUser.id} for new org ${savedOrg.id}`);
    }
    return savedOrg.toJSON();
  } catch (error) {
    logger.error("Error creating organization:", error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to create organization.");
  }
};

// Define the cloud function with middleware
defineFunction("createOrganization", [
  withSystemAdmin,
  withValidation(createOrgSchema)
], createOrganizationHandler);
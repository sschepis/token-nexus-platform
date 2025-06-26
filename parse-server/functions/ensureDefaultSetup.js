/* global Parse */

/**
 * Ensure default system setup cloud function
 */

const logger = require('../src/utils/logger');

// Helper function to ensure default admin user exists
async function ensureDefaultAdmin() {
  logger.info('Starting default admin user creation process');

  // Check if default admin already exists
  const userQuery = new Parse.Query(Parse.User);

  userQuery.equalTo('username', 'admin');
  const existingUser = await userQuery.first({ useMasterKey: true });

  let adminUser = existingUser;

  if (!existingUser) {
    // Create default admin user
    adminUser = new Parse.User();
    adminUser.set('username', 'admin');
    adminUser.set('password', 'admin');
    adminUser.set('email', 'admin@nomyx.io');
    adminUser.set('role', 'admin');
    adminUser.set('isAdmin', true); // Set system admin flag

    // Save the user
    await adminUser.save(null, { useMasterKey: true });
    logger.info('Default admin user created', {
      userId: adminUser.id,
      email: adminUser.get('email'),
    });
  } else {
    // Ensure existing user has isAdmin flag set
    if (!existingUser.get('isAdmin')) {
      existingUser.set('isAdmin', true);
      await existingUser.save(null, { useMasterKey: true });
      logger.info('Updated existing admin user with isAdmin flag', {
        userId: existingUser.id,
        email: existingUser.get('email'),
      });
    } else {
      logger.info('Default admin user already exists', {
        userId: existingUser.id,
        email: existingUser.get('email'),
      });
    }
  }

  // Create or get admin role
  let adminRole = await new Parse.Query(Parse.Role)
    .equalTo('name', 'admin')
    .first({ useMasterKey: true });

  if (!adminRole) {
    logger.info('Creating admin role');
    const roleACL = new Parse.ACL();

    roleACL.setPublicReadAccess(true);

    adminRole = new Parse.Role('admin', roleACL);
    await adminRole.save(null, { useMasterKey: true });
  }

  // Check if user is already in admin role
  const userQuery2 = adminRole.getUsers().query();

  userQuery2.equalTo('objectId', adminUser.id);
  const isAdmin = await userQuery2.first({ useMasterKey: true });

  if (!isAdmin) {
    // Add user to admin role
    adminRole.getUsers().add(adminUser);
    await adminRole.save(null, { useMasterKey: true });
    logger.info('Admin user added to admin role');
  }

  return adminUser;
}

// Helper function to create default organization
async function createDefaultOrganization(adminUser) {
  logger.info('Starting default organization creation process', {
    adminUserId: adminUser.id,
  });

  // Check if a default organization already exists
  const orgQuery = new Parse.Query('Organization');

  orgQuery.equalTo('name', 'Default Organization');
  const existingOrg = await orgQuery.first({ useMasterKey: true });

  if (existingOrg) {
    logger.info('Default organization already exists', {
      orgId: existingOrg.id,
      name: existingOrg.get('name'),
    });

    return existingOrg;
  }

  // Create organization
  const Organization = Parse.Object.extend('Organization');
  const organization = new Organization();

  organization.set('name', 'Default Organization');
  organization.set('subdomain', 'default');
  organization.set('industry', 'Technology');
  organization.set('size', '1-10');
  organization.set('description', 'Default organization created on system startup');
  organization.set('plan', 'Starter');
  organization.set('status', 'Active');

  // Set createdBy and updatedBy to the admin user
  organization.set('createdBy', adminUser);
  organization.set('updatedBy', adminUser);

  // Save organization
  const savedOrg = await organization.save(null, { useMasterKey: true });

  logger.info('Default organization created', {
    orgId: savedOrg.id,
    name: savedOrg.get('name'),
  });

  // Create organization-specific admin role
  const orgAdminRole = new Parse.Role(`${savedOrg.id}_admin`, new Parse.ACL());

  await orgAdminRole.save(null, { useMasterKey: true });
  logger.info('Organization-specific admin role created', {
    roleName: `${savedOrg.id}_admin`,
  });

  // Add admin user to organization role
  orgAdminRole.getUsers().add(adminUser);
  await orgAdminRole.save(null, { useMasterKey: true });
  logger.info('Admin user added to organization-specific admin role');

  // Initialize resource usage
  const ResourceUsage = Parse.Object.extend('ResourceUsage');
  const resourceUsage = new ResourceUsage();

  resourceUsage.set('organizationId', savedOrg.id);
  resourceUsage.set('storageUsed', 0);
  resourceUsage.set('bandwidthUsed', 0);
  resourceUsage.set('apiCalls', 0);
  await resourceUsage.save(null, { useMasterKey: true });
  logger.info('Resource usage initialized for default organization', {
    orgId: savedOrg.id,
  });

  return savedOrg;
}

module.exports = () => ({
  name: 'ensureDefaultSetup',
  handler: async () => {
    try {
      logger.info('Starting default system setup');

      const adminUser = await ensureDefaultAdmin();
      const organization = await createDefaultOrganization(adminUser);

      const result = {
        message: 'Default admin user and organization created successfully',
        adminUser: adminUser.id,
        organization: organization.id,
      };

      logger.info('Default system setup completed successfully', {
        adminUserId: adminUser.id,
        organizationId: organization.id,
      });

      return result;
    } catch (error) {
      logger.error('Error in ensureDefaultSetup:', error);
      throw error;
    }
  },
});

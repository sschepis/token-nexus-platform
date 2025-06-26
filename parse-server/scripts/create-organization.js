const Parse = require('parse/node');

Parse.initialize('gemcms_dev', null, 'gemcms_master_key_dev');
Parse.masterKey = 'gemcms_master_key_dev';
Parse.serverURL = 'http://localhost:1337/parse';

async function createOrganization() {
  try {
    // First ensure admin user exists
    const query = new Parse.Query(Parse.User);
    query.equalTo('username', 'admin@nomyx.io');
    let adminUser = await query.first({ useMasterKey: true });

    if (!adminUser) {
      adminUser = new Parse.User();
      adminUser.set('username', 'admin@nomyx.io');
      adminUser.set('password', 'admin');
      adminUser.set('email', 'admin@nomyx.io');
      adminUser.set('isAdmin', true);
      await adminUser.save(null, { useMasterKey: true });

      // Create admin role and assign user to it
      const acl = new Parse.ACL();
      acl.setPublicReadAccess(true);
      const adminRole = new Parse.Role('admin', acl);
      adminRole.getUsers().add(adminUser);
      await adminRole.save(null, { useMasterKey: true });
    }

    // Create organization
    const organization = new Parse.Object('Organization');
    organization.set('name', 'GemCMS Organization');
    organization.set('subdomain', 'gemcms');
    organization.set('createdBy', adminUser);
    organization.set('updatedBy', adminUser);
    organization.set('settings', {
      enableNotifications: true,
      enableTwoFactorAuth: false,
      allowExternalIntegrations: true,
      auditLogging: true,
    });

    // Set up ACL for organization
    const orgAcl = new Parse.ACL();
    orgAcl.setPublicReadAccess(false);
    orgAcl.setRoleReadAccess('admin', true);
    orgAcl.setRoleWriteAccess('admin', true);
    orgAcl.setReadAccess(adminUser, true);
    orgAcl.setWriteAccess(adminUser, true);
    organization.setACL(orgAcl);

    await organization.save(null, { useMasterKey: true });

    console.log('Created organization:', {
      id: organization.id,
      name: organization.get('name'),
      subdomain: organization.get('subdomain'),
      createdBy: organization.get('createdBy').id
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createOrganization();

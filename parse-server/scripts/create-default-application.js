const Parse = require('parse/node');

Parse.initialize('gemcms_dev', null, 'gemcms_master_key_dev');
Parse.masterKey = 'gemcms_master_key_dev';
Parse.serverURL = 'http://localhost:1337/parse';

async function createApplication() {
  try {
    // Get admin user
    const query = new Parse.Query(Parse.User);
    query.equalTo('username', 'admin@gemcms.com');
    const adminUser = await query.first({ useMasterKey: true });

    if (!adminUser) {
      throw new Error('Admin user not found');
    }

    // Get organization
    const orgQuery = new Parse.Query('Organization');
    orgQuery.equalTo('objectId', 'yKAUBfNuy2');
    const organization = await orgQuery.first({ useMasterKey: true });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Create application
    const application = new Parse.Object('CMSApplication');
    application.set('name', 'GemCMS Main App');
    application.set('description', 'Main application for GemCMS platform');
    application.set('organization', organization);
    application.set('createdBy', adminUser);
    application.set('updatedBy', adminUser);
    application.set('status', 'active');
    application.set('settings', {
      enableAPI: true,
      enableWebhooks: false,
      enableCustomDomain: false
    });

    // Set up ACL for application
    const appAcl = new Parse.ACL();
    appAcl.setPublicReadAccess(false);
    appAcl.setRoleReadAccess('admin', true);
    appAcl.setRoleWriteAccess('admin', true);
    appAcl.setReadAccess(adminUser, true);
    appAcl.setWriteAccess(adminUser, true);
    application.setACL(appAcl);

    await application.save(null, { useMasterKey: true });

    console.log('Created application:', {
      id: application.id,
      name: application.get('name'),
      description: application.get('description'),
      organizationId: organization.id,
      createdBy: adminUser.id
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.stack) console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

createApplication();

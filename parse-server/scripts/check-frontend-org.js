const Parse = require('parse/node');

Parse.initialize('gemcms_dev', null, 'gemcms_master_key_dev');
Parse.masterKey = 'gemcms_master_key_dev';
Parse.serverURL = 'http://localhost:1337/parse';

async function checkFrontendOrg() {
  try {
    // Get organization with ID from URL
    const frontendOrgId = 'yKAUBfNuy2'; // ID from URL
    const org = await new Parse.Query('Organization')
      .equalTo('objectId', frontendOrgId)
      .first({ useMasterKey: true });

    console.log('Organization from frontend ID:', org ? {
      id: org.id,
      name: org.get('name'),
      subdomain: org.get('subdomain')
    } : 'Not found');

    // Get applications for this organization
    const apps = await new Parse.Query('CMSApplication')
      .equalTo('organization', org)
      .include('createdBy')
      .find({ useMasterKey: true });

    console.log('\nApplications for this organization:');
    apps.forEach(app => {
      console.log({
        id: app.id,
        name: app.get('name'),
        description: app.get('description'),
        status: app.get('status'),
        createdBy: app.get('createdBy').get('username'),
        acl: app.getACL()
      });
    });

    // Check if organization has correct ACL
    console.log('\nOrganization ACL:', org.getACL());

    // Check if admin user has correct role
    const adminUser = await new Parse.Query(Parse.User)
      .equalTo('username', 'admin@nomyx.io')
      .first({ useMasterKey: true });

    const adminRole = await new Parse.Query(Parse.Role)
      .equalTo('name', 'admin')
      .first({ useMasterKey: true });

    console.log('\nAdmin user:', adminUser ? {
      id: adminUser.id,
      username: adminUser.get('username'),
      isAdmin: adminUser.get('isAdmin')
    } : 'Not found');

    console.log('\nAdmin role:', adminRole ? {
      name: adminRole.get('name'),
      users: await adminRole.getUsers().query().find({ useMasterKey: true }).then(users => 
        users.map(u => ({ id: u.id, username: u.get('username') }))
      )
    } : 'Not found');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.stack) console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

checkFrontendOrg();

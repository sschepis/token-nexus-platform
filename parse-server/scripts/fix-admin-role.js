const Parse = require('parse/node');

Parse.initialize('gemcms_dev', null, 'gemcms_master_key_dev');
Parse.masterKey = 'gemcms_master_key_dev';
Parse.serverURL = 'http://localhost:1337/parse';

async function fixAdminRole() {
  try {
    // Get admin user
    const query = new Parse.Query(Parse.User);
    query.equalTo('username', 'admin@gemcms.com');
    const adminUser = await query.first({ useMasterKey: true });

    if (!adminUser) {
      throw new Error('Admin user not found');
    }

    // Get or create admin role
    const roleQuery = new Parse.Query(Parse.Role);
    roleQuery.equalTo('name', 'admin');
    let adminRole = await roleQuery.first({ useMasterKey: true });

    if (!adminRole) {
      const acl = new Parse.ACL();
      acl.setPublicReadAccess(true);
      adminRole = new Parse.Role('admin', acl);
    }

    // Add admin user to role if not already added
    const userRelation = adminRole.getUsers();
    const userQuery = userRelation.query();
    userQuery.equalTo('objectId', adminUser.id);
    const isUserInRole = await userQuery.first({ useMasterKey: true });

    if (!isUserInRole) {
      adminRole.getUsers().add(adminUser);
      await adminRole.save(null, { useMasterKey: true });
      console.log('Added admin user to admin role');
    } else {
      console.log('Admin user already in admin role');
    }

    // Set isAdmin flag on user
    if (!adminUser.get('isAdmin')) {
      adminUser.set('isAdmin', true);
      await adminUser.save(null, { useMasterKey: true });
      console.log('Set isAdmin flag on user');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.stack) console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

fixAdminRole();

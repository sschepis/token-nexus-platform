const Parse = require('parse/node');

Parse.initialize('gemcms_dev', null, 'gemcms_master_key_dev');
Parse.masterKey = 'gemcms_master_key_dev';
Parse.serverURL = 'http://localhost:1337/parse';

async function ensureAdminRole() {
  try {
    // Get or create admin role
    const adminRoleQuery = new Parse.Query(Parse.Role);

    adminRoleQuery.equalTo('name', 'admin');
    let adminRole = await adminRoleQuery.first({ useMasterKey: true });

    if (!adminRole) {
      const acl = new Parse.ACL();

      acl.setPublicReadAccess(true);

      adminRole = new Parse.Role('admin', acl);
      await adminRole.save(null, { useMasterKey: true });
      console.log('Created admin role');
    }

    // Get your user
    const userQuery = new Parse.Query(Parse.User);

    userQuery.equalTo('objectId', 'Vn7sW2AWq4'); // Your user ID
    const user = await userQuery.first({ useMasterKey: true });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is already in admin role
    const users = adminRole.getUsers();
    const userQuery2 = users.query();

    userQuery2.equalTo('objectId', user.id);
    const isAdmin = await userQuery2.first({ useMasterKey: true });

    if (!isAdmin) {
      // Add user to admin role
      adminRole.getUsers().add(user);
      await adminRole.save(null, { useMasterKey: true });
      console.log('Added user to admin role');
    } else {
      console.log('User is already an admin');
    }

    console.log('Success!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

ensureAdminRole();
